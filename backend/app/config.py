import re
from pathlib import Path
from urllib.parse import urlparse

from pydantic_settings import BaseSettings, SettingsConfigDict

PASTA_BACKEND = Path(__file__).resolve().parent.parent
RAIZ_REPO = PASTA_BACKEND.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=PASTA_BACKEND / ".env", env_file_encoding="utf-8", extra="ignore")

    # Supabase > Connect > Session pooler (porta 5432). A chave anon do bot não permite criar tabelas.
    database_url: str = ""
    db_schema: str = "taylor"  # todas as tabelas do Taylor ficam aqui; o public é do bot_estoque

    # Autenticação própria (JWT HS256 + bcrypt). setup_db.py gera o segredo se faltar.
    jwt_secret: str = ""
    jwt_expira_minutos: int = 720
    jwt_expira_lembrar_dias: int = 30

    # HTTP
    cors_origins: str = "*"  # lista separada por vírgula
    servir_front: bool = True  # serve index.html/javascript.js em http://localhost:8000/

    # Modo demonstração: sem token, as rotas usam a empresa deste CNPJ (usado pelo protótipo de voz).
    demo_mode: bool = True
    demo_cnpj: str = "12345678000195"

    # Esqueci minha senha: o link aponta para APP_URL e vale REDEFINICAO_MINUTOS.
    # Sem SMTP_HOST, o link vai para o log do servidor (e, com DEMO_MODE, aparece na tela de login).
    app_url: str = "http://localhost:8000"
    redefinicao_minutos: int = 30
    smtp_host: str = ""
    smtp_port: int = 587  # 587 = STARTTLS; 465 = SSL direto
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""  # ex.: "Taylor <nao-responda@taylor.com.br>"; vazio = SMTP_USER

    # Gemini (opcional: sem chave, o assistente usa palavras-chave)
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"

    # Simuladores
    sefaz_taxa_rejeicao: float = 0.1
    sefaz_segundos_processamento: float = 2.0
    simulador_taxa_divergencia: float = 0.3
    simulador_max_pedidos_por_canal: int = 3

    def validar(self) -> None:
        """Falha cedo, com mensagem clara, se o .env estiver incompleto."""
        if not self.database_url:
            raise RuntimeError(
                "Configure DATABASE_URL em backend/.env (Supabase > Connect > Session pooler, porta 5432)."
            )
        if urlparse(self.database_url).port == 6543:
            raise RuntimeError(
                "Use o Session pooler (porta 5432) ou a conexão direta; o Transaction pooler (6543) "
                "não mantém o search_path do schema do Taylor."
            )
        if not re.fullmatch(r"[a-z_][a-z0-9_]{0,40}", self.db_schema) or self.db_schema == "public":
            raise RuntimeError("DB_SCHEMA inválido (use letras minúsculas, números e _; nunca public).")


settings = Settings()


def garantir_jwt_secret() -> None:
    """Sem JWT_SECRET no .env, gera um e salva no backend/.env (o login precisa dele)."""
    if settings.jwt_secret:
        return
    import secrets

    env = PASTA_BACKEND / ".env"
    texto = env.read_text(encoding="utf-8") if env.exists() else ""
    segredo = secrets.token_urlsafe(48)
    linhas = [l for l in texto.splitlines() if not l.strip().startswith("JWT_SECRET=")]
    linhas.append(f"JWT_SECRET={segredo}")
    env.write_text("\n".join(linhas) + "\n", encoding="utf-8")
    settings.jwt_secret = segredo
    print("JWT_SECRET gerado e salvo em backend/.env.")
