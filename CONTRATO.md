# CONTRATO.md

> Rascunho gerado a partir da leitura de `index.html`, `src/core.js` e `src/app.js`.
> Este projeto não usa React; é HTML/CSS/JS puro com estado salvo no `localStorage` do navegador.

## 1. Dados que a tela exibe

| Campo | Tipo | Onde aparece |
|---|---|---|
| Nome do aluno | texto | Lista da turma, linha do aluno, cartão de edição |
| Posição do aluno na lista (1, 2, 3...) | número | Ao lado do nome na lista da turma e na contagem livre |
| Quantidade de alunos cadastrados | número | Subtítulo do cabeçalho da tela principal e badge da seção "Montar lista" |
| Texto de busca digitado | texto | Campo de busca da lista (tela principal e contagem livre) |
| Quantidade de resultados da busca | número | Ao lado do campo de busca |
| Quantidade de registros no histórico | número | Botão "Histórico" |
| Rótulo de estado de salvamento ("Salvo às...", "Não salvo", "Salvamento automático") | texto | Chip no cabeçalho |
| Aviso "salvamento indisponível" | booleano (mostra/some) | Alerta no topo da tela |
| Aviso de dados recuperados/migrados | texto | Banner dispensável no topo |
| Disponibilidade do botão "Instalar aplicativo" | booleano | Cabeçalho da tela principal |
| Contador "X de Y contabilizados/selecionados" | número | Cabeçalho da tela de contagem (ordem e livre) |
| Progresso da contagem (%) | número | Barra de progresso |
| Nome do aluno anterior contabilizado | texto | Cartão "Último contabilizado" (contagem em ordem) |
| Nome do aluno atual | texto | Cartão central da contagem em ordem |
| Nome do próximo aluno | texto | Cartão "Próximo" (contagem em ordem) |
| Posição atual "Aluno X de Y" | texto/número | Pill acima do cartão atual |
| Estado selecionado de cada aluno (marcado/não marcado) | booleano | Lista da contagem livre |
| Quantidade de alunos marcados | número | Badge "X marcado(s)" na contagem livre |
| Status de cada registro do histórico ("Concluída"/"Encerrada") | texto | Cartão do histórico |
| Modo do registro ("Ordem alfabética"/"Contagem livre") | texto | Cartão do histórico |
| Data/hora de início e de término do registro | texto (data formatada) | Cartão do histórico |
| Quantidade contabilizada / total do registro | número | Cartão do histórico |
| Lista de nomes contabilizados no registro | lista (texto) | Dentro do `<details>` do cartão do histórico |
| Modo, contabilizados/total, início e conclusão da contagem recém-terminada | texto/número | Tela "Contagem concluída" |
| Mensagens de confirmação/erro (toast) | texto | Região de notificação no rodapé/topo |

## 2. Ações que o usuário dispara

| Ação na tela | O que deveria acontecer depois |
|---|---|
| Preencher e enviar "Adicionar aluno" | Aluno entra na lista (nome validado e sem duplicata) e a lista é reordenada alfabeticamente |
| Clicar em "Editar" e salvar o novo nome | Nome do aluno é atualizado, com a mesma validação da criação |
| Clicar em "Cancelar" durante a edição | Sai do modo de edição sem alterar o nome |
| Clicar no "×" de um aluno | Pede confirmação; se confirmado, remove o aluno da lista |
| Clicar em "Limpar toda a lista" | Pede confirmação; se confirmado, remove todos os alunos |
| Digitar no campo de busca da lista | Filtra os alunos exibidos pelo nome digitado (só na tela) |
| Clicar em "Baixar lista (.csv)" | Gera e baixa um arquivo CSV com a lista atual (hoje feito só no navegador) |
| Clicar em "Contar em ordem" | Pede confirmação; inicia uma contagem sequencial e trava a lista para edição |
| Clicar em "Contagem livre" | Pede confirmação; inicia uma contagem livre e trava a lista para edição |
| Clicar em "Confirmar aluno" (contagem em ordem) | Marca o aluno atual como contabilizado e avança para o próximo; no último aluno, a contagem é concluída e um registro é salvo no histórico |
| Clicar em "Corrigir anterior" | Desfaz a última confirmação e volta para o aluno anterior |
| Clicar em um aluno na contagem livre | Alterna esse aluno entre marcado/desmarcado |
| Digitar na busca da contagem livre | Filtra os alunos exibidos pelo nome digitado |
| Clicar em "Concluir com X alunos" (contagem livre) | Pede confirmação; encerra a contagem e salva um registro "concluída" no histórico |
| Clicar em "Encerrar" durante qualquer contagem | Pede confirmação; descarta a sessão (se estava em andamento, salva um registro "cancelada" no histórico) e libera a lista para edição |
| Clicar em "Preparar nova contagem" (tela final) | Pede confirmação; encerra a sessão concluída e libera a lista para edição |
| Clicar em "Ver histórico" | Abre a tela de histórico |
| Clicar em "Voltar" (tela de histórico) | Volta para a tela principal |
| Abrir "Ver alunos contabilizados" em um registro | Mostra a lista de nomes daquele registro (sem ação de servidor) |
| Clicar em "Excluir registro" no histórico | Pede confirmação; remove aquele registro do histórico |
| Clicar em "Limpar histórico" | Pede confirmação; remove todos os registros do histórico |
| Clicar em "Instalar aplicativo" | Aciona o prompt de instalação do PWA do navegador |
| Fechar o aviso de notificação | Apenas esconde o aviso na tela |

## 3. O que o servidor precisaria fazer em cada ação

- **Adicionar aluno**: guardar o novo aluno associado à lista do usuário/turma ?, impedindo nome repetido nessa mesma lista.
- **Editar aluno**: atualizar o nome salvo daquele aluno, aplicando a mesma regra de nome único.
- **Remover aluno**: apagar (ou desativar ?) o aluno salvo, para que ele não apareça mais na lista nem em novas contagens.
- **Limpar toda a lista**: apagar todos os alunos daquela lista.
- **Baixar lista (.csv)**: hoje é gerado inteiramente no navegador; se passar a vir do servidor, ele teria que montar o arquivo com a lista salva no momento.
- **Iniciar contagem (em ordem ou livre)**: criar e guardar uma nova sessão de contagem, vinculada à lista de alunos daquele momento, para poder ser retomada depois se a página for fechada.
- **Confirmar aluno (contagem em ordem)**: registrar que aquele aluno foi contabilizado na sessão e indicar qual é o próximo aluno.
- **Corrigir anterior (desfazer)**: reverter a última confirmação registrada naquela sessão.
- **Marcar/desmarcar aluno (contagem livre)**: atualizar a lista de alunos contabilizados daquela sessão.
- **Concluir contagem (em ordem ou livre)**: fechar a sessão como concluída e gravar um registro permanente no histórico com quem foi contabilizado.
- **Encerrar contagem em andamento**: fechar a sessão como cancelada, salvando o registro correspondente no histórico, e liberar a lista para edição.
- **Preparar nova contagem**: encerrar a sessão concluída, mantendo a lista de alunos disponível para editar de novo.
- **Excluir um registro do histórico**: apagar aquele registro salvo.
- **Limpar histórico**: apagar todos os registros de histórico daquele usuário/turma.
- **Abrir a tela / carregar dados**: devolver a lista de alunos atual, a sessão em andamento (se houver) e o histórico salvos para aquele usuário/turma.

## 4. Dúvidas para o professor

- Hoje tudo é salvo no `localStorage` do navegador, por aparelho. Com um servidor, os dados devem ficar por conta de usuário, por turma, ou continuar sendo "um app, uma lista"? ?
- Existe o conceito de "turma" (várias listas separadas) ou o sistema deve continuar com uma única lista de alunos? ?
- O histórico deve ter algum limite de tamanho ou tempo de retenção, ou fica para sempre?
- O download do CSV deve continuar sendo gerado no navegador, ou o servidor deve passar a gerá-lo?
- A trava da lista durante uma contagem (`ROSTER_LOCKED` em `src/core.js`) precisa ser garantida também pelo servidor, ou basta a trava que já existe no lado do cliente?
- "Corrigir anterior" hoje desfaz um passo por vez. É esperado poder desfazer vários passos seguidos, ou só o último?
- A verificação de nome duplicado é feita dentro da mesma lista. Se existirem várias turmas/listas no futuro, o mesmo nome pode se repetir em turmas diferentes? ?
- O código atual tem lógica de migração de versões antigas de dados salvos no navegador (v1/v2 do `localStorage`). Isso precisa ter algum equivalente no servidor, ou esses dados antigos ficam só no navegador de quem já usava o app? ?
