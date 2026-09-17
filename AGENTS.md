# Sistema de Contagem de Alunos

Projeto dividido em `frontend/` (aplicação web estática) e `backend/` (API em desenvolvimento).

## frontend/

Aplicação web estática em HTML, CSS e JavaScript puro. Não adicione frameworks ou dependências de execução.

- `frontend/index.html`: documento e pontos de montagem acessíveis.
- `frontend/src/core.js`: regras de domínio, validação, transições e persistência.
- `frontend/src/app.js`: renderização e eventos da interface.
- `frontend/src/styles.css`: estilos mobile-first e adaptação para desktop.
- `frontend/test/core.test.js`: testes das regras e do armazenamento.

Comandos (executar dentro de `frontend/`):

- `npm test`: executa os testes com o test runner nativo do Node.js.

O sistema também funciona abrindo `frontend/index.html` diretamente em um navegador moderno.

## backend/

API em FastAPI, ainda em construção. Veja `backend/README.md` para como rodar.

- `backend/main.py`: cria o app FastAPI e inclui as rotas.
- `backend/rotas/`: um `APIRouter` por recurso.
- `backend/esquemas/`: esquemas Pydantic de entrada e saída.
