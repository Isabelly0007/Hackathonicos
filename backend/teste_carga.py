"""Teste de carga: N pessoas ao mesmo tempo, cada uma com a sua conta Demo.

Simula a palestra (todo mundo escaneia o QR code junto). Cada usuário virtual:
  1. cria a conta Demo (POST /api/auth/demo) e abre /auth/me;
  2. navega por Dashboard, Produtos, Pedidos, Estoque, Notas e Assistente (texto e voz),
     buscando os dados de cada tela em paralelo, como o front faz;
com uma pausa de 0,5 a 2 s entre as telas (tempo de leitura).

Uso (dentro de backend/, com o .venv ativo e o back-end ligado):
    python teste_carga.py --url http://127.0.0.1:8000 --usuarios 150
    python teste_carga.py --url ... --banco postgresql://... --schema taylor_carga   (mede os MB por conta)

Só aceita localhost, para ninguém rodar contra o Supabase/Render da equipe sem querer
(--permitir-remoto libera). As contas criadas são apagadas sozinhas depois de CONTA_DEMO_HORAS.
"""

import argparse
import asyncio
import math
import random
import sys
import time
from collections import Counter, defaultdict
from urllib.parse import urlparse

import httpx

TELAS = [
    ("Dashboard", ["/dashboard/stats?period=Hoje", "/dashboard/sales?range=7 dias", "/dashboard/order-statuses",
                   "/dashboard/stock-alerts", "/channels", "/notifications/summary"]),
    ("Produtos", ["/products?ids=1", "/products/summary"]),
    ("Pedidos", ["/orders?ids=1", "/orders/summary"]),
    ("Estoque", ["/stock", "/stock/summary", "/stock/divergences"]),
    ("Notas fiscais", ["/invoices?ids=1", "/invoices/summary", "/invoices/fiscal-health"]),
]
ASSISTENTE = [
    {"message": "Vendas de hoje", "input_mode": "quick_action"},
    {"message": "quais produtos estão com estoque baixo", "input_mode": "voice"},
]
ETAPAS = ["Criar conta Demo", "Entrar (/auth/me)", *[t for t, _ in TELAS], "Assistente"]


class Medidas:
    def __init__(self) -> None:
        self.tempos: dict[str, list[float]] = defaultdict(list)
        self.erros: dict[str, Counter] = defaultdict(Counter)

    def registrar(self, etapa: str, segundos: float, erro: str | None) -> None:
        self.tempos[etapa].append(segundos)
        if erro:
            self.erros[etapa][erro] += 1


async def chamar(cliente: httpx.AsyncClient, medidas: Medidas, etapa: str, metodo: str, caminho: str,
                 token: str | None = None, corpo: dict | None = None) -> httpx.Response | None:
    cabecalhos = {"Authorization": f"Bearer {token}"} if token else {}
    inicio = time.perf_counter()
    try:
        resp = await cliente.request(metodo, "/api" + caminho, headers=cabecalhos, json=corpo)
    except httpx.HTTPError as exc:
        medidas.registrar(etapa, time.perf_counter() - inicio, type(exc).__name__)
        return None
    erro = None
    if resp.status_code >= 400:
        try:
            codigo = resp.json().get("code", "")
        except ValueError:
            codigo = ""
        erro = f"HTTP {resp.status_code} {codigo}".strip()
    medidas.registrar(etapa, time.perf_counter() - inicio, erro)
    return resp


async def usuario(cliente: httpx.AsyncClient, medidas: Medidas, rampa: float, pausa: tuple[float, float]) -> bool:
    await asyncio.sleep(random.uniform(0, rampa))
    resp = await chamar(cliente, medidas, "Criar conta Demo", "POST", "/auth/demo")
    if resp is None or resp.status_code != 201:
        return False
    token = resp.json()["access_token"]
    await chamar(cliente, medidas, "Entrar (/auth/me)", "GET", "/auth/me", token)

    for tela, caminhos in TELAS:
        await asyncio.sleep(random.uniform(*pausa))
        await asyncio.gather(*(chamar(cliente, medidas, tela, "GET", c, token) for c in caminhos))

    for corpo in ASSISTENTE:
        await asyncio.sleep(random.uniform(*pausa))
        await chamar(cliente, medidas, "Assistente", "POST", "/assistant/messages", token, corpo)
    return True


def percentil(valores: list[float], p: float) -> float:
    ordenados = sorted(valores)
    return ordenados[max(0, math.ceil(p / 100 * len(ordenados)) - 1)]


def tamanho_banco(url: str, schema: str) -> tuple[float, int]:
    """(MB das tabelas + índices do schema, contas Demo ativas)."""
    import psycopg

    with psycopg.connect(url) as c:
        mb = c.execute(
            """
            select coalesce(sum(pg_total_relation_size(c.oid)), 0) / 1024.0 / 1024.0
              from pg_class c join pg_namespace n on n.oid = c.relnamespace
             where n.nspname = %s and c.relkind = 'r'
            """,
            (schema,),
        ).fetchone()[0]
        contas = c.execute(f'select count(*) from "{schema}".conta_demo').fetchone()[0]
    return float(mb), contas


async def principal(args: argparse.Namespace) -> int:
    medidas = Medidas()
    antes = tamanho_banco(args.banco, args.schema) if args.banco else None
    limites = httpx.Limits(max_connections=args.usuarios * 6, max_keepalive_connections=args.usuarios * 6)
    async with httpx.AsyncClient(base_url=args.url.rstrip("/"), timeout=args.timeout, limits=limites) as cliente:
        saude = await cliente.get("/api/health")
        saude.raise_for_status()
        print(f"Back-end ok em {args.url} ({saude.json()}).")
        print(f"Disparando {args.usuarios} usuários (rampa de {args.rampa:g} s)...\n")
        inicio = time.perf_counter()
        resultados = await asyncio.gather(
            *(usuario(cliente, medidas, args.rampa, (args.pausa_min, args.pausa_max)) for _ in range(args.usuarios))
        )
        duracao = time.perf_counter() - inicio

    todos = [t for etapa in ETAPAS for t in medidas.tempos[etapa]]
    total_erros = sum(sum(c.values()) for c in medidas.erros.values())
    print(f"{'Etapa':<20} {'Req.':>6} {'Erros':>6} {'p50 (ms)':>9} {'p95 (ms)':>9} {'Máx (ms)':>9}")
    print("-" * 64)
    for etapa in ETAPAS:
        tempos = medidas.tempos[etapa]
        if not tempos:
            continue
        print(f"{etapa:<20} {len(tempos):>6} {sum(medidas.erros[etapa].values()):>6} "
              f"{percentil(tempos, 50) * 1000:>9.0f} {percentil(tempos, 95) * 1000:>9.0f} {max(tempos) * 1000:>9.0f}")
    print("-" * 64)
    print(f"{'TOTAL':<20} {len(todos):>6} {total_erros:>6} {percentil(todos, 50) * 1000:>9.0f} "
          f"{percentil(todos, 95) * 1000:>9.0f} {max(todos) * 1000:>9.0f}")
    print(f"\nUsuários que completaram o roteiro: {sum(resultados)}/{args.usuarios} em {duracao:.1f} s "
          f"({len(todos) / duracao:.0f} req/s).")

    if total_erros:
        print("\nErros:")
        for etapa in ETAPAS:
            for erro, n in medidas.erros[etapa].most_common():
                print(f"  {etapa}: {erro} × {n}")
    else:
        print("Nenhum erro.")

    if antes:
        depois = tamanho_banco(args.banco, args.schema)
        novas = depois[1] - antes[1]
        print(f"\nBanco (schema {args.schema}): {antes[0]:.1f} MB → {depois[0]:.1f} MB; contas Demo: {antes[1]} → {depois[1]}.")
        if novas:
            print(f"≈ {(depois[0] - antes[0]) / novas:.2f} MB por conta Demo.")
    return 1 if total_erros else 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Teste de carga da conta Demo (palestra).")
    parser.add_argument("--url", default="http://127.0.0.1:8000", help="endereço do back-end")
    parser.add_argument("--usuarios", type=int, default=150)
    parser.add_argument("--rampa", type=float, default=0, help="segundos para espalhar a chegada (0 = todos juntos)")
    parser.add_argument("--pausa-min", type=float, default=0.5, help="pausa mínima entre telas (s)")
    parser.add_argument("--pausa-max", type=float, default=2.0, help="pausa máxima entre telas (s)")
    parser.add_argument("--timeout", type=float, default=60)
    parser.add_argument("--banco", help="DATABASE_URL do mesmo banco, para medir os MB por conta Demo")
    parser.add_argument("--schema", default="taylor", help="schema do Taylor nesse banco")
    parser.add_argument("--permitir-remoto", action="store_true", help="aceita um endereço fora de localhost")
    args = parser.parse_args()

    if urlparse(args.url).hostname not in ("localhost", "127.0.0.1") and not args.permitir_remoto:
        sys.exit("Este teste cria centenas de contas: use um back-end local (ou --permitir-remoto).")
    sys.exit(asyncio.run(principal(args)))


if __name__ == "__main__":
    main()
