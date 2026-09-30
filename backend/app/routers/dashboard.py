"""Tela Início (RF005–RF009). Contratos de compatibilidade: api-backend.md §2.1–2.5."""

from itertools import accumulate

from fastapi import APIRouter, BackgroundTasks, Depends, Query

from .. import db
from ..auth import Contexto, contexto
from ..formatacao import COR_STATUS_PEDIDO, STATUS_PEDIDO, atras, brl, inteiro, tendencia, teto_grafico, unidades
from ..periodos import baldes, janela, validar
from ..services import sincronizacao

router = APIRouter(tags=["Dashboard"])

PERIODOS_DASHBOARD = ("Hoje", "7 dias", "30 dias")

SQL_CANAIS = """
    select i.id, m.nome, m.sigla, m.cor, i.ultima_sincronizacao
      from integracao i join marketplace m on m.id = i.marketplace_id
     where i.empresa_id = %s and i.status = 'conectado' and m.tipo = 'marketplace'
     order by m.ordem
"""


def _vendas_por_balde(empresa_id, lista_baldes, por_canal: bool) -> dict:
    """{(canal ou None, índice): (valor, pedidos)} para cada balde."""
    linhas = db.todos(
        f"""
        select b.ord - 1 as idx, {"i.id" if por_canal else "null::uuid"} as canal,
               coalesce(sum(p.valor_total), 0) as valor, count(p.id) as pedidos
          from unnest(%(inicios)s::timestamptz[], %(fins)s::timestamptz[]) with ordinality as b(ini, fim, ord)
          {"cross join integracao i join marketplace m on m.id = i.marketplace_id and m.tipo = 'marketplace'"
           if por_canal else ""}
          left join pedido p on p.empresa_id = %(e)s and p.status <> 'cancelado'
                            and p.data_pedido >= b.ini and p.data_pedido < b.fim
                            {"and p.integracao_id = i.id" if por_canal else ""}
         {"where i.empresa_id = %(e)s and i.status = 'conectado'" if por_canal else ""}
         group by 1, 2
        """,
        {"e": empresa_id, "inicios": [b.inicio for b in lista_baldes], "fins": [b.fim for b in lista_baldes]},
    )
    return {(l["canal"], l["idx"]): (float(l["valor"]), l["pedidos"]) for l in linhas}


@router.get("/dashboard/stats")
def stats(period: str, ctx: Contexto = Depends(contexto)):
    """5 indicadores, nesta ordem (RN005, RN008, RN012). Pedidos cancelados não contam."""
    validar(period, PERIODOS_DASHBOARD)
    j = janela(period, ctx.fuso)
    r = db.um(
        """
        select
          coalesce(sum(valor_total) filter (where data_pedido >= %(ini)s and data_pedido < %(fim)s), 0) as vendas,
          count(*) filter (where data_pedido >= %(ini)s and data_pedido < %(fim)s) as pedidos,
          coalesce(sum(valor_total) filter (where data_pedido >= %(a_ini)s and data_pedido < %(a_fim)s), 0) as vendas_ant,
          count(*) filter (where data_pedido >= %(a_ini)s and data_pedido < %(a_fim)s) as pedidos_ant
        from pedido
        where empresa_id = %(e)s and status <> 'cancelado' and data_pedido >= %(a_ini)s
        """,
        {"e": ctx.empresa_id, "ini": j.inicio, "fim": j.fim, "a_ini": j.anterior_inicio, "a_fim": j.anterior_fim},
    )
    p = db.um(
        """
        select count(*) as total,
               count(*) filter (where criado_em < %(ini)s) as total_antes,
               count(*) filter (where status_produto(estoque_central, estoque_minimo) <> 'ativo') as criticos,
               count(*) filter (where estoque_central = 0) as zerados
          from produto where empresa_id = %(e)s
        """,
        {"e": ctx.empresa_id, "ini": j.inicio},
    )
    canais = db.um(
        """
        select count(*) filter (where i.status = 'conectado') as conectados, count(*) as total
          from integracao i join marketplace m on m.id = i.marketplace_id
         where i.empresa_id = %s and m.tipo = 'marketplace'
        """,
        (ctx.empresa_id,),
    )

    serie = _vendas_por_balde(ctx.empresa_id, baldes(period, ctx.fuso), por_canal=False)
    spark_vendas = [serie.get((None, i), (0, 0))[0] for i in range(7)]
    spark_pedidos = [serie.get((None, i), (0, 0))[1] for i in range(7)]
    ativos_pct = round(canais["conectados"] / canais["total"] * 100) if canais["total"] else 0

    return [
        {"label": "Vendas", "value": brl(r["vendas"]), "trend": tendencia(r["vendas"], r["vendas_ant"]),
         "caption": "vs. período anterior", "icon": "dollar", "accent": "green", "spark": spark_vendas},
        {"label": "Pedidos", "value": inteiro(r["pedidos"]), "trend": tendencia(r["pedidos"], r["pedidos_ant"]),
         "caption": "vs. período anterior", "icon": "cart", "accent": "blue", "spark": spark_pedidos},
        {"label": "Produtos", "value": inteiro(p["total"]), "trend": tendencia(p["total"], p["total_antes"]),
         "caption": "cadastrados", "icon": "tag", "accent": "purple",
         "spark": [p["total_antes"]] * 6 + [p["total"]]},
        {"label": "Estoque crítico", "value": inteiro(p["criticos"]),
         "trend": f"{p['zerados']} sem estoque" if p["zerados"] else "Nenhum zerado",
         "caption": "produtos abaixo do mínimo", "icon": "alert", "accent": "red", "tone": "danger",
         "spark": [p["criticos"]] * 7},
        {"label": "Marketplaces conectados", "value": str(canais["conectados"]), "trend": f"{ativos_pct}% ativos",
         "icon": "share", "accent": "blue", "spark": [canais["conectados"]] * 7},
    ]


@router.get("/dashboard/sales")
def sales(periodo: str = Query(alias="range"), ctx: Contexto = Depends(contexto)):
    """Vendas por canal. 'Hoje' é acumulado ao longo do dia; 7 e 30 dias são por intervalo (P18)."""
    validar(periodo, PERIODOS_DASHBOARD)
    lista = baldes(periodo, ctx.fuso)
    canais = db.todos(SQL_CANAIS, (ctx.empresa_id,))
    dados = _vendas_por_balde(ctx.empresa_id, lista, por_canal=True)

    series = []
    for c in canais:
        valores = [round(dados.get((c["id"], i), (0, 0))[0], 2) for i in range(7)]
        if periodo == "Hoje":
            valores = [round(v, 2) for v in accumulate(valores)]
        series.append({"name": c["nome"], "cls": c["cor"] or "blue", "values": valores})

    maior = max((v for s in series for v in s["values"]), default=0)
    return {"labels": [b.rotulo for b in lista], "yMax": teto_grafico(maior), "series": series}


@router.get("/dashboard/order-statuses")
def order_statuses(ctx: Contexto = Depends(contexto)):
    """Pedidos dos últimos 30 dias por status (P19: o front não envia período)."""
    j = janela("30 dias", ctx.fuso)
    contagem = {
        l["status"]: l["n"]
        for l in db.todos(
            "select status, count(*) as n from pedido where empresa_id = %s and data_pedido >= %s group by status",
            (ctx.empresa_id, j.inicio),
        )
    }
    return [{"label": rotulo, "value": contagem.get(chave, 0), "color": COR_STATUS_PEDIDO[chave]}
            for chave, rotulo in STATUS_PEDIDO.items()]


@router.get("/dashboard/stock-alerts")
def stock_alerts(ctx: Contexto = Depends(contexto)):
    """Até 4 produtos em estoque baixo/zerado. Crítico = zerado ou até 25% do mínimo (P10)."""
    linhas = db.todos(
        """
        select nome, estoque_central, estoque_minimo from produto
         where empresa_id = %s and status_produto(estoque_central, estoque_minimo) <> 'ativo'
         order by estoque_central, nome
         limit 4
        """,
        (ctx.empresa_id,),
    )
    return [{"name": l["nome"], "desc": unidades(l["estoque_central"]),
             "critical": l["estoque_central"] * 4 <= l["estoque_minimo"]} for l in linhas]


@router.get("/channels")
def channels(ctx: Contexto = Depends(contexto)):
    """Canais conectados, na ordem ML, Shopee, Magalu, TikTok Shop (a posição define a cor do logo)."""
    linhas = db.todos(
        """
        select m.nome, m.sigla, i.ultima_sincronizacao,
               (select count(*) from anuncio a where a.integracao_id = i.id) as produtos
          from integracao i join marketplace m on m.id = i.marketplace_id
         where i.empresa_id = %s and i.status = 'conectado' and m.tipo = 'marketplace'
         order by m.ordem
        """,
        (ctx.empresa_id,),
    )
    return [{"name": l["nome"], "short": l["sigla"], "products": l["produtos"],
             "lastSync": atras(l["ultima_sincronizacao"])} for l in linhas]


@router.post("/channels/sync", status_code=202)
def sync_all(tarefas: BackgroundTasks, ctx: Contexto = Depends(contexto)):
    """'Sincronizar agora': produtos, pedidos e estoque de todos os canais (simulado)."""
    s = sincronizacao.iniciar(ctx.empresa_id, "completa")
    tarefas.add_task(sincronizacao.executar, s["sync_id"])
    return s
