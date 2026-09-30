"""Testes de ponta a ponta da API (banco descartável: veja conftest.py)."""

import re

import psycopg
import pytest

from conftest import URL

STATUS_PRODUTO = {"Ativo", "Estoque baixo", "Sem estoque"}
STATUS_PEDIDO = {"Aguardando", "Em separação", "Em transporte", "Entregue", "Cancelado"}
STATUS_ESTOQUE = {"Sincronizado", "Divergência detectada", "Estoque baixo", "Sem estoque"}
STATUS_NOTA = {"Aguardando emissão", "Processando", "Autorizada", "Rejeitada"}
BRL = re.compile(r"^R\$ \d{1,3}(\.\d{3})*,\d{2}$")
DATA = re.compile(r"^\d{2}/\d{2} \d{2}:\d{2}$")


def sql(consulta, params=None):
    with psycopg.connect(URL) as c:
        c.execute("set search_path to taylor_teste")
        return c.execute(consulta, params).fetchall()


def estoque_de(sku):
    return sql("select estoque_central from produto where sku = %s", (sku,))[0][0]


# ---------- Infra ----------

def test_health(client):
    assert client.get("/api/health").json()["database"] == "ok"


def test_front_servido_sem_expor_segredos(client):
    assert client.get("/").status_code == 200
    assert client.get("/javascript.js").status_code == 200
    assert client.get("/backend/.env").status_code == 404
    assert client.get("/bot_estoque/.env").status_code == 404


# ---------- Contratos de compatibilidade (api-backend.md §2) ----------

@pytest.mark.parametrize("periodo", ["Hoje", "7 dias", "30 dias"])
def test_dashboard_stats(client, h, periodo):
    r = client.get("/api/dashboard/stats", params={"period": periodo}, headers=h)
    assert r.status_code == 200
    cards = r.json()
    assert [c["label"] for c in cards] == ["Vendas", "Pedidos", "Produtos", "Estoque crítico", "Marketplaces conectados"]
    assert BRL.match(cards[0]["value"])
    assert all(len(c["spark"]) == 7 and isinstance(c["trend"], str) for c in cards)
    assert cards[2]["value"] == "24" and cards[4]["value"] == "3"


def test_dashboard_periodo_invalido(client, h):
    r = client.get("/api/dashboard/stats", params={"period": "ontem"}, headers=h)
    assert r.status_code == 400 and r.json()["code"] == "PERIODO_INVALIDO"


@pytest.mark.parametrize("periodo", ["Hoje", "7 dias", "30 dias"])
def test_dashboard_sales(client, h, periodo):
    d = client.get("/api/dashboard/sales", params={"range": periodo}, headers=h).json()
    assert len(d["labels"]) == 7
    assert [s["name"] for s in d["series"]] == ["Mercado Livre", "Shopee", "Magalu"]
    assert [s["cls"] for s in d["series"]] == ["blue", "red", "purple"]
    assert d["yMax"] >= max(v for s in d["series"] for v in s["values"])
    if periodo == "Hoje":  # acumulado
        assert all(s["values"] == sorted(s["values"]) for s in d["series"])


def test_dashboard_status_alertas_canais(client, h):
    status = client.get("/api/dashboard/order-statuses", headers=h).json()
    assert [s["label"] for s in status] == ["Aguardando", "Em separação", "Em transporte", "Entregue", "Cancelado"]
    alertas = client.get("/api/dashboard/stock-alerts", headers=h).json()
    assert 1 <= len(alertas) <= 4 and set(alertas[0]) == {"name", "desc", "critical"}
    assert alertas[0] == {"name": "Garrafa Térmica", "desc": "Sem estoque", "critical": True}
    canais = client.get("/api/channels", headers=h).json()
    assert [c["short"] for c in canais] == ["ML", "S", "M"]
    assert canais[0]["products"] == 24 and "atrás" in canais[0]["lastSync"]


def test_tabelas_posicionais(client, h):
    produtos = client.get("/api/products", headers=h).json()
    assert len(produtos) == 24 and all(len(p) == 7 and p[4] in STATUS_PRODUTO and p[5] == "Canais" for p in produtos)
    assert all(BRL.match(p[3]) and DATA.match(p[6]) for p in produtos)

    pedidos = client.get("/api/orders", headers=h).json()
    assert len(pedidos) == 50 and all(len(p) == 7 and p[6] in STATUS_PEDIDO and p[0].startswith("#") for p in pedidos)

    estoque = client.get("/api/stock", headers=h).json()
    assert all(len(e) == 8 and e[7] in STATUS_ESTOQUE for e in estoque)
    mochila = next(e for e in estoque if e[1] == "MOC012")
    assert mochila[2:8] == ["12", "8", "12", "10", "12", "Divergência detectada"]
    assert next(e for e in estoque if e[1] == "MOC013")[5] == "—"  # sem anúncio na Shopee

    notas = client.get("/api/invoices", headers=h).json()
    assert all(len(n) == 7 and n[5] in STATUS_NOTA for n in notas)
    assert any(n[0] == "Rascunho" for n in notas)

    mks = client.get("/api/marketplaces", headers=h).json()
    assert [m[:2] for m in mks] == [["Mercado Livre", "ML"], ["Shopee", "S"], ["Magalu", "M"]]
    assert all(BRL.match(m[4]) for m in mks)


def test_filtro_de_status(client, h):
    zerados = client.get("/api/products", params={"status": "sem_estoque"}, headers=h).json()
    assert [p[0] for p in zerados] == ["Garrafa Térmica"]
    cancelados = client.get("/api/orders", params={"status": "cancelado"}, headers=h).json()
    assert all(p[6] == "Cancelado" for p in cancelados)


# ---------- Autenticação e isolamento ----------

def test_login_e_me(client, h):
    assert client.post("/api/auth/login", json={"email": "isabela@lojabeta.com.br", "password": "errada"}).status_code == 401
    me = client.get("/api/auth/me", headers=h).json()
    assert me["user"]["initials"] == "IF" and me["company"]["name"] == "Loja Beta"
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer lixo"}).status_code == 401


def test_cadastro_isolado(client):
    dados = {"name": "Ana Teste", "company": "Loja Gama", "email": "ana@gama.com", "password": "segredo1",
             "cnpj": "11.222.333/0001-81"}
    r = client.post("/api/auth/register", json=dados)
    assert r.status_code == 201, r.text
    hg = {"Authorization": f"Bearer {r.json()['access_token']}"}
    assert client.get("/api/products", headers=hg).json() == []
    assert client.get("/api/settings/preferences", headers=hg).json()["check_interval_minutes"] == 5

    assert client.post("/api/auth/register", json=dados).json()["code"] == "EMAIL_JA_CADASTRADO"
    outro = {**dados, "email": "b@gama.com"}
    assert client.post("/api/auth/register", json=outro).json()["code"] == "CNPJ_JA_CADASTRADO"
    invalido = {**dados, "email": "c@gama.com", "cnpj": "12.345.678/0001-90"}
    assert client.post("/api/auth/register", json=invalido).status_code == 422


def test_sem_token_usa_empresa_demo(client):
    assert len(client.get("/api/products").json()) >= 24


# ---------- Produtos ----------

def test_produto_crud(client, h):
    novo = {"name": "Mochila Trilha", "sku": "mot900", "price": 199.9, "stock": 5, "min_stock": 2, "ncm": "42029200",
            "fiscal_origin": "0"}
    r = client.post("/api/products", json=novo, headers=h)
    assert r.status_code == 201, r.text
    p = r.json()
    assert p["sku"] == "MOT900" and p["channels"] == ["ML", "S", "M"]
    assert client.post("/api/products", json=novo, headers=h).json()["code"] == "SKU_DUPLICADO"
    assert client.post("/api/products", json={**novo, "sku": "X", "price": -1}, headers=h).status_code == 422

    r = client.put(f"/api/products/{p['id']}", json={"stock": 9}, headers=h)
    assert r.json()["stock"] == 9
    assert sql("select tipo, estoque_anterior, estoque_atual from movimento_estoque m join produto p on p.id = m.produto_id "
               "where p.sku = 'MOT900' order by m.criado_em desc limit 1")[0] == ("ajuste", 5, 9)
    publicados = sql("select a.estoque_publicado from anuncio a join produto p on p.id = a.produto_id where p.sku = 'MOT900'")
    assert {x[0] for x in publicados} == {9}

    assert client.delete(f"/api/products/{p['id']}", headers=h).status_code == 204
    assert client.get(f"/api/products/{p['id']}", headers=h).status_code == 404
    resumo = client.get("/api/products/summary", headers=h).json()
    assert resumo["all"] == 24 and resumo["out_of_stock"] == 1


# ---------- Estoque ----------

def test_divergencias(client, h):
    divs = client.get("/api/stock/divergences", headers=h).json()
    assert {d["sku"] for d in divs} == {"MOC012", "REL400"}
    moc = next(d for d in divs if d["sku"] == "MOC012")
    shopee = next(c for c in moc["channels"] if c["channel"] == "Shopee")

    r = client.post(f"/api/stock/divergences/{moc['product_id']}/resolve",
                    json={"source": "channel", "integration_id": shopee["integration_id"]}, headers=h)
    assert r.json() == {"product_id": moc["product_id"], "central_stock": 10, "status": "Sincronizado"}
    assert estoque_de("MOC012") == 10

    r = client.post(f"/api/stock/divergences/{moc['product_id']}/resolve", json={"source": "central"}, headers=h)
    assert r.status_code == 409 and r.json()["code"] == "SEM_DIVERGENCIA"
    assert client.post(f"/api/stock/divergences/{moc['product_id']}/resolve", json={"source": "channel"},
                       headers=h).status_code == 422


def test_sincronizar_estoque(client, h):
    r = client.post("/api/stock/sync", headers=h)
    assert r.status_code == 202
    s = client.get(f"/api/syncs/{r.json()['sync_id']}", headers=h).json()
    assert s["status"] == "concluida" and s["items_updated"] == 24 and s["channels"] == 3
    resumo = client.get("/api/stock/summary", headers=h).json()
    assert resumo["divergences"] <= 1  # o simulador pode "ler" uma divergência nova
    assert client.get("/api/notifications", params={"filter": "integracoes"},
                      headers=h).json()[0]["title"] == "Sincronização concluída"


# ---------- Pedidos ----------

def test_sincronizar_pedidos_baixa_estoque(client, h):
    antes_pedidos = sql("select count(*) from pedido")[0][0]
    antes_unidades = sql("select sum(estoque_central) from produto")[0][0]
    for _ in range(5):  # o simulador sorteia 0..3 pedidos por canal
        s = client.post("/api/orders/sync", headers=h).json()
        if client.get(f"/api/syncs/{s['sync_id']}", headers=h).json()["new_orders"]:
            break
    novos = sql("select count(*) from pedido")[0][0] - antes_pedidos
    assert novos > 0
    assert sql("select sum(estoque_central) from produto")[0][0] < antes_unidades
    assert sql("select count(*) from movimento_estoque where tipo = 'venda'")[0][0] > 0
    ultimo = client.get("/api/notifications", params={"filter": "pedidos"}, headers=h).json()[0]
    assert ultimo["title"].startswith("Novo pedido #")


def test_cancelar_devolve_estoque(client, h):
    pedido_id, sku, qtd = sql(
        "select p.id, pr.sku, ip.quantidade from pedido p join item_pedido ip on ip.pedido_id = p.id "
        "join produto pr on pr.id = ip.produto_id where p.status = 'aguardando' "
        "and (select count(*) from item_pedido where pedido_id = p.id) = 1 limit 1")[0]
    antes = estoque_de(sku)
    r = client.patch(f"/api/orders/{pedido_id}/status", json={"status": "cancelado"}, headers=h)
    assert r.status_code == 200 and r.json()["status"] == "cancelado"
    assert estoque_de(sku) == antes + qtd
    r = client.patch(f"/api/orders/{pedido_id}/status", json={"status": "entregue"}, headers=h)
    assert r.status_code == 409 and r.json()["code"] == "TRANSICAO_INVALIDA"
    detalhe = client.get(f"/api/orders/{pedido_id}", headers=h).json()
    assert detalhe["status"] == "cancelado" and detalhe["invoice"] is None


def test_resumo_pedidos(client, h):
    r = client.get("/api/orders/summary", headers=h).json()
    assert r["pending_orders"]["value"] == r["by_status"]["aguardando"] + r["by_status"]["em_separacao"]


# ---------- Notas fiscais ----------

def test_emitir_nota_valida_e_bloqueada(client, h):
    ok = sql("""
        select p.id from pedido p join nota_fiscal nf on nf.pedido_id = p.id join cliente c on c.id = p.cliente_id
         where nf.status = 'aguardando_emissao' and p.status <> 'cancelado' and c.cpf_cnpj is not null
           and not exists (select 1 from item_pedido ip join produto pr on pr.id = ip.produto_id
                            where ip.pedido_id = p.id and (pr.ncm is null or pr.origem_fiscal is null))
         limit 1""")[0][0]
    r = client.post("/api/invoices", json={"order_id": str(ok)}, headers=h)
    assert r.status_code == 201, r.text
    nota = client.get(f"/api/invoices/{r.json()['id']}", headers=h).json()
    assert nota["status"] in {"autorizada", "rejeitada"} and nota["number"].startswith("NF-e ")
    assert client.post("/api/invoices", json={"order_id": str(ok)}, headers=h).status_code in (201, 409)

    bloqueado = sql("""
        select p.id from pedido p join nota_fiscal nf on nf.pedido_id = p.id
         where nf.status = 'aguardando_emissao' and p.status <> 'cancelado'
           and exists (select 1 from item_pedido ip join produto pr on pr.id = ip.produto_id
                        where ip.pedido_id = p.id and pr.ncm is null) limit 1""")
    if bloqueado:
        r = client.post("/api/invoices", json={"order_id": str(bloqueado[0][0])}, headers=h)
        assert r.status_code == 422 and r.json()["code"] == "DADOS_FISCAIS_INCOMPLETOS"
        assert any("NCM" in v for v in r.json()["fields"].values())
        assert client.get("/api/invoices/summary", headers=h).json()["rejections_avoided"] >= 1


def test_reenviar_rejeitada_e_lote(client, h):
    rejeitada = sql("select id from nota_fiscal where status = 'rejeitada' limit 1")[0][0]
    r = client.post(f"/api/invoices/{rejeitada}/resend", headers=h)
    assert r.status_code in (200, 422), r.text
    autorizada = sql("select id from nota_fiscal where status = 'autorizada' limit 1")[0][0]
    assert client.post(f"/api/invoices/{autorizada}/resend", headers=h).json()["code"] == "NFE_NAO_REJEITADA"

    antes = client.get("/api/invoices/summary", headers=h).json()
    r = client.post("/api/invoices/batch", json={}, headers=h)
    assert r.status_code == 202 and r.json()["total"] == antes["ready_to_invoice"]
    depois = client.get("/api/invoices/summary", headers=h).json()
    assert depois["ready_to_invoice"] < antes["ready_to_invoice"] or antes["ready_to_invoice"] == 0
    saude = client.get("/api/invoices/fiscal-health", headers=h).json()
    assert 0 <= saude["score"] <= 100 and len(saude["items"]) == 3


# ---------- Marketplaces ----------

def test_desconectar_e_reconectar(client, h):
    integ = {i["name"]: i for i in client.get("/api/integrations", headers=h).json()}
    assert integ["Telegram"]["type"] == "atendimento"
    magalu = integ["Magalu"]["id"]
    assert client.delete(f"/api/integrations/{magalu}", headers=h).status_code == 204
    assert [c["short"] for c in client.get("/api/channels", headers=h).json()] == ["ML", "S"]
    assert all(e[6] == "—" for e in client.get("/api/stock", headers=h).json())

    r = client.post("/api/marketplaces/connect", json={"marketplace": "magalu"}, headers=h)
    assert r.status_code == 201 and r.json()["status"] == "conectado"
    assert client.post("/api/marketplaces/connect", json={"marketplace": "Magalu"}, headers=h).json()["code"] == "CANAL_JA_CONECTADO"
    assert client.post("/api/marketplaces/connect", json={"marketplace": "Amazon"}, headers=h).status_code == 404
    assert client.post(f"/api/integrations/{magalu}/sync", headers=h).status_code == 202


# ---------- Relatórios, notificações, configurações, assistente ----------

@pytest.mark.parametrize("params", [{"period": "7 dias"}, {"period": "3 meses"},
                                    {"period": "custom", "from": "2026-09-01", "to": "2026-09-15"}])
def test_relatorios(client, h, params):
    r = client.get("/api/reports", params=params, headers=h)
    assert r.status_code == 200, r.text
    d = r.json()
    assert len(d["sales_evolution"]["values"]) == 7 and len(d["top_products"]) <= 4
    if d["sales_by_marketplace"]:
        assert abs(sum(c["share_pct"] for c in d["sales_by_marketplace"]) - 100) <= 2


def test_notificacoes(client, h):
    lista = client.get("/api/notifications", params={"filter": "nao_lidas"}, headers=h).json()
    assert lista and all(n["unread"] for n in lista)
    assert client.patch(f"/api/notifications/{lista[0]['id']}/read", headers=h).status_code == 204
    assert client.post("/api/notifications/read-all", headers=h).json()["updated"] >= 0
    assert client.get("/api/notifications/summary", headers=h).json()["unread"] == 0


def test_configuracoes(client, h):
    empresa = client.get("/api/settings/company", headers=h).json()
    assert empresa["cnpj"] == "12.345.678/0001-95"
    assert client.put("/api/settings/company", json={**empresa, "cnpj": "123"}, headers=h).status_code == 422
    empresa.pop("customer_since")
    assert client.put("/api/settings/company", json={**empresa, "phone": "(11) 4000-0000"},
                      headers=h).json()["phone"] == "(11) 4000-0000"

    prefs = client.get("/api/settings/preferences", headers=h).json()
    prefs.pop("last_sync")
    assert client.put("/api/settings/preferences", json={**prefs, "check_interval_minutes": 7}, headers=h).status_code == 422
    assert client.put("/api/settings/preferences", json={**prefs, "check_interval_minutes": 15},
                      headers=h).json()["check_interval_minutes"] == 15

    matriz = client.get("/api/settings/notifications", headers=h).json()
    assert [e["event"] for e in matriz["events"]][0] == "novo_pedido"
    matriz["events"][0]["push"] = True
    assert client.put("/api/settings/notifications", json={"events": matriz["events"]},
                      headers=h).json()["events"][0]["push"] is True
    assert len(client.get("/api/settings/team", headers=h).json()["members"]) == 4
    assert client.get("/api/settings/certificate", headers=h).json()["type"] == "A1"


@pytest.mark.parametrize("pergunta,intencao", [
    ("Consultar estoque", "consultar_estoque"),
    ("Vendas de hoje", "vendas_hoje"),
    ("Pedidos pendentes", "pedidos_pendentes"),
    ("Estoque baixo", "consultar_estoque_baixo"),
    ("quais produtos estão acabando?", "consultar_estoque_baixo"),
    ("qual a previsão do tempo?", "desconhecida"),
])
def test_assistente(client, h, pergunta, intencao):
    r = client.post("/api/assistant/messages", json={"message": pergunta}, headers=h)
    assert r.status_code == 200 and r.json()["intent"] == intencao and r.json()["reply"]


def test_assistente_vazio(client, h):
    assert client.post("/api/assistant/messages", json={"message": "  "}, headers=h).status_code == 422


def test_public_do_bot_intacto(client):
    with psycopg.connect(URL) as c:
        existe = c.execute("select to_regclass('public.produto')").fetchone()[0]
        if existe:
            assert c.execute("select count(*) from public.produto where sku like 'MOT%'").fetchone()[0] == 0


def test_ids_opcionais_e_emitir_rascunho(client, h):
    assert len(client.get("/api/products", headers=h).json()[0]) == 7
    com_id = client.get("/api/products", params={"ids": 1}, headers=h).json()[0]
    assert len(com_id) == 8 and client.get(f"/api/products/{com_id[7]}", headers=h).status_code == 200
    pedido = client.get("/api/orders", params={"ids": 1}, headers=h).json()[0]
    assert client.get(f"/api/orders/{pedido[7]}", headers=h).json()["code"] == pedido[0]

    rascunhos = client.get("/api/invoices", params={"status": "aguardando_emissao", "ids": 1}, headers=h).json()
    assert rascunhos and all(r[0] == "Rascunho" for r in rascunhos)
    r = client.post(f"/api/invoices/{rascunhos[0][7]}/emit", headers=h)
    assert r.status_code in (201, 200, 422), r.text
    autorizada = sql("select id from nota_fiscal where status = 'autorizada' limit 1")[0][0]
    assert client.post(f"/api/invoices/{autorizada}/emit", headers=h).json()["code"] == "NFE_NAO_PENDENTE"
