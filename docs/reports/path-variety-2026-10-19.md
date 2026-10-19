# Variedade de missões — implementação v4

Data: 19 de outubro de 2026, Europe/Lisbon.

[Referência funcional](../reference/player-paths.md) · [Catálogo extraído do código](../reference/path-mission-catalogue.md) · [Interface final](path-interface-2026-10-19.md)

## Resultado local

Implementados oito modelos por cada um dos 12 stats e das três fusões: 120 modelos, incluindo os existentes. Vitória isolada continua limitada à menor dificuldade; os níveis seguintes desses quatro percursos mantêm sete modelos. Os parâmetros são provisórios: não foi executada análise de jogos reais, consulta cloud, recálculo ou publicação nesta sessão.

`js/path-missions.js` contém o catálogo, validação, normalização, requisitos, textos e seleção. Novas propostas guardam `proposalVersion: 4`, `templateId`, `family`, título e condições ligadas por E. Não são aceites métricas desconhecidas ou expressões do cliente. Metas e condições completas ficam persistidas pelo servidor.

O sorteio pondera as famílias das últimas três tentativas congeladas por percurso e penaliza os modelos e famílias do trio substituído num reroll. Procura três famílias diferentes, com fallback determinístico para repetição de família quando necessário; não repete modelos nem aceita condições equivalentes ou alternativas mais exigentes com menos avanço. A normalização reconhece condições redundantes e a comparação considera implicações simples entre golos, assistências, contribuições, golos da equipa e vitória. Não existe um solucionador de expressões arbitrárias.

`js/path-model.js` avalia todas as condições e regista resultados individuais. `js/path-window.js` aplica o corte das 48 horas e os sete votos a cada critério. Falta de amostra cancela mesmo que outra condição tenha falhado. Todas as missões v4 de GR/Fortaleza exigem posição GR no jogo e cancelam sem perda se a participação não for elegível, incluindo autoavaliação N/A no corte. Propostas anteriores conservam os seus avaliadores.

Propostas, preparação e tentativas mostram título e lista de condições. As contagens usam os critérios efetivos do objetivo. A gestão de revisões mostra a missão quando a tentativa está no estado pendente ou no histórico compacto disponível.

## Compatibilidade

- `PATH_VERSION = 1` mantém-se; `recentPathFamilies` é aditivo e limitado a três famílias por percurso.
- Propostas v3 guardadas, preparação e tentativas pendentes não são convertidas ou sorteadas novamente. Mantêm-se os textos e avaliadores antigos, bem como o migrador anterior de v1/v2 para v3.
- Não há alterações a recompensas, limites, reservas, excedente, cartas, reroll diário global, regras ou índices.
- Não é necessário recalcular dados existentes. Os novos cálculos aplicam-se às novas propostas; semanas fechadas e conquistas anteriores permanecem preservadas.

## Validação dirigida

Foram executadas verificações novas e as três regressões diretamente afetadas pela alteração do catálogo. Não foi repetida a suite geral já registada no [relatório anterior](path-update-2026-10-18.md).

- **9 testes de lógica v4 passaram** em `tests/path-variety.test.js`: os 120 modelos, cobertura por fase/nível, famílias, obrigatoriedade GR, rejeição de tipos/métricas inválidos, equivalências e implicações, condições numéricas e mistas, histórico, reroll, compatibilidade, corte e cancelamento.
- A avaliação percorreu cada condição de todos os modelos nas três fases e nos três níveis, incluindo metas exatas e valores abaixo/acima do limite. O sorteio verificou **7.200 trios**: 15 percursos × 3 fases × 160 seeds, com três famílias distintas e sem equivalências ou dominância indevida.
- A mesma amostra confirmou que os oito modelos de cada percurso são alcançáveis em cada fase e que nenhum dos três lugares fica preso a uma só família.
- **3 testes anteriores afetados passaram**: criação das três propostas, dificuldade a partir dos pontos entregues e ausência de objetivos repetidos. As expectativas foram adaptadas ao objeto v4.
- **3 cenários novos de backend validados** em `tests/path-variety.backend.test.js`, num Firestore demo local: propostas persistidas e autoridade do servidor; reroll concorrente; abertura atómica com objetivo completo e histórico; fecho de missão numérica composta e idempotência; apuramento misto histórico e cancelamento por seis votos. O cenário de abertura foi reexecutado isoladamente após corrigir a fixture para incluir titulares nas duas equipas.
- A CLI Firebase não iniciou o emulador neste ambiente. Foi usado diretamente o JAR local já instalado, no projeto `demo-peladinhas-variety` e porta 8086, com os testes Node ligados por `FIRESTORE_EMULATOR_HOST`. Isto não representa execução bem-sucedida do wrapper `emulators:exec`.
- **Interface v4 passou** em `tests/path-variety.mjs`: propostas com quatro condições, preparação, tentativa pendente, contagem por critério, texto de missão numérica, teclado, foco e redução de movimento. Propostas verificadas em 1440/768/390/320 px e nos quatro temas; preparação e gestão nas quatro larguras. Capturas de desktop e telemóvel foram inspecionadas. Artefactos locais em `test-results/path-variety/`; dados fictícios.
- **Sintaxe dos seis módulos de execução alterados passou.** `npm.cmd run build:hosting` passou, com 118 recursos públicos e inventário PWA atualizado.
- `npm.cmd run test:docs` foi executado após atualizar os documentos. Mantém **19 referências a ficheiros ausentes**, já observadas antes desta implementação; não apontou ligações novas inválidas. Não se reconstruíram relatórios ou planos históricos sem fonte.

Comandos reutilizáveis:

```powershell
npm.cmd run test:paths:variety
npm.cmd run test:paths:variety:ui
npx.cmd firebase emulators:exec --config firebase.backend.json --project demo-peladinhas-variety --only firestore "node --test --test-concurrency=1 tests/path-variety.backend.test.js"
```

Os testes novos de lógica e backend também fazem parte dos scripts gerais correspondentes. Falta calibrar as metas com jogos reais anonimizados e reconstrução fiável da janela de votos; não se afirmam probabilidades de sucesso. Não houve teste em aparelho físico nem confirmação de configuração ou execução cloud.

## Publicação seletiva

Consumidores: `functions/paths.js` importa o modelo e a janela partilhados e exporta `getPath`, `pathAction`, `onPathGame`, `onPathSummary` e `settlePaths`. `functions/game-flow.js` importa os mesmos módulos para congelar tentativas e manter o histórico, e fornece `gameAction`/`feedbackAction`; `correctRating` também consome o módulo de fluxo para as revisões de votos. O conjunto seletivo inclui estes oito exports, sem publicar outras áreas.

Publicar o frontend compatível com v3/v4 e depois as Functions. Recarregar a aplicação após a atualização. Estes comandos são instruções, não registo de execução:

```powershell
npm.cmd run deploy:frontend
npx.cmd firebase deploy --only "functions:peladinhas:getPath,functions:peladinhas:pathAction,functions:peladinhas:onPathGame,functions:peladinhas:onPathSummary,functions:peladinhas:settlePaths,functions:peladinhas:gameAction,functions:peladinhas:feedbackAction,functions:peladinhas:correctRating"
```

Não é necessário publicar regras, índices ou Storage para esta alteração. Se a atualização anterior também estiver por publicar, seguir adicionalmente os requisitos do relatório anterior; este conjunto cobre apenas a variedade v4. Confirmar depois uma tentativa nova e uma proposta antiga preservada, sem recalcular semanas fechadas.

## Atualização documental e interface final

A interface foi refinada depois da primeira validação v4: resumo condicional com destino direto do nó, setas, recompensas integradas e bloco preparado compacto. A composição final, os estados e os testes de browser constam do [relatório de interface](path-interface-2026-10-19.md). As nove verificações de lógica e os três cenários backend acima continuam a ser o registo daquela execução, não uma nova execução de suites nesta revisão documental.

Os 19 erros de ligações acima eram o resultado naquela data da implementação. A revisão documental posterior corrige as referências ausentes e documenta o catálogo a partir do código; o resultado atual do verificador está no relatório de interface. Os antigos planos não foram recriados. O âmbito backend v4 mantém os oito consumidores indicados; os refinamentos visuais posteriores exigem apenas frontend.
