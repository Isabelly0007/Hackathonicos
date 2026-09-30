"""Notificações da operação (RN030, RN031)."""

from uuid import UUID

from psycopg import Connection


def criar(
    conn: Connection,
    empresa_id: UUID,
    tipo: str,
    titulo: str,
    descricao: str,
    icone: str,
    tom: str,
    acao: tuple[str, str] | None = None,
) -> None:
    """Registra a notificação no Taylor (nasce não lida).

    O envio externo (Telegram, e-mail, push) conforme a matriz
    preferencia_notificacao é [PLANEJADO]; o bot_estoque pode escutar
    INSERTs nesta tabela pelo Supabase Realtime.
    """
    conn.execute(
        """
        insert into notificacao (empresa_id, tipo, titulo, descricao, icone, tom, acao_rotulo, acao_pagina)
        values (%s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (empresa_id, tipo, titulo, descricao, icone, tom, *(acao or (None, None))),
    )
