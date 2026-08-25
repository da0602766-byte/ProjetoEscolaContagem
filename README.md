# Contagem de Alunos

Sistema mobile-first para cadastrar uma turma e realizar contagens sem perder o progresso.

O cadastro possui busca instantânea para conferir quem já está na lista. Há dois modos de uso:

- **Contar em ordem:** apresenta os alunos um por vez em ordem alfabética.
- **Contagem livre:** exibe uma lista pesquisável para marcar ou desmarcar qualquer aluno e permite concluir apenas com os escolhidos.

## Como usar

Abra `index.html` em um navegador moderno. Não é necessário instalar dependências nem executar um servidor.

O navegador salva automaticamente a lista, o modo escolhido, os alunos contabilizados, o aluno atual quando aplicável e o resultado da sessão no `localStorage`. A lista fica bloqueada enquanto existe uma contagem em andamento.

O histórico registra tanto contagens concluídas quanto encerradas, com data, modo, progresso e nomes contabilizados. Registros individuais ou todo o histórico só podem ser excluídos após confirmação.

## Testes

Com Node.js instalado, execute:

```sh
npm test
```
