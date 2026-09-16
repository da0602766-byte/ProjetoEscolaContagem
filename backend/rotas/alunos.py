from fastapi import APIRouter, HTTPException

router = APIRouter()

ALUNOS = [
    {"id": "1", "nome": "Ana Beatriz"},
    {"id": "2", "nome": "Bruno Costa"},
    {"id": "3", "nome": "Carla Dias"},
]


@router.get("/alunos")
def listar_alunos():
    return ALUNOS


@router.get("/alunos/{aluno_id}")
def obter_aluno(aluno_id: str):
    for aluno in ALUNOS:
        if aluno["id"] == aluno_id:
            return aluno
    raise HTTPException(status_code=404, detail="Aluno não encontrado.")
