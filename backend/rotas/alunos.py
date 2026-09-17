from fastapi import APIRouter, HTTPException

from esquemas.aluno import Aluno

router = APIRouter()

ALUNOS = [
    {"id": "1", "nome": "Ana Beatriz"},
    {"id": "2", "nome": "Bruno Costa"},
    {"id": "3", "nome": "Carla Dias"},
]


@router.get("/alunos", response_model=list[Aluno])
def listar_alunos():
    return ALUNOS


@router.get("/alunos/{aluno_id}", response_model=Aluno)
def obter_aluno(aluno_id: str):
    for aluno in ALUNOS:
        if aluno["id"] == aluno_id:
            return aluno
    raise HTTPException(status_code=404, detail="Aluno não encontrado.")
