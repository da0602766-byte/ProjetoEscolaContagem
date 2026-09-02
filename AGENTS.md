# Sistema de Contagem de Alunos

Aplicação web estática em HTML, CSS e JavaScript puro. Não adicione frameworks ou dependências de execução.

## Estrutura

- `index.html`: documento e pontos de montagem acessíveis.
- `src/core.js`: regras de domínio, validação, transições e persistência.
- `src/componentes/`: peças visuais reutilizáveis (botão de instalar, barra de progresso, toast, diálogo de confirmação, aviso de sistema, caixa de busca) usadas por `src/app.js`.
- `src/app.js`: orquestra as telas e os eventos da interface, usando `core.js` e `src/componentes/`.
- `src/styles.css`: estilos mobile-first e adaptação para desktop.
- `test/core.test.js`: testes das regras e do armazenamento.
- `estudo/`: material de estudo sobre a arquitetura e os conceitos de JavaScript usados no projeto.

## Comandos

- `npm test`: executa os testes com o test runner nativo do Node.js.

O sistema também funciona abrindo `index.html` diretamente em um navegador moderno.
