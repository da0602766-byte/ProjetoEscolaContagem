// Componente "aviso de sistema": as faixas de alerta mostradas no topo das
// telas (armazenamento indisponível, dados migrados/recuperados). São dois
// avisos parecidos, então ficam juntos no mesmo arquivo.
(function attachAvisoSistema(global) {
  "use strict";

  const Utilitarios = global.SchoolCounterUI?.Utilitarios;

  // Aviso fixo, mostrado sempre que o navegador bloqueou o localStorage
  // (ex.: aba anônima, cota cheia). `disponivel` vem de repository.isAvailable().
  function renderAvisoArmazenamento(disponivel) {
    if (disponivel) return "";
    return `
      <div class="system-alert system-alert--warning" role="alert">
        <span aria-hidden="true">!</span>
        <p><strong>Salvamento indisponível.</strong> Mantenha esta aba aberta; o navegador bloqueou o armazenamento local.</p>
      </div>`;
  }

  // Aviso temporário e dispensável (botão "×"), usado para contar ao usuário
  // o que aconteceu ao carregar os dados salvos (migração, corrupção, etc.).
  function renderAvisoNotificacao(mensagem) {
    if (!mensagem) return "";
    return `
      <div class="system-alert" role="status">
        <span aria-hidden="true">i</span>
        <p>${Utilitarios.escapeHtml(mensagem)}</p>
        <button type="button" data-action="dismiss-notice" aria-label="Fechar aviso">×</button>
      </div>`;
  }

  global.SchoolCounterUI = global.SchoolCounterUI || {};
  global.SchoolCounterUI.AvisoSistema = { renderAvisoArmazenamento, renderAvisoNotificacao };
})(globalThis);
