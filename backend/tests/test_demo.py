"""Conta Demo (POST /api/auth/demo): uma loja isolada por visitante (banco descartável: veja conftest.py)."""

import re

import psycopg
import pytest

from app.cnpj import gerar_cnpj, validar_cnpj
from conftest import URL

LOJA_BETA = "00000000-0000-4000-a000-000000000001"


def sql(consulta, params=None):
    with psycopg.connect(URL) as c:
        c.execute("set search_path to taylor_teste")
        cur = c.execute(consulta, params)
        return cur.fetchall() if cur.description else []


def contar(tabela, empresa_id):
    return sql(f"select count(*) from {tabela} where empresa_id = %s", (empresa_id,))[0][0]


@pytest.fixture
def criar_demo(client):
    """Cria contas Demo e apaga todas no fim (os testes de test_api.py consultam sem filtrar empresa)."""
    criadas = []

    def criar():
        r = client.post("/api/auth/demo")
        assert r.status_code == 201, r.text
        dados = r.json()
        criadas.append(dados["company"]["id"])
        return dados, {"Authorization": f"Bearer {dados['access_token']}"}

    yield criar
    for empresa_id in criadas:
        sql("select excluir_conta_demo(%s)", (empresa_id,))


def test_cnpj_gerado_e_valido():
    for _ in range(200):
        cnpj = gerar_cnpj()
        assert validar_cnpj(cnpj) == cnpj and cnpj[8:12] == "0001"


def test_conta_demo_com_dados_de_exemplo(client, h, criar_demo):
    dados, hd = criar_demo()
    empresa, demo = dados["company"], dados["demo"]
    assert dados["user"]["name"] == "Demo"
    assert re.fullmatch(r"Loja Demo \d{4,}", empresa["name"])
    assert validar_cnpj(empresa["cnpj"]) == empresa["cnpj"]
    assert re.fullmatch(r"demo\d{4,}@taylor\.demo", demo["email"]) and demo["email"] == dados["user"]["email"]
    assert re.fullmatch(r"[a-z]+\d{4}", demo["password"])
    # O token vence junto com a conta (CONTA_DEMO_HORAS=2 no conftest).
    assert 2 * 3600 - 120 < dados["expires_in"] <= 2 * 3600

    assert client.get("/api/auth/me", headers=hd).json()["demo"]["password"] == demo["password"]
    assert client.get("/api/auth/me", headers=h).json()["demo"] is None  # conta normal

    cards = client.get("/api/dashboard/stats", params={"period": "30 dias"}, headers=hd).json()
    assert cards[2]["value"] == "24" and cards[4]["value"] == "3"
    assert client.get("/api/products/summary", headers=hd).json()["all"] == 24
    assert client.get("/api/orders", headers=hd).json()
    assert client.get("/api/stock/divergences", headers=hd).json()
    assert client.get("/api/invoices/summary", headers=hd).status_code == 200
    assert client.get("/api/notifications", headers=hd).status_code == 200
    assert contar("pedido", empresa["id"]) > 800 and contar("nota_fiscal", empresa["id"]) > 800
    r = client.post("/api/assistant/messages", json={"message": "Vendas de hoje", "input_mode": "quick_action"}, headers=hd)
    assert r.status_code == 200 and r.json()["intent"] == "vendas_hoje"

    # E-mail e senha do card servem no login (o bot do Telegram confere a mesma senha bcrypt).
    r = client.post("/api/auth/login", json={"email": demo["email"], "password": demo["password"]})
    assert r.status_code == 200 and r.json()["company"]["id"] == empresa["id"]


def test_contas_demo_isoladas(client, criar_demo):
    a, ha = criar_demo()
    b, hb = criar_demo()
    ea, eb = a["company"]["id"], b["company"]["id"]
    assert ea != eb and a["company"]["cnpj"] != b["company"]["cnpj"] and a["demo"]["email"] != b["demo"]["email"]
    beta_antes = contar("produto", LOJA_BETA)

    novo = {"name": "Produto da A", "sku": "DEMOA1", "price": 10, "stock": 3, "min_stock": 1, "ncm": "42029200",
            "fiscal_origin": "0"}
    r = client.post("/api/products", json=novo, headers=ha)
    assert r.status_code == 201, r.text
    produto_a = r.json()["id"]
    assert client.get("/api/products/summary", headers=ha).json()["all"] == 25
    assert client.get("/api/products/summary", headers=hb).json()["all"] == 24
    assert client.get(f"/api/products/{produto_a}", headers=hb).status_code == 404
    assert client.put(f"/api/products/{produto_a}", json={"stock": 0}, headers=hb).status_code == 404

    # Estoque alterado na B não muda o mesmo SKU na A nem na Loja Beta.
    ten_b = sql("select id from produto where empresa_id = %s and sku = 'TEN001'", (eb,))[0][0]
    assert client.put(f"/api/products/{ten_b}", json={"stock": 1}, headers=hb).json()["stock"] == 1
    assert sql("select estoque_central from produto where empresa_id = %s and sku = 'TEN001'", (ea,))[0][0] == 24
    assert contar("produto", LOJA_BETA) == beta_antes
    assert sql("select count(*) from produto where empresa_id = %s and sku = 'DEMOA1'", (LOJA_BETA,))[0][0] == 0


def test_nota_fiscal_na_conta_demo(client, criar_demo):
    d, hd = criar_demo()
    pedido = sql("""
        select p.id from pedido p join nota_fiscal nf on nf.pedido_id = p.id join cliente c on c.id = p.cliente_id
         where p.empresa_id = %s and nf.status = 'aguardando_emissao' and p.status <> 'cancelado'
           and c.cpf_cnpj is not null
           and not exists (select 1 from item_pedido ip join produto pr on pr.id = ip.produto_id
                            where ip.pedido_id = p.id and (pr.ncm is null or pr.origem_fiscal is null))
         limit 1""", (d["company"]["id"],))[0][0]
    r = client.post("/api/invoices", json={"order_id": str(pedido)}, headers=hd)
    assert r.status_code == 201, r.text  # passou pela validação fiscal: empresa e certificado preenchidos


def test_limite_de_contas_demo(client, criar_demo, monkeypatch):
    from app.config import settings

    criar_demo()
    ativas = sql("select count(*) from conta_demo where expira_em > now()")[0][0]
    monkeypatch.setattr(settings, "conta_demo_max", ativas)
    r = client.post("/api/auth/demo")
    assert r.status_code == 503 and r.json()["code"] == "LIMITE_CONTAS_DEMO"
    monkeypatch.setattr(settings, "conta_demo_max", 0)
    assert client.post("/api/auth/demo").json()["code"] == "CONTA_DEMO_DESLIGADA"


def test_conta_demo_expirada_e_apagada(client, criar_demo):
    from app.services import contas_demo

    d, hd = criar_demo()
    eid, uid = d["company"]["id"], d["user"]["id"]
    # Como se a pessoa tivesse entrado no bot e feito uma venda.
    sql("insert into vinculo_telegram (usuario_id, empresa_id, chat_id) values (%s, %s, 990001)", (uid, eid))
    assert client.post("/api/orders/sync", headers=hd).status_code in (200, 202)
    itens = sql("select count(*) from item_pedido ip join pedido p on p.id = ip.pedido_id where p.empresa_id = %s",
                (eid,))[0][0]
    itens_total = sql("select count(*) from item_pedido")[0][0]
    beta = {t: contar(t, LOJA_BETA) for t in ("produto", "pedido", "nota_fiscal")}
    assert itens > 0

    sql("update conta_demo set expira_em = now() - interval '1 minute' where empresa_id = %s", (eid,))
    contas_demo.limpar_expiradas()

    for tabela in ("pedido", "nota_fiscal", "produto", "movimento_estoque", "cliente", "integracao", "sincronizacao",
                   "notificacao", "preferencia_empresa", "vinculo_telegram", "conta_demo"):
        assert contar(tabela, eid) == 0, tabela
    assert sql("select count(*) from item_pedido")[0][0] == itens_total - itens
    assert sql("select count(*) from empresa where id = %s", (eid,))[0][0] == 0
    assert sql("select count(*) from usuario where id = %s", (uid,))[0][0] == 0
    assert {t: contar(t, LOJA_BETA) for t in beta} == beta

    # O token da conta apagada volta 401 (o front sai da sessão e mostra o login).
    assert client.get("/api/auth/me", headers=hd).status_code == 401
    assert client.get("/api/products", headers=hd).status_code == 401


def test_excluir_conta_demo_recusa_empresa_normal(client):
    assert sql("select excluir_conta_demo(%s)", (LOJA_BETA,))[0][0] is False
    assert sql("select count(*) from empresa where id = %s", (LOJA_BETA,))[0][0] == 1


def test_esqueci_senha_ignora_conta_demo(client, criar_demo):
    d, _ = criar_demo()
    r = client.post("/api/auth/forgot-password", json={"email": d["demo"]["email"]})
    assert r.status_code == 202 and "demo_link" not in r.json()
    assert sql("select count(*) from redefinicao_senha where usuario_id = %s", (d["user"]["id"],))[0][0] == 0
