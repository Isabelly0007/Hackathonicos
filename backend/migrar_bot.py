"""Migra os dados do bot_estoque (schema public) para o schema do Taylor.

Uso (dentro de backend/, com o .venv ativo):
    python migrar_bot.py            mostra o que seria migrado, sem gravar
    python migrar_bot.py --aplicar  grava tudo numa única transação

O que é migrado, por empresa do bot:
  * empresa, usuários (com nova senha bcrypt, ver SENHA_PADRAO) e vínculo usuário–empresa;
  * integrações com os canais em que a empresa tem anúncios;
  * produtos (estoque_atual -> estoque_central) e anúncios (produto_canal);
  * histórico de movimento_estoque;
  * pedidos (sem itens: o bot não registrava itens).

Não migra: descrição do produto, preço por canal e frete (não existem no modelo
do Taylor). As tabelas do schema public são só lidas, nunca alteradas.
Empresas cujo CNPJ já existe no Taylor são puladas (pode rodar de novo).
"""

import argparse
import re

import psycopg
from psycopg import sql

from app.auth import gerar_hash
from app.config import settings
from app.db import explicar_erro_conexao

# O bot guardava a senha em texto puro; no Taylor ela é bcrypt. Os usuários
# migrados entram com a mesma senha do usuário de teste (COMO-RODAR.md).
SENHA_PADRAO = "taylor123"

STATUS_PEDIDO = {
    "pago": "aguardando", "aguardando": "aguardando", "pendente": "aguardando",
    "em separação": "em_separacao", "em separacao": "em_separacao", "separando": "em_separacao",
    "enviado": "em_transporte", "em transporte": "em_transporte",
    "entregue": "entregue", "concluido": "entregue", "concluído": "entregue", "finalizado": "entregue",
    "cancelado": "cancelado",
}
TIPO_MOVIMENTO = {"ENTRADA_MANUAL": "entrada_manual", "BAIXA_MANUAL": "baixa_manual", "VENDA": "venda"}


def migrar(conn: psycopg.Connection) -> list[str]:
    log: list[str] = []
    senha_hash = gerar_hash(SENHA_PADRAO)
    marketplaces = {r[0]: r[1] for r in conn.execute("select nome, id from marketplace")}

    for emp in conn.execute("select * from public.empresa order by id_empresa").fetchall():
        (id_emp, cnpj, razao, fantasia, email, telefone, data_cadastro, _status) = emp
        cnpj_limpo = re.sub(r"\D", "", cnpj or "")
        if conn.execute("select 1 from empresa where cnpj = %s", (cnpj_limpo,)).fetchone():
            log.append(f"= {fantasia}: já existe no Taylor (CNPJ {cnpj_limpo}), pulada.")
            continue

        empresa_id = conn.execute(
            """insert into empresa (razao_social, nome_fantasia, cnpj, email_contato, telefone, criado_em)
               values (%s, %s, %s, %s, %s, coalesce(%s::timestamptz, now())) returning id""",
            (razao, fantasia, cnpj_limpo, email, telefone, data_cadastro),
        ).fetchone()[0]
        log.append(f"+ empresa {fantasia} (CNPJ {cnpj_limpo})")

        # Usuários: mesmo e-mail já cadastrado no Taylor é reaproveitado (só ganha o vínculo).
        for id_usu, nome, email_usu in conn.execute(
            "select id_usuario, nome, lower(email) from public.usuario where empresa_id = %s", (id_emp,)
        ).fetchall():
            usuario_id = conn.execute(
                """insert into usuario (nome, email, senha_hash) values (%s, %s, %s)
                   on conflict (email) do update set email = excluded.email returning id""",
                (nome, email_usu, senha_hash),
            ).fetchone()[0]
            conn.execute(
                "insert into usuario_empresa (usuario_id, empresa_id, papel) values (%s, %s, 'administrador') on conflict do nothing",
                (usuario_id, empresa_id),
            )
            log.append(f"+ usuário {email_usu}")

        # Integrações: só os canais em que a empresa tem anúncio ou pedido.
        integracoes: dict[int, object] = {}
        canais = conn.execute(
            """select distinct c.id_canal, c.nome from public.canal c
                where c.id_canal in (select pc.canal_id from public.produto_canal pc
                                       join public.produto p on p.id_produto = pc.produto_id where p.empresa_id = %(e)s
                                     union select canal_id from public.pedido where empresa_id = %(e)s)""",
            {"e": id_emp},
        ).fetchall()
        for id_canal, nome_canal in canais:
            if nome_canal not in marketplaces:
                log.append(f"! canal {nome_canal} não existe no Taylor; anúncios e pedidos dele foram ignorados.")
                continue
            integracoes[id_canal] = conn.execute(
                """insert into integracao (empresa_id, marketplace_id, conta_vinculada, ultima_sincronizacao)
                   values (%s, %s, %s, now()) returning id""",
                (empresa_id, marketplaces[nome_canal], f"{fantasia} Oficial"),
            ).fetchone()[0]
            log.append(f"+ integração {nome_canal}")

        # Produtos. O trigger do banco cria o movimento 'cadastro'; ele é ajustado
        # depois para a data e a quantidade iniciais reais (antes do histórico do bot).
        produtos: dict[int, object] = {}
        for id_prod, sku, nome, preco, estoque, minimo, criado, atualizado in conn.execute(
            """select id_produto, upper(sku), nome, preco, estoque_atual, estoque_minimo, data_cadastro, data_atualizacao
                 from public.produto where empresa_id = %s order by id_produto""",
            (id_emp,),
        ).fetchall():
            conn.execute("select set_config('taylor.movimento_obs', 'Migrado do bot do Telegram', true)")
            produto_id = conn.execute(
                """insert into produto (empresa_id, nome, sku, preco, estoque_central, estoque_minimo, criado_em)
                   values (%s, %s, %s, %s, %s, %s, coalesce(%s at time zone 'UTC', now())) returning id""",
                (empresa_id, nome, sku, preco, max(estoque or 0, 0), minimo or 0, criado),
            ).fetchone()[0]
            produtos[id_prod] = produto_id
            primeiro = conn.execute(
                "select estoque_anterior from public.movimento_estoque where produto_id = %s order by data_movimento, id_movimento limit 1",
                (id_prod,),
            ).fetchone()
            inicial = primeiro[0] if primeiro else max(estoque or 0, 0)
            conn.execute(
                """update movimento_estoque set quantidade = %s, estoque_atual = %s,
                          criado_em = coalesce(%s at time zone 'UTC', criado_em)
                    where produto_id = %s and tipo = 'cadastro'""",
                (inicial, inicial, criado, produto_id),
            )
            if atualizado:
                conn.execute("update produto set atualizado_em = %s at time zone 'UTC' where id = %s", (atualizado, produto_id))
            log.append(f"+ produto {sku} · {nome} ({estoque} un.)")

        # Histórico de estoque do bot.
        n = 0
        for id_prod, tipo, qtd, anterior, atual, quando, obs in conn.execute(
            """select m.produto_id, m.tipo, m.quantidade, m.estoque_anterior, m.estoque_atual, m.data_movimento, m.observacao
                 from public.movimento_estoque m join public.produto p on p.id_produto = m.produto_id
                where p.empresa_id = %s order by m.data_movimento, m.id_movimento""",
            (id_emp,),
        ).fetchall():
            conn.execute(
                """insert into movimento_estoque (empresa_id, produto_id, tipo, quantidade, estoque_anterior, estoque_atual, observacao, criado_em)
                   values (%s, %s, %s, %s, %s, %s, %s, coalesce(%s at time zone 'UTC', now()))""",
                (empresa_id, produtos[id_prod], TIPO_MOVIMENTO.get((tipo or "").upper(), "ajuste"),
                 abs(qtd or 0), anterior or 0, atual or 0, obs, quando),
            )
            n += 1
        log.append(f"+ {n} movimentos de estoque")

        # Anúncios (estoque por canal). Preço por canal não existe no Taylor.
        n = 0
        for id_prod, id_canal, externo, estoque_canal, status in conn.execute(
            """select pc.produto_id, pc.canal_id, pc.external_id, pc.estoque_canal, pc.status
                 from public.produto_canal pc join public.produto p on p.id_produto = pc.produto_id
                where p.empresa_id = %s""",
            (id_emp,),
        ).fetchall():
            if id_canal not in integracoes:
                continue
            conn.execute(
                """insert into anuncio (produto_id, integracao_id, id_externo, estoque_publicado, status)
                   values (%s, %s, %s, %s, %s)""",
                (produtos[id_prod], integracoes[id_canal], externo, max(estoque_canal or 0, 0),
                 "pausado" if (status or "").lower() in ("pausado", "inativo") else "ativo"),
            )
            n += 1
        log.append(f"+ {n} anúncios")

        # Pedidos (o bot não guardava itens; o frete não existe no Taylor).
        n = 0
        for id_canal, codigo, status, valor, quando in conn.execute(
            "select canal_id, codigo_externo, status, valor_total, data_pedido from public.pedido where empresa_id = %s",
            (id_emp,),
        ).fetchall():
            if id_canal not in integracoes:
                continue
            conn.execute(
                """insert into pedido (empresa_id, integracao_id, codigo, data_pedido, quantidade_itens, valor_total, status)
                   values (%s, %s, %s, coalesce(%s at time zone 'UTC', now()), 1, %s, %s)""",
                (empresa_id, integracoes[id_canal], codigo, quando, valor or 0,
                 STATUS_PEDIDO.get((status or "").strip().lower(), "aguardando")),
            )
            n += 1
        log.append(f"+ {n} pedidos")

    return log


def main() -> None:
    parser = argparse.ArgumentParser(description="Migra os dados do bot_estoque para o Taylor.")
    parser.add_argument("--aplicar", action="store_true", help="grava no banco (sem isso, só simula)")
    args = parser.parse_args()
    try:
        settings.validar()
        conn = psycopg.connect(settings.database_url, prepare_threshold=None, connect_timeout=15)
    except RuntimeError as exc:
        raise SystemExit(str(exc)) from None
    except psycopg.OperationalError as exc:
        raise SystemExit(explicar_erro_conexao(exc)) from None

    with conn:
        conn.execute(sql.SQL("set search_path to {}").format(sql.Identifier(settings.db_schema)))
        log = migrar(conn)
        print("\n".join(log) or "Nada para migrar.")
        if args.aplicar:
            conn.commit()
            print("\nMigração gravada.")
        else:
            conn.rollback()
            print("\nSimulação: nada foi gravado. Rode com --aplicar para gravar.")


if __name__ == "__main__":
    main()
