# Persistência e migração de dados

## Onde os dados ficam salvos

O app usa `window.localStorage`, um armazenamento simples de chave/valor que
o navegador mantém por site, mesmo depois de fechar a aba. A chave usada
atualmente é `"contagem-alunos:v3"` (constante `STORAGE_KEY` em
`src/core.js`), e o valor salvo é o `state` inteiro, serializado com
`JSON.stringify`.

`createRepository(storage)` encapsula esse acesso em duas funções:

- **`save(nextState)`**: valida o estado com `validateState` (nunca salva algo
  inválido), tenta `storage.setItem(...)` e devolve `{ persisted: true|false }`
  — `false` quando o navegador bloqueia a escrita (ex.: aba anônima com
  armazenamento desativado, cota do localStorage cheia).
- **`load()`**: lê a chave atual; se não existir nada, tenta migrar dados de
  versões antigas (veja abaixo); se o JSON salvo estiver corrompido ou não
  passar em `validateState`, guarda uma cópia com `contagem-alunos:v3:corrupt:<timestamp>`
  e devolve um estado vazio, avisando o usuário (`bootNotice` em `app.js`).

## Por que sempre validar antes de confiar nos dados?

Dados no `localStorage` não são 100% confiáveis:

- Podem ter sido salvos por uma versão anterior do app, com formato diferente.
- Podem ter sido editados manualmente pelo usuário no DevTools.
- Podem estar truncados/corrompidos por algum bug ou falha do navegador.

Por isso, mesmo depois de `JSON.parse` funcionar sem erro, o código chama
`validateState(parsed)` antes de aceitar o resultado. Isso é uma boa prática
geral: **nunca confie cegamente em dados vindos de fora do seu controle
direto** (localStorage, resposta de rede, entrada do usuário).

## Migração de versões antigas

O projeto já passou por três formatos de dados ao longo do tempo:

1. **Formato bem antigo** (`LEGACY_KEYS`): duas chaves separadas,
   `sc_roster` e `sc_session`, sem campo `version` nem `history`.
2. **Versão 2** (`"contagem-alunos:v2"`): já unificada num único objeto, mas
   sem os campos que a versão 3 adicionou.
3. **Versão 3** (atual, `VERSION = 3`): adiciona `history` e um modelo de
   sessão mais completo (`mode`, `countedStudentIds`, etc.).

Quando `load()` não encontra nada na chave atual, ele tenta, em ordem:

```js
migratePreviousVersion(storage) ?? migrateLegacy(storage)
```

- `migratePreviousVersion` olha as chaves `"contagem-alunos:v2"` e
  `"contagem-alunos:v1"`.
- `migrateLegacy` olha as chaves bem antigas (`sc_roster`/`sc_session`).

Cada função de migração (`buildVersionTwoMigration`, `buildSequentialMigration`)
constrói um objeto no formato da versão atual e só o aceita se
`validateState(candidate)` retornar `true` — senão, devolve `null` e o app
simplesmente começa com uma lista vazia, em vez de arriscar carregar algo
quebrado.

## Por que isso importa para quem for alterar o formato do estado

Se um dia for necessário mudar a estrutura do `state` de novo (por exemplo,
adicionar um novo campo obrigatório), o padrão a seguir é:

1. Incrementar `VERSION` e mudar `STORAGE_KEY` (ex.: para `"contagem-alunos:v4"`).
2. Adicionar a chave antiga (`"contagem-alunos:v3"`) em `PREVIOUS_STORAGE_KEYS`.
3. Escrever uma função de migração equivalente às existentes, convertendo o
   formato antigo para o novo.
4. Atualizar `validateState` para exigir o novo campo.

Assim, quem já usava o sistema não perde a lista de alunos nem o histórico ao
atualizar para uma nova versão do código.
