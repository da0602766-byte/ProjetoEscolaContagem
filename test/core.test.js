import assert from "node:assert/strict";
import test from "node:test";
import "../src/core.js";

const Core = globalThis.SchoolCounterCore;

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }

  keys() {
    return [...this.values.keys()];
  }
}

function stateWithNames(...names) {
  return names.reduce((state, name) => Core.addStudent(state, name), Core.createInitialState());
}

test("normaliza espaços e impede nomes vazios ou duplicados", () => {
  const state = Core.addStudent(Core.createInitialState(), "  Ana   Beatriz  ");
  assert.equal(state.roster[0].name, "Ana Beatriz");
  assert.throws(() => Core.addStudent(state, ""), { code: "EMPTY_NAME" });
  assert.throws(() => Core.addStudent(state, "ana beatriz"), { code: "DUPLICATE_NAME" });
  assert.throws(() => Core.addStudent(state, "Ána Beatriz"), { code: "DUPLICATE_NAME" });
});

test("ordena a sessão alfabeticamente e mantém identificadores persistentes", () => {
  const rosterState = stateWithNames("Zuleica", "Álvaro", "Bruna");
  const ids = new Set(rosterState.roster.map((student) => student.id));
  const state = Core.startSession(rosterState, 1000);
  assert.deepEqual(state.session.students.map((student) => student.name), ["Álvaro", "Bruna", "Zuleica"]);
  assert.ok(state.session.students.every((student) => ids.has(student.id)));
  assert.equal(state.session.currentStudentId, state.session.students[0].id);
  assert.equal(state.session.updatedAt, 1000);
});

test("bloqueia inclusão, edição e exclusão durante a contagem", () => {
  const state = Core.startSession(stateWithNames("Ana", "Bia"));
  assert.throws(() => Core.addStudent(state, "Caio"), { code: "ROSTER_LOCKED" });
  assert.throws(() => Core.renameStudent(state, state.roster[0].id, "Anita"), { code: "ROSTER_LOCKED" });
  assert.throws(() => Core.removeStudent(state, state.roster[0].id), { code: "ROSTER_LOCKED" });
  assert.throws(() => Core.clearRoster(state), { code: "ROSTER_LOCKED" });
});

test("avança, registra último aluno e permite corrigir o anterior", () => {
  let state = Core.startSession(stateWithNames("Ana", "Bia", "Caio"), 1000);
  const firstId = state.session.students[0].id;
  state = Core.advanceSession(state, 2000);
  assert.equal(state.session.counted, 1);
  assert.equal(state.session.currentIndex, 1);
  assert.equal(state.session.lastCompletedId, firstId);
  assert.equal(state.session.currentStudentId, state.session.students[1].id);
  state = Core.undoSession(state, 3000);
  assert.equal(state.session.counted, 0);
  assert.equal(state.session.currentStudentId, firstId);
  assert.equal(state.session.lastCompletedId, null);
});

test("rejeita confirmação atrasada do aluno anterior", () => {
  let state = Core.startSession(stateWithNames("Ana", "Bia"), 1000);
  const staleStudentId = state.session.currentStudentId;
  state = Core.advanceSession(state, 2000, staleStudentId);
  assert.throws(() => Core.advanceSession(state, 2100, staleStudentId), { code: "STALE_ACTION" });
  assert.equal(state.session.counted, 1);
});

test("conclui exatamente no último aluno e preserva o resultado", () => {
  let state = Core.startSession(stateWithNames("Ana", "Bia"), 1000);
  state = Core.advanceSession(state, 2000);
  state = Core.advanceSession(state, 3000);
  assert.equal(state.session.status, "done");
  assert.equal(state.session.counted, 2);
  assert.equal(state.session.currentIndex, 2);
  assert.equal(state.session.currentStudentId, null);
  assert.equal(state.session.completedAt, 3000);
  assert.throws(() => Core.advanceSession(state), { code: "NO_SEQUENTIAL_SESSION" });
});

test("salva e recupera automaticamente a posição exata", () => {
  const storage = new MemoryStorage();
  const firstRepository = Core.createRepository(storage);
  let state = Core.startSession(stateWithNames("Caio", "Ana", "Bia"), 1000);
  state = Core.advanceSession(state, 2000);
  assert.equal(firstRepository.save(state).persisted, true);

  const secondRepository = Core.createRepository(storage);
  const loaded = secondRepository.load();
  assert.equal(loaded.status, "restored");
  assert.equal(loaded.state.session.counted, 1);
  assert.equal(loaded.state.session.students[loaded.state.session.currentIndex].name, "Bia");
  assert.equal(loaded.state.session.lastCompletedId, loaded.state.session.students[0].id);
});

test("rejeita estado incompleto ou incoerente", () => {
  const valid = Core.startSession(stateWithNames("Ana", "Bia"));
  assert.equal(Core.validateState(valid), true);
  assert.equal(Core.validateState({ ...valid, version: 99 }), false);
  assert.equal(Core.validateState({ ...valid, session: { ...valid.session, counted: 2 } }), false);
  assert.equal(Core.validateState({ ...valid, roster: [] }), false);
});

test("preserva uma cópia de dados corrompidos e inicia com segurança", () => {
  const storage = new MemoryStorage();
  storage.setItem(Core.STORAGE_KEY, "{conteudo-invalido");
  const repository = Core.createRepository(storage);
  const loaded = repository.load();
  assert.equal(loaded.status, "corrupt");
  assert.deepEqual(loaded.state, Core.createInitialState());
  assert.ok(storage.keys().some((key) => key.startsWith(`${Core.STORAGE_KEY}:corrupt:`)));
  assert.equal(storage.getItem(Core.STORAGE_KEY), "{conteudo-invalido");
});

test("continua em memória quando o localStorage está indisponível", () => {
  const blockedStorage = {
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("blocked"); },
    removeItem() { throw new Error("blocked"); },
  };
  const repository = Core.createRepository(blockedStorage);
  const state = stateWithNames("Ana");
  assert.equal(repository.save(state).persisted, false);
  assert.equal(repository.isAvailable(), false);
  assert.equal(repository.load().state.roster[0].name, "Ana");
});

test("migra os dados válidos do layout original", () => {
  const storage = new MemoryStorage();
  const students = [
    { id: "a", name: "Ana" },
    { id: "b", name: "Bia" },
  ];
  storage.setItem("sc_roster", JSON.stringify(students));
  storage.setItem("sc_session", JSON.stringify({ students, currentIndex: 1, counted: 1, state: "counting", savedAt: 5000 }));
  const repository = Core.createRepository(storage);
  const loaded = repository.load();
  assert.equal(loaded.status, "migrated");
  assert.equal(loaded.state.session.counted, 1);
  assert.equal(loaded.state.session.currentStudentId, "b");
  assert.ok(storage.getItem(Core.STORAGE_KEY));
});

test("mantém a lista ao encerrar uma sessão e permite uma nova contagem", () => {
  const active = Core.startSession(stateWithNames("Ana", "Bia"));
  const reset = Core.discardSession(active);
  assert.equal(reset.session, null);
  assert.equal(reset.roster.length, 2);
  assert.equal(Core.startSession(reset).session.status, "counting");
});

test("contagem livre permite marcar e desmarcar qualquer aluno", () => {
  let state = Core.startSession(stateWithNames("Ana", "Bia", "Caio"), 1000, "free");
  const caio = state.session.students.find((student) => student.name === "Caio");
  const ana = state.session.students.find((student) => student.name === "Ana");
  state = Core.toggleFreeStudent(state, caio.id, 2000, false);
  state = Core.toggleFreeStudent(state, ana.id, 3000, false);
  assert.deepEqual(state.session.countedStudentIds, [caio.id, ana.id]);
  assert.equal(state.session.counted, 2);
  state = Core.toggleFreeStudent(state, caio.id, 4000, true);
  assert.deepEqual(state.session.countedStudentIds, [ana.id]);
  assert.equal(state.session.lastCompletedId, ana.id);
});

test("contagem livre pode concluir apenas parte da turma", () => {
  let state = Core.startSession(stateWithNames("Ana", "Bia", "Caio"), 1000, "free");
  state = Core.toggleFreeStudent(state, state.session.students[1].id, 2000, false);
  state = Core.finishFreeSession(state, 3000);
  assert.equal(state.session.status, "done");
  assert.equal(state.session.counted, 1);
  assert.equal(state.session.completedAt, 3000);
  assert.equal(Core.validateState(state), true);
});

test("contagem livre rejeita conclusão vazia e clique atrasado", () => {
  let state = Core.startSession(stateWithNames("Ana", "Bia"), 1000, "free");
  assert.throws(() => Core.finishFreeSession(state), { code: "EMPTY_COUNT" });
  const id = state.session.students[0].id;
  state = Core.toggleFreeStudent(state, id, 2000, false);
  assert.throws(() => Core.toggleFreeStudent(state, id, 2100, false), { code: "STALE_ACTION" });
  assert.equal(state.session.counted, 1);
});

test("busca ignora acentos, maiúsculas e espaços extras", () => {
  assert.equal(Core.foldName("  ÁLVARO   Júnior "), "alvaro junior");
  assert.equal(Core.foldName("Maria Clara").includes(Core.foldName("clara")), true);
});

test("migra uma sessão v1 sem perder a posição", () => {
  const storage = new MemoryStorage();
  const students = [
    { id: "a", name: "Ana" },
    { id: "b", name: "Bia" },
  ];
  storage.setItem("contagem-alunos:v1", JSON.stringify({
    version: 1,
    roster: students,
    session: {
      id: "old",
      students,
      currentIndex: 1,
      currentStudentId: "b",
      lastCompletedId: "a",
      counted: 1,
      status: "counting",
      startedAt: 1000,
      updatedAt: 2000,
      completedAt: null,
    },
  }));
  const loaded = Core.createRepository(storage).load();
  assert.equal(loaded.status, "migrated");
  assert.equal(loaded.state.version, 2);
  assert.equal(loaded.state.session.mode, "sequential");
  assert.deepEqual(loaded.state.session.countedStudentIds, ["a"]);
  assert.equal(loaded.state.session.currentStudentId, "b");
});
