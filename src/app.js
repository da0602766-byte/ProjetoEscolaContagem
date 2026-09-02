// Este arquivo é a camada de apresentação: cuida de desenhar a tela (via
// strings de HTML) e de reagir a eventos do usuário (cliques, digitação,
// envio de formulários). Toda a REGRA de negócio mora em src/core.js; as
// peças visuais reutilizáveis (botão de instalar, barra de progresso, toast,
// diálogo de confirmação, aviso de sistema, caixa de busca) moram em
// src/componentes/*.js. Aqui só chamamos essas peças e atualizamos a tela
// com o resultado.
//
// O padrão geral é: evento do usuário -> chama uma função do Core que
// devolve um NOVO estado -> commit(novoEstado) salva e redesenha a tela.
// Veja estudo/arquitetura.md para uma visão geral do fluxo de dados.
(function startSchoolCounterApp() {
  "use strict";

  const Core = globalThis.SchoolCounterCore;
  const UI = globalThis.SchoolCounterUI;
  const app = document.querySelector("#app");
  const toastRegion = document.querySelector("#toast-region");
  const confirmDialog = document.querySelector("#confirm-dialog");

  if (!Core || !UI || !app || !toastRegion || !confirmDialog) {
    document.body.textContent = "Não foi possível iniciar o sistema.";
    return;
  }

  // Peças reutilizáveis vindas de src/componentes/*.js.
  const { escapeHtml, plural, formatTime, formatDateTime } = UI.Utilitarios;
  const { renderBarraProgresso } = UI.BarraProgresso;
  const { renderAvisoArmazenamento, renderAvisoNotificacao } = UI.AvisoSistema;
  const { renderBotaoInstalar } = UI.BotaoInstalar;
  const { renderCaixaBusca, renderBuscaVazia, filtrarListaVisivel } = UI.Busca;
  const toast = UI.Toast.criarToast(toastRegion);
  const dialogoConfirmacao = UI.DialogoConfirmacao.criarDialogoConfirmacao(confirmDialog);

  let browserStorage = null;
  try {
    browserStorage = window.localStorage;
  } catch {}

  const repository = Core.createRepository(browserStorage);
  const loaded = repository.load();
  // `state` é a única fonte de verdade da aplicação (guarda lista de alunos,
  // sessão de contagem e histórico). As variáveis abaixo são estado apenas de
  // interface (não são salvas): qual aluno está sendo editado, qual tela está
  // visível, o texto digitado nas buscas, etc.
  let state = loaded.state;
  let editingId = null; // id do aluno cujo formulário de edição está aberto, ou null
  let activeView = "main"; // "main" (tela padrão) ou "history" (tela de histórico)
  const searchTerms = { setup: "", free: "" }; // texto digitado nas buscas de cada tela
  let actionLocked = false; // trava temporária contra cliques duplos/rápidos
  let bootNotice = ""; // aviso mostrado após carregar (ex.: dados migrados/corrompidos)
  let installPrompt = null; // evento do navegador para instalar o app como PWA
  let isInstalled = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

  if (loaded.status === "corrupt") {
    bootNotice = "Os dados salvos estavam inválidos. Uma cópia de segurança foi preservada e uma lista vazia foi aberta.";
  } else if (loaded.status === "migrated") {
    bootNotice = "Seus dados da versão anterior foram recuperados.";
  }

  // Rótulo do "chip" de salvamento mostrado nos cabeçalhos das telas.
  function savedLabel(timestamp) {
    if (!repository.isAvailable()) return "Não salvo";
    return timestamp ? `Salvo às ${formatTime(timestamp)}` : "Salvamento automático";
  }

  // --- Funções de renderização -------------------------------------------
  // Cada renderX() devolve uma string de HTML para uma tela inteira. `render()`
  // (mais abaixo) decide qual delas usar de acordo com o estado atual e
  // substitui todo o conteúdo de #app com `innerHTML`. É uma renderização
  // simples "de cima a baixo": toda vez que o estado muda, a tela inteira é
  // redesenhada (sem diffing como em frameworks como React/Vue).

  // Tela inicial: cadastro/edição da lista de alunos.
  function renderSetup() {
    const sorted = Core.sortStudents(state.roster);
    const setupQuery = Core.foldName(searchTerms.setup);
    const visibleCount = sorted.filter((student) => Core.foldName(student.name).includes(setupQuery)).length;
    const rows = sorted.length
      ? sorted.map((student, index) => renderStudentRow(student, index)).join("")
      : `
        <div class="empty-state">
          <div class="empty-state__icon" aria-hidden="true">✓</div>
          <h2>Sua lista começa aqui</h2>
          <p>Adicione os alunos. A ordem alfabética é aplicada automaticamente.</p>
        </div>`;

    return `
      <main class="app-shell setup-screen" id="main-content">
        <header class="hero">
          <div>
            <p class="eyebrow">Sistema de</p>
            <h1>Contagem de Alunos</h1>
            <p class="hero__subtitle">
              ${state.roster.length === 0
                ? "Cadastre a turma para começar"
                : `${state.roster.length} ${plural(state.roster.length, "aluno")} ${plural(state.roster.length, "cadastrado")}`}
            </p>
          </div>
          <div class="hero-actions">
            <button class="hero-button hero-button--history" type="button" data-action="view-history">
              Histórico <span>${state.history.length}</span>
            </button>
            <div class="save-chip"><span aria-hidden="true">●</span> ${savedLabel(null)}</div>
            ${renderBotaoInstalar({ instalavel: Boolean(installPrompt), instalado: isInstalled })}
          </div>
        </header>

        ${renderAvisoArmazenamento(repository.isAvailable())}
        ${renderAvisoNotificacao(bootNotice)}

        <div class="setup-grid">
          <section class="setup-panel" aria-labelledby="add-title">
            <div class="section-heading">
              <div>
                <p class="section-kicker">Preparação</p>
                <h2 id="add-title">Montar lista</h2>
              </div>
              <span class="count-badge">${state.roster.length}</span>
            </div>

            <form class="add-form" data-form="add-student" novalidate>
              <label for="student-name">Nome do aluno</label>
              <div class="input-action">
                <input
                  id="student-name"
                  name="studentName"
                  type="text"
                  maxlength="100"
                  autocomplete="off"
                  placeholder="Ex.: Ana Beatriz"
                  required
                />
                <button class="icon-button icon-button--primary" type="submit" aria-label="Adicionar aluno">+</button>
              </div>
              <p class="field-hint">Você poderá editar a lista até iniciar a contagem.</p>
            </form>

            <div class="setup-actions">
              <button class="button button--primary" type="button" data-action="start-sequential" ${sorted.length ? "" : "disabled"}>
                Contar em ordem <span aria-hidden="true">→</span>
              </button>
              <button class="button button--secondary button--mode" type="button" data-action="start-free" ${sorted.length ? "" : "disabled"}>
                <span class="mode-icon" aria-hidden="true">☑</span>
                <span><strong>Contagem livre</strong><small>Escolha quem deseja contar em uma lista</small></span>
              </button>
              <button class="button button--secondary" type="button" data-action="download" ${sorted.length ? "" : "disabled"}>
                Baixar lista (.csv)
              </button>
              ${sorted.length
                ? `<button class="text-button text-button--danger" type="button" data-action="clear-roster">Limpar toda a lista</button>`
                : ""}
            </div>
          </section>

          <section class="roster-panel" aria-labelledby="roster-title">
            <div class="section-heading roster-heading">
              <div>
                <p class="section-kicker">Ordem automática</p>
                <h2 id="roster-title">Lista da turma</h2>
              </div>
              ${sorted.length ? `<span class="alphabetical-chip">A–Z</span>` : ""}
            </div>
            ${sorted.length
              ? renderCaixaBusca({
                  id: "roster-search",
                  chaveBusca: "setup",
                  valor: searchTerms.setup,
                  placeholder: "Buscar quem já está na lista...",
                  contagem: visibleCount,
                }) + renderBuscaVazia(visibleCount)
              : ""}
            <div class="student-list" role="list">${rows}</div>
          </section>
        </div>
      </main>`;
  }

  // Renderiza uma linha da lista de alunos: normal (nome + botões editar/remover)
  // ou como formulário de edição, se `editingId` apontar para este aluno.
  function renderStudentRow(student, index) {
    const id = escapeHtml(student.id);
    const hidden = Core.foldName(student.name).includes(Core.foldName(searchTerms.setup)) ? "" : "hidden";
    if (editingId === student.id) {
      return `
        <form class="student-row student-row--editing" data-form="edit-student" data-id="${id}" data-search-name="${escapeHtml(Core.foldName(student.name))}" role="listitem" ${hidden}>
          <span class="student-number">${index + 1}</span>
          <label class="sr-only" for="edit-${id}">Editar nome de ${escapeHtml(student.name)}</label>
          <input id="edit-${id}" name="studentName" value="${escapeHtml(student.name)}" maxlength="100" required />
          <button class="mini-button mini-button--save" type="submit">Salvar</button>
          <button class="mini-button" type="button" data-action="cancel-edit">Cancelar</button>
        </form>`;
    }
    return `
      <div class="student-row" data-id="${id}" data-search-name="${escapeHtml(Core.foldName(student.name))}" role="listitem" ${hidden}>
        <span class="student-number">${index + 1}</span>
        <span class="student-name">${escapeHtml(student.name)}</span>
        <button class="row-action" type="button" data-action="edit" data-id="${id}" aria-label="Editar ${escapeHtml(student.name)}">Editar</button>
        <button class="row-action row-action--danger" type="button" data-action="remove" data-id="${id}" aria-label="Remover ${escapeHtml(student.name)}">×</button>
      </div>`;
  }

  // Tela de contagem no modo "sequencial": mostra o aluno anterior, o atual
  // e o próximo, com botões para confirmar ou desfazer.
  function renderCounting() {
    const session = state.session;
    const total = session.students.length;
    const current = session.students[session.currentIndex];
    const previous = session.currentIndex > 0 ? session.students[session.currentIndex - 1] : null;
    const next = session.students[session.currentIndex + 1] ?? null;
    const progress = Math.round((session.counted / total) * 100);

    return `
      <main class="app-shell counting-screen" id="main-content">
        <header class="hero hero--counting">
          <div class="count-header-row">
            <div>
              <p class="eyebrow">Contagem em andamento</p>
              <h1>${session.counted} de ${total} contabilizados</h1>
            </div>
            <button class="hero-button" type="button" data-action="end-session">Encerrar</button>
          </div>
          ${renderBarraProgresso({ rotulo: "Progresso da turma", percentual: progress, ariaLabel: "Progresso da contagem" })}
          <div class="save-chip save-chip--in-hero"><span aria-hidden="true">●</span> ${savedLabel(session.updatedAt)}</div>
        </header>

        ${renderAvisoArmazenamento(repository.isAvailable())}
        ${renderAvisoNotificacao(bootNotice)}

        <section class="count-workspace" aria-labelledby="current-title">
          <div class="lock-note"><span aria-hidden="true">▣</span> Lista bloqueada até esta contagem ser encerrada</div>

          <div class="position-pill">Aluno ${session.currentIndex + 1} de ${total}</div>

          <div class="student-context">
            ${previous
              ? `<div class="context-card context-card--previous"><span>Último contabilizado</span><strong>${escapeHtml(previous.name)}</strong></div>`
              : `<div class="context-card context-card--empty"><span>Início da lista</span><strong>Nenhum anterior</strong></div>`}

            <article class="current-card">
              <span id="current-title">Aluno atual</span>
              <h2>${escapeHtml(current.name)}</h2>
              <p>Confirme somente depois de contabilizar este aluno.</p>
            </article>

            ${next
              ? `<div class="context-card context-card--next"><span>Próximo</span><strong>${escapeHtml(next.name)}</strong></div>`
              : `<div class="context-card context-card--empty"><span>Próximo</span><strong>Último aluno da lista</strong></div>`}
          </div>

          <div class="count-actions">
            <button class="button button--secondary" type="button" data-action="undo" ${session.counted ? "" : "disabled"}>
              <span aria-hidden="true">←</span> Corrigir anterior
            </button>
            <button class="button button--primary button--confirm" type="button" data-action="confirm-student" data-student-id="${escapeHtml(current.id)}">
              Confirmar aluno <span aria-hidden="true">→</span>
            </button>
          </div>
        </section>
      </main>`;
  }

  // Tela de contagem no modo "livre": lista com busca onde cada aluno pode
  // ser marcado/desmarcado em qualquer ordem.
  function renderFreeCounting() {
    const session = state.session;
    const total = session.students.length;
    const selectedIds = new Set(session.countedStudentIds);
    const freeQuery = Core.foldName(searchTerms.free);
    const visibleCount = session.students.filter((student) => Core.foldName(student.name).includes(freeQuery)).length;
    const progress = Math.round((session.counted / total) * 100);
    const rows = session.students.map((student, index) => {
      const selected = selectedIds.has(student.id);
      return `
        <button
          class="free-student ${selected ? "free-student--selected" : ""}"
          type="button"
          data-action="toggle-free"
          data-id="${escapeHtml(student.id)}"
          data-selected="${selected}"
          data-search-name="${escapeHtml(Core.foldName(student.name))}"
          aria-pressed="${selected}"
          ${Core.foldName(student.name).includes(freeQuery) ? "" : "hidden"}
        >
          <span class="student-number">${index + 1}</span>
          <span class="student-name">${escapeHtml(student.name)}</span>
          <span class="free-check" aria-hidden="true">${selected ? "✓" : ""}</span>
        </button>`;
    }).join("");

    return `
      <main class="app-shell free-counting-screen" id="main-content">
        <header class="hero hero--counting">
          <div class="count-header-row">
            <div>
              <p class="eyebrow">Contagem livre</p>
              <h1>${session.counted} de ${total} selecionados</h1>
            </div>
            <button class="hero-button" type="button" data-action="end-session">Encerrar</button>
          </div>
          ${renderBarraProgresso({ rotulo: "Alunos marcados", percentual: progress, ariaLabel: "Progresso da seleção" })}
          <div class="save-chip save-chip--in-hero"><span aria-hidden="true">●</span> ${savedLabel(session.updatedAt)}</div>
        </header>

        ${renderAvisoArmazenamento(repository.isAvailable())}
        ${renderAvisoNotificacao(bootNotice)}

        <section class="free-workspace" aria-labelledby="free-title">
          <div class="lock-note"><span aria-hidden="true">▣</span> Cadastro bloqueado durante esta contagem</div>
          <div class="free-intro">
            <div>
              <p class="section-kicker">Escolha livremente</p>
              <h2 id="free-title">Quem você deseja contar?</h2>
              <p>Busque um nome e toque para marcar ou desmarcar.</p>
            </div>
            <span class="selected-badge">${session.counted} marcado${session.counted === 1 ? "" : "s"}</span>
          </div>

          ${renderCaixaBusca({
            id: "free-search",
            chaveBusca: "free",
            valor: searchTerms.free,
            placeholder: "Buscar aluno...",
            contagem: visibleCount,
            extraClass: "search-box--free",
          })}
          ${renderBuscaVazia(visibleCount)}

          <div class="free-list" role="list" aria-label="Lista de alunos para contagem">${rows}</div>

          <div class="free-actions">
            <button class="button button--primary" type="button" data-action="finish-free" ${session.counted ? "" : "disabled"}>
              Concluir com ${session.counted} ${plural(session.counted, "aluno")}
            </button>
            <p>Você não precisa marcar todos os alunos para concluir.</p>
          </div>
        </section>
      </main>`;
  }

  // Tela de histórico: lista todas as contagens já concluídas ou canceladas,
  // da mais recente para a mais antiga, com detalhes expansíveis por registro.
  function renderHistory() {
    const entries = [...state.history].sort((a, b) => b.endedAt - a.endedAt);
    const cards = entries.length
      ? entries.map((entry) => {
          const completed = entry.outcome === "completed";
          const names = entry.countedStudents.length
            ? `<ol class="history-names">${entry.countedStudents.map((student) => `<li>${escapeHtml(student.name)}</li>`).join("")}</ol>`
            : `<p class="history-no-names">Nenhum aluno havia sido contabilizado.</p>`;
          return `
            <article class="history-card">
              <div class="history-card__top">
                <div>
                  <span class="history-status history-status--${entry.outcome}">${completed ? "Concluída" : "Encerrada"}</span>
                  <h2>${entry.mode === "free" ? "Contagem livre" : "Ordem alfabética"}</h2>
                  <time datetime="${new Date(entry.endedAt).toISOString()}">${formatDateTime(entry.endedAt)}</time>
                </div>
                <strong class="history-total">${entry.counted}<small> de ${entry.total}</small></strong>
              </div>
              <details>
                <summary>Ver alunos contabilizados</summary>
                ${names}
                <p class="history-started">Iniciada em ${formatDateTime(entry.startedAt)}</p>
              </details>
              <button class="text-button text-button--danger history-delete" type="button" data-action="delete-history" data-id="${escapeHtml(entry.id)}">
                Excluir registro
              </button>
            </article>`;
        }).join("")
      : `<div class="empty-state history-empty">
          <div class="empty-state__icon" aria-hidden="true">◷</div>
          <h2>Nenhuma contagem registrada</h2>
          <p>Contagens concluídas e encerradas aparecerão aqui automaticamente.</p>
        </div>`;

    return `
      <main class="app-shell history-screen" id="main-content">
        <header class="hero hero--history">
          <div>
            <p class="eyebrow">Registros salvos</p>
            <h1>Histórico de contagens</h1>
            <p class="hero__subtitle">${entries.length} ${plural(entries.length, "registro")}</p>
          </div>
          <button class="hero-button" type="button" data-action="back-history">← Voltar</button>
        </header>
        ${renderAvisoArmazenamento(repository.isAvailable())}
        <section class="history-workspace">
          <div class="history-toolbar">
            <p>Os registros ficam armazenados neste navegador.</p>
            ${entries.length ? `<button class="text-button text-button--danger" type="button" data-action="clear-history">Limpar histórico</button>` : ""}
          </div>
          <div class="history-list">${cards}</div>
        </section>
      </main>`;
  }

  // Tela final, mostrada quando uma sessão chega ao status "done": resumo da
  // contagem concluída, com opção de iniciar uma nova.
  function renderDone() {
    const session = state.session;
    const total = session.students.length;
    const isFree = session.mode === "free";
    return `
      <main class="app-shell done-screen" id="main-content">
        ${renderAvisoArmazenamento(repository.isAvailable())}
        <section class="done-card">
          <div class="success-mark" aria-hidden="true">✓</div>
          <p class="section-kicker">Tudo certo</p>
          <h1>Contagem concluída!</h1>
          <p class="done-lead">
            ${isFree
              ? `<strong>${session.counted} de ${total} ${plural(total, "aluno")}</strong> foram selecionados na contagem livre.`
              : `Todos os <strong>${total} ${plural(total, "aluno")}</strong> foram contabilizados.`}
          </p>

          <dl class="summary-list">
            <div><dt>Modo</dt><dd>${isFree ? "Contagem livre" : "Ordem alfabética"}</dd></div>
            <div><dt>Contabilizados</dt><dd>${session.counted} de ${total}</dd></div>
            <div><dt>Início</dt><dd>${formatDateTime(session.startedAt)}</dd></div>
            <div><dt>Conclusão</dt><dd>${formatDateTime(session.completedAt)}</dd></div>
            <div><dt>Estado</dt><dd class="status-done">Salvo</dd></div>
          </dl>

          <button class="button button--primary" type="button" data-action="new-count">Preparar nova contagem</button>
          <button class="button button--secondary done-history-button" type="button" data-action="view-history">Ver histórico</button>
          <p class="done-hint">A lista atual será mantida e voltará a ficar disponível para edição.</p>
        </section>
      </main>`;
  }

  // Decide qual tela mostrar, olhando para `activeView` e para o estado da
  // sessão atual (state.session). É a única função que efetivamente escreve
  // no DOM (via innerHTML) — chamada sempre que algo muda.
  function render() {
    if (activeView === "history") app.innerHTML = renderHistory();
    else if (state.session?.status === "counting" && state.session.mode === "free") app.innerHTML = renderFreeCounting();
    else if (state.session?.status === "counting") app.innerHTML = renderCounting();
    else if (state.session?.status === "done") app.innerHTML = renderDone();
    else app.innerHTML = renderSetup();
  }

  // Trata erros lançados pelas funções do Core. Um DomainError (erro de
  // regra de negócio) mostra sua mensagem amigável; qualquer outro erro
  // (bug inesperado) mostra uma mensagem genérica em vez de vazar detalhes técnicos.
  function handleError(error) {
    toast.mostrar(error instanceof Core.DomainError ? error.message : "Não foi possível concluir essa ação.", "error");
  }

  // Função central que aplica um novo estado: salva no repositório, atualiza
  // a variável `state`, fecha qualquer edição em aberto e redesenha a tela.
  // Praticamente todo handler de evento termina chamando commit(...).
  function commit(nextState, message) {
    const result = repository.save(nextState);
    state = nextState;
    editingId = null;
    render();
    if (!result.persisted) {
      toast.mostrar("A alteração vale nesta aba, mas não pôde ser salva no navegador.", "error");
    } else if (message) {
      toast.mostrar(message, "success");
    }
  }

  // Evita que ações rápidas de contagem (confirmar/desfazer aluno, marcar/
  // desmarcar na contagem livre) sejam disparadas duas vezes por um duplo
  // toque acidental na tela. Ignora chamadas repetidas por 450ms.
  function lockRapidAction(callback) {
    if (actionLocked) return;
    actionLocked = true;
    try {
      callback();
    } finally {
      window.setTimeout(() => {
        actionLocked = false;
      }, 450);
    }
  }

  // Gera e baixa um arquivo .csv com a lista de alunos em ordem alfabética.
  function downloadRoster() {
    const rows = Core.sortStudents(state.roster);
    // Protege contra "CSV injection": se um nome começar com =, +, - ou @,
    // programas como Excel podem interpretá-lo como fórmula. Prefixando com
    // aspas simples, o valor é forçado a ser tratado como texto puro.
    const safeCell = (value) => {
      const protectedValue = /^[=+\-@]/.test(value) ? `'${value}` : value;
      return `"${protectedValue.replace(/"/g, '""')}"`;
    };
    const csv = ["Nº,Nome", ...rows.map((student, index) => `${index + 1},${safeCell(student.name)}`)].join("\r\n");
    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `alunos_${new Date().toLocaleDateString("pt-BR").replace(/\//g, "-")}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    toast.mostrar("Lista baixada com sucesso.");
  }

  // --- Eventos --------------------------------------------------------
  // Em vez de colocar um listener em cada botão/campo, os eventos são
  // capturados uma única vez no elemento #app e delegados conforme o
  // elemento clicado/alterado (via `closest` + atributos data-*). Isso
  // funciona mesmo depois que o HTML é totalmente redesenhado por render(),
  // porque o listener continua no elemento pai (#app), que nunca é recriado.

  // Atualiza o texto de busca digitado e filtra a lista correspondente.
  app.addEventListener("input", (event) => {
    const input = event.target.closest("input[data-list-search]");
    if (input) {
      searchTerms[input.dataset.listSearch] = input.value;
      filtrarListaVisivel(app, input);
    }
  });

  // Trata o envio dos formulários de "adicionar aluno" e "editar aluno".
  // `event.preventDefault()` evita o recarregamento de página padrão do HTML.
  app.addEventListener("submit", (event) => {
    const form = event.target.closest("form");
    if (!form) return;
    event.preventDefault();
    const formData = new FormData(form);
    const name = formData.get("studentName");
    try {
      if (form.dataset.form === "add-student") {
        commit(Core.addStudent(state, name), `${Core.normalizeName(name)} adicionado.`);
        requestAnimationFrame(() => document.querySelector("#student-name")?.focus());
      } else if (form.dataset.form === "edit-student") {
        commit(Core.renameStudent(state, form.dataset.id, name), "Nome atualizado.");
      }
    } catch (error) {
      handleError(error);
      form.querySelector("input")?.focus();
    }
  });

  // Trata todos os cliques em botões com atributo data-action, um grande
  // "switch" que decide o que fazer conforme a ação. Ações destrutivas ou
  // importantes usam dialogoConfirmacao.confirmar(...) antes de chamar o Core.
  app.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button || button.disabled) return;
    const action = button.dataset.action;

    try {
      if (action === "install-app") {
        const currentPrompt = installPrompt;
        if (!currentPrompt) return;
        currentPrompt.prompt();
        const choice = await currentPrompt.userChoice;
        installPrompt = null;
        render();
        toast.mostrar(choice.outcome === "accepted" ? "Aplicativo instalado com sucesso." : "Instalação cancelada.", choice.outcome === "accepted" ? "success" : "info");
      } else if (action === "dismiss-notice") {
        bootNotice = "";
        render();
      } else if (action === "view-history") {
        activeView = "history";
        render();
      } else if (action === "back-history") {
        activeView = "main";
        render();
      } else if (action === "delete-history") {
        const entry = state.history.find((item) => item.id === button.dataset.id);
        if (!entry) return;
        const confirmed = await dialogoConfirmacao.confirmar({
          title: "Excluir este registro?",
          message: `A contagem de ${formatDateTime(entry.endedAt)} será removida permanentemente do histórico.`,
          confirmLabel: "Excluir registro",
          danger: true,
        });
        if (confirmed) commit(Core.deleteHistoryEntry(state, entry.id), "Registro excluído.");
      } else if (action === "clear-history") {
        const confirmed = await dialogoConfirmacao.confirmar({
          title: "Limpar todo o histórico?",
          message: `Os ${state.history.length} ${plural(state.history.length, "registro")} serão removidos permanentemente.`,
          confirmLabel: "Limpar histórico",
          danger: true,
        });
        if (confirmed) commit(Core.clearHistory(state), "Histórico removido.");
      } else if (action === "edit") {
        editingId = button.dataset.id;
        render();
        requestAnimationFrame(() => document.querySelector(`[data-form="edit-student"][data-id="${CSS.escape(editingId)}"] input`)?.select());
      } else if (action === "cancel-edit") {
        editingId = null;
        render();
      } else if (action === "remove") {
        const student = state.roster.find((item) => item.id === button.dataset.id);
        if (!student) return;
        const confirmed = await dialogoConfirmacao.confirmar({
          title: "Remover aluno?",
          message: `${student.name} será removido da lista antes da contagem.`,
          confirmLabel: "Remover",
          danger: true,
        });
        if (confirmed) commit(Core.removeStudent(state, student.id), `${student.name} removido.`);
      } else if (action === "clear-roster") {
        const confirmed = await dialogoConfirmacao.confirmar({
          title: "Limpar toda a lista?",
          message: `Os ${state.roster.length} alunos cadastrados serão removidos. Essa ação não pode ser desfeita.`,
          confirmLabel: "Limpar lista",
          danger: true,
        });
        if (confirmed) commit(Core.clearRoster(state), "Lista removida.");
      } else if (action === "download") {
        downloadRoster();
      } else if (action === "start-sequential") {
        const confirmed = await dialogoConfirmacao.confirmar({
          title: "Contar em ordem?",
          message: `Os ${state.roster.length} ${plural(state.roster.length, "aluno")} serão apresentados um de cada vez em ordem alfabética. A lista ficará bloqueada.`,
          confirmLabel: "Iniciar",
        });
        if (confirmed) commit(Core.startSession(state, Date.now(), "sequential"), "Contagem em ordem iniciada.");
      } else if (action === "start-free") {
        const confirmed = await dialogoConfirmacao.confirmar({
          title: "Iniciar contagem livre?",
          message: `Você poderá buscar e marcar qualquer aluno da lista. Não será necessário seguir a ordem nem selecionar todos.`,
          confirmLabel: "Abrir lista",
        });
        if (confirmed) {
          searchTerms.free = "";
          commit(Core.startSession(state, Date.now(), "free"), "Contagem livre iniciada.");
        }
      } else if (action === "confirm-student") {
        lockRapidAction(() => {
          const currentName = state.session.students[state.session.currentIndex].name;
          const nextState = Core.advanceSession(state, Date.now(), button.dataset.studentId);
          commit(nextState, nextState.session.status === "done" ? "Contagem concluída e salva." : `${currentName} contabilizado.`);
        });
      } else if (action === "undo") {
        lockRapidAction(() => {
          const nextState = Core.undoSession(state);
          const currentName = nextState.session.students[nextState.session.currentIndex].name;
          commit(nextState, `Volte a contabilizar ${currentName}.`);
        });
      } else if (action === "toggle-free") {
        lockRapidAction(() => {
          const student = state.session.students.find((item) => item.id === button.dataset.id);
          if (!student) return;
          const wasSelected = button.dataset.selected === "true";
          const nextState = Core.toggleFreeStudent(state, student.id, Date.now(), wasSelected);
          commit(nextState, wasSelected ? `${student.name} desmarcado.` : `${student.name} contabilizado.`);
        });
      } else if (action === "finish-free") {
        const confirmed = await dialogoConfirmacao.confirmar({
          title: "Concluir contagem livre?",
          message: `${state.session.counted} de ${state.session.students.length} alunos foram marcados. Você poderá iniciar outra contagem depois.`,
          confirmLabel: "Concluir",
        });
        if (confirmed) commit(Core.finishFreeSession(state), "Contagem livre concluída e salva.");
      } else if (action === "end-session") {
        const confirmed = await dialogoConfirmacao.confirmar({
          title: "Encerrar contagem atual?",
          message: "O progresso desta contagem será apagado. A lista de alunos será mantida para edição.",
          confirmLabel: "Encerrar contagem",
          danger: true,
        });
        if (confirmed) commit(Core.discardSession(state), "Contagem encerrada; lista mantida.");
      } else if (action === "new-count") {
        const confirmed = await dialogoConfirmacao.confirmar({
          title: "Preparar nova contagem?",
          message: "O resultado concluído será encerrado e a lista atual voltará a ficar disponível para edição.",
          confirmLabel: "Continuar",
        });
        if (confirmed) commit(Core.discardSession(state), "Lista pronta para uma nova contagem.");
      }
    } catch (error) {
      handleError(error);
    }
  });

  // --- Instalação como PWA e modo offline ------------------------------
  // O navegador dispara "beforeinstallprompt" quando o app pode ser instalado
  // como aplicativo (PWA). Guardamos o evento para disparar o prompt de
  // instalação depois, quando o usuário clicar no botão "Instalar aplicativo".
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    render();
  });

  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    isInstalled = true;
    render();
    toast.mostrar("Aplicativo instalado e pronto para uso.");
  });

  // Registra o service worker (sw.js), que permite o app funcionar offline.
  // Só é feito via http(s) porque service workers não funcionam com file://.
  if ("serviceWorker" in navigator && window.location.protocol.startsWith("http")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {
        toast.mostrar("O modo offline não pôde ser ativado neste acesso.", "error");
      });
    });
  }

  // Desenha a tela pela primeira vez assim que o script carrega.
  render();

  // Avisa o usuário sobre o que aconteceu ao carregar os dados salvos
  // (sessão retomada, resultado recuperado, ou armazenamento indisponível).
  if (loaded.status === "restored" && state.session?.status === "counting") {
    toast.mostrar(`Contagem retomada: ${state.session.counted} de ${state.session.students.length}.`, "info");
  } else if (loaded.status === "restored" && state.session?.status === "done") {
    toast.mostrar("Resultado da última contagem recuperado.", "info");
  } else if (loaded.status === "unavailable") {
    toast.mostrar("O navegador não permitiu ativar o salvamento automático.", "error");
  }
})();
