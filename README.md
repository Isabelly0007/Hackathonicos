# Taylor (HTML + CSS + JavaScript)

Como abrir: dê dois cliques em `index.html`. Não precisa instalar nada.
(Opcional) servidor local: `npx serve .` ou a extensão Live Server do VS Code.

## Arquivos
- `index.html`  -> página base (só carrega o CSS e o JS).
- `style.css`   -> todas as cores, tamanhos e o layout responsivo.
- `javascript.js` -> telas, dados de exemplo, ações e chat.
- `assets/logo.png` -> logo (troque o arquivo para mudar a logo).

## O que editar
- Cores: variáveis `:root` no começo do `style.css` (tema claro em `.app-shell.light`).
- Nome da marca, logo e conexão com backend: bloco `CONFIG` no início do `javascript.js`.
- Números e textos de exemplo: seção "DADOS DE EXEMPLO" do `javascript.js`.
- Backend: mude `CONFIG.useApi` para `true` e ajuste `CONFIG.apiBase`.
  Cada função do objeto `api` chama um endpoint (ex.: `/dashboard/stats?period=Hoje`)
  e, se falhar, volta para os dados de exemplo.
- Login de teste: qualquer e-mail e senha preenchidos.
