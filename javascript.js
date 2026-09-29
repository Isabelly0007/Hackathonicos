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
const CONFIG = {
  useApi: false, // mude para true quando o backend estiver rodando
  apiBase: "/api", // ex.: "http://localhost:8000/api"
  logo: "assets/logo.png",
  brand: "Taylor",
  telegram: "https://t.me/taylor_assistente_bot", // link do bot/canal no Telegram
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
  { label: "Aguardando", value: 12, color: "#2f8bff" },
  { label: "Em separação", value: 18, color: "#8b5cf6" },
  { label: "Em transporte", value: 10, color: "#ff8a5b" },
  { label: "Entregue", value: 46, color: "#36db9b" },
  { label: "Cancelado", value: 4, color: "#ff5672" },
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
  ["Tênis Runner Pro", "TEN001", "24", "10", "24", "24", "24", "Sincronizado"],
  ["Mochila Urban", "MOC012", "12", "8", "12", "10", "12", "Divergência detectada"],
  ["Camiseta Essentials", "CAM034", "52", "10", "52", "52", "52", "Sincronizado"],
  ["Garrafa Térmica", "GAR203", "0", "6", "0", "0", "0", "Sem estoque"],
  ["Fone Bluetooth", "FON045", "8", "10", "8", "8", "8", "Estoque baixo"],
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

/* ---------- 3. API (troque pelos endpoints do seu backend) ---------- */
async function apiGet(path, fallback) {
  if (!CONFIG.useApi) return fallback;
  try {
    const res = await fetch(CONFIG.apiBase + path);
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  } catch (error) {
    console.warn("API indisponível em " + path + ", usando dados de exemplo.", error);
    return fallback;
  }
}

const api = {
  stats: (period) => apiGet("/dashboard/stats?period=" + encodeURIComponent(period), dashboardStats[period]),
  sales: (range) => apiGet("/dashboard/sales?range=" + encodeURIComponent(range), salesByChannel[range]),
  orderStatuses: () => apiGet("/dashboard/order-statuses", orderStatuses),
  stockAlerts: () => apiGet("/dashboard/stock-alerts", stockAlerts),
  channels: () => apiGet("/channels", connectedChannels),
  products: () => apiGet("/products", products),
  orders: () => apiGet("/orders", orders),
  stock: () => apiGet("/stock", stock),
  invoices: () => apiGet("/invoices", invoices),
  marketplaces: () => apiGet("/marketplaces", marketplaceData),
};

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
};

function icon(name) {
  return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (iconPaths[name] || "") + "</svg>";
}

/* ---------- Estado da aplicação ---------- */
const state = {
  loggedIn: false,
  authMode: "login",
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

const accentColors = { blue: "#2f8bff", purple: "#8b5cf6", red: "#ff5672", green: "#36db9b" };
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
      <defs><linearGradient id="${areaId}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#2478ff" stop-opacity=".32"/><stop offset="1" stop-color="#2478ff" stop-opacity="0"/></linearGradient></defs>
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

function marketplaceDots() {
  return `<div class="market-dots" aria-label="Mercado Livre, Shopee e Magalu"><span class="ml">ML</span><span class="sh">S</span><span class="mg">M</span></div>`;
}

function filterTabs(items) {
  return `<div class="tabs">${items.map((item, i) => `<button type="button" class="${i === 0 ? "active" : ""}">${item}</button>`).join("")}</div>`;
}

function dataTable(headers, rows, channelsIndex, statusIndex) {
  const body = rows
    .map((row) => {
      const cells = row
        .map((cell, index) => {
          if (index === channelsIndex) return `<td>${marketplaceDots()}</td>`;
          if (index === statusIndex) return `<td><span class="status ${cell.toLowerCase().replaceAll(" ", "-")}">${cell}</span></td>`;
          return `<td>${cell}</td>`;
        })
        .join("");
      return `<tr>${cells}<td><button class="more" type="button" aria-label="Mais ações">•••</button></td></tr>`;
    })
    .join("");
  return `<div class="table-scroll card"><table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}<th>Ações</th></tr></thead><tbody>${body}</tbody></table></div>`;
}

function marketLogo(index, text) {
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

function field(label, value, cls = "") {
  return `<label class="field ${cls}">${label}<input value="${escapeHtml(value)}" /></label>`;
}

function formActions() {
  return `<div class="form-actions">${button("Cancelar", "ghost")}${button("Salvar alterações", "primary", 'data-action="save-settings"')}</div>`;
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
function renderLogin() {
  const isLogin = state.authMode === "login";
  $("#root").innerHTML = `
  <main class="login-page">
    <div class="orb orb-one"></div><div class="orb orb-two"></div>
    <section class="login-copy">
      ${logo()}
      <p class="eyebrow">O hub de operação multicanal</p>
      <div class="display">Crescer em marketplaces não precisa virar um caos.</div>
      <p>A ${CONFIG.brand} conecta seus canais, sincroniza o estoque e transforma cada pedido em uma operação pronta para faturar.</p>
      <div class="operation-hub">
        <span class="hub-channel hub-ml">ML</span><span class="hub-channel hub-sh">S</span><span class="hub-channel hub-mg">M</span><span class="hub-channel hub-nf">NF-e</span>
        <div class="hub-core">${logo(true)}<strong>Seu comércio,<br />sem fronteiras</strong></div>
      </div>
      <div class="login-points"><span>✓ Estoque sem divergências</span><span>✓ NF-e em poucos cliques</span><span>✓ Todos os CNPJs em uma visão</span></div>
    </section>
    <form class="login-card" id="login-form" novalidate>
      ${logo(true)}
      <div class="auth-tabs">
        <button type="button" class="${isLogin ? "active" : ""}" data-auth="login">Entrar</button>
        <button type="button" class="${!isLogin ? "active" : ""}" data-auth="register">Criar conta</button>
      </div>
      <div class="title">${isLogin ? "Bem-vinda de volta" : "Comece sua operação conectada"}</div>
      <p>${isLogin ? `Acesse seu painel ${CONFIG.brand}` : "Configure sua empresa e seu primeiro canal"}</p>
      ${isLogin ? "" : `<div class="form-grid"><label>Seu nome<input name="name" placeholder="Nome completo" /></label><label>Empresa<input name="company" placeholder="Nome da sua loja" /></label></div>`}
      <label>E-mail<input name="email" type="email" placeholder="voce@sualoja.com.br" value="isabela@lojabeta.com.br" /></label>
      <label>Senha<input name="password" type="password" placeholder="Sua senha" value="taylor" /></label>
      ${isLogin ? "" : `<label>CNPJ<input name="cnpj" placeholder="00.000.000/0001-00" /></label>`}
      ${isLogin
        ? `<div class="login-options"><label class="check"><input type="checkbox" checked /> Lembrar de mim</label><button type="button" class="link">Esqueci minha senha</button></div>`
        : `<div class="register-note">Ao continuar, você poderá importar produtos e pedidos do seu marketplace sem planilhas.</div>`}
      <div class="form-error" id="login-error" hidden></div>
      ${button(isLogin ? "Entrar na plataforma" : "Criar minha operação", "primary").replace('type="button"', 'type="submit"')}
      <small>${isLogin ? "Ambiente seguro e protegido" : "Teste a plataforma com seus dados reais"}</small>
    </form>
  </main>`;
}

/* Dashboard */
function dashboardShell() {
  return `
  ${pageHeader(
    `Olá, ${currentUser.name} 👋`,
    "Acompanhe sua operação em todos os canais.",
    `<div class="segmented" role="group" aria-label="Período">${periods
      .map((p) => `<button type="button" class="${p === state.period ? "on" : ""}" data-period="${p}" aria-pressed="${p === state.period}">${p}</button>`)
      .join("")}</div>`
  )}
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
      <div class="card-head"><strong>Alertas de estoque</strong><a role="button" tabindex="0">Ver todos</a></div>
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
        ${marketLogo(i, c.short)}
        <div>
          <strong>${c.name}</strong>
          <small class="connected">● Conectado</small>
          <small>${c.products} produtos</small>
          <small>Última sinc.: ${state.synced ? "agora" : c.lastSync}</small>
        </div>
      </div>`
      )
      .join("") +
    `<button class="btn primary" type="button" id="sync-btn"><span class="${state.syncing ? "spin" : ""}">${icon("refresh")}</span>${state.syncing ? "Sincronizando..." : "Sincronizar agora"}</button>`;
}

function renderDashboard() {
  $("#content").innerHTML = dashboardShell();
  loadStats();
  loadChart();
  loadDonut();
  loadAlerts();
  loadChannels();
}

/* Produtos */
async function renderProducts() {
  const rows = await api.products();
  return (
    pageHeader("Produtos", "Gerencie seu catálogo e as publicações nos marketplaces.", button("＋ Novo produto")) +
    `<div class="toolbar">${filterTabs(["Todos (312)", "Ativos (298)", "Estoque baixo (10)", "Sem estoque (4)"])}<div>${button("Filtros", "secondary")}</div></div>` +
    dataTable(["Produto", "SKU", "Estoque", "Preço", "Status", "Canais", "Atualização"], rows, 5, 4)
  );
}

/* Pedidos */
async function renderOrders() {
  const rows = await api.orders();
  return (
    pageHeader("Pedidos", "Acompanhe os pedidos recebidos de todos os marketplaces.", button("Filtros", "secondary") + button("Exportar", "secondary") + button("Sincronizar pedidos")) +
    statsRow(
      [
        { label: "Pedidos hoje", value: "48", trend: "↑ 12%" },
        { label: "Vendas hoje", value: "R$ 7.320,50", trend: "↑ 18%" },
        { label: "Ticket médio", value: "R$ 152,50", trend: "↑ 5%" },
        { label: "Pedidos pendentes", value: "30", trend: "↓ 8%", tone: "danger" },
      ],
      "four"
    ) +
    `<div class="toolbar">${filterTabs(["Todos", "Aguardando", "Em separação", "Em transporte", "Entregues", "Cancelados"])}</div>` +
    dataTable(["Pedido", "Canal", "Data", "Cliente", "Itens", "Valor", "Status"], rows, undefined, 6)
  );
}

/* Estoque */
async function renderStock() {
  const rows = await api.stock();
  return (
    pageHeader("Estoque", "Visão centralizada e sincronização por canal.", button("↻ Sincronizar estoque")) +
    `<div class="stock-banner card"><div><span class="banner-icon">!</span><div><strong>2 divergências precisam da sua atenção</strong><small>As quantidades publicadas diferem do seu estoque central.</small></div></div>${button("Revisar divergências", "secondary")}</div>` +
    statsRow(
      [
        { label: "Produtos cadastrados", value: "312", trend: "100% catalogados" },
        { label: "Unidades disponíveis", value: "4.860", trend: "↑ 6% este mês" },
        { label: "Estoque baixo", value: "8", trend: "Atenção necessária", tone: "danger" },
        { label: "Sem estoque", value: "4", trend: "Reposição pendente", tone: "danger" },
      ],
      "four"
    ) +
    dataTable(["Produto", "SKU", "Estoque central", "Estoque mínimo", "Mercado Livre", "Shopee", "Magalu", "Status"], rows, undefined, 7)
  );
}

/* Notas fiscais */
async function renderInvoices() {
  const rows = await api.invoices();
  return (
    pageHeader("Notas fiscais", "Emita, valide e acompanhe suas NF-e sem sair da operação.", button("Importar XML", "secondary") + button("＋ Emitir nota fiscal")) +
    `<article class="fiscal-hero card">
      <div>
        <span class="fiscal-kicker">Motor fiscal ${CONFIG.brand}</span>
        <div class="fiscal-title">18 pedidos prontos para faturar</div>
        <p>Dados do pedido, cliente e tributação já conferidos. Emita as notas em lote e devolva o XML automaticamente para cada marketplace.</p>
        <div class="fiscal-actions">${button("Emitir 18 NF-e em lote")}${button("Revisar pedidos", "secondary")}</div>
      </div>
      <div class="fiscal-flow">
        <div><span>01</span><strong>Pedido recebido</strong><small>Dados importados</small></div><i>→</i>
        <div><span>02</span><strong>Validação fiscal</strong><small>NCM e impostos conferidos</small></div><i>→</i>
        <div class="flow-active"><span>03</span><strong>NF-e autorizada</strong><small>XML enviado ao canal</small></div>
      </div>
    </article>` +
    statsRow(
      [
        { label: "Emitidas hoje", value: "42", trend: "100% sincronizadas" },
        { label: "Aguardando emissão", value: "18", trend: "Prontas para faturar" },
        { label: "Tempo médio", value: "38 seg", trend: "↓ 12% na emissão" },
        { label: "Rejeições evitadas", value: "7", trend: "Validação inteligente" },
      ],
      "four"
    ) +
    `<div class="fiscal-insights">
      <article class="card fiscal-readiness">
        <div class="card-head"><strong>Saúde fiscal da operação</strong><span>Atualizado agora</span></div>
        <div class="readiness-score"><strong>96</strong><span>/100</span><div><b>Excelente</b><small>Seus cadastros estão prontos para emissão.</small></div></div>
        <div class="readiness-items">
          <span><i class="ok">✓</i>NCM preenchido em 308 produtos <b>99%</b></span>
          <span><i class="ok">✓</i>Certificado A1 válido <b>214 dias</b></span>
          <span><i class="warn">!</i>4 produtos sem origem fiscal <b>Corrigir</b></span>
        </div>
      </article>
      <article class="card rejection-guard">
        <div class="card-head"><strong>Guardião de rejeições</strong><span class="connected">● Ativo</span></div>
        <p>A plataforma confere 23 regras antes de enviar cada NF-e à SEFAZ.</p>
        <div class="guard-rule"><span>✓</span><div><strong>Cadastro do destinatário</strong><small>CPF/CNPJ e endereço validados</small></div></div>
        <div class="guard-rule"><span>✓</span><div><strong>Tributação por UF</strong><small>CFOP sugerido conforme destino</small></div></div>
        <div class="guard-rule"><span>✓</span><div><strong>Conciliação automática</strong><small>XML devolvido ao pedido e ao canal</small></div></div>
      </article>
    </div>
    <div class="toolbar fiscal-toolbar">${filterTabs(["Todas", "Aguardando emissão (18)", "Processando (2)", "Autorizadas", "Rejeitadas (1)"])}${button("Exportar XMLs", "secondary")}</div>` +
    dataTable(["Nota", "Pedido", "Canal", "Cliente", "Valor", "Status", "Emissão"], rows, undefined, 5)
  );
}

/* Marketplaces e Integrações */
async function renderMarketplaces(integrations = false) {
  const base = await api.marketplaces();
  const list = integrations ? [...base, ["Telegram", icon("telegram"), "Atendimento", "Ativo", "Agora"]] : base;
  const cards = list
    .map((m, index) =>
      integrations
        ? `<article class="card integration">
            ${marketLogo(index, m[1])}
            <div class="integration-name"><strong>${m[0]}</strong><small class="connected">● Conectado</small></div>
            <div><small>Conta vinculada</small><strong>${m[0] === "Telegram" ? "@lojabeta_bot" : "Loja Beta Oficial"}</strong></div>
            <div><small>Última sincronização</small><strong>Há ${index + 2} min</strong></div>
            <div class="row-actions">${button("Configurar", "secondary")}${button("Reconectar", "ghost")}${button("Desconectar", "ghost")}</div>
          </article>`
        : `<article class="card marketplace-card">
            <div class="market-title">${marketLogo(index, m[1])}<div><strong>${m[0]}</strong><small class="connected">● Conectado</small></div></div>
            <div class="market-metrics"><div><small>Produtos publicados</small><strong>${m[2]}</strong></div><div><small>Pedidos</small><strong>${m[3]}</strong></div><div><small>Vendas</small><strong>${m[4]}</strong></div></div>
            <div class="sync-note">Última sincronização há ${index + 2} minutos</div>
            <div class="row-actions">${button("Gerenciar", "secondary")}${button("↻ Sincronizar")}</div>
          </article>`
    )
    .join("");
  return (
    pageHeader(
      integrations ? "Integrações" : "Marketplaces",
      integrations ? "Conecte os serviços que fazem sua operação acontecer." : "Gerencie seus canais de venda em um só lugar.",
      integrations ? "" : button("＋ Conectar canal")
    ) + `<div class="${integrations ? "integration-list" : "marketplace-grid"}">${cards}</div>`
  );
}

/* Relatórios */
async function renderReports() {
  const [sales, prods] = await Promise.all([api.sales("7 dias"), api.products()]);
  const bars = [["Mercado Livre", "55%"], ["Shopee", "28%"], ["Magalu", "17%"]];
  return (
    pageHeader(
      "Relatórios",
      "Transforme os dados da sua operação em decisões.",
      `<div class="segmented" role="group">${["7 dias", "30 dias", "3 meses", "Personalizado"].map((p, i) => `<button type="button" class="${i === 0 ? "on" : ""}">${p}</button>`).join("")}</div>`
    ) +
    statsRow(
      [
        { label: "Vendas totais", value: "R$ 38.420", trend: "↑ 18,4%" },
        { label: "Pedidos", value: "284", trend: "↑ 12,1%" },
        { label: "Ticket médio", value: "R$ 135,28", trend: "↑ 5,2%" },
        { label: "Produtos vendidos", value: "712", trend: "↑ 8,7%" },
      ],
      "four"
    ) +
    `<div class="reports-grid">
      <article class="card report-main"><div class="card-head"><strong>Evolução das vendas</strong><span>Últimos 7 dias</span></div>${salesChart(sales, true)}</article>
      <article class="card"><div class="card-head"><strong>Vendas por marketplace</strong></div>
        <div class="bar-list">${bars.map(([name, value]) => `<div><span>${name}<b>${value}</b></span><i><em style="width:${value}"></em></i></div>`).join("")}</div>
      </article>
      <article class="card report-products"><div class="card-head"><strong>Produtos mais vendidos</strong></div>
        ${prods.slice(0, 4).map((item, index) => `<div><b>0${index + 1}</b><span>${item[0]}<small>${32 - index * 5} unidades</small></span><strong>R$ ${(2490 - index * 310).toLocaleString("pt-BR")}</strong></div>`).join("")}
      </article>
    </div>`
  );
}

/* Notificações */
function unreadCount() {
  return notifications.filter((n) => n.unread).length;
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
  const list = notifications.filter((n) => f === "Todas" || (f === "Não lidas" ? n.unread : n.type === f));
  const tabs = notifFilters
    .map((t) => `<button type="button" class="${t === f ? "active" : ""}" data-notif-filter="${t}">${t}${t === "Não lidas" ? ` (${unreadCount()})` : ""}</button>`)
    .join("");
  const items = list.length
    ? list.map(notificationItem).join("")
    : `<div class="empty-state">${icon("check")}<strong>Tudo em dia!</strong><small>Nenhuma notificação nesta categoria.</small></div>`;
  return `<div class="toolbar"><div class="tabs">${tabs}</div></div>${items}`;
}

function updateNotifications() {
  const panel = $("#notif-panel");
  if (panel) panel.innerHTML = notificationPanel();
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
  const n = notifications.find((item) => item.id === Number(id));
  if (n) n.unread = false;
  updateNotifications();
}

function renderNotifications() {
  return (
    pageHeader(
      "Notificações",
      "Tudo o que precisa da sua atenção, em todos os canais.",
      button(`${icon("check")}Marcar todas como lidas`, "secondary", 'data-action="read-all"') +
        button(`${icon("gear")}Preferências`, "primary", 'data-page="Configurações" data-settings-tab="Notificações"')
    ) +
    statsRow(
      [
        { label: "Recebidas hoje", value: "12", trend: "↑ 4 desde ontem", icon: "bell", accent: "blue" },
        { label: "Alertas críticos", value: "2", trend: "Estoque e fiscal", icon: "alert", accent: "red", tone: "danger", spark: sparkRed },
        { label: "Novos pedidos", value: "48", trend: "↑ 12%", icon: "cart", accent: "purple" },
        { label: "Entregues no Telegram", value: "126", trend: "100% entregues", icon: "telegram", accent: "green", spark: sparkFlat },
      ],
      "four"
    ) +
    `<div class="notif-layout">
      <article class="card notif-panel" id="notif-panel">${notificationPanel()}</article>
      <div class="side-stack">
        <article class="card">
          <div class="card-head"><strong>Onde receber alertas</strong></div>
          ${settingRow("Telegram", "Vinculado a @lojabeta_bot", toggle(true, "Receber no Telegram"))}
          ${settingRow("E-mail", "contato@lojabeta.com.br", toggle(true, "Receber por e-mail"))}
          ${settingRow("Navegador", "Notificações push neste dispositivo", toggle(false, "Receber no navegador"))}
          ${settingRow("Resumo diário", "Todos os dias às 08h", toggle(true, "Receber resumo diário"))}
        </article>
        ${telegramCard()}
      </div>
    </div>`
  );
}

/* Configurações */
function settingsPanel() {
  switch (state.settingsTab) {
    case "Preferências":
      return `<article class="card">
          <div class="card-head"><strong>Aparência e região</strong></div>
          ${settingRow("Tema claro", "Alterne entre o tema escuro e o claro", toggle(state.light, "Tema claro", 'data-setting="theme"'))}
          ${settingRow("Idioma", "Idioma da interface", selectBox(["Português (Brasil)", "English", "Español"], "Idioma"))}
          ${settingRow("Fuso horário", "Usado em pedidos e relatórios", selectBox(["Brasília (GMT-3)", "Manaus (GMT-4)", "Noronha (GMT-2)"], "Fuso horário"))}
        </article>
        <article class="card">
          <div class="card-head"><strong>Sincronização</strong><span>Última: há 2 min</span></div>
          ${settingRow("Sincronizar estoque automaticamente", "Atualiza todos os canais a cada venda", toggle(true, "Sincronizar estoque automaticamente"))}
          ${settingRow("Pausar anúncios sem estoque", "Evita vendas de produtos indisponíveis", toggle(true, "Pausar anúncios sem estoque"))}
          ${settingRow("Importar pedidos automaticamente", "Novos pedidos entram direto na fila de separação", toggle(true, "Importar pedidos automaticamente"))}
          ${settingRow("Intervalo de conferência", "Frequência de checagem com os marketplaces", selectBox(["A cada 5 minutos", "A cada 15 minutos", "A cada 30 minutos", "A cada hora"], "Intervalo de conferência"))}
          ${formActions()}
        </article>`;
    case "Notificações":
      return `<article class="card">
          <div class="card-head"><strong>Telegram</strong><span class="connected">● Conectado</span></div>
          ${settingRow(`<span class="inline-icon tone-telegram">${icon("telegram")}</span>@lojabeta_bot`, "Alertas ativos desde 12/09/2026", telegramLink())}
        </article>
        <article class="card">
          <div class="card-head"><strong>O que você quer receber</strong></div>
          <div class="matrix">
            <div class="matrix-row matrix-head"><div>Evento</div><span>Telegram</span><span>E-mail</span><span>Push</span></div>
            ${notifEvents
              .map(
                ([title, desc, on]) => `<div class="matrix-row"><div><strong>${title}</strong><small>${desc}</small></div>${["Telegram", "E-mail", "Push"]
                  .map((ch, i) => `<span>${toggle(on[i], `${title} por ${ch}`)}</span>`)
                  .join("")}</div>`
              )
              .join("")}
          </div>
          ${formActions()}
        </article>`;
    case "Equipe":
      return `<article class="card">
          <div class="card-head"><strong>Usuários <span>${teamMembers.length} de 10</span></strong>${button("＋ Convidar usuário")}</div>
          ${teamMembers
            .map(
              ([name, email, role, status]) => `<div class="team-row">
              <span class="team-avatar">${name.split(" ").map((w) => w[0]).join("")}</span>
              <div><strong>${name}</strong><small>${email}</small></div>
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
    case "Plano":
      return `<article class="card plan-hero">
          <div><span class="fiscal-kicker">Seu plano</span><div class="plan-name">Plano Pro</div><small>Renova em 12/10/2026 · cobrança mensal</small></div>
          <div class="plan-price">R$ 249<small>/mês</small></div>
          <div class="row-actions">${button("Comparar planos", "secondary")}${button("Fazer upgrade")}</div>
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
          ${settingRow("Forma de pagamento", "Pix automático", button("Alterar", "secondary"))}
          ${settingRow("Faturas", "Última: 12/09/2026 · R$ 249,00 · Paga", button("Ver faturas", "secondary"))}
        </article>`;
    default:
      return `<article class="card">
          <div class="card-head"><strong>Dados da empresa</strong><span>Usados na emissão de NF-e</span></div>
          <div class="profile-head"><span class="profile-avatar">${currentUser.company.split(" ").map((w) => w[0]).join("")}</span><div><strong>${currentUser.company}</strong><small>Plano Pro · cliente desde mar/2025</small></div>${button("Alterar logo", "secondary")}</div>
          <div class="fields-grid">
            ${field("Razão social", "Loja Beta Comércio Ltda", "span-2")}
            ${field("Nome fantasia", currentUser.company)}
            ${field("CNPJ", "12.345.678/0001-90")}
            ${field("Inscrição estadual", "123.456.789.110")}
            <label class="field">Regime tributário${selectBox(["Simples Nacional", "Lucro Presumido", "Lucro Real"], "Regime tributário", "")}</label>
            ${field("E-mail de contato", "contato@lojabeta.com.br")}
            ${field("Telefone", "(11) 99999-1204")}
            ${field("Endereço", "Rua das Flores, 120 · São Paulo/SP", "span-2")}
          </div>
          ${formActions()}
        </article>
        <article class="card">
          <div class="card-head"><strong>Certificado digital</strong><span class="connected">● Válido</span></div>
          ${settingRow("Certificado A1 · Loja Beta", "Expira em 214 dias (01/05/2027)", button("Substituir", "secondary"))}
        </article>`;
  }
}

function renderSettings() {
  return (
    pageHeader("Configurações", "Gerencie sua empresa, preferências, equipe e plano.") +
    `<div class="settings-layout">
      <nav class="card settings-nav" aria-label="Seções das configurações">${settingsTabs
        .map((t) => `<button type="button" class="${t.label === state.settingsTab ? "active" : ""}" data-settings-tab="${t.label}">${icon(t.icon)}${t.label}</button>`)
        .join("")}</nav>
      <div class="settings-panel" id="settings-panel">${settingsPanel()}</div>
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
          <button class="contact-row" type="button" data-action="open-chat"><span class="notif-icon">✦</span><div><strong>Assistente IA</strong><small>Respostas instantâneas sobre sua operação</small></div>${icon("chevron")}</button>
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
      <button class="ai-button" type="button" data-action="open-chat"><span>✦</span>Assistente IA <b>Novo</b></button>
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
        <div class="search"><span>⌕</span><input placeholder="Buscar produtos, pedidos, SKU..." /></div>
        <div class="top-actions">
          <button class="notification" type="button" aria-label="Notificações" data-page="Notificações">${icon("bell")}<i id="notif-dot" ${unreadCount() ? "" : "hidden"}></i></button>
          <button class="theme" type="button" data-action="toggle-theme" id="theme-btn"></button>
          <button class="user" type="button"><span>${currentUser.initials}</span><strong>${currentUser.company}</strong>⌄</button>
        </div>
      </header>
      <main class="content" id="content"></main>
    </div>
    <aside class="chat-panel card" id="chat-panel" hidden>
      <div class="chat-head">${logo(true)}<div><strong>Assistente ${CONFIG.brand}</strong><small>● Online</small></div><button type="button" data-action="close-chat" aria-label="Fechar chat">×</button></div>
      <div class="message">Olá! Como posso ajudar na sua operação?</div>
      <div class="quick-actions" id="quick-actions">${Object.keys(chatAnswers).map((t) => `<button type="button" data-quick="${t}">${t}</button>`).join("")}</div>
      <form class="chat-input" id="chat-form"><input id="chat-input" placeholder="Pergunte sobre sua operação..." autocomplete="off" /><button type="submit" aria-label="Enviar">→</button></form>
      ${telegramLink("Abrir no Telegram", "telegram-link")}
    </aside>
    <button class="chat-fab" type="button" data-action="toggle-chat" aria-label="Abrir assistente no Telegram">${icon("telegram")}</button>
    <div class="toast" id="toast" role="status" hidden></div>
  </div>`;
  updateThemeButton();
  renderPage();
}

let renderToken = 0;
async function renderPage() {
  const token = ++renderToken;
  const content = $("#content");
  if (!content) return;
  if (state.page === "Início") {
    renderDashboard();
    return;
  }
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
  if (state.loggedIn) renderShell();
  else renderLogin();
}

/* ---------- 5. EVENTOS ---------- */
function addChatMessage(text, who) {
  const panel = $("#chat-panel");
  const quick = $("#quick-actions");
  const div = document.createElement("div");
  div.className = "message" + (who === "user" ? " user" : "");
  div.textContent = text;
  panel.insertBefore(div, quick);
  panel.scrollTop = panel.scrollHeight;
}

function answerChat(question) {
  addChatMessage(question, "user");
  const reply = chatAnswers[question] || "Ainda estou aprendendo a responder isso. Conecte o backend para ver dados reais da sua operação.";
  window.setTimeout(() => addChatMessage(reply, "bot"), 400);
}

let toastTimer;
function showToast(text) {
  const el = $("#toast");
  if (!el) return;
  el.innerHTML = `${icon("check")}<span>${text}</span>`;
  el.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (el.hidden = true), 2600);
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

document.addEventListener("click", (event) => {
  const target = event.target;

  const auth = target.closest("[data-auth]");
  if (auth) {
    state.authMode = auth.dataset.auth;
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
    $("#settings-panel").innerHTML = settingsPanel();
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
  if (quick) return answerChat(quick.dataset.quick);

  if (target.closest("#sync-btn")) {
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
  if (!action) return;
  switch (action.dataset.action) {
    case "logout":
      state.loggedIn = false;
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
      notifications.forEach((n) => (n.unread = false));
      updateNotifications();
      showToast("Todas as notificações foram marcadas como lidas");
      break;
    case "save-settings":
      showToast("Alterações salvas com sucesso");
      break;
    case "open-chat":
      $("#chat-panel").hidden = false;
      $("#sidebar").classList.remove("mobile-open");
      break;
    case "close-chat":
      $("#chat-panel").hidden = true;
      break;
    case "toggle-chat":
      $("#chat-panel").hidden = !$("#chat-panel").hidden;
      break;
  }
});

document.addEventListener("change", (event) => {
  if (event.target.id === "range-select") {
    state.range = event.target.value;
    loadChart();
  }
  if (event.target.matches('[data-setting="theme"]')) setTheme(event.target.checked);
});

document.addEventListener("input", (event) => {
  if (event.target.id === "help-search") {
    state.helpQuery = event.target.value;
    $("#faq-list").innerHTML = faqList();
  }
});

document.addEventListener("keydown", (event) => {
  const item = event.target.closest && event.target.closest("[data-notif]");
  if (item && item === event.target && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    markRead(item.dataset.notif);
  }
});

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
    state.loggedIn = true;
    state.page = "Início";
    render();
  }
  if (event.target.id === "chat-form") {
    const input = $("#chat-input");
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    answerChat(text);
  }
});

/* Início */
render();
