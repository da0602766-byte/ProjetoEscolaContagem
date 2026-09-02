// Componente "botão de instalar app": aparece no topo da tela inicial quando
// o navegador oferece a instalação do PWA e ela ainda não foi feita.
(function attachBotaoInstalar(global) {
  "use strict";

  // `instalavel` indica se existe um prompt de instalação pendente
  // (window.deferredPrompt capturado em "beforeinstallprompt") e `instalado`
  // se o app já roda em modo standalone. O botão só aparece quando é
  // possível instalar e ainda não foi instalado.
  function renderBotaoInstalar({ instalavel, instalado }) {
    if (instalado || !instalavel) return "";
    return `
      <button class="install-button" type="button" data-action="install-app">
        <span aria-hidden="true">↓</span> Instalar aplicativo
      </button>`;
  }

  global.SchoolCounterUI = global.SchoolCounterUI || {};
  global.SchoolCounterUI.BotaoInstalar = { renderBotaoInstalar };
})(globalThis);
