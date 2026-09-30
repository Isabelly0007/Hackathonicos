"""Cria o banco do Taylor no Supabase (conexão direta via DATABASE_URL).

Uso (dentro de backend/, com o .venv ativo):
    python setup_db.py                   cria o schema (DB_SCHEMA, padrão "taylor")
    python setup_db.py --seed            cria o schema e insere os dados de demonstração
    python setup_db.py --reset --seed    APAGA só o schema do Taylor e recria tudo

O schema public (tabelas do bot_estoque) nunca é tocado. Um schema com o
mesmo nome que não tenha sido criado por este script não é apagado.
"""

import argparse
from pathlib import Path

import psycopg

from app.config import PASTA_BACKEND, garantir_jwt_secret, settings
from app.db import explicar_erro_conexao

PASTA_SQL = PASTA_BACKEND / "db"
MARCA = "taylor-backend:"


def _sql(arquivo: str) -> str:
    return (PASTA_SQL / arquivo).read_text(encoding="utf-8").replace("__SCHEMA__", settings.db_schema)


def main() -> None:
    parser = argparse.ArgumentParser(description="Cria o banco do Taylor.")
    parser.add_argument("--seed", action="store_true", help="insere os dados de demonstração (Loja Beta)")
    parser.add_argument("--reset", action="store_true", help="apaga e recria o schema do Taylor")
    parser.add_argument("--gerar-sql", metavar="ARQUIVO",
                        help="só gera um .sql (schema + seed) para colar no SQL Editor do Supabase")
    args = parser.parse_args()
    if settings.demo_mode:  # em produção o JWT_SECRET vem da variável de ambiente
        garantir_jwt_secret()

    if args.gerar_sql:
        Path(args.gerar_sql).write_text(_sql("schema.sql") + "\n\n" + _sql("migracoes.sql") + "\n\n" + _sql("seed.sql"), encoding="utf-8")
        print(f"SQL gerado em {args.gerar_sql} (schema {settings.db_schema} + dados de demonstração).")
        return

    try:
        settings.validar()
        conexao = psycopg.connect(settings.database_url, prepare_threshold=None, connect_timeout=15)
    except RuntimeError as exc:
        raise SystemExit(str(exc)) from None
    except psycopg.OperationalError as exc:
        raise SystemExit(explicar_erro_conexao(exc)) from None

    schema = settings.db_schema
    with conexao as conn:
        linha = conn.execute(
            "select coalesce(obj_description(oid, 'pg_namespace'), '') from pg_namespace where nspname = %s",
            (schema,),
        ).fetchone()
        if linha is not None and not linha[0].startswith(MARCA):
            raise SystemExit(
                f"O schema '{schema}' já existe no banco e não foi criado por este backend.\n"
                f"Para não misturar dados, defina outro nome no backend/.env, ex.: DB_SCHEMA={schema}_app"
            )
        if linha is not None and not args.reset:
            raise SystemExit(f"O schema '{schema}' já existe. Use --reset para recriá-lo (apaga só ele).")
        if linha is not None:
            print(f"Apagando o schema {schema} (somente ele)...")
            conn.execute(f'drop schema "{schema}" cascade')

        print(f"Criando o schema {schema}...")
        conn.execute(_sql("schema.sql"))
        conn.execute(_sql("migracoes.sql"))
        if args.seed:
            print("Inserindo dados de demonstração...")
            conn.execute(_sql("seed.sql"))
        conn.commit()

        contagem = conn.execute(
            f'select (select count(*) from "{schema}".produto) as produtos, (select count(*) from "{schema}".pedido) as pedidos'
        ).fetchone()
    print(f"Pronto: schema {schema} com {contagem[0]} produtos e {contagem[1]} pedidos.")


if __name__ == "__main__":
    main()
