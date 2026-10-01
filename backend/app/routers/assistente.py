"""Assistente de IA (RF038, RF039). Contrato proposto: api-backend.md §3.11.

Também atende o protótipo de voz (frontend/taylor_voice/voice.js), que envia só {"message"}.
"""

from typing import Literal

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from ..auth import Contexto, contexto
from ..erros import ErroApi
from ..services import assistente

router = APIRouter(prefix="/assistant", tags=["Assistente"])


class Mensagem(BaseModel):
    message: str
    channel: Literal["app", "telegram"] = "app"
    input_mode: Literal["text", "voice", "quick_action"] = "text"


@router.post("/messages")
def mensagem(dados: Mensagem, ctx: Contexto = Depends(contexto)):
    if not dados.message.strip():
        raise ErroApi(422, "MENSAGEM_VAZIA", "Digite uma mensagem.", {"message": "Mensagem vazia"})
    resposta, gemini_indisponivel = assistente.responder(ctx.empresa_id, ctx.fuso, dados.message)
    if gemini_indisponivel:
        return JSONResponse(status_code=502, content=resposta)
    return resposta


@router.get("/quick-actions")
def acoes_rapidas():
    return list(assistente.ACOES_RAPIDAS)
