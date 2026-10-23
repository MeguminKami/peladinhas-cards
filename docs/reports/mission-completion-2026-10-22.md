# Objetivos cumpridos e resgate na lista - 22/10/2026

[Documentação](../README.md) - [Missões e eventos](../reference/events-and-missions.md)

## Comportamento

Uma missão pessoal ou competição por objetivos que cumpra o objetivo completo distingue-se na própria caixa: contorno verde, visto, progresso verde e faixa «Objetivo cumprido». Mantém o tema da raridade. Valores parciais arredondados para 100% não determinam a conclusão. Votos e tarefas de avaliação não recebem este estado.

Quando o servidor autoriza o resgate pessoal, a faixa indica recompensa disponível e apresenta o botão compacto «Receber recompensa». Uma competição completa não promete um prémio nem apresenta esse botão: a atribuição depende das suas regras.

As atividades permanecem nas categorias habituais. Foram removidos a secção «Concluídas», o atalho e o histórico criado a partir das entregas. Depois do resgate, a missão sai da lista, mesmo se a atualização falhar ou devolver uma cache antiga. O botão fica desativado durante o pedido; erros permitem tentar novamente. Uma troca de utilizador impede aplicar o resultado na nova sessão. Recompensas sem orçamento continuam na fila existente, com confirmação por mensagem.

## Dados e publicação

`js/mission-model.js` é partilhado com `getHome`; a versão da cache foi atualizada. Não foram acrescentadas consultas nem alterados os cálculos ou registos de prémios. Não é necessário recalcular dados.

Publicar `npx.cmd firebase deploy --only functions:peladinhas:getHome` e `npm.cmd run deploy:frontend`. Não foi executado deploy.

## Validação local

`npm.cmd run test:mission-completion` verifica modelo e interface com fixtures: missão resgatável, objetivo completo sem autorização de resgate, competição completa, objetivo parcial e ausência de histórico. Inclui teclado, foco, clique duplicado, erro, nova tentativa, cache antiga e falha na atualização após resgate.

Foram verificadas larguras de 320, 390, 768 e 1440 px nos quatro temas, sem deslocação horizontal. Capturas desktop e telemóvel foram inspecionadas. O botão mantém pelo menos 44 px de altura. Os testes bloqueiam serviços reais: não houve leituras da base de dados ou Storage de produção.
