"""SEFAZ SIMULADA (RN024, integracoes.md §6).

Critério de rejeição (pendência P27): sorteio com a taxa SEFAZ_TAXA_REJEICAO,
aplicado só a notas que já passaram pela validação fiscal do Taylor.
"""

import random

from ..config import settings

MOTIVOS_REJEICAO = [
    "SEFAZ: CFOP incompatível com a UF de destino.",
    "SEFAZ: NCM informado não consta na tabela TIPI vigente.",
    "SEFAZ: Inscrição estadual do emitente não vinculada ao CNPJ.",
    "SEFAZ: Valor total da nota difere da soma dos itens.",
]


def cfop(uf_emitente: str | None, uf_destino: str | None) -> str:
    """CFOP sugerido conforme a UF de destino (venda a consumidor final)."""
    return "5102" if uf_emitente and uf_emitente == uf_destino else "6108"


def enviar(numero: str) -> tuple[bool, str | None, str | None]:
    """Retorna (autorizada, motivo_rejeicao, xml_url)."""
    if random.random() < settings.sefaz_taxa_rejeicao:
        return False, random.choice(MOTIVOS_REJEICAO), None
    return True, None, f"simulado://nfe/{numero}.xml"
