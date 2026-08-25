(function attachSchoolCounterCore(global) {
  "use strict";

  const VERSION = 3;
  const STORAGE_KEY = "contagem-alunos:v3";
  const PREVIOUS_STORAGE_KEYS = ["contagem-alunos:v2", "contagem-alunos:v1"];
  const LEGACY_KEYS = { roster: "sc_roster", session: "sc_session" };
  const MAX_NAME_LENGTH = 100;
  const collator = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true });

  class DomainError extends Error {
    constructor(code, message) {
      super(message);
      this.name = "DomainError";
      this.code = code;
    }
  }

  function normalizeName(value) {
    return String(value ?? "").trim().replace(/\s+/g, " ");
  }

  function foldName(value) {
    return normalizeName(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR");
  }

  function createId() {
    if (global.crypto && typeof global.crypto.randomUUID === "function") {
      return global.crypto.randomUUID();
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function createInitialState() {
    return { version: VERSION, roster: [], session: null, history: [] };
  }

  function isRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

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

  function assertEditable(state) {
    if (state.session !== null) {
      throw new DomainError("ROSTER_LOCKED", "A lista está bloqueada durante uma contagem.");
    }
  }

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

  function addStudent(state, rawName) {
    assertEditable(state);
    const name = validateNewName(state, rawName);
    return { ...state, roster: [...state.roster, { id: createId(), name }] };
  }

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

  function clearRoster(state) {
    assertEditable(state);
    return { ...state, roster: [] };
  }

  function sortStudents(students) {
    return [...students].sort((a, b) => collator.compare(a.name, b.name));
  }

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

  function discardSession(state, now = Date.now()) {
    if (!state.session) return state;
    const history = state.session.status === "counting"
      ? appendHistory(state, state.session, "cancelled", now)
      : state.history;
    return { ...state, session: null, history };
  }

  function deleteHistoryEntry(state, entryId) {
    if (!state.history.some((entry) => entry.id === entryId)) {
      throw new DomainError("HISTORY_NOT_FOUND", "Registro do histórico não encontrado.");
    }
    return { ...state, history: state.history.filter((entry) => entry.id !== entryId) };
  }

  function clearHistory(state) {
    return { ...state, history: [] };
  }

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
