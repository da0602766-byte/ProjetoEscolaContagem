# Arquitetura geral

O projeto é HTML/CSS/JS puro, sem build e sem frameworks, dividido em
responsabilidades bem separadas:

```
index.html          estrutura da página + pontos de montagem (#app, toasts, dialog)
src/core.js          "cérebro": regras de negócio, validação e persistência
src/componentes/     peças visuais reutilizáveis (ver seção abaixo)
src/app.js           "rosto": monta as telas e escuta eventos do usuário
src/styles.css        aparência
test/core.test.js     testes automatizados do core.js
```

## `src/componentes/`: peças de interface reutilizáveis

`app.js` ficaria enorme (e repetitivo) se cada tela desenhasse do zero seu
próprio botão de instalar, barra de progresso, toast, etc. Por isso, essas
peças foram fragmentadas em arquivos próprios dentro de `src/componentes/`,
cada um seguindo o mesmo padrão de `core.js` (IIFE que anexa a um objeto
global — aqui `SchoolCounterUI` em vez de `SchoolCounterCore`):

- **`utilitarios.js`** — `escapeHtml`, `plural`, `formatTime`, `formatDateTime`:
  funções puras de formatação de texto, sem HTML nem estado.
- **`barra-progresso.js`** — `renderBarraProgresso({ rotulo, percentual, ariaLabel })`:
  a barra de progresso usada nas telas de contagem em ordem e livre.
- **`toast.js`** — `criarToast(regiao)` devolve `{ mostrar(mensagem, tipo) }`:
  o aviso temporário no canto da tela. É uma fábrica (closure) porque precisa
  guardar o `setTimeout` que esconde o aviso entre uma chamada e outra.
- **`dialogo-confirmacao.js`** — `criarDialogoConfirmacao(dialogo)` devolve
  `{ confirmar(opcoes) }`: a caixa de confirmação nativa (`<dialog>`), que
  devolve uma Promise resolvida conforme o usuário confirma ou cancela.
- **`aviso-sistema.js`** — `renderAvisoArmazenamento(disponivel)` e
  `renderAvisoNotificacao(mensagem)`: as faixas de alerta no topo das telas.
- **`botao-instalar.js`** — `renderBotaoInstalar({ instalavel, instalado })`:
  o botão "Instalar aplicativo" do PWA.
- **`busca.js`** — `renderCaixaBusca(...)`, `renderBuscaVazia(...)` e
  `filtrarListaVisivel(container, input)`: a caixa de pesquisa e a lógica de
  filtrar itens visíveis, reaproveitadas na lista de alunos e na contagem livre.

`app.js` lê tudo isso de `globalThis.SchoolCounterUI` (a mesma convenção de
`Core = globalThis.SchoolCounterCore`) e só chama essas funções — ele não
sabe (nem precisa saber) como cada peça é desenhada por dentro. É o mesmo
princípio de separação de responsabilidades usado entre `core.js` e `app.js`,
aplicado agora *dentro* da camada de apresentação: cada componente cuida da
sua própria peça de interface, e `app.js` vira principalmente "cola" — monta
as telas combinando essas peças e reage a eventos.

Como o projeto não usa bundler, a ordem dos `<script>` no `index.html`
importa: `core.js` primeiro, depois cada arquivo de `src/componentes/`, e
por último `app.js` — que é o único que espera todos os outros já carregados.

## Por que separar core.js de app.js?

- **core.js** não sabe que existe uma tela. Ele só recebe um `state`
  (objeto JavaScript comum) e devolve um novo `state`, ou lança um erro
  (`DomainError`) se a ação não for permitida. Isso o torna fácil de testar
  (veja `test/core.test.js`): dá para chamar `Core.addStudent(state, "Ana")`
  direto, sem precisar simular clique em botão nenhum.
- **app.js** não conhece as regras. Ele só chama funções do `Core` e usa o
  resultado para redesenhar a tela. Se amanhã a regra "não pode repetir nome"
  mudar, isso se altera só em `core.js` — `app.js` nem precisa mudar.

Essa divisão é um exemplo simples do padrão **separar lógica de domínio da
camada de apresentação** (às vezes chamado de MVC/MVVM de forma bem enxuta).

## Fluxo de dados (unidirecional)

```
   evento do usuário (clique, digitação, submit)
              │
              ▼
   handler em app.js (ex.: dentro de app.addEventListener("click", ...))
              │  chama uma função do Core, ex.: Core.addStudent(state, nome)
              ▼
   core.js valida e devolve um NOVO objeto de estado (ou lança DomainError)
              │
              ▼
   commit(novoEstado) em app.js:
     1. repository.save(novoEstado)   -> tenta persistir no localStorage
     2. state = novoEstado            -> atualiza a variável em memória
     3. render()                      -> redesenha a tela a partir do state
```

Repare que o fluxo é sempre **unidirecional**: a tela nunca é alterada
"na mão" fora de `render()`, e o estado nunca é modificado diretamente,
sempre por uma função do Core que devolve uma cópia nova. Isso evita uma
classe inteira de bugs comuns em interfaces "espaguete", onde não dá para
saber quem alterou o quê.

## Onde entra a `SchoolCounterCore`

`core.js` é um IIFE (veja
[conceitos-javascript.md](./conceitos-javascript.md#iife)) que, no final,
expõe um único objeto global:

```js
global.SchoolCounterCore = Object.freeze({ ...todas as funções públicas... });
```

`app.js` lê esse objeto uma vez (`const Core = globalThis.SchoolCounterCore`)
e usa só isso — é a "API" entre as duas camadas.

## As três telas principais (renderX)

`app.js` tem uma função `render()` que escolhe qual tela desenhar olhando
para `state.session` e `activeView`:

- Nenhuma sessão → `renderSetup()` (cadastro de alunos).
- Sessão em modo `sequential`, status `counting` → `renderCounting()`.
- Sessão em modo `free`, status `counting` → `renderFreeCounting()`.
- Sessão com status `done` → `renderDone()`.
- `activeView === "history"` → `renderHistory()` (tem prioridade sobre as demais).

Veja [maquina-de-estados.md](./maquina-de-estados.md) para o diagrama completo
de transições entre essas telas.
