"""Emissão de NF-e SIMULADA (RN024–RN029, UC09, UC10).

Fluxo: rascunho (aguardando_emissao) → validação fiscal → processando →
SEFAZ simulada → autorizada | rejeitada. Se a validação falhar, a nota não
é enviada, as pendências ficam gravadas e conta uma "rejeição evitada".
"""

import logging
import re
import time
from datetime import date
from uuid import UUID

from .. import db
from ..adapters import sefaz_simulada
from ..config import settings
from ..erros import ErroApi
from . import notificacoes

log = logging.getLogger("taylor.fiscal")

_SO_DIGITOS = re.compile(r"\D")


def validar(conn, nota_id: UUID) -> list[str]:
    """Regras de validação conhecidas (RN026). A lista completa das "23 regras" é a pendência P25."""
    d = db.um(
        """
        select pe.status as pedido_status,
               e.razao_social, e.inscricao_estadual, e.regime_tributario, e.endereco, e.uf as uf_empresa,
               cd.validade as certificado_validade,
               c.nome as cliente, c.cpf_cnpj, c.endereco as cliente_endereco, c.uf as cliente_uf
          from nota_fiscal nf
          join pedido pe on pe.id = nf.pedido_id
          join empresa e on e.id = nf.empresa_id
          left join certificado_digital cd on cd.empresa_id = e.id
          left join cliente c on c.id = pe.cliente_id
         where nf.id = %s
        """,
        (nota_id,),
        conn,
    )
    pendencias = []
    if d["pedido_status"] == "cancelado":
        pendencias.append("Pedido cancelado não pode ser faturado.")

    faltando = [rotulo for campo, rotulo in [
        ("razao_social", "razão social"), ("inscricao_estadual", "inscrição estadual"),
        ("regime_tributario", "regime tributário"), ("endereco", "endereço"), ("uf_empresa", "UF"),
    ] if not d[campo]]
    if faltando:
        pendencias.append(f"Empresa: preencha {', '.join(faltando)} em Configurações › Empresa.")

    if d["certificado_validade"] is None:
        pendencias.append("Certificado digital A1 não cadastrado.")
    elif d["certificado_validade"] < date.today():
        pendencias.append("Certificado digital A1 vencido.")

    if d["cliente"] is None:
        pendencias.append("Pedido sem destinatário.")
    else:
        if len(_SO_DIGITOS.sub("", d["cpf_cnpj"] or "")) not in (11, 14):
            pendencias.append(f"Destinatário {d['cliente']}: CPF/CNPJ ausente ou inválido.")
        if not d["cliente_endereco"] or not d["cliente_uf"]:
            pendencias.append(f"Destinatário {d['cliente']}: endereço incompleto (a UF define o CFOP).")

    for p in db.todos(
        """
        select distinct pr.sku, pr.ncm, pr.origem_fiscal
          from item_pedido ip
          join nota_fiscal nf on nf.pedido_id = ip.pedido_id
          join produto pr on pr.id = ip.produto_id
         where nf.id = %s
        """,
        (nota_id,),
        conn,
    ):
        if not re.fullmatch(r"\d{8}", p["ncm"] or ""):
            pendencias.append(f"Produto {p['sku']}: NCM ausente ou inválido.")
        if not p["origem_fiscal"]:
            pendencias.append(f"Produto {p['sku']}: origem fiscal não informada.")
    return pendencias


def solicitar_emissao(empresa_id: UUID, nota_id: UUID) -> tuple[dict, list[str]]:
    """Valida e coloca a nota em processamento. Retorna (nota, pendências).

    Roda em transação própria para gravar o bloqueio mesmo quando a
    validação falha (a rota responde 422 depois do COMMIT).
    """
    with db.transacao() as conn:
        nota = db.um(
            "select id, status, numero from nota_fiscal where id = %s and empresa_id = %s for update",
            (nota_id, empresa_id),
            conn,
        )
        if not nota:
            raise ErroApi(404, "NOTA_NAO_ENCONTRADA", "Nota fiscal não encontrada.")
        if nota["status"] == "autorizada":
            raise ErroApi(409, "NFE_JA_AUTORIZADA", "Este pedido já possui NF-e autorizada.")
        if nota["status"] == "processando":
            raise ErroApi(409, "NFE_EM_PROCESSAMENTO", "Esta NF-e já está em processamento.")

        pendencias = validar(conn, nota_id)
        if pendencias:
            conn.execute(
                "update nota_fiscal set pendencias = %s, bloqueios = bloqueios + 1 where id = %s",
                (pendencias, nota_id),
            )
            return nota, pendencias

        numero = nota["numero"]  # reenvio de rejeitada reaproveita o número
        if not numero:
            sequencia = db.valor(
                """
                update empresa set proximo_numero_nfe = proximo_numero_nfe + 1
                 where id = %s returning proximo_numero_nfe - 1
                """,
                (empresa_id,),
                conn,
            )
            numero = f"{sequencia:06d}"
        nota = db.um(
            """
            update nota_fiscal
               set status = 'processando', numero = %s, emitida_em = now(),
                   motivo_rejeicao = null, pendencias = null
             where id = %s
            returning id, numero, status
            """,
            (numero, nota_id),
            conn,
        )
        return nota, []


def processar_sefaz(nota_ids: list[UUID], aguardar: bool = True) -> None:
    """Envio à SEFAZ simulada (tarefa em segundo plano)."""
    if aguardar:
        time.sleep(settings.sefaz_segundos_processamento)
    for nota_id in nota_ids:
        try:
            with db.transacao() as conn:
                nota = db.um("select id, empresa_id, numero from nota_fiscal where id = %s and status = 'processando'",
                             (nota_id,), conn)
                if not nota:
                    continue
                autorizada, motivo, xml_url = sefaz_simulada.enviar(nota["numero"])
                if autorizada:
                    conn.execute("update nota_fiscal set status = 'autorizada', xml_url = %s where id = %s",
                                 (xml_url, nota_id))
                else:
                    conn.execute("update nota_fiscal set status = 'rejeitada', motivo_rejeicao = %s where id = %s",
                                 (motivo, nota_id))
                    notificacoes.criar(conn, nota["empresa_id"], "fiscal", f"NF-e {nota['numero']} rejeitada",
                                       f"{motivo} Revise antes de reenviar.", "receipt", "red",
                                       ("Revisar nota", "Notas fiscais"))
        except Exception:
            log.exception("Falha ao processar a NF-e %s", nota_id)


def emitir_lote(empresa_id: UUID, nota_ids: list[UUID]) -> None:
    """RN029: valida todas, espera a "SEFAZ" uma vez e processa as aprovadas."""
    enviadas = []
    for nota_id in nota_ids:
        try:
            nota, pendencias = solicitar_emissao(empresa_id, nota_id)
            if not pendencias:
                enviadas.append(nota["id"])
        except ErroApi:
            continue
    processar_sefaz(enviadas)
