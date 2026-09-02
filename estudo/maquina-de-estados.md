# Máquina de estados de uma contagem

Uma forma útil de entender `core.js` é pensar em cada função de sessão como
uma transição em uma máquina de estados finita. `state.session` é sempre
`null` ou um objeto com `status: "counting" | "done"` e `mode: "sequential" | "free"`.

## Modo sequencial

```
      startSession(mode="sequential")
 [sem sessão] ─────────────────────────► [counting, currentIndex = 0]
                                               │  │
                              advanceSession() │  │ undoSession()
                    (confirma aluno atual)     │  │ (volta ao anterior)
                                               ▼  │
                                     currentIndex + 1
                                               │
                          quando currentIndex chega ao fim
                                               ▼
                                       [status = "done"]
                                       (registrado no histórico como "completed")
                                               │
                                discardSession()
                                       ("Preparar nova contagem")
                                               ▼
                                       [sem sessão] (lista liberada p/ edição)
```

A qualquer momento em `counting`, `discardSession()` ("Encerrar") também leva
de volta a `[sem sessão]`, mas registrando no histórico como `"cancelled"`.

## Modo livre

```
       startSession(mode="free")
 [sem sessão] ───────────────────────► [counting]
                                             │  ▲
                          toggleFreeStudent()│  │ (marca/desmarca, pode repetir várias vezes)
                                             ▼  │
                                    (mesmo status, apenas
                                     countedStudentIds muda)
                                             │
                              finishFreeSession()
                          (exige counted > 0)
                                             ▼
                                     [status = "done"]
```

## Regras que a validação de cada função impõe

Cada função de transição (`advanceSession`, `undoSession`, `toggleFreeStudent`,
`finishFreeSession`, `discardSession`) começa verificando se a sessão está no
estado certo para aquela ação, lançando um `DomainError` caso contrário. Por
exemplo:

- `advanceSession` exige `session.status === "counting"` e
  `session.mode === "sequential"` — não é possível "avançar" numa contagem
  livre nem numa já concluída.
- `undoSession` exige, além disso, `session.counted > 0` — não dá pra desfazer
  se nenhum aluno foi confirmado ainda.
- `finishFreeSession` exige `session.counted > 0` — precisa marcar ao menos
  um aluno antes de concluir.

Esse padrão ("checar as pré-condições no início da função, lançando erro se
não cumpridas") é chamado de **guard clauses** (cláusulas de guarda) e torna
o resto da função mais simples, pois ela pode assumir que, se chegou até ali,
o estado é válido para a operação.

## Onde isso aparece na tela (app.js)

`render()` decide a tela olhando exatamente para essas mesmas condições:

```js
function render() {
  if (activeView === "history") app.innerHTML = renderHistory();
  else if (state.session?.status === "counting" && state.session.mode === "free") app.innerHTML = renderFreeCounting();
  else if (state.session?.status === "counting") app.innerHTML = renderCounting();
  else if (state.session?.status === "done") app.innerHTML = renderDone();
  else app.innerHTML = renderSetup();
}
```

Ou seja: a tela é uma **função pura do estado** — dado o mesmo `state` e
`activeView`, sempre a mesma tela é desenhada. Não existe "estado de tela"
independente do `state` do domínio (fora de pequenas coisas como texto de
busca ou qual linha está em edição).
