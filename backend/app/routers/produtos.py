"""Produtos (RF010, RF011). Compatibilidade: api-backend.md §2.6; novos: §3.3."""

from decimal import Decimal
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Response
from psycopg.errors import ForeignKeyViolation, UniqueViolation
from pydantic import BaseModel, Field

from .. import db
from ..auth import Contexto, contexto
from ..erros import ErroApi
from ..formatacao import STATUS_PRODUTO, brl, data_curta
from ..services import estoque

router = APIRouter(tags=["Produtos"])

StatusProduto = Literal["ativo", "estoque_baixo", "sem_estoque"]

SQL_PRODUTOS = """
    select p.id, p.nome, p.sku, p.preco, p.estoque_central, p.estoque_minimo, p.ncm, p.origem_fiscal,
           p.atualizado_em, status_produto(p.estoque_central, p.estoque_minimo) as status,
           coalesce((select array_agg(m.sigla order by m.ordem)
                       from anuncio a join integracao i on i.id = a.integracao_id and i.status = 'conectado'
                       join marketplace m on m.id = i.marketplace_id
                      where a.produto_id = p.id), '{}') as canais
      from produto p
     where p.empresa_id = %(e)s
"""


class ProdutoEntrada(BaseModel):
    name: str = Field(min_length=1)
    sku: str = Field(min_length=1)
    price: Decimal = Field(ge=0, decimal_places=2)
    stock: int = Field(ge=0)
    min_stock: int = Field(ge=0)
    ncm: str | None = Field(default=None, pattern=r"^\d{8}$")
    fiscal_origin: str | None = Field(default=None, pattern=r"^[0-8]$")


class ProdutoAlteracao(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    sku: str | None = Field(default=None, min_length=1)
    price: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    stock: int | None = Field(default=None, ge=0)
    min_stock: int | None = Field(default=None, ge=0)
    ncm: str | None = Field(default=None, pattern=r"^\d{8}$")
    fiscal_origin: str | None = Field(default=None, pattern=r"^[0-8]$")


def _objeto(p: dict) -> dict:
    return {
        "id": p["id"], "name": p["nome"], "sku": p["sku"], "stock": p["estoque_central"],
        "min_stock": p["estoque_minimo"], "price": float(p["preco"]), "status": p["status"],
        "ncm": p["ncm"], "fiscal_origin": p["origem_fiscal"], "channels": p["canais"],
        "updated_at": p["atualizado_em"],
    }


def _buscar(ctx: Contexto, produto_id: UUID, conn=None) -> dict:
    p = db.um(SQL_PRODUTOS + " and p.id = %(id)s", {"e": ctx.empresa_id, "id": produto_id}, conn)
    if not p:
        raise ErroApi(404, "PRODUTO_NAO_ENCONTRADO", "Produto não encontrado.")
    return p


@router.get("/products")
def listar(status: StatusProduto | None = None, ids: bool = False, ctx: Contexto = Depends(contexto)):
    """Array de arrays: [nome, sku, estoque, preço, status, "Canais", atualização].

    Com ?ids=1 cada linha ganha o id do produto no fim (usado pelo front para editar).
    """
    linhas = db.todos(
        SQL_PRODUTOS + " and (%(status)s::text is null or status_produto(p.estoque_central, p.estoque_minimo) = %(status)s)"
                       " order by p.atualizado_em desc, p.nome",
        {"e": ctx.empresa_id, "status": status},
    )
    return [[p["nome"], p["sku"], str(p["estoque_central"]), brl(p["preco"]), STATUS_PRODUTO[p["status"]],
             "Canais", data_curta(p["atualizado_em"], ctx.fuso), *([p["id"]] if ids else [])] for p in linhas]


@router.get("/products/summary")
def resumo(ctx: Contexto = Depends(contexto)):
    r = db.um(
        """
        select count(*) as all,
               count(*) filter (where s = 'ativo') as active,
               count(*) filter (where s = 'estoque_baixo') as low_stock,
               count(*) filter (where s = 'sem_estoque') as out_of_stock
          from (select status_produto(estoque_central, estoque_minimo) as s from produto where empresa_id = %s) t
        """,
        (ctx.empresa_id,),
    )
    return r


@router.post("/products", status_code=201)
def criar(dados: ProdutoEntrada, ctx: Contexto = Depends(contexto)):
    """Cria o produto e o publica em todos os canais conectados (publicação simulada — P11)."""
    try:
        with db.transacao() as conn:
            produto_id = db.valor(
                """
                insert into produto (empresa_id, nome, sku, preco, estoque_central, estoque_minimo, ncm, origem_fiscal)
                values (%s, %s, %s, %s, %s, %s, %s, %s) returning id
                """,
                (ctx.empresa_id, dados.name.strip(), dados.sku.strip().upper(), dados.price, dados.stock,
                 dados.min_stock, dados.ncm, dados.fiscal_origin),
                conn,
            )
            conn.execute(
                """
                insert into anuncio (produto_id, integracao_id, estoque_publicado, status)
                select %(p)s, i.id, %(estoque)s, case when %(estoque)s = 0 then 'pausado' else 'ativo' end
                  from integracao i join marketplace m on m.id = i.marketplace_id
                 where i.empresa_id = %(e)s and i.status = 'conectado' and m.tipo = 'marketplace'
                """,
                {"p": produto_id, "estoque": dados.stock, "e": ctx.empresa_id},
            )
            return _objeto(_buscar(ctx, produto_id, conn))
    except UniqueViolation as exc:
        raise ErroApi(409, "SKU_DUPLICADO", "Já existe um produto com este SKU.",
                      {"sku": "Já existe um produto com este SKU"}) from exc


@router.get("/products/{produto_id}")
def detalhe(produto_id: UUID, ctx: Contexto = Depends(contexto)):
    return _objeto(_buscar(ctx, produto_id))


@router.put("/products/{produto_id}")
def alterar(produto_id: UUID, dados: ProdutoAlteracao, ctx: Contexto = Depends(contexto)):
    campos = dados.model_dump(exclude_unset=True)
    colunas = {"name": "nome", "sku": "sku", "price": "preco", "min_stock": "estoque_minimo",
               "ncm": "ncm", "fiscal_origin": "origem_fiscal"}
    try:
        with db.transacao() as conn:
            _buscar(ctx, produto_id, conn)
            if "sku" in campos:
                campos["sku"] = campos["sku"].strip().upper()
            sets = {colunas[k]: v for k, v in campos.items() if k in colunas}
            if sets:
                atribuicoes = ", ".join(f"{col} = %({col})s" for col in sets)
                conn.execute(f"update produto set {atribuicoes} where id = %(id)s", {**sets, "id": produto_id})
            if "stock" in campos:
                estoque.alterar_central(conn, ctx.empresa_id, produto_id, campos["stock"], "ajuste",
                                        "Ajuste manual pelo painel")
            return _objeto(_buscar(ctx, produto_id, conn))
    except UniqueViolation as exc:
        raise ErroApi(409, "SKU_DUPLICADO", "Já existe um produto com este SKU.",
                      {"sku": "Já existe um produto com este SKU"}) from exc


@router.delete("/products/{produto_id}", status_code=204)
def excluir(produto_id: UUID, ctx: Contexto = Depends(contexto)):
    try:
        with db.transacao() as conn:
            _buscar(ctx, produto_id, conn)
            conn.execute("delete from produto where id = %s", (produto_id,))
    except ForeignKeyViolation as exc:
        raise ErroApi(409, "PRODUTO_COM_PEDIDOS",
                      "O produto tem pedidos vinculados e não pode ser excluído. Zere o estoque para pausá-lo.") from exc
    return Response(status_code=204)
