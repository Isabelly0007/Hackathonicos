"""Conta Demo: uma loja isolada por visitante (botão "Entrar com a conta Demo").

Cada conta é um usuário "Demo" + empresa "Loja Demo NNNN" com os dados de
exemplo (popular_empresa_demo, em db/migracoes.sql). O isolamento é o mesmo de
qualquer empresa: toda rota filtra por empresa_id (RN003). A conta é apagada
depois de CONTA_DEMO_HORAS (excluir_conta_demo) e existem no máximo
CONTA_DEMO_MAX contas ativas.
"""

import logging
import secrets
import threading
from uuid import UUID

from psycopg.errors import UniqueViolation

from .. import auth, db
from ..cnpj import gerar_cnpj
from ..config import settings
from ..erros import ErroApi

log = logging.getLogger("taylor.demo")

# Senhas fáceis de digitar no celular (o bot do Telegram pede e-mail e senha): palavra curta + 4 dígitos.
PALAVRAS = (
    "sol", "lua", "mar", "rio", "ceu", "flor", "onda", "vento", "pedra", "folha", "nuvem", "areia",
    "fruta", "limao", "manga", "caju", "uva", "pera", "coco", "mel", "cafe", "bolo", "pao", "leite",
    "gato", "pato", "urso", "lobo", "tigre", "zebra", "panda", "coala", "verde", "azul", "roxo", "rosa",
)
INTERVALO_LIMPEZA_SEGUNDOS = 5 * 60

# Gerar os dados é a parte cara (~0,1 s de banco por conta). Poucas por vez em cada worker
# deixam conexões livres para quem já está navegando quando muita gente entra junto.
_gerando = threading.BoundedSemaphore(2)


def _senha() -> str:
    return f"{secrets.choice(PALAVRAS)}{secrets.randbelow(10_000):04d}"


def criar() -> dict:
    """Cria a conta e devolve {usuario_id, email, senha, expira_em}.

    Duas transações: a primeira, curta, cria o usuário e a empresa e confere o
    limite; a segunda gera os dados de exemplo (a parte cara, no máximo duas por
    worker ao mesmo tempo). Assim o limite é exato e as criações simultâneas não
    esperam umas pelas outras nem tomam as conexões de quem já está navegando.
    """
    if settings.conta_demo_max <= 0:
        raise ErroApi(403, "CONTA_DEMO_DESLIGADA", "A conta Demo não está disponível neste ambiente.")
    senha = _senha()
    senha_hash = auth.gerar_hash(senha, rounds=10)

    for _ in range(5):  # CNPJ sorteado repetido (improvável): tenta outro
        try:
            with db.transacao() as conn:
                numero = db.valor("select nextval('conta_demo_numero_seq')", conn=conn)
                email = f"demo{numero:04d}@taylor.demo"
                usuario_id = db.valor(
                    "insert into usuario (nome, email, senha_hash) values ('Demo', %s, %s) returning id",
                    (email, senha_hash), conn,
                )
                empresa_id = db.valor(
                    "insert into empresa (nome_fantasia, cnpj) values (%s, %s) returning id",
                    (f"Loja Demo {numero:04d}", gerar_cnpj()), conn,
                )
                conn.execute(
                    "insert into usuario_empresa (usuario_id, empresa_id, papel, status) values (%s, %s, 'administrador', 'ativo')",
                    (usuario_id, empresa_id),
                )
                expira_em = db.valor(
                    """
                    insert into conta_demo (empresa_id, usuario_id, numero, senha, expira_em)
                    values (%s, %s, %s, %s, now() + make_interval(secs => %s))
                    returning expira_em
                    """,
                    (empresa_id, usuario_id, numero, senha, settings.conta_demo_horas * 3600), conn,
                )
                # Limite exato: a trava vale até o COMMIT, então cada criação conta as já confirmadas
                # mais a própria. Pegá-la só no fim deixa a fila curta (a contagem e o COMMIT).
                conn.execute("select pg_advisory_xact_lock(hashtext('taylor-contas-demo'))")
                ativas = db.valor("select count(*) from conta_demo where expira_em > now()", conn=conn)
                if ativas > settings.conta_demo_max:  # ErroApi desfaz a transação inteira
                    raise ErroApi(503, "LIMITE_CONTAS_DEMO",
                                  "Todas as contas de demonstração estão em uso. Tente de novo em alguns minutos.")
            break
        except UniqueViolation:
            continue
    else:
        raise ErroApi(503, "CONTA_DEMO_INDISPONIVEL", "Não foi possível criar a conta Demo. Tente de novo.")

    try:
        with _gerando, db.transacao() as conn:
            conn.execute("select popular_empresa_demo(%s)", (empresa_id,))
    except Exception as exc:
        log.exception("Falha ao gerar os dados da conta Demo %s", numero)
        excluir(empresa_id)
        raise ErroApi(503, "CONTA_DEMO_INDISPONIVEL", "Não foi possível criar a conta Demo. Tente de novo.") from exc

    log.info("Conta Demo %04d criada (expira em %s).", numero, expira_em.isoformat(timespec="minutes"))
    return {"usuario_id": usuario_id, "email": email, "senha": senha, "expira_em": expira_em}


def dados_de_acesso(usuario_id: UUID, conn=None) -> dict | None:
    """E-mail e senha para o card "Seus dados de acesso" (None para contas normais)."""
    d = db.um(
        """
        select u.email, cd.senha, cd.expira_em
          from conta_demo cd join usuario u on u.id = cd.usuario_id
         where cd.usuario_id = %s
        """,
        (usuario_id,),
        conn,
    )
    return {"email": d["email"], "password": d["senha"], "expires_at": d["expira_em"]} if d else None


def ativas() -> int:
    return db.valor("select count(*) from conta_demo where expira_em > now()")


def excluir(empresa_id: UUID) -> bool:
    with db.transacao() as conn:
        return db.valor("select excluir_conta_demo(%s)", (empresa_id,), conn)


def limpar_expiradas() -> int:
    """Apaga as contas vencidas, uma por transação.

    `for update skip locked`: vários workers podem limpar ao mesmo tempo sem
    disputar a mesma conta.
    """
    apagadas = 0
    while True:
        with db.transacao() as conn:
            conta = db.um(
                """
                select empresa_id from conta_demo where expira_em <= now()
                 order by expira_em limit 1 for update skip locked
                """,
                conn=conn,
            )
            if conta is None:
                break
            db.valor("select excluir_conta_demo(%s)", (conta["empresa_id"],), conn)
        apagadas += 1
    if apagadas:
        log.info("%s conta(s) Demo expirada(s) apagada(s).", apagadas)
    return apagadas


class Limpeza:
    """Roda limpar_expiradas() ao iniciar e depois a cada 5 minutos, numa thread do worker."""

    def __init__(self) -> None:
        self._parar = threading.Event()
        self._thread = threading.Thread(target=self._loop, name="limpeza-contas-demo", daemon=True)

    def iniciar(self) -> None:
        self._thread.start()

    def parar(self) -> None:
        self._parar.set()
        self._thread.join(timeout=10)

    def _loop(self) -> None:
        while True:
            try:
                limpar_expiradas()
            except Exception:
                log.exception("Falha ao apagar contas Demo expiradas")
            if self._parar.wait(INTERVALO_LIMPEZA_SEGUNDOS):
                return
