# Performance entre fechos semanais — 22/10/2026

[Documentação](../README.md) · [Dados do início](../reference/home-data.md)

## Correção

O pódio Performance e o ranking semanal passam a considerar jogos desde o último fecho semanal até ao seguinte: início incluído, fim excluído. A abertura das cartas não reinicia nem limita este período. Jogos no intervalo em que as cartas estão fechadas já pertencem ao novo ranking.

`js/performance-week.js` deriva as fronteiras do calendário configurado, incluindo minutos, Lisboa, mudança de hora e de ano. `calculateWeeklyTopPlayers` e `componentWeeklyTopPlayers` usam o mesmo intervalo para ordenar e apresentar médias. Mantêm-se o mínimo de duas avaliações reais por jogo, o peso igual dos jogos e a média das componentes sem GR. OVR, Crescimento e a abertura/fecho das cartas não mudam.

O servidor `getHome` também conservava apenas os agregados desde a abertura. A projeção passa a incluir todos os agregados desde o último fecho, para todos os jogadores, mantendo o histórico pessoal recente já previsto. A versão da cache foi atualizada. Não foram acrescentadas consultas nem alterados os documentos de jogos, prémios ou semanas fechadas; não é necessário recalcular dados.

## Validação local

Testes determinísticos verificam o instante do fecho, o intervalo antes da abertura, a mudança de hora de outubro, calendário personalizado com minutos, mudança de ano e consistência entre ordenação e médias. O teste backend do início verifica oito jogos entre fecho e abertura de outro jogador, sem depender da exceção de histórico pessoal.

O emulador aprovou os dois testes de cache/checkpoints; o início quente manteve cinco leituras de documentos e zero consultas de coleções com vinte jogadores. O browser usa fixtures e inclui jogos do intervalo antes da abertura, com inspeção desktop/telemóvel e larguras 320, 390, 768 e 1440 px. Não houve leituras de produção nem deploy.

## Publicação

Executar `npx.cmd firebase deploy --only functions:peladinhas:getHome` e `npm.cmd run deploy:frontend`. `getHome` é o consumidor backend da projeção alterada; as restantes funções não chamam o cálculo de ranking semanal modificado. Não há alterações a regras, índices ou Storage.
