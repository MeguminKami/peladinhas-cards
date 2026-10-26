# Ciclos de atualização

[← Documentação](../README.md) · [Avaliações](feedback-processing.md) · [Dados do início](home-data.md)

## Momentos de processamento

Missões, percursos, eventos, avaliações derivadas, cartas e lembretes são processados às **08:00, 12:00, 17:00 e 22:00**, em `Europe/Lisbon`, e no encerramento de um jogo. Os horários acompanham o horário de verão. O intervalo noturno pode chegar a dez horas.

O cron é `0 8,12,17,22 * * *`. Os endpoints agendados existentes continuam publicados, mas entram no mesmo ciclo coordenado. Um checkpoint por instante do scheduler permite que apenas uma entrega execute o trabalho. Um fecho de jogo tem uma chave própria. As execuções dispõem de 540 segundos; entregas falhadas podem repetir-se.

Cada ciclo consulta a informação atual: primeiro avaliações comunitárias e jogos pendentes; depois percursos, eventos e recompensas pendentes; por fim cartas/coleções e lembretes. A publicação de cartas partilha um contexto de leitura por lote e respeita as pausas configuradas.

A limpeza de dados transitórios e entregas push é diária às 08:00. Não se aumenta a frequência destas tarefas para quatro vezes por dia.

O âmbito são apuramentos e publicações derivados. Temporizadores de partidas interativas e validações necessárias às ações conservam o funcionamento próprio. A manutenção apresenta «Atualizar todos os sistemas», com o resultado e a possibilidade de pedir um ciclo explícito.

## Prazos e consultas

Um evento que termina às 14:00 é apurado às 17:00, salvo se existir entretanto um fecho de jogo. O fim efetivo continua às 14:00: não se aceitam votos posteriores nem jogos fora do período. O ETC preserva o corte original das 48 horas. As semanas fechadas e os resultados definitivos não são reabertos.

Uma abertura agendada também se materializa no ciclo seguinte. Se início e fim ficarem inteiramente entre dois ciclos, o evento pode abrir e terminar na mesma execução; escolher janelas de participação que incluam pelo menos um ciclo.

Consultar o início, uma missão ou um percurso não provoca apuramentos. O progresso objetivo fica em `events/{id}/private/progress`, exclusivo do servidor, com a versão da configuração e o período avaliado. Uma configuração alterada ou um novo período aguarda o próximo check. Missões únicas fechadas usam o resultado definitivo guardado.

Os votos são guardados imediatamente; a classificação pública em direto atualiza no ciclo seguinte. As filas de notificações registam alterações sem consultar toda a liga em cada trigger. Os lembretes da manhã ficam elegíveis às 08:00, respeitando as horas de silêncio.

Escrever avaliações, votar, preparar uma missão, escolher uma carta e reclamar uma recompensa continuam a validar identidade, acesso, prazo e duplicações. Reclamar usa progresso já apurado, sem voltar a percorrer jogos. Escolher uma carta ou mudar a fotografia não recalcula evolução. Reconstruções administrativas e envios explicitamente pedidos continuam disponíveis.

## Recuperação e custos

`automationCycles/{hash}` guarda a execução; `systemJobs/automationCycle` mantém o lease global. Uma execução concorrente repete a entrega. Uma falha deixa o ciclo disponível para repetição. As recompensas mantêm os identificadores idempotentes existentes.

Os checkpoints são conservados por 30 dias e removidos pela limpeza das 08:00. As filas usam tokens: só é confirmada a geração processada, preservando alterações posteriores.

Reclamações simultâneas da mesma missão/jogador são agrupadas por instância e recebem o mesmo resultado final. Não são guardados resultados concluídos em memória; a transação e o documento de entrega continuam a proteger repetições entre instâncias.

Entregas duplicadas continuam a ler metadados, mas o trabalho de domínio executa uma vez. Há também leituras de consulta e validação das ações. Quatro ciclos em vez de 24 não equivale à mesma redução percentual de leituras faturadas; a poupança cloud precisa de medição posterior.

## Publicação

`npm.cmd run deploy:cycles` contém seletores `functions:peladinhas:NOME` para os consumidores do runtime partilhado, incluindo agendamentos antigos, triggers e callables abrangidas. Não publica regras, índices ou Storage. Os três triggers de invalidação do início conservam a implementação e não precisam de publicação nesta alteração.

Publicar depois o frontend com `npm.cmd run deploy:frontend`. Não é necessário recalcular dados existentes: os ciclos criam snapshots em falta, preservando semanas fechadas. Até ao primeiro ciclo, objetivos sem snapshot aguardam apuramento.

Verificação local: `npm.cmd run test:cycles`, `npm.cmd test`, `npm.cmd run test:read-safety`, `npm.cmd run check` e `npm.cmd run test:docs`. Estes procedimentos não exigem dados de produção.
