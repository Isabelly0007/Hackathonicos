"""Marketplaces e integrações (RF025–RF028). Compatibilidade: api-backend.md §2.10; novos: §3.2, §3.7."""

from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Response
from pydantic import BaseModel

from .. import db
from ..adapters.marketplace_simulado import marketplace
from ..auth import Contexto, contexto
from ..erros import ErroApi
from ..periodos import janela
from ..services import notificacoes, sincronizacao
from ..formatacao import brl

router = APIRouter(tags=["Marketplaces e integrações"])


class Conexao(BaseModel):
    marketplace: str


def _integracao(ctx: Contexto, integracao_id: UUID, conn=None) -> dict:
    i = db.um(
        """
        select i.id, i.status, m.id as marketplace_id, m.nome, m.tipo
          from integracao i join marketplace m on m.id = i.marketplace_id
         where i.id = %s and i.empresa_id = %s
        """,
        (integracao_id, ctx.empresa_id),
        conn,
    )
    if not i:
        raise ErroApi(404, "INTEGRACAO_NAO_ENCONTRADA", "Integração não encontrada.")
    return i


def _conectar(ctx: Contexto, marketplace_id: UUID, nome: str, tarefas: BackgroundTasks) -> dict:
    """Conexão SIMULADA (RN019): autoriza, publica o catálogo e dispara a primeira sincronização."""
    with db.transacao() as conn:
        dados = marketplace.conectar(conn, ctx.empresa_id, marketplace_id)
        integracao_id = db.valor(
            """
            insert into integracao (empresa_id, marketplace_id, status, conta_vinculada, simulada)
            values (%s, %s, 'conectado', %s, true)
            on conflict (empresa_id, marketplace_id)
              do update set status = 'conectado', conta_vinculada = coalesce(integracao.conta_vinculada, excluded.conta_vinculada)
            returning id
            """,
            (ctx.empresa_id, marketplace_id, dados["conta"]),
            conn,
        )
        marketplace.publicar_catalogo(conn, ctx.empresa_id, integracao_id)
        notificacoes.criar(conn, ctx.empresa_id, "integracoes", f"{nome} conectado",
                           "Produtos publicados e pedidos sendo importados (integração simulada).",
                           "refresh", "green", ("Ver marketplaces", "Marketplaces"))

    try:
        s = sincronizacao.iniciar(ctx.empresa_id, "completa", integracao_id)
        tarefas.add_task(sincronizacao.executar, s["sync_id"])
        sync_id = s["sync_id"]
    except ErroApi:
        sync_id = None  # já havia uma sincronização em andamento
    return {"integration_id": integracao_id, "status": "conectado", "simulated": True, "sync_id": sync_id}


@router.get("/marketplaces")
def listar(ctx: Contexto = Depends(contexto)):
    """Array de arrays: [nome, sigla, produtos publicados, pedidos, vendas] — pedidos e vendas de hoje (P21)."""
    hoje = janela("Hoje", ctx.fuso).inicio
    linhas = db.todos(
        """
        select m.nome, m.sigla,
               (select count(*) from anuncio a where a.integracao_id = i.id) as publicados,
               (select count(*) from pedido p where p.integracao_id = i.id and p.data_pedido >= %(hoje)s
                   and p.status <> 'cancelado') as pedidos,
               (select coalesce(sum(valor_total), 0) from pedido p where p.integracao_id = i.id
                   and p.data_pedido >= %(hoje)s and p.status <> 'cancelado') as vendas
          from integracao i join marketplace m on m.id = i.marketplace_id
         where i.empresa_id = %(e)s and i.status = 'conectado' and m.tipo = 'marketplace'
         order by m.ordem
        """,
        {"e": ctx.empresa_id, "hoje": hoje},
    )
    return [[l["nome"], l["sigla"], str(l["publicados"]), str(l["pedidos"]), brl(l["vendas"])] for l in linhas]


@router.post("/marketplaces/connect", status_code=201)
def conectar(dados: Conexao, tarefas: BackgroundTasks, ctx: Contexto = Depends(contexto)):
    m = db.um("select id, nome from marketplace where lower(nome) = lower(%s) and tipo = 'marketplace'",
              (dados.marketplace.strip(),))
    if not m:
        raise ErroApi(404, "MARKETPLACE_DESCONHECIDO", "Marketplace desconhecido. Use Mercado Livre, Shopee, Magalu ou TikTok Shop.")
    atual = db.valor("select status from integracao where empresa_id = %s and marketplace_id = %s",
                     (ctx.empresa_id, m["id"]))
    if atual == "conectado":
        raise ErroApi(409, "CANAL_JA_CONECTADO", f"{m['nome']} já está conectado.")
    return _conectar(ctx, m["id"], m["nome"], tarefas)


@router.get("/integrations")
def integracoes(ctx: Contexto = Depends(contexto)):
    return db.todos(
        """
        select i.id, m.nome as name, m.sigla as short, m.tipo as type, i.status, i.conta_vinculada as account,
               i.ultima_sincronizacao as last_sync, i.simulada as simulated
          from integracao i join marketplace m on m.id = i.marketplace_id
         where i.empresa_id = %s
         order by m.ordem
        """,
        (ctx.empresa_id,),
    )


@router.post("/integrations/{integracao_id}/sync", status_code=202)
def sincronizar(integracao_id: UUID, tarefas: BackgroundTasks, ctx: Contexto = Depends(contexto)):
    i = _integracao(ctx, integracao_id)
    if i["tipo"] != "marketplace" or i["status"] != "conectado":
        raise ErroApi(409, "INTEGRACAO_INATIVA", "Só marketplaces conectados podem ser sincronizados.")
    s = sincronizacao.iniciar(ctx.empresa_id, "completa", integracao_id)
    tarefas.add_task(sincronizacao.executar, s["sync_id"])
    return s


@router.post("/integrations/{integracao_id}/reconnect", status_code=201)
def reconectar(integracao_id: UUID, tarefas: BackgroundTasks, ctx: Contexto = Depends(contexto)):
    i = _integracao(ctx, integracao_id)
    if i["tipo"] != "marketplace":
        raise ErroApi(409, "INTEGRACAO_NAO_RECONECTAVEL", "Esta integração não usa autorização de marketplace.")
    return _conectar(ctx, i["marketplace_id"], i["nome"], tarefas)


@router.delete("/integrations/{integracao_id}", status_code=204)
def desconectar(integracao_id: UUID, ctx: Contexto = Depends(contexto)):
    """Desconecta sem apagar o histórico: pedidos e anúncios importados são mantidos (P33)."""
    with db.transacao() as conn:
        i = _integracao(ctx, integracao_id, conn)
        conn.execute("update integracao set status = 'desconectado' where id = %s", (integracao_id,))
        notificacoes.criar(conn, ctx.empresa_id, "integracoes", f"{i['nome']} desconectado",
                           "Os pedidos já importados continuam disponíveis no Taylor.", "refresh", "yellow",
                           ("Ver integrações", "Integrações"))
    return Response(status_code=204)


@router.get("/syncs/{sync_id}")
def status_sincronizacao(sync_id: UUID, ctx: Contexto = Depends(contexto)):
    return sincronizacao.consultar(ctx.empresa_id, sync_id)
