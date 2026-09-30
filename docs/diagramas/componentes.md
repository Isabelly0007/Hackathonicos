# Diagrama de componentes

## 1. Arquitetura alvo do MVP

Componentes planejados antes do back-end (front-end existente; back-end e integrações a implementar naquele momento). Hoje o back-end (`backend/`) e o bot (`bot_estoque/`) existem: veja a situação de cada interface na seção 2. Classificação conforme a [legenda](../README.md#legenda-de-classificação).

```mermaid
flowchart LR
    subgraph NAV["Navegador"]
        direction TB
        HTML["index.html<br/>#root"]
        subgraph JS["javascript.js [REAL]"]
            direction TB
            CFG["CONFIG<br/>useApi, apiBase=/api,<br/>telegram, supportEmail"]
            MOCK["Dados de exemplo<br/>[SIMULADO]"]
            APIC["Camada api<br/>apiGet() + fallback"]
            TELAS["Telas<br/>Login, Início, Pedidos, Produtos,<br/>Estoque, Notas fiscais, Marketplaces,<br/>Integrações, Relatórios, Notificações,<br/>Configurações, Ajuda"]
            CHAT["Painel Assistente IA"]
            EVT["Eventos<br/>cliques, submit, tema"]
        end
        CSS["style.css"]
        VOZ["Voz do navegador<br/>[PLANEJADO]<br/>(opção Pendente de definição)"]
    end

    subgraph BACK["Back-end Python / FastAPI [PLANEJADO]"]
        direction TB
        ROUT["Rotas /api<br/>auth, dashboard, channels, products,<br/>orders, stock, invoices, marketplaces,<br/>integrations, reports, notifications,<br/>settings, assistant, telegram"]
        SERV["Serviços de negócio<br/>estoque, sincronização, fiscal,<br/>notificações, relatórios"]
        ASSIST["Serviço do assistente<br/>intenções"]
        JOBS["Agendador<br/>conferência periódica,<br/>resumo diário 08h"]
        subgraph ADP["Adaptadores"]
            AMK["Marketplaces<br/>[SIMULADO]"]
            AFS["Fiscal / SEFAZ<br/>[SIMULADO]"]
            AGM["Gemini"]
            ATG["Telegram Bot API"]
            AML["E-mail / Push<br/>Pendente de definição"]
        end
    end

    DB[("Supabase<br/>PostgreSQL<br/>[PLANEJADO]")]
    GEM["Google Gemini API<br/>[PLANEJADO]"]
    TGAPI["Telegram<br/>[PLANEJADO]"]
    MKT["APIs reais ML / Shopee / Magalu<br/>(OAuth) — pós-MVP"]

    HTML --> JS
    HTML --> CSS
    TELAS --> APIC
    APIC -- "fallback" --> MOCK
    CHAT -. "hoje: respostas fixas" .-> MOCK
    CHAT -. "planejado" .-> ROUT
    VOZ -.-> CHAT
    APIC -- "HTTP GET /api/..." --> ROUT
    ROUT --> SERV
    ROUT --> ASSIST
    JOBS --> SERV
    SERV --> DB
    ASSIST --> DB
    ASSIST --> AGM --> GEM
    SERV --> AMK
    AMK -. "pós-MVP" .-> MKT
    SERV --> AFS
    SERV --> ATG
    SERV --> AML
    ATG <--> TGAPI
    TGAPI -- "webhook" --> ROUT
```

> **Como ficou implementado:** o Telegram não passa pelo back-end. O bot é um programa à parte (`bot_estoque/`,
> Node.js + Telegraf, `@EstoqueLojas_bot`) que busca as mensagens por **long polling** e lê e grava direto no
> PostgreSQL do Supabase (schema `taylor`), as mesmas tabelas do back-end. O webhook do diagrama não é usado.

## 2. Interfaces entre componentes

| De → Para | Interface | Situação |
|---|---|---|
| Telas → camada `api` | Funções `api.stats`, `api.sales`, `api.orderStatuses`, `api.stockAlerts`, `api.channels`, `api.products`, `api.orders`, `api.stock`, `api.invoices`, `api.marketplaces` | [REAL] |
| Camada `api` → back-end | HTTP em `CONFIG.apiBase + caminho` (`/api` no mesmo endereço), com o token JWT; fallback para dados de exemplo em caso de erro | [REAL] |
| Telas/eventos → back-end (escrita) | `POST/PUT/PATCH/DELETE` descritos em [../api-backend.md](../api-backend.md#3-contratos-propostos-novos) | [REAL] |
| Back-end → Supabase | SQL direto no PostgreSQL (psycopg, Session pooler, `search_path = taylor`) | [REAL] |
| Back-end → Gemini | API REST do Gemini (chave em `GEMINI_API_KEY`), só para identificar a intenção | [REAL] (opcional) |
| Telegram ↔ bot `bot_estoque` | Long polling (`getUpdates`) + `sendMessage`; o bot lê e grava direto no PostgreSQL (schema `taylor`) | [REAL] |
| Telegram ↔ back-end | Webhook de entrada | Não usado (o bot faz esse papel) |
| Front → Telegram | Link `https://t.me/EstoqueLojas_bot` (`CONFIG.telegram`, nova aba) | [REAL] |
| Back-end → marketplaces | Adaptador simulado com interface compatível com OAuth/API real | [SIMULADO] |
| Back-end → SEFAZ | Adaptador fiscal simulado | [SIMULADO] |

## 3. Estrutura interna do front-end atual

Para referência da equipe de back-end (não alterar).

```mermaid
flowchart TB
    R["render()"] --> Q{"state.loggedIn?"}
    Q -- "não" --> RL["renderLogin()"]
    Q -- "sim" --> RS["renderShell()<br/>sidebar + topbar + chat + toast"]
    RS --> RP["renderPage()"]
    RP --> D["Início → renderDashboard()<br/>loadStats, loadChart, loadDonut,<br/>loadAlerts, loadChannels"]
    RP --> P1["Produtos → renderProducts() → api.products"]
    RP --> P2["Pedidos → renderOrders() → api.orders"]
    RP --> P3["Estoque → renderStock() → api.stock"]
    RP --> P4["Notas fiscais → renderInvoices() → api.invoices"]
    RP --> P5["Marketplaces / Integrações → renderMarketplaces() → api.marketplaces"]
    RP --> P6["Relatórios → renderReports() → api.sales + api.products"]
    RP --> P7["Notificações → renderNotifications() (dados locais)"]
    RP --> P8["Configurações → renderSettings() (dados locais)"]
    RP --> P9["Ajuda → renderHelp() (dados locais)"]
```
