# Avaliações agrupadas por jogo — 21/10/2026

[← Documentação](../README.md) · [Funcionamento e procedimentos](../reference/feedback-processing.md)

## Alteração

O trigger de cada avaliação deixou de agregar o jogo e reconstruir os históricos imediatamente. Os escritores colocam a geração pendente na mesma transação que guarda a avaliação. A tarefa `processFeedback` publica apenas os jogos alterados, uma vez por hora, e reconstrói os jogadores afetados com leituras partilhadas.

O cálculo normal do histórico passa a consumir os resumos publicados. A coleção também deixa de recorrer automaticamente às avaliações brutas para completar resumos antigos; estes entram na fila para reparação. O ETC evita ler avaliações e versões de tentativas que ainda não chegaram ao apuramento de 48 horas.

## Validação local

Testes específicos no emulador verificam gravação atómica, publicação adiada, agrupamento de 20 alterações, trigger atrasado, fila vazia, rascunhos, mudanças só de timestamps, remoção, concorrência, repetição após erro e reparação de resumos antigos. Os testes de integração de cartas e percursos foram adaptados à publicação explícita da fila.

Resultado final: **77 testes aprovados** — 5 da fila, 4 da coleção, 20 de integração geral, 17 de jogos/percursos e 31 de regras de cartas e missões. Foram também verificados jogos sem participantes, avaliações históricas malformadas, falha durante a reconstrução de históricos e isolamento da fila entre processos de teste. A fixture antiga de fusão foi alinhada com a fusão Predador Completo atualmente implementada.

`npm.cmd run test:docs`: **53 documentos e 359 referências locais válidas**. Verificação de sintaxe dos módulos alterados concluída. O benchmark comparativo de leituras foi adaptado à publicação horária, mas não foi executado nesta validação; não há uma percentagem de redução medida neste relatório.

Não foram consultados dados reais, nem executado deploy. A redução efetiva de leituras em produção deverá ser comparada no Query Insights após publicação; estes testes não constituem uma medição da faturação cloud.

## Publicação

`npm.cmd run deploy:feedback-hourly` publica seletivamente as funções necessárias. Não é necessário recalcular a liga para ativar o processamento dos novos envios. Resumos antigos incompletos são reparados progressivamente quando detetados pelo contexto da coleção. Semanas fechadas não são reescritas.
