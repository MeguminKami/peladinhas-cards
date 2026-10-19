# Construtor de metas e preservação — 19 de outubro de 2026

Implementado localmente «+ Adicionar nova meta», de 1 a 12 metas de qualquer tipo suportado. Só uma fica aberta; as restantes recolhem para um resumo. Permite editar, remover e reordenar, com IDs estáveis. Todas as metas são obrigatórias. Os formatos antigos continuam válidos; a conversão ocorre ao guardar no novo editor.

O progresso continua a vir dos jogos e avaliações guardados. Alterar o alvo conserva a quantidade real; mudar tipo/critério recalcula pelos dados correspondentes. Nas edições publicadas, o servidor protege o contexto da contagem e mantém participantes anteriores e registos de entregas. Não há reposição a zero nem duplicação de prémios por guardar.

Verificações locais:

- 147 testes de lógica passaram, incluindo IDs, limites, ordem das metas e preservação de quantidades ao alterar alvos.
- 17 testes de integração de eventos no emulador Firestore passaram, incluindo converter uma missão publicada, manter os 3 golos anteriores, acrescentar/reordenar metas, proteger a janela e impedir nova entrega do mesmo prémio. Inclui regressões dos formatos antigos.
- Browser: criar missões/eventos, adicionar/recolher metas, 21 tipos históricos de resultados e 2 de estrelas disponíveis, editar/remover/reordenar, guardar e reabrir; teclado, redução de movimento e 1440/768/390/320 px em quatro temas. Âmbitos anteriores também verificados.

Sem deploy executado nem verificação cloud. Não exige migração em massa, regras/índices novos ou recálculo de semanas fechadas. [Referência funcional](../reference/events-and-missions.md#editar-missões).

Publicar backend antes do frontend:

```powershell
npx.cmd firebase deploy --only "functions:peladinhas:eventAction,functions:peladinhas:getEvent,functions:peladinhas:claimMission,functions:peladinhas:closeEvents,functions:peladinhas:onGame,functions:peladinhas:refreshCardCollection"
npm.cmd run deploy:frontend
```
# Atualização de contagem — 19/10/2026

Os resumos de metas históricas usam «Total de N …», sem repetir «no histórico» ou «inclui jogos anteriores». As regras detalhadas conservam a explicação da contagem. Alteração apenas de apresentação no frontend; 35 testes de eventos passaram.

O editor distingue objetivo e contagem por meta, mantendo os 28 objetivos distintos: 24 de resultados e 4 de estrelas. «Histórico completo» agrupa as variantes históricas anteriores; «Durante o desafio» também funciona nos novos contadores de posições, empates, derrotas e contribuições. Sequências e médias recentes mantêm o período do desafio. Os formatos guardados continuam compatíveis, sem migração ou recálculo de semanas fechadas.

Validação local: 35 testes de eventos, incluindo todos os contadores nos dois períodos e conversão de todas as opções antigas; interface de missões/eventos em 1440, 768, 390 e 320 px, quatro temas, teclado e redução de movimento. Publicação não executada. Publicar backend (`eventAction`, `getEvent`, `claimMission`, `closeEvents`, `onGame`, `refreshCardCollection`) antes do frontend.

