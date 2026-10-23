# Processamento horário das avaliações

[← Documentação](../README.md) · [Cartas e avaliações](cards-and-ratings.md)

## Guardar e publicar

A avaliação fica guardada imediatamente. As médias de jogo, a evolução das cartas e as conquistas derivadas são publicadas pelo processamento horário, aos minutos `00`, na hora de Lisboa. Até lá, os ecrãs usam o último resumo publicado. O estado da própria submissão continua disponível imediatamente.

Uma mudança efetiva numa avaliação submetida cria ou atualiza uma entrada privada em `feedbackWork/{gameId}`. Rascunhos e mudanças apenas de timestamps não iniciam cálculos. O envio e a marcação são atómicos, incluindo correções administrativas. O trigger `onFeedback` cobre também remoções e escritores antigos; não recalcula cartas.

## Trabalho limitado às alterações

`processFeedback` consulta apenas entradas pendentes, com limite de 50 jogos por execução. Calcula cada jogo uma vez e partilha um contexto de leitura para reconstruir os jogadores afetados, sem reler as avaliações brutas de todos os jogos anteriores. Sem entradas pendentes, não consulta jogos, avaliações ou históricos. A consulta vazia e os documentos de controlo do agendamento ainda têm custo; não se promete consumo zero.

Cada entrada tem uma geração. Se chegar outra avaliação durante o cálculo, essa geração fica pendente para a execução seguinte. Falhas conservam o trabalho para nova tentativa. A exclusão entre execuções usa o controlo de tarefas existente. Pode haver uma publicação intermédia antes da execução seguinte quando chegam avaliações durante o cálculo.

Abrir páginas não força o processamento. Resumos históricos incompletos são colocados na fila e reparados pela tarefa horária; a leitura normal da coleção não percorre avaliações antigas para os reconstruir. A fila é exclusiva do servidor e não exige novas permissões de cliente nem índices compostos.

## Prazos e operações explícitas

O ETC continua a associar cada missão ao próximo jogo. A verificação horária consulta os votos originais de jogos com tentativas pendentes: com sete votos reais por critério, entrega se o sucesso resistir a duas estrelas em todos os votos em falta. Esta antecipação não depende do resumo publicado nem consulta revisões históricas. As contagens guardadas da tentativa atualizam nessa verificação. Sem sucesso antecipado, às 48 horas consulta o registo de versões para selecionar as avaliações elegíveis no prazo original, mesmo que a execução seja posterior. O atraso de publicação não prolonga o prazo. [Regras completas](player-paths.md#avaliações-48-horas-e-sete-votos).

Semanas já fechadas e conquistas anteriormente entregues conservam as regras de preservação existentes. O processamento horário não reabre semanas. As operações administrativas explícitas de recalcular jogos/liga e o fecho ou correção dos dados de um jogo continuam a poder recalcular imediatamente. As avaliações iniciais e comunitárias não são abrangidas por esta fila.

## Testar e publicar

Executar `npm.cmd run test:feedback-hourly` para testar a fila com dados sintéticos no emulador. O comando não necessita de leituras da base real. Os testes de integração de cartas, jogos e percursos devem chamar o processamento quando pretendem observar uma publicação horária.

Publicar com `npm.cmd run deploy:feedback-hourly`. O script inclui a nova tarefa, o trigger, os escritores e todos os consumidores dos módulos partilhados de cálculo e percursos. Não exige publicação do frontend. A execução deste comando é uma operação separada; os testes locais não confirmam a publicação cloud.

## Votos em falta anulados pelo administrador

Jogos → Avaliações permite anular a obrigação pendente de um participante, sem inventar notas. O crédito conta apenas para os mínimos de avaliação; médias e contagens reais mantêm-se. O admin pode repor a obrigação. A alteração é auditada e segue a fila horária, sem recálculo global. O ETC respeita o estado da dispensa no prazo de 48 horas. [Modelo, testes e publicação](../reports/rating-waivers-2026-10-22.md).
