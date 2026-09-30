"""Taylor — API (FastAPI). Documentação interativa em http://localhost:8000/docs."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from . import db, erros
from .config import RAIZ_REPO, garantir_jwt_secret, settings
from .routers import (
    assistente, auth, configuracoes, dashboard, estoque, integracoes, notas, notificacoes, pedidos, produtos, relatorios,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(_: FastAPI):
    garantir_jwt_secret()
    db.abrir()
    # Tarefas em segundo plano morrem com o servidor: o que ficou pela metade vira erro/rascunho.
    with db.transacao() as conn:
        conn.execute("update sincronizacao set status = 'erro', concluida_em = now() where status = 'em_andamento'")
    logging.getLogger("taylor").info("Conectado ao banco (schema %s).", settings.db_schema)
    yield
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
    return {"status": "ok", "database": db.valor("select 'ok'"), "demo_mode": settings.demo_mode}


# Front-end na mesma origem, para o CONFIG.apiBase = "/api" funcionar sem CORS.
# Só arquivos do front são expostos (nunca a raiz do repositório, que contém backend/.env).
if settings.servir_front:
    for arquivo in ("index.html", "style.css", "javascript.js"):
        app.add_api_route(f"/{arquivo}", lambda a=arquivo: FileResponse(RAIZ_REPO / a), include_in_schema=False)
    app.add_api_route("/", lambda: FileResponse(RAIZ_REPO / "index.html"), include_in_schema=False)
    app.mount("/img", StaticFiles(directory=RAIZ_REPO / "img"), name="img")
    app.mount("/taylor_voice", StaticFiles(directory=RAIZ_REPO / "taylor_voice", html=True), name="voz")
