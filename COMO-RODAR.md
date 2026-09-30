# Como rodar o Taylor no seu computador

Guia passo a passo para ligar o sistema e abrir no navegador em **http://localhost:8000**.
Os comandos são para **Windows (PowerShell)**.

> **Resumo:** o Taylor tem duas partes. O **back-end** (Python) é o "motor", que guarda e calcula os
> dados no banco Supabase. O **front-end** (as telas) é servido pelo próprio back-end. Ou seja: você liga
> um programa só e abre o endereço no navegador.

---

## 1. Instale o que precisa (só na primeira vez)

| Programa | Para quê | Onde baixar |
|---|---|---|
| **Python 3.12 ou mais novo** | Roda o back-end | https://www.python.org/downloads/ — na instalação, **marque "Add python.exe to PATH"** |
| **Git** | Baixa o projeto | https://git-scm.com/download/win |

Para conferir se deu certo, abra o **PowerShell** e digite:

```powershell
python --version
git --version
```

As duas linhas devem mostrar um número de versão.

---

## 2. Baixe o projeto (só na primeira vez)

```powershell
cd $HOME
git clone https://github.com/isaadsl/Hackathonicos.git
```

Isso cria a pasta `C:\Users\<seu-usuário>\Hackathonicos`. Se você já tem a pasta, atualize com `git pull`.

---

## 3. Prepare o back-end (só na primeira vez)

Entre na pasta do back-end, crie um "ambiente virtual" (uma caixinha só para as bibliotecas do
projeto) e instale as bibliotecas:

```powershell
cd $HOME\Hackathonicos\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Quando o ambiente está ativo, aparece **`(.venv)`** no começo da linha do PowerShell.

> Se aparecer um erro dizendo que a execução de scripts está desabilitada, rode uma vez
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, responda `S` e tente de novo.

---

## 4. Configure a conexão com o banco (só na primeira vez)

1. Copie o arquivo de exemplo:

   ```powershell
   copy .env.example .env
   ```

2. Abra o arquivo **`backend\.env`** no Bloco de Notas ou no VS Code.
3. Na linha `DATABASE_URL=`, coloque o endereço do banco, trocando `<SENHA>` pela senha do banco:

   ```
   DATABASE_URL=postgresql://postgres.khkeojieopvuwbiizkom:<SENHA>@aws-0-us-east-1.pooler.supabase.com:5432/postgres

  Copie e cole:
  
   DATABASE_URL=postgresql://postgres.khkeojieopvuwbiizkom:hackathonicos2026@aws-0-us-east-1.pooler.supabase.com:5432/postgres
   ```

   Peça a senha para quem administra o Supabase da equipe. Ela também aparece no painel do Supabase,
   em **Connect › Session pooler**.
4. Salve o arquivo.

> ⚠️ O arquivo `.env` guarda a senha. **Nunca** envie esse arquivo para o GitHub: ele já está na lista
> de arquivos ignorados (`.gitignore`).

---

## 5. Crie as tabelas e os dados de exemplo (só uma vez por banco)

```powershell
python setup_db.py --seed
```

Se aparecer `Pronto: schema taylor com 24 produtos e ... pedidos.`, deu certo.

- As tabelas do Taylor ficam separadas (no schema `taylor`). As tabelas do bot do Telegram **não são
  mexidas**.
- Se aparecer `O schema 'taylor' já existe`, alguém da equipe já fez este passo no mesmo banco. **Pule
  para o passo 6.**

---

## 6. Ligue o sistema

```powershell
uvicorn app.main:app --reload --port 8000
```

Deixe essa janela do PowerShell **aberta**: enquanto ela estiver aberta, o sistema está ligado.
Quando aparecer `Application startup complete`, está pronto.

---

## 7. Abra no navegador

Acesse **http://localhost:8000** e entre com o usuário de teste:

| E-mail | Senha |
|---|---|
| `isabela@lojabeta.com.br` | `taylor123` |

Também dá para **criar uma conta nova** na aba "Criar conta". Nesse caso, use um CNPJ válido
(por exemplo, `11.222.333/0001-81`).

Outros endereços úteis:

| Endereço | O que é |
|---|---|
| http://localhost:8000 | O sistema Taylor |
| http://localhost:8000/taylor_voice/ | Protótipo do assistente por voz (use o Chrome ou o Edge) |
| http://localhost:8000/docs | Lista de todas as rotas da API, para testar pelo navegador |

---

## 8. Para desligar

Na janela do PowerShell onde o sistema está rodando, aperte **Ctrl + C**.

## Nas próximas vezes

Os passos 1 a 5 não precisam ser repetidos. Basta:

```powershell
cd $HOME\Hackathonicos\backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

E abrir **http://localhost:8000**.

---

## Esqueci minha senha

Na tela de login, **Esqueci minha senha** pede o e-mail e gera um link para criar uma nova senha
(vale 30 minutos e só pode ser usado uma vez). Ao trocar a senha, as sessões abertas daquele usuário
são encerradas.

- **Sem e-mail configurado** (padrão): o link aparece no PowerShell onde o sistema está ligado e, com
  `DEMO_MODE=true`, na própria tela de login ("Abrir o link de redefinição").
- **Para enviar por e-mail de verdade**, preencha no `backend\.env` (exemplo com Gmail, usando uma
  "senha de app" da conta Google) e reinicie o sistema:

  ```
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_USER=sua.conta@gmail.com
  SMTP_PASSWORD=<senha de app>
  SMTP_FROM=Taylor <sua.conta@gmail.com>
  APP_URL=http://localhost:8000
  ```

> Quando o sistema sair do ambiente local, use `DEMO_MODE=false`: assim o link nunca aparece na tela, só
> no e-mail.

---

## Bot do Telegram (`bot_estoque`)

O bot usa **as mesmas tabelas do Taylor** (schema `taylor`): o que é feito no bot (entrada, baixa,
produto novo) aparece no painel, e vice-versa. O login no bot é o mesmo e-mail e senha do painel.

1. Precisa do **Node.js 20 ou mais novo** (https://nodejs.org).
2. No arquivo `bot_estoque\.env`, além do `TELEGRAM_TOKEN`, coloque a **mesma** `DATABASE_URL` do
   `backend\.env` e `DB_SCHEMA=taylor`. (As chaves `SUPABASE_URL`/`SUPABASE_KEY` não são mais usadas.)
3. Instale e ligue:

   ```powershell
   cd $HOME\Hackathonicos\bot_estoque
   npm install
   npm start
   ```

> ⚠️ Deixe ligada **só uma cópia** do bot por token. Se ele já roda no Render, não ligue outra no seu
> computador: o Telegram entrega cada mensagem para uma cópia só. No Render, configure as mesmas
> variáveis `DATABASE_URL` e `DB_SCHEMA`.

Comandos: `/login`, `/estoque`, `/lojas` → `/estoqueloja`, `/novo`, `/entrada`, `/baixa`, `/sair`.
Ao entrar, o chat fica vinculado ao usuário (aparece em **Configurações › Notificações** no painel) e
passa a receber os avisos de **novo pedido** e o **resumo** das 9h, 13h e 18h, conforme as preferências
de notificação da empresa.

**Dados antigos do bot:** a empresa "Loja do Futuro" (tabelas `public`) já foi copiada para o Taylor com
`python migrar_bot.py --aplicar` (dentro de `backend\`). O usuário `seu_email@provedor.com` entra com a
senha `taylor123`. Rodar o script de novo não duplica nada; as tabelas `public` não são alteradas.

---

## Deu problema?

| O que aparece | O que fazer |
|---|---|
| `python não é reconhecido` | Reinstale o Python marcando **"Add python.exe to PATH"**, ou use `py` no lugar de `python`. |
| `Não foi possível alcançar o banco (porta 5432)` | A sua rede bloqueia a porta do banco, o que é comum em Wi-Fi de eventos e de empresas. Use outra rede, por exemplo o roteador do celular. |
| `Configure DATABASE_URL em backend/.env` | O arquivo `.env` não existe ou está sem o endereço do banco. Refaça o passo 4. |
| `A senha do banco na DATABASE_URL (backend/.env) está errada` | Confira a senha com quem administra o Supabase. |
| `O usuário na DATABASE_URL está errado` | O começo do endereço deve ser exatamente `postgresql://postgres.khkeojieopvuwbiizkom:` — copie a linha do passo 4. |
| `O schema 'taylor' não existe no banco` | Falta o passo 5: rode `python setup_db.py --seed`. |
| `E-mail ou senha incorretos` no login | Use `isabela@lojabeta.com.br` / `taylor123`. Se o passo 5 não foi feito, esse usuário ainda não existe. |
| `Não foi possível falar com o servidor` | O sistema está desligado. Refaça o passo 6 e deixe a janela aberta. |
| `address already in use` / porta 8000 ocupada | Já existe um Taylor ligado em outra janela. Feche essa janela ou aperte Ctrl + C nela. |
| A tela parece antiga depois de atualizar o código | Aperte **Ctrl + F5** no navegador. |

## Quer só ver as telas, sem banco?

Abra o arquivo `javascript.js`, troque `useApi: true` por `useApi: false` e dê dois cliques em
`index.html`. O sistema abre com os dados de exemplo (qualquer e-mail e senha entram), mas nada é salvo.

---

Detalhes técnicos (organização do código, decisões e testes): [backend/README.md](backend/README.md).
