// Este arquivo \u00e9 o "n\u00facleo" (core) do sistema: cont\u00e9m somente regras de neg\u00f3cio,
// valida\u00e7\u00e3o e persist\u00eancia. N\u00e3o manipula o DOM nem sabe como a tela \u00e9 desenhada
// (isso \u00e9 responsabilidade do src/app.js). Essa separa\u00e7\u00e3o \u00e9 conhecida como
// "l\u00f3gica de dom\u00ednio" vs "camada de apresenta\u00e7\u00e3o".
//
// Todas as fun\u00e7\u00f5es de muta\u00e7\u00e3o de estado (addStudent, startSession, etc.) seguem
// o mesmo padr\u00e3o: recebem o estado atual e devolvem um ESTADO NOVO, sem alterar
// o original (imutabilidade). Isso facilita testar, desfazer a\u00e7\u00f5es e evitar bugs
// de refer\u00eancia compartilhada. Veja estudo/imutabilidade.md para mais detalhes.
(function attachSchoolCounterCore(global) {
  "use strict";

  // Vers\u00e3o do formato de dados salvo. Sempre que a estrutura do estado mudar de
  // forma incompat\u00edvel, incremente esse n\u00famero e crie uma rotina de migra\u00e7\u00e3o
  // (veja migratePreviousVersion / migrateLegacy mais abaixo).
  const VERSION = 3;
  const STORAGE_KEY = "contagem-alunos:v3";
  // Chaves usadas por vers\u00f5es anteriores do app, mantidas aqui apenas para
  // permitir a migra\u00e7\u00e3o autom\u00e1tica dos dados de quem j\u00e1 usava o sistema.
  const PREVIOUS_STORAGE_KEYS = ["contagem-alunos:v2", "contagem-alunos:v1"];
  const LEGACY_KEYS = { roster: "sc_roster", session: "sc_session" };
  const MAX_NAME_LENGTH = 100;
  // Intl.Collator compara textos respeitando acentos e n\u00fameros como um humano
  // ordenaria (ex.: "\u00c1gata" antes de "Beatriz", "Aluno 2" antes de "Aluno 10").
  const collator = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true });

  // Erro customizado para falhas de regra de neg\u00f3cio (nome duplicado, lista
  // bloqueada, etc.), diferente de um erro de programa\u00e7\u00e3o. O `code` permite que
  // quem chamar identifique o motivo sem depender do texto da mensagem.
  class DomainError extends Error {
    constructor(code, message) {
      super(message);
      this.name = "DomainError";
      this.code = code;
    }
  }

  // Remove espa\u00e7os nas pontas e colapsa espa\u00e7os duplicados no meio do nome.
  function normalizeName(value) {
    return String(value ?? "").trim().replace(/\s+/g, " ");
  }

  // Gera uma vers\u00e3o "dobrada" do nome para compara\u00e7\u00e3o: sem acentos e em
  // min\u00fasculas. Usada para detectar duplicidade ("Ana" e "ANA" e "ana" e "An\u00e0"
  // devem ser tratados como o mesmo aluno).
  function foldName(value) {
    return normalizeName(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR");
  }

  // Cria um identificador \u00fanico para cada aluno/sess\u00e3o/registro de hist\u00f3rico.
  // Usa crypto.randomUUID quando dispon\u00edvel (mais seguro); caso contr\u00e1rio,
  // recorre a um fallback simples baseado em timestamp + n\u00famero aleat\u00f3rio.
  function createId() {
    if (global.crypto && typeof global.crypto.randomUUID === "function") {
      return global.crypto.randomUUID();
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  // Estado inicial usado quando n\u00e3o h\u00e1 nada salvo ainda.
  function createInitialState() {
    return { version: VERSION, roster: [], session: null, history: [] };
  }

  // Verifica se o valor é um "objeto simples" (não null, não array). Usado
  // pelas funções de validação abaixo antes de acessar propriedades.
  function isRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  // Confere se um objeto tem o formato exato de um aluno válido. Isso é
  // importante porque o estado pode vir do localStorage, que pode conter
  // dados corrompidos ou adulterados — nunca confiamos "cegamente" nele.
  function isValidStudent(student) {
    return (
      isRecord(student) &&
      typeof student.id === "string" &&
      student.id.length > 0 &&
      typeof student.name === "string" &&
      student.name === normalizeName(student.name) &&
      student.name.length > 0 &&
      student.name.length <= MAX_NAME_LENGTH
    );
  }

  // Garante que não existam dois alunos com o mesmo id ou com nomes iguais
  // (ignorando acentos/maiúsculas), tanto na lista geral quanto em uma sessão.
  function hasUniqueStudents(students) {
    const ids = new Set();
    const names = new Set();
    for (const student of students) {
      const folded = foldName(student.name);
      if (ids.has(student.id) || names.has(folded)) return false;
      ids.add(student.id);
      names.add(folded);
    }
    return true;
  }

  // Valida um registro do histórico (uma contagem já finalizada ou cancelada),
  // conferindo consistência entre "quantos foram contados" e a lista real de
  // alunos contados.
  function isValidHistoryEntry(entry) {
    if (!isRecord(entry)) return false;
    if (typeof entry.id !== "string" || !entry.id || typeof entry.sessionId !== "string") return false;
    if (!["completed", "cancelled"].includes(entry.outcome)) return false;
    if (!["sequential", "free"].includes(entry.mode)) return false;
    if (!Number.isInteger(entry.total) || entry.total < 1) return false;
    if (!Array.isArray(entry.countedStudents) || !entry.countedStudents.every(isValidStudent)) return false;
    if (!hasUniqueStudents(entry.countedStudents) || entry.counted !== entry.countedStudents.length) return false;
    if (entry.counted < 0 || entry.counted > entry.total) return false;
    if (![entry.startedAt, entry.endedAt].every(Number.isFinite)) return false;
    if (entry.outcome === "completed" && entry.mode === "sequential" && entry.counted !== entry.total) return false;
    return true;
  }

  // Função central de validação: confere se o estado inteiro (lista de alunos,
  // sessão de contagem ativa e histórico) é internamente consistente. É chamada
  // sempre antes de salvar e sempre que dados são carregados do localStorage,
  // funcionando como uma "rede de segurança" contra estados corrompidos.
  function validateState(state) {
    if (!isRecord(state) || state.version !== VERSION || !Array.isArray(state.roster)) return false;
    if (!state.roster.every(isValidStudent) || !hasUniqueStudents(state.roster)) return false;
    if (!Array.isArray(state.history) || !state.history.every(isValidHistoryEntry)) return false;
    if (new Set(state.history.map((entry) => entry.id)).size !== state.history.length) return false;
    if (state.session === null) return true;

    const session = state.session;
    if (!isRecord(session) || !Array.isArray(session.students) || session.students.length === 0) return false;
    if (!session.students.every(isValidStudent) || !hasUniqueStudents(session.students)) return false;
    if (!["sequential", "free"].includes(session.mode)) return false;
    if (!["counting", "done"].includes(session.status)) return false;
    if (!Number.isInteger(session.counted) || !Array.isArray(session.countedStudentIds)) return false;
    if (![session.startedAt, session.updatedAt].every(Number.isFinite)) return false;

    if (state.roster.length !== session.students.length) return false;
    const rosterById = new Map(state.roster.map((student) => [student.id, student.name]));
    if (session.students.some((student) => rosterById.get(student.id) !== student.name)) return false;

    const studentIds = new Set(session.students.map((student) => student.id));
    const countedIds = new Set(session.countedStudentIds);
    if (countedIds.size !== session.countedStudentIds.length) return false;
    if (session.countedStudentIds.some((id) => !studentIds.has(id))) return false;
    if (session.counted !== session.countedStudentIds.length) return false;
    if (session.counted < 0 || session.counted > session.students.length) return false;

    if (session.mode === "sequential") {
      if (!Number.isInteger(session.currentIndex)) return false;
      const expectedIds = session.students.slice(0, session.counted).map((student) => student.id);
      if (expectedIds.some((id, index) => id !== session.countedStudentIds[index])) return false;
      if (session.status === "counting") {
        if (session.currentIndex < 0 || session.currentIndex >= session.students.length) return false;
        if (session.counted !== session.currentIndex) return false;
        if (session.currentStudentId !== session.students[session.currentIndex].id) return false;
        if (session.completedAt !== null) return false;
      } else {
        if (session.currentIndex !== session.students.length || session.counted !== session.students.length) return false;
        if (session.currentStudentId !== null || !Number.isFinite(session.completedAt)) return false;
      }
    } else {
      if (session.currentIndex !== null || session.currentStudentId !== null) return false;
      if (session.status === "counting" && session.completedAt !== null) return false;
      if (session.status === "done" && !Number.isFinite(session.completedAt)) return false;
    }

    const expectedLastId = session.countedStudentIds.at(-1) ?? null;
    return session.lastCompletedId === expectedLastId;
  }

  // Regra de negócio: a lista de alunos só pode ser editada (adicionar,
  // renomear, remover, limpar) quando não há nenhuma contagem em andamento.
  function assertEditable(state) {
    if (state.session !== null) {
      throw new DomainError("ROSTER_LOCKED", "A lista está bloqueada durante uma contagem.");
    }
  }

  // Valida o nome digitado para um novo aluno ou para renomear um existente:
  // não pode ser vazio, não pode passar do tamanho máximo e não pode duplicar
  // um nome já cadastrado (ignorando o próprio aluno ao renomear, via `ignoredId`).
  function validateNewName(state, rawName, ignoredId = null) {
    const name = normalizeName(rawName);
    if (!name) throw new DomainError("EMPTY_NAME", "Digite o nome do aluno.");
    if (name.length > MAX_NAME_LENGTH) {
      throw new DomainError("LONG_NAME", `Use no máximo ${MAX_NAME_LENGTH} caracteres.`);
    }
    const duplicate = state.roster.some(
      (student) => student.id !== ignoredId && foldName(student.name) === foldName(name),
    );
    if (duplicate) throw new DomainError("DUPLICATE_NAME", "Esse aluno já está na lista.");
    return name;
  }

  // Adiciona um aluno novo ao final da lista (a ordem visual/alfabética é
  // aplicada depois, na hora de renderizar/iniciar a contagem — veja sortStudents).
  function addStudent(state, rawName) {
    assertEditable(state);
    const name = validateNewName(state, rawName);
    return { ...state, roster: [...state.roster, { id: createId(), name }] };
  }

  // Troca o nome de um aluno existente, mantendo seu id.
  function renameStudent(state, studentId, rawName) {
    assertEditable(state);
    if (!state.roster.some((student) => student.id === studentId)) {
      throw new DomainError("NOT_FOUND", "Aluno não encontrado.");
    }
    const name = validateNewName(state, rawName, studentId);
    return {
      ...state,
      roster: state.roster.map((student) => (student.id === studentId ? { ...student, name } : student)),
    };
  }

  function removeStudent(state, studentId) {
    assertEditable(state);
    if (!state.roster.some((student) => student.id === studentId)) {
      throw new DomainError("NOT_FOUND", "Aluno não encontrado.");
    }
    return { ...state, roster: state.roster.filter((student) => student.id !== studentId) };
  }

  // Apaga todos os alunos cadastrados (usado no botão "Limpar toda a lista").
  function clearRoster(state) {
    assertEditable(state);
    return { ...state, roster: [] };
  }

  // Ordena os alunos em ordem alfabética (pt-BR) usando o collator definido
  // no topo do arquivo. Retorna uma cópia nova; não altera o array recebido.
  function sortStudents(students) {
    return [...students].sort((a, b) => collator.compare(a.name, b.name));
  }

  // Inicia uma nova sessão de contagem a partir da lista de alunos atual.
  // `mode` define o tipo de contagem:
  //  - "sequential": os alunos aparecem um de cada vez, em ordem alfabética,
  //    e precisam ser confirmados em sequência (veja advanceSession/undoSession).
  //  - "free": todos os alunos aparecem numa lista e podem ser marcados/
  //    desmarcados em qualquer ordem (veja toggleFreeStudent/finishFreeSession).
  function startSession(state, now = Date.now(), mode = "sequential") {
    if (state.session !== null) {
      throw new DomainError("SESSION_EXISTS", "Já existe uma contagem ativa ou concluída.");
    }
    if (state.roster.length === 0) {
      throw new DomainError("EMPTY_ROSTER", "Cadastre pelo menos um aluno antes de começar.");
    }
    if (!["sequential", "free"].includes(mode)) {
      throw new DomainError("INVALID_MODE", "Escolha um modo de contagem válido.");
    }
    const students = sortStudents(state.roster);
    return {
      ...state,
      session: {
        id: createId(),
        mode,
        students,
        currentIndex: mode === "sequential" ? 0 : null,
        currentStudentId: mode === "sequential" ? students[0].id : null,
        lastCompletedId: null,
        countedStudentIds: [],
        counted: 0,
        status: "counting",
        startedAt: now,
        updatedAt: now,
        completedAt: null,
      },
    };
  }

  // Registra o resultado de uma sessão (concluída ou cancelada) no histórico.
  // `outcome` é "completed" quando a contagem terminou normalmente e
  // "cancelled" quando o usuário encerrou antes do fim. Evita duplicar o
  // mesmo registro se a função for chamada mais de uma vez para a mesma sessão.
  function appendHistory(state, session, outcome, endedAt) {
    if (state.history.some((entry) => entry.sessionId === session.id)) return state.history;
    const studentsById = new Map(session.students.map((student) => [student.id, student]));
    const countedStudents = session.countedStudentIds
      .map((id) => studentsById.get(id))
      .filter(Boolean)
      .map((student) => ({ ...student }));
    return [
      ...state.history,
      {
        id: createId(),
        sessionId: session.id,
        outcome,
        mode: session.mode,
        total: session.students.length,
        counted: countedStudents.length,
        countedStudents,
        startedAt: session.startedAt,
        endedAt,
      },
    ];
  }

  // Confirma o aluno atual da contagem sequencial e avança para o próximo.
  // `expectedStudentId` é uma proteção contra "ações desatualizadas": se a
  // tela do usuário estava mostrando um aluno que já não é mais o atual
  // (por exemplo, dois cliques rápidos), a ação é rejeitada em vez de avançar
  // o aluno errado. Quando o último aluno é confirmado, a sessão passa para
  // "done" e um registro é criado automaticamente no histórico.
  function advanceSession(state, now = Date.now(), expectedStudentId = null) {
    const session = state.session;
    if (!session || session.status !== "counting" || session.mode !== "sequential") {
      throw new DomainError("NO_SEQUENTIAL_SESSION", "Não há uma contagem em ordem em andamento.");
    }
    if (expectedStudentId !== null && expectedStudentId !== session.currentStudentId) {
      throw new DomainError("STALE_ACTION", "Esse aluno já foi contabilizado.");
    }
    const completedId = session.students[session.counted].id;
    const countedStudentIds = [...session.countedStudentIds, completedId];
    const counted = countedStudentIds.length;
    const done = counted === session.students.length;
    const nextSession = {
      ...session,
      countedStudentIds,
      counted,
      currentIndex: counted,
      currentStudentId: done ? null : session.students[counted].id,
      lastCompletedId: completedId,
      status: done ? "done" : "counting",
      updatedAt: now,
      completedAt: done ? now : null,
    };
    return {
      ...state,
      session: nextSession,
      history: done ? appendHistory(state, nextSession, "completed", now) : state.history,
    };
  }

  // Desfaz a última confirmação da contagem sequencial, voltando ao aluno
  // anterior (botão "Corrigir anterior"). Só funciona se já houver pelo menos
  // um aluno contado.
  function undoSession(state, now = Date.now()) {
    const session = state.session;
    if (!session || session.status !== "counting" || session.mode !== "sequential" || session.counted === 0) {
      throw new DomainError("NOTHING_TO_UNDO", "Ainda não há aluno anterior para corrigir.");
    }
    const countedStudentIds = session.countedStudentIds.slice(0, -1);
    const counted = countedStudentIds.length;
    return {
      ...state,
      session: {
        ...session,
        countedStudentIds,
        counted,
        currentIndex: counted,
        currentStudentId: session.students[counted].id,
        lastCompletedId: countedStudentIds.at(-1) ?? null,
        updatedAt: now,
      },
    };
  }

  // Marca ou desmarca um aluno na contagem livre. `expectedSelected` funciona
  // como o `expectedStudentId` de advanceSession: evita que um clique
  // desatualizado desfaça uma marcação que o usuário já tinha feito de outra forma.
  function toggleFreeStudent(state, studentId, now = Date.now(), expectedSelected = null) {
    const session = state.session;
    if (!session || session.status !== "counting" || session.mode !== "free") {
      throw new DomainError("NO_FREE_SESSION", "Não há uma contagem livre em andamento.");
    }
    if (!session.students.some((student) => student.id === studentId)) {
      throw new DomainError("NOT_FOUND", "Aluno não encontrado.");
    }
    const isSelected = session.countedStudentIds.includes(studentId);
    if (expectedSelected !== null && expectedSelected !== isSelected) {
      throw new DomainError("STALE_ACTION", "Essa seleção já foi atualizada.");
    }
    const countedStudentIds = isSelected
      ? session.countedStudentIds.filter((id) => id !== studentId)
      : [...session.countedStudentIds, studentId];
    return {
      ...state,
      session: {
        ...session,
        countedStudentIds,
        counted: countedStudentIds.length,
        lastCompletedId: countedStudentIds.at(-1) ?? null,
        updatedAt: now,
      },
    };
  }

  // Conclui a contagem livre (botão "Concluir"). Diferente do modo sequencial,
  // não é preciso marcar todos os alunos — basta ter marcado pelo menos um.
  function finishFreeSession(state, now = Date.now()) {
    const session = state.session;
    if (!session || session.status !== "counting" || session.mode !== "free") {
      throw new DomainError("NO_FREE_SESSION", "Não há uma contagem livre em andamento.");
    }
    if (session.counted === 0) {
      throw new DomainError("EMPTY_COUNT", "Marque pelo menos um aluno antes de concluir.");
    }
    const nextSession = { ...session, status: "done", updatedAt: now, completedAt: now };
    return {
      ...state,
      session: nextSession,
      history: appendHistory(state, nextSession, "completed", now),
    };
  }

  // Encerra a sessão atual, seja ela uma contagem em andamento (botão
  // "Encerrar", que registra como "cancelled" no histórico) ou uma contagem
  // já concluída (botão "Preparar nova contagem", que só libera a lista para
  // edição, já que o resultado foi salvo antes). Em ambos os casos a lista de
  // alunos volta a ficar editável.
  function discardSession(state, now = Date.now()) {
    if (!state.session) return state;
    const history = state.session.status === "counting"
      ? appendHistory(state, state.session, "cancelled", now)
      : state.history;
    return { ...state, session: null, history };
  }

  // Remove um único registro do histórico.
  function deleteHistoryEntry(state, entryId) {
    if (!state.history.some((entry) => entry.id === entryId)) {
      throw new DomainError("HISTORY_NOT_FOUND", "Registro do histórico não encontrado.");
    }
    return { ...state, history: state.history.filter((entry) => entry.id !== entryId) };
  }

  // Apaga todo o histórico de contagens.
  function clearHistory(state) {
    return { ...state, history: [] };
  }

  // --- Migração de dados antigos --------------------------------------
  // As funções abaixo convertem dados salvos por versões antigas do app
  // (diferentes chaves e formatos no localStorage) para o formato atual
  // (VERSION = 3), para que o usuário não perca a lista/histórico ao atualizar
  // o sistema. Cada migração termina validando o resultado com validateState;
  // se algo não bater, a migração é descartada (retorna null) em vez de
  // arriscar carregar um estado inconsistente.

  // Normaliza um aluno vindo de um formato antigo, garantindo id e nome válidos.
  function normalizeLegacyStudent(student) {
    if (!isRecord(student) || typeof student.name !== "string") return null;
    const name = normalizeName(student.name);
    if (!name || name.length > MAX_NAME_LENGTH) return null;
    return { id: typeof student.id === "string" && student.id ? student.id : createId(), name };
  }

  function buildSequentialMigration(roster, oldSession) {
    if (!isRecord(oldSession) || !Array.isArray(oldSession.students)) {
      const candidate = { version: VERSION, roster, session: null, history: [] };
      return validateState(candidate) ? candidate : null;
    }
    const students = oldSession.students.map(normalizeLegacyStudent).filter(Boolean);
    if (students.length === 0) return null;
    const isDone = oldSession.status === "done" || oldSession.state === "done";
    const rawIndex = Number.isInteger(oldSession.currentIndex) ? oldSession.currentIndex : 0;
    const currentIndex = isDone ? students.length : Math.min(Math.max(rawIndex, 0), students.length - 1);
    const counted = isDone ? students.length : currentIndex;
    const updatedAt = Number.isFinite(oldSession.updatedAt)
      ? oldSession.updatedAt
      : Number.isFinite(oldSession.savedAt) ? oldSession.savedAt : Date.now();
    const candidate = {
      version: VERSION,
      roster: students,
      history: [],
      session: {
        id: typeof oldSession.id === "string" ? oldSession.id : createId(),
        mode: "sequential",
        students,
        currentIndex,
        currentStudentId: isDone ? null : students[currentIndex].id,
        lastCompletedId: counted > 0 ? students[counted - 1].id : null,
        countedStudentIds: students.slice(0, counted).map((student) => student.id),
        counted,
        status: isDone ? "done" : "counting",
        startedAt: Number.isFinite(oldSession.startedAt) ? oldSession.startedAt : updatedAt,
        updatedAt,
        completedAt: isDone
          ? Number.isFinite(oldSession.completedAt) ? oldSession.completedAt : updatedAt
          : null,
      },
    };
    if (isDone) candidate.history = appendHistory(candidate, candidate.session, "completed", updatedAt);
    return validateState(candidate) ? candidate : null;
  }

  function buildVersionTwoMigration(parsed) {
    if (!isRecord(parsed) || !Array.isArray(parsed.roster)) return null;
    const roster = parsed.roster.map(normalizeLegacyStudent).filter(Boolean);
    if (parsed.session === null) {
      const candidate = { version: VERSION, roster, session: null, history: [] };
      return validateState(candidate) ? candidate : null;
    }
    if (!isRecord(parsed.session) || !Array.isArray(parsed.session.students)) return null;
    const students = parsed.session.students.map(normalizeLegacyStudent).filter(Boolean);
    const session = {
      ...parsed.session,
      students,
      countedStudentIds: Array.isArray(parsed.session.countedStudentIds)
        ? [...parsed.session.countedStudentIds]
        : students.slice(0, parsed.session.counted ?? 0).map((student) => student.id),
    };
    const candidate = { version: VERSION, roster: students, session, history: [] };
    if (session.status === "done") {
      candidate.history = appendHistory(candidate, session, "completed", session.completedAt ?? session.updatedAt);
    }
    return validateState(candidate) ? candidate : null;
  }

  function migratePreviousVersion(storage) {
    for (const key of PREVIOUS_STORAGE_KEYS) {
      const raw = storage.getItem(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        if (!isRecord(parsed) || !Array.isArray(parsed.roster)) continue;
        if (parsed.version === 2) return buildVersionTwoMigration(parsed);
        const roster = parsed.roster.map(normalizeLegacyStudent).filter(Boolean);
        return buildSequentialMigration(roster, parsed.session);
      } catch {}
    }
    return null;
  }

  function migrateLegacy(storage) {
    const rawRoster = storage.getItem(LEGACY_KEYS.roster);
    const rawSession = storage.getItem(LEGACY_KEYS.session);
    if (!rawRoster && !rawSession) return null;

    let roster = [];
    try {
      const parsedRoster = rawRoster ? JSON.parse(rawRoster) : [];
      if (Array.isArray(parsedRoster)) roster = parsedRoster.map(normalizeLegacyStudent).filter(Boolean);
    } catch {}

    let legacySession = null;
    try {
      legacySession = rawSession ? JSON.parse(rawSession) : null;
    } catch {}

    if (legacySession) return buildSequentialMigration(roster, legacySession);

    const uniqueRoster = [];
    const seenIds = new Set();
    const seenNames = new Set();
    for (const student of roster) {
      const folded = foldName(student.name);
      if (!seenIds.has(student.id) && !seenNames.has(folded)) {
        uniqueRoster.push(student);
        seenIds.add(student.id);
        seenNames.add(folded);
      }
    }
    const candidate = { version: VERSION, roster: uniqueRoster, session: null, history: [] };
    return validateState(candidate) ? candidate : null;
  }

  // --- Persistência -----------------------------------------------------
  // createRepository é uma "fábrica" que encapsula toda a leitura/escrita no
  // localStorage (o parâmetro `storage`), expondo apenas load/save/isAvailable.
  // Isso é o padrão de repositório: o resto do app não sabe (nem precisa saber)
  // que os dados são guardados no localStorage — poderia ser trocado por outro
  // mecanismo de armazenamento sem mudar o restante do código.
  function createRepository(storage) {
    let memory = createInitialState();
    let available = Boolean(storage);

    if (available) {
      try {
        const probeKey = `${STORAGE_KEY}:probe`;
        storage.setItem(probeKey, "1");
        storage.removeItem(probeKey);
      } catch {
        available = false;
      }
    }

    // Salva o estado no localStorage, sempre validando antes (defesa contra
    // salvar um estado quebrado). Se o navegador bloquear o armazenamento
    // (ex.: modo privado, cota cheia), o app continua funcionando só na
    // memória (`persisted: false`) e avisa o usuário na interface.
    function save(nextState) {
      if (!validateState(nextState)) throw new DomainError("INVALID_STATE", "O estado do sistema é inválido.");
      memory = nextState;
      if (!available) return { persisted: false };
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(nextState));
        return { persisted: true };
      } catch {
        available = false;
        return { persisted: false };
      }
    }

    // Carrega o estado salvo. Se não houver nada na chave atual, tenta migrar
    // dados de versões anteriores; se os dados salvos estiverem corrompidos
    // (JSON inválido ou reprovados por validateState), guarda uma cópia de
    // segurança com timestamp e devolve um estado vazio, para nunca travar
    // o app por causa de dados ruins.
    function load() {
      if (!available) return { state: memory, status: "unavailable", persisted: false };
      let raw;
      try {
        raw = storage.getItem(STORAGE_KEY);
      } catch {
        available = false;
        return { state: memory, status: "unavailable", persisted: false };
      }

      if (!raw) {
        try {
          const migrated = migratePreviousVersion(storage) ?? migrateLegacy(storage);
          if (migrated) {
            memory = migrated;
            const result = save(migrated);
            return { state: migrated, status: "migrated", persisted: result.persisted };
          }
        } catch {}
        return { state: memory, status: "empty", persisted: true };
      }

      try {
        const parsed = JSON.parse(raw);
        if (!validateState(parsed)) throw new Error("Invalid stored state");
        memory = parsed;
        return { state: parsed, status: parsed.session ? "restored" : "ok", persisted: true };
      } catch {
        try {
          storage.setItem(`${STORAGE_KEY}:corrupt:${Date.now()}`, raw);
        } catch {}
        return { state: memory, status: "corrupt", persisted: true };
      }
    }

    return {
      load,
      save,
      isAvailable: () => available,
      key: STORAGE_KEY,
    };
  }

  // API pública do módulo: tudo que o app.js pode usar. Object.freeze impede
  // que alguém sobrescreva acidentalmente uma dessas funções em runtime.
  global.SchoolCounterCore = Object.freeze({
    VERSION,
    STORAGE_KEY,
    DomainError,
    normalizeName,
    foldName,
    createInitialState,
    validateState,
    addStudent,
    renameStudent,
    removeStudent,
    clearRoster,
    sortStudents,
    startSession,
    advanceSession,
    undoSession,
    toggleFreeStudent,
    finishFreeSession,
    discardSession,
    deleteHistoryEntry,
    clearHistory,
    createRepository,
  });
})(globalThis);
