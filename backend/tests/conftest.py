"""Os testes recriam o schema do Taylor num banco DESCARTÁVEL.

Defina TEST_DATABASE_URL (nunca o Supabase da equipe) e rode:  pytest -q
"""

import os
import subprocess
import sys
from pathlib import Path

import pytest

URL = os.environ.get("TEST_DATABASE_URL")
if not URL:
    pytest.skip("Defina TEST_DATABASE_URL com um Postgres descartável para rodar os testes.", allow_module_level=True)

os.environ.update({
    "DATABASE_URL": URL,
    "DB_SCHEMA": "taylor_teste",
    "JWT_SECRET": "segredo-de-teste-com-mais-de-32-caracteres!!",
    "DEMO_MODE": "true",
    "SEFAZ_SEGUNDOS_PROCESSAMENTO": "0",
    "GEMINI_API_KEY": "",
})

BACKEND = Path(__file__).resolve().parent.parent


@pytest.fixture(scope="session")
def client():
    resultado = subprocess.run([sys.executable, "setup_db.py", "--reset", "--seed"], cwd=BACKEND,
                               capture_output=True, text=True)
    assert resultado.returncode == 0, resultado.stdout + resultado.stderr

    from fastapi.testclient import TestClient
    from app.main import app

    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def token(client):
    r = client.post("/api/auth/login", json={"email": "isabela@lojabeta.com.br", "password": "taylor123"})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def h(token):
    return {"Authorization": f"Bearer {token}"}
