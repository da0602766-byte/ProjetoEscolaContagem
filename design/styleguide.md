# Guia de Estilo — Sistema de Contagem de Alunos

Documento de referência visual para o desenvolvimento futuro da **landing
page** do sistema. A paleta, tipografia, espaçamento e componentes abaixo
são os mesmos já usados em produção em [`src/styles.css`](../src/styles.css)
— a landing page deve reconhecer essa identidade, não criar uma nova.

> Versão navegável (com as cores e componentes renderizados de verdade):
> https://claude.ai/code/artifact/ce233530-c06e-44b2-8997-b29697f84300

---

## 1. Persona

Como não havia uma persona definida no projeto, esta foi construída a
partir do que o próprio sistema já revela sobre quem o usa (regras de
contagem, bloqueio de lista, recuperação automática de progresso).

### Márcia Souza — Coordenadora pedagógica

> "Eu não posso perder a contagem no meio do pátio porque o celular
> travou. Preciso saber, num olhar, quem falta."

| | |
|---|---|
| **Contexto** | Faz chamada em sala de aula, em passeios escolares e na saída para o ônibus — geralmente de pé, com prancheta ou celular numa mão só. |
| **Hoje usa** | Lista de papel ou um app genérico de planilha, que não sabe reabrir de onde parou. |
| **Medo** | Perder o progresso da contagem e ter que recontar a turma inteira do zero. |
| **O que convence** | Ver, antes mesmo de instalar, que o app lembra a posição sozinho — sem discurso técnico. |

A landing page existe para desarmar esse único medo antes de falar em
qualquer outro benefício.

---

## 2. Cores

Roxo Escola carrega toda a marca; o resto da paleta existe para dar
respostas claras — "contado" em verde, "atenção" em âmbar — nunca o
contrário. Os valores marcados como *(app)* já existem em
`src/styles.css`; os marcados como *(novo)* são propostos para a landing.

| Nome | Hex | Uso |
|---|---|---|
| Roxo Profundo *(app)* | `#2e1065` | Base dos gradientes de herói e do cabeçalho do app. |
| Roxo Escola *(app)* | `#5b21b6` | Cor de marca — botões primários, links, ícones ativos. |
| Roxo Vivo *(app)* | `#6d28d9` | Ponta clara dos gradientes; hover de elementos de marca. |
| Roxo Neblina *(app)* | `#ede9fe` | Fundos de chip, badge e estado selecionado. |
| Verde-chamada *(app)* | `#0c8a64` | Aluno contado, ação concluída, prova social positiva. |
| Âmbar de Atenção *(novo)* | `#a2540c` | Avisos que pedem cuidado — nunca erro grave. |
| Vermelho de Risco *(app)* | `#c8304b` | Somente ações destrutivas e erros reais. |
| Tinta *(app)* | `#1c1030` | Texto principal — preto com viés violeta, nunca cinza puro. |
| Papel *(app)* | `#faf8fc` | Fundo padrão — branco quente, como o papel de um diário de classe. |

### Modo escuro (proposto para a landing)

O app hoje é só claro (`color-scheme: light` fixo). Para a landing,
propõe-se um par escuro que segue a mesma lógica de papéis:

| Papel | Claro | Escuro |
|---|---|---|
| Fundo | `#faf8fc` | `#150c26` |
| Superfície (cartão) | `#ffffff` | `#1e1533` |
| Texto principal | `#1c1030` | `#f3effa` |
| Texto secundário | `#55506a` | `#c8c0dd` |
| Linha/borda | `#e5dff0` | `#392a54` |
| Marca (texto/ícone) | `#6d28d9` | `#b096f5` |
| Marca (botão sólido) | `#5b21b6` | `#8b5cf6` |

---

## 3. Tipografia

Três papéis, três famílias — a serifada dá calor humano ao título (o
oposto de um app corporativo frio); a mono trata os números da contagem
como dado, não como decoração.

| Papel | Família | Uso |
|---|---|---|
| Display | **Fraunces** | Títulos, número do aluno atual, momentos de celebração ("Contagem concluída!"). |
| Corpo / UI | **Inter** | Parágrafos, botões, formulários — já usada no app hoje. |
| Dados | **IBM Plex Mono** | Contadores, rótulos técnicos ("Aluno 14 de 32"), sempre com `font-variant-numeric: tabular-nums`. |

### Escala

| Papel | Fonte / peso | Tamanho |
|---|---|---|
| Herói / H1 | Fraunces 600 | `clamp(1.8rem, 4vw, 2.6rem)` |
| Título / H2 | Fraunces 600 | `1.6rem` |
| Destaque / H3 | Inter 800 | `1.1rem` |
| Corpo | Inter 400 | `1rem` |
| Legenda | Inter 400 | `0.8rem` |
| Rótulo mono | IBM Plex Mono 600, uppercase, `letter-spacing: 0.04em` | `0.78rem` |

---

## 4. Espaço & forma

Os raios crescem com a importância do elemento; a sombra sempre usa a
tinta de marca, nunca preto puro.

| Token | Valor | Uso |
|---|---|---|
| `--radius-sm` | `0.6rem` | Chips, ícones, campos pequenos |
| `--radius-md` | `1rem` | Botões, cartões, inputs |
| `--radius-lg` | `1.6rem` | Cartões de destaque, modais, herói |
| `--shadow-sm` | `0 8px 24px rgba(46,16,101,.08)` | Cartões sobre o papel |
| `--shadow-lg` | `0 28px 70px rgba(46,16,101,.18)` | Modais, estado de conclusão |

---

## 5. Componentes

Peças retiradas diretamente das classes reais de `src/styles.css` — a
landing deve reaproveitar essas formas, não reinventá-las.

- **Botão primário** — gradiente `Roxo Escola → Roxo Vivo`, texto branco, `--radius-md`, sombra `0 10px 22px rgba(91,33,182,.25)`.
- **Botão secundário** — borda `1px` Roxo Neblina, texto Roxo Escola, fundo branco.
- **Botão de risco** — fundo Vermelho de Risco, texto branco (só para ações destrutivas).
- **Chip de estado** — pílula (`border-radius: 999px`), fundo Roxo Neblina / Verde-chamada suave / Âmbar suave conforme o estado.
- **Barra de progresso** — trilho em Roxo Neblina, preenchimento em gradiente de marca, `role="progressbar"`.
- **Linha de aluno** — cartão branco com número em selo roxo à esquerda e nome em destaque.
- **Toast** — fundo Tinta (ou Roxo Escola para sucesso), texto branco, cantos `--radius-md`.
- **Aviso de sistema** — fundo Âmbar suave, texto Âmbar, para mensagens que pedem atenção sem serem erro grave.

---

## 6. Voz & tom

Fala de coordenadora experiente, não de manual de software: direto, no
imperativo, sem jargão técnico. A Márcia não tem tempo para "clique para
prosseguir" — ela quer saber quem falta.

| Evite | Prefira |
|---|---|
| "O processamento da requisição falhou." | "Não foi possível concluir essa ação. Tente de novo." |
| "Deseja executar a exclusão do registro?" | "Excluir este registro? Essa ação não pode ser desfeita." |
| "Sincronização de dados concluída com sucesso." | "Salvo às 14:32." |
| "Otimize sua produtividade escolar com nossa solução." | "Nunca mais perca a contagem no meio do pátio." |

---

## 7. Para a landing page

O que a página precisa provar nos primeiros 10 segundos, antes que a
Márcia decida instalar ou fechar a aba.

- **Herói**: mostra a tela real de contagem (número grande, nome do aluno) — nunca um mockup genérico de laptop.
- **Primeira prova social**: sobre *não perder o progresso*, antes de falar em "gratuito" ou "fácil".
- **Call to action único**: instalar/abrir o app — nunca dois CTAs concorrentes na mesma dobra.
- **Números sempre em mono**: qualquer contagem, tempo ou total visível usa `IBM Plex Mono` com `tabular-nums`.
- **Rodapé de confiança**: reforça que os dados ficam no navegador da escola — nenhuma nuvem, nenhum cadastro.

### Esboço de estrutura

1. Herói — captura de tela real da contagem em andamento + CTA de instalar.
2. Bloco de confiança — "retoma de onde parou", em destaque, antes de qualquer outro argumento.
3. Como funciona — 3 passos: cadastrar → contar → salvo sozinho.
4. Fechamento — reforço de privacidade (dados no navegador) + CTA repetido.
