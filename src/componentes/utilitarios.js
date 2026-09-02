// Funções pequenas e reutilizáveis de formatação de texto/data, usadas por
// vários componentes e pelas telas em src/app.js. Não têm HTML nem estado
// próprio — só recebem um valor e devolvem outro.
(function attachUtilitarios(global) {
  "use strict";

  // Escapa caracteres especiais de HTML antes de inserir texto do usuário nas
  // strings de template. Essencial para evitar XSS: sem isso, um aluno
  // cadastrado com um nome como "<script>" poderia executar código na página.
  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Escolhe a forma singular ou plural de uma palavra conforme a contagem.
  // Ex.: plural(1, "aluno") -> "aluno"; plural(3, "aluno") -> "alunos".
  function plural(count, singular, pluralForm = `${singular}s`) {
    return count === 1 ? singular : pluralForm;
  }

  // Formata um timestamp só como hora:minuto (ex.: usado no chip "Salvo às ...").
  function formatTime(timestamp) {
    return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(timestamp);
  }

  // Formata um timestamp como data e hora completas (ex.: usado no histórico).
  function formatDateTime(timestamp) {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(timestamp);
  }

  global.SchoolCounterUI = global.SchoolCounterUI || {};
  global.SchoolCounterUI.Utilitarios = { escapeHtml, plural, formatTime, formatDateTime };
})(globalThis);
