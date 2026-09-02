// Componente "busca": a caixa de pesquisa usada tanto na lista de alunos
// cadastrados quanto na lista da contagem livre, e a função que filtra os
// itens visíveis conforme o usuário digita (sem precisar redesenhar a tela
// inteira).
(function attachBusca(global) {
  "use strict";

  const Utilitarios = global.SchoolCounterUI?.Utilitarios;

  // Gera o HTML da caixa de busca. `id` e `chaveBusca` (usado no atributo
  // data-list-search) diferenciam a busca do cadastro ("setup") da busca da
  // contagem livre ("free"); `contagem` é o número de itens visíveis, exibido
  // ao lado do campo.
  function renderCaixaBusca({ id, chaveBusca, valor, placeholder, contagem, extraClass = "" }) {
    return `
      <div class="search-box ${extraClass}">
        <span aria-hidden="true">⌕</span>
        <label class="sr-only" for="${id}">${placeholder}</label>
        <input id="${id}" type="search" data-list-search="${chaveBusca}" value="${Utilitarios.escapeHtml(valor)}" placeholder="${placeholder}" autocomplete="off" />
        <span class="search-count" data-search-count>${contagem}</span>
      </div>`;
  }

  // Mensagem mostrada quando a busca não encontra nenhum item.
  function renderBuscaVazia(contagem) {
    return `<p class="search-empty" data-search-empty ${contagem ? "hidden" : ""}>Nenhum aluno encontrado.</p>`;
  }

  // Filtra os itens visíveis de uma lista (alunos cadastrados ou lista da
  // contagem livre) conforme o texto digitado no campo de busca, escondendo
  // (`hidden`) os que não combinam, sem precisar redesenhar a tela inteira.
  // `container` é o elemento que contém os itens com atributo data-search-name.
  function filtrarListaVisivel(container, input) {
    const Core = global.SchoolCounterCore;
    const query = Core.foldName(input.value);
    const itens = [...container.querySelectorAll("[data-search-name]")];
    let visiveis = 0;
    for (const item of itens) {
      const combina = item.dataset.searchName.includes(query);
      item.hidden = !combina;
      if (combina) visiveis += 1;
    }
    const contador = container.querySelector("[data-search-count]");
    const vazio = container.querySelector("[data-search-empty]");
    if (contador) contador.textContent = String(visiveis);
    if (vazio) vazio.hidden = visiveis !== 0;
  }

  global.SchoolCounterUI = global.SchoolCounterUI || {};
  global.SchoolCounterUI.Busca = { renderCaixaBusca, renderBuscaVazia, filtrarListaVisivel };
})(globalThis);
