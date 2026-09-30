"""Autenticação (RF001–RF003). Contratos propostos: api-backend.md §3.1."""

import hashlib
import logging
import secrets
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Response
from psycopg.errors import UniqueViolation
from pydantic import BaseModel, EmailStr, Field, field_validator

from .. import auth, correio, db
from ..cnpj import validar_cnpj
from ..config import settings
from ..erros import ErroApi
from ..formatacao import iniciais

router = APIRouter(prefix="/auth", tags=["Autenticação"])
log = logging.getLogger("taylor.auth")


class Cadastro(BaseModel):
    name: str = Field(min_length=1)
    company: str = Field(min_length=1)
    email: EmailStr
    password: str = Field(min_length=6)
    cnpj: str

    @field_validator("cnpj")
    @classmethod
    def _cnpj(cls, v: str) -> str:
        return validar_cnpj(v)


class Login(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)
    remember: bool = False


class PedidoRedefinicao(BaseModel):
    email: EmailStr


class TokenRedefinicao(BaseModel):
    token: str = Field(min_length=20, max_length=200)


class Redefinicao(TokenRedefinicao):
    password: str = Field(min_length=6)


def _perfil(usuario_id: UUID) -> dict:
    u = db.um("select id, nome, email from usuario where id = %s", (usuario_id,))
    if not u:
        raise ErroApi(401, "TOKEN_INVALIDO", "Usuário não encontrado.")
    empresas = db.todos(
        """
        select e.id, e.nome_fantasia as name, e.cnpj
          from usuario_empresa ue join empresa e on e.id = ue.empresa_id
         where ue.usuario_id = %s and ue.status = 'ativo'
         order by ue.criado_em
        """,
        (usuario_id,),
    )
    ativa = empresas[0] if empresas else None
    return {
        "user": {"id": u["id"], "name": u["nome"], "email": u["email"], "initials": iniciais(u["nome"])},
        "company": {**ativa, "plan": "Pro"} if ativa else None,
        "companies": [{"id": e["id"], "name": e["name"]} for e in empresas],
    }


def _sessao(usuario_id: UUID, lembrar: bool) -> dict:
    token, expira = auth.emitir_token(usuario_id, lembrar)
    return {"access_token": token, "token_type": "bearer", "expires_in": expira, **_perfil(usuario_id)}


@router.post("/register", status_code=201)
def cadastrar(dados: Cadastro):
    """Cria usuário, empresa, vínculo de administrador e preferências padrão (trigger do banco)."""
    email = dados.email.lower()
    try:
        with db.transacao() as conn:
            if db.valor("select 1 from usuario where email = %s", (email,), conn):
                raise ErroApi(409, "EMAIL_JA_CADASTRADO", "Este e-mail já está cadastrado.",
                              {"email": "E-mail já cadastrado"})
            if db.valor("select 1 from empresa where cnpj = %s", (dados.cnpj,), conn):
                raise ErroApi(409, "CNPJ_JA_CADASTRADO", "Este CNPJ já está cadastrado.",
                              {"cnpj": "CNPJ já cadastrado"})
            usuario_id = db.valor(
                "insert into usuario (nome, email, senha_hash) values (%s, %s, %s) returning id",
                (dados.name.strip(), email, auth.gerar_hash(dados.password)),
                conn,
            )
            empresa_id = db.valor(
                "insert into empresa (nome_fantasia, cnpj) values (%s, %s) returning id",
                (dados.company.strip(), dados.cnpj),
                conn,
            )
            conn.execute(
                "insert into usuario_empresa (usuario_id, empresa_id, papel, status) values (%s, %s, 'administrador', 'ativo')",
                (usuario_id, empresa_id),
            )
    except UniqueViolation as exc:  # cadastro simultâneo com o mesmo e-mail/CNPJ
        raise ErroApi(409, "CADASTRO_DUPLICADO", "E-mail ou CNPJ já cadastrado.") from exc
    return _sessao(usuario_id, lembrar=False)


@router.post("/login")
def entrar(dados: Login):
    u = db.um("select id, senha_hash from usuario where email = %s", (dados.email.lower(),))
    if not u or not auth.senha_confere(dados.password, u["senha_hash"]):
        raise ErroApi(401, "CREDENCIAIS_INVALIDAS", "E-mail ou senha incorretos.")
    return _sessao(u["id"], dados.remember)


@router.post("/logout", status_code=204)
def sair(_: UUID = Depends(auth.usuario_logado)):
    """O token é sem estado: o front o descarta. Revogação no servidor fica para depois do MVP."""
    return Response(status_code=204)


@router.get("/me")
def eu(usuario_id: UUID = Depends(auth.usuario_logado)):
    return _perfil(usuario_id)


# ---------- Esqueci minha senha ----------
# O link leva um token aleatório; o banco guarda só o sha256 dele (uso único,
# validade de REDEFINICAO_MINUTOS). A resposta do pedido é sempre a mesma,
# exista o e-mail ou não, para não revelar quem tem conta.

def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _mascarar(email: str) -> str:
    """'isabela@lojabeta.com.br' -> 'is*****@lojabeta.com.br'"""
    nome, _, dominio = email.partition("@")
    return f"{nome[:2]}{'*' * max(len(nome) - 2, 3)}@{dominio}"


_SQL_TOKEN_VALIDO = """
    select r.id, r.usuario_id, u.email from redefinicao_senha r join usuario u on u.id = r.usuario_id
     where r.token_hash = %s and r.usada_em is null and r.expira_em > now()
"""


@router.post("/forgot-password", status_code=202)
def esqueci_senha(dados: PedidoRedefinicao, tarefas: BackgroundTasks):
    email = dados.email.lower()
    minutos = settings.redefinicao_minutos
    resposta: dict = {
        "detail": f"Se este e-mail estiver cadastrado, enviamos um link para criar uma nova senha. "
                  f"Ele vale por {minutos} minutos.",
        "email_configured": correio.configurado(),
    }
    usuario = db.um("select id, nome from usuario where email = %s", (email,))
    if not usuario:
        return resposta

    token = secrets.token_urlsafe(32)
    with db.transacao() as conn:
        recentes = db.valor(
            "select count(*) from redefinicao_senha where usuario_id = %s and criado_em > now() - interval '15 minutes'",
            (usuario["id"],), conn,
        )
        if recentes >= 3:  # limite de pedidos: não gera outro link, mas responde igual
            return resposta
        conn.execute(
            "insert into redefinicao_senha (usuario_id, token_hash, expira_em) values (%s, %s, now() + make_interval(mins => %s))",
            (usuario["id"], _hash_token(token), minutos),
        )

    link = f"{settings.app_url.rstrip('/')}/#redefinir-senha={token}"
    if correio.configurado():
        tarefas.add_task(correio.enviar_redefinicao, email, usuario["nome"], link)
    else:
        log.warning("SMTP não configurado (SMTP_HOST no backend/.env). Link de redefinição para %s: %s", email, link)
        if settings.demo_mode:  # só no ambiente local: permite testar o fluxo sem e-mail
            resposta["demo_link"] = link
    return resposta


@router.post("/reset-password/check")
def conferir_link(dados: TokenRedefinicao):
    """Diz se o link ainda vale (a tela mostra o formulário ou o aviso de link expirado)."""
    r = db.um(_SQL_TOKEN_VALIDO, (_hash_token(dados.token),))
    if not r:
        raise ErroApi(400, "LINK_INVALIDO", "Este link é inválido, já foi usado ou expirou. Peça um novo.")
    return {"valid": True, "email": _mascarar(r["email"])}


@router.post("/reset-password")
def redefinir_senha(dados: Redefinicao):
    with db.transacao() as conn:
        r = db.um(_SQL_TOKEN_VALIDO + " for update of r", (_hash_token(dados.token),), conn)
        if not r:
            raise ErroApi(400, "LINK_INVALIDO", "Este link é inválido, já foi usado ou expirou. Peça um novo.")
        conn.execute(
            "update usuario set senha_hash = %s, senha_alterada_em = now() where id = %s",
            (auth.gerar_hash(dados.password), r["usuario_id"]),
        )
        # Invalida este e qualquer outro link pendente do usuário.
        conn.execute("update redefinicao_senha set usada_em = now() where usuario_id = %s and usada_em is null",
                     (r["usuario_id"],))
    return {"detail": "Senha alterada com sucesso. Entre com a nova senha."}
