"""Taylor — API (FastAPI). Documentação interativa em http://localhost:8000/docs."""

import logging
import os
from contextlib import asynccontextmanager

import anyio.to_thread
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from . import db, erros
from .config import RAIZ_REPO, garantir_jwt_secret, settings
from .routers import (
    assistente, auth, configuracoes, dashboard, estoque, integracoes, notas, notificacoes, pedidos, produtos, relatorios,
)
from .services import contas_demo, sincronizacao

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("taylor")

# As rotas são síncronas e rodam num pool de threads (padrão: 40 por worker). Quando muita gente
# cria a conta Demo ao mesmo tempo, as criações na fila ocupariam todas as threads e até as
# leituras rápidas esperariam. Com mais threads, as leituras seguem; o limite real continua
# sendo DB_POOL_MAX conexões com o banco.
THREADS_POR_WORKER = 100


@asynccontextmanager
async def lifespan(_: FastAPI):
    anyio.to_thread.current_default_thread_limiter().total_tokens = THREADS_POR_WORKER
    garantir_jwt_secret()
    db.abrir()
    # Tarefas em segundo plano morrem com o servidor: o que ficou pela metade vira erro/rascunho.
    # Só as presas: com vários workers, as recentes podem estar rodando em outro processo.
    with db.transacao() as conn:
        conn.execute(f"""
            update sincronizacao set status = 'erro', concluida_em = now()
             where status = 'em_andamento' and {sincronizacao.SQL_PRESA}
        """)
    workers = int(os.environ.get("WEB_CONCURRENCY") or 1)
    log.info("Conectado ao banco (schema %s). Pool: até %s conexões neste worker; com %s worker(s), até %s "
             "no total (some as do bot e confira o Pool Size do Supabase).",
             settings.db_schema, settings.db_pool_max, workers, workers * settings.db_pool_max)
    if settings.demo_mode and not settings.local:
        log.warning("DEMO_MODE=true fora de localhost: rotas sem token usam a Loja Beta e o link de "
                    "'Esqueci minha senha' aparece na tela. Em produção use DEMO_MODE=false.")
    limpeza = contas_demo.Limpeza()
    limpeza.iniciar()
    yield
    limpeza.parar()
    db.fechar()


app = FastAPI(
    title="Taylor API",
    version="0.1.0",
    description="Back-end do Taylor (gestão multicanal). Contratos em docs/api-backend.md.",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",")],
    allow_methods=["*"],
    allow_headers=["*"],
)
erros.registrar(app)

for modulo in (auth, dashboard, produtos, pedidos, estoque, notas, integracoes, relatorios, notificacoes,
               configuracoes, assistente):
    app.include_router(modulo.router, prefix="/api")


@app.get("/api/health", tags=["Infra"])
def saude():
    return {"status": "ok", "database": db.valor("select 'ok'"), "demo_mode": settings.demo_mode,
            "contas_demo_ativas": contas_demo.ativas(), "contas_demo_max": settings.conta_demo_max}


# Front-end na mesma origem, para o CONFIG.apiBase = "/api" funcionar sem CORS.
# Só arquivos do front são expostos (nunca a raiz do repositório, que contém backend/.env).
if settings.servir_front:
    for arquivo in ("index.html", "style.css", "javascript.js"):
        app.add_api_route(f"/{arquivo}", lambda a=arquivo: FileResponse(RAIZ_REPO / a), include_in_schema=False)
    app.add_api_route("/", lambda: FileResponse(RAIZ_REPO / "index.html"), include_in_schema=False)
    app.mount("/img", StaticFiles(directory=RAIZ_REPO / "img"), name="img")
    app.mount("/taylor_voice", StaticFiles(directory=RAIZ_REPO / "taylor_voice", html=True), name="voz")
