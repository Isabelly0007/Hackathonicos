"""Estoque (RF015–RF018). Compatibilidade: api-backend.md §2.8; novos: §3.5."""

from typing import Literal
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends
from pydantic import BaseModel, model_validator

from .. import db
from ..auth import Contexto, contexto
from ..formatacao import STATUS_ESTOQUE
from ..services import estoque, sincronizacao
from ..services.estoque import SQL_DIVERGENTE, status_estoque

router = APIRouter(tags=["Estoque"])

COLUNAS_CANAIS = ("Mercado Livre", "Shopee", "Magalu", "TikTok Shop")  # colunas fixas do front (RN018)


class Resolucao(BaseModel):
    source: Literal["central", "channel"]
    integration_id: UUID | None = None

    @model_validator(mode="after")
    def _canal_obrigatorio(self):
        if self.source == "channel" and self.integration_id is None:
            raise ValueError("integration_id é obrigatório quando source = channel")
        return self


def _produtos(empresa_id):
    return db.todos(
        f"""
        select p.id, p.nome, p.sku, p.estoque_central, p.estoque_minimo, {SQL_DIVERGENTE} as divergente,
               coalesce(jsonb_object_agg(m.nome, a.estoque_publicado) filter (where m.nome is not null), '{{}}') as canais
          from produto p
          left join anuncio a on a.produto_id = p.id
          left join integracao i on i.id = a.integracao_id and i.status = 'conectado'
          left join marketplace m on m.id = i.marketplace_id
         where p.empresa_id = %s
         group by p.id
         order by p.nome
        """,
        (empresa_id,),
    )


@router.get("/stock")
def listar(ctx: Contexto = Depends(contexto)):
    """Array de arrays: [nome, sku, central, mínimo, ML, Shopee, Magalu, TikTok Shop, status]. Sem anúncio no canal: '—'."""
    return [
        [p["nome"], p["sku"], str(p["estoque_central"]), str(p["estoque_minimo"]),
         *[str(p["canais"][c]) if c in p["canais"] else "—" for c in COLUNAS_CANAIS],
         STATUS_ESTOQUE[status_estoque(p["estoque_central"], p["estoque_minimo"], p["divergente"])]]
        for p in _produtos(ctx.empresa_id)
    ]


@router.get("/stock/summary")
def resumo(ctx: Contexto = Depends(contexto)):
    produtos = _produtos(ctx.empresa_id)
    status = [status_estoque(p["estoque_central"], p["estoque_minimo"], p["divergente"]) for p in produtos]
    return {
        "products": len(produtos),
        "units_available": sum(p["estoque_central"] for p in produtos),
        "low_stock": sum(1 for p in produtos if 0 < p["estoque_central"] <= p["estoque_minimo"]),
        "out_of_stock": status.count("sem_estoque"),
        "divergences": sum(1 for p in produtos if p["divergente"]),
    }


@router.post("/stock/sync", status_code=202)
def sincronizar(tarefas: BackgroundTasks, ctx: Contexto = Depends(contexto)):
    """'↻ Sincronizar estoque': envia o estoque central a todos os canais (simulado)."""
    s = sincronizacao.iniciar(ctx.empresa_id, "estoque")
    tarefas.add_task(sincronizacao.executar, s["sync_id"])
    return s


@router.get("/stock/divergences")
def divergencias(ctx: Contexto = Depends(contexto)):
    with db.transacao() as conn:
        return estoque.divergencias(conn, ctx.empresa_id)


@router.post("/stock/divergences/{produto_id}/resolve")
def resolver(produto_id: UUID, dados: Resolucao, ctx: Contexto = Depends(contexto)):
    with db.transacao() as conn:
        central = estoque.resolver_divergencia(conn, ctx.empresa_id, produto_id, dados.source, dados.integration_id)
    return {"product_id": produto_id, "central_stock": central, "status": "Sincronizado"}
