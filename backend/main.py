from fastapi import FastAPI

from rotas.alunos import router as alunos_router
from rotas.historico import router as historico_router

app = FastAPI()

app.include_router(alunos_router)
app.include_router(historico_router)
