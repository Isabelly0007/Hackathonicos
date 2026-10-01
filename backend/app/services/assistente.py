"""Assistente Taylor (RN033, UC17): identifica a intenção e responde com dados da empresa.

Ordem: ação rápida exata → pergunta livre com o Gemini (assistente_ia, se GEMINI_API_KEY)
→ palavras-chave. Se o Gemini falhar, as palavras-chave assumem; só sem nenhuma
intenção reconhecida a resposta é a padrão.
"""

import unicodedata
from datetime import datetime, time, timedelta
from uuid import UUID
from zoneinfo import ZoneInfo

from .. import db
from ..formatacao import brl, tendencia
from . import assistente_ia

RESPOSTA_PADRAO = (
    "Ainda estou aprendendo a responder isso. Posso ajudar com estoque, "
    "vendas de hoje, pedidos pendentes e produtos com estoque baixo."
)

INTENCOES = {
    "consultar_estoque": "visão geral do estoque: total de produtos, abaixo do mínimo, sem estoque",
    "vendas_hoje": "quanto foi vendido hoje, quantidade de pedidos",
    "pedidos_pendentes": "pedidos aguardando ou em separação",
    "consultar_estoque_baixo": "quais produtos estão com estoque baixo ou acabando",
}

ACOES_RAPIDAS = {
    "Consultar estoque": "consultar_estoque",
    "Vendas de hoje": "vendas_hoje",
    "Pedidos pendentes": "pedidos_pendentes",
    "Estoque baixo": "consultar_estoque_baixo",
}


def _normalizar(texto: str) -> str:
    sem_acento = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    return sem_acento.lower().strip()


def _por_palavras_chave(texto: str) -> str:
    t = _normalizar(texto)
    if any(p in t for p in ("baixo", "acabando", "minimo", "repor", "reposicao")):
        return "consultar_estoque_baixo"
    if "estoque" in t or "produto" in t:
        return "consultar_estoque"
    if any(p in t for p in ("pendente", "separacao", "aguardando")):
        return "pedidos_pendentes"
    if any(p in t for p in ("vend", "fatur", "hoje")):
        return "vendas_hoje"
    return "desconhecida"


def _lista(itens: list[str]) -> str:
    return itens[0] if len(itens) == 1 else ", ".join(itens[:-1]) + " e " + itens[-1]


def _consultar_estoque(empresa_id: UUID, _: ZoneInfo) -> tuple[str, list]:
    r = db.um(
        """
        select count(*) as total,
               count(*) filter (where status_produto(estoque_central, estoque_minimo) <> 'ativo') as abaixo,
               array_agg(nome order by nome) filter (where estoque_central = 0) as zerados
          from produto where empresa_id = %s
        """,
        (empresa_id,),
    )
    zerados = r["zerados"] or []
    texto = f"Você tem {r['total']} produtos cadastrados. {r['abaixo']} estão abaixo do mínimo"
    if zerados:
        texto += f" e {len(zerados)} {'está' if len(zerados) == 1 else 'estão'} sem estoque ({_lista(zerados)})"
    return texto + ".", [{"total": r["total"], "below_min": r["abaixo"], "out_of_stock": zerados}]


def _vendas_hoje(empresa_id: UUID, fuso: ZoneInfo) -> tuple[str, list]:
    agora = datetime.now(fuso)
    inicio = datetime.combine(agora.date(), time.min, tzinfo=fuso)
    r = db.um(
        """
        select coalesce(sum(valor_total) filter (where data_pedido >= %(ini)s), 0) as valor,
               count(*) filter (where data_pedido >= %(ini)s) as pedidos,
               coalesce(sum(valor_total) filter (where data_pedido >= %(ini_ant)s and data_pedido < %(fim_ant)s), 0) as anterior
          from pedido
         where empresa_id = %(e)s and status <> 'cancelado' and data_pedido >= %(ini_ant)s
        """,
        {"e": empresa_id, "ini": inicio, "ini_ant": inicio - timedelta(days=1), "fim_ant": agora - timedelta(days=1)},
    )
    texto = f"Hoje você vendeu {brl(r['valor'])} em {r['pedidos']} {'pedido' if r['pedidos'] == 1 else 'pedidos'}"
    t = tendencia(r["valor"], r["anterior"])
    if t.startswith("↑ ") and t != "↑ novo":
        texto += f", {t[2:]} acima do mesmo horário de ontem"
    elif t.startswith("↓ "):
        texto += f", {t[2:]} abaixo do mesmo horário de ontem"
    return texto + ".", [{"sales": float(r["valor"]), "orders": r["pedidos"]}]


def _pedidos_pendentes(empresa_id: UUID, _: ZoneInfo) -> tuple[str, list]:
    r = db.um(
        """
        select count(*) filter (where status = 'aguardando') as aguardando,
               count(*) filter (where status = 'em_separacao') as separacao
          from pedido where empresa_id = %s
        """,
        (empresa_id,),
    )
    total = r["aguardando"] + r["separacao"]  # RN006
    texto = f"Há {total} pedidos pendentes: {r['aguardando']} aguardando e {r['separacao']} em separação."
    return texto, [{"pending": total, "waiting": r["aguardando"], "picking": r["separacao"]}]


def _estoque_baixo(empresa_id: UUID, _: ZoneInfo) -> tuple[str, list]:
    linhas = db.todos(
        """
        select nome, estoque_central from produto
         where empresa_id = %s and status_produto(estoque_central, estoque_minimo) = 'estoque_baixo'
         order by estoque_central, nome
        """,
        (empresa_id,),
    )
    if not linhas:
        return "Nenhum produto está com estoque baixo agora.", []
    itens = [f"{l['nome']} ({l['estoque_central']})" for l in linhas]
    return (f"Produtos com estoque baixo: {_lista(itens)}.",
            [{"product": l["nome"], "stock": l["estoque_central"]} for l in linhas])


CONSULTAS = {
    "consultar_estoque": _consultar_estoque,
    "vendas_hoje": _vendas_hoje,
    "pedidos_pendentes": _pedidos_pendentes,
    "consultar_estoque_baixo": _estoque_baixo,
}


def responder(empresa_id: UUID, fuso: ZoneInfo, mensagem: str) -> tuple[dict, bool]:
    """Retorna (resposta, gemini_falhou_sem_alternativa)."""
    intencao = ACOES_RAPIDAS.get(mensagem.strip())
    gemini_falhou = False

    if intencao is None:
        # Pergunta livre: o Gemini consulta o banco por ferramentas de leitura.
        livre = assistente_ia.responder_livre(empresa_id, fuso, mensagem)
        if livre is not None:
            resposta, falhou = livre
            if not falhou:
                return resposta, False
            gemini_falhou = True
        intencao = _por_palavras_chave(mensagem)  # sem chave ou Gemini fora

    if intencao not in CONSULTAS:
        return {"reply": RESPOSTA_PADRAO, "intent": "desconhecida", "data": [], "action_executed": None}, gemini_falhou

    texto, dados = CONSULTAS[intencao](empresa_id, fuso)
    return {"reply": texto, "intent": intencao, "data": dados, "action_executed": None}, False
