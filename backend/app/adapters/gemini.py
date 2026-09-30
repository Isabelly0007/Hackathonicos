"""Gemini: identifica a intenção da mensagem (fluxograma, lane "IA - Gemini").

O Gemini só classifica; os dados e o texto da resposta vêm do back-end, para
não enviar dados da empresa à IA nem arriscar números inventados.
"""

import json

import httpx

from ..config import settings

URL = "https://generativelanguage.googleapis.com/v1beta/models/{modelo}:generateContent"


class GeminiIndisponivel(Exception):
    pass


def configurado() -> bool:
    return bool(settings.gemini_api_key)


def identificar_intencao(mensagem: str, intencoes: dict[str, str]) -> str:
    lista = "\n".join(f"- {nome}: {descricao}" for nome, descricao in intencoes.items())
    prompt = (
        "Você classifica perguntas de um lojista sobre a operação de e-commerce dele.\n"
        f"Intenções possíveis:\n{lista}\n- desconhecida: qualquer outra coisa\n\n"
        'Responda só com JSON no formato {"intent": "<nome>"}.\n\n'
        f"Mensagem: {mensagem}"
    )
    try:
        resp = httpx.post(
            URL.format(modelo=settings.gemini_model),
            headers={"x-goog-api-key": settings.gemini_api_key},
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"responseMimeType": "application/json", "temperature": 0},
            },
            timeout=15,
        )
        resp.raise_for_status()
        texto = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
        intencao = json.loads(texto).get("intent", "desconhecida")
    except (httpx.HTTPError, KeyError, IndexError, ValueError) as exc:
        raise GeminiIndisponivel(str(exc)) from exc
    return intencao if intencao in intencoes else "desconhecida"
