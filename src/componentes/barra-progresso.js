// Componente "barra de progresso": o bloco visual reutilizado nas telas de
// contagem em ordem e contagem livre, mostrando um rótulo, a porcentagem e a
// barra propriamente dita (com role="progressbar" para acessibilidade).
(function attachBarraProgresso(global) {
  "use strict";

  // Recebe um rótulo (ex.: "Progresso da turma"), a porcentagem já calculada
  // (0 a 100) e um texto de aria-label, e devolve o HTML pronto para inserir
  // dentro do cabeçalho da tela.
  function renderBarraProgresso({ rotulo, percentual, ariaLabel }) {
    return `
      <div class="progress-meta">
        <span>${rotulo}</span>
        <strong>${percentual}%</strong>
      </div>
      <div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percentual}" aria-label="${ariaLabel}">
        <span style="width: ${percentual}%"></span>
      </div>`;
  }

  global.SchoolCounterUI = global.SchoolCounterUI || {};
  global.SchoolCounterUI.BarraProgresso = { renderBarraProgresso };
})(globalThis);
