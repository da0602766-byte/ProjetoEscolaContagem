# Material de estudo do projeto

Esta pasta reúne anotações para quem quer entender (ou revisar) como o
Sistema de Contagem de Alunos funciona por dentro, e os conceitos de
JavaScript usados na implementação. Não faz parte do app — é só material de
apoio para estudo.

Sugestão de ordem de leitura:

1. [arquitetura.md](./arquitetura.md) — visão geral das camadas e do fluxo de dados.
2. [estado-e-imutabilidade.md](./estado-e-imutabilidade.md) — como o estado é modelado e por que as funções nunca alteram o estado recebido.
3. [maquina-de-estados.md](./maquina-de-estados.md) — o "ciclo de vida" de uma contagem (setup → contando → concluída).
4. [conceitos-javascript.md](./conceitos-javascript.md) — glossário comentado das técnicas de JS usadas no código (closures, IIFE, delegação de eventos, etc.), com o arquivo/linha onde aparecem.
5. [persistencia-e-migracao.md](./persistencia-e-migracao.md) — como os dados são salvos no navegador e como versões antigas são migradas.
6. [exercicios.md](./exercicios.md) — pequenos exercícios práticos para testar o entendimento, usando o próprio código do projeto.

Veja também [../AGENTS.md](../AGENTS.md) para a estrutura de pastas e comandos do projeto.
