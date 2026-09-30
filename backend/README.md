# Taylor — back-end (FastAPI + Supabase)

Implementa os contratos de [`docs/api-backend.md`](../docs/api-backend.md) sobre o modelo de
[`docs/modelo-dados.md`](../docs/modelo-dados.md) e já está ligado ao front (`index.html` + `javascript.js`).
Marketplaces e SEFAZ são **simulados** (RN019, RN024).

## Onde ficam os dados

O banco é o **mesmo projeto Supabase do bot_estoque**, mas todas as tabelas do Taylor ficam no schema
**`taylor`** (`DB_SCHEMA`). O schema `public`, usado pelo bot, nunca é lido nem alterado: cada conexão do
back-end usa `search_path = taylor` e o `setup_db.py` só apaga um schema criado por ele mesmo.

A chave anon do `bot_estoque/.env` não permite criar tabelas; o back-end conecta direto no Postgres pela
`DATABASE_URL` (Supabase › Connect › **Session pooler**, porta 5432).

> A rede precisa liberar a porta de saída **5432**. Algumas redes (Wi-Fi de eventos, empresas) bloqueiam —
> nesse caso use outra rede (ex.: roteador do celular) ou rode com um Postgres local.

## Subir

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env        # preencha DATABASE_URL (a senha do banco)
python setup_db.py --seed     # cria o schema taylor + dados de demonstração e gera o JWT_SECRET
uvicorn app.main:app --reload --port 8000
```

| Endereço | O quê |
|---|---|
| http://localhost:8000 | Front-end completo, servido pelo back-end |
| http://localhost:8000/docs | Swagger com todas as rotas |
| http://localhost:8000/taylor_voice/ | Protótipo do assistente por voz |

**Login de teste:** `isabela@lojabeta.com.br` / `taylor123` (Loja Beta, CNPJ 12.345.678/0001-95).

Outras opções do `setup_db.py`:

- `--reset --seed` recria o schema do Taylor do zero (apaga só ele);
- `--gerar-sql taylor.sql` gera um arquivo para colar no **SQL Editor** do Supabase (funciona pelo navegador).

## Testes

Rodam num Postgres **descartável** (nunca no Supabase da equipe) e recriam o schema `taylor_teste`.
Com Docker, um Postgres de testes sobe com um comando:

```powershell
docker run -d --name taylor-pg -e POSTGRES_PASSWORD=teste -p 55432:5432 postgres:17
pip install -r requirements-dev.txt
$env:TEST_DATABASE_URL = "postgresql://postgres:teste@127.0.0.1:55432/postgres"
python -m pytest -q
```

`tests/test_api.py` cobre as telas com a Loja Beta; `tests/test_demo.py` cobre a conta Demo (criação,
isolamento entre contas, limite, expiração e a ordem das exclusões).

## Organização

```
backend/
  db/schema.sql, db/seed.sql  # 17 tabelas da documentação + movimento_estoque; seed = Loja Beta + popular_empresa_demo
  db/migracoes.sql            # alterações idempotentes, rodadas a cada início (conta Demo, redefinição de senha...)
  setup_db.py                 # cria o schema (nunca toca no public)
  teste_carga.py              # N pessoas ao mesmo tempo criando conta Demo e navegando
  app/
    main.py                   # FastAPI, CORS, rotas em /api, front estático (só os arquivos do front)
    auth.py                   # JWT próprio + bcrypt + empresa ativa (X-Empresa-Id para multi-CNPJ)
    routers/                  # uma rota por tela
    services/                 # regras: estoque, pedidos, sincronização, fiscal, notificações, assistente, contas_demo
    adapters/                 # marketplace_simulado, sefaz_simulada, gemini
  tests/                      # testes de ponta a ponta da API
```

## Integração com o front

`javascript.js` usa `CONFIG.useApi = true`. Publicado (fora de localhost) ou aberto em `http://localhost:8000`,
chama `/api` no mesmo endereço; aberto como arquivo ou por outro servidor local, chama
`http://localhost:8000/api`. Se o back-end cair, as leituras voltam aos dados de exemplo (comportamento
original do front). O protótipo `taylor_voice/` segue a mesma regra e envia o token salvo pelo Taylor.

| Tela | O que passou a funcionar |
|---|---|
| Login | Entrar e criar conta (empresa + CNPJ validado); "Lembrar de mim" mantém a sessão; "Esqueci minha senha"; **Entrar com a conta Demo** |
| Início | Indicadores, gráficos, alertas e canais reais; "Sincronizar agora" importa pedidos e sincroniza estoque |
| Produtos | Contadores e abas filtram no servidor; novo produto; ••• edita/exclui |
| Pedidos | Indicadores do dia; abas; sincronizar; exportar CSV; ••• detalha, avança status ou cancela (devolve estoque) |
| Estoque | Indicadores; sincronizar; revisar divergências escolhendo o valor que prevalece |
| Notas fiscais | Saúde fiscal real; emitir uma nota ou em lote; ••• mostra pendências/motivo e reenvia |
| Marketplaces / Integrações | Conectar canal, sincronizar um canal, reconectar, desconectar |
| Relatórios | 7 dias, 30 dias, 3 meses e período personalizado |
| Notificações | Lista, filtros, marcar como lida (uma e todas), contador; "Onde receber alertas" grava |
| Configurações | Empresa, certificado, preferências e matriz de notificações gravam; equipe lida do banco |
| Assistente | Texto, ações rápidas e **voz** (microfone no chat; resposta falada) |

Botões sem regra definida na documentação (Filtros, Importar/Exportar XML, Convidar usuário, Plano…)
mostram "prevista para depois do MVP".

## Decisões tomadas para as pendências da documentação

| Pendência | Decisão |
|---|---|
| P1 Autenticação | **JWT próprio** (HS256) + senha com bcrypt na tabela `usuario`. |
| P2 Front sem token | O front agora envia o token. `DEMO_MODE=true` mantém rotas sem token na empresa `DEMO_CNPJ` (usado pelo protótipo de voz). |
| P3 CNPJ | Dígitos verificadores validados no cadastro e em Configurações. |
| P4 Lembrar de mim | Token de 30 dias salvo no navegador; sem a opção, 12 h e só na aba. |
| P8 Estoque baixo | `estoque_central <= estoque_minimo` (função SQL `status_produto`). |
| P9 Prioridade de status | Sem estoque > Divergência > Estoque baixo > Sincronizado. |
| P10 Alerta crítico | Zerado ou até 25% do mínimo; no máximo 4 alertas. |
| P11 Novo produto | Publicado automaticamente em todos os canais conectados. |
| P13 Transições de pedido | aguardando → em separação → em transporte → entregue; cancelar só antes do envio (estorna estoque). |
| P14 Exportar pedidos | CSV gerado no navegador com o filtro atual. |
| P15 Reativação | Anúncio pausado por falta de estoque volta a `ativo` na reposição. |
| P16 Divergências | Após cada sincronização, o simulador pode "ler" do canal um valor diferente (`SIMULADOR_TAXA_DIVERGENCIA`). |
| P18 Vendas por canal | "Hoje" acumulado ao longo do dia; 7 e 30 dias por intervalo. |
| P19 Pedidos por status | Últimos 30 dias. |
| P21 Métricas de marketplace | Pedidos e vendas de hoje. |
| P22 Relatórios | Top 4 produtos por receita. |
| P25–P27 Fiscal | Valida empresa, certificado, destinatário (CPF/CNPJ, endereço, UF), NCM e origem de cada produto. Falhou → 422 e conta "rejeição evitada". SEFAZ rejeita por sorteio (`SEFAZ_TAXA_REJEICAO`). |
| P33 Desconectar | Integração fica `desconectado`; pedidos e anúncios importados são mantidos. |
| P35 Notificações | Leitura por empresa. |
| P41 Voz | No navegador (Web Speech API): o back-end recebe texto com `input_mode: "voice"`. |

Pedidos cancelados não entram em vendas, pedidos nem ticket médio.

## Conta Demo

`POST /api/auth/demo` (botão **Entrar com a conta Demo**) cria uma loja isolada por visitante, pensada para
apresentações em que o público usa o sistema ao mesmo tempo:

- usuário "Demo" com e-mail `demoNNNN@taylor.demo` e uma senha fácil de digitar (palavra + 4 dígitos),
  empresa "Loja Demo NNNN" com CNPJ válido gerado (`cnpj.gerar_cnpj`);
- os dados de exemplo vêm da função SQL `popular_empresa_demo(empresa_id)` (`db/migracoes.sql`), a mesma
  que o `seed.sql` usa para a Loja Beta: ~900 pedidos em 90 dias, notas, divergências, notificações;
- isolamento: é uma empresa como outra qualquer, e toda rota filtra por `empresa_id` (RN003);
- a resposta é a mesma do login, mais `demo: {email, password, expires_at}`, que o front mostra no card
  **Seus dados de acesso** (para o `/login` do bot do Telegram). O token vence junto com a conta e fica no
  `localStorage`: reabrir o link volta para a mesma loja;
- `CONTA_DEMO_HORAS` (padrão 6): depois disso a conta é apagada por `excluir_conta_demo(empresa_id)`, numa
  thread de cada worker a cada 5 minutos (`for update skip locked`: os workers não disputam a mesma conta).
  A ordem das exclusões respeita as FKs sem cascata (`item_pedido → produto`, `pedido → integracao`,
  `pedido → cliente`). A função só apaga empresas que estão em `conta_demo`;
- `CONTA_DEMO_MAX` (padrão 200): limite exato de contas ativas (503 `LIMITE_CONTAS_DEMO`); `0` desliga;
- a senha fica em texto puro em `conta_demo.senha` de propósito (conta descartável, mostrada no painel). O
  login usa o `senha_hash` bcrypt, como qualquer conta. "Esqueci minha senha" ignora contas Demo.
- `GET /api/health` mostra `contas_demo_ativas`.

## Produção: workers e conexões

- `DEMO_MODE=false`: sem token não há acesso, e o link de "Esqueci minha senha" não aparece na tela.
  Com `DEMO_MODE=false` o `JWT_SECRET` é obrigatório (variável de ambiente): com vários workers, um segredo
  gerado por worker invalidaria os tokens entre eles.
- `WEB_CONCURRENCY` = número de workers do uvicorn; `DB_POOL_MAX` = conexões por worker. No Session pooler
  do Supabase cada conexão ocupa uma vaga do **Pool Size**:
  `WEB_CONCURRENCY × DB_POOL_MAX + DB_POOL_MAX do bot ≤ Pool Size` (ex.: 2 × 5 + 3 = 13 para 15). O
  back-end mostra essa conta no log ao ligar.
- Cada worker usa até 100 threads para as rotas (o padrão do FastAPI é 40) e gera no máximo 2 contas Demo
  ao mesmo tempo, para as criações não tomarem as conexões de quem já está navegando.
- Com vários workers, as migrações rodam uma de cada vez (`pg_advisory_xact_lock`). Uma sincronização
  "em andamento" há mais de 2 minutos é considerada presa (o servidor reiniciou no meio dela): vira erro
  ao iniciar o back-end ou quando a empresa pede uma nova sincronização. As recentes não são tocadas,
  porque podem estar rodando em outro worker.
- Deploy no Render: `render.yaml` na raiz (passo a passo em [COMO-RODAR.md](../COMO-RODAR.md)).

## Teste de carga

`teste_carga.py` simula N pessoas ao mesmo tempo: cada uma cria a conta Demo e abre Dashboard, Produtos,
Pedidos, Estoque, Notas e o Assistente (texto e voz), com 0,5 a 2 s entre as telas. Só aceita localhost.

```powershell
docker run -d --name taylor-carga -e POSTGRES_PASSWORD=carga -p 55432:5432 postgres:17
$env:DATABASE_URL = "postgresql://postgres:carga@127.0.0.1:55432/postgres"
$env:DB_SCHEMA = "taylor_carga"; $env:JWT_SECRET = "qualquer-segredo-local-com-32-caracteres-ou-mais"
python setup_db.py --reset --seed
$env:DEMO_MODE = "false"; $env:WEB_CONCURRENCY = "2"; $env:DB_POOL_MAX = "5"; $env:CONTA_DEMO_MAX = "1000"; $env:GEMINI_API_KEY = ""
uvicorn app.main:app --port 8010 --timeout-keep-alive 75     # em outra janela, com as mesmas variáveis
python teste_carga.py --url http://127.0.0.1:8010 --usuarios 150 --rampa 30 --banco $env:DATABASE_URL --schema taylor_carga
```

Resultado em 30/09/2026 (Postgres 17 local no Docker, 2 workers × 5 conexões, sem Gemini, 3.000 requisições):

| Cenário | Erros | p95 criar conta | p95 dashboard | p95 geral |
|---|---|---|---|---|
| 150 pessoas chegando ao longo de 30 s | 0 | 284 ms | 57 ms | 127 ms |
| 150 pessoas no mesmo instante (pior caso) | 0 | 8,5 s | 6,9 s | 5,9 s |

Cada conta Demo ocupa ~0,8 MB no banco. Apagar uma conta leva ~130 ms (300 contas em 40 s). No pior caso, o
custo é gerar 150 lojas de ~900 pedidos de uma vez; numa palestra as pessoas escaneiam o QR code ao longo de
alguns segundos, que é o primeiro cenário. No Supabase (rede e CPU compartilhada), espere números maiores.

## Ainda não implementado

- Envio de alertas por e-mail e push. No Telegram, o **bot** envia os avisos de novo pedido e o resumo das
  9h, 13h e 18h; o back-end não fala com o Telegram (não há webhook).
- Agendador no back-end (conferência periódica com os marketplaces).
- Convites de equipe, segurança, plano, importação/exportação de XML.

## bot_estoque

Bot do Telegram **@EstoqueLojas_bot** (Node.js + Telegraf). Busca as mensagens por **long polling**
(`bot.launch()`, sem webhook), então só pode haver uma cópia ligada por token. O servidor HTTP da porta
`PORT` só responde "Bot Online!" para o Render.

- Usa as **mesmas tabelas** do Taylor: conecta direto no Postgres (`pg`) com a mesma `DATABASE_URL`,
  `search_path = DB_SCHEMA` (padrão `taylor`; nunca o `public`). Pool de `DB_POOL_MAX` conexões (padrão 3).
- Login com o e-mail e a senha do painel (bcrypt, `usuario.senha_hash`), inclusive os da conta Demo. O chat
  fica vinculado em `vinculo_telegram` (aparece em Configurações › Notificações). Se a conta for apagada
  (conta Demo expirada), a sessão do bot é descartada e ele pede `/login` de novo.
- Entrada, baixa e produto novo seguem as regras de `services/estoque.py` (movimento de estoque,
  sincronização dos anúncios, notificações).
- Envia os avisos de novo pedido (consulta o banco a cada 20 s) e o resumo das 9h, 13h e 18h, conforme as
  preferências de notificação da empresa.
- `migrar_bot.py` copiou os dados antigos do bot (tabelas `public`) para o schema `taylor`.
