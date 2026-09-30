"""Estoque central e propagação para os canais (RN013–RN018).

Decisões para pendências da documentação:
  * P8  estoque baixo = estoque_central <= estoque_minimo (função SQL status_produto);
  * P9  prioridade do status: sem estoque > divergência > estoque baixo > sincronizado;
  * P15 anúncio pausado por falta de estoque é reativado quando o estoque volta;
  * após uma venda, só os anúncios que estavam sincronizados recebem a nova
    quantidade; divergências existentes ficam para o lojista revisar (RN015).
"""

from uuid import UUID

from psycopg import Connection

from .. import db
from ..erros import ErroApi
from . import notificacoes

SQL_DIVERGENTE = """
    exists (
        select 1 from anuncio a
        join integracao i on i.id = a.integracao_id and i.status = 'conectado'
        where a.produto_id = p.id and a.estoque_publicado <> p.estoque_central
    )
"""


def status_estoque(estoque: int, minimo: int, divergente: bool) -> str:
    if estoque == 0:
        return "sem_estoque"
    if divergente:
        return "divergencia"
    if estoque <= minimo:
        return "estoque_baixo"
    return "sincronizado"


def preferencias(conn: Connection, empresa_id: UUID) -> dict:
    return db.um("select * from preferencia_empresa where empresa_id = %s", (empresa_id,), conn)


def definir_motivo(conn: Connection, tipo: str, observacao: str | None = None) -> None:
    """Motivo gravado em movimento_estoque pelo trigger do banco."""
    conn.execute(
        "select set_config('taylor.movimento_tipo', %s, true), set_config('taylor.movimento_obs', %s, true)",
        (tipo, observacao or ""),
    )


def enviar_central(
    conn: Connection,
    empresa_id: UUID,
    produto_ids: list[UUID] | None = None,
    integracao_id: UUID | None = None,
) -> set[UUID]:
    """Envia o estoque central a todos os anúncios dos canais conectados (simulado).

    Equivale a `atualizar_estoque` + `pausar_anuncio` do adaptador de
    marketplace; no MVP a "resposta do canal" é gravar no próprio anúncio.
    Retorna os produtos atualizados.
    """
    pausar = preferencias(conn, empresa_id)["pausar_anuncio_sem_estoque"]
    linhas = db.todos(
        """
        update anuncio a set
            estoque_publicado = p.estoque_central,
            status = case
                when p.estoque_central = 0 and %(pausar)s then 'pausado'
                when p.estoque_central > 0 and a.status = 'pausado' then 'ativo'
                else a.status
            end
        from produto p, integracao i
        where a.produto_id = p.id
          and a.integracao_id = i.id
          and i.status = 'conectado'
          and p.empresa_id = %(empresa)s
          and (%(produtos)s::uuid[] is null or p.id = any(%(produtos)s::uuid[]))
          and (%(integracao)s::uuid is null or i.id = %(integracao)s::uuid)
        returning a.produto_id
        """,
        {"pausar": pausar, "empresa": empresa_id, "produtos": produto_ids, "integracao": integracao_id},
        conn,
    )
    return {linha["produto_id"] for linha in linhas}


def _apos_mudanca(conn: Connection, empresa_id: UUID, mudancas: list[dict]) -> None:
    """Propaga (se automático) e gera notificações de estoque zerado/baixo."""
    prefs = preferencias(conn, empresa_id)
    for m in mudancas:
        if prefs["sincronizar_estoque_auto"]:
            conn.execute(
                """
                update anuncio a set
                    estoque_publicado = %(atual)s,
                    status = case
                        when %(atual)s = 0 and %(pausar)s then 'pausado'
                        when %(atual)s > 0 and a.status = 'pausado' then 'ativo'
                        else a.status
                    end
                from integracao i
                where a.integracao_id = i.id and i.status = 'conectado'
                  and a.produto_id = %(produto)s and a.estoque_publicado = %(anterior)s
                """,
                {**m, "pausar": prefs["pausar_anuncio_sem_estoque"]},
            )

        if m["atual"] == 0 and m["anterior"] > 0:
            descricao = (
                "O anúncio foi pausado automaticamente em todos os canais."
                if prefs["pausar_anuncio_sem_estoque"]
                else "Reponha o estoque para continuar vendendo."
            )
            notificacoes.criar(conn, empresa_id, "estoque", f"{m['nome']} sem estoque", descricao,
                               "alert", "red", ("Ver estoque", "Estoque"))
        elif 0 < m["atual"] <= m["minimo"] < m["anterior"]:
            notificacoes.criar(conn, empresa_id, "estoque", f"{m['nome']} com estoque baixo",
                               f"Restam {m['atual']} unidades (mínimo: {m['minimo']}).",
                               "stock", "yellow", ("Ver estoque", "Estoque"))


def aplicar_pedido(conn: Connection, empresa_id: UUID, pedido_id: UUID, sinal: int, tipo: str, observacao: str) -> None:
    """Baixa (sinal=-1, RN013) ou estorna (sinal=+1, RN017) os itens do pedido."""
    definir_motivo(conn, tipo, observacao)
    mudancas = db.todos(
        """
        update produto p
           set estoque_central = greatest(p.estoque_central + %(sinal)s * i.qtd, 0)
          from (select produto_id, sum(quantidade) as qtd
                  from item_pedido where pedido_id = %(pedido)s group by produto_id) i,
               produto antes
         where p.id = i.produto_id and antes.id = p.id
        returning p.id as produto, p.nome, p.estoque_minimo as minimo,
                  antes.estoque_central as anterior, p.estoque_central as atual
        """,
        {"sinal": sinal, "pedido": pedido_id},
        conn,
    )
    _apos_mudanca(conn, empresa_id, mudancas)


def alterar_central(conn: Connection, empresa_id: UUID, produto_id: UUID, novo: int, tipo: str, observacao: str | None = None) -> None:
    definir_motivo(conn, tipo, observacao)
    mudanca = db.um(
        """
        update produto p set estoque_central = %(novo)s
          from produto antes
         where p.id = %(produto)s and p.empresa_id = %(empresa)s and antes.id = p.id
        returning p.id as produto, p.nome, p.estoque_minimo as minimo,
                  antes.estoque_central as anterior, p.estoque_central as atual
        """,
        {"novo": novo, "produto": produto_id, "empresa": empresa_id},
        conn,
    )
    if mudanca and mudanca["anterior"] != mudanca["atual"]:
        _apos_mudanca(conn, empresa_id, [mudanca])


def divergencias(conn: Connection, empresa_id: UUID, produto_id: UUID | None = None) -> list[dict]:
    linhas = db.todos(
        f"""
        select p.id as product_id, p.nome, p.sku, p.estoque_central,
               m.nome as canal, i.id as integracao_id, a.estoque_publicado
          from produto p
          join anuncio a on a.produto_id = p.id
          join integracao i on i.id = a.integracao_id and i.status = 'conectado'
          join marketplace m on m.id = i.marketplace_id
         where p.empresa_id = %(empresa)s
           and (%(produto)s::uuid is null or p.id = %(produto)s::uuid)
           and {SQL_DIVERGENTE}
         order by p.nome, m.ordem
        """,
        {"empresa": empresa_id, "produto": produto_id},
        conn,
    )
    resultado: dict[UUID, dict] = {}
    for l in linhas:
        item = resultado.setdefault(l["product_id"], {
            "product_id": l["product_id"], "product": l["nome"], "sku": l["sku"],
            "central_stock": l["estoque_central"], "channels": [],
        })
        item["channels"].append({
            "channel": l["canal"], "integration_id": l["integracao_id"], "published_stock": l["estoque_publicado"],
        })
    return list(resultado.values())


def resolver_divergencia(conn: Connection, empresa_id: UUID, produto_id: UUID, fonte: str, integracao_id: UUID | None) -> int:
    """RN015: o lojista escolhe o valor que prevalece e o sistema sincroniza os canais."""
    produto = db.um("select id, nome from produto where id = %s and empresa_id = %s for update",
                    (produto_id, empresa_id), conn)
    if not produto:
        raise ErroApi(404, "PRODUTO_NAO_ENCONTRADO", "Produto não encontrado.")
    lista = divergencias(conn, empresa_id, produto_id)
    if not lista:
        raise ErroApi(409, "SEM_DIVERGENCIA", "Este produto não possui divergência de estoque.")

    if fonte == "channel":
        canal = next((c for c in lista[0]["channels"] if c["integration_id"] == integracao_id), None)
        if canal is None:
            raise ErroApi(404, "ANUNCIO_NAO_ENCONTRADO", "O produto não está publicado nesse canal.",
                          {"integration_id": "Canal sem anúncio deste produto"})
        alterar_central(conn, empresa_id, produto_id, canal["published_stock"], "divergencia",
                        f"Divergência resolvida com o valor de {canal['channel']}")

    enviar_central(conn, empresa_id, [produto_id])
    return db.valor("select estoque_central from produto where id = %s", (produto_id,), conn)
