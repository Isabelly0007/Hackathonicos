"""Notificações (RF030). Contratos propostos: api-backend.md §3.9. Leitura por empresa (P35)."""

from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Response

from .. import db
from ..auth import Contexto, contexto
from ..erros import ErroApi
from ..formatacao import TIPO_NOTIFICACAO, ha
from ..periodos import janela

router = APIRouter(tags=["Notificações"])

Filtro = Literal["todas", "nao_lidas", "pedidos", "estoque", "fiscal", "integracoes"]


@router.get("/notifications")
def listar(filter: Filtro = "todas", ctx: Contexto = Depends(contexto)):
    linhas = db.todos(
        """
        select id, tipo, titulo, descricao, icone, tom, lida, acao_rotulo, acao_pagina, criada_em
          from notificacao
         where empresa_id = %(e)s
           and case %(f)s::text when 'todas' then true when 'nao_lidas' then not lida else tipo = %(f)s::text end
         order by criada_em desc
         limit 100
        """,
        {"e": ctx.empresa_id, "f": filter},
    )
    return [
        {"id": n["id"], "type": TIPO_NOTIFICACAO[n["tipo"]], "icon": n["icone"] or "bell", "tone": n["tom"] or "blue",
         "title": n["titulo"], "desc": n["descricao"], "time": ha(n["criada_em"]), "created_at": n["criada_em"],
         "unread": not n["lida"],
         "action": [n["acao_rotulo"], n["acao_pagina"]] if n["acao_rotulo"] else None}
        for n in linhas
    ]


@router.get("/notifications/summary")
def resumo(ctx: Contexto = Depends(contexto)):
    hoje = janela("Hoje", ctx.fuso).inicio
    return db.um(
        """
        select count(*) filter (where not n.lida) as unread,
               count(*) filter (where n.criada_em >= %(hoje)s) as received_today,
               count(*) filter (where n.tom = 'red' and not n.lida) as critical,
               (select count(*) from pedido p where p.empresa_id = %(e)s and p.data_pedido >= %(hoje)s) as new_orders,
               0 as delivered_telegram
          from notificacao n where n.empresa_id = %(e)s
        """,
        {"e": ctx.empresa_id, "hoje": hoje},
    )


@router.patch("/notifications/{notificacao_id}/read", status_code=204)
def marcar_lida(notificacao_id: UUID, ctx: Contexto = Depends(contexto)):
    with db.transacao() as conn:
        n = conn.execute("update notificacao set lida = true where id = %s and empresa_id = %s",
                         (notificacao_id, ctx.empresa_id)).rowcount
    if not n:
        raise ErroApi(404, "NOTIFICACAO_NAO_ENCONTRADA", "Notificação não encontrada.")
    return Response(status_code=204)


@router.post("/notifications/read-all")
def marcar_todas(ctx: Contexto = Depends(contexto)):
    with db.transacao() as conn:
        n = conn.execute("update notificacao set lida = true where empresa_id = %s and not lida",
                         (ctx.empresa_id,)).rowcount
    return {"updated": n}
