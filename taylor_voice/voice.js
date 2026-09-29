const botao = document.getElementById("microfone");
const status = document.getElementById("status");
const mensagem = document.getElementById("mensagem");

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

const recognition = new SpeechRecognition();

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

async function processarMensagem(texto) {

    const response = await fetch(
        "http://localhost:8000/api/assistant/messages",
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                message: texto
            })
        }
    );

    const data = await response.json();

    responder(data.reply);
}