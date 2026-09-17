from pydantic import BaseModel


class RegistroHistorico(BaseModel):
    id: str
    modo: str
    resultado: str
    total: int
    contabilizados: int
