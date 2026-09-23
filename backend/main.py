from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from rotas.alunos import router as alunos_router
from rotas.historicos import router as historico_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5500"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(alunos_router)
app.include_router(historico_router)
