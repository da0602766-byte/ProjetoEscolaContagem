// Componente "diálogo de confirmação": a caixa modal nativa (<dialog>) usada
// antes de qualquer ação destrutiva ou importante (remover aluno, iniciar
// contagem, encerrar sessão, etc.). `criarDialogoConfirmacao` é uma fábrica:
// recebe o elemento <dialog> do documento e devolve um objeto com o método
// `confirmar(opcoes)`, que devolve uma Promise<boolean>.
(function attachDialogoConfirmacao(global) {
  "use strict";

  const Utilitarios = global.SchoolCounterUI?.Utilitarios;

  function criarDialogoConfirmacao(dialogo) {
    // Preenche o <dialog> com título, mensagem e botões, abre-o como modal e
    // resolve `true` se o usuário confirmar ou `false` se cancelar/fechar.
    function confirmar({ title, message, confirmLabel, danger = false }) {
      dialogo.innerHTML = `
        <form method="dialog" class="dialog-card">
          <div class="dialog-icon ${danger ? "dialog-icon--danger" : ""}" aria-hidden="true">${danger ? "!" : "✓"}</div>
          <h2 id="dialog-title">${Utilitarios.escapeHtml(title)}</h2>
          <p>${Utilitarios.escapeHtml(message)}</p>
          <div class="dialog-actions">
            <button class="button button--secondary" value="cancel">Cancelar</button>
            <button class="button ${danger ? "button--danger" : "button--primary"}" value="confirm">${Utilitarios.escapeHtml(confirmLabel)}</button>
          </div>
        </form>`;

      return new Promise((resolve) => {
        dialogo.addEventListener("close", () => resolve(dialogo.returnValue === "confirm"), { once: true });
        dialogo.showModal();
      });
    }

    return { confirmar };
  }

  global.SchoolCounterUI = global.SchoolCounterUI || {};
  global.SchoolCounterUI.DialogoConfirmacao = { criarDialogoConfirmacao };
})(globalThis);
