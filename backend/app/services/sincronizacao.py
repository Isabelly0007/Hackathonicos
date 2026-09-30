"""Sincronização simulada com os marketplaces (UC07, RN013, RN015, RN023).

`iniciar` grava o registro (em_andamento) e responde 202; `executar` roda
em segundo plano e o front acompanha por GET /api/syncs/{id}.
"""

import logging
from uuid import UUID

from psycopg.errors import UniqueViolation

from .. import db
from ..adapters.marketplace_simulado import marketplace
from ..erros import ErroApi
from . import estoque, notificacoes, pedidos

log = logging.getLogger("taylor.sync")

SQL_PRESA = "iniciada_em < now() - interval '2 minutes'"


def iniciar(empresa_id: UUID, tipo: str, integracao_id: UUID | None = None) -> dict:
    try:
        with db.transacao() as conn:
            # Uma sincronização leva segundos: "em andamento" há mais de 2 minutos ficou presa
            # (o servidor reiniciou no meio dela) e não pode bloquear a nova.
            conn.execute(
                f"""
                update sincronizacao set status = 'erro', concluida_em = now()
                 where empresa_id = %s and status = 'em_andamento' and {SQL_PRESA}
                """,
                (empresa_id,),
            )
            return db.um(
                """
                insert into sincronizacao (empresa_id, integracao_id, tipo)
                values (%s, %s, %s)
                returning id as sync_id, status, iniciada_em as started_at
                """,
                (empresa_id, integracao_id, tipo),
                conn,
            )
    except UniqueViolation as exc:
        raise ErroApi(409, "SINCRONIZACAO_EM_ANDAMENTO", "Já existe uma sincronização em andamento.") from exc


def executar(sync_id: UUID) -> None:
    try:
        with db.transacao() as conn:
            s = db.um("select * from sincronizacao where id = %s", (sync_id,), conn)
            empresa_id = s["empresa_id"]
            canais = db.todos(
                """
                select i.id, m.nome
                  from integracao i join marketplace m on m.id = i.marketplace_id
                 where i.empresa_id = %s and i.status = 'conectado' and m.tipo = 'marketplace'
                   and (%s::uuid is null or i.id = %s::uuid)
                 order by m.ordem
                """,
                (empresa_id, s["integracao_id"], s["integracao_id"]),
                conn,
            )
            ids = [c["id"] for c in canais]

            novos = 0
            if s["tipo"] in ("completa", "pedidos"):
                for canal in canais:
                    for novo in marketplace.buscar_pedidos_novos(conn, empresa_id, canal["id"]):
                        pedidos.importar(conn, empresa_id, canal["id"], canal["nome"], novo)
                        novos += 1

            produtos: set[UUID] = set()
            if s["tipo"] in ("completa", "estoque", "produtos"):
                for canal_id in ids:
                    produtos |= estoque.enviar_central(conn, empresa_id, integracao_id=canal_id)
                for alt in marketplace.detectar_alteracoes_externas(conn, empresa_id, ids):
                    notificacoes.criar(conn, empresa_id, "estoque", f"Divergência na {alt.produto}",
                                       f"A {alt.canal} mostra {alt.publicado} unidades, mas o estoque central tem {alt.central}.",
                                       "stock", "yellow", ("Ver estoque", "Estoque"))

            conn.execute("update integracao set ultima_sincronizacao = now() where id = any(%s)", (ids,))
            conn.execute(
                """
                update sincronizacao
                   set status = 'concluida', itens_atualizados = %s, novos_pedidos = %s, concluida_em = now()
                 where id = %s
                """,
                (len(produtos), novos, sync_id),
            )

            partes = []
            if s["tipo"] != "pedidos":
                partes.append(f"{len(produtos)} produtos atualizados em {len(ids)} "
                              f"{'marketplace' if len(ids) == 1 else 'marketplaces'} sem erros.")
            if s["tipo"] in ("completa", "pedidos"):
                partes.append(f"{novos} {'pedido novo importado' if novos == 1 else 'pedidos novos importados'}.")
            notificacoes.criar(conn, empresa_id, "integracoes", "Sincronização concluída",
                               " ".join(partes), "refresh", "green")
    except Exception:
        log.exception("Falha na sincronização %s", sync_id)
        with db.transacao() as conn:
            linha = db.um(
                """
                update sincronizacao set status = 'erro', erros = erros + 1, concluida_em = now()
                 where id = %s returning empresa_id
                """,
                (sync_id,),
                conn,
            )
            if linha:
                notificacoes.criar(conn, linha["empresa_id"], "integracoes", "Falha na sincronização",
                                   "Não foi possível concluir a sincronização. Tente novamente.",
                                   "refresh", "red", ("Ver integrações", "Integrações"))


def consultar(empresa_id: UUID, sync_id: UUID) -> dict:
    s = db.um(
        """
        select s.id, s.status, s.tipo, s.itens_atualizados as items_updated, s.novos_pedidos as new_orders,
               s.erros as errors, s.iniciada_em as started_at, s.concluida_em as finished_at,
               (select count(*) from integracao i join marketplace m on m.id = i.marketplace_id
                 where i.empresa_id = s.empresa_id and i.status = 'conectado' and m.tipo = 'marketplace'
                   and (s.integracao_id is null or i.id = s.integracao_id)) as channels
          from sincronizacao s
         where s.id = %s and s.empresa_id = %s
        """,
        (sync_id, empresa_id),
    )
    if not s:
        raise ErroApi(404, "SINCRONIZACAO_NAO_ENCONTRADA", "Sincronização não encontrada.")
    return s
