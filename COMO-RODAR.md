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
   ```

   Ou copie e cole a linha pronta:

   ```
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

Acesse **http://localhost:8000** e entre com o usuário de teste (em localhost ele já vem preenchido):

| E-mail | Senha |
|---|---|
| `isabela@lojabeta.com.br` | `taylor123` |

Também dá para **criar uma conta nova** na aba "Criar conta". Nesse caso, use um CNPJ válido
(por exemplo, `11.222.333/0001-81`). Ou clique em **Entrar com a conta Demo** (veja abaixo).

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

## Conta Demo (para apresentações)

Na tela de login, **Entrar com a conta Demo** cria na hora uma loja só sua ("Loja Demo 0427", com CNPJ
válido gerado automaticamente) com todos os dados de exemplo: produtos, pedidos de 90 dias, estoque,
notas fiscais, integrações simuladas e notificações. Cada pessoa que clica ganha a própria loja; ninguém vê
o que a outra altera.

- O acesso fica salvo no navegador: reabrir o link (ou escanear o QR code de novo) volta para a mesma loja.
- No **Início** aparece o card **Seus dados de acesso** com um e-mail e uma senha fáceis de digitar. Eles
  servem para entrar no bot do Telegram (**@EstoqueLojas_bot**, comando `/login`) e também na tela de login.
- A loja é **apagada sozinha** depois de `CONTA_DEMO_HORAS` (padrão: 6 horas), e existem no máximo
  `CONTA_DEMO_MAX` contas ao mesmo tempo (padrão: 200). Os dois ficam no `backend\.env` ou nas variáveis
  do Render. Cada conta ocupa cerca de 1 MB no banco.
- Quantas contas estão ativas: http://localhost:8000/api/health (`contas_demo_ativas`).

---

## Bot do Telegram (`bot_estoque`)

O bot é o **@EstoqueLojas_bot** (nome de exibição "Taylor_assistente_bot"). Ele usa **as mesmas tabelas do
Taylor** (schema `taylor`): o que é feito no bot (entrada, baixa, produto novo) aparece no painel, e
vice-versa. O login no bot é o mesmo e-mail e senha do painel (inclusive os da conta Demo). O bot busca as
mensagens no Telegram por *long polling* (não usa webhook).

1. Precisa do **Node.js 20 ou mais novo** (https://nodejs.org).
2. Copie `bot_estoque\.env.example` para `bot_estoque\.env`. Além do `TELEGRAM_TOKEN`, coloque a **mesma**
   `DATABASE_URL` do `backend\.env`, `DB_SCHEMA=taylor` e `DB_POOL_MAX=3`. (As chaves
   `SUPABASE_URL`/`SUPABASE_KEY` não são mais usadas.)
3. Instale e ligue:

   ```powershell
   cd $HOME\Hackathonicos\bot_estoque
   npm install
   npm start
   ```

   Ao ligar, ele mostra `🤖 Bot @EstoqueLojas_bot ligado ao Taylor...`. Se aparecer outro @, o
   `CONFIG.telegram` do `frontend/javascript.js` precisa apontar para esse bot.

> ⚠️ Deixe ligada **só uma cópia** do bot por token. Se ele já roda no Render, não ligue outra no seu
> computador: o Telegram entrega cada mensagem para uma cópia só. No Render, configure as mesmas
> variáveis `DATABASE_URL`, `DB_SCHEMA` e `DB_POOL_MAX`.

Comandos: `/login`, `/estoque`, `/lojas` → `/estoqueloja`, `/novo`, `/entrada`, `/baixa`, `/sair`.
Ao entrar, o chat fica vinculado ao usuário (aparece em **Configurações › Notificações** no painel) e
passa a receber os avisos de **novo pedido** e o **resumo** das 9h, 13h e 18h, conforme as preferências
de notificação da empresa.

**Dados antigos do bot:** a empresa "Loja do Futuro" (tabelas `public`) já foi copiada para o Taylor com
`python migrar_bot.py --aplicar` (dentro de `backend\`). O usuário `seu_email@provedor.com` entra com a
senha `taylor123`. Rodar o script de novo não duplica nada; as tabelas `public` não são alteradas.

---

## Publicar no Render (palestra com o público usando junto)

O arquivo `render.yaml` (na raiz) descreve dois serviços na região Virginia (us-east, perto do Supabase):

| Serviço | Tipo | Plano no `render.yaml` | O quê |
|---|---|---|---|
| `taylor-api` | Web service (Python) | `1c-2g` (1 CPU, 2 GB) | Back-end + telas; health check em `/api/health` |
| `taylor-bot` | Background worker (Node) | `0.5c-512mb` (0,5 CPU, 512 MB) | Bot do Telegram (long polling, não recebe HTTP) |

> ⚠️ **Bot: uma cópia só por token.** Antes de aplicar o Blueprint, **suspenda ou apague** o serviço antigo
> do bot no Render e não deixe `npm start` rodando em nenhum computador. Com duas cópias, o Telegram entrega
> cada mensagem para uma só, e a outra fica com erro 409.

No Render: **New › Blueprint**, escolha o repositório e a branch, e preencha os valores secretos:
`DATABASE_URL` (a mesma do `backend\.env`, **nos dois serviços**), `TELEGRAM_TOKEN` (bot) e, se quiser o
Gemini, `GEMINI_API_KEY`. O resto já vem configurado:

| Variável | Valor | Por quê |
|---|---|---|
| `DEMO_MODE` | `false` | Sem token não há acesso, e o link de "Esqueci minha senha" não aparece na tela |
| `JWT_SECRET` | gerado pelo Render | Obrigatório com `DEMO_MODE=false`; o mesmo para todos os workers |
| `WEB_CONCURRENCY` | `2` | Número de processos (workers) do back-end |
| `DB_POOL_MAX` | `5` | Conexões com o banco **por worker** |
| `CONTA_DEMO_HORAS` / `CONTA_DEMO_MAX` | `6` / `200` | Validade e limite das contas Demo |

O endereço do site (para o QR code) é o que o Render mostra, por exemplo `https://taylor-api.onrender.com`.
Fora de localhost o front chama a API no mesmo endereço (`/api`) e o login não vem preenchido.

**Conexões com o banco.** O Session pooler do Supabase tem um limite (**Pool Size**, em Supabase ›
Database › Settings › Connection pooling; no plano grátis costuma ser 15). A conta é:

```
WEB_CONCURRENCY × DB_POOL_MAX (back-end) + DB_POOL_MAX (bot) ≤ Pool Size
        2       ×      5      +      3                    = 13
```

Se passar do limite, aparece `max clients reached`. Deixe uma folga para quem rodar o sistema no próprio
computador no mesmo banco. O back-end mostra a conta no log ao ligar.

**No dia:**

- Use planos **pagos**: o gratuito "dorme" depois de 15 minutos sem acesso (o primeiro acesso demora cerca
  de 1 minuto) e não existe para background workers. A cobrança é proporcional ao segundo: dá para usar o
  `1c-2g` no dia da palestra e baixar o back-end para `0.5c-512mb` depois (Settings › Instance Type).
- Abra o site alguns minutos antes de mostrar o QR code e confira `/api/health`.
- Confira no log do `taylor-bot` a linha `🤖 Bot @EstoqueLojas_bot ligado ao Taylor...`.
- O Gemini gratuito aceita poucas perguntas por minuto. Com muita gente, o assistente passa a usar as
  palavras-chave (continua respondendo estoque, vendas de hoje, pedidos pendentes e estoque baixo).
- Espaço no banco: cada conta Demo ocupa cerca de 1 MB (o plano grátis do Supabase tem 500 MB).

Teste de carga (150 pessoas ao mesmo tempo, num Postgres local): veja [backend/README.md](backend/README.md#teste-de-carga).

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
| `Todas as contas de demonstração estão em uso` | Chegou ao `CONTA_DEMO_MAX`. Aumente o valor ou espere as contas antigas expirarem. |
| `Defina JWT_SECRET` ao ligar | Com `DEMO_MODE=false` o segredo não é gerado sozinho: defina `JWT_SECRET` (no Render ele é gerado pelo Blueprint). |
| `max clients reached` | Conexões demais no Supabase: reduza `WEB_CONCURRENCY` ou `DB_POOL_MAX` (veja "Publicar no Render"). |

## Quer só ver as telas, sem banco?

Abra o arquivo `frontend/javascript.js`, troque `useApi: true` por `useApi: false` e dê dois cliques em
`frontend/index.html`. O sistema abre com os dados de exemplo (qualquer e-mail e senha entram), mas nada é salvo.

---

Detalhes técnicos (organização do código, decisões e testes): [backend/README.md](backend/README.md).
