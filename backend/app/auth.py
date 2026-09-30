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

def gerar_hash(senha: str, rounds: int | None = None) -> str:
    """rounds=None usa o custo padrão do bcrypt (12). A conta Demo usa 10, como o seed."""
    sal = bcrypt.gensalt() if rounds is None else bcrypt.gensalt(rounds)
    return bcrypt.hashpw(senha.encode(), sal).decode()


def senha_confere(senha: str, senha_hash: str) -> bool:
    try:
        return bcrypt.checkpw(senha.encode(), senha_hash.encode())
    except ValueError:
        return False


def emitir_token(usuario_id: UUID, lembrar: bool = False, expira_em: datetime | None = None) -> tuple[str, int]:
    """Retorna (token, segundos até expirar). "Lembrar de mim" estende a validade (P4).

    expira_em fixa o vencimento (a conta Demo vence junto com o token).
    """
    if not settings.jwt_secret:
        raise ErroApi(500, "JWT_NAO_CONFIGURADO", "Configure JWT_SECRET em backend/.env (rode python setup_db.py).")
    agora = datetime.now(timezone.utc)
    if expira_em is not None:
        duracao = max(expira_em - agora, timedelta(seconds=1))
    else:
        duracao = (timedelta(days=settings.jwt_expira_lembrar_dias) if lembrar
                   else timedelta(minutes=settings.jwt_expira_minutos))
    token = jwt.encode({"sub": str(usuario_id), "iat": agora, "exp": agora + duracao},
                       settings.jwt_secret, algorithm=ALGORITMO)
    return token, int(duracao.total_seconds())


def _decodificar(token: str) -> tuple[UUID, dict]:
    try:
        dados = jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITMO])
        return UUID(dados["sub"]), dados
    except jwt.ExpiredSignatureError as exc:
        raise ErroApi(401, "TOKEN_EXPIRADO", "Sessão expirada. Entre novamente.") from exc
    except (jwt.PyJWTError, KeyError, ValueError) as exc:
        raise ErroApi(401, "TOKEN_INVALIDO", "Token inválido.") from exc


def _conferir_usuario(dados: dict, usuario: dict | None) -> None:
    # Usuário apagado (ex.: conta Demo expirada): 401 faz o front voltar para o login.
    if usuario is None:
        raise ErroApi(401, "TOKEN_INVALIDO", "Esta conta não existe mais. Entre novamente.")
    # Troca de senha ("Esqueci minha senha") encerra as sessões abertas antes dela.
    alterada = usuario["alterada"]
    if alterada and dados.get("iat", 0) < alterada:
        raise ErroApi(401, "TOKEN_EXPIRADO", "Sua senha foi alterada. Entre novamente.")


def validar_token(token: str) -> UUID:
    usuario_id, dados = _decodificar(token)
    _conferir_usuario(dados, db.um(
        "select extract(epoch from senha_alterada_em)::bigint as alterada from usuario where id = %s", (usuario_id,)
    ))
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

# Usuário do token + empresas ativas numa consulta só (uma ida ao banco por requisição).
# Sem linhas = usuário apagado; e.id nulo = usuário sem empresa ativa.
_SQL_SESSAO = """
    select extract(epoch from u.senha_alterada_em)::bigint as alterada,
           e.id, coalesce(pe.fuso_horario, 'America/Sao_Paulo') as fuso
      from usuario u
      left join usuario_empresa ue on ue.usuario_id = u.id and ue.status = 'ativo'
      left join empresa e on e.id = ue.empresa_id
      left join preferencia_empresa pe on pe.empresa_id = e.id
     where u.id = %s
     order by ue.criado_em
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
        usuario_id, dados = _decodificar(token)
        linhas = db.todos(_SQL_SESSAO, (usuario_id,))
        _conferir_usuario(dados, linhas[0] if linhas else None)
        empresas = [linha for linha in linhas if linha["id"] is not None]
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
