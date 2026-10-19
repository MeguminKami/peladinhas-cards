# Objetivos combinados — 19 de outubro de 2026

Implementação local de «Combinar ambos» para missões e eventos por objetivos. Resultados e avaliações têm metas independentes, combinadas com **E**, no mesmo período e após desbloqueio. O editor, revisão, edição, resumo de Missões, detalhe, apuramento e entrega usam a mesma regra. A componente de estrelas conserva os mínimos por critério e os modos de média/sequência existentes.

Validação local:

- 142 testes de lógica passaram, incluindo conclusão conjunta, progresso parcial, limites, validação de estruturas e regressão de médias móveis.
- Integração no emulador Firestore: rejeição de configurações inválidas, resultados/avaliações autoritativos, ausência de entrega parcial, entrega única e instante de conclusão da competição.
- Fluxos anteriores de criação de missões/eventos verificados; novo fluxo verifica criar, rever, guardar, reabrir para edição e mostrar as duas metas.
- Interface inspecionada em desktop e telemóvel; teste cobre 1440/768/390/320 px, quatro temas, teclado e redução de movimento. Capturas usam dados fictícios.

Sem deploy executado e sem verificação cloud. Nenhum dado existente precisa de migração ou recálculo; semanas fechadas mantêm-se.

Publicação seletiva:

```powershell
npx.cmd firebase deploy --only "functions:peladinhas:eventAction,functions:peladinhas:getEvent,functions:peladinhas:claimMission,functions:peladinhas:closeEvents,functions:peladinhas:onGame,functions:peladinhas:refreshCardCollection"
npm.cmd run deploy:frontend
```

Publicar o backend antes de disponibilizar o novo formato no editor. [Regras funcionais](../reference/events-and-missions.md#combinar-resultados-e-avaliações) · [Guia de testes](../guides/testing.md).
