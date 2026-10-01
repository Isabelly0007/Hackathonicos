/* =====================================================================
   TAYLOR - javascript.js
   Como editar:
   1. CONFIG      -> liga/desliga a conexão com o backend (useApi).
   2. DADOS       -> textos, números, produtos e pedidos de exemplo.
   3. api         -> funções que buscam dados. Com useApi = true elas
                     chamam o seu backend (FastAPI) e, se falhar, usam
                     os dados de exemplo.
   4. TELAS       -> uma função por página (dashboard, produtos...).
   5. EVENTOS     -> cliques, troca de página, tema, chat.
   ===================================================================== */

/* ---------- 1. CONFIG ---------- */
// Aberto na própria máquina (localhost, 127.0.0.1 ou dois cliques no arquivo): ambiente de desenvolvimento.
const EM_LOCALHOST = ["localhost", "127.0.0.1", ""].includes(location.hostname);
const CONFIG = {
  useApi: true, // true = usa o backend (FastAPI); false = só os dados de exemplo abaixo
  local: EM_LOCALHOST, // só em localhost o login vem preenchido com o usuário de teste
  // Publicado (ex.: Render) ou aberto pelo backend (porta 8000): mesma origem, "/api".
  // Aberto como arquivo ou por outro servidor local (ex.: Live Server): aponta para o backend na porta 8000.
  apiBase: location.protocol.startsWith("http") && (!EM_LOCALHOST || location.port === "8000") ? "/api" : "http://localhost:8000/api",
  logo: "img/logo.svg", // logo usada no sistema todo (login, sidebar, topbar, chat)
  splashMin: { abertura: 2500, carregamento: 3000 }, // tempo mínimo (ms) da tela de carregamento
  brand: "Taylor",
  // logos dos marketplaces (arquivos dentro da pasta img/)
  marketLogos: {
    "Mercado Livre": "img/logo_mercadolivre.png",
    Shopee: "img/logo_shopee.png",
    Magalu: "img/logo_magalu.webp",
    "TikTok Shop": "img/logo_tiktokshop.avif",
  },
  telegram: "https://t.me/EstoqueLojas_bot", // link do bot/canal no Telegram
  supportEmail: "suporte@taylor.com.br",
};

/* ---------- 2. DADOS DE EXEMPLO (substituíveis por API) ---------- */
const currentUser = { name: "Taylor", company: "Loja Beta", initials: "TL" };

const pages = [
  { label: "Início", icon: "home" },
  { label: "Pedidos", icon: "clipboard" },
  { label: "Produtos", icon: "package" },
  { label: "Estoque", icon: "stock" },
  { label: "Notas fiscais", icon: "receipt" },
  { label: "Marketplaces", icon: "network" },
  { label: "Integrações", icon: "plug" },
  { label: "Relatórios", icon: "barchart" },
];

const periods = ["Hoje", "7 dias", "30 dias"];
const rangeLabels = { Hoje: "Hoje", "7 dias": "Últimos 7 dias", "30 dias": "Últimos 30 dias" };

const sparkA = [3, 3.2, 3.6, 4, 4.4, 5, 5.6];
const sparkRed = [6, 5.4, 5.8, 4.6, 5, 3.8, 3.2];
const sparkFlat = [4, 4, 4.2, 4, 4.4, 4.2, 4.4];

const dashboardStats = {
  Hoje: [
    { label: "Vendas", value: "R$ 7.320,50", trend: "↑ 18%", caption: "vs. período anterior", icon: "dollar", accent: "green", spark: [3, 4, 3.4, 5, 4.4, 6, 7] },
    { label: "Pedidos", value: "48", trend: "↑ 12%", caption: "vs. período anterior", icon: "cart", accent: "blue", spark: [2, 3, 2.6, 4, 3.8, 5, 6] },
    { label: "Produtos", value: "312", trend: "↑ 5%", caption: "cadastrados", icon: "tag", accent: "purple", spark: sparkA },
    { label: "Estoque crítico", value: "8", trend: "↓ 3%", caption: "produtos abaixo do mínimo", icon: "alert", accent: "red", tone: "danger", spark: sparkRed },
    { label: "Marketplaces conectados", value: "3", trend: "100% ativos", icon: "share", accent: "blue", spark: sparkFlat },
  ],
  "7 dias": [
    { label: "Vendas", value: "R$ 54.100,00", trend: "↑ 18%", caption: "vs. período anterior", icon: "dollar", accent: "green", spark: [3, 4, 3.6, 4.6, 5.4, 5.2, 7] },
    { label: "Pedidos", value: "284", trend: "↑ 12%", caption: "vs. período anterior", icon: "cart", accent: "blue", spark: [2, 3.4, 3, 4.2, 4.8, 5.6, 6.4] },
    { label: "Produtos", value: "312", trend: "↑ 5%", caption: "cadastrados", icon: "tag", accent: "purple", spark: sparkA },
    { label: "Estoque crítico", value: "8", trend: "↓ 3%", caption: "produtos abaixo do mínimo", icon: "alert", accent: "red", tone: "danger", spark: sparkRed },
    { label: "Marketplaces conectados", value: "3", trend: "100% ativos", icon: "share", accent: "blue", spark: sparkFlat },
  ],
  "30 dias": [
    { label: "Vendas", value: "R$ 152.860,30", trend: "↑ 22%", caption: "vs. período anterior", icon: "dollar", accent: "green", spark: [2, 3.4, 4, 3.8, 5.2, 6, 7.4] },
    { label: "Pedidos", value: "1.204", trend: "↑ 15%", caption: "vs. período anterior", icon: "cart", accent: "blue", spark: [2.4, 3, 3.8, 3.6, 4.8, 5.6, 6.6] },
    { label: "Produtos", value: "312", trend: "↑ 5%", caption: "cadastrados", icon: "tag", accent: "purple", spark: sparkA },
    { label: "Estoque crítico", value: "8", trend: "↓ 3%", caption: "produtos abaixo do mínimo", icon: "alert", accent: "red", tone: "danger", spark: sparkRed },
    { label: "Marketplaces conectados", value: "3", trend: "100% ativos", icon: "share", accent: "blue", spark: sparkFlat },
  ],
};

const salesByChannel = {
  Hoje: {
    labels: ["08h", "10h", "12h", "14h", "16h", "18h", "20h"],
    yMax: 6000,
    series: [
      { name: "Mercado Livre", cls: "blue", values: [300, 800, 1400, 2100, 2800, 3400, 3900] },
      { name: "Shopee", cls: "red", values: [200, 500, 900, 1300, 1700, 2000, 2300] },
      { name: "Magalu", cls: "purple", values: [100, 250, 450, 650, 850, 1000, 1120] },
    ],
  },
  "7 dias": {
    labels: ["22/09", "23/09", "24/09", "25/09", "26/09", "27/09", "28/09"],
    yMax: 6000,
    series: [
      { name: "Mercado Livre", cls: "blue", values: [2200, 3100, 3200, 3500, 4600, 4800, 5700] },
      { name: "Shopee", cls: "red", values: [1400, 2100, 1700, 2300, 3400, 3000, 4300] },
      { name: "Magalu", cls: "purple", values: [400, 1100, 700, 1000, 1600, 1700, 2300] },
    ],
  },
  "30 dias": {
    labels: ["01/09", "05/09", "10/09", "15/09", "20/09", "25/09", "28/09"],
    yMax: 30000,
    series: [
      { name: "Mercado Livre", cls: "blue", values: [9000, 12000, 14500, 13800, 18200, 21000, 24500] },
      { name: "Shopee", cls: "red", values: [6000, 8200, 9100, 10400, 12800, 14200, 16900] },
      { name: "Magalu", cls: "purple", values: [2500, 3800, 4200, 5100, 6400, 7300, 8800] },
    ],
  },
};

const orderStatuses = [
  { label: "Aguardando", value: 12, color: "#4FC3DC" },
  { label: "Em separação", value: 18, color: "#FFC24B" },
  { label: "Em transporte", value: 10, color: "#499cff" },
  { label: "Entregue", value: 46, color: "#3DDC97" },
  { label: "Cancelado", value: 4, color: "#F0416C" },
];

const stockAlerts = [
  { name: "Camiseta Essentials", desc: "2 unidades restantes", critical: true },
  { name: "Garrafa Térmica", desc: "Sem estoque", critical: true },
  { name: "Mochila Urban", desc: "4 unidades restantes", critical: false },
  { name: "Fone Bluetooth", desc: "3 unidades restantes", critical: false },
];

const connectedChannels = [
  { name: "Mercado Livre", short: "ML", products: 128, lastSync: "2 min atrás" },
  { name: "Shopee", short: "S", products: 96, lastSync: "3 min atrás" },
  { name: "Magalu", short: "M", products: 88, lastSync: "5 min atrás" },
];

const products = [
  ["Tênis Runner Pro", "TEN001", "24", "R$ 249,90", "Ativo", "Canais", "22/09 14:33"],
  ["Mochila Urban", "MOC012", "5", "R$ 189,90", "Estoque baixo", "Canais", "22/09 14:28"],
  ["Camiseta Essentials", "CAM034", "52", "R$ 79,90", "Ativo", "Canais", "22/09 14:20"],
  ["Garrafa Térmica", "GAR203", "0", "R$ 99,90", "Sem estoque", "Canais", "22/09 14:15"],
  ["Fone Bluetooth", "FON045", "12", "R$ 129,90", "Ativo", "Canais", "22/09 14:10"],
];

const orders = [
  ["#200014", "Mercado Livre", "22/09 14:10", "Mariana S.", "2", "R$ 349,80", "Em separação"],
  ["#200013", "Shopee", "22/09 13:42", "Carlos M.", "1", "R$ 129,90", "Aguardando"],
  ["#200012", "Magalu", "22/09 11:20", "Juliana P.", "3", "R$ 79,90", "Em transporte"],
  ["#200011", "Mercado Livre", "22/09 10:35", "Rafael T.", "2", "R$ 249,90", "Entregue"],
  ["#200010", "Shopee", "21/09 18:33", "Camila R.", "1", "R$ 79,90", "Cancelado"],
];

const stock = [
  ["Tênis Runner Pro", "TEN001", "24", "10", "24", "24", "24", "—", "Sincronizado"],
  ["Mochila Urban", "MOC012", "12", "8", "12", "10", "12", "—", "Divergência detectada"],
  ["Camiseta Essentials", "CAM034", "52", "10", "52", "52", "52", "—", "Sincronizado"],
  ["Garrafa Térmica", "GAR203", "0", "6", "0", "0", "0", "—", "Sem estoque"],
  ["Fone Bluetooth", "FON045", "8", "10", "8", "8", "8", "—", "Estoque baixo"],
];

const invoices = [
  ["NF-e 004821", "#200014", "Mercado Livre", "Mariana S.", "R$ 349,80", "Autorizada", "22/09 14:12"],
  ["NF-e 004820", "#200013", "Shopee", "Carlos M.", "R$ 129,90", "Processando", "22/09 13:44"],
  ["NF-e 004819", "#200012", "Magalu", "Juliana P.", "R$ 79,90", "Autorizada", "22/09 11:22"],
  ["Rascunho", "#200011", "Mercado Livre", "Rafael T.", "R$ 249,90", "Aguardando emissão", "22/09 10:38"],
  ["NF-e 004817", "#200009", "Shopee", "Beatriz A.", "R$ 189,90", "Rejeitada", "21/09 17:20"],
];

const marketplaceData = [
  ["Mercado Livre", "ML", "128", "42", "R$ 4.230,40"],
  ["Shopee", "S", "96", "31", "R$ 1.840,10"],
  ["Magalu", "M", "88", "17", "R$ 1.250,00"],
  ["TikTok Shop", "TT", "64", "23", "R$ 980,50"],
];

const chatAnswers = {
  "Consultar estoque": "Você tem 312 produtos cadastrados. 8 estão abaixo do mínimo e 1 está sem estoque (Garrafa Térmica).",
  "Vendas de hoje": "Hoje você vendeu R$ 7.320,50 em 48 pedidos, 18% acima do período anterior.",
  "Pedidos pendentes": "Há 30 pedidos pendentes: 12 aguardando e 18 em separação.",
  "Estoque baixo": "Produtos com estoque baixo: Camiseta Essentials (2), Mochila Urban (4) e Fone Bluetooth (3).",
};

const notifications = [
  { id: 1, type: "Estoque", icon: "alert", tone: "red", title: "Garrafa Térmica sem estoque", desc: "O anúncio foi pausado automaticamente no Mercado Livre, Shopee e Magalu.", time: "Há 5 min", unread: true, action: ["Ver estoque", "Estoque"] },
  { id: 2, type: "Pedidos", icon: "cart", tone: "blue", title: "Novo pedido #200014", desc: "Mariana S. comprou 2 itens no Mercado Livre · R$ 349,80.", time: "Há 12 min", unread: true, action: ["Ver pedido", "Pedidos"] },
  { id: 3, type: "Fiscal", icon: "receipt", tone: "red", title: "NF-e 004817 rejeitada", desc: "SEFAZ: CFOP incompatível com a UF de destino. Revise antes de reenviar.", time: "Há 1 h", unread: true, action: ["Revisar nota", "Notas fiscais"] },
  { id: 4, type: "Estoque", icon: "stock", tone: "yellow", title: "Divergência na Mochila Urban", desc: "A Shopee mostra 10 unidades, mas o estoque central tem 12.", time: "Há 2 h", unread: false },
  { id: 5, type: "Integrações", icon: "refresh", tone: "green", title: "Sincronização concluída", desc: "312 produtos atualizados em 3 marketplaces sem erros.", time: "Há 3 h", unread: false },
  { id: 6, type: "Integrações", icon: "telegram", tone: "telegram", title: "Telegram vinculado", desc: "Os alertas da operação agora também chegam no seu Telegram.", time: "Ontem", unread: false },
  { id: 7, type: "Pedidos", icon: "cart", tone: "purple", title: "Pedido #200010 cancelado", desc: "Camila R. cancelou a compra na Shopee. O estoque foi devolvido.", time: "Ontem", unread: false },
  { id: 8, type: "Fiscal", icon: "receipt", tone: "green", title: "42 NF-e autorizadas", desc: "Todas as notas de ontem foram autorizadas e o XML enviado aos canais.", time: "Ontem", unread: false },
];
const notifFilters = ["Todas", "Não lidas", "Pedidos", "Estoque", "Fiscal", "Integrações"];

const settingsTabs = [
  { label: "Empresa", icon: "building" },
  { label: "Preferências", icon: "sliders" },
  { label: "Notificações", icon: "bell" },
  { label: "Equipe", icon: "users" },
  { label: "Plano", icon: "card" },
];

const notifEvents = [
  ["Novo pedido", "Sempre que um marketplace enviar um pedido", [true, true, false]],
  ["Estoque baixo", "Quando um produto atingir o estoque mínimo", [true, true, true]],
  ["Divergência de estoque", "Diferenças entre os canais e o estoque central", [true, true, false]],
  ["NF-e rejeitada", "Quando a SEFAZ rejeitar uma nota fiscal", [true, true, true]],
  ["Resumo diário", "Vendas e pendências do dia anterior, às 08h", [true, false, false]],
];

const teamMembers = [
  ["Isabela Franco", "isabela@lojabeta.com.br", "Administradora", "Ativo"],
  ["Rafael Lima", "rafael@lojabeta.com.br", "Operação", "Ativo"],
  ["Camila Souza", "camila@lojabeta.com.br", "Financeiro", "Ativo"],
  ["Pedro Alves", "pedro@lojabeta.com.br", "Expedição", "Convite pendente"],
];

const helpTopics = [
  { label: "Primeiros passos", cat: "Primeiros passos", icon: "home", tone: "blue", desc: "Configure a conta e conecte seus canais" },
  { label: "Estoque", cat: "Estoque", icon: "stock", tone: "yellow", desc: "Sincronização, mínimos e divergências" },
  { label: "Notas fiscais", cat: "NF-e", icon: "receipt", tone: "purple", desc: "Emissão em lote e rejeições da SEFAZ" },
  { label: "Telegram", cat: "Telegram", icon: "telegram", tone: "telegram", desc: "Alertas e assistente direto no app" },
];

const faqs = [
  { cat: "Primeiros passos", q: "Como conecto meu primeiro marketplace?", a: "Acesse Marketplaces › Conectar canal, escolha o canal e autorize o acesso com a sua conta de vendedor. Produtos e pedidos são importados automaticamente em poucos minutos." },
  { cat: "Primeiros passos", q: "Posso gerenciar mais de um CNPJ?", a: "Sim. No Plano Pro você pode adicionar até 3 CNPJs e alternar entre eles pelo menu da empresa, no canto inferior da barra lateral." },
  { cat: "Estoque", q: "O estoque é sincronizado automaticamente?", a: "Sim. A cada venda o estoque central é atualizado e a nova quantidade é enviada para todos os canais. Você pode ajustar o intervalo em Configurações › Preferências." },
  { cat: "Estoque", q: "O que significa “Divergência detectada”?", a: "A quantidade publicada em algum canal está diferente do seu estoque central. Clique em Revisar divergências para escolher qual valor deve prevalecer e sincronizar." },
  { cat: "NF-e", q: "Como emito notas fiscais em lote?", a: "Em Notas fiscais, clique em Emitir NF-e em lote. A plataforma valida NCM, CFOP e dados do cliente antes de enviar à SEFAZ e devolve o XML ao marketplace." },
  { cat: "NF-e", q: "O que fazer quando uma NF-e é rejeitada?", a: "Abra a nota rejeitada para ver o motivo informado pela SEFAZ. Corrija o dado indicado (geralmente o cadastro do produto ou do destinatário) e reenvie." },
  { cat: "Telegram", q: "Como recebo alertas no Telegram?", a: "Em Configurações › Notificações, clique em Abrir no Telegram e inicie a conversa com o bot. Depois escolha quais eventos devem ser enviados para lá." },
  { cat: "Telegram", q: "Posso consultar minha operação pelo Telegram?", a: "Sim. O assistente responde perguntas como “vendas de hoje” ou “estoque baixo” direto na conversa, com os mesmos dados do painel." },
];

const serviceStatus = [
  ["Mercado Livre", "Operacional"],
  ["Shopee", "Operacional"],
  ["Magalu", "Operacional"],
  ["SEFAZ (NF-e)", "Operacional"],
  ["Bot do Telegram", "Operacional"],
];

/* ---------- 3. API (endpoints do backend — docs/api-backend.md) ----------
   Leituras (apiGet): se o backend falhar, usam os dados de exemplo.
   Escritas (apiSend): devolvem { ok, status, data } para a tela tratar o erro. */
const TOKEN_KEY = "taylor.token";
const storage = {
  get: () => localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY),
  set: (token, remember) => (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token),
  clear: () => (localStorage.removeItem(TOKEN_KEY), sessionStorage.removeItem(TOKEN_KEY)),
};

function authHeaders() {
  const token = storage.get();
  return token ? { Authorization: "Bearer " + token } : {};
}

function sessionExpired(res) {
  if (res.status !== 401 || !state.loggedIn) return false;
  storage.clear();
  state.loggedIn = false;
  render();
  window.setTimeout(() => {
    const error = $("#login-error");
    if (error) (error.textContent = "Sua sessão expirou. Entre novamente."), (error.hidden = false);
  });
  return true;
}

async function apiGet(path, fallback) {
  if (!CONFIG.useApi) return fallback;
  try {
    const res = await fetch(CONFIG.apiBase + path, { headers: authHeaders() });
    if (sessionExpired(res)) return fallback;
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  } catch (error) {
    console.warn("API indisponível em " + path + ", usando dados de exemplo.", error);
    return fallback;
  }
}

async function apiSend(method, path, body) {
  if (!CONFIG.useApi) return { ok: false, status: 0, data: { detail: "Backend desligado (CONFIG.useApi = false)." } };
  try {
    const res = await fetch(CONFIG.apiBase + path, {
      method,
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (sessionExpired(res)) return { ok: false, status: 401, data: null };
    const data = res.status === 204 ? null : await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  } catch (error) {
    return { ok: false, status: 0, data: { detail: "Não foi possível falar com o servidor. Verifique se o backend está rodando." } };
  }
}

// Mensagem legível a partir do formato de erro do backend ({ detail, code, fields }).
function apiError(res, fallback = "Não foi possível concluir a ação.") {
  const data = res.data || {};
  const fields = data.fields ? Object.values(data.fields).join(" ") : "";
  return [data.detail || fallback, fields].filter(Boolean).join(" ");
}

const q = (params) => {
  const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")).toString();
  return s ? "?" + s : "";
};

const api = {
  // Compatibilidade (formato dos dados de exemplo). ids=1 acrescenta o id no fim de cada linha.
  stats: (period) => apiGet("/dashboard/stats" + q({ period }), dashboardStats[period]),
  sales: (range) => apiGet("/dashboard/sales" + q({ range }), salesByChannel[range]),
  orderStatuses: () => apiGet("/dashboard/order-statuses", orderStatuses),
  stockAlerts: () => apiGet("/dashboard/stock-alerts", stockAlerts),
  channels: () => apiGet("/channels", connectedChannels),
  products: (status) => apiGet("/products" + q({ status, ids: 1 }), products),
  orders: (status) => apiGet("/orders" + q({ status, ids: 1 }), orders),
  stock: () => apiGet("/stock", stock),
  invoices: (status) => apiGet("/invoices" + q({ status, ids: 1 }), invoices),
  marketplaces: () => apiGet("/marketplaces", marketplaceData),
  // Contratos novos (sem dado de exemplo: a tela usa os valores fixos antigos se vier null).
  me: () => apiGet("/auth/me", null),
  productsSummary: () => apiGet("/products/summary", null),
  product: (id) => apiGet("/products/" + id, null),
  ordersSummary: () => apiGet("/orders/summary", null),
  order: (id) => apiGet("/orders/" + id, null),
  stockSummary: () => apiGet("/stock/summary", null),
  divergences: () => apiGet("/stock/divergences", []),
  invoicesSummary: () => apiGet("/invoices/summary", null),
  fiscalHealth: () => apiGet("/invoices/fiscal-health", null),
  invoice: (id) => apiGet("/invoices/" + id, null),
  integrations: () => apiGet("/integrations", null),
  sync: (id) => apiGet("/syncs/" + id, null),
  reports: (period, from, to) => apiGet("/reports" + q({ period, from, to }), null),
  notifications: (filter) => apiGet("/notifications" + q({ filter }), null),
  notificationsSummary: () => apiGet("/notifications/summary", null),
  settings: (tab) => apiGet("/settings/" + tab, null),
};

// Acompanha uma sincronização até terminar (GET /syncs/{id}).
async function waitSync(syncId, tries = 30) {
  for (let i = 0; i < tries; i++) {
    const s = await api.sync(syncId);
    if (s && s.status !== "em_andamento") return s;
    await new Promise((resolve) => window.setTimeout(resolve, 600));
  }
  return null;
}

const brl = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const intBR = (v) => Number(v || 0).toLocaleString("pt-BR");
const trendText = (pct) => (pct === null || pct === undefined ? "—" : `${pct < 0 ? "↓" : "↑"} ${Math.abs(pct).toLocaleString("pt-BR")}%`);

function timeAgo(iso) {
  if (!iso) return "nunca";
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  if (min < 1440) return `há ${Math.floor(min / 60)} h`;
  return `há ${Math.floor(min / 1440)} dias`;
}

/* ---------- Ícones (SVG) ---------- */
const iconPaths = {
  dollar: '<path d="M12 3v18"/><path d="M16.5 7.5C15.8 6.4 14.2 5.8 12 5.8c-2.6 0-4 1.1-4 2.7 0 4 8.4 1.8 8.4 6 0 1.7-1.6 2.9-4.4 2.9-2.3 0-4-.7-4.8-2"/>',
  cart: '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M3 4h2.5l2.2 10.2h10.1L20 7H6.4"/>',
  tag: '<path d="M3 12V4h8l9.5 9.5a1.5 1.5 0 0 1 0 2.1l-5.4 5.4a1.5 1.5 0 0 1-2.1 0L3 12z"/><circle cx="7.5" cy="8.5" r="1.2"/>',
  alert: '<path d="M12 3.5 2.8 19.5h18.4z"/><path d="M12 10v4.5"/><path d="M12 17.2v.1"/>',
  share: '<circle cx="6" cy="12" r="2.2"/><circle cx="17.5" cy="6" r="2.2"/><circle cx="17.5" cy="18" r="2.2"/><path d="m8 11 7.5-3.9M8 13l7.5 3.9"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.5-3.5L4 9"/><path d="M4 4v5h5"/><path d="M4 13a8 8 0 0 0 14.5 3.5L20 15"/><path d="M20 20v-5h-5"/>',
  box: '<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  home: '<path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/>',
  clipboard: '<rect x="5" y="4.5" width="14" height="16" rx="2.5"/><path d="M9 4.5h6v2.5H9z"/><path d="M8.5 12h7M8.5 16h4.5"/>',
  package: '<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 10h16M9 5v5M15 5v5"/>',
  stock: '<rect x="4" y="9" width="16" height="11" rx="2"/><path d="M7 9V6.5A1.5 1.5 0 0 1 8.5 5h7A1.5 1.5 0 0 1 17 6.5V9"/><path d="M10 13.5h4"/>',
  receipt: '<path d="M6 3.5h12v17l-3-1.8-3 1.8-3-1.8-3 1.8z"/><path d="M9 8.5h6M9 12h6"/>',
  network: '<circle cx="6" cy="7" r="2"/><circle cx="18" cy="7" r="2"/><circle cx="6" cy="17" r="2"/><circle cx="18" cy="17" r="2"/><path d="M8 7h8M8 17h8M6 9v6M18 9v6"/>',
  plug: '<path d="M9 3v5M15 3v5M6.5 8h11v3.5a5.5 5.5 0 0 1-11 0z"/><path d="M12 17v4"/>',
  barchart: '<rect x="4" y="4" width="16" height="16" rx="2.5"/><path d="M8.5 16v-4M12 16V8.5M15.5 16v-2.5"/>',
  bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 21h4"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18"/>',
  help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.7a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.2 1-1.2 1.9"/><path d="M12 16.8v.1"/>',
  telegram: '<path d="M21 4.5 3.2 11.4c-.8.3-.8 1.4 0 1.7l4.4 1.6 1.7 5.2c.2.7 1.1.9 1.6.4l2.5-2.4 4.4 3.3c.6.4 1.4.1 1.6-.6L22 5.6c.2-.8-.5-1.4-1-1.1z"/><path d="m7.6 14.7 9.4-6.4-6.9 7.3"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="m4 7 8 6 8-6"/>',
  users: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><path d="M16 5.6a3 3 0 0 1 0 5.8M17.5 14.8c1.7.6 2.7 2.2 3 4.7"/>',
  building: '<rect x="4.5" y="3.5" width="15" height="17" rx="2"/><path d="M9 8h1.5M13.5 8H15M9 12h1.5M13.5 12H15M10.5 20.5v-4h3v4"/>',
  sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  card: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 15h4"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6A1.5 1.5 0 0 0 14 4.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
};

function icon(name) {
  return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (iconPaths[name] || "") + "</svg>";
}

/* ---------- Estado da aplicação ---------- */
const state = {
  loggedIn: false,
  authMode: "login", // "login" | "register" | "forgot" (esqueci a senha) | "reset" (criar nova senha)
  recovery: {}, // dados do "Esqueci minha senha": { email, sent, demoLink, token, checking, invalid }
  loginNotice: "", // aviso verde no login (ex.: senha alterada)
  page: "Início",
  light: false,
  period: "Hoje",
  range: "7 dias",
  syncing: false,
  synced: false,
  notifFilter: "Todas",
  settingsTab: "Empresa",
  helpQuery: "",
  helpTopic: "",
  // Filtros das tabelas (valores enviados ao backend) e período dos relatórios.
  productsStatus: "",
  ordersStatus: "",
  invoicesStatus: "",
  reportsPeriod: "7 dias",
  reportsFrom: "",
  reportsTo: "",
  notifList: null, // notificações vindas da API (null = usa os dados de exemplo)
  unread: null,
  demo: null, // conta Demo: { email, password, expires_at } para o card "Seus dados de acesso"
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

/* ---------- Componentes reutilizáveis ---------- */
function button(label, kind = "primary", attrs = "") {
  return `<button class="btn ${kind}" type="button" ${attrs}>${label}</button>`;
}

function logo(compact = false) {
  return `<div class="brand ${compact ? "compact" : ""}"><img src="${CONFIG.logo}" alt="Logo ${CONFIG.brand}" />${compact ? "" : `<strong>${CONFIG.brand}</strong>`}</div>`;
}

function pageHeader(title, subtitle, actions = "") {
  return `<header class="page-header"><div><div class="page-title">${title}</div><p>${subtitle}</p></div>${actions ? `<div class="header-actions">${actions}</div>` : ""}</header>`;
}

const accentColors = { blue: "#499cff", purple: "#FFC24B", red: "#F0416C", green: "#3DDC97" };
let uid = 0;

function smoothPath(points) {
  if (points.length < 2) return "";
  let d = `M${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

function sparkline(data, color) {
  const id = "spark-" + ++uid;
  const w = 120;
  const h = 40;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const points = data.map((v, i) => [(i / (data.length - 1)) * w, h - 3 - ((v - min) / (max - min || 1)) * (h - 10)]);
  const line = smoothPath(points);
  return `<svg class="spark-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${color}" stop-opacity=".38"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
    <path d="${line} L${w},${h} L0,${h} Z" fill="url(#${id})"/>
    <path d="${line}" fill="none" stroke="${color}" stroke-width="1.6" vector-effect="non-scaling-stroke"/>
  </svg>`;
}

function statCard(s) {
  const tint = s.accent || (s.tone === "danger" ? "red" : "blue");
  const spark = s.spark || [3, 4, 3.6, 5, 4.5, 6];
  const trendClass = s.trend.startsWith("↓") ? "down" : "up";
  return `<article class="card stat ${s.tone || ""} accent-${tint}">
    <div class="stat-top"><span class="stat-icon">${icon(s.icon || "chart")}</span><span>${s.label}</span></div>
    <strong>${s.value}</strong>
    <small class="${trendClass}">${s.trend}</small>
    ${s.caption ? `<em class="stat-caption">${s.caption}</em>` : ""}
    ${sparkline(spark, accentColors[tint === "green" ? "blue" : tint])}
  </article>`;
}

function statsRow(list, columns = "five") {
  return `<div class="stats ${columns}">${list.map(statCard).join("")}</div>`;
}

function formatAxis(value) {
  return value >= 1000 ? `R$ ${Math.round(value / 1000)} mil` : `R$ ${Math.round(value)}`;
}

function salesChart(data, onlyFirst = false) {
  const series = onlyFirst ? data.series.slice(0, 1) : data.series;
  const W = 700;
  const base = 190;
  const span = 165;
  const x = (i) => (i / (data.labels.length - 1)) * W;
  const y = (v) => base - (v / data.yMax) * span;
  const ticks = [1, 2 / 3, 1 / 3, 0].map((t) => t * data.yMax);
  const lines = series.map((s) => ({ ...s, d: smoothPath(s.values.map((v, i) => [x(i), y(v)])) }));
  const areaId = "sales-area-" + ++uid;
  return `<div class="chart-wrap">
    <div class="y-labels">${ticks.map((t) => `<span>${formatAxis(t)}</span>`).join("")}</div>
    <svg viewBox="0 0 700 220" role="img" aria-label="Gráfico de vendas">
      <defs><linearGradient id="${areaId}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#499cff" stop-opacity=".32"/><stop offset="1" stop-color="#499cff" stop-opacity="0"/></linearGradient></defs>
      <path class="grid" d="M0 25H700M0 80H700M0 135H700M0 190H700"/>
      <path class="chart-area" d="${lines[0].d} L${W},${base} L0,${base} Z" fill="url(#${areaId})"/>
      ${lines.map((s) => `<path class="line chart-line ${s.cls}" d="${s.d}" pathLength="1"/>`).join("")}
    </svg>
    <div class="x-labels">${data.labels.map((l) => `<span>${l}</span>`).join("")}</div>
  </div>
  ${onlyFirst ? "" : `<div class="legend">${series.map((s) => `<span class="${s.cls}-dot">${s.name}</span>`).join("")}</div>`}`;
}

function donut(items) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const gap = 1.2;
  let start = 0;
  const circles = items
    .map((item) => {
      const length = Math.max((item.value / total) * 100 - gap, 0);
      const c = `<circle class="donut-seg" cx="60" cy="60" r="46" pathLength="100" stroke="${item.color}" stroke-dasharray="${length} ${100 - length}" stroke-dashoffset="${-start}" transform="rotate(-90 60 60)"/>`;
      start += (item.value / total) * 100;
      return c;
    })
    .join("");
  return `<div class="donut-svg">
    <svg viewBox="0 0 120 120" role="img" aria-label="Pedidos por status"><circle cx="60" cy="60" r="46" class="donut-track"/>${circles}</svg>
    <div class="donut-center"><strong>${total}</strong><span>pedidos</span></div>
  </div>`;
}

function marketImg(name) {
  return `<img src="${CONFIG.marketLogos[name]}" alt="${name}" loading="lazy" />`;
}

function marketplaceDots() {
  return `<div class="market-dots" aria-label="Mercado Livre, Shopee e Magalu"><span class="ml" title="Mercado Livre">${marketImg("Mercado Livre")}</span><span class="sh" title="Shopee">${marketImg("Shopee")}</span><span class="mg" title="Magalu">${marketImg("Magalu")}</span></div>`;
}

/* Animação de abertura do login: cometas convergem, o logo Taylor "acende" no centro
   e os marketplaces saem de dentro dele. Só toca na 1ª vez (state.heroPlayed). */
function heroStage() {
  const played = state.heroPlayed;
  state.heroPlayed = true;
  // se a tela de carregamento ainda está por cima, a animação espera ela sair (ver hideSplash)
  const waiting = !played && typeof splash !== "undefined" && splash.el && !splash.el.classList.contains("hide");
  const nodes = [
    ["Mercado Livre", 200],
    ["TikTok Shop", 140],
    ["Magalu", 340],
    ["Shopee", 40],
  ];
  const rx = 170, ry = 92;
  const sparks = [[-260, -150], [250, -130], [-40, 200]];
  const links = nodes
    .map(([, deg], i) => {
      const a = (deg * Math.PI) / 180;
      const x = Math.round(rx * Math.cos(a)), y = Math.round(ry * Math.sin(a));
      const len = Math.round(Math.hypot(x, y)), ang = ((Math.atan2(y, x) * 180) / Math.PI).toFixed(1);
      return { x, y, len, ang, i };
    });
  return `<div class="taylor-stage ${played ? "done" : waiting ? "wait" : ""}" role="img" aria-label="Logo ${CONFIG.brand} conectando Mercado Livre, TikTok Shop, Magalu e Shopee">
    ${sparks.map(([sx, sy], i) => `<i class="ts-spark" style="--sx:${sx}px;--sy:${sy}px;--r:${(Math.atan2(-sy, -sx) * 180 / Math.PI).toFixed(1)}deg;--i:${i}"></i>`).join("")}
    <i class="ts-flash"></i><i class="ts-ring"></i><i class="ts-ring r2"></i>
    ${links.map((l) => `<i class="ts-link" style="--len:${l.len}px;--ang:${l.ang}deg;--i:${l.i}"></i>`).join("")}
    <span class="ts-core"><img src="${CONFIG.logo}" alt="" /></span>
    ${links.map((l, k) => `<span class="ts-node" style="--x:${l.x}px;--y:${l.y}px;--i:${l.i}"><span class="ts-badge" style="--f:${k}">${marketImg(nodes[k][0])}</span></span>`).join("")}
  </div>
  <p class="ts-caption"><strong>Seu comércio, sem fronteiras</strong></p>`;
}

// items: textos simples (só destaque visual) ou [rótulo, valor] com filterKey (filtra no backend).
function filterTabs(items, filterKey = "", active = "") {
  return `<div class="tabs">${items
    .map((item, i) => {
      const [label, value] = Array.isArray(item) ? item : [item, undefined];
      const on = filterKey ? value === active : i === 0;
      const attrs = filterKey ? ` data-filter="${filterKey}" data-value="${value}"` : "";
      return `<button type="button" class="${on ? "active" : ""}"${attrs}>${label}</button>`;
    })
    .join("")}</div>`;
}

// rowKind: "product" | "order" | "invoice" -> o botão ••• abre o detalhe da linha (id vem no fim da linha, via ?ids=1).
function dataTable(headers, rows, channelsIndex, statusIndex, rowKind = "") {
  const body = rows
    .map((row) => {
      const id = rowKind && row.length > headers.length ? row[headers.length] : "";
      const cells = row
        .slice(0, headers.length)
        .map((cell, index) => {
          if (index === channelsIndex) return `<td>${marketplaceDots()}</td>`;
          if (index === statusIndex) return `<td><span class="status ${cell.toLowerCase().replaceAll(" ", "-")}">${cell}</span></td>`;
          return `<td>${escapeHtml(cell)}</td>`;
        })
        .join("");
      const more = id ? ` data-row="${rowKind}" data-id="${id}"` : "";
      return `<tr>${cells}<td><button class="more" type="button" aria-label="Mais ações"${more}>•••</button></td></tr>`;
    })
    .join("");
  const empty = rows.length ? "" : `<tr><td colspan="${headers.length + 1}"><div class="empty-state">${icon("check")}<strong>Nada por aqui</strong><small>Nenhum registro neste filtro.</small></div></td></tr>`;
  return `<div class="table-scroll card"><table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}<th>Ações</th></tr></thead><tbody>${body}${empty}</tbody></table></div>`;
}

/* Modal (usa o elemento <dialog>). O conteúdo é HTML; os botões usam data-action. */
function openModal(title, body, actions = "") {
  let dialog = $("#modal");
  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.id = "modal";
    dialog.className = "card modal";
    ($("#app-shell") || document.body).appendChild(dialog);
  }
  dialog.innerHTML = `<div class="modal-head"><strong>${title}</strong><button type="button" data-action="close-modal" aria-label="Fechar">×</button></div>
    <div class="modal-body">${body}</div>${actions ? `<div class="form-actions">${actions}</div>` : ""}<div class="form-error" id="modal-error" hidden></div>`;
  if (!dialog.open) dialog.showModal();
  return dialog;
}

function closeModal() {
  const dialog = $("#modal");
  if (dialog && dialog.open) dialog.close();
}

function modalError(text) {
  const el = $("#modal-error");
  if (el) (el.textContent = text), (el.hidden = !text);
}

// Executa uma escrita, mostra erro no modal (ou toast) e recarrega a página em caso de sucesso.
async function runAction(method, path, body, okMessage, { reload = true, keepModal = false } = {}) {
  const res = await apiSend(method, path, body);
  if (!res.ok) {
    if ($("#modal") && $("#modal").open) modalError(apiError(res));
    else showToast(apiError(res), "error");
    return null;
  }
  searchCache.data = null; // a busca do topo recarrega com os dados novos
  if (!keepModal) closeModal();
  if (okMessage) showToast(okMessage);
  if (reload) await renderPage();
  return res.data ?? {};
}

function marketLogo(index, text, name) {
  if (name && CONFIG.marketLogos[name]) return `<span class="market-logo has-img">${marketImg(name)}</span>`;
  return `<span class="market-logo m${index}">${text}</span>`;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function toggle(checked, label, attrs = "") {
  return `<label class="switch"><input type="checkbox" ${checked ? "checked" : ""} aria-label="${label}" ${attrs} /><span></span></label>`;
}

function selectBox(options, label, cls = "select-sm") {
  return `<select class="${cls}" aria-label="${label}">${options.map((o) => `<option>${o}</option>`).join("")}</select>`;
}

function settingRow(title, desc, control) {
  return `<div class="setting-row"><div><strong>${title}</strong><small>${desc}</small></div>${control}</div>`;
}

function field(label, value, cls = "", name = "") {
  return `<label class="field ${cls}">${label}<input ${name ? `name="${name}"` : ""} value="${escapeHtml(value ?? "")}" /></label>`;
}

// options: [[valor, rótulo], ...]
function selectField(name, options, selected, label, cls = "select-sm") {
  return `<select class="${cls}" name="${name}" aria-label="${label}">${options
    .map(([v, l]) => `<option value="${v}" ${String(v) === String(selected) ? "selected" : ""}>${l}</option>`)
    .join("")}</select>`;
}

function formActions() {
  return `<div class="form-actions">${button("Cancelar", "ghost", 'data-action="cancel-settings"')}${button("Salvar alterações", "primary", 'data-action="save-settings"')}</div>`;
}

function telegramLink(label = "Abrir no Telegram", cls = "btn secondary") {
  return `<a class="${cls}" href="${CONFIG.telegram}" target="_blank" rel="noopener">${icon("telegram")}${label}</a>`;
}

function telegramCard() {
  return `<article class="card telegram-card">
    <span class="tg-badge">${icon("telegram")}</span>
    <strong>Sua operação no Telegram</strong>
    <p>Receba alertas de estoque, novos pedidos e NF-e rejeitadas em tempo real e converse com o assistente ${CONFIG.brand} direto pelo app.</p>
    ${telegramLink("Abrir no Telegram", "btn light")}
  </article>`;
}

/* ---------- 4. TELAS ---------- */

/* Login */
/* Esqueci minha senha: "forgot" pede o link por e-mail; "reset" cria a nova senha (link #redefinir-senha=...). */
function recoveryCard() {
  const reset = state.authMode === "reset";
  const r = state.recovery;
  const submit = (label) => button(label, "primary").replace('type="button"', 'type="submit"');
  let body;
  if (reset && r.checking) body = `<div class="register-note">Verificando o link...</div>`;
  else if (reset && r.invalid) body = `<div class="form-error">${escapeHtml(r.invalid)}</div>${button("Pedir um novo link", "primary", 'data-auth="forgot"')}`;
  else if (!reset && r.sent)
    body = `<div class="form-ok">${icon("check")}<span>${escapeHtml(r.sent)}</span></div>
      ${r.demoLink ? `<div class="register-note">Modo demonstração: nenhum servidor de e-mail está configurado, então o link aparece aqui. <a href="${escapeHtml(r.demoLink)}">Abrir o link de redefinição</a></div>` : ""}
      ${button("Voltar para o login", "primary", 'data-auth="login"')}`;
  else if (reset)
    body = `<label>Nova senha<input name="password" type="password" autocomplete="new-password" placeholder="Mínimo de 6 caracteres" /></label>
      <label>Confirmar nova senha<input name="confirm" type="password" autocomplete="new-password" placeholder="Repita a nova senha" /></label>
      <div class="form-error" id="login-error" hidden></div>
      ${submit("Salvar nova senha")}`;
  else
    body = `<label>E-mail<input name="email" type="email" autocomplete="email" placeholder="voce@sualoja.com.br" value="${escapeHtml(r.email || "")}" /></label>
      <div class="form-error" id="login-error" hidden></div>
      ${submit("Enviar link")}`;
  return `<form class="login-card" id="recovery-form" novalidate>
      ${logo(true)}
      <div class="title">${reset ? "Criar nova senha" : "Esqueceu sua senha?"}</div>
      <p>${reset ? (r.email ? `Nova senha para a conta ${escapeHtml(r.email)}` : "Escolha uma nova senha para sua conta.") : "Informe o e-mail da sua conta. Enviaremos um link para você criar uma nova senha."}</p>
      ${body}
      <button type="button" class="link back-login" data-auth="login">← Voltar para o login</button>
    </form>`;
}

function renderLogin() {
  const isLogin = state.authMode === "login";
  const recovering = state.authMode === "forgot" || state.authMode === "reset";
  $("#root").innerHTML = `
  <main class="login-page">
    <div class="orb orb-one"></div><div class="orb orb-two"></div>
    <section class="login-copy">
      ${logo()}
      <p class="eyebrow">O hub de operação multicanal</p>
      <div class="display">Crescer em marketplaces não precisa virar um caos.</div>
      <p>O ${CONFIG.brand} conecta seus canais, sincroniza o estoque e transforma cada pedido em uma operação pronta para faturar.</p>
      ${heroStage()}
      <div class="login-points"><span>✓ Estoque sem divergências</span><span>✓ NF-e em poucos cliques</span><span>✓ Todos os CNPJs em uma visão</span></div>
    </section>
    ${recovering ? recoveryCard() : `<form class="login-card" id="login-form" novalidate>
      ${logo(true)}
      <div class="auth-tabs">
        <button type="button" class="${isLogin ? "active" : ""}" data-auth="login">Entrar</button>
        <button type="button" class="${!isLogin ? "active" : ""}" data-auth="register">Criar conta</button>
      </div>
      <div class="title">${isLogin ? "Bem-vinda de volta" : "Comece sua operação conectada"}</div>
      <p>${isLogin ? `Acesse seu painel ${CONFIG.brand}` : "Configure sua empresa e seu primeiro canal"}</p>
      ${isLogin ? "" : `<div class="form-grid"><label>Seu nome<input name="name" placeholder="Nome completo" /></label><label>Empresa<input name="company" placeholder="Nome da sua loja" /></label></div>`}
      <label>E-mail<input name="email" type="email" placeholder="voce@sualoja.com.br" ${isLogin && CONFIG.local ? 'value="isabela@lojabeta.com.br"' : ""} /></label>
      <label>Senha<input name="password" type="password" placeholder="Sua senha" ${isLogin && CONFIG.local ? 'value="taylor123"' : ""} /></label>
      ${isLogin ? "" : `<label>CNPJ<input name="cnpj" placeholder="00.000.000/0001-00" /></label>`}
      ${isLogin
        ? `<div class="login-options"><label class="check"><input type="checkbox" name="remember" checked /> Lembrar de mim</label><button type="button" class="link" data-auth="forgot">Esqueci minha senha</button></div>`
        : `<div class="register-note">Ao continuar, você poderá importar produtos e pedidos do seu marketplace sem planilhas.</div>`}
      ${isLogin && state.loginNotice ? `<div class="form-ok">${icon("check")}<span>${escapeHtml(state.loginNotice)}</span></div>` : ""}
      <div class="form-error" id="login-error" hidden></div>
      ${button(isLogin ? "Entrar na plataforma" : "Criar minha operação", "primary").replace('type="button"', 'type="submit"')}
      ${isLogin && CONFIG.useApi
        ? `<div class="demo-divider"><span>ou</span></div>
      ${button("Entrar com a conta Demo", "secondary", 'data-action="demo-login"')}
      <div class="demo-note">Cria uma loja de exemplo só sua, com produtos, pedidos e notas, para testar à vontade.</div>`
        : ""}
      <small>${isLogin ? "Ambiente seguro e protegido" : "Teste a plataforma com seus dados reais"}</small>
    </form>`}
  </main>`;
}

/* Dashboard */
// Conta Demo: e-mail e senha para o /login do bot do Telegram e o horário em que a loja será apagada.
function demoAccessCard() {
  const d = state.demo;
  if (!d) return "";
  const fim = new Date(d.expires_at);
  const hora = fim.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const quando = fim.toDateString() === new Date().toDateString() ? `às ${hora}` : `em ${fim.toLocaleDateString("pt-BR")} às ${hora}`;
  const bot = "@" + CONFIG.telegram.split("/").pop();
  const field = (label, value) => `<div class="demo-field">
      <small>${label}</small><code>${escapeHtml(value)}</code>
      ${button(`${icon("copy")}Copiar`, "ghost", `data-action="copy" data-copy="${escapeHtml(value)}" aria-label="Copiar ${label.toLowerCase()}"`)}
    </div>`;
  return `<article class="card demo-access">
    <div class="card-head"><strong>Seus dados de acesso</strong><span>Loja de demonstração · apagada ${quando}</span></div>
    <div class="demo-fields">${field("E-mail", d.email)}${field("Senha", d.password)}</div>
    <p>No Telegram, abra o ${escapeHtml(bot)}, envie <b>/login</b> e depois o e-mail e a senha acima. Tudo o que você fizer lá aparece aqui, e vice-versa.</p>
    ${telegramLink(`Abrir ${escapeHtml(bot)}`, "btn secondary")}
  </article>`;
}

function dashboardShell() {
  return `
  ${pageHeader(
    `Bem-vindo, ${currentUser.name}`,
    "Acompanhe sua operação em todos os canais.",
    `<div class="segmented" role="group" aria-label="Período">${periods
      .map((p) => `<button type="button" class="${p === state.period ? "on" : ""}" data-period="${p}" aria-pressed="${p === state.period}">${p}</button>`)
      .join("")}</div>`
  )}
  ${demoAccessCard()}
  <div id="dash-stats"></div>
  <div class="dashboard-grid">
    <article class="card chart-card">
      <div class="card-head">
        <strong>Vendas por canal</strong>
        <label class="range-select"><select id="range-select" aria-label="Período do gráfico">${periods
          .map((p) => `<option value="${p}" ${p === state.range ? "selected" : ""}>${rangeLabels[p]}</option>`)
          .join("")}</select></label>
      </div>
      <div id="dash-chart"></div>
    </article>
    <article class="card donut-card">
      <div class="card-head"><strong>Pedidos por status</strong></div>
      <div class="donut-content" id="dash-donut"></div>
    </article>
    <article class="card alerts">
      <div class="card-head"><strong>Alertas de estoque</strong><a role="button" tabindex="0" data-page="Estoque">Ver todos</a></div>
      <div id="dash-alerts"></div>
    </article>
  </div>
  <article class="card channels">
    <div class="card-head"><strong>Canais conectados</strong></div>
    <div class="channel-row" id="dash-channels"></div>
  </article>`;
}

async function loadStats() {
  const list = await api.stats(state.period);
  const box = $("#dash-stats");
  if (box) box.innerHTML = statsRow(list, "five");
}

async function loadChart() {
  const data = await api.sales(state.range);
  const box = $("#dash-chart");
  if (box) box.innerHTML = salesChart(data);
}

async function loadDonut() {
  const items = await api.orderStatuses();
  const box = $("#dash-donut");
  if (!box) return;
  box.innerHTML = `${donut(items)}<div class="donut-list">${items
    .map((item) => `<span><i style="background:${item.color}"></i>${item.label}<b>${item.value}</b></span>`)
    .join("")}</div>`;
}

async function loadAlerts() {
  const list = await api.stockAlerts();
  const box = $("#dash-alerts");
  if (!box) return;
  box.innerHTML = list
    .map(
      (a) => `<div class="alert-row ${a.critical ? "critical" : ""}" tabindex="0">
        <span class="product-thumb">${icon("box")}</span>
        <div><strong>${a.name}</strong><small>${a.desc}</small></div>
        <span class="chevron">${icon("chevron")}</span>
      </div>`
    )
    .join("");
}

async function loadChannels() {
  const list = await api.channels();
  const box = $("#dash-channels");
  if (!box) return;
  box.innerHTML =
    list
      .map(
        (c, i) => `<div class="channel">
        ${marketLogo(i, c.short, c.name)}
        <div>
          <strong>${c.name}</strong>
          <small class="connected">● Conectado</small>
          <small>${c.products} produtos</small>
          <small>Última sinc.: ${state.synced && !CONFIG.useApi ? "agora" : c.lastSync}</small>
        </div>
      </div>`
      )
      .join("") +
    `<button class="btn primary" type="button" id="sync-btn"><span class="${state.syncing ? "spin" : ""}">${icon("refresh")}</span>${state.syncing ? "Sincronizando..." : "Sincronizar agora"}</button>`;
}

function renderDashboard() {
  $("#content").innerHTML = dashboardShell();
  return Promise.all([loadStats(), loadChart(), loadDonut(), loadAlerts(), loadChannels()]);
}

/* Produtos */
async function renderProducts() {
  const [rows, s] = await Promise.all([api.products(state.productsStatus), api.productsSummary()]);
  const c = s || { all: 312, active: 298, low_stock: 10, out_of_stock: 4 };
  const tabs = [
    [`Todos (${c.all})`, ""],
    [`Ativos (${c.active})`, "ativo"],
    [`Estoque baixo (${c.low_stock})`, "estoque_baixo"],
    [`Sem estoque (${c.out_of_stock})`, "sem_estoque"],
  ];
  return (
    pageHeader("Produtos", "Gerencie seu catálogo e as publicações nos marketplaces.", button("＋ Novo produto", "primary", 'data-action="new-product"')) +
    `<div class="toolbar">${filterTabs(tabs, "productsStatus", state.productsStatus)}<div>${button("Filtros", "secondary", 'data-action="soon"')}</div></div>` +
    dataTable(["Produto", "SKU", "Estoque", "Preço", "Status", "Canais", "Atualização"], rows, 5, 4, "product")
  );
}

function productForm(p = {}) {
  const origens = [["", "Não informada"], ["0", "0 - Nacional"], ["1", "1 - Estrangeira (importação direta)"], ["2", "2 - Estrangeira (mercado interno)"]];
  return `<form class="fields-grid" id="product-form" data-id="${p.id || ""}">
    <label class="field span-2">Nome<input name="name" required value="${escapeHtml(p.name || "")}" /></label>
    <label class="field">SKU<input name="sku" required value="${escapeHtml(p.sku || "")}" /></label>
    <label class="field">Preço (R$)<input name="price" type="number" min="0" step="0.01" required value="${p.price ?? ""}" /></label>
    <label class="field">Estoque central<input name="stock" type="number" min="0" step="1" required value="${p.stock ?? ""}" /></label>
    <label class="field">Estoque mínimo<input name="min_stock" type="number" min="0" step="1" required value="${p.min_stock ?? ""}" /></label>
    <label class="field">NCM (8 dígitos)<input name="ncm" inputmode="numeric" maxlength="8" value="${escapeHtml(p.ncm || "")}" /></label>
    <label class="field">Origem fiscal<select name="fiscal_origin">${origens
      .map(([v, l]) => `<option value="${v}" ${(p.fiscal_origin || "") === v ? "selected" : ""}>${l}</option>`)
      .join("")}</select></label>
  </form>`;
}

function readProductForm() {
  const f = new FormData($("#product-form"));
  const text = (k) => String(f.get(k) || "").trim() || null;
  return {
    name: text("name"), sku: text("sku"), price: Number(f.get("price")), stock: Number(f.get("stock")),
    min_stock: Number(f.get("min_stock")), ncm: text("ncm"), fiscal_origin: text("fiscal_origin"),
  };
}

function newProductModal() {
  openModal("Novo produto", productForm() + `<p class="modal-note">O produto é publicado automaticamente em todos os canais conectados.</p>`,
    button("Cancelar", "ghost", 'data-action="close-modal"') + button("Cadastrar produto", "primary", 'data-action="save-product"'));
}

async function productModal(id) {
  const p = await api.product(id);
  if (!p) return showToast("Não foi possível carregar o produto.", "error");
  openModal(`Editar produto · ${escapeHtml(p.sku)}`, productForm(p) + `<p class="modal-note">Canais: ${p.channels.join(", ") || "nenhum"}. Alterar o estoque sincroniza os canais automaticamente.</p>`,
    button("Excluir", "ghost", `data-action="delete-product" data-id="${p.id}"`) + button("Cancelar", "ghost", 'data-action="close-modal"') +
    button("Salvar alterações", "primary", 'data-action="save-product"'));
}

async function saveProduct() {
  const id = $("#product-form").dataset.id;
  const body = readProductForm();
  await runAction(id ? "PUT" : "POST", id ? `/products/${id}` : "/products", body, id ? "Produto atualizado" : "Produto cadastrado e publicado nos canais");
}

/* Pedidos */
const orderStatusLabels = { aguardando: "Aguardando", em_separacao: "Em separação", em_transporte: "Em transporte", entregue: "Entregue", cancelado: "Cancelado" };
const orderNext = { aguardando: ["em_separacao", "Iniciar separação"], em_separacao: ["em_transporte", "Marcar como enviado"], em_transporte: ["entregue", "Confirmar entrega"] };

async function renderOrders() {
  const [rows, s] = await Promise.all([api.orders(state.ordersStatus), api.ordersSummary()]);
  const stats = s
    ? [
        { label: "Pedidos hoje", value: intBR(s.orders_today.value), trend: trendText(s.orders_today.trend_pct) },
        { label: "Vendas hoje", value: brl(s.sales_today.value), trend: trendText(s.sales_today.trend_pct) },
        { label: "Ticket médio", value: brl(s.average_ticket.value), trend: trendText(s.average_ticket.trend_pct) },
        { label: "Pedidos pendentes", value: intBR(s.pending_orders.value), trend: `${s.by_status.aguardando} aguardando`, tone: "danger" },
      ]
    : [
        { label: "Pedidos hoje", value: "48", trend: "↑ 12%" },
        { label: "Vendas hoje", value: "R$ 7.320,50", trend: "↑ 18%" },
        { label: "Ticket médio", value: "R$ 152,50", trend: "↑ 5%" },
        { label: "Pedidos pendentes", value: "30", trend: "↓ 8%", tone: "danger" },
      ];
  const tabs = [["Todos", ""], ["Aguardando", "aguardando"], ["Em separação", "em_separacao"], ["Em transporte", "em_transporte"], ["Entregues", "entregue"], ["Cancelados", "cancelado"]];
  return (
    pageHeader(
      "Pedidos",
      "Acompanhe os pedidos recebidos de todos os marketplaces.",
      button("Filtros", "secondary", 'data-action="soon"') + button("Exportar", "secondary", 'data-action="export-orders"') + button("Sincronizar pedidos", "primary", 'data-action="sync" data-path="/orders/sync"')
    ) +
    statsRow(stats, "four") +
    `<div class="toolbar">${filterTabs(tabs, "ordersStatus", state.ordersStatus)}</div>` +
    dataTable(["Pedido", "Canal", "Data", "Cliente", "Itens", "Valor", "Status"], rows, undefined, 6, "order")
  );
}

async function orderModal(id) {
  const o = await api.order(id);
  if (!o) return showToast("Não foi possível carregar o pedido.", "error");
  const next = orderNext[o.status];
  const invoice = o.invoice ? `${o.invoice.number ? "NF-e " + o.invoice.number : "Rascunho"} · ${o.invoice.status.replace("_", " ")}` : "Sem nota fiscal";
  const actions =
    (["aguardando", "em_separacao"].includes(o.status) ? button("Cancelar pedido", "ghost", `data-action="order-status" data-id="${o.id}" data-status="cancelado"`) : "") +
    (next ? button(next[1], "primary", `data-action="order-status" data-id="${o.id}" data-status="${next[0]}"`) : "");
  openModal(
    `Pedido ${escapeHtml(o.code)}`,
    `<div class="detail-grid">
      <span>Canal<b>${escapeHtml(o.channel)}</b></span><span>Cliente<b>${escapeHtml(o.customer || "—")}${o.customer_uf ? " · " + o.customer_uf : ""}</b></span>
      <span>Data<b>${new Date(o.date).toLocaleString("pt-BR")}</b></span><span>Status<b><span class="status ${orderStatusLabels[o.status].toLowerCase().replaceAll(" ", "-")}">${orderStatusLabels[o.status]}</span></b></span>
      <span>Nota fiscal<b>${invoice}</b></span><span>Total<b>${brl(o.total)}</b></span>
    </div>
    <div class="modal-list">${o.items.map((i) => `<div><span>${escapeHtml(i.product)}<small>${escapeHtml(i.sku)}</small></span><span>${i.quantity} × ${brl(i.unit_price)}</span></div>`).join("")}</div>
    ${o.status === "cancelado" ? "" : `<p class="modal-note">Cancelar devolve os itens ao estoque central e sincroniza os canais.</p>`}`,
    actions || button("Fechar", "secondary", 'data-action="close-modal"')
  );
}

async function exportOrders() {
  const rows = await api.orders(state.ordersStatus);
  const header = ["Pedido", "Canal", "Data", "Cliente", "Itens", "Valor", "Status"];
  const csv = [header, ...rows.map((r) => r.slice(0, header.length))].map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(";")).join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  link.download = `pedidos-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast(`${rows.length} pedidos exportados em CSV`);
}

/* Estoque */
async function renderStock() {
  const [rows, s] = await Promise.all([api.stock(), api.stockSummary()]);
  const c = s || { products: 312, units_available: 4860, low_stock: 8, out_of_stock: 4, divergences: 2 };
  const banner = c.divergences
    ? `<div class="stock-banner card"><div><span class="banner-icon">!</span><div><strong>${c.divergences} ${c.divergences === 1 ? "divergência precisa" : "divergências precisam"} da sua atenção</strong><small>As quantidades publicadas diferem do seu estoque central.</small></div></div>${button("Revisar divergências", "secondary", 'data-action="review-divergences"')}</div>`
    : "";
  return (
    pageHeader("Estoque", "Visão centralizada e sincronização por canal.", button("↻ Sincronizar estoque", "primary", 'data-action="sync" data-path="/stock/sync"')) +
    banner +
    statsRow(
      [
        { label: "Produtos cadastrados", value: intBR(c.products), trend: "100% catalogados" },
        { label: "Unidades disponíveis", value: intBR(c.units_available), trend: "no estoque central" },
        { label: "Estoque baixo", value: intBR(c.low_stock), trend: c.low_stock ? "Atenção necessária" : "Tudo certo", tone: "danger" },
        { label: "Sem estoque", value: intBR(c.out_of_stock), trend: c.out_of_stock ? "Reposição pendente" : "Tudo certo", tone: "danger" },
      ],
      "four"
    ) +
    dataTable(["Produto", "SKU", "Estoque central", "Estoque mínimo", "Mercado Livre", "Shopee", "Magalu", "TikTok Shop", "Status"], rows, undefined, 8)
  );
}

async function divergencesModal() {
  const list = await api.divergences();
  if (!list.length) return showToast("Nenhuma divergência no momento");
  openModal(
    "Revisar divergências",
    `<p class="modal-note">Escolha qual quantidade deve prevalecer. O Taylor atualiza o estoque central e envia o valor a todos os canais.</p>
    ${list
      .map(
        (d) => `<div class="divergence">
        <div><strong>${escapeHtml(d.product)}</strong><small>${escapeHtml(d.sku)}</small></div>
        <div class="row-actions">
          ${button(`Central: ${d.central_stock}`, "primary", `data-action="resolve" data-id="${d.product_id}" data-source="central"`)}
          ${d.channels
            .filter((c) => c.published_stock !== d.central_stock)
            .map((c) => button(`${escapeHtml(c.channel)}: ${c.published_stock}`, "secondary", `data-action="resolve" data-id="${d.product_id}" data-source="channel" data-integration="${c.integration_id}"`))
            .join("")}
        </div>
      </div>`
      )
      .join("")}`
  );
}

// Dispara uma sincronização (202), acompanha até terminar e recarrega a tela.
async function startSync(path, btn) {
  if (state.syncing) return;
  state.syncing = true;
  if (btn) (btn.disabled = true), (btn.dataset.label = btn.innerHTML), (btn.innerHTML = `<span class="spin">${icon("refresh")}</span>Sincronizando...`);
  const res = await apiSend("POST", path);
  let s = null;
  if (res.ok) s = await waitSync(res.data.sync_id);
  state.syncing = false;
  if (btn && btn.isConnected) (btn.disabled = false), (btn.innerHTML = btn.dataset.label);
  if (!res.ok) return showToast(apiError(res), "error");
  if (!s || s.status === "erro") return showToast("A sincronização falhou. Tente novamente.", "error");
  const parts = [];
  if (s.tipo !== "pedidos") parts.push(`${s.items_updated} produtos atualizados`);
  if (["completa", "pedidos"].includes(s.tipo)) parts.push(`${s.new_orders} ${s.new_orders === 1 ? "pedido novo" : "pedidos novos"}`);
  showToast("Sincronização concluída: " + parts.join(" · "));
  state.synced = true;
  refreshBadge();
  await renderPage();
}

/* Notas fiscais */
async function renderInvoices() {
  const [rows, s, health] = await Promise.all([api.invoices(state.invoicesStatus), api.invoicesSummary(), api.fiscalHealth()]);
  const c = s || { ready_to_invoice: 18, issued_today: 42, awaiting: 18, processing: 2, rejected: 1, avg_issue_seconds: 38, rejections_avoided: 7 };
  const h = health || {
    score: 96, label: "Excelente", rules_checked: 23,
    items: [{ ok: true, text: "NCM preenchido em 308 produtos", value: "99%" }, { ok: true, text: "Certificado A1 válido", value: "214 dias" }, { ok: false, text: "4 produtos sem origem fiscal", value: "Corrigir" }],
  };
  const tabs = [["Todas", ""], [`Aguardando emissão (${c.awaiting})`, "aguardando_emissao"], [`Processando (${c.processing})`, "processando"], ["Autorizadas", "autorizada"], [`Rejeitadas (${c.rejected})`, "rejeitada"]];
  const tempo = c.avg_issue_seconds >= 120 ? `${Math.round(c.avg_issue_seconds / 60)} min` : `${c.avg_issue_seconds} seg`;
  const pronto = c.ready_to_invoice;
  return (
    pageHeader("Notas fiscais", "Emita, valide e acompanhe suas NF-e sem sair da operação.", button("Importar XML", "secondary", 'data-action="soon"') + button("＋ Emitir nota fiscal", "primary", 'data-action="emit-invoice"')) +
    `<article class="fiscal-hero card">
      <div>
        <span class="fiscal-kicker">Motor fiscal ${CONFIG.brand}</span>
        <div class="fiscal-title">${pronto} ${pronto === 1 ? "pedido pronto" : "pedidos prontos"} para faturar</div>
        <p>Dados do pedido, cliente e tributação já conferidos. Emita as notas em lote e devolva o XML automaticamente para cada marketplace.</p>
        <div class="fiscal-actions">${button(`Emitir ${pronto} NF-e em lote`, "primary", `data-action="emit-batch" ${pronto ? "" : "disabled"}`)}${button("Revisar pedidos", "secondary", 'data-filter="invoicesStatus" data-value="aguardando_emissao"')}</div>
      </div>
      <div class="fiscal-flow">
        <div><span>01</span><strong>Pedido recebido</strong><small>Dados importados</small></div><i>→</i>
        <div><span>02</span><strong>Validação fiscal</strong><small>NCM e impostos conferidos</small></div><i>→</i>
        <div class="flow-active"><span>03</span><strong>NF-e autorizada</strong><small>XML enviado ao canal</small></div>
      </div>
    </article>` +
    statsRow(
      [
        { label: "Emitidas hoje", value: intBR(c.issued_today), trend: "XML enviado aos canais" },
        { label: "Aguardando emissão", value: intBR(c.awaiting), trend: "Prontas para faturar" },
        { label: "Tempo médio", value: tempo, trend: "do pedido à autorização" },
        { label: "Rejeições evitadas", value: intBR(c.rejections_avoided), trend: "Validação inteligente" },
      ],
      "four"
    ) +
    `<div class="fiscal-insights">
      <article class="card fiscal-readiness">
        <div class="card-head"><strong>Saúde fiscal da operação</strong><span>Atualizado agora</span></div>
        <div class="readiness-score"><strong>${h.score}</strong><span>/100</span><div><b>${h.label}</b><small>${h.score >= 90 ? "Seus cadastros estão prontos para emissão." : "Corrija os itens abaixo para evitar rejeições."}</small></div></div>
        <div class="readiness-items">
          ${h.items.map((i) => `<span><i class="${i.ok ? "ok" : "warn"}">${i.ok ? "✓" : "!"}</i>${escapeHtml(i.text)} <b>${escapeHtml(i.value)}</b></span>`).join("")}
        </div>
      </article>
      <article class="card rejection-guard">
        <div class="card-head"><strong>Guardião de rejeições</strong><span class="connected">● Ativo</span></div>
        <p>A plataforma confere ${h.rules_checked} regras antes de enviar cada NF-e à SEFAZ.</p>
        <div class="guard-rule"><span>✓</span><div><strong>Cadastro do destinatário</strong><small>CPF/CNPJ e endereço validados</small></div></div>
        <div class="guard-rule"><span>✓</span><div><strong>Tributação por UF</strong><small>CFOP sugerido conforme destino</small></div></div>
        <div class="guard-rule"><span>✓</span><div><strong>Conciliação automática</strong><small>XML devolvido ao pedido e ao canal</small></div></div>
      </article>
    </div>
    <div class="toolbar fiscal-toolbar">${filterTabs(tabs, "invoicesStatus", state.invoicesStatus)}${button("Exportar XMLs", "secondary", 'data-action="soon"')}</div>` +
    dataTable(["Nota", "Pedido", "Canal", "Cliente", "Valor", "Status", "Emissão"], rows, undefined, 5, "invoice")
  );
}

const invoiceStatusLabels = { aguardando_emissao: "Aguardando emissão", processando: "Processando", autorizada: "Autorizada", rejeitada: "Rejeitada" };

async function invoiceModal(id) {
  const n = await api.invoice(id);
  if (!n) return showToast("Não foi possível carregar a nota.", "error");
  const label = invoiceStatusLabels[n.status];
  const issues = n.pending_issues.length
    ? `<div class="modal-issues"><strong>Pendências da validação fiscal</strong>${n.pending_issues.map((p) => `<span>! ${escapeHtml(p)}</span>`).join("")}</div>`
    : "";
  const reason = n.rejection_reason ? `<div class="modal-issues"><strong>Motivo informado pela SEFAZ</strong><span>${escapeHtml(n.rejection_reason)}</span><small>Corrija o cadastro do produto ou do destinatário e reenvie.</small></div>` : "";
  const actions =
    n.status === "aguardando_emissao"
      ? button("Emitir NF-e", "primary", `data-action="invoice-emit" data-id="${n.id}"`)
      : n.status === "rejeitada"
        ? button("Reenviar à SEFAZ", "primary", `data-action="invoice-resend" data-id="${n.id}"`)
        : button("Fechar", "secondary", 'data-action="close-modal"');
  openModal(
    `${n.number || "Rascunho"} · pedido ${escapeHtml(n.order)}`,
    `<div class="detail-grid">
      <span>Canal<b>${escapeHtml(n.channel)}</b></span><span>Cliente<b>${escapeHtml(n.customer)}</b></span>
      <span>Valor<b>${brl(n.value)}</b></span><span>Status<b><span class="status ${label.toLowerCase().replaceAll(" ", "-")}">${label}</span></b></span>
      <span>Emissão<b>${n.issued_at ? new Date(n.issued_at).toLocaleString("pt-BR") : "—"}</b></span><span>XML<b>${n.xml_url ? "Enviado ao pedido e ao canal" : "—"}</b></span>
    </div>${reason}${issues}<p class="modal-note">Emissão simulada: nenhuma nota é enviada à SEFAZ real.</p>`,
    actions
  );
}

async function emitInvoiceModal() {
  const rows = await api.invoices("aguardando_emissao");
  const list = rows.filter((r) => r.length > 7);
  if (!list.length) return showToast("Nenhum pedido aguardando emissão");
  openModal(
    "Emitir nota fiscal",
    `<p class="modal-note">Escolha o pedido. A validação fiscal roda antes do envio à SEFAZ (simulada).</p>
    <div class="modal-list">${list
      .map((r) => `<div><span>Pedido ${escapeHtml(r[1])}<small>${escapeHtml(r[2])} · ${escapeHtml(r[3])} · ${escapeHtml(r[4])}</small></span>${button("Emitir", "secondary", `data-action="invoice-emit" data-id="${r[7]}"`)}</div>`)
      .join("")}</div>`
  );
}

// Emite (ou reenvia) e acompanha o retorno da SEFAZ simulada.
async function emitInvoice(id, resend = false) {
  const data = await runAction("POST", `/invoices/${id}/${resend ? "resend" : "emit"}`, undefined, null, { reload: false, keepModal: true });
  if (!data) return;
  closeModal();
  showToast(`NF-e ${data.number || ""} enviada à SEFAZ (simulada)...`);
  window.setTimeout(async () => {
    const n = await api.invoice(id);
    if (n) showToast(n.status === "autorizada" ? `${n.number} autorizada · XML devolvido ao canal` : `${n.number} ${invoiceStatusLabels[n.status].toLowerCase()}`, n.status === "rejeitada" ? "error" : "ok");
    refreshBadge();
    renderPage();
  }, 2600);
}

/* Marketplaces e Integrações */
const MARKETPLACES = ["Mercado Livre", "Shopee", "Magalu", "TikTok Shop"];

async function renderMarketplaces(integrations = false) {
  const [base, integ] = await Promise.all([api.marketplaces(), api.integrations()]);
  const byName = Object.fromEntries((integ || []).map((i) => [i.name, i]));
  const lastSync = (name, index) => (byName[name] ? timeAgo(byName[name].last_sync) : `há ${index + 2} min`);
  let cards;
  if (integrations) {
    const list = integ || [...base.map((m) => ({ name: m[0], short: m[1], type: "marketplace", status: "conectado", account: "Loja Beta Oficial" })), { name: "Telegram", type: "atendimento", status: "conectado", account: "@lojabeta_bot" }];
    cards = list
      .map((m, index) => {
        const on = m.status === "conectado";
        const acoes = !m.id
          ? ""
          : on
            ? (m.type === "marketplace" ? button("Configurar", "secondary", 'data-action="soon"') + button("Reconectar", "ghost", `data-action="reconnect" data-id="${m.id}"`) : "") +
              button("Desconectar", "ghost", `data-action="disconnect" data-id="${m.id}" data-name="${escapeHtml(m.name)}"`)
            : m.type === "marketplace" ? button("Conectar", "primary", `data-action="reconnect" data-id="${m.id}"`) : "";
        return `<article class="card integration">
            ${marketLogo(index, m.short || icon("telegram"), m.name)}
            <div class="integration-name"><strong>${m.name}</strong><small class="${on ? "connected" : "down"}">● ${on ? "Conectado" : "Desconectado"}</small></div>
            <div><small>Conta vinculada</small><strong>${escapeHtml(m.account || "—")}</strong></div>
            <div><small>Última sincronização</small><strong>${m.type === "atendimento" ? "Tempo real" : timeAgo(m.last_sync)}</strong></div>
            <div class="row-actions">${acoes}</div>
          </article>`;
      })
      .join("");
  } else {
    cards = base
      .map(
        (m, index) => `<article class="card marketplace-card">
            <div class="market-title">${marketLogo(index, m[1], m[0])}<div><strong>${m[0]}</strong><small class="connected">● Conectado</small></div></div>
            <div class="market-metrics"><div><small>Produtos publicados</small><strong>${m[2]}</strong></div><div><small>Pedidos hoje</small><strong>${m[3]}</strong></div><div><small>Vendas hoje</small><strong>${m[4]}</strong></div></div>
            <div class="sync-note">Última sincronização ${lastSync(m[0], index)}</div>
            <div class="row-actions">${button("Gerenciar", "secondary", 'data-page="Integrações"')}${
              byName[m[0]] ? button("↻ Sincronizar", "primary", `data-action="sync" data-path="/integrations/${byName[m[0]].id}/sync"`) : button("↻ Sincronizar")
            }</div>
          </article>`
      )
      .join("");
  }
  return (
    pageHeader(
      integrations ? "Integrações" : "Marketplaces",
      integrations ? "Conecte os serviços que fazem sua operação acontecer." : "Gerencie seus canais de venda em um só lugar.",
      integrations ? "" : button("＋ Conectar canal", "primary", 'data-action="connect-modal"')
    ) + `<div class="${integrations ? "integration-list" : "marketplace-grid"}">${cards}</div>`
  );
}

async function connectModal() {
  const integ = (await api.integrations()) || [];
  const connected = new Set(integ.filter((i) => i.status === "conectado").map((i) => i.name));
  const free = MARKETPLACES.filter((m) => !connected.has(m));
  if (!free.length) return showToast("Todos os canais disponíveis já estão conectados");
  openModal(
    "Conectar canal",
    `<p class="modal-note">No MVP a autorização com a conta de vendedor é simulada: o canal conecta na hora e o catálogo é publicado.</p>
    <div class="modal-list">${free.map((m, i) => `<div><span class="connect-channel">${marketLogo(i, "", m)}<b>${m}</b></span>${button("Conectar", "primary", `data-action="connect" data-name="${m}"`)}</div>`).join("")}</div>`
  );
}

/* Relatórios */
async function renderReports() {
  const p = state.reportsPeriod;
  const custom = p === "Personalizado";
  const r = custom && !(state.reportsFrom && state.reportsTo) ? null : await api.reports(custom ? "custom" : p, state.reportsFrom, state.reportsTo);
  const s = r && r.summary;
  const stats = s
    ? [
        { label: "Vendas totais", value: brl(s.total_sales.value), trend: trendText(s.total_sales.trend_pct) },
        { label: "Pedidos", value: intBR(s.orders.value), trend: trendText(s.orders.trend_pct) },
        { label: "Ticket médio", value: brl(s.average_ticket.value), trend: trendText(s.average_ticket.trend_pct) },
        { label: "Produtos vendidos", value: intBR(s.products_sold.value), trend: trendText(s.products_sold.trend_pct) },
      ]
    : [
        { label: "Vendas totais", value: "R$ 38.420", trend: "↑ 18,4%" },
        { label: "Pedidos", value: "284", trend: "↑ 12,1%" },
        { label: "Ticket médio", value: "R$ 135,28", trend: "↑ 5,2%" },
        { label: "Produtos vendidos", value: "712", trend: "↑ 8,7%" },
      ];
  const evo = r ? r.sales_evolution : null;
  const maxEvo = evo ? Math.max(...evo.values, 0) : 0;
  const chart = evo
    ? { labels: evo.labels, yMax: Math.max(300, Math.ceil(maxEvo / 3 / 100) * 300), series: [{ name: "Vendas", cls: "blue", values: evo.values }] }
    : await api.sales("7 dias");
  const bars = r ? r.sales_by_marketplace.map((b) => [b.name, b.share_pct + "%"]) : [["Mercado Livre", "55%"], ["Shopee", "28%"], ["Magalu", "17%"]];
  const top = r ? r.top_products : [];
  const periodLabel = custom ? (r ? `${state.reportsFrom.split("-").reverse().join("/")} a ${state.reportsTo.split("-").reverse().join("/")}` : "Escolha as datas") : p === "3 meses" ? "Últimos 3 meses" : `Últimos ${p}`;
  const customForm = custom
    ? `<form class="card report-custom" id="report-custom"><label class="field">De<input type="date" name="from" value="${state.reportsFrom}" required /></label><label class="field">Até<input type="date" name="to" value="${state.reportsTo}" required /></label>${button("Aplicar", "primary").replace('type="button"', 'type="submit"')}</form>`
    : "";
  return (
    pageHeader(
      "Relatórios",
      "Transforme os dados da sua operação em decisões.",
      `<div class="segmented" role="group">${["7 dias", "30 dias", "3 meses", "Personalizado"].map((x) => `<button type="button" class="${x === p ? "on" : ""}" data-report-period="${x}">${x}</button>`).join("")}</div>`
    ) +
    customForm +
    statsRow(stats, "four") +
    `<div class="reports-grid">
      <article class="card report-main"><div class="card-head"><strong>Evolução das vendas</strong><span>${periodLabel}</span></div>${salesChart(chart, true)}</article>
      <article class="card"><div class="card-head"><strong>Vendas por marketplace</strong></div>
        <div class="bar-list">${bars.map(([name, value]) => `<div><span>${name}<b>${value}</b></span><i><em style="width:${value}"></em></i></div>`).join("")}</div>
      </article>
      <article class="card report-products"><div class="card-head"><strong>Produtos mais vendidos</strong></div>
        ${top.length
          ? top.map((t) => `<div><b>0${t.position}</b><span>${escapeHtml(t.name)}<small>${t.units} unidades</small></span><strong>${brl(t.revenue)}</strong></div>`).join("")
          : `<div class="empty-state">${icon("chart")}<strong>Sem vendas</strong><small>Nenhuma venda no período.</small></div>`}
      </article>
    </div>`
  );
}

/* Notificações */
function notifSource() {
  return state.notifList || notifications;
}

function unreadCount() {
  return state.unread ?? notifications.filter((n) => n.unread).length;
}

// Atualiza o contador de não lidas (sidebar e sino) com o backend.
async function refreshBadge() {
  const s = await api.notificationsSummary();
  if (s) state.unread = s.unread;
  updateNotifications(false);
}

const notifFilterValue = { Todas: "todas", "Não lidas": "nao_lidas", Pedidos: "pedidos", Estoque: "estoque", Fiscal: "fiscal", Integrações: "integracoes" };

async function loadNotifications() {
  const list = await api.notifications("todas");
  if (list) state.notifList = list;
}

function notificationItem(n) {
  return `<div class="notif-item ${n.unread ? "unread" : ""}" data-notif="${n.id}" tabindex="0" role="button" aria-label="${n.title}${n.unread ? " (não lida)" : ""}">
    <span class="notif-icon tone-${n.tone}">${icon(n.icon)}</span>
    <div><strong>${n.title}</strong><p>${n.desc}</p><small>${n.type} · ${n.time}</small></div>
    ${n.action ? button(n.action[0], "secondary", `data-page="${n.action[1]}"`) : "<span></span>"}
    <i class="unread-dot"></i>
  </div>`;
}

function notificationPanel() {
  const f = state.notifFilter;
  const list = notifSource().filter((n) => f === "Todas" || (f === "Não lidas" ? n.unread : n.type === f));
  const tabs = notifFilters
    .map((t) => `<button type="button" class="${t === f ? "active" : ""}" data-notif-filter="${t}">${t}${t === "Não lidas" ? ` (${unreadCount()})` : ""}</button>`)
    .join("");
  const items = list.length
    ? list.map(notificationItem).join("")
    : `<div class="empty-state">${icon("check")}<strong>Tudo em dia!</strong><small>Nenhuma notificação nesta categoria.</small></div>`;
  return `<div class="toolbar"><div class="tabs">${tabs}</div></div>${items}`;
}

function updateNotifications(redrawPanel = true) {
  const panel = $("#notif-panel");
  if (panel && redrawPanel) panel.innerHTML = notificationPanel();
  const count = unreadCount();
  const badge = $("#notif-badge");
  if (badge) {
    badge.textContent = count;
    badge.hidden = count === 0;
  }
  const dot = $("#notif-dot");
  if (dot) dot.hidden = count === 0;
}

function markRead(id) {
  const n = notifSource().find((item) => String(item.id) === String(id));
  if (n && n.unread) {
    n.unread = false;
    if (state.unread) state.unread -= 1;
    if (state.notifList) apiSend("PATCH", `/notifications/${id}/read`);
  }
  updateNotifications();
}

async function renderNotifications() {
  const [, s, prefs] = await Promise.all([loadNotifications(), api.notificationsSummary(), api.settings("preferences")]);
  if (s) state.unread = s.unread;
  const alerts = prefs ? prefs.alerts : { telegram: true, email: true, push: false, daily_summary: true };
  const stats = s
    ? [
        { label: "Recebidas hoje", value: intBR(s.received_today), trend: `${s.unread} não lidas`, icon: "bell", accent: "blue" },
        { label: "Alertas críticos", value: intBR(s.critical), trend: s.critical ? "Estoque e fiscal" : "Nenhum pendente", icon: "alert", accent: "red", tone: "danger", spark: sparkRed },
        { label: "Novos pedidos", value: intBR(s.new_orders), trend: "hoje", icon: "cart", accent: "purple" },
        { label: "Entregues no Telegram", value: intBR(s.delivered_telegram), trend: "envio pelo bot", icon: "telegram", accent: "green", spark: sparkFlat },
      ]
    : [
        { label: "Recebidas hoje", value: "12", trend: "↑ 4 desde ontem", icon: "bell", accent: "blue" },
        { label: "Alertas críticos", value: "2", trend: "Estoque e fiscal", icon: "alert", accent: "red", tone: "danger", spark: sparkRed },
        { label: "Novos pedidos", value: "48", trend: "↑ 12%", icon: "cart", accent: "purple" },
        { label: "Entregues no Telegram", value: "126", trend: "100% entregues", icon: "telegram", accent: "green", spark: sparkFlat },
      ];
  window.setTimeout(() => updateNotifications(false));
  return (
    pageHeader(
      "Notificações",
      "Tudo o que precisa da sua atenção, em todos os canais.",
      button(`${icon("check")}Marcar todas como lidas`, "secondary", 'data-action="read-all"') +
        button(`${icon("gear")}Preferências`, "primary", 'data-page="Configurações" data-settings-tab="Notificações"')
    ) +
    statsRow(stats, "four") +
    `<div class="notif-layout">
      <article class="card notif-panel" id="notif-panel">${notificationPanel()}</article>
      <div class="side-stack">
        <article class="card">
          <div class="card-head"><strong>Onde receber alertas</strong></div>
          ${settingRow("Telegram", "Alertas pelo bot do Telegram", toggle(alerts.telegram, "Receber no Telegram", 'data-alert="telegram"'))}
          ${settingRow("E-mail", "No e-mail de contato da empresa", toggle(alerts.email, "Receber por e-mail", 'data-alert="email"'))}
          ${settingRow("Navegador", "Notificações push neste dispositivo", toggle(alerts.push, "Receber no navegador", 'data-alert="push"'))}
          ${settingRow("Resumo diário", "Todos os dias às 08h", toggle(alerts.daily_summary, "Receber resumo diário", 'data-alert="daily_summary"'))}
        </article>
        ${telegramCard()}
      </div>
    </div>`
  );
}

/* Configurações */
const REGIMES = [["simples_nacional", "Simples Nacional"], ["lucro_presumido", "Lucro Presumido"], ["lucro_real", "Lucro Real"]];
const IDIOMAS = [["pt-BR", "Português (Brasil)"], ["en", "English"], ["es", "Español"]];
const FUSOS = [["America/Sao_Paulo", "Brasília (GMT-3)"], ["America/Manaus", "Manaus (GMT-4)"], ["America/Noronha", "Noronha (GMT-2)"]];
const INTERVALOS = [[5, "A cada 5 minutos"], [15, "A cada 15 minutos"], [30, "A cada 30 minutos"], [60, "A cada hora"]];
const EVENTOS = {
  novo_pedido: notifEvents[0], estoque_baixo: notifEvents[1], divergencia_estoque: notifEvents[2], nfe_rejeitada: notifEvents[3], resumo_diario: notifEvents[4],
};
const PAPEIS = { administrador: "Administrador(a)", operacao: "Operação", financeiro: "Financeiro", expedicao: "Expedição" };
const settingsCache = {};

async function settingsPanel() {
  switch (state.settingsTab) {
    case "Preferências": {
      const p = (settingsCache.preferences = await api.settings("preferences")) || {
        language: "pt-BR", timezone: "America/Sao_Paulo", auto_sync_stock: true, pause_out_of_stock: true, auto_import_orders: true, check_interval_minutes: 5, last_sync: null,
      };
      return `<article class="card">
          <div class="card-head"><strong>Aparência e região</strong></div>
          ${settingRow("Tema claro", "Alterne entre o tema escuro e o claro", toggle(state.light, "Tema claro", 'data-setting="theme"'))}
          ${settingRow("Idioma", "Idioma da interface", selectField("language", IDIOMAS, p.language, "Idioma"))}
          ${settingRow("Fuso horário", "Usado em pedidos e relatórios", selectField("timezone", FUSOS, p.timezone, "Fuso horário"))}
        </article>
        <article class="card">
          <div class="card-head"><strong>Sincronização</strong><span>Última: ${timeAgo(p.last_sync)}</span></div>
          ${settingRow("Sincronizar estoque automaticamente", "Atualiza todos os canais a cada venda", toggle(p.auto_sync_stock, "Sincronizar estoque automaticamente", 'name="auto_sync_stock"'))}
          ${settingRow("Pausar anúncios sem estoque", "Evita vendas de produtos indisponíveis", toggle(p.pause_out_of_stock, "Pausar anúncios sem estoque", 'name="pause_out_of_stock"'))}
          ${settingRow("Importar pedidos automaticamente", "Novos pedidos entram direto na fila de separação", toggle(p.auto_import_orders, "Importar pedidos automaticamente", 'name="auto_import_orders"'))}
          ${settingRow("Intervalo de conferência", "Frequência de checagem com os marketplaces", selectField("check_interval_minutes", INTERVALOS, p.check_interval_minutes, "Intervalo de conferência"))}
          ${formActions()}
        </article>`;
    }
    case "Notificações": {
      const n = await api.settings("notifications");
      const tg = n ? n.telegram : { linked: true, username: "@lojabeta_bot", since: "2026-09-12" };
      const eventos = n ? n.events : Object.keys(EVENTOS).map((e, i) => ({ event: e, telegram: notifEvents[i][2][0], email: notifEvents[i][2][1], push: notifEvents[i][2][2] }));
      return `<article class="card">
          <div class="card-head"><strong>Telegram</strong><span class="${tg.linked ? "connected" : ""}">● ${tg.linked ? "Conectado" : "Não vinculado"}</span></div>
          ${settingRow(
            `<span class="inline-icon tone-telegram">${icon("telegram")}</span>${tg.linked ? escapeHtml(tg.username) : "Vincule sua conta"}`,
            tg.linked ? `Alertas ativos desde ${new Date(tg.since + "T12:00:00").toLocaleDateString("pt-BR")}` : "Abra o bot e envie /start para receber alertas",
            telegramLink()
          )}
        </article>
        <article class="card">
          <div class="card-head"><strong>O que você quer receber</strong></div>
          <div class="matrix">
            <div class="matrix-row matrix-head"><div>Evento</div><span>Telegram</span><span>E-mail</span><span>Push</span></div>
            ${eventos
              .map((e) => {
                const [title, desc] = EVENTOS[e.event];
                return `<div class="matrix-row"><div><strong>${title}</strong><small>${desc}</small></div>${[["telegram", "Telegram"], ["email", "E-mail"], ["push", "Push"]]
                  .map(([ch, nome]) => `<span>${toggle(e[ch], `${title} por ${nome}`, `data-event="${e.event}" data-channel="${ch}"`)}</span>`)
                  .join("")}</div>`;
              })
              .join("")}
          </div>
          ${formActions()}
        </article>`;
    }
    case "Equipe": {
      const t = await api.settings("team");
      const membros = t ? t.members.map((m) => [m.name, m.email, PAPEIS[m.role], m.status === "ativo" ? "Ativo" : "Convite pendente"]) : teamMembers;
      return `<article class="card">
          <div class="card-head"><strong>Usuários <span>${membros.length} de ${t ? t.limit : 10}</span></strong>${button("＋ Convidar usuário", "primary", 'data-action="soon"')}</div>
          ${membros
            .map(
              ([name, email, role, status]) => `<div class="team-row">
              <span class="team-avatar">${escapeHtml(name.split(" ").map((w) => w[0]).join("").slice(0, 2))}</span>
              <div><strong>${escapeHtml(name)}</strong><small>${escapeHtml(email)}</small></div>
              <span class="role-pill">${role}</span>
              <span class="status ${status.toLowerCase().replaceAll(" ", "-")}">${status}</span>
            </div>`
            )
            .join("")}
        </article>
        <article class="card">
          <div class="card-head"><strong>Segurança</strong></div>
          ${settingRow("Verificação em duas etapas", "Obrigatória para todos os usuários", toggle(true, "Verificação em duas etapas"))}
          ${settingRow("Encerrar sessões inativas", "Após 8 horas sem uso", toggle(false, "Encerrar sessões inativas"))}
          ${formActions()}
        </article>`;
    }
    case "Plano":
      return `<article class="card plan-hero">
          <div><span class="fiscal-kicker">Seu plano</span><div class="plan-name">Plano Pro</div><small>Renova em 12/10/2026 · cobrança mensal</small></div>
          <div class="plan-price">R$ 249<small>/mês</small></div>
          <div class="row-actions">${button("Comparar planos", "secondary", 'data-action="soon"')}${button("Fazer upgrade", "primary", 'data-action="soon"')}</div>
        </article>
        <article class="card">
          <div class="card-head"><strong>Uso do plano</strong><span>Ciclo atual</span></div>
          <div class="bar-list usage-list">
            ${[["Pedidos no mês", "1.204 de 5.000", 24], ["Produtos", "312 de 2.000", 16], ["Marketplaces", "3 de 5", 60], ["Usuários", "4 de 10", 40], ["NF-e emitidas", "842 de 3.000", 28]]
              .map(([label, value, pct]) => `<div><span>${label}<b>${value}</b></span><i><em style="width:${pct}%"></em></i></div>`)
              .join("")}
          </div>
        </article>
        <article class="card">
          <div class="card-head"><strong>Cobrança</strong></div>
          ${settingRow("Forma de pagamento", "Pix automático", button("Alterar", "secondary", 'data-action="soon"'))}
          ${settingRow("Faturas", "Última: 12/09/2026 · R$ 249,00 · Paga", button("Ver faturas", "secondary", 'data-action="soon"'))}
        </article>`;
    default: {
      const [e, cert] = await Promise.all([api.settings("company"), api.settings("certificate")]);
      const d = e || {
        legal_name: "Loja Beta Comércio Ltda", trade_name: currentUser.company, cnpj: "12.345.678/0001-95", state_registration: "123.456.789.110", tax_regime: "simples_nacional",
        contact_email: "contato@lojabeta.com.br", phone: "(11) 99999-1204", address: "Rua das Flores, 120 · São Paulo/SP", state: "SP", customer_since: "2025-03-01",
      };
      settingsCache.company = d;
      const desde = new Date(d.customer_since + "T12:00:00").toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).replace(" de ", "/").replace(".", "");
      const c = cert || { type: "A1", holder: "Loja Beta", valid_until: "2027-05-01", days_left: 214, status: "valido" };
      return `<article class="card">
          <div class="card-head"><strong>Dados da empresa</strong><span>Usados na emissão de NF-e</span></div>
          <div class="profile-head"><span class="profile-avatar">${escapeHtml(d.trade_name.split(" ").map((w) => w[0]).join("").slice(0, 2))}</span><div><strong>${escapeHtml(d.trade_name)}</strong><small>Plano Pro · cliente desde ${desde}</small></div>${button("Alterar logo", "secondary", 'data-action="soon"')}</div>
          <form class="fields-grid" id="company-form">
            ${field("Razão social", d.legal_name, "span-2", "legal_name")}
            ${field("Nome fantasia", d.trade_name, "", "trade_name")}
            ${field("CNPJ", d.cnpj, "", "cnpj")}
            ${field("Inscrição estadual", d.state_registration, "", "state_registration")}
            <label class="field">Regime tributário${selectField("tax_regime", REGIMES, d.tax_regime, "Regime tributário", "")}</label>
            ${field("E-mail de contato", d.contact_email, "", "contact_email")}
            ${field("Telefone", d.phone, "", "phone")}
            ${field("Endereço", d.address, "", "address")}
            ${field("UF", d.state, "", "state")}
          </form>
          ${formActions()}
        </article>
        <article class="card">
          <div class="card-head"><strong>Certificado digital</strong><span class="${c.status === "valido" ? "connected" : "down"}">● ${c.status === "valido" ? "Válido" : "Vencido"}</span></div>
          ${settingRow(`Certificado ${c.type} · ${escapeHtml(c.holder || d.trade_name)}`, c.days_left >= 0 ? `Expira em ${c.days_left} dias (${new Date(c.valid_until + "T12:00:00").toLocaleDateString("pt-BR")})` : "Vencido — substitua para emitir NF-e", button("Substituir", "secondary", 'data-action="certificate"'))}
        </article>`;
    }
  }
}

async function saveSettings() {
  const panel = $("#settings-panel");
  const checked = (name) => $(`[name="${name}"]`, panel).checked;
  const value = (name) => $(`[name="${name}"]`, panel).value.trim();
  if (state.settingsTab === "Empresa") {
    const body = Object.fromEntries(new FormData($("#company-form")).entries());
    Object.keys(body).forEach((k) => (body[k] = body[k].trim() || null));
    const data = await runAction("PUT", "/settings/company", body, "Alterações salvas com sucesso", { reload: false });
    if (data) {
      currentUser.company = data.trade_name;
      renderShell();
    }
  } else if (state.settingsTab === "Preferências") {
    const atual = settingsCache.preferences || {};
    await runAction(
      "PUT",
      "/settings/preferences",
      {
        language: value("language"), timezone: value("timezone"), auto_sync_stock: checked("auto_sync_stock"), pause_out_of_stock: checked("pause_out_of_stock"),
        auto_import_orders: checked("auto_import_orders"), check_interval_minutes: Number(value("check_interval_minutes")),
        alerts: atual.alerts || { telegram: true, email: true, push: false, daily_summary: true },
      },
      "Alterações salvas com sucesso",
      { reload: false }
    );
  } else if (state.settingsTab === "Notificações") {
    const eventos = {};
    $$("[data-event]", panel).forEach((i) => ((eventos[i.dataset.event] ||= { event: i.dataset.event })[i.dataset.channel] = i.checked));
    await runAction("PUT", "/settings/notifications", { events: Object.values(eventos) }, "Alterações salvas com sucesso", { reload: false });
  } else {
    showToast("Configurações de segurança chegam depois do MVP.");
  }
}

// Liga/desliga um canal em "Onde receber alertas" (tela Notificações).
async function saveAlert(input) {
  const prefs = await api.settings("preferences");
  if (!prefs) return showToast("Não foi possível salvar agora.", "error");
  delete prefs.last_sync;
  prefs.alerts[input.dataset.alert] = input.checked;
  const res = await apiSend("PUT", "/settings/preferences", prefs);
  if (!res.ok) {
    input.checked = !input.checked;
    showToast(apiError(res), "error");
  } else showToast("Preferência de alerta salva");
}

function certificateModal() {
  openModal(
    "Substituir certificado A1",
    `<p class="modal-note">No MVP o fluxo fiscal é simulado: informe titular e validade do novo certificado (o upload do arquivo .pfx vem depois).</p>
    <form class="fields-grid" id="cert-form"><label class="field span-2">Titular<input name="holder" value="${escapeHtml(currentUser.company)}" /></label><label class="field span-2">Válido até<input type="date" name="valid_until" required /></label></form>`,
    button("Cancelar", "ghost", 'data-action="close-modal"') + button("Salvar certificado", "primary", 'data-action="save-certificate"')
  );
}

async function renderSettings() {
  const panel = await settingsPanel();
  return (
    pageHeader("Configurações", "Gerencie sua empresa, preferências, equipe e plano.") +
    `<div class="settings-layout">
      <nav class="card settings-nav" aria-label="Seções das configurações">${settingsTabs
        .map((t) => `<button type="button" class="${t.label === state.settingsTab ? "active" : ""}" data-settings-tab="${t.label}">${icon(t.icon)}${t.label}</button>`)
        .join("")}</nav>
      <div class="settings-panel" id="settings-panel">${panel}</div>
    </div>`
  );
}

/* Ajuda */
const normalize = (text) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function faqList() {
  const q = normalize(state.helpQuery.trim());
  const list = faqs.filter((f) => (!state.helpTopic || f.cat === state.helpTopic) && (!q || normalize(`${f.cat} ${f.q} ${f.a}`).includes(q)));
  if (!list.length) return `<div class="empty-state">${icon("search")}<strong>Nada encontrado</strong><small>Tente outras palavras ou fale com o assistente IA.</small></div>`;
  return list
    .map((f, i) => `<details ${i === 0 && (q || state.helpTopic) ? "open" : ""}><summary><span><em class="faq-cat">${f.cat}</em>${f.q}</span>${icon("chevron")}</summary><p>${f.a}</p></details>`)
    .join("");
}

function renderHelp() {
  return (
    pageHeader("Ajuda", "Tire dúvidas, encontre guias e fale com o nosso time.") +
    `<article class="card help-hero">
      <span class="fiscal-kicker">Central de ajuda ${CONFIG.brand}</span>
      <div class="help-title">Como podemos ajudar?</div>
      <p>Busque uma dúvida ou escolha um dos temas abaixo.</p>
      <label class="help-search">${icon("search")}<input id="help-search" type="search" placeholder="Ex.: emitir NF-e, divergência de estoque..." value="${escapeHtml(state.helpQuery)}" autocomplete="off" aria-label="Buscar na ajuda" /></label>
    </article>
    <div class="help-topics">${helpTopics
      .map(
        (t) => `<button type="button" class="card help-topic ${state.helpTopic === t.cat ? "active" : ""}" data-help-topic="${t.cat}">
          <span class="notif-icon tone-${t.tone}">${icon(t.icon)}</span><strong>${t.label}</strong><small>${t.desc}</small>
        </button>`
      )
      .join("")}</div>
    <div class="help-grid">
      <article class="card faq"><div class="card-head"><strong>Perguntas frequentes</strong></div><div id="faq-list">${faqList()}</div></article>
      <div class="side-stack">
        <article class="card">
          <div class="card-head"><strong>Fale com a gente</strong></div>
          <button class="contact-row" type="button" data-action="open-chat"><span class="notif-icon">✦</span><div><strong>Assistente de Voz IA</strong><small>Fale ou digite: respostas instantâneas sobre sua operação</small></div>${icon("chevron")}</button>
          <a class="contact-row" href="${CONFIG.telegram}" target="_blank" rel="noopener"><span class="notif-icon tone-telegram">${icon("telegram")}</span><div><strong>Suporte no Telegram</strong><small>Seg. a sex., das 8h às 20h</small></div>${icon("chevron")}</a>
          <a class="contact-row" href="mailto:${CONFIG.supportEmail}"><span class="notif-icon tone-purple">${icon("mail")}</span><div><strong>E-mail</strong><small>${CONFIG.supportEmail} · resposta em até 24h</small></div>${icon("chevron")}</a>
        </article>
        <article class="card">
          <div class="card-head"><strong>Status dos serviços</strong><span class="connected">● Tudo operacional</span></div>
          ${serviceStatus.map(([name, status]) => `<div class="status-row"><span>${name}</span><span>${status}</span></div>`).join("")}
        </article>
      </div>
    </div>`
  );
}

/* Casca do sistema (sidebar + topbar + conteúdo + chat) */
function renderShell() {
  $("#root").innerHTML = `
  <div class="app-shell ${state.light ? "light" : ""}" id="app-shell">
    <div class="background-wave"></div>
    <aside class="sidebar" id="sidebar">
      <div class="mobile-close"><button type="button" data-action="close-menu" aria-label="Fechar menu">×</button></div>
      ${logo()}
      <nav>${pages.map((p) => `<button type="button" class="${state.page === p.label ? "active" : ""}" data-page="${p.label}"><span>${icon(p.icon)}</span>${p.label}</button>`).join("")}</nav>
      <div class="nav-separator"></div>
      <button class="ai-button" type="button" data-action="open-chat"><span>✦</span>Assistente de Voz IA <b>Novo</b></button>
      <div class="side-footer">
        ${[["Notificações", "bell"], ["Configurações", "gear"], ["Ajuda", "help"]]
          .map(
            ([label, ic]) =>
              `<button type="button" class="${state.page === label ? "active" : ""}" data-page="${label}"><span>${icon(ic)}</span>${label}${
                label === "Notificações" ? ` <b id="notif-badge" ${unreadCount() ? "" : "hidden"}>${unreadCount()}</b>` : ""
              }</button>`
          )
          .join("")}
        <button type="button" class="company" data-action="logout"><span>${currentUser.company.split(" ").map((w) => w[0]).join("")}</span><div><strong>${currentUser.company}</strong><small>Plano Pro · Sair</small></div><i>⌄</i></button>
      </div>
    </aside>
    <div class="workspace">
      <header class="topbar">
        <button class="menu-button" type="button" data-action="open-menu" aria-label="Abrir menu">☰</button>
        <div class="topbar-brand">${logo()}</div>
        <div class="search" id="global-search"><span>⌕</span><input id="search-input" type="search" placeholder="Buscar produtos, pedidos, SKU..." autocomplete="off" aria-label="Buscar produtos, pedidos, notas e SKU" aria-controls="search-results" /><div class="search-results card" id="search-results" role="listbox" hidden></div></div>
        <div class="top-actions">
          <button class="notification" type="button" aria-label="Notificações" data-page="Notificações">${icon("bell")}<i id="notif-dot" ${unreadCount() ? "" : "hidden"}></i></button>
          <button class="theme" type="button" data-action="toggle-theme" id="theme-btn"></button>
          <button class="user" type="button"><span>${currentUser.initials}</span><strong>${currentUser.company}</strong>⌄</button>
        </div>
      </header>
      <main class="content" id="content"></main>
    </div>
    <aside class="chat-panel card" id="chat-panel" aria-label="Assistente de Voz IA" hidden>
      <div class="chat-head">${logo(true)}<div><strong>Assistente de Voz IA</strong><small id="voice-online">● Online</small></div><button type="button" data-action="close-chat" aria-label="Fechar assistente">×</button></div>
      <div class="chat-log" id="chat-log" aria-live="polite">
        <div class="message">Olá! Como posso ajudar na sua operação? Toque no microfone e fale, ou digite abaixo.</div>
      </div>
      <div class="quick-actions" id="quick-actions">${Object.keys(chatAnswers).map((t) => `<button type="button" data-quick="${t}">${t}</button>`).join("")}</div>
      <div class="voice-status" id="voice-status" data-state="parado" hidden role="status" aria-live="polite">
        <span class="voice-wave" aria-hidden="true"><i style="--n:0"></i><i style="--n:1"></i><i style="--n:2"></i><i style="--n:3"></i><i style="--n:4"></i></span>
        <span class="voice-label" id="voice-label"></span>
        <button type="button" class="voice-stop" data-action="voice-stop">Parar</button>
      </div>
      <form class="chat-input with-voice" id="chat-form"><input id="chat-input" placeholder="Pergunte sobre sua operação..." autocomplete="off" aria-label="Pergunta por texto" /><button type="button" class="voice-btn" id="voice-btn" data-action="voice" aria-label="Falar com o assistente" aria-pressed="false" title="Falar"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6"/></svg></button><button type="submit" class="chat-send" aria-label="Enviar">→</button></form>
    </aside>
    <a class="chat-fab" href="${CONFIG.telegram}" target="_blank" rel="noopener" aria-label="Abrir o bot no Telegram" title="Abrir no Telegram">${icon("telegram")}</a>
    <div class="toast" id="toast" role="status" hidden></div>
  </div>`;
  updateThemeButton();
  refreshBadge();
  return renderPage();
}

let renderToken = 0;
async function renderPage() {
  const token = ++renderToken;
  const content = $("#content");
  if (!content) return;
  if (state.page === "Início") return renderDashboard();
  const map = {
    Produtos: renderProducts,
    Pedidos: renderOrders,
    Estoque: renderStock,
    "Notas fiscais": renderInvoices,
    Marketplaces: () => renderMarketplaces(false),
    Integrações: () => renderMarketplaces(true),
    Relatórios: renderReports,
    Notificações: renderNotifications,
    Configurações: renderSettings,
    Ajuda: renderHelp,
  };
  const html = await map[state.page]();
  if (token !== renderToken) return; // usuário já trocou de página
  content.innerHTML = html;
}

function updateThemeButton() {
  const btn = $("#theme-btn");
  if (btn) btn.innerHTML = `${state.light ? "☼" : "◐"}<span>${state.light ? "Claro" : "Escuro"}</span>`;
}

function render() {
  if (state.loggedIn) return renderShell();
  renderLogin();
}

/* ---------- Tela de carregamento (splash) ----------
   O HTML do splash está no index.html (aparece antes deste arquivo carregar).
   showSplash("abertura")     -> toca uma vez, sem frase (ao abrir o sistema)
   showSplash("carregamento") -> frase + barra, repete a cada 7s se demorar
   withSplash(modo, tarefa)   -> mostra o splash até a tarefa terminar (com tempo mínimo) */
const splash = { el: $("#splash"), timer: null };
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function playSplash() {
  splash.el.classList.remove("go");
  void splash.el.offsetWidth; // reinicia as animações CSS
  splash.el.classList.add("go");
}

function showSplash(modo = "abertura") {
  if (!splash.el) return;
  const loading = modo === "carregamento";
  window.clearInterval(splash.timer);
  splash.el.classList.toggle("load", loading);
  splash.el.classList.remove("hide");
  splash.el.removeAttribute("aria-hidden");
  playSplash();
  if (loading) splash.timer = window.setInterval(playSplash, 7000);
}

function hideSplash() {
  if (!splash.el) return;
  window.clearInterval(splash.timer);
  splash.el.classList.add("hide");
  splash.el.setAttribute("aria-hidden", "true");
  $$(".taylor-stage.wait").forEach((el) => el.classList.remove("wait")); // libera a animação do login
}

async function withSplash(modo, tarefa) {
  showSplash(modo);
  const min = reducedMotion ? 400 : CONFIG.splashMin[modo];
  const wait = new Promise((resolve) => window.setTimeout(resolve, min));
  try {
    await Promise.all([tarefa(), wait]);
  } finally {
    hideSplash();
  }
}

/* ---------- 5. EVENTOS ---------- */
/* Assistente de Voz IA (RF038/RF039), mesma estrutura do frontend/taylor_voice/voice.js:
   fala -> texto (pt-BR) -> POST /api/assistant/messages -> resposta no chat e, por voz, falada.
   A interpretação (Gemini + consulta ao estoque) acontece no back-end (services/assistente_ia.py). */
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const VOICE_LABELS = { ouvindo: "Ouvindo...", processando: "Processando...", falando: "Respondendo..." };
const VOICE_ERRORS = {
  "not-allowed": "Microfone bloqueado. Permita o acesso nas configurações do navegador e tente de novo.",
  "service-not-allowed": "Microfone bloqueado. Permita o acesso nas configurações do navegador e tente de novo.",
  "no-speech": "Não ouvi nada. Toque no microfone e fale de novo.",
  "audio-capture": "Nenhum microfone encontrado neste dispositivo.",
  network: "O reconhecimento de voz precisa de internet e não conseguiu conectar.",
};
const voice = { state: "parado", rec: null, round: 0, ptVoice: null, errorTimer: null, busy: false };

function setVoiceState(next, text) {
  voice.state = next;
  window.clearTimeout(voice.errorTimer);
  const bar = $("#voice-status");
  const btn = $("#voice-btn");
  const online = $("#voice-online");
  if (bar) {
    bar.dataset.state = next;
    bar.hidden = next === "parado";
    $("#voice-label").textContent = text || VOICE_LABELS[next] || "";
  }
  if (online) online.textContent = "● " + (next === "parado" || next === "erro" ? "Online" : VOICE_LABELS[next]);
  if (btn) {
    ["ouvindo", "processando", "falando"].forEach((s) => btn.classList.toggle(s, s === next));
    btn.setAttribute("aria-pressed", String(next === "ouvindo"));
  }
  if (next === "erro") voice.errorTimer = window.setTimeout(() => voice.state === "erro" && setVoiceState("parado"), 5000);
}

function addChatMessage(text, who) {
  const log = $("#chat-log");
  if (!log) return null;
  const div = document.createElement("div");
  div.className = "message" + (who ? " " + who : "");
  if (text) div.textContent = text;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
  return div;
}

function showTyping() {
  const div = addChatMessage("", "typing");
  if (div) {
    div.setAttribute("aria-label", "Assistente está digitando");
    div.innerHTML = "<i></i><i></i><i></i>";
  }
  return div;
}

function lockChat(on) {
  $$("#quick-actions button").forEach((b) => (b.disabled = on));
  const send = $(".chat-send");
  if (send) send.disabled = on;
}

// Voz de saída: pt-BR, frases curtas (evita o corte do Chrome em falas longas) e nunca duas ao mesmo tempo.
function pickVoice() {
  const list = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
  voice.ptVoice = list.find((v) => v.lang === "pt-BR") || list.find((v) => (v.lang || "").toLowerCase().startsWith("pt")) || null;
}
if (window.speechSynthesis) {
  pickVoice();
  window.speechSynthesis.addEventListener("voiceschanged", pickVoice);
}

function stopSpeaking() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}

function speak(text) {
  return new Promise((resolve) => {
    const clean = String(text).replace(/[*_`#>]/g, " ").replace(/\s+/g, " ").trim();
    if (!window.speechSynthesis || !clean) return resolve();
    stopSpeaking();
    // Só divide em ponto seguido de espaço: "R$ 7.320,50" continua inteiro.
    const parts = clean.replace(/([.!?])\s+/g, "$1\u0001").split("\u0001").filter(Boolean);
    let left = parts.length;
    const done = () => (--left <= 0 ? resolve() : null);
    setVoiceState("falando");
    parts.forEach((t) => {
      const u = new SpeechSynthesisUtterance(t);
      u.lang = "pt-BR";
      if (voice.ptVoice) u.voice = voice.ptVoice;
      u.onend = done;
      u.onerror = done; // "canceled" também cai aqui
      window.speechSynthesis.speak(u);
    });
  });
}

// Pergunta ao backend (POST /api/assistant/messages). Por voz, a resposta também é falada.
async function answerChat(question, inputMode = "text") {
  const message = String(question).trim();
  if (!message || voice.busy) return;
  voice.busy = true;
  lockChat(true);
  const round = voice.round;
  addChatMessage(message, "user");
  if (inputMode === "voice") setVoiceState("processando");
  const typing = showTyping();

  let reply;
  let failed = false;
  if (!CONFIG.useApi) {
    await new Promise((r) => window.setTimeout(r, 400));
    reply = chatAnswers[message] || "Ainda estou aprendendo a responder isso. Conecte o backend para ver dados reais da sua operação.";
  } else {
    const res = await apiSend("POST", "/assistant/messages", { message, channel: "app", input_mode: inputMode });
    // O back-end devolve 502 com um `reply` padrão quando o Gemini está fora: mostrar esse texto.
    reply = res.data && res.data.reply;
    if (!reply) {
      failed = true;
      reply = res.status === 401 ? "Sua sessão expirou. Entre de novo para usar o assistente." : apiError(res, "Não consegui responder agora. Tente de novo em instantes.");
    }
  }

  if (typing) typing.remove();
  addChatMessage(reply, failed ? "erro" : "bot");
  voice.busy = false;
  lockChat(false);

  // Por voz: texto + voz. Digitado ou atalho: só texto.
  if (inputMode !== "voice" || round !== voice.round) return;
  await speak(reply);
  if (round === voice.round) setVoiceState("parado");
}

function stopVoice() {
  voice.round++;
  if (voice.rec) voice.rec.abort();
  stopSpeaking();
  setVoiceState("parado");
}

// Microfone: ouve; clicar de novo encerra a captura; clicar enquanto fala interrompe a fala.
function startVoice() {
  if (!Recognition) return setVoiceState("erro", "Este navegador não suporta voz. Use o Chrome ou o Edge, ou digite sua pergunta.");
  if (voice.state === "ouvindo") return voice.rec && voice.rec.stop();
  if (voice.state === "processando") return;
  stopSpeaking();
  voice.round++;

  const rec = new Recognition();
  voice.rec = rec;
  rec.lang = "pt-BR";
  rec.continuous = false;
  rec.interimResults = true;
  let heard = "";
  let failed = false;

  rec.onstart = () => setVoiceState("ouvindo");
  rec.onresult = (e) => {
    heard = Array.from(e.results).map((r) => r[0].transcript).join("");
    setVoiceState("ouvindo", "Ouvindo: " + heard);
  };
  rec.onerror = (e) => {
    if (e.error === "aborted") return;
    failed = true;
    setVoiceState("erro", VOICE_ERRORS[e.error] || "Não consegui ouvir (" + e.error + "). Tente de novo.");
  };
  rec.onend = () => {
    if (voice.rec === rec) voice.rec = null;
    if (failed || voice.state !== "ouvindo") return;
    if (heard.trim()) answerChat(heard, "voice");
    else setVoiceState("parado");
  };
  try {
    rec.start();
  } catch (err) {
    voice.rec = null;
    setVoiceState("erro", "Não foi possível iniciar o microfone. Tente de novo.");
  }
}
window.addEventListener("beforeunload", stopSpeaking);

let toastTimer;
function showToast(text, kind = "ok") {
  const el = $("#toast");
  if (!el) return;
  el.innerHTML = `${icon(kind === "error" ? "alert" : "check")}<span>${escapeHtml(text)}</span>`;
  el.classList.toggle("error", kind === "error");
  el.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (el.hidden = true), kind === "error" ? 4500 : 2600);
}

function setTheme(light) {
  state.light = light;
  $("#app-shell").classList.toggle("light", light);
  updateThemeButton();
  const themeSwitch = $('[data-setting="theme"]');
  if (themeSwitch) themeSwitch.checked = light;
}

function setPage(label) {
  state.page = label;
  $$("#sidebar [data-page]").forEach((b) => b.classList.toggle("active", b.dataset.page === label));
  $("#sidebar").classList.remove("mobile-open");
  renderPage();
  window.scrollTo({ top: 0 });
}

// Ações que dependem de confirmação: o 1º clique pede confirmação, o 2º executa.
function confirmed(btn, label) {
  if (btn.dataset.confirm) return true;
  btn.dataset.confirm = "1";
  btn.dataset.label = btn.innerHTML;
  btn.innerHTML = label;
  window.setTimeout(() => {
    if (btn.isConnected) (delete btn.dataset.confirm), (btn.innerHTML = btn.dataset.label);
  }, 3500);
  return false;
}

async function handleAction(action, btn) {
  const id = btn.dataset.id;
  switch (action) {
    case "demo-login":
      return demoLogin(btn);
    case "copy":
      return copyText(btn.dataset.copy);
    case "logout":
      if (CONFIG.useApi) apiSend("POST", "/auth/logout");
      storage.clear();
      state.loggedIn = false;
      state.demo = null;
      state.notifList = null;
      searchCache.data = null;
      state.unread = null;
      render();
      break;
    case "open-menu":
      $("#sidebar").classList.add("mobile-open");
      break;
    case "close-menu":
      $("#sidebar").classList.remove("mobile-open");
      break;
    case "toggle-theme":
      setTheme(!state.light);
      break;
    case "read-all":
      if (state.notifList) {
        const res = await apiSend("POST", "/notifications/read-all");
        if (!res.ok) return showToast(apiError(res), "error");
      }
      notifSource().forEach((n) => (n.unread = false));
      state.unread = 0;
      updateNotifications();
      showToast("Todas as notificações foram marcadas como lidas");
      break;
    case "save-settings":
      if (!CONFIG.useApi) return showToast("Alterações salvas com sucesso");
      await saveSettings();
      break;
    case "cancel-settings":
      $("#settings-panel").innerHTML = await settingsPanel();
      showToast("Alterações descartadas");
      break;
    case "certificate":
      certificateModal();
      break;
    case "save-certificate": {
      const f = new FormData($("#cert-form"));
      if (!f.get("valid_until")) return modalError("Informe a data de validade.");
      await runAction("PUT", "/settings/certificate", { holder: f.get("holder") || null, valid_until: f.get("valid_until") }, "Certificado atualizado");
      break;
    }
    case "open-chat":
      $("#chat-panel").hidden = false;
      $("#sidebar").classList.remove("mobile-open");
      break;
    case "close-chat":
      stopVoice();
      $("#chat-panel").hidden = true;
      break;
    case "voice":
      startVoice();
      break;
    case "voice-stop":
      stopVoice();
      break;
    case "close-modal":
      closeModal();
      break;
    case "soon":
      showToast("Esta função está prevista para depois do MVP.");
      break;
    // Produtos
    case "new-product":
      newProductModal();
      break;
    case "save-product":
      await saveProduct();
      break;
    case "delete-product":
      if (confirmed(btn, "Confirmar exclusão")) await runAction("DELETE", `/products/${id}`, undefined, "Produto excluído");
      break;
    // Pedidos
    case "order-status":
      if (btn.dataset.status === "cancelado" && !confirmed(btn, "Confirmar cancelamento")) return;
      await runAction("PATCH", `/orders/${id}/status`, { status: btn.dataset.status }, btn.dataset.status === "cancelado" ? "Pedido cancelado e estoque devolvido" : "Status do pedido atualizado");
      refreshBadge();
      break;
    case "export-orders":
      await exportOrders();
      break;
    // Sincronizações (dashboard, pedidos, estoque, marketplace)
    case "sync":
      await startSync(btn.dataset.path, btn);
      break;
    // Estoque
    case "review-divergences":
      await divergencesModal();
      break;
    case "resolve": {
      const body = btn.dataset.source === "channel" ? { source: "channel", integration_id: btn.dataset.integration } : { source: "central" };
      const data = await runAction("POST", `/stock/divergences/${id}/resolve`, body, null);
      if (data) showToast(`Divergência resolvida: ${data.central_stock} unidades em todos os canais`);
      break;
    }
    // Notas fiscais
    case "emit-invoice":
      await emitInvoiceModal();
      break;
    case "invoice-emit":
      await emitInvoice(id);
      break;
    case "invoice-resend":
      await emitInvoice(id, true);
      break;
    case "emit-batch": {
      const data = await runAction("POST", "/invoices/batch", {}, null, { reload: false });
      if (!data) return;
      showToast(`${data.total} NF-e em validação e envio à SEFAZ (simulada)...`);
      window.setTimeout(async () => {
        const s = await api.invoicesSummary();
        if (s) showToast(`Lote concluído: ${s.issued_today} emitidas hoje · ${s.rejected} rejeitadas · ${s.awaiting} com pendências`);
        refreshBadge();
        renderPage();
      }, 3000);
      break;
    }
    // Marketplaces e integrações
    case "connect-modal":
      await connectModal();
      break;
    case "connect":
    case "reconnect": {
      const data = await runAction("POST", action === "connect" ? "/marketplaces/connect" : `/integrations/${id}/reconnect`,
        action === "connect" ? { marketplace: btn.dataset.name } : undefined, "Canal conectado · importando produtos e pedidos...");
      if (data && data.sync_id) waitSync(data.sync_id).then(() => (refreshBadge(), renderPage()));
      break;
    }
    case "disconnect":
      if (confirmed(btn, "Confirmar")) await runAction("DELETE", `/integrations/${id}`, undefined, `${btn.dataset.name} desconectado`);
      break;
  }
}

document.addEventListener("click", (event) => {
  const target = event.target;

  // Clique fora do conteúdo do modal (no fundo escuro) fecha o modal.
  if (target.id === "modal") return closeModal();

  const auth = target.closest("[data-auth]");
  if (auth) {
    const typed = $("#login-form [name=email]") ? $("#login-form [name=email]").value.trim() : "";
    state.authMode = auth.dataset.auth;
    state.recovery = auth.dataset.auth === "forgot" ? { email: typed } : {};
    state.loginNotice = "";
    renderLogin();
    return;
  }

  const pageBtn = target.closest("[data-page]");
  if (pageBtn) {
    if (pageBtn.dataset.settingsTab) state.settingsTab = pageBtn.dataset.settingsTab;
    const fromNotif = pageBtn.closest("[data-notif]");
    if (fromNotif) markRead(fromNotif.dataset.notif);
    return setPage(pageBtn.dataset.page);
  }

  const notifFilter = target.closest("[data-notif-filter]");
  if (notifFilter) {
    state.notifFilter = notifFilter.dataset.notifFilter;
    updateNotifications();
    return;
  }

  const notifItem = target.closest("[data-notif]");
  if (notifItem) return markRead(notifItem.dataset.notif);

  const settingsTab = target.closest("[data-settings-tab]");
  if (settingsTab) {
    state.settingsTab = settingsTab.dataset.settingsTab;
    $$(".settings-nav button").forEach((b) => b.classList.toggle("active", b.dataset.settingsTab === state.settingsTab));
    settingsPanel().then((html) => {
      const panel = $("#settings-panel");
      if (panel) panel.innerHTML = html;
    });
    return;
  }

  const helpTopic = target.closest("[data-help-topic]");
  if (helpTopic) {
    state.helpTopic = state.helpTopic === helpTopic.dataset.helpTopic ? "" : helpTopic.dataset.helpTopic;
    $$("[data-help-topic]").forEach((b) => b.classList.toggle("active", b.dataset.helpTopic === state.helpTopic));
    $("#faq-list").innerHTML = faqList();
    return;
  }

  const periodBtn = target.closest("[data-period]");
  if (periodBtn) {
    state.period = periodBtn.dataset.period;
    $$("[data-period]").forEach((b) => {
      const on = b.dataset.period === state.period;
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", String(on));
    });
    loadStats();
    return;
  }

  // Abas que filtram no backend (produtos, pedidos, notas).
  const filterBtn = target.closest("[data-filter]");
  if (filterBtn) {
    state[filterBtn.dataset.filter] = filterBtn.dataset.value;
    renderPage();
    return;
  }

  const reportPeriod = target.closest("[data-report-period]");
  if (reportPeriod) {
    state.reportsPeriod = reportPeriod.dataset.reportPeriod;
    renderPage();
    return;
  }

  const rowBtn = target.closest("[data-row]");
  if (rowBtn) {
    const open = { product: productModal, order: orderModal, invoice: invoiceModal }[rowBtn.dataset.row];
    return open(rowBtn.dataset.id);
  }

  const tab = target.closest(".tabs button");
  if (tab) {
    $$("button", tab.parentElement).forEach((b) => b.classList.toggle("active", b === tab));
    return;
  }

  const seg = target.closest(".segmented button:not([data-period])");
  if (seg) {
    $$("button", seg.parentElement).forEach((b) => b.classList.toggle("on", b === seg));
    return;
  }

  const quick = target.closest("[data-quick]");
  if (quick) return answerChat(quick.dataset.quick, "quick_action");

  const syncBtn = target.closest("#sync-btn");
  if (syncBtn) {
    if (CONFIG.useApi) return startSync("/channels/sync", syncBtn);
    if (state.syncing) return;
    state.syncing = true;
    loadChannels();
    window.setTimeout(() => {
      state.syncing = false;
      state.synced = true;
      loadChannels();
    }, 1400);
    return;
  }

  const action = target.closest("[data-action]");
  if (!action || action.disabled) return;
  handleAction(action.dataset.action, action);
});

document.addEventListener("change", (event) => {
  if (event.target.id === "range-select") {
    state.range = event.target.value;
    loadChart();
  }
  if (event.target.matches('[data-setting="theme"]')) setTheme(event.target.checked);
  if (event.target.matches("[data-alert]") && CONFIG.useApi) saveAlert(event.target);
});

/* Busca global (barra do topo): procura em produtos, pedidos e notas fiscais.
   Não há rota de busca no backend: carrega as listas (cache curto) e filtra aqui.
   Clicar num resultado abre o mesmo detalhe do botão ••• (data-row / data-id). */
const SEARCH_GROUPS = [
  { kind: "product", label: "Produtos", page: "Produtos", path: "/products?ids=1", fallback: () => products, title: (r) => r[0], sub: (r) => `SKU ${r[1]} · ${r[2]} un. · ${r[3]}` },
  { kind: "order", label: "Pedidos", page: "Pedidos", path: "/orders?ids=1&limit=500", fallback: () => orders, title: (r) => `Pedido ${r[0]}`, sub: (r) => `${r[1]} · ${r[3]} · ${r[5]} · ${r[6]}` },
  { kind: "invoice", label: "Notas fiscais", page: "Notas fiscais", path: "/invoices?ids=1&limit=500", fallback: () => invoices, title: (r) => r[0], sub: (r) => `Pedido ${r[1]} · ${r[3]} · ${r[4]} · ${r[5]}` },
];
const SEARCH_HEADERS = { product: 7, order: 7, invoice: 7 }; // colunas visíveis; o id vem depois (ids=1)
const searchCache = { at: 0, data: null };
let searchTimer = null;

async function searchData() {
  if (searchCache.data && Date.now() - searchCache.at < 30000) return searchCache.data;
  const lists = await Promise.all(SEARCH_GROUPS.map((g) => apiGet(g.path, g.fallback())));
  searchCache.data = lists.map((l) => l || []);
  searchCache.at = Date.now();
  return searchCache.data;
}

async function runSearch(text) {
  const box = $("#search-results");
  if (!box) return;
  const query = normalize(text.trim());
  if (query.length < 2) return (box.hidden = true);
  box.hidden = false;
  if (!searchCache.data) box.innerHTML = `<div class="search-empty">Buscando...</div>`;
  const lists = await searchData();
  if (normalize($("#search-input").value.trim()) !== query) return; // o usuário continuou digitando
  const terms = query.split(/\s+/);
  const groups = SEARCH_GROUPS.map((g, gi) => {
    const hits = lists[gi].filter((row) => {
      const hay = normalize(row.slice(0, SEARCH_HEADERS[g.kind]).join(" "));
      return terms.every((t) => hay.includes(t));
    });
    // primeiro o que bate com o título (nome, nº do pedido ou da nota); depois o resto, na ordem original
    const score = (row) => (normalize(g.title(row)).includes(query) ? 0 : 1);
    hits.sort((a, b) => score(a) - score(b));
    return { g, hits };
  }).filter((x) => x.hits.length);
  if (!groups.length) {
    box.innerHTML = `<div class="search-empty">${icon("search")}<span>Nada encontrado para “${escapeHtml(text.trim())}”</span></div>`;
    return;
  }
  box.innerHTML = groups
    .map(({ g, hits }) => {
      const items = hits
        .slice(0, 5)
        .map((r) => {
          const id = r.length > SEARCH_HEADERS[g.kind] ? r[SEARCH_HEADERS[g.kind]] : "";
          const attrs = id ? `data-row="${g.kind}" data-id="${id}"` : `data-page="${g.page}"`;
          return `<button type="button" class="search-item" role="option" ${attrs}><strong>${escapeHtml(g.title(r))}</strong><small>${escapeHtml(g.sub(r))}</small></button>`;
        })
        .join("");
      const more = hits.length > 5 ? `<button type="button" class="search-more" data-page="${g.page}">Ver todos os ${hits.length} em ${g.label}</button>` : "";
      return `<div class="search-group"><span class="search-label">${g.label}</span>${items}${more}</div>`;
    })
    .join("");
}

function closeSearch(clear = false) {
  const box = $("#search-results");
  if (box) box.hidden = true;
  if (clear && $("#search-input")) $("#search-input").value = "";
}

document.addEventListener("focusin", (event) => {
  if (event.target.id !== "search-input") return;
  searchData(); // já começa a carregar enquanto a pessoa digita
  if (event.target.value.trim().length >= 2) runSearch(event.target.value);
});

document.addEventListener(
  "click",
  (event) => {
    const inSearch = event.target.closest && event.target.closest("#global-search");
    if (!inSearch) return closeSearch();
    if (event.target.closest(".search-item, .search-more")) closeSearch(true);
  },
  true
);

document.addEventListener("input", (event) => {
  if (event.target.id === "search-input") {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => runSearch(event.target.value), 200);
  }
  if (event.target.id === "help-search") {
    state.helpQuery = event.target.value;
    $("#faq-list").innerHTML = faqList();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.target.id === "search-input") {
    if (event.key === "Escape") return closeSearch(true);
    if (event.key === "Enter") {
      event.preventDefault();
      const first = $("#search-results .search-item");
      if (first) first.click();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      const first = $("#search-results button");
      if (first) first.focus();
      return;
    }
  }
  if (event.target.closest && event.target.closest("#search-results")) {
    const btns = $$("#search-results button");
    const i = btns.indexOf(event.target);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const next = btns[i + (event.key === "ArrowDown" ? 1 : -1)];
      (next || $("#search-input")).focus();
      return;
    }
    if (event.key === "Escape") {
      closeSearch(true);
      $("#search-input").focus();
      return;
    }
  }
  const item = event.target.closest && event.target.closest("[data-notif]");
  if (item && item === event.target && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    markRead(item.dataset.notif);
  }
});

// Login e cadastro no backend: guarda o token e os dados do usuário/empresa.
async function loginWithApi(data, error) {
  const isLogin = state.authMode === "login";
  const body = isLogin
    ? { email: data.get("email"), password: data.get("password"), remember: data.get("remember") === "on" }
    : { name: data.get("name"), company: data.get("company"), email: data.get("email"), password: data.get("password"), cnpj: data.get("cnpj") };
  const submit = $("#login-form [type=submit]");
  submit.disabled = true;
  const res = await apiSend("POST", isLogin ? "/auth/login" : "/auth/register", body);
  submit.disabled = false;
  if (!res.ok) {
    error.textContent = apiError(res, "Não foi possível entrar.");
    error.hidden = false;
    return;
  }
  storage.set(res.data.access_token, isLogin ? body.remember : true);
  applyUser(res.data);
  state.loggedIn = true;
  state.page = "Início";
  withSplash("carregamento", render);
}

function applyUser(data) {
  Object.assign(currentUser, {
    name: data.user.name.split(" ")[0],
    company: data.company ? data.company.name : "Minha empresa",
    initials: data.user.initials,
  });
  state.demo = data.demo || null;
}

// Conta Demo: o backend cria uma loja isolada com os dados de exemplo e já entra nela.
// O token fica no localStorage: reabrir o link (ou o QR code) volta para a mesma loja.
async function demoLogin(btn) {
  const error = $("#login-error");
  const label = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = "Criando sua loja...";
  const res = await apiSend("POST", "/auth/demo");
  if (!res.ok) {
    btn.disabled = false;
    btn.innerHTML = label;
    error.textContent = apiError(res, "Não foi possível criar a conta Demo.");
    error.hidden = false;
    return;
  }
  storage.set(res.data.access_token, true);
  applyUser(res.data);
  state.loggedIn = true;
  state.page = "Início";
  withSplash("carregamento", render);
}

// Copiar para a área de transferência (navigator.clipboard só existe em https/localhost).
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
  showToast("Copiado");
}

document.addEventListener("submit", (event) => {
  event.preventDefault();
  if (event.target.id === "login-form") {
    const data = new FormData(event.target);
    const error = $("#login-error");
    if (!data.get("email") || !data.get("password")) {
      error.textContent = "Preencha seu e-mail e sua senha.";
      error.hidden = false;
      return;
    }
    if (CONFIG.useApi) return loginWithApi(data, error);
    state.loggedIn = true;
    state.page = "Início";
    withSplash("carregamento", render);
  }
  if (event.target.id === "chat-form") {
    const input = $("#chat-input");
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    answerChat(text);
  }
  if (event.target.id === "recovery-form") submitRecovery(event.target);
  if (event.target.id === "product-form") saveProduct();
  if (event.target.id === "report-custom") {
    const data = new FormData(event.target);
    state.reportsFrom = data.get("from");
    state.reportsTo = data.get("to");
    renderPage();
  }
});

/* Início: splash de abertura por cima enquanto a tela de login é montada.
   Com sessão salva (Lembrar de mim), entra direto no painel. */
async function submitRecovery(form) {
  const data = new FormData(form);
  const error = $("#login-error");
  const show = (text) => error && ((error.textContent = text), (error.hidden = !text));
  if (!CONFIG.useApi) return show("Disponível só com o backend ligado (CONFIG.useApi = true).");
  const submit = form.querySelector("[type=submit]");

  if (state.authMode === "forgot") {
    const email = String(data.get("email") || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return show("Informe um e-mail válido.");
    submit.disabled = true;
    const res = await apiSend("POST", "/auth/forgot-password", { email });
    submit.disabled = false;
    if (!res.ok) return show(apiError(res));
    state.recovery = { email, sent: res.data.detail, demoLink: res.data.demo_link || "" };
    return renderLogin();
  }

  const password = String(data.get("password") || "");
  if (password.length < 6) return show("A nova senha precisa ter pelo menos 6 caracteres.");
  if (password !== data.get("confirm")) return show("As senhas não conferem.");
  submit.disabled = true;
  const res = await apiSend("POST", "/auth/reset-password", { token: state.recovery.token, password });
  submit.disabled = false;
  if (!res.ok) {
    if (res.status !== 400) return show(apiError(res));
    state.recovery.invalid = apiError(res);
    return renderLogin();
  }
  storage.clear(); // a troca de senha encerra as sessões abertas
  state.recovery = {};
  state.authMode = "login";
  state.loginNotice = res.data.detail;
  renderLogin();
}

// Link recebido por e-mail: http://.../#redefinir-senha=<token>. O token sai da barra de endereço na hora.
function readResetLink() {
  const match = location.hash.match(/^#redefinir-senha=([\w-]+)$/);
  if (!match) return false;
  history.replaceState(null, "", location.pathname + location.search);
  state.authMode = "reset";
  state.recovery = { token: match[1], checking: CONFIG.useApi };
  state.loginNotice = "";
  if (CONFIG.useApi)
    apiSend("POST", "/auth/reset-password/check", { token: match[1] }).then((res) => {
      if (state.recovery.token !== match[1]) return;
      state.recovery.checking = false;
      if (res.ok) state.recovery.email = res.data.email;
      else state.recovery.invalid = apiError(res);
      if (!state.loggedIn) renderLogin();
    });
  return true;
}

window.addEventListener("hashchange", () => {
  if (!state.loggedIn && readResetLink()) renderLogin();
});

async function boot() {
  const resetting = readResetLink();
  if (CONFIG.useApi && storage.get() && !resetting) {
    const me = await api.me();
    if (me) {
      applyUser(me);
      state.loggedIn = true;
    } else storage.clear();
  }
  return render();
}
withSplash("abertura", boot);
