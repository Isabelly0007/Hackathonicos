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

Rodam num Postgres **descartável** (nunca no Supabase da equipe) e recriam o schema `taylor_teste`:

```powershell
pip install -r requirements-dev.txt
$env:TEST_DATABASE_URL = "postgresql://postgres@127.0.0.1:5432/postgres"
pytest -q
```

## Organização

```
backend/
  db/schema.sql, db/seed.sql  # 17 tabelas da documentação + movimento_estoque; seed com ~900 pedidos em 90 dias
  setup_db.py                 # cria o schema (nunca toca no public)
  app/
    main.py                   # FastAPI, CORS, rotas em /api, front estático (só os arquivos do front)
    auth.py                   # JWT próprio + bcrypt + empresa ativa (X-Empresa-Id para multi-CNPJ)
    routers/                  # uma rota por tela
    services/                 # regras: estoque, pedidos, sincronização, fiscal, notificações, assistente
    adapters/                 # marketplace_simulado, sefaz_simulada, gemini
  tests/                      # testes de ponta a ponta da API
```

## Integração com o front

`javascript.js` usa `CONFIG.useApi = true`. Aberto em `http://localhost:8000` chama `/api`; aberto como
arquivo ou por outro servidor, chama `http://localhost:8000/api`. Se o back-end cair, as leituras voltam
aos dados de exemplo (comportamento original do front).

| Tela | O que passou a funcionar |
|---|---|
| Login | Entrar e criar conta (empresa + CNPJ validado); "Lembrar de mim" mantém a sessão |
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

## Ainda não implementado

- Envio externo de alertas (Telegram/e-mail/push) e webhook do Telegram no FastAPI.
- Agendador (conferência periódica e resumo diário das 08h).
- Esqueci minha senha, convites de equipe, segurança, plano, busca global, importação/exportação de XML.

## bot_estoque

Continua usando o schema `public` e não é afetado. Para ele ler os dados do Taylor, as consultas devem
passar a usar o schema `taylor` (ex.: `supabase.schema('taylor').from('produto')`, com o schema exposto
na API do Supabase e a service_role key) e os nomes de coluna deste modelo (`estoque_central`,
`anuncio.estoque_publicado`, `pedido.integracao_id`…). Ele também compara a senha em texto puro — deve
passar a usar bcrypt, como o back-end.
