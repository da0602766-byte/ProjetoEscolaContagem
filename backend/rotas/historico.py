from fastapi import APIRouter

router = APIRouter()

HISTORICO = [
    {
        "id": "h1",
        "modo": "sequential",
        "resultado": "completed",
        "total": 3,
        "contabilizados": 3,
    },
    {
        "id": "h2",
        "modo": "free",
        "resultado": "cancelled",
        "total": 3,
        "contabilizados": 1,
    },
]


@router.get("/historico")
def listar_historico():
    return HISTORICO
