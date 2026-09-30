"""Notas fiscais SIMULADAS (RF019–RF023). Compatibilidade: api-backend.md §2.9; novos: §3.6."""

from datetime import date
from typing import Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, Query
from pydantic import BaseModel

from .. import db
from ..auth import Contexto, contexto
from ..erros import ErroApi
from ..formatacao import STATUS_NOTA, brl, cliente_abreviado, data_curta, numero_nfe
from ..periodos import janela
from ..services import fiscal

router = APIRouter(tags=["Notas fiscais"])

StatusNota = Literal["aguardando_emissao", "processando", "autorizada", "rejeitada"]

SQL_NOTAS = """
    select nf.id, nf.numero, nf.status, nf.valor, nf.motivo_rejeicao, nf.xml_url, nf.emitida_em, nf.criado_em,
           nf.pendencias, pe.codigo as pedido, m.nome as canal, c.nome as cliente
      from nota_fiscal nf
      join pedido pe on pe.id = nf.pedido_id
      join integracao i on i.id = pe.integracao_id
      join marketplace m on m.id = i.marketplace_id
      left join cliente c on c.id = pe.cliente_id
     where nf.empresa_id = %(e)s
"""


class EmitirNota(BaseModel):
    order_id: UUID


class EmitirLote(BaseModel):
    order_ids: list[UUID] | None = None


def _objeto(n: dict) -> dict:
    return {
        "id": n["id"], "number": numero_nfe(n["numero"]) if n["numero"] else None, "order": n["pedido"],
        "channel": n["canal"], "customer": cliente_abreviado(n["cliente"]), "value": float(n["valor"]),
        "status": n["status"], "rejection_reason": n["motivo_rejeicao"], "pending_issues": n["pendencias"] or [],
        "xml_url": n["xml_url"], "issued_at": n["emitida_em"], "simulated": True,
    }


def _buscar(ctx: Contexto, nota_id: UUID) -> dict:
    n = db.um(SQL_NOTAS + " and nf.id = %(id)s", {"e": ctx.empresa_id, "id": nota_id})
    if not n:
        raise ErroApi(404, "NOTA_NAO_ENCONTRADA", "Nota fiscal não encontrada.")
    return n


def _emitir(ctx: Contexto, nota_id: UUID, tarefas: BackgroundTasks) -> dict:
    nota, pendencias = fiscal.solicitar_emissao(ctx.empresa_id, nota_id)
    if pendencias:
        raise ErroApi(422, "DADOS_FISCAIS_INCOMPLETOS",
                      "A validação fiscal encontrou pendências. A nota não foi enviada (rejeição evitada).",
                      {f"pendencia_{i + 1}": p for i, p in enumerate(pendencias)})
    tarefas.add_task(fiscal.processar_sefaz, [nota["id"]])
    return _objeto(_buscar(ctx, nota_id))


@router.get("/invoices")
def listar(status: StatusNota | None = None, limit: int = Query(default=50, ge=1, le=500), ids: bool = False,
           ctx: Contexto = Depends(contexto)):
    """Array de arrays: [nota, pedido, canal, cliente, valor, status, data].

    Com ?ids=1 cada linha ganha o id da nota no fim.
    """
    linhas = db.todos(
        SQL_NOTAS + """ and (%(status)s::text is null or nf.status = %(status)s)
        order by coalesce(nf.emitida_em, nf.criado_em) desc limit %(limit)s""",
        {"e": ctx.empresa_id, "status": status, "limit": limit},
    )
    return [[numero_nfe(n["numero"]), n["pedido"], n["canal"], cliente_abreviado(n["cliente"]), brl(n["valor"]),
             STATUS_NOTA[n["status"]], data_curta(n["emitida_em"] or n["criado_em"], ctx.fuso),
             *([n["id"]] if ids else [])] for n in linhas]


@router.get("/invoices/summary")
def resumo(ctx: Contexto = Depends(contexto)):
    hoje = janela("Hoje", ctx.fuso).inicio
    return db.um(
        """
        select count(*) filter (where nf.status = 'aguardando_emissao' and pe.status <> 'cancelado') as ready_to_invoice,
               count(*) filter (where nf.status = 'autorizada' and nf.emitida_em >= %(hoje)s) as issued_today,
               count(*) filter (where nf.status = 'aguardando_emissao') as awaiting,
               count(*) filter (where nf.status = 'processando') as processing,
               count(*) filter (where nf.status = 'autorizada') as authorized,
               count(*) filter (where nf.status = 'rejeitada') as rejected,
               coalesce(round(avg(extract(epoch from nf.emitida_em - nf.criado_em))
                              filter (where nf.status = 'autorizada' and nf.emitida_em >= %(hoje)s - interval '7 days')), 0)::int
                 as avg_issue_seconds,
               coalesce(sum(nf.bloqueios), 0)::int as rejections_avoided
          from nota_fiscal nf join pedido pe on pe.id = nf.pedido_id
         where nf.empresa_id = %(e)s
        """,
        {"e": ctx.empresa_id, "hoje": hoje},
    )


@router.get("/invoices/fiscal-health")
def saude_fiscal(ctx: Contexto = Depends(contexto)):
    """Saúde fiscal (RF022). Nota (P26): 100 menos 10 por item com problema, limitada a 0."""
    p = db.um(
        """
        select count(*) as total,
               count(*) filter (where ncm ~ '^[0-9]{8}$') as com_ncm,
               count(*) filter (where origem_fiscal is null) as sem_origem
          from produto where empresa_id = %s
        """,
        (ctx.empresa_id,),
    )
    validade = db.valor("select validade from certificado_digital where empresa_id = %s", (ctx.empresa_id,))
    dias = (validade - date.today()).days if validade else None

    pct_ncm = round(p["com_ncm"] / p["total"] * 100) if p["total"] else 100
    itens = [
        {"ok": p["com_ncm"] == p["total"], "text": f"NCM preenchido em {p['com_ncm']} produtos", "value": f"{pct_ncm}%"},
        {"ok": dias is not None and dias > 30,
         "text": "Certificado A1 válido" if dias and dias > 0 else "Certificado A1 ausente ou vencido",
         "value": f"{dias} dias" if dias and dias > 0 else "Substituir"},
        {"ok": p["sem_origem"] == 0,
         "text": f"{p['sem_origem']} produtos sem origem fiscal" if p["sem_origem"] else "Origem fiscal em todos os produtos",
         "value": "Corrigir" if p["sem_origem"] else "100%"},
    ]
    problemas = (p["total"] - p["com_ncm"]) + p["sem_origem"] + (0 if dias and dias > 30 else 1)
    nota = max(0, 100 - 10 * problemas)
    rotulo = "Excelente" if nota >= 90 else "Boa" if nota >= 70 else "Atenção" if nota >= 50 else "Crítica"
    return {"score": nota, "label": rotulo, "items": itens, "rules_checked": 23, "guard_active": True}


@router.post("/invoices", status_code=201)
def emitir(dados: EmitirNota, tarefas: BackgroundTasks, ctx: Contexto = Depends(contexto)):
    """'＋ Emitir nota fiscal' de um pedido."""
    nota_id = db.valor(
        """
        select nf.id from nota_fiscal nf join pedido pe on pe.id = nf.pedido_id
         where pe.id = %s and pe.empresa_id = %s
        """,
        (dados.order_id, ctx.empresa_id),
    )
    if nota_id is None:
        existe = db.valor("select status from pedido where id = %s and empresa_id = %s", (dados.order_id, ctx.empresa_id))
        if existe is None:
            raise ErroApi(404, "PEDIDO_NAO_ENCONTRADO", "Pedido não encontrado.")
        if existe == "cancelado":
            raise ErroApi(409, "PEDIDO_CANCELADO", "Pedido cancelado não pode ser faturado.")
        with db.transacao() as conn:
            nota_id = db.valor(
                "insert into nota_fiscal (empresa_id, pedido_id, valor) select empresa_id, id, valor_total "
                "from pedido where id = %s returning id",
                (dados.order_id,),
                conn,
            )
    return _emitir(ctx, nota_id, tarefas)


@router.post("/invoices/batch", status_code=202)
def emitir_lote(dados: EmitirLote, tarefas: BackgroundTasks, ctx: Contexto = Depends(contexto)):
    """'Emitir NF-e em lote': sem order_ids, emite todos os pedidos prontos para faturar (RN029)."""
    ids = [l["id"] for l in db.todos(
        """
        select nf.id from nota_fiscal nf join pedido pe on pe.id = nf.pedido_id
         where nf.empresa_id = %(e)s and nf.status = 'aguardando_emissao' and pe.status <> 'cancelado'
           and (%(pedidos)s::uuid[] is null or pe.id = any(%(pedidos)s::uuid[]))
        """,
        {"e": ctx.empresa_id, "pedidos": dados.order_ids},
    )]
    tarefas.add_task(fiscal.emitir_lote, ctx.empresa_id, ids)
    return {"batch_id": uuid4(), "total": len(ids), "status": "processando"}


@router.get("/invoices/{nota_id}")
def detalhe(nota_id: UUID, ctx: Contexto = Depends(contexto)):
    return _objeto(_buscar(ctx, nota_id))


@router.post("/invoices/{nota_id}/emit")
def emitir_rascunho(nota_id: UUID, tarefas: BackgroundTasks, ctx: Contexto = Depends(contexto)):
    """Emite uma nota em rascunho (aguardando emissão) escolhida na lista."""
    if _buscar(ctx, nota_id)["status"] != "aguardando_emissao":
        raise ErroApi(409, "NFE_NAO_PENDENTE", "Só notas aguardando emissão podem ser emitidas.")
    return _emitir(ctx, nota_id, tarefas)


@router.post("/invoices/{nota_id}/resend")
def reenviar(nota_id: UUID, tarefas: BackgroundTasks, ctx: Contexto = Depends(contexto)):
    """Reenvia NF-e rejeitada após correção (RN027)."""
    if _buscar(ctx, nota_id)["status"] != "rejeitada":
        raise ErroApi(409, "NFE_NAO_REJEITADA", "Só notas rejeitadas podem ser reenviadas.")
    return _emitir(ctx, nota_id, tarefas)
