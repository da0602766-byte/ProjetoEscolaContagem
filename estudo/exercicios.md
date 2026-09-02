# Exercícios práticos

Pequenos exercícios para testar o entendimento, usando o próprio código do
projeto. Rode `npm test` depois de cada mudança para conferir se nada quebrou
(há testes em `test/core.test.js`).

## 1. Leitura de código (sem alterar nada)

1. Abra `src/core.js` e explique, com suas palavras, por que `addStudent`
   chama `assertEditable(state)` antes de qualquer outra coisa.
2. Em `advanceSession`, o que aconteceria se o parâmetro `expectedStudentId`
   não existisse? Dá pra imaginar um cenário de uso real (ex.: toque duplo na
   tela) em que isso causaria um bug?
3. Em `render()` (`src/app.js`), por que a checagem de `activeView === "history"`
   vem primeiro, antes de olhar para `state.session`?

## 2. Pequenas mudanças guiadas

1. **Novo campo de validação**: adicione uma regra em `validateNewName` que
   rejeite nomes contendo números (ex.: usando uma regex). Escreva também um
   teste em `test/core.test.js` para essa regra.
2. **Novo modo de erro**: em `removeStudent`, o erro lançado quando o aluno
   não existe é `"NOT_FOUND"`. Adicione um teste que verifique que
   `error.code === "NOT_FOUND"` (não só a mensagem).
3. **Nova informação na tela**: em `renderDone()`, adicione uma linha à
   `<dl class="summary-list">` mostrando a duração da contagem (diferença
   entre `completedAt` e `startedAt`, formatada em minutos).

## 3. Exercícios de arquitetura

1. Suponha que fosse pedido um "modo silencioso" que não mostra toasts de
   sucesso, só de erro. Onde essa configuração deveria morar: em `core.js`
   ou em `app.js`? Por quê?
2. Se o projeto precisasse funcionar também sem `localStorage` (por exemplo,
   salvando em um arquivo), quais funções de `core.js` precisariam mudar?
   E quais de `app.js`?
3. Desenhe (no papel ou em um comentário) o diagrama de transições de estado
   do modo "sequential" sem olhar [maquina-de-estados.md](./maquina-de-estados.md),
   depois compare com o arquivo.

## 4. Depuração guiada

1. Abra o DevTools do navegador com o app rodando, rode
   `localStorage.setItem("contagem-alunos:v3", "{ isso não é json")` e
   recarregue a página. O que deveria acontecer? Confirme lendo `load()` em
   `src/core.js` e observando o comportamento real.
2. Cadastre um aluno chamado `"Ana"` e tente cadastrar outro chamado
   `"ANA "` (com espaço no fim). O que acontece, e qual função impede isso?

## 5. Para ir além

- Leia `test/core.test.js` e identifique quais dessas funções ainda **não**
  têm teste. Escreva um teste para uma delas.
- Pesquise o que é "test runner nativo do Node.js" (usado via `npm test`,
  módulo `node:test`) e compare com bibliotecas mais conhecidas como Jest.
