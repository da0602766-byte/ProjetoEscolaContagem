# Glossário de conceitos de JavaScript usados no projeto

Cada item aponta pra onde o conceito aparece no código, com uma explicação
curta. Útil pra quem está aprendendo JS "puro" (sem framework) e quer
entender técnicas comuns em código profissional.

## IIFE (Immediately Invoked Function Expression)

`src/core.js:1` e `src/app.js` inteiros são envolvidos assim:

```js
(function attachSchoolCounterCore(global) {
  "use strict";
  // ... tudo do arquivo ...
})(globalThis);
```

Uma função definida e **chamada imediatamente**. Serve para criar um escopo
próprio: todas as `const`/`function` declaradas lá dentro (como `normalizeName`,
`createId`, etc.) não "vazam" para o escopo global — só o que é
explicitamente exposto (`global.SchoolCounterCore = ...`) fica acessível de
fora. Isso evita poluir `window` com dezenas de nomes e evita colisão de nomes
entre arquivos diferentes carregados na mesma página.

## Módulo revelador (module pattern)

Consequência do IIFE acima: o arquivo expõe só uma "fachada" pública
(`SchoolCounterCore`), escondendo os detalhes internos (`isRecord`,
`hasUniqueStudents`, etc.) como "privados". Antes de existir `import`/`export`
nativo do JavaScript, esse era o jeito comum de simular módulos.

## Closures (fechamentos)

Em `createRepository(storage)` (`src/core.js`), a variável `memory` é
declarada dentro da função e usada pelas funções internas `save` e `load`,
que são devolvidas no `return`:

```js
function createRepository(storage) {
  let memory = createInitialState();
  // ...
  function save(nextState) { memory = nextState; /* ... */ }
  function load() { /* lê e também pode atualizar memory */ }
  return { load, save, isAvailable: () => available, key: STORAGE_KEY };
}
```

Mesmo depois que `createRepository` termina de executar, `save` e `load`
continuam com acesso à mesma variável `memory` — isso é uma *closure*: a
função "carrega consigo" o escopo onde foi criada. É o que permite ter,
por exemplo, dois repositórios independentes (cada um com seu próprio
`memory`/`available`) se a função fosse chamada duas vezes.

## Destructuring (desestruturação)

Muito usado para extrair campos de objetos, por exemplo em
`confirmAction({ title, message, confirmLabel, danger = false })`
(`src/app.js`): em vez de receber um único parâmetro e escrever
`options.title`, `options.message` etc., o parâmetro já "abre" o objeto nos
seus campos, e `danger = false` define um valor padrão quando a chamada não
passa esse campo.

## Spread (`...`)

Usado para copiar/combinar objetos e arrays sem alterar os originais — veja
[estado-e-imutabilidade.md](./estado-e-imutabilidade.md) para os exemplos e o
porquê disso importar tanto no `core.js`.

## Optional chaining (`?.`) e nullish coalescing (`??`)

Em `render()`: `state.session?.status === "counting"` — o `?.` evita um erro
se `state.session` for `null`, simplesmente resultando em `undefined` (que é
diferente de `"counting"`, então a condição é `false`) em vez de lançar
`TypeError: Cannot read properties of null`.

Em `normalizeName`: `String(value ?? "")` — se `value` for `null` ou
`undefined`, usa `""` no lugar; qualquer outro valor (inclusive `0` ou
string vazia) passa direto.

## Delegação de eventos

Em vez de adicionar um listener em cada botão (que seria recriado toda vez
que `render()` redesenha a tela), `app.js` registra os listeners **uma única
vez** no elemento pai `#app`:

```js
app.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  // ...switch conforme `action`...
});
```

`event.target` é o elemento exato que recebeu o clique (pode ser um `<span>`
dentro do botão); `.closest("button[data-action]")` sobe pela árvore do DOM
até achar o botão mais próximo com esse atributo. Como o listener está no
`#app` (que nunca é substituído, só seu conteúdo interno via `innerHTML`),
ele continua funcionando mesmo depois de várias re-renderizações.

## Atributos `data-*`

`data-action="remove"`, `data-id="..."`, `data-selected="true"` etc. são
"ganchos" que o HTML deixa disponíveis via `element.dataset.action`,
`element.dataset.id`. É a forma padrão de guardar informação extra em
elementos HTML sem inventar atributos não padronizados.

## Template literals (crases) e strings de HTML

Praticamente toda a interface é gerada com `` `<div>...${variavel}...</div>` ``.
Isso é chamado às vezes de "renderização baseada em string": em vez de criar
elementos DOM programaticamente (`document.createElement`), o código monta o
HTML inteiro como texto e o insere de uma vez com `app.innerHTML = htmlString`.
É simples de entender e escrever, mas exige cuidado com `escapeHtml()` (veja
abaixo) para não abrir brecha de segurança.

## `escapeHtml` e por que ele existe

```js
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
```

Sempre que um valor digitado pelo usuário (nome de aluno, por exemplo) é
inserido dentro de uma string de HTML, ele passa por `escapeHtml` primeiro.
Sem isso, um nome como `<img src=x onerror=alert(1)>` viraria HTML real e
executaria script na página (ataque de **XSS — Cross-Site Scripting**).
Trocar `<` por `&lt;` faz o navegador mostrar o texto literal em vez de
interpretá-lo como uma tag.

## `async`/`await` e Promises

`confirmAction(...)` devolve uma `Promise` que só resolve quando o usuário
fecha o `<dialog>`:

```js
return new Promise((resolve) => {
  confirmDialog.addEventListener("close", () => resolve(confirmDialog.returnValue === "confirm"), { once: true });
  confirmDialog.showModal();
});
```

O handler de clique em `app.js` é declarado `async` e usa
`const confirmed = await confirmAction({...})` para "pausar" a execução até
o usuário responder, sem precisar aninhar callbacks (`.then(...)`).

## Classes e herança (`extends Error`)

```js
class DomainError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "DomainError";
    this.code = code;
  }
}
```

`DomainError` estende a classe nativa `Error`, herdando `message`, `stack`,
etc., e adicionando um campo próprio `code`. Isso permite distinguir, em
`handleError`, um erro de regra de negócio (`error instanceof Core.DomainError`)
de um erro de programação inesperado.

## `Intl` (Internationalization API)

- `new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true })` —
  compara nomes como uma pessoa ordenaria (acentos equivalentes, números em
  ordem numérica em vez de alfabética).
- `new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" })` —
  formata datas/horas no padrão brasileiro sem precisar de biblioteca externa.

## `structuredClone` não é usado — por quê?

Repare que o projeto nunca usa `JSON.parse(JSON.stringify(x))` nem
`structuredClone` para "clonar" o estado. Como cada função de mutação
reconstrói só as partes que mudaram (via spread), uma clonagem profunda do
objeto inteiro nunca é necessária — outro benefício da imutabilidade
disciplinada.
