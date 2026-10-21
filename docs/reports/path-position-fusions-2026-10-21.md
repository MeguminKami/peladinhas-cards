# Cinco fusões por posição — 21/10/2026

Substituídas as três fusões anteriores por cinco pares fixos dos dois atributos com maior peso padrão de OVR de cada posição. O responsável informou que ainda não existiam conquistas nem primeiras missões concluídas. Não foi feita recolha, migração, limpeza de dados ou publicação cloud.

| Posição | Fusão / carta | Atributos premiados | Identidade gráfica |
| --- | --- | --- | --- |
| GR | Dono da Área | Guarda-redes + Posicionamento | Platina lunar, cerâmica azul e pilares de orientação |
| DEF | Central Dominante | Defesa + Físico | Armadura esmeralda e latão martelado |
| ALA | Desequilibrador | Velocidade + Drible | Carbono elétrico, coral e lâminas assimétricas |
| MED | Maestro | Passe + Visão de jogo | Porcelana índigo e arcos de paládio |
| AV | Predador Completo | Finalização + Drible | Obsidiana, ouro e presas incisivas |

IDs: `fusion-keeper`, `fusion-central`, `fusion-winger`, `fusion-maestro`, `fusion-predator`; cartas com prefixo `path-`. Removidos `fusion-attack`, `fusion-wall`, `fusion-engine` e as suas três cartas do catálogo, política e sorteio. Não se reaproveitaram IDs para significados diferentes. Os 12 percursos individuais mantêm IDs e funcionamento.

## Operação e missões

Marco 5 em ambas as origens desbloqueia «Unificar e ativar». Há cinco nós de Combinação; cada conclusão entrega até +1 em cada um dos dois atributos e o quinto entrega a assinatura permanente. Mantêm-se os três focos (origens e combinação), limites partilhados ETC de +15/campo e +25/GR, orçamentos e um reroll diário. O atributo Drible pode desbloquear Desequilibrador e Predador; não ganha dois saldos independentes.

São 255 modelos, 15 por cada uma das 17 rotas. Cada fusão tem oito entradas próprias e sete combinações adicionais. Todas as suas missões mantêm dois mínimos individuais de qualidade; médias adicionais não os substituem. As qualidades são GR/Defesa, Defesa/Físico, Físico/Ataque, Passe/Atitude e Ataque/Físico, respetivamente. Não há métricas novas de dribles, posicionamento ou visão; são indicadores aproximados documentados no [QuestETC](../../QuestETC.md).

Todas as missões das fusões valem para o próximo jogo e apuram às 48 horas, exigindo sete votos válidos por critério. Dono da Área exige sempre GR; as restantes exigem a posição temática apenas no modelo «Cumprir o papel». A autoavaliação «Não foi à baliza» continua a excluir GR. Ícone/Ultimate mantêm progressão estrita, com reforços adaptados aos novos caminhos. A revisão é `2026-10-21-position-fusions`.

As cartas são composições nativas SVG/CSS independentes: silhueta, material, gravura e emblema próprios, sem bibliotecas ou imagens externas. A fotografia e os números conservam espaço protegido. Nomes das edições aparecem fora das cartas. Elementos ficam disponíveis no Card Lab pelo catálogo existente.

## Verificação local

- 161 testes gerais passaram, incluindo correspondência dos pares aos pesos padrão, desbloqueios, existência das cartas, coexistência das duas fusões com Drible, condições, tetos e progressão Ultimate em todos os modelos/fases.
- Cinco testes backend passaram num projeto demo isolado. O caso novo percorre as cinco fusões, valida pré-requisitos, apura a etapa final com votos históricos válidos, entrega os dois atributos e a carta permanente e confirma ausência de duplicação.
- Interface de variedade e cartas: quatro temas e 1440/768/390/320 px; cinco composições capturadas e inspecionadas em desktop/telemóvel. O teste verifica ausência de overflow e títulos fora da carta.
- Navegação completa dos percursos passou: entrada de Missões/perfil, desbloqueio da fusão, focos individuais/Combinação, cinco nós, carta final, reroll, teclado, redução de movimento e recuperação de erro. Os seletores foram atualizados para o destino de missão com nó e os novos pares de atributos.
- Verificação de sintaxe, inventário QuestETC, ligações documentais e build de hosting passaram. Nenhuma alteração de regras ou índices.
- Catálogo e QuestETC regenerados offline. Não houve novas leituras Firestore de produção; a amostra estatística continua a ser a de 19/10. Não se afirma nova calibração empírica das missões, em particular GR.

## Publicação seletiva

Não foi executado deploy. Os novos IDs também entram no catálogo de recompensas partilhado, pelo que apenas publicar as sete funções de percursos seria insuficiente. `deploy:path-fusions` usa seletores explícitos para estes consumidores:

| Grupo | Funções |
| --- | --- |
| Avaliações e jogos | `onCommunityRating`, `onPlayerPosition`, `onInitialRating`, `onFeedback`, `onGame`, `correctRating`, `deleteGame`, `gameAction`, `feedbackAction` |
| Cartas, histórico e temas | `saveOvrWeights`, `rebuildHistory`, `closeCardWeek`, `openCardWeek`, `ensureHistory`, `refreshCardCollection`, `selectWeeklyCard`, `rebuildLeague`, `saveWeeklyCardPhoto`, `saveTheme` |
| Eventos e missões | `eventAction`, `voteEvent`, `closeEvents`, `getEvent`, `listEvents`, `claimMission` |
| Percursos | `getPath`, `pathAction`, `onPathGame`, `onPathSummary`, `settlePaths` |
| Manutenção | `maintenanceAction`, `systemHeartbeat` |

```powershell
npm.cmd run deploy:path-fusions
npm.cmd run deploy:frontend
```

O script seleciona apenas essas funções no projeto configurado; não publica regras nem índices. Não é necessário recalcular dados ou semanas fechadas. Confirmar depois da publicação o catálogo, desbloqueio e entrega; os testes locais não confirmam a versão cloud.
