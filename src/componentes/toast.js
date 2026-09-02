// Componente "toast": o aviso temporário que aparece no canto da tela depois
// de uma ação (ex.: "Aluno adicionado.", "Não foi possível concluir essa ação.").
// `criarToast` é uma fábrica: recebe o elemento onde o aviso deve aparecer e
// devolve um objeto com o método `mostrar(mensagem, tipo)`, escondendo o
// controle do temporizador (setTimeout) dentro do próprio componente.
(function attachToast(global) {
  "use strict";

  const Utilitarios = global.SchoolCounterUI?.Utilitarios;

  function criarToast(regiao) {
    let temporizador = 0;

    // Mostra uma mensagem (tipo "success", "error" ou "info") por 2.8s,
    // substituindo qualquer aviso anterior que ainda estivesse visível.
    function mostrar(mensagem, tipo = "success") {
      window.clearTimeout(temporizador);
      regiao.innerHTML = `<div class="toast toast--${tipo}" role="status">${Utilitarios.escapeHtml(mensagem)}</div>`;
      temporizador = window.setTimeout(() => {
        regiao.innerHTML = "";
      }, 2800);
    }

    return { mostrar };
  }

  global.SchoolCounterUI = global.SchoolCounterUI || {};
  global.SchoolCounterUI.Toast = { criarToast };
})(globalThis);
