"""Formato de erro padronizado (api-backend.md §1.2)."""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class ErroApi(Exception):
    def __init__(self, status: int, code: str, detail: str, fields: dict | None = None):
        self.status = status
        self.code = code
        self.detail = detail
        self.fields = fields or {}


def registrar(app: FastAPI) -> None:
    @app.exception_handler(ErroApi)
    async def _erro_api(_: Request, exc: ErroApi):
        return JSONResponse(
            status_code=exc.status,
            content={"detail": exc.detail, "code": exc.code, "fields": exc.fields},
        )

    @app.exception_handler(RequestValidationError)
    async def _validacao(_: Request, exc: RequestValidationError):
        campos = {}
        for erro in exc.errors():
            local = [str(p) for p in erro["loc"] if p not in ("body", "query", "path")]
            campos[".".join(local) or "body"] = erro["msg"].removeprefix("Value error, ")
        return JSONResponse(
            status_code=422,
            content={"detail": "Dados inválidos.", "code": "DADOS_INVALIDOS", "fields": campos},
        )
