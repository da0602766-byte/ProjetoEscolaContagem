# ANÁLISE E DESENVOLVIMENTO DO SISTEMA DE CONTAGEM DE ALUNOS

Com base nos **dois arquivos enviados**, siga obrigatoriamente as etapas abaixo.

## ETAPA 1 — Analisar os arquivos

Antes de desenvolver ou alterar qualquer código, faça uma revisão completa dos dois arquivos.

Analise cada arquivo individualmente e identifique:

- objetivo;
- estrutura;
- funcionamento;
- funcionalidades existentes;
- regras presentes;
- problemas;
- inconsistências;
- possíveis conflitos entre os arquivos;
- pontos que podem ser melhorados.

Depois, apresente um **resumo geral do projeto**, explicando de forma simples:

- qual é o objetivo do sistema;
- como ele deverá funcionar;
- quais regras precisam ser respeitadas;
- quais problemas foram encontrados;
- quais melhorias são recomendadas.

**Nesta etapa, não altere nenhum arquivo e não escreva a implementação final.**

---

# ETAPA 2 — Planejamento antes da implementação

Depois da análise, apresente um planejamento técnico resumido da implementação.

Informe:

- estrutura proposta do sistema;
- organização do HTML;
- organização do CSS;
- organização do JavaScript;
- estratégia de armazenamento dos dados;
- funcionamento da recuperação automática do progresso;
- fluxo de cadastro dos alunos;
- fluxo da contagem;
- tratamento de possíveis erros;
- funcionamento no celular e desktop.

Priorize uma solução simples, segura e com pouco código desnecessário.

---

# ETAPA 3 — AGUARDAR MINHA AUTORIZAÇÃO

Depois de apresentar:

1. análise dos arquivos;
2. resumo;
3. problemas encontrados;
4. planejamento da implementação;

**pare o processo.**

Não implemente alterações ainda.

Somente continue quando eu enviar exatamente:

**PERMISSÃO**

Sem essa autorização, nenhuma implementação deverá ser realizada.

---

# OBJETIVO DO SISTEMA

O sistema será utilizado para realizar a **contagem de alunos**.

O principal objetivo é evitar que o usuário perca a posição da contagem caso:

- feche o navegador;
- atualize a página;
- saia do sistema;
- interrompa a contagem;
- desligue o dispositivo;
- ocorra alguma interrupção inesperada.

A contagem deverá utilizar a **ordem alfabética dos alunos como referência de progresso**.

---

# CADASTRO DOS ALUNOS

Os alunos serão **cadastrados pelo próprio usuário**.

O sistema deverá permitir cadastrar a lista antes do início da contagem.

Depois que a contagem for iniciada:

**a lista não poderá ser modificada.**

Isso significa que não deverá ser possível:

- adicionar alunos;
- excluir alunos;
- alterar nomes;
- reorganizar manualmente a lista.

Caso seja necessário modificar a lista, deverá existir um procedimento explícito para **encerrar ou reiniciar a contagem atual**, evitando alterações acidentais.

---

# ORDEM ALFABÉTICA

Antes de iniciar a contagem, o sistema deverá organizar automaticamente os alunos em **ordem alfabética**.

Essa ordem deverá permanecer fixa durante toda aquela sessão de contagem.

Não dependa somente da posição numérica do aluno.

Utilize também uma identificação persistente para cada registro, evitando que mudanças internas causem perda ou inconsistência no progresso.

---

# SALVAMENTO AUTOMÁTICO

Utilize o **LocalStorage do navegador** para armazenar os dados necessários.

O sistema deverá salvar automaticamente, sempre que necessário:

- lista cadastrada;
- alunos da contagem atual;
- ordem utilizada;
- aluno atual;
- último aluno concluído;
- quantidade já contabilizada;
- estado da contagem;
- data ou horário da última atualização, quando útil.

O usuário não deverá precisar clicar constantemente em um botão de "Salvar".

---

# RECUPERAÇÃO AUTOMÁTICA

Quando o usuário abrir novamente o sistema, ele deverá detectar se existe uma contagem em andamento.

Caso exista, deverá restaurar automaticamente:

- lista de alunos;
- progresso;
- último aluno contado;
- próximo aluno;
- quantidade contabilizada;
- estado anterior da sessão.

O sistema deverá permitir continuar **exatamente do ponto onde a contagem foi interrompida**.

Não reinicie automaticamente uma contagem existente.

---

# PREVENÇÃO CONTRA PERDA DE PROGRESSO

A lógica deverá ser desenvolvida considerando situações como:

- fechamento acidental da página;
- atualização do navegador;
- retorno posterior ao sistema;
- cliques repetidos;
- tentativa de avançar rapidamente;
- tentativa de modificar uma lista bloqueada;
- dados incompletos;
- dados inválidos no LocalStorage;
- sessão interrompida.

Sempre que possível, proteja o usuário contra ações que possam apagar o progresso.

---

# REINICIAR OU ENCERRAR CONTAGEM

Caso exista uma função para reiniciar, cancelar ou apagar uma contagem, ela deverá exigir **confirmação explícita do usuário**.

Nunca apague automaticamente:

- lista;
- progresso;
- histórico atual;
- posição da contagem.

Evite ações destrutivas acionadas por apenas um clique acidental.

---

# TECNOLOGIAS PERMITIDAS

Desenvolva utilizando exclusivamente:

- HTML5;
- CSS3;
- JavaScript puro / Vanilla JavaScript.

Não utilizar:

- React;
- Vue;
- Angular;
- Bootstrap;
- Tailwind;
- jQuery;
- frameworks;
- bibliotecas externas desnecessárias.

O sistema deverá funcionar diretamente no navegador.

---

# ORGANIZAÇÃO DO CÓDIGO

Antes da implementação, defina uma estrutura clara para:

- interface;
- estilos;
- regras do sistema;
- armazenamento;
- validações;
- controle da contagem.

Evite:

- código duplicado;
- funções gigantes;
- variáveis sem significado;
- lógica excessivamente complexa;
- alterações desnecessárias.

Utilize funções pequenas e responsabilidades bem definidas.

---

# PRIORIDADE PARA CELULAR

O sistema deverá seguir uma abordagem **Mobile First**.

Priorize primeiro a experiência em celulares.

A interface deve possuir:

- boa legibilidade;
- espaçamento adequado;
- botões fáceis de tocar;
- campos bem dimensionados;
- navegação simples;
- poucas informações desnecessárias na tela;
- indicação clara do aluno atual;
- indicação clara do progresso;
- indicação clara da quantidade contabilizada.

Depois, adapte para telas maiores.

---

# DESKTOP

Mesmo sendo focado em celular, o sistema também deverá funcionar corretamente em:

- notebooks;
- computadores;
- telas maiores.

Evite simplesmente ampliar o layout do celular.

Utilize o espaço adicional de maneira organizada.

---

# INTERFACE DA CONTAGEM

Durante a contagem, priorize as informações mais importantes.

Deixe claramente visível:

- aluno atual;
- próximo aluno, quando necessário;
- posição atual;
- total de alunos;
- quantidade já contabilizada;
- progresso da contagem.

Evite uma interface poluída.

A ação principal da contagem deverá ser muito fácil de identificar.

---

# FEEDBACK VISUAL

Sempre que uma ação importante ocorrer, forneça feedback visual.

Exemplos:

- aluno contabilizado;
- progresso salvo;
- contagem retomada;
- lista bloqueada;
- tentativa de edição bloqueada;
- contagem concluída;
- erro ao recuperar informações.

Não utilize alertas excessivos que atrapalhem o fluxo da contagem.

---

# TRATAMENTO DE ERROS

Trate situações como:

- nome vazio;
- aluno duplicado;
- caracteres inválidos, quando aplicável;
- lista vazia;
- tentativa de iniciar uma contagem sem alunos;
- LocalStorage indisponível;
- dados corrompidos no LocalStorage;
- tentativa de editar lista durante uma contagem;
- tentativa de iniciar duas contagens simultaneamente;
- cliques duplicados.

Os erros deverão ser apresentados de maneira clara para o usuário.

---

# TESTES OBRIGATÓRIOS

Antes de considerar a implementação concluída, teste pelo menos:

1. cadastro de alunos;
2. ordenação alfabética;
3. início da contagem;
4. avanço da contagem;
5. atualização da página durante a contagem;
6. fechamento e reabertura;
7. recuperação automática;
8. tentativa de editar lista bloqueada;
9. finalização da contagem;
10. reinício de uma nova contagem;
11. funcionamento em celular;
12. funcionamento em desktop;
13. dados incompletos;
14. LocalStorage contendo informações inválidas;
15. cliques repetidos ou rápidos.

---

# REGRA IMPORTANTE SOBRE ALTERAÇÕES

Ao implementar:

- preserve tudo que já estiver correto;
- não remova funcionalidades sem necessidade;
- não altere regras sem justificar;
- não reescreva partes funcionando apenas por preferência estética;
- faça somente as alterações necessárias para atender aos requisitos.

Se encontrar algo nos arquivos que contradiga estas regras, informe antes da implementação.

---

# FLUXO OBRIGATÓRIO DA IA

Siga exatamente esta ordem:

**Arquivos → análise → problemas → resumo → planejamento → dúvidas essenciais → aguardar PERMISSÃO → implementação → testes → relatório final.**

Caso alguma informação realmente indispensável esteja ausente, faça perguntas antes da implementação.

Não invente requisitos.

Não implemente antes da minha **PERMISSÃO**.