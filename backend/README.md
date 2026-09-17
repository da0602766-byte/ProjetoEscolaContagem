# Backend

API em FastAPI, ainda em construção. Dados fixos em memória, sem banco de dados.

## Configurar o ambiente

```sh
cd backend
python -m venv venv
venv\Scripts\activate      # Windows
pip install -r requirements.txt
```

## Rodar

Sempre a partir da pasta `backend/` (os imports em `main.py`, como `from rotas.alunos import ...`,
são resolvidos em relação a essa pasta):

```sh
cd backend
venv\Scripts\activate
fastapi dev main.py
```

A API sobe em `http://127.0.0.1:8000`. Rodar `uvicorn backend.main:app` a partir da raiz do
repositório não funciona, porque o pacote `rotas` só existe dentro de `backend/`.

## Estrutura

- `main.py`: cria o app FastAPI e inclui as rotas.
- `rotas/`: um `APIRouter` por recurso (`alunos.py`, `historico.py`).
- `esquemas/`: esquemas Pydantic de entrada e saída (`aluno.py`, `historico.py`).
