# Mapeamento front-end → back-end

Guia direto para a equipe de back-end: para cada tela, **funcionalidade → dados → ação do usuário → endpoint → resposta → entidade**.

Legenda da coluna **Hoje**: **API** = o front já chama o endpoint (compatibilidade obrigatória — ver [api-backend.md §2](api-backend.md#2-contratos-já-consumidos-pelo-front-end-compatibilidade-obrigatória)); **Fixo** = dado fixo no `javascript.js`; **Local** = comportamento só no navegador; **Sem ação** = elemento visual sem comportamento.

Navegação: a sidebar tem Início, Pedidos, Produtos, Estoque, Notas fiscais, Marketplaces, Integrações, Relatórios; separador; Assistente IA; rodapé com Notificações (contador), Configurações, Ajuda e o bloco da empresa (Sair). A barra superior tem menu (mobile), busca, sino, botão de tema e usuário. A troca de tela é local (sem URL própria).

---

## 1. Login / Criar conta

| Funcionalidade | Dados necessários | Ação do usuário | Endpoint | Resposta esperada | Entidade | Hoje |
|---|---|---|---|---|---|---|
| Entrar | e-mail, senha, lembrar de mim | "Entrar na plataforma" | `POST /api/auth/login` | token, usuário, empresa | usuario, usuario_empresa, empresa | Local (aceita qualquer valor preenchido) |
| Criar conta | nome, empresa, e-mail, senha, CNPJ | "Criar minha operação" | `POST /api/auth/register` | token, usuário, empresa | usuario, empresa, usuario_empresa, preferencia_empresa | Local |
| Esqueci minha senha | e-mail (Pendente de definição) | clique no link | `POST /api/auth/forgot-password` | 202 | usuario | Sem ação |
| Alternar Entrar/Criar conta | — | abas | — | — | — | Local |

## 2. Estrutura comum (sidebar, barra superior, painel do assistente)

| Funcionalidade | Dados necessários | Ação do usuário | Endpoint | Resposta esperada | Entidade | Hoje |
|---|---|---|---|---|---|---|
| Nome/iniciais do usuário e empresa, "Plano Pro" | nome, iniciais, nome da empresa, plano | carregar a interface | `GET /api/auth/me` | `{user, company, companies}` | usuario, empresa | Fixo (`currentUser`) |
| Contador de não lidas (sidebar e sino) | total de não lidas | carregar/atualizar | `GET /api/notifications/summary` | `{unread}` | notificacao | Local |
| Sair | — | clique no bloco da empresa | `POST /api/auth/logout` | 204 | — | Local |
| Busca global | termo | digitar | `GET /api/search?q=` (Pendente de definição) | produtos, pedidos | produto, pedido | Sem ação |
| Tema claro/escuro | preferência | botão da barra superior | `PUT /api/settings/preferences` (se persistido — Pendente de definição) | 200 | preferencia_empresa | Local |
| Assistente — ações rápidas | lista de ações | abrir painel | `GET /api/assistant/quick-actions` (opcional) | lista de textos | — | Fixo |
| Assistente — perguntar | mensagem | enviar texto / clicar ação rápida | `POST /api/assistant/messages` | `{reply, intent, data}` | produto, pedido, integracao (leitura) | Fixo (4 respostas) |
| Abrir no Telegram | URL do bot | clique | — (link externo) | — | vinculo_telegram (futuro) | Link real |

## 3. Início (dashboard)

| Funcionalidade | Dados necessários | Ação do usuário | Endpoint | Resposta esperada | Entidade | Hoje |
|---|---|---|---|---|---|---|
| Saudação "Olá, {nome}" | nome do usuário | abrir tela | `GET /api/auth/me` | nome | usuario | Fixo |
| Indicadores (Vendas, Pedidos, Produtos, Estoque crítico, Marketplaces conectados) | período | abrir tela; trocar Hoje/7 dias/30 dias | `GET /api/dashboard/stats?period=` | 5 objetos `{label, value, trend, caption, icon, accent, tone, spark}` | pedido, produto, integracao | **API** |
| Vendas por canal | range | trocar select do gráfico | `GET /api/dashboard/sales?range=` | `{labels, yMax, series}` | pedido, integracao, marketplace | **API** |
| Pedidos por status | — | abrir tela | `GET /api/dashboard/order-statuses` | `[{label, value, color}]` | pedido | **API** |
| Alertas de estoque | — | abrir tela; "Ver todos" | `GET /api/dashboard/stock-alerts` | `[{name, desc, critical}]` | produto | **API** ("Ver todos": Sem ação) |
| Canais conectados | — | abrir tela | `GET /api/channels` | `[{name, short, products, lastSync}]` | integracao, marketplace, anuncio | **API** |
| Sincronizar agora | — | clique | `POST /api/channels/sync` + `GET /api/syncs/{id}` | 202 `{sync_id}` → `{status}` | sincronizacao, anuncio, pedido | Local (animação 1,4 s) |

## 4. Pedidos

| Funcionalidade | Dados necessários | Ação do usuário | Endpoint | Resposta esperada | Entidade | Hoje |
|---|---|---|---|---|---|---|
| Lista de pedidos | — | abrir tela | `GET /api/orders` | arrays `[código, canal, data, cliente, itens, valor, status]` | pedido, cliente, integracao, marketplace | **API** |
| Indicadores (Pedidos hoje, Vendas hoje, Ticket médio, Pendentes) | — | abrir tela | `GET /api/orders/summary` | valores + variações | pedido | Fixo |
| Abas por status | status | clicar aba | `GET /api/orders?status=` (exige ajuste no front) | lista filtrada | pedido | Local (só destaque) |
| Filtros | Pendente de definição | "Filtros" | Pendente de definição | — | pedido | Sem ação |
| Exportar | Pendente de definição | "Exportar" | `GET /api/orders/export` | arquivo | pedido, item_pedido | Sem ação |
| Sincronizar pedidos | — | "Sincronizar pedidos" | `POST /api/orders/sync` | 202 `{sync_id}` | sincronizacao, pedido, item_pedido, produto | Sem ação |
| Ações da linha | Pendente de definição | "•••" | Pendente de definição (`PATCH /api/orders/{id}/status` proposto) | — | pedido | Sem ação |

## 5. Produtos

| Funcionalidade | Dados necessários | Ação do usuário | Endpoint | Resposta esperada | Entidade | Hoje |
|---|---|---|---|---|---|---|
| Lista de produtos | — | abrir tela | `GET /api/products` | arrays `[nome, sku, estoque, preço, status, "Canais", atualização]` | produto, anuncio | **API** |
| Contadores das abas (Todos, Ativos, Estoque baixo, Sem estoque) | — | abrir tela | `GET /api/products/summary` | `{all, active, low_stock, out_of_stock}` | produto | Fixo |
| Filtrar por aba | status | clicar aba | `GET /api/v2/products?status=` (exige ajuste no front) | lista filtrada | produto | Local (só destaque) |
| Novo produto | nome, SKU, preço, estoque, estoque mínimo (+ NCM, origem: Pendente de definição) | "＋ Novo produto" | `POST /api/products` | 201 produto | produto, anuncio | Sem ação |
| Filtros | Pendente de definição | "Filtros" | Pendente de definição | — | produto | Sem ação |
| Editar/excluir | Pendente de definição | "•••" | `PUT` / `DELETE /api/products/{id}` (Pendente de definição) | 200 / 204 | produto | Sem ação |

## 6. Estoque

| Funcionalidade | Dados necessários | Ação do usuário | Endpoint | Resposta esperada | Entidade | Hoje |
|---|---|---|---|---|---|---|
| Tabela central × canais | — | abrir tela | `GET /api/stock` | arrays `[nome, sku, central, mínimo, ML, Shopee, Magalu, status]` | produto, anuncio, integracao | **API** |
| Indicadores e faixa de divergências | — | abrir tela | `GET /api/stock/summary` | `{products, units_available, low_stock, out_of_stock, divergences}` | produto, anuncio | Fixo |
| Sincronizar estoque | — | "↻ Sincronizar estoque" | `POST /api/stock/sync` | 202 `{sync_id}` | sincronizacao, anuncio | Sem ação |
| Revisar divergências | produto, valor que prevalece | "Revisar divergências" | `GET /api/stock/divergences` + `POST /api/stock/divergences/{id}/resolve` | lista; 200 `{status: Sincronizado}` | produto, anuncio | Sem ação |

## 7. Notas fiscais (simulado)

| Funcionalidade | Dados necessários | Ação do usuário | Endpoint | Resposta esperada | Entidade | Hoje |
|---|---|---|---|---|---|---|
| Lista de notas | — | abrir tela | `GET /api/invoices` | arrays `[nota, pedido, canal, cliente, valor, status, emissão]` | nota_fiscal, pedido, cliente | **API** |
| Faixa "N pedidos prontos", indicadores e contadores das abas | — | abrir tela | `GET /api/invoices/summary` | `{ready_to_invoice, issued_today, ...}` | nota_fiscal | Fixo |
| Saúde fiscal e Guardião de rejeições | — | abrir tela | `GET /api/invoices/fiscal-health` | `{score, label, items, rules_checked}` | produto, certificado_digital, empresa | Fixo |
| Emitir nota fiscal | pedido | "＋ Emitir nota fiscal" | `POST /api/invoices` | 201 nota (`processando`) | nota_fiscal, pedido | Sem ação |
| Emitir em lote | pedidos prontos | "Emitir 18 NF-e em lote" | `POST /api/invoices/batch` | 202 `{batch_id, total}` | nota_fiscal | Sem ação |
| Revisar pedidos | Pendente de definição | "Revisar pedidos" | Pendente de definição | — | pedido | Sem ação |
| Detalhe / reenviar rejeitada | id da nota | "•••" / notificação "Revisar nota" | `GET /api/invoices/{id}` + `POST /api/invoices/{id}/resend` | nota com motivo; 200 `processando` | nota_fiscal | Sem ação |
| Abas por status | status | clicar aba | `GET /api/invoices?status=` (exige ajuste no front) | lista filtrada | nota_fiscal | Local (só destaque) |
| Importar XML / Exportar XMLs | Pendente de definição | botões | Pendente de definição | — | nota_fiscal | Sem ação |

## 8. Marketplaces

| Funcionalidade | Dados necessários | Ação do usuário | Endpoint | Resposta esperada | Entidade | Hoje |
|---|---|---|---|---|---|---|
| Cards com métricas | — | abrir tela | `GET /api/marketplaces` | arrays `[nome, sigla, produtos publicados, pedidos, vendas]` | integracao, marketplace, anuncio, pedido | **API** |
| Conectar canal | marketplace | "＋ Conectar canal" | `POST /api/marketplaces/connect` | 201 (simulado) ou `{authorization_url}` (OAuth planejado) | integracao | Sem ação |
| Sincronizar canal | id da integração | "↻ Sincronizar" | `POST /api/integrations/{id}/sync` | 202 `{sync_id}` | sincronizacao | Sem ação |
| Gerenciar | Pendente de definição | "Gerenciar" | Pendente de definição | — | integracao | Sem ação |

## 9. Integrações

| Funcionalidade | Dados necessários | Ação do usuário | Endpoint | Resposta esperada | Entidade | Hoje |
|---|---|---|---|---|---|---|
| Lista (3 marketplaces + Telegram) | — | abrir tela | Hoje `GET /api/marketplaces`; proposto `GET /api/integrations` | lista com conta vinculada e última sincronização | integracao, marketplace, vinculo_telegram | **API** (+ Telegram fixo) |
| Configurar | Pendente de definição | "Configurar" | `PATCH /api/integrations/{id}` (Pendente de definição) | — | integracao | Sem ação |
| Reconectar | id | "Reconectar" | `POST /api/integrations/{id}/reconnect` | igual a connect | integracao | Sem ação |
| Desconectar | id | "Desconectar" | `DELETE /api/integrations/{id}` | 204 | integracao | Sem ação |

## 10. Relatórios

| Funcionalidade | Dados necessários | Ação do usuário | Endpoint | Resposta esperada | Entidade | Hoje |
|---|---|---|---|---|---|---|
| Indicadores, evolução, participação por marketplace, top produtos | período (7 dias, 30 dias, 3 meses, Personalizado) | abrir tela; trocar período | `GET /api/reports?period=` | `{summary, sales_evolution, sales_by_marketplace, top_products}` | pedido, item_pedido, produto, integracao | Parcial: usa `GET /api/dashboard/sales?range=7 dias` e `GET /api/products`; restante fixo; período só visual |

## 11. Notificações

| Funcionalidade | Dados necessários | Ação do usuário | Endpoint | Resposta esperada | Entidade | Hoje |
|---|---|---|---|---|---|---|
| Indicadores (Recebidas hoje, Alertas críticos, Novos pedidos, Entregues no Telegram) | — | abrir tela | `GET /api/notifications/summary` | contadores | notificacao | Fixo |
| Lista e filtros | filtro | clicar filtro | `GET /api/notifications?filter=` | lista `{id, type, icon, tone, title, desc, time, unread, action}` | notificacao | Local + Fixo |
| Marcar como lida | id | clicar notificação ou botão de ação | `PATCH /api/notifications/{id}/read` | 204 | notificacao | Local |
| Marcar todas como lidas | — | botão | `POST /api/notifications/read-all` | `{updated}` | notificacao | Local |
| Preferências | — | botão "Preferências" | — (navega para Configurações › Notificações) | — | — | Local |
| Onde receber alertas (Telegram, E-mail, Navegador, Resumo diário) | 4 chaves | alternar switch | `PUT /api/settings/preferences` (campo `alerts`) | 200 | preferencia_empresa | Sem ação (não persiste) |
| Card Telegram | URL do bot | "Abrir no Telegram" | — (link) | — | vinculo_telegram | Link real |

## 12. Configurações

### 12.1 Aba Empresa
| Funcionalidade | Dados necessários | Ação do usuário | Endpoint | Resposta esperada | Entidade | Hoje |
|---|---|---|---|---|---|---|
| Dados da empresa | razão social, nome fantasia, CNPJ, IE, regime tributário, e-mail, telefone, endereço | editar e "Salvar alterações" | `GET` / `PUT /api/settings/company` | 200 dados | empresa | Fixo; salvar só mostra toast |
| Alterar logo | arquivo (Pendente de definição) | "Alterar logo" | Pendente de definição | `logo_url` | empresa | Sem ação |
| Certificado digital | tipo, validade | "Substituir" | `GET` / `PUT /api/settings/certificate` | dados do certificado | certificado_digital | Fixo / Sem ação |

### 12.2 Aba Preferências
| Funcionalidade | Dados necessários | Ação do usuário | Endpoint | Resposta esperada | Entidade | Hoje |
|---|---|---|---|---|---|---|
| Aparência e região | tema, idioma, fuso | alternar/selecionar | `GET` / `PUT /api/settings/preferences` | 200 | preferencia_empresa | Tema local; demais sem ação |
| Sincronização | sync auto, pausar sem estoque, importar pedidos auto, intervalo, última sincronização | alternar/selecionar e salvar | `GET` / `PUT /api/settings/preferences` | 200 | preferencia_empresa | Fixo |

### 12.3 Aba Notificações
| Funcionalidade | Dados necessários | Ação do usuário | Endpoint | Resposta esperada | Entidade | Hoje |
|---|---|---|---|---|---|---|
| Status do Telegram | conta, data de vínculo | abrir aba | `GET /api/settings/notifications` | `{telegram, events}` | vinculo_telegram | Fixo |
| Matriz Evento × Canal | 5 eventos × 3 canais | alternar e salvar | `PUT /api/settings/notifications` | 200 | preferencia_notificacao | Fixo; salvar só toast |

### 12.4 Aba Equipe (escopo Pendente de definição)
| Funcionalidade | Dados necessários | Ação do usuário | Endpoint | Resposta esperada | Entidade | Hoje |
|---|---|---|---|---|---|---|
| Lista de usuários | nome, e-mail, papel, status, limite | abrir aba | `GET /api/settings/team` | `{limit, members}` | usuario, usuario_empresa | Fixo |
| Convidar usuário | e-mail, papel | "＋ Convidar usuário" | `POST /api/settings/team/invitations` | 201 | usuario_empresa | Sem ação |
| Segurança | 2 etapas, sessões inativas | alternar e salvar | `GET` / `PUT /api/settings/security` | 200 | Pendente de definição | Fixo |

### 12.5 Aba Plano (fora do escopo do MVP)
| Funcionalidade | Dados necessários | Ação do usuário | Endpoint | Resposta esperada | Entidade | Hoje |
|---|---|---|---|---|---|---|
| Plano, uso, cobrança | plano, preço, renovação, uso, pagamento, faturas | abrir aba; botões | `GET /api/settings/plan` | ver api-backend | Pendente de definição | Fixo / Sem ação |

## 13. Ajuda

| Funcionalidade | Dados necessários | Ação do usuário | Endpoint | Resposta esperada | Entidade | Hoje |
|---|---|---|---|---|---|---|
| Busca e tópicos do FAQ | termo, tópico | digitar / clicar tópico | `GET /api/help/faqs?q=&topic=` (Pendente de definição) | lista `{cat, q, a}` | — | Local + Fixo |
| Fale com a gente | — | Assistente IA / Telegram / e-mail | — | abre chat, link ou `mailto:` | — | Local / Link real |
| Status dos serviços | — | abrir tela | `GET /api/status/services` (Pendente de definição) | `[{name, status}]` | — | Fixo |

---

## Resumo por prioridade sugerida

| Prioridade | Endpoints | Motivo |
|---|---|---|
| 1 | Os 10 GET já consumidos (seção 2 do [api-backend.md](api-backend.md)) | Funcionam com `CONFIG.useApi = true`, sem mudar o front |
| 2 | Auth, sincronizações, conectar marketplace (simulado), assistente | Núcleo do MVP (resumo do projeto) |
| 3 | Resumos/indicadores (`/summary`), notificações, emissão de NF-e simulada, relatórios | Substituem dados fixos |
| 4 | Configurações, Telegram, voz | Dependem de definições pendentes |
| — | Equipe, segurança, plano, busca, ajuda | Escopo Pendente de definição |
