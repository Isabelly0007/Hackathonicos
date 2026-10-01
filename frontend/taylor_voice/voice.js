// Taylor Voice — fala -> texto (pt-BR) -> POST /api/assistant/messages -> texto no chat + resposta falada.
// Nenhuma chave de API aqui: a interpretação e a consulta ao estoque acontecem no back-end.

// Relativo (/api) só quando a página vem do próprio FastAPI (porta 8000) ou de um domínio real.
// Em outra porta local (Live Server, file://), aponta para o back-end em localhost:8000.
const LOCAL = ["localhost", "127.0.0.1", ""].includes(location.hostname);
const API_BASE =
    window.TAYLOR_API ||
    (location.protocol.startsWith("http") && (!LOCAL || location.port === "8000") ? "/api" : "http://localhost:8000/api");

const $ = (seletor, raiz = document) => raiz.querySelector(seletor);
const chat = $("#chat");
const botaoMic = $("#microfone");
const formTexto = $("#form-texto");
const entrada = $("#entrada");
const barra = $("#voice-status");
const rotulo = $("#voice-label");
const online = $("#online");
const temaBtn = $("#tema");

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const sintese = window.speechSynthesis;

const ROTULOS = { ouvindo: "Ouvindo...", processando: "Processando...", falando: "Respondendo..." };
const ERROS_VOZ = {
    "not-allowed": "Microfone bloqueado. Permita o acesso nas configurações do navegador e tente de novo.",
    "service-not-allowed": "Microfone bloqueado. Permita o acesso nas configurações do navegador e tente de novo.",
    "no-speech": "Não ouvi nada. Toque no microfone e fale de novo.",
    "audio-capture": "Nenhum microfone encontrado neste dispositivo.",
    "network": "O reconhecimento de voz precisa de internet e não conseguiu conectar.",
};

const voz = { estado: "parado", rec: null, rodada: 0, vozPtBr: null, timerErro: null };
let ocupado = false;

// ---------- Tema (escuro por padrão, igual ao Taylor) ----------

function aplicarTema(tema) {
    document.body.dataset.tema = tema;
    temaBtn.innerHTML = (tema === "claro" ? "☼" : "◐") + "<span>" + (tema === "claro" ? "Claro" : "Escuro") + "</span>";
    try { localStorage.setItem("taylor.voz.tema", tema); } catch (e) { /* sem storage: ignora */ }
}
temaBtn.addEventListener("click", () => aplicarTema(document.body.dataset.tema === "claro" ? "escuro" : "claro"));
try { aplicarTema(localStorage.getItem("taylor.voz.tema") === "claro" ? "claro" : "escuro"); } catch (e) { aplicarTema("escuro"); }

// ---------- Interface ----------

function definirEstado(novo, texto) {
    voz.estado = novo;
    window.clearTimeout(voz.timerErro);
    barra.dataset.state = novo;
    barra.hidden = novo === "parado";
    rotulo.textContent = texto || ROTULOS[novo] || "";
    online.textContent = "● " + (novo === "parado" || novo === "erro" ? "Online" : ROTULOS[novo]);
    ["ouvindo", "processando", "falando"].forEach((e) => botaoMic.classList.toggle(e, e === novo));
    botaoMic.setAttribute("aria-pressed", String(novo === "ouvindo"));
    if (novo === "erro") voz.timerErro = window.setTimeout(() => voz.estado === "erro" && definirEstado("parado"), 5000);
}

function adicionarMensagem(tipo, texto) {
    const div = document.createElement("div");
    div.className = "message " + tipo;
    if (texto) div.textContent = texto;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
    return div;
}

function mostrarDigitando() {
    const div = adicionarMensagem("typing");
    div.setAttribute("aria-label", "Taylor está digitando");
    div.innerHTML = "<i></i><i></i><i></i>";
    return div;
}

function bloquear(sim) {
    $("#atalhos").querySelectorAll("button").forEach((b) => (b.disabled = sim));
    $(".enviar").disabled = sim;
}

// ---------- Voz de saída ----------

function escolherVoz() {
    const lista = sintese ? sintese.getVoices() : [];
    voz.vozPtBr = lista.find((v) => v.lang === "pt-BR") || lista.find((v) => (v.lang || "").toLowerCase().startsWith("pt")) || null;
}
if (sintese) {
    escolherVoz();
    sintese.addEventListener("voiceschanged", escolherVoz);
}

function pararFala() {
    if (sintese) sintese.cancel();
}

// Fala e resolve ao terminar. Nunca duas falas ao mesmo tempo; frases curtas evitam o corte do Chrome.
function falar(texto) {
    return new Promise((resolve) => {
        const limpo = String(texto).replace(/[*_`#>]/g, " ").replace(/\s+/g, " ").trim();
        if (!sintese || !limpo) return resolve();
        pararFala();
        // Só divide em ponto seguido de espaço: "R$ 7.320,50" continua inteiro.
        const trechos = limpo.replace(/([.!?])\s+/g, "$1\u0001").split("\u0001").filter(Boolean);
        let restantes = trechos.length;
        const fim = () => (--restantes <= 0 ? resolve() : null);
        definirEstado("falando");
        trechos.forEach((t) => {
            const fala = new SpeechSynthesisUtterance(t);
            fala.lang = "pt-BR";
            if (voz.vozPtBr) fala.voice = voz.vozPtBr;
            fala.onend = fim;
            fala.onerror = fim; // "canceled" também cai aqui
            sintese.speak(fala);
        });
    });
}

// ---------- Envio ao back-end ----------

function cabecalhoAuth() {
    try {
        const token = localStorage.getItem("taylor.token") || sessionStorage.getItem("taylor.token");
        return token ? { Authorization: "Bearer " + token } : {};
    } catch (e) {
        return {};
    }
}

async function enviar(texto, modo) {
    const mensagem = texto.trim();
    if (!mensagem || ocupado) return;

    ocupado = true;
    bloquear(true);
    const rodada = voz.rodada;
    adicionarMensagem("user", mensagem);
    if (modo === "voice") definirEstado("processando");
    const digitando = mostrarDigitando();

    let resposta;
    let falhou = false;
    try {
        const r = await fetch(API_BASE + "/assistant/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...cabecalhoAuth() },
            body: JSON.stringify({ message: mensagem, channel: "app", input_mode: modo }),
        });
        const corpo = await r.text();
        let dados = {};
        try { dados = JSON.parse(corpo); } catch (e) { /* corpo não-JSON: tratado abaixo */ }

        // O back-end devolve 502 com um `reply` padrão quando o Gemini está fora: mostrar esse texto.
        if (dados.reply) {
            resposta = dados.reply;
        } else {
            console.error("Taylor: resposta inesperada", r.status, corpo.slice(0, 300));
            const detalhe =
                typeof dados.detail === "string" ? dados.detail
                : Array.isArray(dados.detail) ? dados.detail.map((d) => d.msg).join("; ")
                : null;
            throw new Error(detalhe || "O servidor respondeu com erro " + r.status + " em " + API_BASE + "/assistant/messages.");
        }
    } catch (erro) {
        falhou = true;
        resposta = erro instanceof TypeError
            ? "Não consegui falar com o servidor. Verifique se o backend está rodando."
            : erro.message;
    }

    digitando.remove();
    adicionarMensagem(falhou ? "erro" : "taylor", resposta);
    ocupado = false;
    bloquear(false);

    // Por voz: sempre texto + voz. Digitado ou atalho: só texto.
    if (modo !== "voice" || rodada !== voz.rodada) return;
    await falar(resposta);
    if (rodada === voz.rodada) definirEstado("parado");
}

// ---------- Voz de entrada ----------

function pararTudo() {
    voz.rodada++;
    if (voz.rec) voz.rec.abort();
    pararFala();
    definirEstado("parado");
}

// Microfone: ouve; clicar de novo encerra a captura; clicar enquanto fala interrompe a fala.
function alternarMicrofone() {
    if (!SpeechRecognition) {
        return definirEstado("erro", "Este navegador não suporta voz. Use o Chrome ou o Edge, ou digite sua pergunta.");
    }
    if (voz.estado === "ouvindo") return voz.rec.stop();
    if (voz.estado === "processando") return;
    pararFala();
    voz.rodada++;

    const rec = new SpeechRecognition();
    voz.rec = rec;
    rec.lang = "pt-BR";
    rec.continuous = false;
    rec.interimResults = true;
    let ouvido = "";
    let falha = false;

    rec.onstart = () => definirEstado("ouvindo");
    rec.onresult = (e) => {
        ouvido = Array.from(e.results).map((r) => r[0].transcript).join("");
        definirEstado("ouvindo", "Ouvindo: " + ouvido);
    };
    rec.onerror = (e) => {
        if (e.error === "aborted") return;
        falha = true;
        definirEstado("erro", ERROS_VOZ[e.error] || "Não consegui ouvir (" + e.error + "). Tente de novo.");
    };
    rec.onend = () => {
        if (voz.rec === rec) voz.rec = null;
        if (falha || voz.estado !== "ouvindo") return;
        if (ouvido.trim()) enviar(ouvido, "voice");
        else definirEstado("parado");
    };
    try {
        rec.start();
    } catch (err) {
        voz.rec = null;
        definirEstado("erro", "Não foi possível iniciar o microfone. Tente de novo.");
    }
}

// ---------- Eventos ----------

botaoMic.addEventListener("click", alternarMicrofone);
$("#parar").addEventListener("click", pararTudo);
$("#atalhos").addEventListener("click", (e) => {
    const b = e.target.closest("[data-quick]");
    if (b) enviar(b.dataset.quick, "quick_action");
});
formTexto.addEventListener("submit", (e) => {
    e.preventDefault();
    const texto = entrada.value;
    entrada.value = "";
    enviar(texto, "text");
});
window.addEventListener("beforeunload", pararFala);