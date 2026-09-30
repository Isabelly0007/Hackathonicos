"""Textos já formatados que o front espera nos contratos de compatibilidade (api-backend.md §2)."""

from datetime import datetime, timezone
from decimal import Decimal
from zoneinfo import ZoneInfo

STATUS_PEDIDO = {
    "aguardando": "Aguardando",
    "em_separacao": "Em separação",
    "em_transporte": "Em transporte",
    "entregue": "Entregue",
    "cancelado": "Cancelado",
}
COR_STATUS_PEDIDO = {
    "aguardando": "#2f8bff",
    "em_separacao": "#8b5cf6",
    "em_transporte": "#ff8a5b",
    "entregue": "#36db9b",
    "cancelado": "#ff5672",
}
STATUS_PRODUTO = {"ativo": "Ativo", "estoque_baixo": "Estoque baixo", "sem_estoque": "Sem estoque"}
STATUS_ESTOQUE = {
    "sincronizado": "Sincronizado",
    "divergencia": "Divergência detectada",
    "estoque_baixo": "Estoque baixo",
    "sem_estoque": "Sem estoque",
}
STATUS_NOTA = {
    "aguardando_emissao": "Aguardando emissão",
    "processando": "Processando",
    "autorizada": "Autorizada",
    "rejeitada": "Rejeitada",
}
TIPO_NOTIFICACAO = {"pedidos": "Pedidos", "estoque": "Estoque", "fiscal": "Fiscal", "integracoes": "Integrações"}


def _milhar(inteiro: str) -> str:
    return f"{int(inteiro):,}".replace(",", ".")


def brl(valor: Decimal | float | int | None) -> str:
    """7320.5 -> 'R$ 7.320,50'"""
    texto = f"{Decimal(valor or 0):.2f}"
    inteiro, centavos = texto.split(".")
    negativo = inteiro.startswith("-")
    return f"{'-' if negativo else ''}R$ {_milhar(inteiro.lstrip('-'))},{centavos}"


def inteiro(valor: int | None) -> str:
    """1204 -> '1.204'"""
    return _milhar(str(valor or 0))


def data_curta(dt: datetime | None, fuso: ZoneInfo) -> str:
    """'22/09 14:10' no fuso da empresa."""
    return dt.astimezone(fuso).strftime("%d/%m %H:%M") if dt else "—"


def _minutos_desde(dt: datetime) -> int:
    return int((datetime.now(timezone.utc) - dt).total_seconds() // 60)


def atras(dt: datetime | None) -> str:
    """'2 min atrás' (cards de canais)."""
    if dt is None:
        return "nunca"
    minutos = _minutos_desde(dt)
    if minutos < 1:
        return "agora"
    if minutos < 60:
        return f"{minutos} min atrás"
    if minutos < 24 * 60:
        return f"{minutos // 60} h atrás"
    dias = minutos // (24 * 60)
    return f"{dias} {'dia' if dias == 1 else 'dias'} atrás"


def ha(dt: datetime | None) -> str:
    """'Há 5 min' / 'Ontem' (lista de notificações)."""
    if dt is None:
        return ""
    minutos = _minutos_desde(dt)
    if minutos < 1:
        return "Agora"
    if minutos < 60:
        return f"Há {minutos} min"
    if minutos < 24 * 60:
        return f"Há {minutos // 60} h"
    if minutos < 48 * 60:
        return "Ontem"
    return f"Há {minutos // (24 * 60)} dias"


def variacao_pct(atual: float, anterior: float) -> float | None:
    if not anterior:
        return None
    return round((float(atual) - float(anterior)) / float(anterior) * 100, 1)


def tendencia(atual: float, anterior: float) -> str:
    """'↑ 18%' / '↓ 3%'. O front pinta de vermelho o que começa com '↓'."""
    pct = variacao_pct(atual, anterior)
    if pct is None:
        return "—" if not atual else "↑ novo"
    if pct < 0:
        return f"↓ {abs(round(pct)):.0f}%"
    return f"↑ {round(pct):.0f}%"


def cliente_abreviado(nome: str | None) -> str:
    """'Mariana Souza' -> 'Mariana S.'"""
    if not nome:
        return "—"
    partes = nome.split()
    return partes[0] if len(partes) == 1 else f"{partes[0]} {partes[-1][0]}."


def iniciais(nome: str) -> str:
    partes = nome.split()
    return (partes[0][0] + (partes[-1][0] if len(partes) > 1 else "")).upper()


def numero_nfe(numero: str | None) -> str:
    return f"NF-e {numero}" if numero else "Rascunho"


def teto_grafico(maximo: float) -> int:
    """Teto 'redondo' do eixo Y, múltiplo de 3 faixas (o front divide em 3)."""
    if maximo <= 0:
        return 300
    passo_bruto = maximo / 3
    ordem = 10 ** (len(str(int(passo_bruto))) - 1)
    for mult in (1, 2, 2.5, 5, 10):
        if mult * ordem >= passo_bruto:
            return int(mult * ordem * 3)
    return int(10 * ordem * 3)


def unidades(qtd: int) -> str:
    if qtd == 0:
        return "Sem estoque"
    return f"{qtd} {'unidade restante' if qtd == 1 else 'unidades restantes'}"
