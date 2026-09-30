"""Pedidos (RF012–RF014). Compatibilidade: api-backend.md §2.7; novos: §3.4."""

from typing import Literal
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Query
from pydantic import BaseModel

from .. import db
from ..auth import Contexto, contexto
from ..erros import ErroApi
from ..formatacao import STATUS_PEDIDO, brl, cliente_abreviado, data_curta, variacao_pct
from ..periodos import janela
from ..services import pedidos, sincronizacao

router = APIRouter(tags=["Pedidos"])

StatusPedido = Literal["aguardando", "em_separacao", "em_transporte", "entregue", "cancelado"]


class NovoStatus(BaseModel):
    status: StatusPedido


@router.get("/orders")
def listar(
    status: StatusPedido | None = None,
    limit: int = Query(default=50, ge=1, le=500),
    ids: bool = False,
    ctx: Contexto = Depends(contexto),
):
    """Array de arrays: [código, canal, data, cliente, itens, valor, status]. Mais recentes primeiro.

    Com ?ids=1 cada linha ganha o id do pedido no fim.
    """
    linhas = db.todos(
        """
        select p.id, p.codigo, m.nome as canal, p.data_pedido, c.nome as cliente,
               p.quantidade_itens, p.valor_total, p.status
          from pedido p
          join integracao i on i.id = p.integracao_id
          join marketplace m on m.id = i.marketplace_id
          left join cliente c on c.id = p.cliente_id
         where p.empresa_id = %(e)s and (%(status)s::text is null or p.status = %(status)s)
         order by p.data_pedido desc
         limit %(limit)s
        """,
        {"e": ctx.empresa_id, "status": status, "limit": limit},
    )
    return [[l["codigo"], l["canal"], data_curta(l["data_pedido"], ctx.fuso), cliente_abreviado(l["cliente"]),
             str(l["quantidade_itens"]), brl(l["valor_total"]), STATUS_PEDIDO[l["status"]],
             *([l["id"]] if ids else [])] for l in linhas]


@router.get("/orders/summary")
def resumo(ctx: Contexto = Depends(contexto)):
    """Indicadores de hoje vs. ontem até o mesmo horário (RN005, RN006)."""
    j = janela("Hoje", ctx.fuso)
    r = db.um(
        """
        select
          count(*) filter (where data_pedido >= %(ini)s and status <> 'cancelado') as pedidos,
          coalesce(sum(valor_total) filter (where data_pedido >= %(ini)s and status <> 'cancelado'), 0) as vendas,
          count(*) filter (where data_pedido >= %(a_ini)s and data_pedido < %(a_fim)s and status <> 'cancelado') as pedidos_ant,
          coalesce(sum(valor_total) filter (where data_pedido >= %(a_ini)s and data_pedido < %(a_fim)s
                                            and status <> 'cancelado'), 0) as vendas_ant
        from pedido where empresa_id = %(e)s and data_pedido >= %(a_ini)s
        """,
        {"e": ctx.empresa_id, "ini": j.inicio, "a_ini": j.anterior_inicio, "a_fim": j.anterior_fim},
    )
    por_status = {s: 0 for s in STATUS_PEDIDO}
    for l in db.todos("select status, count(*) as n from pedido where empresa_id = %s group by status", (ctx.empresa_id,)):
        por_status[l["status"]] = l["n"]

    ticket = float(r["vendas"]) / r["pedidos"] if r["pedidos"] else 0
    ticket_ant = float(r["vendas_ant"]) / r["pedidos_ant"] if r["pedidos_ant"] else 0
    return {
        "orders_today": {"value": r["pedidos"], "trend_pct": variacao_pct(r["pedidos"], r["pedidos_ant"])},
        "sales_today": {"value": float(r["vendas"]), "trend_pct": variacao_pct(r["vendas"], r["vendas_ant"])},
        "average_ticket": {"value": round(ticket, 2), "trend_pct": variacao_pct(ticket, ticket_ant)},
        "pending_orders": {"value": por_status["aguardando"] + por_status["em_separacao"], "trend_pct": None},
        "by_status": por_status,
    }


@router.post("/orders/sync", status_code=202)
def sincronizar(tarefas: BackgroundTasks, ctx: Contexto = Depends(contexto)):
    """'Sincronizar pedidos': importa pedidos novos dos canais (simulado)."""
    s = sincronizacao.iniciar(ctx.empresa_id, "pedidos")
    tarefas.add_task(sincronizacao.executar, s["sync_id"])
    return s


@router.get("/orders/{pedido_id}")
def detalhe(pedido_id: UUID, ctx: Contexto = Depends(contexto)):
    p = db.um(
        """
        select p.id, p.codigo, m.nome as canal, p.data_pedido, p.status, p.valor_total, p.quantidade_itens,
               c.nome as cliente, c.uf, nf.id as nota_id, nf.status as nota_status, nf.numero as nota_numero
          from pedido p
          join integracao i on i.id = p.integracao_id
          join marketplace m on m.id = i.marketplace_id
          left join cliente c on c.id = p.cliente_id
          left join nota_fiscal nf on nf.pedido_id = p.id
         where p.id = %s and p.empresa_id = %s
        """,
        (pedido_id, ctx.empresa_id),
    )
    if not p:
        raise ErroApi(404, "PEDIDO_NAO_ENCONTRADO", "Pedido não encontrado.")
    itens = db.todos(
        """
        select pr.nome as product, pr.sku, ip.quantidade as quantity, ip.preco_unitario as unit_price
          from item_pedido ip join produto pr on pr.id = ip.produto_id
         where ip.pedido_id = %s order by pr.nome
        """,
        (pedido_id,),
    )
    return {
        "id": p["id"], "code": p["codigo"], "channel": p["canal"], "date": p["data_pedido"],
        "customer": p["cliente"], "customer_uf": p["uf"], "items_count": p["quantidade_itens"],
        "total": float(p["valor_total"]), "status": p["status"],
        "invoice": {"id": p["nota_id"], "status": p["nota_status"], "number": p["nota_numero"]} if p["nota_id"] else None,
        "items": [{**i, "unit_price": float(i["unit_price"])} for i in itens],
    }


@router.patch("/orders/{pedido_id}/status")
def alterar_status(pedido_id: UUID, dados: NovoStatus, ctx: Contexto = Depends(contexto)):
    """Muda o status; cancelar devolve o estoque (RN017)."""
    with db.transacao() as conn:
        return pedidos.alterar_status(conn, ctx.empresa_id, pedido_id, dados.status)
