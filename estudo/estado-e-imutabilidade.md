# Estado e imutabilidade

## O formato do estado

Todo o app gira em torno de um único objeto de estado, sempre com este formato
(ver `createInitialState` em `src/core.js`):

```js
{
  version: 3,
  roster: [ { id, name }, ... ],   // lista de alunos cadastrados
  session: null | { ... },          // contagem em andamento/concluída, ou null
  history: [ { ... }, ... ],        // registros de contagens passadas
}
```

Quando existe uma sessão (`session !== null`), ela tem esta forma:

```js
{
  id,
  mode: "sequential" | "free",
  students: [...],           // cópia ordenada dos alunos, "congelada" no início da sessão
  currentIndex,               // (só no modo sequential) índice do aluno atual
  currentStudentId,           // (só no modo sequential) id do aluno atual
  lastCompletedId,             // id do último aluno confirmado/marcado
  countedStudentIds: [...],    // ids já contabilizados, na ordem em que foram
  counted,                      // countedStudentIds.length
  status: "counting" | "done",
  startedAt, updatedAt, completedAt,
}
```

## Por que "imutabilidade"?

Repare que nenhuma função de `core.js` faz algo como `state.roster.push(...)`.
Em vez disso, sempre aparece um padrão como:

```js
function addStudent(state, rawName) {
  assertEditable(state);
  const name = validateNewName(state, rawName);
  return { ...state, roster: [...state.roster, { id: createId(), name }] };
}
```

O `{ ...state, roster: [...] }` cria um **objeto novo**, copiando os campos de
`state` e substituindo só `roster` por um **array novo**. O objeto `state`
original passado como parâmetro não é tocado.

Vantagens práticas disso, visíveis no próprio projeto:

- **Testabilidade**: dá para comparar o estado antes e depois sem se
  preocupar que uma referência antiga tenha sido alterada por baixo dos panos.
  Veja como `test/core.test.js` guarda `const before = state;` e depois
  compara com o resultado da função.
- **Histórico/undo mais simples**: `undoSession` só precisa recalcular
  `countedStudentIds` com um item a menos — não existe risco de "esquecer"
  de reverter alguma mutação feita em outro lugar.
- **`commit()` fica simples**: em `app.js`, `commit(nextState, mensagem)`
  sempre recebe um estado pronto e novo — só precisa salvar, atribuir e
  redesenhar, sem se preocupar em "clonar" nada.

## Spread (`...`) e cópias rasas

`{ ...state, roster: novaLista }` e `[...array, novoItem]` usam o operador
*spread*. É importante entender que ele faz uma cópia **rasa** (shallow):
copia o primeiro nível de propriedades, mas objetos aninhados continuam sendo
a mesma referência, a menos que também sejam reconstruídos.

Por isso, quando o código precisa alterar um único aluno dentro do array
(em `renameStudent`), ele reconstrói o array inteiro com `.map`, criando um
objeto novo só para o aluno alterado:

```js
roster: state.roster.map((student) =>
  student.id === studentId ? { ...student, name } : student
),
```

Os alunos que não mudaram mantêm a mesma referência (não precisam ser
recriados); só o alterado vira um objeto novo.

## Validação como "guarda de estado"

`validateState(state)` (em `src/core.js`) é chamada:

- toda vez que o estado é **salvo** no `save()`;
- toda vez que o estado é **carregado** do `localStorage` no `load()`.

Isso significa que, mesmo que alguém edite manualmente o `localStorage` pelo
DevTools do navegador (ou um bug introduza um estado inconsistente), o app
detecta e trata como "corrompido" em vez de travar ou se comportar de forma
imprevisível. Veja [persistencia-e-migracao.md](./persistencia-e-migracao.md).
