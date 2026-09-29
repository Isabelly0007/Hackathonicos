# Especificação do back-end (Python)

Contratos HTTP necessários para o front-end do Taylor. **Nada aqui está implementado** — este documento é a referência para a implementação.

## 1. Diretrizes gerais

| Tema | Definição |
|---|---|
| Linguagem | Python (resumo do projeto) |
| Framework sugerido | **FastAPI** (citado no comentário do `javascript.js`: "chamam o seu backend (FastAPI)"). Pydantic para validar bodies. |
| Banco | Supabase (PostgreSQL) — ver [modelo-dados.md](modelo-dados.md) |
| Prefixo | Todas as rotas sob **`/api`** (`CONFIG.apiBase = "/api"`; exemplo do front: `http://localhost:8000/api`) |
| Formato | JSON UTF-8 |
| CORS | Liberar a origem do front (o front pode ser aberto por arquivo ou `npx serve`) |
| Nomes das rotas | Em inglês, **seguindo as rotas que o front já chama** (`/products`, `/orders`, `/stock`…). Os demais contratos seguem o mesmo padrão para manter consistência. |
| Autenticação | `Authorization: Bearer <token>` nas rotas protegidas. **Atenção:** a função `apiGet` do front atual **não envia cabeçalho de autenticação**; ou as 10 rotas GET já usadas ficam abertas durante a demonstração, ou o front precisa ser ajustado — Pendente de definição. |
| Empresa ativa | Todas as rotas operacionais atuam sobre a **empresa ativa do usuário** (resolvida pelo token). Troca de empresa (multi-CNPJ): Pendente de definição. |
| Datas | ISO 8601 com fuso (`2026-09-22T14:10:00-03:00`) nos contratos novos |
| Dinheiro | Número decimal (`349.80`) nos contratos novos. Os contratos de **compatibilidade** (seção 2) retornam texto já formatado, como o front espera. |

### 1.1 Códigos HTTP padronizados

| Código | Uso |
|---|---|
| 200 | Sucesso com corpo |
| 201 | Recurso criado |
| 202 | Processo assíncrono aceito (sincronização, emissão em lote) |
| 204 | Sucesso sem corpo |
| 400 | Parâmetro inválido (ex.: `period` fora da lista) |
| 401 | Sem token ou token inválido |
| 403 | Usuário sem acesso à empresa/recurso |
| 404 | Recurso não encontrado |
| 409 | Conflito (e-mail/CNPJ/SKU duplicado, sincronização em andamento, NF-e já autorizada) |
| 422 | Body inválido (erro de validação do Pydantic) |
| 502 | Falha em serviço externo (Gemini, Telegram, marketplace) |

### 1.2 Formato de erro

```json
{
  "detail": "Mensagem legível para o usuário",
  "code": "SKU_DUPLICADO",
  "fields": { "sku": "Já existe um produto com este SKU" }
}
```

---

## 2. Contratos já consumidos pelo front-end (compatibilidade obrigatória)

O front **já chama** estas 10 rotas (objeto `api` do `javascript.js`) quando `CONFIG.useApi = true`. Para funcionar **sem alterar o front**, a resposta deve ter **exatamente o mesmo formato dos dados de exemplo**, inclusive listas posicionais (arrays de arrays) e textos já formatados. Se a resposta falhar (status ≠ 2xx), o front usa os dados de exemplo.

> Mudar esses formatos para objetos com campos nomeados exige ajuste no front — Pendente de definição.

### 2.1 `GET /api/dashboard/stats`
| Item | Valor |
|---|---|
| Objetivo | Indicadores do dashboard (RF005) |
| Parâmetros | `period` (query, obrigatório): `Hoje` \| `7 dias` \| `30 dias` (o front envia URL-encoded, ex.: `7%20dias`) |
| Códigos | 200, 400, 401 |
| Regras | RN005, RN008, RN012 |

Resposta 200 — **array com 5 objetos, nesta ordem**:
```json
[
  { "label": "Vendas", "value": "R$ 7.320,50", "trend": "↑ 18%", "caption": "vs. período anterior", "icon": "dollar", "accent": "green", "spark": [3, 4, 3.4, 5, 4.4, 6, 7] },
  { "label": "Pedidos", "value": "48", "trend": "↑ 12%", "caption": "vs. período anterior", "icon": "cart", "accent": "blue", "spark": [2, 3, 2.6, 4, 3.8, 5, 6] },
  { "label": "Produtos", "value": "312", "trend": "↑ 5%", "caption": "cadastrados", "icon": "tag", "accent": "purple", "spark": [3, 3.2, 3.6, 4, 4.4, 5, 5.6] },
  { "label": "Estoque crítico", "value": "8", "trend": "↓ 3%", "caption": "produtos abaixo do mínimo", "icon": "alert", "accent": "red", "tone": "danger", "spark": [6, 5.4, 5.8, 4.6, 5, 3.8, 3.2] },
  { "label": "Marketplaces conectados", "value": "3", "trend": "100% ativos", "icon": "share", "accent": "blue", "spark": [4, 4, 4.2, 4, 4.4, 4.2, 4.4] }
]
```
Observações de compatibilidade:
- `trend` **deve começar com `↓`** para ser exibido em vermelho; qualquer outro início é exibido em verde.
- `spark`: 7 números da série do minigráfico (escala livre; o front normaliza).
- `icon` ∈ {`dollar`, `cart`, `tag`, `alert`, `share`, ...}; `accent` ∈ {`blue`, `purple`, `red`, `green`}; `tone: "danger"` destaca o cartão.
- Base de comparação de "Produtos" (↑ 5%) e "Estoque crítico" (↓ 3%): Pendente de definição.

### 2.2 `GET /api/dashboard/sales`
| Item | Valor |
|---|---|
| Objetivo | Gráfico "Vendas por canal" (RF006) e "Evolução das vendas" (RF029 — o front usa só a 1ª série com `range=7 dias`) |
| Parâmetros | `range` (query, obrigatório): `Hoje` \| `7 dias` \| `30 dias` |
| Códigos | 200, 400, 401 |

Resposta 200:
```json
{
  "labels": ["22/09", "23/09", "24/09", "25/09", "26/09", "27/09", "28/09"],
  "yMax": 6000,
  "series": [
    { "name": "Mercado Livre", "cls": "blue", "values": [2200, 3100, 3200, 3500, 4600, 4800, 5700] },
    { "name": "Shopee", "cls": "red", "values": [1400, 2100, 1700, 2300, 3400, 3000, 4300] },
    { "name": "Magalu", "cls": "purple", "values": [400, 1100, 700, 1000, 1600, 1700, 2300] }
  ]
}
```
- `labels`: 7 pontos. `Hoje` → `08h, 10h, …, 20h`; `7 dias` → últimos 7 dias `dd/mm`; `30 dias` → 7 datas espaçadas `dd/mm`.
- `yMax`: teto do eixo Y (valor ≥ maior valor das séries; o front divide em 3 faixas).
- `cls`: cor da linha — `blue` (Mercado Livre), `red` (Shopee), `purple` (Magalu). Canal adicional não tem cor definida — Pendente de definição.
- Valores em reais, como número.

### 2.3 `GET /api/dashboard/order-statuses`
| Item | Valor |
|---|---|
| Objetivo | Gráfico "Pedidos por status" (RF007) |
| Parâmetros | nenhum |
| Códigos | 200, 401 |
| Regras | RN007 |

```json
[
  { "label": "Aguardando", "value": 12, "color": "#2f8bff" },
  { "label": "Em separação", "value": 18, "color": "#8b5cf6" },
  { "label": "Em transporte", "value": 10, "color": "#ff8a5b" },
  { "label": "Entregue", "value": 46, "color": "#36db9b" },
  { "label": "Cancelado", "value": 4, "color": "#ff5672" }
]
```

### 2.4 `GET /api/dashboard/stock-alerts`
| Item | Valor |
|---|---|
| Objetivo | Card "Alertas de estoque" (RF008) |
| Códigos | 200, 401 |
| Regras | RN011, RN012 |

```json
[
  { "name": "Garrafa Térmica", "desc": "Sem estoque", "critical": true },
  { "name": "Camiseta Essentials", "desc": "2 unidades restantes", "critical": true },
  { "name": "Mochila Urban", "desc": "4 unidades restantes", "critical": false }
]
```
Quantidade máxima de itens e critério de `critical`: Pendente de definição (o front exibe 4).

### 2.5 `GET /api/channels`
| Item | Valor |
|---|---|
| Objetivo | Card "Canais conectados" no dashboard (RF009) |
| Códigos | 200, 401 |

```json
[
  { "name": "Mercado Livre", "short": "ML", "products": 128, "lastSync": "2 min atrás" },
  { "name": "Shopee", "short": "S", "products": 96, "lastSync": "3 min atrás" },
  { "name": "Magalu", "short": "M", "products": 88, "lastSync": "5 min atrás" }
]
```
- A **posição** no array define a cor do logo (0 amarelo, 1 vermelho, 2 azul, 3 azul-claro). Manter a ordem ML, Shopee, Magalu.
- `lastSync` é texto relativo já formatado.

### 2.6 `GET /api/products`
| Item | Valor |
|---|---|
| Objetivo | Tabela de Produtos (RF010); também usado em Relatórios (4 primeiros nomes) |
| Códigos | 200, 401 |
| Regras | RN010, RN011 |

Resposta 200 — **array de arrays** com 7 posições:

| Índice | Conteúdo | Exemplo |
|---|---|---|
| 0 | Nome | `"Tênis Runner Pro"` |
| 1 | SKU | `"TEN001"` |
| 2 | Estoque central (texto) | `"24"` |
| 3 | Preço formatado | `"R$ 249,90"` |
| 4 | Status: `Ativo` \| `Estoque baixo` \| `Sem estoque` | `"Ativo"` |
| 5 | Placeholder da coluna Canais (ignorado; o front sempre desenha ML/S/M) | `"Canais"` |
| 6 | Última atualização `dd/mm HH:MM` | `"22/09 14:33"` |

```json
[
  ["Tênis Runner Pro", "TEN001", "24", "R$ 249,90", "Ativo", "Canais", "22/09 14:33"],
  ["Garrafa Térmica", "GAR203", "0", "R$ 99,90", "Sem estoque", "Canais", "22/09 14:15"]
]
```
> O texto do status vira classe CSS (`"Estoque baixo"` → `.status.estoque-baixo`). Usar exatamente os textos acima.

### 2.7 `GET /api/orders`
| Item | Valor |
|---|---|
| Objetivo | Tabela de Pedidos (RF012) |
| Códigos | 200, 401 |
| Regras | RN007, RN009 |

| Índice | Conteúdo | Exemplo |
|---|---|---|
| 0 | Código | `"#200014"` |
| 1 | Canal | `"Mercado Livre"` |
| 2 | Data `dd/mm HH:MM` | `"22/09 14:10"` |
| 3 | Cliente (nome abreviado) | `"Mariana S."` |
| 4 | Quantidade de itens | `"2"` |
| 5 | Valor formatado | `"R$ 349,80"` |
| 6 | Status: `Aguardando` \| `Em separação` \| `Em transporte` \| `Entregue` \| `Cancelado` | `"Em separação"` |

```json
[["#200014", "Mercado Livre", "22/09 14:10", "Mariana S.", "2", "R$ 349,80", "Em separação"]]
```

### 2.8 `GET /api/stock`
| Item | Valor |
|---|---|
| Objetivo | Tabela de Estoque (RF015) |
| Códigos | 200, 401 |
| Regras | RN012, RN014, RN015, RN018 |

| Índice | Conteúdo |
|---|---|
| 0 | Nome do produto |
| 1 | SKU |
| 2 | Estoque central |
| 3 | Estoque mínimo |
| 4 | Estoque publicado no Mercado Livre |
| 5 | Estoque publicado na Shopee |
| 6 | Estoque publicado na Magalu |
| 7 | Status: `Sincronizado` \| `Divergência detectada` \| `Estoque baixo` \| `Sem estoque` |

```json
[["Mochila Urban", "MOC012", "12", "8", "12", "10", "12", "Divergência detectada"]]
```
> As colunas de canal são fixas (ML, Shopee, Magalu). Canal não conectado: valor a exibir Pendente de definição (sugestão: `"—"`).

### 2.9 `GET /api/invoices`
| Item | Valor |
|---|---|
| Objetivo | Tabela de Notas fiscais (RF019) — **[SIMULADO]** |
| Códigos | 200, 401 |
| Regras | RN025 |

| Índice | Conteúdo |
|---|---|
| 0 | Número (`"NF-e 004821"`) ou `"Rascunho"` quando aguardando emissão |
| 1 | Código do pedido |
| 2 | Canal |
| 3 | Cliente |
| 4 | Valor formatado |
| 5 | Status: `Aguardando emissão` \| `Processando` \| `Autorizada` \| `Rejeitada` |
| 6 | Data `dd/mm HH:MM` |

```json
[["NF-e 004821", "#200014", "Mercado Livre", "Mariana S.", "R$ 349,80", "Autorizada", "22/09 14:12"]]
```

### 2.10 `GET /api/marketplaces`
| Item | Valor |
|---|---|
| Objetivo | Cards de Marketplaces (RF025) e lista de Integrações (RF028) |
| Códigos | 200, 401 |

| Índice | Conteúdo |
|---|---|
| 0 | Nome |
| 1 | Sigla (`ML`, `S`, `M`) |
| 2 | Produtos publicados (texto) |
| 3 | Pedidos (texto) |
| 4 | Vendas formatadas |

```json
[["Mercado Livre", "ML", "128", "42", "R$ 4.230,40"], ["Shopee", "S", "96", "31", "R$ 1.840,10"], ["Magalu", "M", "88", "17", "R$ 1.250,00"]]
```
> Na tela Integrações o front acrescenta o Telegram por conta própria e calcula "Última sincronização" pela posição (`Há 2 min`, `Há 3 min`…). Período de Pedidos/Vendas: Pendente de definição.

---

## 3. Contratos propostos (novos)

Necessários para substituir os dados fixos e dar ação aos botões. Exigem **ajuste no front** para serem consumidos (fora do escopo desta documentação). Formato com objetos nomeados, números e datas ISO.

### 3.1 Autenticação

#### `POST /api/auth/register`
Objetivo: criar conta, empresa e sessão (RF002). Regras: RN002.

Request:
```json
{
  "name": "Isabela Franco",
  "company": "Loja Beta",
  "email": "isabela@lojabeta.com.br",
  "password": "********",
  "cnpj": "12.345.678/0001-90"
}
```
Response 201:
```json
{
  "access_token": "<jwt>",
  "token_type": "bearer",
  "user": { "id": "uuid", "name": "Isabela Franco", "email": "isabela@lojabeta.com.br", "initials": "IF" },
  "company": { "id": "uuid", "name": "Loja Beta", "cnpj": "12345678000190", "plan": "Pro" }
}
```
Códigos: 201, 409 (`EMAIL_JA_CADASTRADO`, `CNPJ_JA_CADASTRADO`), 422 (campo vazio, CNPJ inválido).

#### `POST /api/auth/login`
Objetivo: autenticar (RF001). Regras: RN001.

Request: `{ "email": "isabela@lojabeta.com.br", "password": "********", "remember": true }`
Response 200: mesmo corpo do register.
Códigos: 200, 401 (`CREDENCIAIS_INVALIDAS`), 422.
> `remember` controla a validade do token — Pendente de definição.

#### `POST /api/auth/logout`
Objetivo: encerrar sessão (RF003). Response 204. Códigos: 204, 401.

#### `GET /api/auth/me`
Objetivo: dados do usuário e empresa ativa (substitui `currentUser`: nome, empresa, iniciais; sidebar "Plano Pro").
Response 200: `{ "user": {...}, "company": {...}, "companies": [ { "id": "uuid", "name": "Loja Beta" } ] }`. Códigos: 200, 401.

#### `POST /api/auth/forgot-password` — Pendente de definição
Request: `{ "email": "..." }`. Response 202. Fluxo completo não definido (RF004).

### 3.2 Dashboard e canais

#### `POST /api/channels/sync`
Objetivo: "Sincronizar agora" (RF009) — sincroniza todos os canais **[SIMULADO]**. Regras: RN013, RN023.
Request: `{}`
Response 202:
```json
{ "sync_id": "uuid", "status": "em_andamento", "started_at": "2026-09-28T14:10:00-03:00" }
```
Códigos: 202, 401, 409 (`SINCRONIZACAO_EM_ANDAMENTO`).

#### `GET /api/syncs/{sync_id}`
Objetivo: acompanhar a sincronização até concluir.
Response 200: `{ "id": "uuid", "status": "concluida", "items_updated": 312, "channels": 3, "errors": 0, "finished_at": "..." }`. Códigos: 200, 401, 404.

### 3.3 Produtos

#### `GET /api/products/summary`
Objetivo: contadores das abas de Produtos (RF010).
Response 200: `{ "all": 312, "active": 298, "low_stock": 10, "out_of_stock": 4 }`.

#### `GET /api/v2/products` — alternativa com filtros (Pendente de definição)
Parâmetros: `status` (`ativo` \| `estoque_baixo` \| `sem_estoque`), `q` (nome/SKU), `page`, `page_size`.
Response 200:
```json
{
  "items": [
    { "id": "uuid", "name": "Tênis Runner Pro", "sku": "TEN001", "stock": 24, "min_stock": 10, "price": 249.90, "status": "ativo", "channels": ["ML", "S", "M"], "updated_at": "2026-09-22T14:33:00-03:00" }
  ],
  "total": 312, "page": 1, "page_size": 20
}
```
> Enquanto o front usar `GET /api/products` (seção 2.6), os filtros de aba não são aplicados no servidor.

#### `POST /api/products`
Objetivo: "＋ Novo produto" (RF011). Regras: RN010.
Request:
```json
{
  "name": "Tênis Runner Pro",
  "sku": "TEN001",
  "price": 249.90,
  "stock": 24,
  "min_stock": 10,
  "ncm": "64041900",
  "fiscal_origin": "0"
}
```
`ncm` e `fiscal_origin` opcionais (Pendente de definição). Publicação automática nos canais: Pendente de definição.
Response 201: objeto do produto (mesmo formato do item acima). Códigos: 201, 401, 409 (`SKU_DUPLICADO`), 422 (valores negativos, campo vazio).

#### `GET /api/products/{id}` · `PUT /api/products/{id}` · `DELETE /api/products/{id}` — Pendente de definição
O menu "•••" existe em cada linha, sem opções definidas. Contratos seguem o padrão REST acima (200/204, 404, 409, 422).

### 3.4 Pedidos

#### `GET /api/orders/summary`
Objetivo: indicadores de Pedidos (RF012). Regras: RN005, RN006.
Response 200:
```json
{
  "orders_today": { "value": 48, "trend_pct": 12.0 },
  "sales_today": { "value": 7320.50, "trend_pct": 18.0 },
  "average_ticket": { "value": 152.50, "trend_pct": 5.0 },
  "pending_orders": { "value": 30, "trend_pct": -8.0 },
  "by_status": { "aguardando": 12, "em_separacao": 18, "em_transporte": 10, "entregue": 46, "cancelado": 4 }
}
```

#### `POST /api/orders/sync`
Objetivo: "Sincronizar pedidos" (RF013) **[SIMULADO]**. Regras: RN013, RN021.
Response 202: `{ "sync_id": "uuid", "status": "em_andamento" }`. Resultado via `GET /api/syncs/{id}` com `new_orders`. Códigos: 202, 401, 409.

#### `PATCH /api/orders/{id}/status` — Pendente de definição
Não há botão para mudar status no front; necessário ao menos para **cancelamento com estorno de estoque** (RN017) na simulação.
Request: `{ "status": "cancelado" }`. Response 200: pedido atualizado. Códigos: 200, 404, 409 (transição inválida), 422.

#### `GET /api/orders/export` — Pendente de definição
Parâmetros: `status`, `from`, `to`, `format` (`csv`?). Response 200 com arquivo.

### 3.5 Estoque

#### `GET /api/stock/summary`
Objetivo: indicadores e faixa de divergências (RF015).
Response 200:
```json
{ "products": 312, "units_available": 4860, "low_stock": 8, "out_of_stock": 4, "divergences": 2 }
```

#### `POST /api/stock/sync`
Objetivo: "↻ Sincronizar estoque" (RF016) — iguala o estoque publicado ao estoque central em todos os canais **[SIMULADO]**. Regras: RN013.
Response 202: `{ "sync_id": "uuid", "status": "em_andamento" }`. Códigos: 202, 401, 409.

#### `GET /api/stock/divergences`
Objetivo: "Revisar divergências" (RF017). Regras: RN015.
Response 200:
```json
[
  {
    "product_id": "uuid",
    "product": "Mochila Urban",
    "sku": "MOC012",
    "central_stock": 12,
    "channels": [
      { "channel": "Mercado Livre", "integration_id": "uuid", "published_stock": 12 },
      { "channel": "Shopee", "integration_id": "uuid", "published_stock": 10 },
      { "channel": "Magalu", "integration_id": "uuid", "published_stock": 12 }
    ]
  }
]
```

#### `POST /api/stock/divergences/{product_id}/resolve`
Objetivo: aplicar o valor que prevalece e sincronizar (RF017). Regras: RN015.
Request — prevalece o estoque central:
```json
{ "source": "central" }
```
Request — prevalece o valor de um canal:
```json
{ "source": "channel", "integration_id": "uuid" }
```
Response 200: `{ "product_id": "uuid", "central_stock": 10, "status": "Sincronizado" }`.
Códigos: 200, 401, 404, 409 (`SEM_DIVERGENCIA`), 422.

### 3.6 Notas fiscais **[SIMULADO]**

#### `GET /api/invoices/summary`
Objetivo: faixa "pedidos prontos para faturar", indicadores e contadores das abas (RF019).
Response 200:
```json
{
  "ready_to_invoice": 18,
  "issued_today": 42,
  "awaiting": 18,
  "processing": 2,
  "rejected": 1,
  "avg_issue_seconds": 38,
  "rejections_avoided": 7
}
```

#### `GET /api/invoices/fiscal-health`
Objetivo: "Saúde fiscal da operação" e "Guardião de rejeições" (RF022). Fórmula do `score`: Pendente de definição.
Response 200:
```json
{
  "score": 96,
  "label": "Excelente",
  "items": [
    { "ok": true, "text": "NCM preenchido em 308 produtos", "value": "99%" },
    { "ok": true, "text": "Certificado A1 válido", "value": "214 dias" },
    { "ok": false, "text": "4 produtos sem origem fiscal", "value": "Corrigir" }
  ],
  "rules_checked": 23,
  "guard_active": true
}
```

#### `POST /api/invoices`
Objetivo: "＋ Emitir nota fiscal" para um pedido (RF020). Regras: RN004, RN024, RN025, RN026, RN028.
Request: `{ "order_id": "uuid" }`
Response 201:
```json
{ "id": "uuid", "number": null, "order": "#200011", "status": "processando", "simulated": true }
```
Códigos: 201, 401, 404 (pedido), 409 (`NFE_JA_AUTORIZADA`), 422 (`DADOS_FISCAIS_INCOMPLETOS` com a lista em `fields`).

#### `POST /api/invoices/batch`
Objetivo: "Emitir NF-e em lote" (RF021). Regras: RN029.
Request: `{ "order_ids": ["uuid", "uuid"] }` — lista vazia/omitida = todos os prontos para faturar (Pendente de definição).
Response 202:
```json
{ "batch_id": "uuid", "total": 18, "status": "processando" }
```

#### `GET /api/invoices/{id}`
Objetivo: detalhe da nota, incluindo o motivo de rejeição (RF023).
Response 200:
```json
{ "id": "uuid", "number": "NF-e 004817", "order": "#200009", "channel": "Shopee", "customer": "Beatriz A.", "value": 189.90, "status": "rejeitada", "rejection_reason": "SEFAZ: CFOP incompatível com a UF de destino.", "xml_url": null, "issued_at": "2026-09-21T17:20:00-03:00", "simulated": true }
```

#### `POST /api/invoices/{id}/resend`
Objetivo: reenviar NF-e rejeitada após correção (RF023). Regras: RN027.
Response 200: nota com `status: "processando"`. Códigos: 200, 404, 409 (`NFE_NAO_REJEITADA`), 422.

#### `GET /api/invoices/export` e `POST /api/invoices/import-xml` — Pendente de definição
Botões "Exportar XMLs" e "Importar XML" (RF024) sem comportamento definido.

### 3.7 Marketplaces e integrações

#### `GET /api/integrations`
Objetivo: lista da tela Integrações com dados reais (RF028).
Response 200:
```json
[
  { "id": "uuid", "name": "Mercado Livre", "short": "ML", "type": "marketplace", "status": "conectado", "account": "Loja Beta Oficial", "last_sync": "2026-09-28T14:08:00-03:00", "simulated": true },
  { "id": "uuid", "name": "Telegram", "short": null, "type": "atendimento", "status": "conectado", "account": "@lojabeta_bot", "last_sync": null, "simulated": false }
]
```

#### `POST /api/marketplaces/connect`
Objetivo: "＋ Conectar canal" (RF026). Regras: RN019, RN020.
Request: `{ "marketplace": "Mercado Livre" }`
Response 201 — **MVP simulado** (conexão imediata):
```json
{ "integration_id": "uuid", "status": "conectado", "simulated": true, "sync_id": "uuid" }
```
Response 200 — **OAuth real [PLANEJADO]**:
```json
{ "authorization_url": "https://<marketplace>/authorization?client_id=...&redirect_uri=...&state=..." }
```
Códigos: 200/201, 401, 404 (marketplace desconhecido), 409 (`CANAL_JA_CONECTADO`).

#### `GET /api/marketplaces/oauth/callback` — [PLANEJADO]
Parâmetros: `code`, `state`. Troca o `code` pelo `access_token`, salva a integração e inicia a importação (fluxograma). Response 302 para a tela Marketplaces. Códigos: 302, 400 (`state` inválido), 502.

#### `POST /api/integrations/{id}/sync`
Objetivo: "↻ Sincronizar" de um marketplace (RF027). Response 202 `{ "sync_id": "uuid" }`. Códigos: 202, 404, 409.

#### `POST /api/integrations/{id}/reconnect`
Objetivo: "Reconectar" (RF028). Resposta igual a `connect`. Códigos: 200/201, 404.

#### `DELETE /api/integrations/{id}`
Objetivo: "Desconectar" (RF028). Response 204. Códigos: 204, 404. Efeito sobre anúncios e pedidos já importados: Pendente de definição.

#### `PATCH /api/integrations/{id}` — Pendente de definição
Botões "Configurar" e "Gerenciar" sem opções definidas.

### 3.8 Relatórios

#### `GET /api/reports`
Objetivo: tela Relatórios completa (RF029). Regras: RN005, RN008.
Parâmetros: `period` = `7 dias` \| `30 dias` \| `3 meses` \| `custom`; `from`, `to` (obrigatórios se `custom` — Pendente de definição).
Response 200:
```json
{
  "summary": {
    "total_sales": { "value": 38420.00, "trend_pct": 18.4 },
    "orders": { "value": 284, "trend_pct": 12.1 },
    "average_ticket": { "value": 135.28, "trend_pct": 5.2 },
    "products_sold": { "value": 712, "trend_pct": 8.7 }
  },
  "sales_evolution": { "labels": ["22/09", "23/09", "24/09", "25/09", "26/09", "27/09", "28/09"], "values": [4000, 6300, 5600, 6800, 9600, 9500, 12300] },
  "sales_by_marketplace": [
    { "name": "Mercado Livre", "share_pct": 55 },
    { "name": "Shopee", "share_pct": 28 },
    { "name": "Magalu", "share_pct": 17 }
  ],
  "top_products": [
    { "position": 1, "name": "Tênis Runner Pro", "units": 32, "revenue": 2490.00 }
  ]
}
```
`top_products`: 4 itens (como no front). Critério de ordenação (unidades ou receita): Pendente de definição.

### 3.9 Notificações

#### `GET /api/notifications`
Objetivo: lista (RF030). Regras: RN030.
Parâmetros: `filter` = `todas` \| `nao_lidas` \| `pedidos` \| `estoque` \| `fiscal` \| `integracoes` (padrão `todas`).
Response 200:
```json
[
  { "id": "uuid", "type": "Estoque", "icon": "alert", "tone": "red", "title": "Garrafa Térmica sem estoque", "desc": "O anúncio foi pausado automaticamente no Mercado Livre, Shopee e Magalu.", "time": "Há 5 min", "created_at": "2026-09-28T14:05:00-03:00", "unread": true, "action": ["Ver estoque", "Estoque"] }
]
```
`action` = `[rótulo, página]`; a página deve ser um item de menu do front (`Início`, `Pedidos`, `Produtos`, `Estoque`, `Notas fiscais`, `Marketplaces`, `Integrações`, `Relatórios`, `Notificações`, `Configurações`, `Ajuda`).

#### `GET /api/notifications/summary`
Response 200: `{ "unread": 3, "received_today": 12, "critical": 2, "new_orders": 48, "delivered_telegram": 126 }`.

#### `PATCH /api/notifications/{id}/read`
Objetivo: marcar como lida ao clicar. Response 204. Códigos: 204, 404.

#### `POST /api/notifications/read-all`
Objetivo: "Marcar todas como lidas". Response 200: `{ "updated": 3 }`.

### 3.10 Configurações

#### `GET /api/settings/company` · `PUT /api/settings/company`
Objetivo: aba Empresa (RF032). Regras: RN004.
Body/Response:
```json
{
  "legal_name": "Loja Beta Comércio Ltda",
  "trade_name": "Loja Beta",
  "cnpj": "12.345.678/0001-90",
  "state_registration": "123.456.789.110",
  "tax_regime": "simples_nacional",
  "contact_email": "contato@lojabeta.com.br",
  "phone": "(11) 99999-1204",
  "address": "Rua das Flores, 120 · São Paulo/SP",
  "logo_url": null,
  "customer_since": "2025-03-01"
}
```
Códigos: 200, 401, 403, 409 (CNPJ de outra empresa), 422. Upload do logo: Pendente de definição.

#### `GET /api/settings/certificate` · `PUT /api/settings/certificate` — [SIMULADO]
Response: `{ "type": "A1", "holder": "Loja Beta", "valid_until": "2027-05-01", "days_left": 214, "status": "valido", "simulated": true }`. Upload de arquivo real: Pendente de definição.

#### `GET /api/settings/preferences` · `PUT /api/settings/preferences`
Objetivo: aba Preferências (RF034) e card "Onde receber alertas" (RF031). Regras: RN013, RN016, RN021, RN022, RN032.
```json
{
  "language": "pt-BR",
  "timezone": "America/Sao_Paulo",
  "auto_sync_stock": true,
  "pause_out_of_stock": true,
  "auto_import_orders": true,
  "check_interval_minutes": 5,
  "alerts": { "telegram": true, "email": true, "push": false, "daily_summary": true },
  "last_sync": "2026-09-28T14:08:00-03:00"
}
```
Códigos: 200, 401, 422 (`check_interval_minutes` ∉ {5, 15, 30, 60}).

#### `GET /api/settings/notifications` · `PUT /api/settings/notifications`
Objetivo: matriz Evento × Canal e card Telegram (RF035). Regras: RN031.
```json
{
  "telegram": { "linked": true, "username": "@lojabeta_bot", "since": "2026-09-12" },
  "events": [
    { "event": "novo_pedido", "telegram": true, "email": true, "push": false },
    { "event": "estoque_baixo", "telegram": true, "email": true, "push": true },
    { "event": "divergencia_estoque", "telegram": true, "email": true, "push": false },
    { "event": "nfe_rejeitada", "telegram": true, "email": true, "push": true },
    { "event": "resumo_diario", "telegram": true, "email": false, "push": false }
  ]
}
```

#### `GET /api/settings/team` · `POST /api/settings/team/invitations` — escopo Pendente de definição
Objetivo: aba Equipe (RF036).
GET Response: `{ "limit": 10, "members": [ { "id": "uuid", "name": "Pedro Alves", "email": "pedro@lojabeta.com.br", "role": "expedicao", "status": "convite_pendente" } ] }`
POST Request: `{ "email": "novo@lojabeta.com.br", "role": "operacao" }` → 201. Códigos: 409 (já membro), 422, 403 (limite do plano).

#### `GET /api/settings/security` · `PUT /api/settings/security` — Pendente de definição
`{ "two_factor_required": true, "expire_idle_sessions": false, "idle_hours": 8 }`

#### `GET /api/settings/plan` — [VISUAL], fora do escopo do MVP
`{ "name": "Pro", "price": 249.00, "renews_at": "2026-10-12", "usage": { "orders": [1204, 5000], "products": [312, 2000], "marketplaces": [3, 5], "users": [4, 10], "invoices": [842, 3000] }, "payment_method": "Pix automático", "last_invoice": { "date": "2026-09-12", "value": 249.00, "status": "paga" } }`

### 3.11 Assistente de IA

#### `POST /api/assistant/messages`
Objetivo: chat do assistente (RF038) e base do fluxo de voz (RF039). Regras: RN033.
Request:
```json
{ "message": "Quais produtos estão com estoque baixo?", "channel": "app", "input_mode": "text" }
```
`channel` ∈ {`app`, `telegram`}; `input_mode` ∈ {`text`, `voice`, `quick_action`}.

Response 200:
```json
{
  "reply": "Produtos com estoque baixo: Camiseta Essentials (2), Mochila Urban (4) e Fone Bluetooth (3).",
  "intent": "consultar_estoque_baixo",
  "data": [ { "product": "Camiseta Essentials", "stock": 2 } ],
  "action_executed": null
}
```
Códigos: 200, 401, 422 (mensagem vazia), 502 (Gemini indisponível — retornar `reply` padrão "Ainda estou aprendendo a responder isso…").

Intenções mínimas (ações rápidas existentes no front):

| Ação rápida | `intent` sugerido | Consulta |
|---|---|---|
| Consultar estoque | `consultar_estoque` | total de produtos, abaixo do mínimo, sem estoque |
| Vendas de hoje | `vendas_hoje` | valor, nº de pedidos, variação |
| Pedidos pendentes | `pedidos_pendentes` | aguardando + em separação (RN006) |
| Estoque baixo | `consultar_estoque_baixo` | produtos e quantidades |

Ações que o assistente pode **executar** (fluxograma: "executa ação"): Pendente de definição.

#### `GET /api/assistant/quick-actions`
Response 200: `["Consultar estoque", "Vendas de hoje", "Pedidos pendentes", "Estoque baixo"]` (opcional; hoje fixo no front).

#### Voz — [PLANEJADO]
Se a conversão fala↔texto ocorrer **no navegador**, o back-end usa apenas `POST /api/assistant/messages` com `input_mode: "voice"`. Se ocorrer **no back-end**, proposta:
`POST /api/assistant/voice` (multipart, campo `audio`) → `{ "transcript": "...", "reply": "...", "audio_url": "..." }`. Escolha: Pendente de definição (ver [integracoes.md](integracoes.md#4-reconhecimento-e-interação-por-voz)).

### 3.12 Telegram — [PLANEJADO]

#### `POST /api/telegram/webhook`
Objetivo: receber atualizações do bot (RF040). Chamado pelo Telegram, não pelo front. Validar o cabeçalho `X-Telegram-Bot-Api-Secret-Token`.
Request (resumo do objeto `Update` do Telegram): `{ "update_id": 1, "message": { "chat": { "id": 123456 }, "text": "vendas de hoje" } }`
Processamento: localizar `vinculo_telegram` pelo `chat.id` → mesmo fluxo de `POST /api/assistant/messages` com `channel: "telegram"` → responder com `sendMessage`.
Response 200 `{}` (sempre 200 para o Telegram não reenviar). Chat não vinculado: resposta orientando o vínculo — Pendente de definição.

#### `POST /api/telegram/link` — Pendente de definição
Gera o código/link de vínculo entre usuário e chat. Response: `{ "deep_link": "https://t.me/taylor_assistente_bot?start=<token>" }`.

### 3.13 Ajuda e busca

| Método e rota | Objetivo | Situação |
|---|---|---|
| `GET /api/help/faqs?q=&topic=` | Perguntas frequentes (RF041) | Pendente de definição — pode permanecer estático no front |
| `GET /api/status/services` | "Status dos serviços": `[{"name": "Mercado Livre", "status": "Operacional"}, ...]` | Pendente de definição |
| `GET /api/search?q=` | Busca global (RF042): `{ "products": [...], "orders": [...] }` | Pendente de definição |

---

## 4. Processos automáticos do back-end (sem endpoint)

| Processo | Gatilho | Regras |
|---|---|---|
| Baixa de estoque e propagação | Inserção de pedido | RN013 |
| Estorno de estoque | Pedido → `cancelado` | RN017 |
| Pausa de anúncios | Estoque central = 0 | RN016 |
| Detecção de divergência | Após cada sincronização | RN015 |
| Conferência periódica com marketplaces | A cada `check_interval_minutes` | RN022 |
| Importação automática de pedidos | Conferência periódica, se `auto_import_orders` | RN021 |
| Geração de notificações e envio (Telegram, e-mail, push) | Eventos da RN031 | RN030, RN031 |
| Resumo diário | Todos os dias às 08h (fuso da empresa) | RN032 |

## 5. Estrutura sugerida do projeto Python

```
backend/
├── app/
│   ├── main.py              # FastAPI, CORS, include_router(prefix="/api")
│   ├── core/                # config (.env), segurança (JWT), conexão Supabase
│   ├── routers/             # auth, dashboard, channels, products, orders, stock,
│   │                        # invoices, marketplaces, integrations, reports,
│   │                        # notifications, settings, assistant, telegram, help
│   ├── schemas/             # modelos Pydantic (request/response)
│   ├── services/            # regras de negócio (estoque, fiscal, sync, notificações)
│   ├── adapters/            # gemini.py, telegram.py, marketplaces/simulador.py,
│   │                        # fiscal/simulador.py
│   └── jobs/                # conferência periódica, resumo diário
└── requirements.txt
```
Sugestão apenas organizacional; a equipe pode adaptar.
