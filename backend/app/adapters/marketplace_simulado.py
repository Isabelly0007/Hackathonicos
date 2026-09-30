"""Adaptador de marketplace SIMULADO (RN019, integracoes.md §5.2).

Mantém a interface que um adaptador real (OAuth + API do canal) teria, para
que a troca futura não afete as regras de negócio. O envio de estoque e a
pausa de anúncios ficam em services/estoque.enviar_central.
"""

import random
from dataclasses import dataclass
from uuid import UUID

from psycopg import Connection

from .. import db
from ..config import settings

NOMES_CLIENTES = [
    "Aline Prado", "Bruno Farias", "Clara Menezes", "Diego Araújo", "Elisa Campos",
    "Fábio Ramos", "Giovana Leite", "Hugo Pacheco", "Isis Monteiro", "João Vitor Reis",
]
UFS = ["SP", "RJ", "MG", "PR", "RS", "BA", "SC", "PE", "GO", "CE"]


@dataclass
class ItemSimulado:
    produto_id: UUID
    quantidade: int
    preco_unitario: float


@dataclass
class PedidoSimulado:
    cliente_id: UUID
    cliente_nome: str
    itens: list[ItemSimulado]


@dataclass
class AlteracaoExterna:
    produto: str
    canal: str
    publicado: int
    central: int


class MarketplaceSimulado:
    def conectar(self, conn: Connection, empresa_id: UUID, marketplace_id: UUID) -> dict:
        """OAuth simulado: autoriza na hora, sem tokens."""
        return {"access_token": None, "refresh_token": None, "conta": "Loja (simulada)"}

    def publicar_catalogo(self, conn: Connection, empresa_id: UUID, integracao_id: UUID) -> int:
        """Cria um anúncio por produto no canal recém-conectado."""
        return conn.execute(
            """
            insert into anuncio (produto_id, integracao_id, estoque_publicado, status)
            select p.id, %(integracao)s, p.estoque_central,
                   case when p.estoque_central = 0 then 'pausado' else 'ativo' end
              from produto p
             where p.empresa_id = %(empresa)s
            on conflict (produto_id, integracao_id) do nothing
            """,
            {"empresa": empresa_id, "integracao": integracao_id},
        ).rowcount

    def buscar_pedidos_novos(self, conn: Connection, empresa_id: UUID, integracao_id: UUID) -> list[PedidoSimulado]:
        """Gera de 0 a N pedidos fictícios com produtos ativos neste canal."""
        quantidade = random.randint(0, settings.simulador_max_pedidos_por_canal)
        pedidos = []
        for _ in range(quantidade):
            produtos = db.todos(
                """
                select p.id, p.preco
                  from produto p
                  join anuncio a on a.produto_id = p.id and a.integracao_id = %s and a.status = 'ativo'
                 where p.estoque_central > 0
                 order by random() limit %s
                """,
                (integracao_id, random.choice([1, 1, 1, 2, 3])),
                conn,
            )
            if not produtos:
                break
            cliente = self._cliente(conn, empresa_id)
            itens = [ItemSimulado(p["id"], random.choice([1, 1, 1, 2]), p["preco"]) for p in produtos]
            pedidos.append(PedidoSimulado(cliente["id"], cliente["nome"], itens))
        return pedidos

    def detectar_alteracoes_externas(self, conn: Connection, empresa_id: UUID, integracao_ids: list[UUID]) -> list[AlteracaoExterna]:
        """Simula a leitura do canal após o envio: às vezes o canal informa uma
        quantidade diferente (ajuste feito direto no painel do marketplace),
        gerando uma divergência para demonstrar a RN015 (pendência P16)."""
        if not integracao_ids or random.random() >= settings.simulador_taxa_divergencia:
            return []
        alvo = db.um(
            """
            select a.id, p.nome, p.estoque_central, m.nome as canal
              from anuncio a
              join produto p on p.id = a.produto_id
              join integracao i on i.id = a.integracao_id
              join marketplace m on m.id = i.marketplace_id
             where i.id = any(%s) and p.estoque_central > 3 and a.status = 'ativo'
             order by random() limit 1
            """,
            (integracao_ids,),
            conn,
        )
        if not alvo:
            return []
        publicado = max(alvo["estoque_central"] + random.choice([-3, -2, -1, 1, 2]), 0)
        conn.execute("update anuncio set estoque_publicado = %s where id = %s", (publicado, alvo["id"]))
        return [AlteracaoExterna(alvo["nome"], alvo["canal"], publicado, alvo["estoque_central"])]

    def _cliente(self, conn: Connection, empresa_id: UUID) -> dict:
        existente = db.um(
            "select id, nome from cliente where empresa_id = %s order by random() limit 1", (empresa_id,), conn
        )
        if existente and random.random() < 0.7:
            return existente
        nome = random.choice(NOMES_CLIENTES)
        uf = random.choice(UFS)
        cpf = "".join(random.choices("0123456789", k=11))
        return db.um(
            """
            insert into cliente (empresa_id, nome, cpf_cnpj, endereco, uf)
            values (%s, %s, %s, %s, %s) returning id, nome
            """,
            (empresa_id, nome, cpf, f"Rua Exemplo, {random.randint(1, 999)} · {uf}", uf),
            conn,
        )


marketplace = MarketplaceSimulado()
