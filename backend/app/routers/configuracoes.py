"""Configurações (RF031–RF036). Contratos propostos: api-backend.md §3.10."""

from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends
from psycopg.errors import UniqueViolation
from pydantic import BaseModel, EmailStr, Field, field_validator

from .. import db
from ..auth import Contexto, contexto
from ..cnpj import formatar_cnpj, validar_cnpj
from ..erros import ErroApi

router = APIRouter(prefix="/settings", tags=["Configurações"])

UFS = {"AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE",
       "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"}


class Empresa(BaseModel):
    legal_name: str | None = None
    trade_name: str = Field(min_length=1)
    cnpj: str
    state_registration: str | None = None
    tax_regime: Literal["simples_nacional", "lucro_presumido", "lucro_real"] | None = None
    contact_email: EmailStr | None = None
    phone: str | None = None
    address: str | None = None
    state: str | None = None
    logo_url: str | None = None

    @field_validator("cnpj")
    @classmethod
    def _cnpj(cls, v: str) -> str:
        return validar_cnpj(v)

    @field_validator("state")
    @classmethod
    def _uf(cls, v: str | None) -> str | None:
        if v and v.upper() not in UFS:
            raise ValueError("UF inválida")
        return v.upper() if v else v


class Certificado(BaseModel):
    holder: str | None = None
    valid_until: date


class Alertas(BaseModel):
    telegram: bool
    email: bool
    push: bool
    daily_summary: bool


class Preferencias(BaseModel):
    language: Literal["pt-BR", "en", "es"]
    timezone: Literal["America/Sao_Paulo", "America/Manaus", "America/Noronha"]
    auto_sync_stock: bool
    pause_out_of_stock: bool
    auto_import_orders: bool
    check_interval_minutes: Literal[5, 15, 30, 60]
    alerts: Alertas


Evento = Literal["novo_pedido", "estoque_baixo", "divergencia_estoque", "nfe_rejeitada", "resumo_diario"]


class EventoNotificacao(BaseModel):
    event: Evento
    telegram: bool
    email: bool
    push: bool


class MatrizNotificacoes(BaseModel):
    events: list[EventoNotificacao]


# ---------- Empresa ----------

def _empresa(empresa_id) -> dict:
    e = db.um("select * from empresa where id = %s", (empresa_id,))
    return {
        "legal_name": e["razao_social"], "trade_name": e["nome_fantasia"], "cnpj": formatar_cnpj(e["cnpj"]),
        "state_registration": e["inscricao_estadual"], "tax_regime": e["regime_tributario"],
        "contact_email": e["email_contato"], "phone": e["telefone"], "address": e["endereco"], "state": e["uf"],
        "logo_url": e["logo_url"], "customer_since": e["criado_em"].date(),
    }


@router.get("/company")
def obter_empresa(ctx: Contexto = Depends(contexto)):
    return _empresa(ctx.empresa_id)


@router.put("/company")
def salvar_empresa(dados: Empresa, ctx: Contexto = Depends(contexto)):
    """Dados usados na emissão de NF-e (RN004)."""
    try:
        with db.transacao() as conn:
            conn.execute(
                """
                update empresa set razao_social = %s, nome_fantasia = %s, cnpj = %s, inscricao_estadual = %s,
                       regime_tributario = %s, email_contato = %s, telefone = %s, endereco = %s, uf = %s, logo_url = %s
                 where id = %s
                """,
                (dados.legal_name, dados.trade_name, dados.cnpj, dados.state_registration, dados.tax_regime,
                 dados.contact_email, dados.phone, dados.address, dados.state, dados.logo_url, ctx.empresa_id),
            )
    except UniqueViolation as exc:
        raise ErroApi(409, "CNPJ_JA_CADASTRADO", "Este CNPJ pertence a outra empresa.",
                      {"cnpj": "CNPJ já cadastrado"}) from exc
    return _empresa(ctx.empresa_id)


# ---------- Certificado [SIMULADO] ----------

def _certificado(empresa_id) -> dict | None:
    c = db.um("select * from certificado_digital where empresa_id = %s", (empresa_id,))
    if not c:
        return None
    dias = (c["validade"] - date.today()).days
    return {"type": c["tipo"], "holder": c["titular"], "valid_until": c["validade"], "days_left": dias,
            "status": "valido" if dias >= 0 else "vencido", "simulated": c["simulado"]}


@router.get("/certificate")
def obter_certificado(ctx: Contexto = Depends(contexto)):
    c = _certificado(ctx.empresa_id)
    if c is None:
        raise ErroApi(404, "CERTIFICADO_NAO_CADASTRADO", "Nenhum certificado digital cadastrado.")
    return c


@router.put("/certificate")
def substituir_certificado(dados: Certificado, ctx: Contexto = Depends(contexto)):
    """'Substituir': no MVP só registra titular e validade (upload real é a pendência P31)."""
    with db.transacao() as conn:
        conn.execute(
            """
            insert into certificado_digital (empresa_id, tipo, titular, validade, simulado)
            values (%s, 'A1', %s, %s, true)
            on conflict (empresa_id) do update set titular = excluded.titular, validade = excluded.validade
            """,
            (ctx.empresa_id, dados.holder, dados.valid_until),
        )
    return _certificado(ctx.empresa_id)


# ---------- Preferências ----------

def _preferencias(empresa_id) -> dict:
    p = db.um(
        """
        select pe.*, (select max(ultima_sincronizacao) from integracao where empresa_id = pe.empresa_id) as ultima
          from preferencia_empresa pe where pe.empresa_id = %s
        """,
        (empresa_id,),
    )
    return {
        "language": p["idioma"], "timezone": p["fuso_horario"], "auto_sync_stock": p["sincronizar_estoque_auto"],
        "pause_out_of_stock": p["pausar_anuncio_sem_estoque"], "auto_import_orders": p["importar_pedidos_auto"],
        "check_interval_minutes": p["intervalo_conferencia_min"],
        "alerts": {"telegram": p["receber_telegram"], "email": p["receber_email"], "push": p["receber_push"],
                   "daily_summary": p["resumo_diario"]},
        "last_sync": p["ultima"],
    }


@router.get("/preferences")
def obter_preferencias(ctx: Contexto = Depends(contexto)):
    return _preferencias(ctx.empresa_id)


@router.put("/preferences")
def salvar_preferencias(dados: Preferencias, ctx: Contexto = Depends(contexto)):
    with db.transacao() as conn:
        conn.execute(
            """
            update preferencia_empresa set idioma = %s, fuso_horario = %s, sincronizar_estoque_auto = %s,
                   pausar_anuncio_sem_estoque = %s, importar_pedidos_auto = %s, intervalo_conferencia_min = %s,
                   receber_telegram = %s, receber_email = %s, receber_push = %s, resumo_diario = %s
             where empresa_id = %s
            """,
            (dados.language, dados.timezone, dados.auto_sync_stock, dados.pause_out_of_stock,
             dados.auto_import_orders, dados.check_interval_minutes, dados.alerts.telegram, dados.alerts.email,
             dados.alerts.push, dados.alerts.daily_summary, ctx.empresa_id),
        )
    return _preferencias(ctx.empresa_id)


# ---------- Notificações (matriz Evento × Canal) ----------

def _notificacoes(ctx: Contexto) -> dict:
    vinculo = None
    if ctx.usuario_id:
        vinculo = db.um("select username, vinculado_em from vinculo_telegram where usuario_id = %s", (ctx.usuario_id,))
    eventos = db.todos(
        """
        select evento as event, telegram, email, push from preferencia_notificacao
         where empresa_id = %s
         order by array_position(array['novo_pedido','estoque_baixo','divergencia_estoque','nfe_rejeitada','resumo_diario'], evento)
        """,
        (ctx.empresa_id,),
    )
    return {
        "telegram": {"linked": bool(vinculo), "username": vinculo["username"] if vinculo else None,
                     "since": vinculo["vinculado_em"].date() if vinculo else None},
        "events": eventos,
    }


@router.get("/notifications")
def obter_notificacoes(ctx: Contexto = Depends(contexto)):
    return _notificacoes(ctx)


@router.put("/notifications")
def salvar_notificacoes(dados: MatrizNotificacoes, ctx: Contexto = Depends(contexto)):
    with db.transacao() as conn:
        with conn.cursor() as cur:
            cur.executemany(
                """
                insert into preferencia_notificacao (empresa_id, evento, telegram, email, push)
                values (%s, %s, %s, %s, %s)
                on conflict (empresa_id, evento)
                  do update set telegram = excluded.telegram, email = excluded.email, push = excluded.push
                """,
                [(ctx.empresa_id, e.event, e.telegram, e.email, e.push) for e in dados.events],
            )
    return _notificacoes(ctx)


# ---------- Equipe (somente leitura no MVP — P45) ----------

@router.get("/team")
def equipe(ctx: Contexto = Depends(contexto)):
    membros = db.todos(
        """
        select u.id, u.nome as name, u.email, ue.papel as role, ue.status
          from usuario_empresa ue join usuario u on u.id = ue.usuario_id
         where ue.empresa_id = %s
         order by ue.criado_em
        """,
        (ctx.empresa_id,),
    )
    return {"limit": 10, "members": membros}
