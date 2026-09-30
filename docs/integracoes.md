# Integrações

## Quadro-resumo

| Integração | Integração real hoje? | Situação no MVP | Onde aparece no front |
|---|---|---|---|
| Supabase | Sim | **[REAL]** — banco de dados (PostgreSQL), schema `taylor`, conexão direta do back-end e do bot | Todas as telas (via back-end) |
| Gemini | Sim (opcional) | **[REAL]** — identifica a intenção da mensagem quando há `GEMINI_API_KEY`; sem chave, palavras-chave | Painel "Assistente Taylor" |
| Telegram | Sim | **[REAL]** — bot `@EstoqueLojas_bot` (`bot_estoque/`): consultas e atualizações de estoque, aviso de novo pedido e resumo | Botão flutuante, card Telegram, Integrações, Notificações, Ajuda, card da conta Demo |
| Voz | Sim (no navegador) | **[REAL]** — Web Speech API: fala → texto → back-end → resposta falada | Microfone no chat do assistente; protótipo `taylor_voice/` |
| Marketplaces (Mercado Livre, Shopee, Magalu) | Não | **[SIMULADO]** por decisão do MVP; OAuth real **[PLANEJADO]** | Dashboard, Produtos, Pedidos, Estoque, Marketplaces, Integrações |
| Emissão fiscal (NF-e / SEFAZ) | Não | **[SIMULADO]** por decisão do MVP | Notas fiscais, Configurações › Empresa, Notificações, Ajuda |

> Esta página foi escrita antes do back-end. O quadro acima mostra a situação atual; as seções abaixo guardam a
> especificação original, com as correções marcadas. Marketplaces e SEFAZ continuam **simulados**.

Configuração: segredos (chaves e tokens) ficam em variáveis de ambiente, nunca no front-end. Nomes usados:
`DATABASE_URL`, `DB_SCHEMA`, `JWT_SECRET` e `GEMINI_API_KEY` no back-end (`backend/.env.example`);
`TELEGRAM_TOKEN`, `DATABASE_URL` e `DB_SCHEMA` no bot (`bot_estoque/.env.example`).

---

## 1. Supabase

| Item | Descrição |
|---|---|
| Classificação | **[PLANEJADO]** |
| Fonte | Resumo do projeto (tabela "Tecnologias planejadas"); fluxograma (lane "Banco de Dados") |
| Papel | Banco PostgreSQL que armazena os dados da empresa, integrações, produtos, pedidos, estoque, notas, notificações e preferências — ver [modelo-dados.md](modelo-dados.md) |
| Acesso | Somente pelo back-end Python (biblioteca `supabase-py` ou driver PostgreSQL). O front-end continua falando apenas com `/api`. |
| Segurança | Usar a chave de serviço apenas no back-end. Se o front vier a acessar o Supabase diretamente, habilitar **Row Level Security** filtrando por `empresa_id` via `usuario_empresa`. |
| Autenticação | **Pendente de definição**: usar **Supabase Auth** (e-mail/senha) ou autenticação própria no back-end (tabela `usuario.senha_hash` + JWT). |
| Fluxograma | "Armazena dados da integração da empresa" → "Atualiza e centraliza produtos, pedidos e estoque" |

---

## 2. Gemini (Google)

| Item | Descrição |
|---|---|
| Classificação | **[PLANEJADO]** (o chat atual é **[SIMULADO]** com 4 respostas fixas) |
| Fonte | Resumo do projeto ("Assistente com Inteligência Artificial utilizando Gemini"); fluxograma (lane "IA - Gemini": "Processa a mensagem e identifica a intenção") |
| Papel | Interpretar a pergunta em linguagem natural, **identificar a intenção** e redigir a resposta com os dados fornecidos pelo back-end |
| Entrada | Texto do usuário (app, voz transcrita ou Telegram) |
| Saída | Intenção + parâmetros; texto final da resposta |
| Endpoint do Taylor | `POST /api/assistant/messages` ([api-backend.md](api-backend.md#311-assistente-de-ia)) |

Fluxo proposto (fiel ao fluxograma: *IA identifica intenção → back-end consulta/executa → back-end gera resposta*):

1. Back-end envia ao Gemini a mensagem e a lista de intenções suportadas (ex.: `consultar_estoque`, `vendas_hoje`, `pedidos_pendentes`, `consultar_estoque_baixo`), pedindo retorno estruturado (JSON).
2. Back-end executa a consulta correspondente no banco **da empresa do usuário**.
3. Back-end gera a resposta (texto montado pelo back-end ou redigido pelo Gemini a partir dos dados).
4. Intenção desconhecida → resposta padrão: "Ainda estou aprendendo a responder isso…".

Cuidados: não enviar ao Gemini dados de outras empresas; limitar o tamanho dos dados enviados; tratar indisponibilidade (HTTP 502 com resposta padrão).

Pendentes: modelo do Gemini a usar; lista final de intenções; ações de escrita que o assistente pode executar; persistência do histórico de conversa.

---

## 3. Telegram

| Item | Descrição |
|---|---|
| Classificação | **[REAL]** — bot `@EstoqueLojas_bot` (nome de exibição "Taylor_assistente_bot"), link `https://t.me/EstoqueLojas_bot` (`CONFIG.telegram`) |
| Fonte | Resumo do projeto ("Bot no Telegram para consultas relacionadas à operação"); fluxograma (lane "Telegram": "Recebe mensagem do lojista" → "Envia a resposta via Telegram"); front-end (card "Sua operação no Telegram", matriz de notificações, FAQ) |
| Funções | (a) **Consultas**: o lojista pergunta ("vendas de hoje", "estoque baixo") e recebe a resposta com os mesmos dados do painel. (b) **Alertas**: estoque baixo, novos pedidos, divergências, NF-e rejeitadas e resumo diário, conforme a matriz Evento × Canal. |
| Implementação | Programa à parte em Node.js + Telegraf (`bot_estoque/`), que lê e grava direto nas tabelas do schema `taylor` (não passa pelo back-end). |
| Recebimento | **Long polling** (`getUpdates`, `bot.launch()`). O webhook `POST /api/telegram/webhook` previsto abaixo **não é usado**. Só pode haver uma cópia do bot ligada por token. |
| Envio | Bot API `sendMessage` com o `chat_id` salvo em `vinculo_telegram`: aviso de novo pedido (o bot consulta o banco a cada 20 s) e resumo às 9h, 13h e 18h, conforme a matriz Evento × Canal |
| Nome do bot | **Resolvido:** `@EstoqueLojas_bot` (nome de exibição "Taylor_assistente_bot"; o usuário `@taylor_assistente_bot` não existe). A conta vinculada da integração Telegram nos dados de exemplo também passou a ser `@EstoqueLojas_bot`. |
| Vínculo usuário ↔ chat | Comando `/login` no bot, com o e-mail e a senha do painel (bcrypt). O chat fica salvo em `vinculo_telegram` e aparece em Configurações › Notificações; `/sair` desfaz. A conta Demo mostra no painel o e-mail e a senha para isso. |
| Suporte humano | A Ajuda cita "Suporte no Telegram — seg. a sex., das 8h às 20h". Se é o mesmo bot ou outro canal: **Pendente de definição** |

Divergência do fluxograma: na lane "Usuário" consta **"Envia mensagem no WhatsApp"**, mas a seta segue para a lane **Telegram** e todas as demais fontes citam apenas o Telegram. Considerado **Telegram**.

---

## 4. Reconhecimento e interação por voz

| Item | Descrição |
|---|---|
| Classificação | **[PLANEJADO]** — **não existe interface de voz no front-end** |
| Fonte | Resumo do projeto: "o usuário poderá falar uma solicitação, receber a resposta em texto e ouvi-la em áudio" |
| Fluxo esperado | Fala → texto (reconhecimento) → mesmo fluxo do assistente de texto → resposta exibida em texto **e** reproduzida em áudio (síntese de voz) |
| Onde converter | **Pendente de definição**. Opções: (a) no navegador, com Web Speech API (`SpeechRecognition` e `speechSynthesis`) — o back-end só recebe texto (`input_mode: "voice"`); (b) no back-end, recebendo o áudio em `POST /api/assistant/voice` |
| Idioma | Português (Brasil) — coerente com a preferência de idioma padrão |
| Objetivo declarado | Facilitar o uso e ampliar as formas de interação (acessibilidade) |

---

## 5. Marketplaces (Mercado Livre, Shopee, Magalu)

| Item | Descrição |
|---|---|
| Classificação | **[SIMULADO] no MVP** (decisão do resumo do projeto); integração real via OAuth **[PLANEJADO]** (fluxograma) |
| Fonte | Resumo: "as integrações com marketplaces como Mercado Livre, Shopee e Magalu serão simuladas, demonstrando o conceito de centralização e sincronização sem depender das APIs reais" |
| Canais | Mercado Livre (ML), Shopee (S), Magalu (M) |
| Dados trocados | Produtos/anúncios, pedidos e estoque |

### 5.1 Fluxo real (planejado — fluxograma)
1. Lojista clica em "Conectar canal" → back-end **solicita autorização**.
2. Marketplace realiza a **autorização OAuth** com a conta de vendedor.
3. Back-end **recebe o `access_token`** e **salva a integração**.
4. Back-end **consulta produtos, pedidos e estoque** (via API do marketplace).
5. Back-end **disponibiliza os dados** ao sistema e o banco **centraliza** produtos, pedidos e estoque.

### 5.2 Simulação no MVP (proposta de implementação)
Criar no back-end um **adaptador simulador** com a mesma interface que um adaptador real teria, para que a troca futura não afete as regras de negócio:

| Operação do adaptador | Comportamento simulado |
|---|---|
| `conectar(empresa, marketplace)` | Cria `integracao` com `status = conectado`, `simulada = true`, sem tokens |
| `listar_anuncios()` | Gera/retorna anúncios para os produtos da empresa |
| `buscar_pedidos_novos()` | Gera pedidos fictícios (cliente, itens, valor) para o canal |
| `atualizar_estoque(anuncio, qtd)` | Grava `anuncio.estoque_publicado = qtd` |
| `pausar_anuncio(anuncio)` | Grava `anuncio.status = pausado` |

- Para demonstrar **divergência** (RN015), o simulador pode alterar o `estoque_publicado` de um anúncio sem mudar o estoque central. A forma de gerar esses cenários: Pendente de definição.
- O front já exibe "● Conectado" e a última sincronização; a animação "Sincronizar agora" hoje é apenas local (1,4 s).

---

## 6. Emissão fiscal simulada (NF-e)

| Item | Descrição |
|---|---|
| Classificação | **[SIMULADO]** — sem comunicação com a SEFAZ nem certificado real |
| Fonte | Resumo: "Simulação do fluxo de emissão de NF-e e documentos fiscais"; front-end (tela Notas fiscais, FAQ, notificações) |
| Fluxo exibido | 01 Pedido recebido (dados importados) → 02 Validação fiscal (NCM e impostos conferidos) → 03 NF-e autorizada (XML enviado ao canal) |
| Status | Aguardando emissão (rascunho) → Processando → Autorizada \| Rejeitada; Rejeitada → (correção) → Processando |
| Validações exibidas | Destinatário (CPF/CNPJ e endereço), NCM, CFOP por UF de destino, origem fiscal, certificado A1 válido; "23 regras" (lista completa Pendente de definição) |
| Dados de entrada | Pedido, itens, cliente, produto (NCM, origem), empresa (razão social, CNPJ, IE, regime, endereço), certificado |

Proposta de simulador:

| Etapa | Comportamento simulado |
|---|---|
| Validação | Executa as validações conhecidas sobre os dados do banco; falha → 422 com a lista de pendências (conta como "rejeição evitada") |
| Envio à "SEFAZ" | Muda para `processando`; após alguns segundos, `autorizada` (gera número sequencial `NF-e 00NNNN` e um XML fictício) ou `rejeitada` com motivo (ex.: "SEFAZ: CFOP incompatível com a UF de destino.") |
| Conciliação | Grava `xml_url` na nota e marca o XML como "enviado ao canal" (simulado) |
| Notificação | Rejeição gera notificação do tipo Fiscal (RN031) |

Critério para simular aprovação ou rejeição: **Pendente de definição**.
