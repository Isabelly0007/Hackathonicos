"""Janelas de tempo dos indicadores e gráficos (RN008).

Cada período termina "agora" e começa à meia-noite (fuso da empresa) do
primeiro dia. O período anterior tem a mesma duração, deslocado para trás.
"""

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from .erros import ErroApi

DIAS_POR_PERIODO = {"Hoje": 1, "7 dias": 7, "30 dias": 30, "3 meses": 90}
HORAS_HOJE = [8, 10, 12, 14, 16, 18, 20]


@dataclass
class Janela:
    inicio: datetime
    fim: datetime
    anterior_inicio: datetime
    anterior_fim: datetime


@dataclass
class Balde:
    rotulo: str
    inicio: datetime
    fim: datetime


def validar(periodo: str, aceitos: tuple[str, ...]) -> str:
    if periodo not in aceitos:
        raise ErroApi(400, "PERIODO_INVALIDO", f"Período inválido. Use: {', '.join(aceitos)}.")
    return periodo


def _meia_noite(fuso: ZoneInfo, dias_atras: int = 0) -> datetime:
    hoje = datetime.now(fuso).date() - timedelta(days=dias_atras)
    return datetime.combine(hoje, time.min, tzinfo=fuso)


def janela(periodo: str, fuso: ZoneInfo) -> Janela:
    dias = DIAS_POR_PERIODO[periodo]
    agora = datetime.now(fuso)
    inicio = _meia_noite(fuso, dias - 1)
    duracao = timedelta(days=dias)
    return Janela(inicio, agora, inicio - duracao, agora - duracao)


def janela_personalizada(de: date, ate: date, fuso: ZoneInfo) -> Janela:
    if ate < de:
        raise ErroApi(400, "PERIODO_INVALIDO", "A data final deve ser posterior à inicial.")
    inicio = datetime.combine(de, time.min, tzinfo=fuso)
    fim = datetime.combine(ate + timedelta(days=1), time.min, tzinfo=fuso)
    duracao = fim - inicio
    return Janela(inicio, fim, inicio - duracao, fim - duracao)


def baldes(periodo: str, fuso: ZoneInfo, j: Janela | None = None) -> list[Balde]:
    """7 intervalos consecutivos para gráficos e minigráficos.

    Hoje: até 08h, 08–10h, …, 18h–fim do dia (rótulos 08h…20h).
    7 dias: um balde por dia do calendário (dd/mm).
    Demais: 7 fatias iguais do período, rotuladas com a data final (dd/mm).
    """
    if periodo == "Hoje":
        zero = _meia_noite(fuso)
        limites = [zero] + [zero + timedelta(hours=h) for h in HORAS_HOJE[:-1]] + [zero + timedelta(days=1)]
        return [Balde(f"{h:02d}h", limites[i], limites[i + 1]) for i, h in enumerate(HORAS_HOJE)]

    if periodo == "7 dias" and j is None:
        dias = [_meia_noite(fuso, n) for n in range(6, -1, -1)]
        return [Balde(d.strftime("%d/%m"), d, d + timedelta(days=1)) for d in dias]

    j = j or janela(periodo, fuso)
    passo = (j.fim - j.inicio) / 7
    resultado = []
    for i in range(7):
        ini = j.inicio + passo * i
        fim = j.inicio + passo * (i + 1)
        rotulo = (fim - timedelta(seconds=1)).astimezone(fuso).strftime("%d/%m")
        resultado.append(Balde(rotulo, ini, fim))
    return resultado
