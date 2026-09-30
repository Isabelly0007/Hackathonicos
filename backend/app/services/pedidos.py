"""Importação e ciclo de vida dos pedidos (RN007, RN009, RN013, RN017, RN021).

Transições permitidas (pendência P13, conforme diagramas/atividades.md §6):
aguardando → em_separacao → em_transporte → entregue; aguardando/em_separacao → cancelado.
"""

from uuid import UUID

from psycopg import Connection

from .. import db
from ..adapters.marketplace_simulado import PedidoSimulado
from ..erros import ErroApi
from ..formatacao import brl
from . import estoque, notificacoes

TRANSICOES = {
    "aguardando": {"em_separacao", "cancelado"},
    "em_separacao": {"em_transporte", "cancelado"},
    "em_transporte": {"entregue"},
    "entregue": set(),
    "cancelado": set(),
}


def _proximo_codigo(conn: Connection, empresa_id: UUID) -> str:
    conn.execute("select pg_advisory_xact_lock(hashtext(%s))", (str(empresa_id),))
    ultimo = db.valor(
        """
        select coalesce(max(substring(codigo from 2)::int), 200000)
          from pedido where empresa_id = %s and codigo ~ '^#[0-9]+$'
        """,
        (empresa_id,),
        conn,
    )
    return f"#{ultimo + 1}"


def importar(conn: Connection, empresa_id: UUID, integracao_id: UUID, canal: str, novo: PedidoSimulado) -> str:
    """Grava pedido + itens, cria a NF-e em rascunho, baixa o estoque e notifica."""
    prefs = estoque.preferencias(conn, empresa_id)
    status = "em_separacao" if prefs["importar_pedidos_auto"] else "aguardando"  # RN021
    codigo = _proximo_codigo(conn, empresa_id)
    quantidade = sum(i.quantidade for i in novo.itens)
    total = sum(i.quantidade * i.preco_unitario for i in novo.itens)

    pedido_id = db.valor(
        """
        insert into pedido (empresa_id, integracao_id, cliente_id, codigo, quantidade_itens, valor_total, status)
        values (%s, %s, %s, %s, %s, %s, %s) returning id
        """,
        (empresa_id, integracao_id, novo.cliente_id, codigo, quantidade, total, status),
        conn,
    )
    with conn.cursor() as cur:
        cur.executemany(
            "insert into item_pedido (pedido_id, produto_id, quantidade, preco_unitario) values (%s, %s, %s, %s)",
            [(pedido_id, i.produto_id, i.quantidade, i.preco_unitario) for i in novo.itens],
        )
    conn.execute(
        "insert into nota_fiscal (empresa_id, pedido_id, valor) values (%s, %s, %s)",
        (empresa_id, pedido_id, total),
    )
    estoque.aplicar_pedido(conn, empresa_id, pedido_id, -1, "venda", f"Pedido {codigo} ({canal})")

    itens = "item" if quantidade == 1 else "itens"
    notificacoes.criar(conn, empresa_id, "pedidos", f"Novo pedido {codigo}",
                       f"{novo.cliente_nome} comprou {quantidade} {itens} no {canal} · {brl(total)}.",
                       "cart", "blue", ("Ver pedido", "Pedidos"))
    return codigo


def alterar_status(conn: Connection, empresa_id: UUID, pedido_id: UUID, novo: str) -> dict:
    pedido = db.um(
        """
        select p.id, p.codigo, p.status, c.nome as cliente, m.nome as canal
          from pedido p
          left join cliente c on c.id = p.cliente_id
          join integracao i on i.id = p.integracao_id
          join marketplace m on m.id = i.marketplace_id
         where p.id = %s and p.empresa_id = %s
         for update of p
        """,
        (pedido_id, empresa_id),
        conn,
    )
    if not pedido:
        raise ErroApi(404, "PEDIDO_NAO_ENCONTRADO", "Pedido não encontrado.")
    if novo not in TRANSICOES[pedido["status"]]:
        raise ErroApi(409, "TRANSICAO_INVALIDA",
                      f"Não é possível mudar de '{pedido['status']}' para '{novo}'.")

    conn.execute("update pedido set status = %s where id = %s", (novo, pedido_id))

    if novo == "cancelado":
        estoque.aplicar_pedido(conn, empresa_id, pedido_id, +1, "cancelamento", f"Pedido {pedido['codigo']} cancelado")
        conn.execute(
            "delete from nota_fiscal where pedido_id = %s and status in ('aguardando_emissao', 'rejeitada')",
            (pedido_id,),
        )
        notificacoes.criar(conn, empresa_id, "pedidos", f"Pedido {pedido['codigo']} cancelado",
                           f"{pedido['cliente'] or 'O cliente'} cancelou a compra no {pedido['canal']}. "
                           "O estoque foi devolvido.", "cart", "purple", ("Ver pedido", "Pedidos"))
    return {"id": pedido_id, "code": pedido["codigo"], "status": novo}
