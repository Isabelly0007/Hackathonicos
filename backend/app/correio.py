"""Envio de e-mail por SMTP (usado pelo "Esqueci minha senha").

Sem SMTP_HOST no .env, `configurado()` é falso e quem chama decide o que fazer
(o link de redefinição vai para o log do servidor).
"""

import logging
import smtplib
import ssl
from email.message import EmailMessage
from html import escape

from .config import settings

log = logging.getLogger("taylor.correio")


def configurado() -> bool:
    return bool(settings.smtp_host)


def enviar(para: str, assunto: str, texto: str, html: str | None = None) -> None:
    msg = EmailMessage()
    msg["From"] = settings.smtp_from or settings.smtp_user
    msg["To"] = para
    msg["Subject"] = assunto
    msg.set_content(texto)
    if html:
        msg.add_alternative(html, subtype="html")

    contexto = ssl.create_default_context()
    try:
        if settings.smtp_port == 465:
            servidor = smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, context=contexto, timeout=20)
        else:
            servidor = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20)
            servidor.starttls(context=contexto)
        with servidor:
            if settings.smtp_user:
                servidor.login(settings.smtp_user, settings.smtp_password)
            servidor.send_message(msg)
    except (OSError, smtplib.SMTPException) as exc:  # roda em segundo plano: só registra
        log.error("Falha ao enviar e-mail para %s: %s", para, exc)


def enviar_redefinicao(para: str, nome: str, link: str) -> None:
    minutos = settings.redefinicao_minutos
    primeiro = nome.split()[0] if nome else ""
    texto = (
        f"Olá, {primeiro}!\n\n"
        "Recebemos um pedido para criar uma nova senha na sua conta Taylor.\n"
        f"Abra o link abaixo em até {minutos} minutos:\n\n{link}\n\n"
        "Se não foi você, ignore este e-mail: sua senha atual continua valendo."
    )
    html = f"""<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#0f1f33">
  <h2 style="color:#346db3">Criar nova senha</h2>
  <p>Olá, {escape(primeiro)}!</p>
  <p>Recebemos um pedido para criar uma nova senha na sua conta <b>Taylor</b>.</p>
  <p><a href="{escape(link)}" style="display:inline-block;background:#499cff;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold">Criar nova senha</a></p>
  <p style="color:#56698a;font-size:13px">O link vale por {minutos} minutos e só pode ser usado uma vez.
  Se não foi você, ignore este e-mail: sua senha atual continua valendo.</p>
</div>"""
    enviar(para, "Taylor — criar nova senha", texto, html)
