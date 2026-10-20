# The Ultimate V2 — 20/10/2026

Quatro modelos nativos de mérito, independentes dos projetos do Card Lab já guardados: Goleador, Participação, Modric e Vitorioso. Os nomes começam por «V2 ·» no catálogo. Após revisão visual, os títulos foram removidos do interior das cartas e a regra foi registada em `AGENTS.md`. Cada composição tem uma estrutura própria: impacto assimétrico, medalhão orbital, fitas fluidas e arquitetura monumental. Metal prismático, profundidade escura e reflexos de opala ligam o tier Ultimate. As zonas de nome, OVR e atributos mantêm proteção de contraste.

## Integração

Adicionada também a edição `ultimate-guarda-redes-v2`, agora «V2 - The Ultimate Redes»: conceito Reflexo, titânio glacial e placas facetadas, com luva como emblema. A gema hexagonal atrás da fotografia foi retirada a pedido do utilizador. O ID permanece para preservar atribuições existentes. A coleção passa a cinco edições, sem títulos dentro das cartas. Validade permanente e atribuição pelos prémios configurados do admin, sem novas metas automáticas. Usa o mesmo seletor de backend documentado abaixo, por acrescentar um ID ao catálogo partilhado; a renomeação visual posterior e remoção da gema exigem apenas frontend.

`js/card-ultimate-designs.js` é incluído no catálogo e na política de validade permanente. O editor disponibiliza as silhuetas, ornamentos e emblemas com nomes próprios. Os modelos entram nas opções de prémio do admin. Não foram criadas metas, alteradas missões, atribuídos prémios nem escritos dados cloud. Os limites e os destinatários continuam a ser os escolhidos pelo administrador. Não é necessário recalcular cartas ou semanas fechadas.

## Verificação

- `npm.cmd test`: 157 testes passaram, incluindo catálogo ativo/reservado e recompensas válidas.
- `npm.cmd run test:ultimate-cards`: cinco modelos no catálogo real, prémios permanentes válidos, SVG, ausência de títulos internos, quatro temas e larguras 1440/768/390/320 sem overflow. Inclui Guarda-Redes com posição GR na pré-visualização. Folha de comparação e cartas individuais em `test-results/ultimate-v2/`; capturas desktop/telemóvel inspecionadas. Os jogadores, fotografias padrão e valores apresentados são exemplos.
- Não foi validada atribuição num aparelho real nem executado deploy.

## Publicação seletiva

A revisão de desenho e remoção dos títulos altera apenas a apresentação: `npm.cmd run deploy:frontend`. Mantém IDs, durações e regras de atribuição. O seletor de backend abaixo continua a ser necessário para a introdução inicial destas quatro edições, caso ainda não tenha sido publicada.

Frontend: `npm.cmd run deploy:frontend`. Backend: `npm.cmd run deploy:ultimate`, um seletor explícito de funções, sem regras ou deploy global. Necessário porque os catálogos e a política são módulos partilhados: validação de prémios, validade, coleção, edição de modelos e consumidores dos cálculos precisam da mesma versão.

```powershell
npx.cmd firebase deploy --project pedalinhas-cards --only "functions:peladinhas:onCommunityRating,functions:peladinhas:onPlayerPosition,functions:peladinhas:onInitialRating,functions:peladinhas:onFeedback,functions:peladinhas:onGame,functions:peladinhas:saveOvrWeights,functions:peladinhas:rebuildHistory,functions:peladinhas:closeCardWeek,functions:peladinhas:openCardWeek,functions:peladinhas:ensureHistory,functions:peladinhas:refreshCardCollection,functions:peladinhas:selectWeeklyCard,functions:peladinhas:rebuildLeague,functions:peladinhas:deleteGame,functions:peladinhas:saveWeeklyCardPhoto,functions:peladinhas:correctRating,functions:peladinhas:eventAction,functions:peladinhas:voteEvent,functions:peladinhas:closeEvents,functions:peladinhas:getEvent,functions:peladinhas:listEvents,functions:peladinhas:claimMission,functions:peladinhas:getPath,functions:peladinhas:pathAction,functions:peladinhas:onPathGame,functions:peladinhas:onPathSummary,functions:peladinhas:settlePaths,functions:peladinhas:gameAction,functions:peladinhas:feedbackAction,functions:peladinhas:maintenanceAction,functions:peladinhas:systemHeartbeat,functions:peladinhas:saveTheme"
```
