const botao = document.getElementById("microfone");
const status = document.getElementById("status");
const mensagem = document.getElementById("mensagem");

// Mesma regra do CONFIG.apiBase do javascript.js: publicado (ex.: Render) ou aberto pelo backend
// (porta 8000) usa a mesma origem; aberto como arquivo ou por outro servidor local, a porta 8000.
const EM_LOCALHOST = ["localhost", "127.0.0.1", ""].includes(location.hostname);
const API_BASE =
    location.protocol.startsWith("http") && (!EM_LOCALHOST || location.port === "8000")
        ? "/api"
        : "http://localhost:8000/api";

// Token salvo pelo Taylor neste navegador (mesma chave do javascript.js).
const TOKEN_KEY = "taylor.token";
function token() {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

const recognition = SpeechRecognition ? new SpeechRecognition() : null;

if (!recognition) {
    botao.disabled = true;
    status.textContent = "Este navegador não reconhece voz. Use o Chrome ou o Edge.";
} else {
    recognition.lang = "pt-BR";
    recognition.continuous = false;
    recognition.interimResults = false;

    botao.addEventListener("click", () => {
        recognition.start();
    });

    recognition.onstart = () => {
        status.textContent = "Ouvindo...";
    };

    recognition.onresult = (event) => {

        const texto =
            event.results[0][0].transcript;

        mensagem.textContent = texto;

        status.textContent = "Entendido";

        processarMensagem(texto);
    };

    recognition.onend = () => {
        status.textContent = "Aguardando...";
    };
}

async function processarMensagem(texto) {

    const headers = { "Content-Type": "application/json" };
    if (token()) headers.Authorization = "Bearer " + token();

    try {
        const response = await fetch(
            API_BASE + "/assistant/messages",
            {
                method: "POST",

                headers,

                body: JSON.stringify({
                    message: texto,
                    input_mode: "voice"
                })
            }
        );

        if (response.status === 401) {
            responder("Entre no Taylor neste navegador primeiro, pelo login ou pela conta Demo, e depois volte aqui.");
            return;
        }

        const data = await response.json();

        responder(data.reply || data.detail);
    } catch (erro) {
        responder("Não consegui falar com o servidor. Verifique se o backend está rodando.");
    }
}

// Mostra a resposta em texto e a reproduz em áudio (RF039).
function responder(texto) {

    document.getElementById("resposta").textContent = texto;

    const fala = new SpeechSynthesisUtterance(texto);
    fala.lang = "pt-BR";
    window.speechSynthesis.speak(fala);
}
