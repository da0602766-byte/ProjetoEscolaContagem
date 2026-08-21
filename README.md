# Contagem de Alunos

Sistema mobile-first para cadastrar uma turma e realizar contagens sem perder o progresso.

O cadastro possui busca instantânea para conferir quem já está na lista. Há dois modos de uso:

- **Contar em ordem:** apresenta os alunos um por vez em ordem alfabética.
- **Contagem livre:** exibe uma lista pesquisável para marcar ou desmarcar qualquer aluno e permite concluir apenas com os escolhidos.

## Como usar no navegador

Abra `index.html` em um navegador moderno. Não é necessário instalar dependências nem executar um servidor.

O navegador salva automaticamente a lista, o modo escolhido, os alunos contabilizados, o aluno atual quando aplicável e o resultado da sessão no `localStorage`. A lista fica bloqueada enquanto existe uma contagem em andamento.

## Instalar no celular

O projeto é um aplicativo web instalável (PWA). Depois de publicado no GitHub Pages:

1. Abra o endereço do aplicativo no Chrome do celular.
2. Toque em **Instalar aplicativo** dentro da tela inicial.
3. Confirme a instalação. O ícone **Contagem** será adicionado à tela inicial.

Depois do primeiro acesso, a tela principal e a contagem funcionam sem internet. Os dados continuam salvos apenas no aparelho usado.

## Testes

Com Node.js instalado, execute:

```sh
npm test
```