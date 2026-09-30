"""Autenticação própria (decisão da pendência P1): senha com bcrypt e JWT HS256.

O token leva o id do usuário (sub). A empresa ativa é resolvida a cada
requisição por usuario_empresa, então remover alguém da equipe vale na hora.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from uuid import UUID
from zoneinfo import ZoneInfo

import bcrypt
import jwt
from fastapi import Header

from . import db
from .config import settings
from .erros import ErroApi

ALGORITMO = "HS256"


# ---------- Senhas e tokens ----------

def gerar_hash(senha: str) -> str:
    return bcrypt.hashpw(senha.encode(), bcrypt.gensalt()).decode()


def senha_confere(senha: str, senha_hash: str) -> bool:
    try:
        return bcrypt.checkpw(senha.encode(), senha_hash.encode())
    except ValueError:
        return False


def emitir_token(usuario_id: UUID, lembrar: bool = False) -> tuple[str, int]:
    """Retorna (token, segundos até expirar). "Lembrar de mim" estende a validade (P4)."""
    if not settings.jwt_secret:
        raise ErroApi(500, "JWT_NAO_CONFIGURADO", "Configure JWT_SECRET em backend/.env (rode python setup_db.py).")
    duracao = (timedelta(days=settings.jwt_expira_lembrar_dias) if lembrar
               else timedelta(minutes=settings.jwt_expira_minutos))
    agora = datetime.now(timezone.utc)
    token = jwt.encode({"sub": str(usuario_id), "iat": agora, "exp": agora + duracao},
                       settings.jwt_secret, algorithm=ALGORITMO)
    return token, int(duracao.total_seconds())


def validar_token(token: str) -> UUID:
    try:
        dados = jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITMO])
        usuario_id = UUID(dados["sub"])
    except jwt.ExpiredSignatureError as exc:
        raise ErroApi(401, "TOKEN_EXPIRADO", "Sessão expirada. Entre novamente.") from exc
    except (jwt.PyJWTError, KeyError, ValueError) as exc:
        raise ErroApi(401, "TOKEN_INVALIDO", "Token inválido.") from exc
    # Troca de senha ("Esqueci minha senha") encerra as sessões abertas antes dela.
    alterada = db.valor("select extract(epoch from senha_alterada_em)::bigint from usuario where id = %s", (usuario_id,))
    if alterada and dados.get("iat", 0) < alterada:
        raise ErroApi(401, "TOKEN_EXPIRADO", "Sua senha foi alterada. Entre novamente.")
    return usuario_id


def _extrair_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    esquema, _, token = authorization.partition(" ")
    if esquema.lower() != "bearer" or not token:
        raise ErroApi(401, "TOKEN_INVALIDO", "Use o cabeçalho Authorization: Bearer <token>.")
    return token


# ---------- Dependências das rotas ----------

@dataclass
class Contexto:
    empresa_id: UUID
    fuso: ZoneInfo
    usuario_id: UUID | None = None


_SQL_EMPRESA = """
    select e.id, coalesce(pe.fuso_horario, 'America/Sao_Paulo') as fuso
    from empresa e
    left join preferencia_empresa pe on pe.empresa_id = e.id
"""


def contexto(
    authorization: str | None = Header(default=None),
    x_empresa_id: UUID | None = Header(default=None),
) -> Contexto:
    """Empresa ativa da requisição.

    Com token: empresa do usuário (a do cabeçalho X-Empresa-Id, se ele for
    membro — multi-CNPJ, RN003; senão a primeira). Sem token e com
    DEMO_MODE: empresa de demonstração (protótipo de voz, testes rápidos).
    """
    token = _extrair_token(authorization)
    if token:
        usuario_id = validar_token(token)
        empresas = db.todos(
            _SQL_EMPRESA + """
            join usuario_empresa ue on ue.empresa_id = e.id
            where ue.usuario_id = %s and ue.status = 'ativo'
            order by ue.criado_em""",
            (usuario_id,),
        )
        if not empresas:
            raise ErroApi(403, "SEM_EMPRESA", "Usuário sem acesso a nenhuma empresa.")
        escolhida = next((e for e in empresas if e["id"] == x_empresa_id), None) if x_empresa_id else empresas[0]
        if escolhida is None:
            raise ErroApi(403, "SEM_ACESSO_EMPRESA", "Usuário sem acesso a esta empresa.")
        return Contexto(escolhida["id"], ZoneInfo(escolhida["fuso"]), usuario_id)

    if settings.demo_mode:
        empresa = db.um(_SQL_EMPRESA + " where e.cnpj = %s", (settings.demo_cnpj,))
        if empresa:
            return Contexto(empresa["id"], ZoneInfo(empresa["fuso"]))
        raise ErroApi(401, "NAO_AUTENTICADO", "Empresa de demonstração não encontrada. Rode python setup_db.py --seed.")

    raise ErroApi(401, "NAO_AUTENTICADO", "Entre na plataforma para continuar.")


def usuario_logado(authorization: str | None = Header(default=None)) -> UUID:
    token = _extrair_token(authorization)
    if not token:
        raise ErroApi(401, "NAO_AUTENTICADO", "Entre na plataforma para continuar.")
    return validar_token(token)
