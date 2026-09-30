"""Relatórios (RF029). Contrato proposto: api-backend.md §3.8."""

from datetime import date

from fastapi import APIRouter, Depends, Query

from .. import db
from ..auth import Contexto, contexto
from ..erros import ErroApi
from ..formatacao import variacao_pct
from ..periodos import baldes, janela, janela_personalizada, validar

router = APIRouter(tags=["Relatórios"])


@router.get("/reports")
def relatorio(
    period: str = "7 dias",
    de: date | None = Query(default=None, alias="from"),
    ate: date | None = Query(default=None, alias="to"),
    ctx: Contexto = Depends(contexto),
):
    """Período: 7 dias, 30 dias, 3 meses ou custom (com from/to). Top 4 produtos por receita (P22)."""
    validar(period, ("7 dias", "30 dias", "3 meses", "custom"))
    if period == "custom":
        if not de or not ate:
            raise ErroApi(400, "PERIODO_INVALIDO", "Informe from e to (AAAA-MM-DD) no período personalizado.")
        j = janela_personalizada(de, ate, ctx.fuso)
        lista = baldes("custom", ctx.fuso, j)
    else:
        j = janela(period, ctx.fuso)
        lista = baldes(period, ctx.fuso)

    params = {"e": ctx.empresa_id, "ini": j.inicio, "fim": j.fim, "a_ini": j.anterior_inicio, "a_fim": j.anterior_fim}
    r = db.um(
        """
        with base as (
          select p.id, p.valor_total, p.data_pedido >= %(ini)s as atual
            from pedido p
           where p.empresa_id = %(e)s and p.status <> 'cancelado'
             and ((p.data_pedido >= %(ini)s and p.data_pedido < %(fim)s)
               or (p.data_pedido >= %(a_ini)s and p.data_pedido < %(a_fim)s))
        )
        select coalesce(sum(valor_total) filter (where atual), 0) as vendas,
               coalesce(sum(valor_total) filter (where not atual), 0) as vendas_ant,
               count(*) filter (where atual) as pedidos,
               count(*) filter (where not atual) as pedidos_ant,
               coalesce((select sum(ip.quantidade) from item_pedido ip join base b on b.id = ip.pedido_id where b.atual), 0) as itens,
               coalesce((select sum(ip.quantidade) from item_pedido ip join base b on b.id = ip.pedido_id where not b.atual), 0) as itens_ant
          from base
        """,
        params,
    )
    ticket = float(r["vendas"]) / r["pedidos"] if r["pedidos"] else 0
    ticket_ant = float(r["vendas_ant"]) / r["pedidos_ant"] if r["pedidos_ant"] else 0

    evolucao = db.todos(
        """
        select b.ord, coalesce(sum(p.valor_total), 0) as valor
          from unnest(%(inicios)s::timestamptz[], %(fins)s::timestamptz[]) with ordinality as b(ini, fim, ord)
          left join pedido p on p.empresa_id = %(e)s and p.status <> 'cancelado'
                            and p.data_pedido >= b.ini and p.data_pedido < b.fim
         group by b.ord order by b.ord
        """,
        {"e": ctx.empresa_id, "inicios": [b.inicio for b in lista], "fins": [b.fim for b in lista]},
    )
    por_canal = db.todos(
        """
        select m.nome as name, coalesce(sum(p.valor_total), 0) as valor
          from pedido p
          join integracao i on i.id = p.integracao_id
          join marketplace m on m.id = i.marketplace_id
         where p.empresa_id = %(e)s and p.status <> 'cancelado' and p.data_pedido >= %(ini)s and p.data_pedido < %(fim)s
         group by m.nome, m.ordem order by m.ordem
        """,
        params,
    )
    total_canais = sum(float(c["valor"]) for c in por_canal) or 1
    top = db.todos(
        """
        select pr.nome as name, sum(ip.quantidade) as units, sum(ip.quantidade * ip.preco_unitario) as revenue
          from item_pedido ip
          join pedido p on p.id = ip.pedido_id
          join produto pr on pr.id = ip.produto_id
         where p.empresa_id = %(e)s and p.status <> 'cancelado' and p.data_pedido >= %(ini)s and p.data_pedido < %(fim)s
         group by pr.id, pr.nome
         order by revenue desc
         limit 4
        """,
        params,
    )

    return {
        "summary": {
            "total_sales": {"value": float(r["vendas"]), "trend_pct": variacao_pct(r["vendas"], r["vendas_ant"])},
            "orders": {"value": r["pedidos"], "trend_pct": variacao_pct(r["pedidos"], r["pedidos_ant"])},
            "average_ticket": {"value": round(ticket, 2), "trend_pct": variacao_pct(ticket, ticket_ant)},
            "products_sold": {"value": int(r["itens"]), "trend_pct": variacao_pct(r["itens"], r["itens_ant"])},
        },
        "sales_evolution": {"labels": [b.rotulo for b in lista], "values": [float(e["valor"]) for e in evolucao]},
        "sales_by_marketplace": [{"name": c["name"], "share_pct": round(float(c["valor"]) / total_canais * 100)}
                                 for c in por_canal],
        "top_products": [{"position": i + 1, "name": t["name"], "units": int(t["units"]), "revenue": float(t["revenue"])}
                         for i, t in enumerate(top)],
    }
