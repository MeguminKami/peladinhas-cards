# Objetivos históricos — 19 de outubro de 2026

Implementados localmente 23 objetivos de totais acumulados para missões/eventos, separados dos objetivos de período nos seletores. Incluem resultados, contribuições, participações por posição e jogos/vitórias com mínimo de estrelas. As posições usam o registo do jogo; não o perfil atual.

Os totais incluem jogos anteriores, com data limite na verificação/fecho. Metas históricas têm uma única conclusão e aceitam até 1 000 000. O servidor rejeita repetições diárias/semanais e progresso forjado; preserva os pré-requisitos, a entrega única e a cronologia da competição. Combinações podem usar histórico numa meta e período na outra.

Verificações locais realizadas:

- 145 testes de lógica passaram, incluindo as contagens dos 23 objetivos, exclusão de jogos futuros/eliminados/reabertos, posições, prazos de avaliações, desbloqueio e instante mínimo de conclusão.
- Cenário de integração no emulador Firestore: jogos e avaliações anteriores ao desafio, entrega única, dados insuficientes, tentativa de repetição, comparação com estrelas de período e classificação a partir da abertura.
- Browser: 23 opções, grupos de contagem, renovação desativada, revisão, guardar/editar e combinação com estrelas; teclado, redução de movimento e 1440/768/390/320 px nos quatro temas.
- Capturas inspecionadas em desktop e telemóvel; dados fictícios.

Sem deploy executado ou configuração cloud verificada. Não exige migração nem recálculo de semanas fechadas. [Referência funcional](../reference/events-and-missions.md#totais-do-histórico) · [Testes](../guides/testing.md).

Publicar os consumidores do cálculo e depois o frontend:

```powershell
npx.cmd firebase deploy --only "functions:peladinhas:eventAction,functions:peladinhas:getEvent,functions:peladinhas:claimMission,functions:peladinhas:closeEvents,functions:peladinhas:onGame,functions:peladinhas:refreshCardCollection"
npm.cmd run deploy:frontend
```
