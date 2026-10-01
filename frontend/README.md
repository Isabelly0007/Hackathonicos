# Front-end do Taylor (HTML + CSS + JavaScript)

**Como rodar:** siga o passo a passo em [COMO-RODAR.md](../COMO-RODAR.md). O back-end serve o sistema em
http://localhost:8000 (login de teste: `isabela@lojabeta.com.br` / `taylor123`, que só vem preenchido em localhost).

**Conta Demo:** na tela de login, **Entrar com a conta Demo** cria uma loja de exemplo só sua, com todos os
dados, e mostra no Início o e-mail e a senha para usar também no bot do Telegram (@EstoqueLojas_bot). Feito
para apresentações: cada pessoa que abre o link tem a própria loja. Detalhes em [COMO-RODAR.md](../COMO-RODAR.md).

Só para ver as telas com dados de exemplo, sem back-end: mude `CONFIG.useApi` para `false` no
`javascript.js` (nesta pasta) e dê dois cliques em `index.html`.

## Arquivos
- `index.html`  -> página base (só carrega o CSS e o JS).
- `style.css`   -> todas as cores, tamanhos e o layout responsivo.
- `javascript.js` -> telas, dados de exemplo, ações e chat.
- `img/logo.svg` -> logo usada no sistema (`CONFIG.logo`); `img/` também guarda as logos dos marketplaces.
- `taylor_voice/` -> protótipo do assistente por voz (http://localhost:8000/taylor_voice/).

## O que editar
- Cores: variáveis `:root` no começo do `style.css` (tema claro em `.app-shell.light`).
- Nome da marca, logo, link do bot (`CONFIG.telegram`) e conexão com backend: bloco `CONFIG` no início do `javascript.js`.
- Números e textos de exemplo: seção "DADOS DE EXEMPLO" do `javascript.js`.
- Backend: `CONFIG.useApi` já vem `true`. Cada função do objeto `api` chama um endpoint
  (ex.: `/dashboard/stats?period=Hoje`) e, se falhar, volta para os dados de exemplo. Publicado fora de
  localhost, o front chama `/api` no mesmo endereço.
- Login de teste: `isabela@lojabeta.com.br` / `taylor123` (com `useApi: false`, qualquer e-mail e senha entram).
