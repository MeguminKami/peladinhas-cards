# Ciclos de atualização

[← Documentação](../README.md) · [Avaliações](feedback-processing.md) · [Dados do início](home-data.md)

## Momentos de processamento

Missões, percursos, eventos, avaliações derivadas, cartas e lembretes são processados às **08:00, 12:00, 17:00 e 22:00**, em `Europe/Lisbon`, e no encerramento de um jogo. Uma avaliação comunitária ou pós-jogo submetida também inicia o ciclo de imediato: `onCommunityWork` e `onFeedbackWork` observam `communityWork/{id}` e `feedbackWork/{id}` e executam o ciclo apenas para a geração (`token`) mais recente ainda pendente. Com o lease do ciclo ocupado, o trigger repete; entregas com mais de 15 minutos ficam para o ciclo agendado. Os horários acompanham o horário de verão. O intervalo noturno pode chegar a dez horas.

O cron é `0 8,12,17,22 * * *`. Os endpoints agendados existentes continuam publicados, mas entram no mesmo ciclo coordenado. Um checkpoint por instante do scheduler permite que apenas uma entrega execute o trabalho. Um fecho de jogo tem uma chave própria. As execuções dispõem de 540 segundos; entregas falhadas podem repetir-se.

Cada ciclo verifica versões duráveis e prazos antes de carregar os dados: primeiro avaliações comunitárias e jogos pendentes; depois percursos, eventos e recompensas pendentes; por fim cartas/coleções e lembretes. Sem alterações nem prazos vencidos, a tarefa termina após consultar metadados. Isto também se aplica aos ciclos de fecho de jogo.

As cartas usam `cardRefreshWork/{uid}` e os percursos `pathRefreshWork/{uid}`: só jogadores alterados ou com prazos vencidos são processados. O contexto das cartas lê perfis, avaliações iniciais, resumos comunitários e recompensas desses jogadores; jogos e resumos partilhados continuam a ser consultados quando necessários ao cálculo. Publicar cartas não enfileira o próprio cálculo. Escolher um percurso não força apuramento dos eventos.

Recompensas e resumos produzidos pelo ciclo sinalizam os consumidores antes das tarefas seguintes. Uma recompensa entregue continua a atualizar a carta no mesmo ciclo. O heartbeat agrupa as entregas adiadas por jogador e usa um só histórico transacional por jogador, atualizando o orçamento entre entregas. As regras de reclamação manual e os limites mantêm-se.

Verificações globais continuam necessárias na inicialização, nas alterações de configuração e nas transições relevantes do calendário das cartas/coleções. Na última semana da época, enquanto a votação FUTTIES não existir, alterações de elegibilidade podem exigir o contexto global. Os horários não obrigam, por si só, a reconstruir todas as cartas.

A limpeza de dados transitórios e entregas push é diária às 08:00. Não se aumenta a frequência destas tarefas para quatro vezes por dia.

O âmbito são apuramentos e publicações derivados. Temporizadores de partidas interativas e validações necessárias às ações conservam o funcionamento próprio. A manutenção apresenta «Atualizar todos os sistemas», com o resultado e a possibilidade de pedir um ciclo explícito.

## Prazos e consultas

Um evento que termina às 14:00 é apurado às 17:00, salvo se existir entretanto um fecho de jogo. O fim efetivo continua às 14:00: não se aceitam votos posteriores nem jogos fora do período. O ETC preserva o corte original das 48 horas. As semanas fechadas e os resultados definitivos não são reabertos.

Uma abertura agendada também se materializa no ciclo seguinte. Se início e fim ficarem inteiramente entre dois ciclos, o evento pode abrir e terminar na mesma execução; escolher janelas de participação que incluam pelo menos um ciclo.

Consultar o início, uma missão ou um percurso não provoca apuramentos. O progresso objetivo fica em `events/{id}/private/progress`, exclusivo do servidor, com a versão da configuração e o período avaliado. A edição administrativa de uma configuração de contagem ativa recalcula e publica o progresso na própria transação; não cria conclusões nem encerra o desafio. Alterar a recompensa de uma missão substitui as entregas existentes na transação e enfileira a atualização das cartas no ciclo seguinte. Um novo período aguarda o próximo check. Missões únicas fechadas usam o resultado definitivo guardado.

Os votos são guardados imediatamente; a classificação pública em direto atualiza no ciclo seguinte. As filas de notificações registam alterações sem consultar toda a liga em cada trigger. Os lembretes da manhã ficam elegíveis às 08:00, respeitando as horas de silêncio.

Escrever avaliações, votar, preparar uma missão, escolher uma carta e reclamar uma recompensa continuam a validar identidade, acesso, prazo e duplicações. Reclamar usa progresso já apurado, sem voltar a percorrer jogos. Escolher uma carta ou mudar a fotografia não recalcula evolução. Reconstruções administrativas e envios explicitamente pedidos continuam disponíveis.

## Recuperação e custos

`automationCycles/{hash}` guarda a execução; `systemJobs/automationCycle` mantém o lease global. Uma execução concorrente repete a entrega. Uma falha deixa o ciclo disponível para repetição. As recompensas mantêm os identificadores idempotentes existentes.

Os checkpoints são conservados por 30 dias e removidos pela limpeza das 08:00. As filas usam tokens: só é confirmada a geração processada, preservando alterações posteriores.

`maintenanceRuns/{task}` guarda versão, política aplicável e próximo prazo. Falhas não confirmam a versão; alterações concorrentes continuam pendentes. A política entra na comparação para que uma versão agendada produza trabalho mesmo sem uma nova escrita na hora de entrada em vigor.

As expirações usam `rewardExpirations/{rewardId}`, consultando apenas entradas vencidas e removendo as processadas. A primeira execução inicializa este índice operacional a partir das recompensas existentes, incluindo documentos antigos sem `expirationProcessed`. Essa passagem lê uma vez a coleção completa; as execuções seguintes não voltam a ler todo o histórico expirado. Atribuições novas atualizam a fila na transação da recompensa.

Os objetivos consultam as conclusões dos pré-requisitos necessários; as operações de recompensa consultam o histórico dos participantes relevantes. A manutenção de eventos inclui abertos/agendados e fechados com entrega incompleta, excluindo rascunhos só por terem `rewardsApplied: false`. Ainda há consultas partilhadas de eventos ativos e notificações quando as suas dependências mudam; esta otimização não elimina todas as consultas globais.

Reclamações simultâneas da mesma missão/jogador são agrupadas por instância e recebem o mesmo resultado final. Não são guardados resultados concluídos em memória; a transação e o documento de entrega continuam a proteger repetições entre instâncias.

Entregas duplicadas continuam a ler metadados, mas o trabalho de domínio executa uma vez. Há também leituras de consulta e validação das ações. Quatro ciclos em vez de 24 não equivale à mesma redução percentual de leituras faturadas; a poupança cloud precisa de medição posterior.

## Publicação

Para a implementação seletiva, usar `npm.cmd run deploy:selective-updates`: executa `npx.cmd firebase deploy` com os seletores individuais dos consumidores do runtime partilhado, os três triggers `onHomeSource`, `onHomeFeedback` e `onHomeVote`, e `firestore:indexes`. A lista completa está no script de [package.json](../../package.json). Inclui os consumidores de eventos, percursos, cartas, manutenção, notificações e os endpoints agendados antigos. Não publica regras nem Storage.

Esta alteração seletiva é exclusivamente backend e índices: não exige frontend. O primeiro ciclo inicializa as filas e os checkpoints, preservando semanas fechadas; não é necessário pedir uma reconstrução manual da liga. A primeira inicialização tem custo superior aos ciclos seguintes. Publicação e consumo real só ficam confirmados após execução e medição cloud.

Verificação local: `npm.cmd run test:cycles`, `npm.cmd test`, `npm.cmd run test:read-safety`, `npm.cmd run check` e `npm.cmd run test:docs`. Estes procedimentos não exigem dados de produção.
