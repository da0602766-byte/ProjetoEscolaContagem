from pydantic import BaseModel


class AlunoCriar(BaseModel):
    nome: str


class Aluno(AlunoCriar):
    id: str
