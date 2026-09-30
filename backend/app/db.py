"""Acesso ao Postgres do Supabase (conexão direta via DATABASE_URL).

Toda conexão do pool usa `search_path = <DB_SCHEMA>` (só ele): nomes de tabela
sem schema nunca caem nas tabelas do bot_estoque no public. Cada
`with transacao()` faz COMMIT ao sair do bloco ou ROLLBACK se houver exceção.
"""

from contextlib import contextmanager
from pathlib import Path

import psycopg
from psycopg import Connection, sql
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from .config import settings


def _configurar(conn: Connection) -> None:
    conn.execute(sql.SQL("set search_path to {}").format(sql.Identifier(settings.db_schema)))
    conn.commit()


pool = ConnectionPool(
    settings.database_url,
    min_size=settings.db_pool_min,
    max_size=settings.db_pool_max,
    open=False,
    configure=_configurar,
    # prepare_threshold=None: compatível com o pooler do Supabase (Supavisor).
    kwargs={"row_factory": dict_row, "prepare_threshold": None},
)


def explicar_erro_conexao(exc: Exception) -> str:
    """Traduz as falhas de conexão mais comuns para o português."""
    texto = str(exc)
    if "password authentication failed" in texto:
        return "A senha do banco na DATABASE_URL (backend/.env) está errada."
    if "Tenant or user not found" in texto:
        return "O usuário na DATABASE_URL está errado: ele deve ser postgres.<id do projeto no Supabase>."
    if "timeout" in texto.lower() or "timed out" in texto.lower():
        return ("Não foi possível alcançar o banco (porta 5432). Sua rede pode estar bloqueando essa porta: "
                "tente outra rede, por exemplo o roteador do celular.")
    if "could not translate host name" in texto or "getaddrinfo" in texto:
        return "Endereço do banco não encontrado. Confira a DATABASE_URL e a sua conexão com a internet."
    return f"Não foi possível conectar ao banco: {texto.strip()}"


def conectar_teste() -> None:
    """Uma conexão rápida antes de abrir o pool, para falhar com mensagem clara."""
    try:
        psycopg.connect(settings.database_url, prepare_threshold=None, connect_timeout=15).close()
    except psycopg.OperationalError as exc:
        raise RuntimeError(explicar_erro_conexao(exc)) from None


def abrir() -> None:
    settings.validar()
    conectar_teste()
    pool.open(wait=True, timeout=20)
    esquemas = valor("select current_schemas(false)")
    if esquemas != [settings.db_schema]:
        raise RuntimeError(
            f"O schema '{settings.db_schema}' não existe no banco. Rode: python setup_db.py --seed"
        )
    aplicar_migracoes()


def sql_migracoes() -> str:
    """db/migracoes.sql com o nome do schema (alterações idempotentes após o schema.sql)."""
    arquivo = Path(__file__).resolve().parent.parent / "db" / "migracoes.sql"
    return arquivo.read_text(encoding="utf-8").replace("__SCHEMA__", settings.db_schema)


def aplicar_migracoes() -> None:
    with transacao() as conn:
        conn.execute(sql_migracoes())


def fechar() -> None:
    pool.close()


@contextmanager
def transacao():
    with pool.connection() as conn:
        yield conn


def todos(sql_texto: str, params: dict | tuple | None = None, conn: Connection | None = None) -> list[dict]:
    if conn is not None:
        return conn.execute(sql_texto, params).fetchall()
    with pool.connection() as c:
        return c.execute(sql_texto, params).fetchall()


def um(sql_texto: str, params: dict | tuple | None = None, conn: Connection | None = None) -> dict | None:
    if conn is not None:
        return conn.execute(sql_texto, params).fetchone()
    with pool.connection() as c:
        return c.execute(sql_texto, params).fetchone()


def valor(sql_texto: str, params: dict | tuple | None = None, conn: Connection | None = None):
    linha = um(sql_texto, params, conn)
    return None if linha is None else next(iter(linha.values()))
