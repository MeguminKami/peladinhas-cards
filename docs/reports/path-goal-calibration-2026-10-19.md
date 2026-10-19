# Calibração de todos os objetivos com golos — 19/10/2026

## Dados e avaliação antes da implementação

Consulta de leitura ao Firebase em 19/10/2026: dois jogos 5x5 encerrados, quatro resultados de equipa e 20 participações. Resultados de equipa: 5, 7, 8 e 9 golos; média 7,25. Golos individuais: média 1,45; pelo menos um em 85%, dois em 35%, três em 15%, quatro em 10% e cinco em 0%. Assistências: média 0,7; uma em 50% e duas em 20%. Contribuições (golos + assistências): duas em 60%, três em 35%, quatro em 15% e cinco em 5%.

Uma combinação de um golo e uma assistência foi atingida em 35% das participações; dois golos e uma assistência em 10%. Antes desta revisão, os alvos desta combinação eram iguais nas três dificuldades. Limites de um, dois ou três golos sofridos não foram atingidos por nenhuma equipa. É necessário ajustar ambos os extremos, não apenas tornar tudo mais difícil.

A análise das combinações usa os votos reconstruídos às 48 horas. Só um jogo (dez participações) já ultrapassou a janela nesta consulta; o segundo não conta como falha. A simulação não encontrou participações GR elegíveis no jogo maduro, pelo que não permite estimar sucesso de GR. Os números globais de resumos atuais não substituem esta verificação. A amostra é pequena e os jogadores da mesma equipa partilham resultados; as frequências não são probabilidades estáveis.

## Decisão implementada

Cada célula indica acessível / exigente / difícil. Nos percursos individuais correspondem a Bronze / Prata / Ouro; fusões conservam as suas raridades. Os avanços raros conservam a dificuldade superior.

| Condição | Fundamentos, até +4 | Evolução, +5 a +9 | Final, desde +10 |
| --- | --- | --- | --- |
| Golos individuais isolados | 1 / 2 / 3 | 1 / 2 / 3 | 2 / 3 / 4 |
| Golos em combinações | 1 / 1 / 2 | 1 / 1 / 2 | 1 / 2 / 2 |
| Assistências isoladas | 1 / 1 / 2 | 1 / 1 / 2 | 1 / 2 / 2 |
| Golos + assistências | 2 / 3 / 4 | 2 / 3 / 4 | 3 / 4 / 5 |
| Golos de equipa | 5 / 7 / 8 | 6 / 7 / 9 | 7 / 8 / 9 |
| Máximo de golos sofridos | 8 / 7 / 5 | 8 / 6 / 5 | 7 / 6 / 5 |

As condições são aplicadas em conjunto. Contribuições respeitam mínimos específicos já existentes no modelo; assistências em combinações mantêm um. A normalização continua a remover condições redundantes. Avaliações, sete votos, corte das 48 horas, avanços e recompensas não mudaram. Os limites de sofridos também se aplicam aos modelos de GR, mas a sua frequência terá de ser revista com uma amostra posicional elegível.

Exemplos na fase inicial, comparando a configuração anterior desta sessão (que já tinha 5/7/8 golos de equipa) com a atual:

| Missão difícil | Antes | Depois | Denominador |
| --- | --- | --- | --- |
| Marcar e servir | 35% | 10% | 20 participações |
| Parte do ataque | 50% | 15% | 20 participações |
| Bloco sólido | 0% | 20% | 10 participações, janela completa |
| Ler e contribuir | 10% | 10% | 10 participações, janela completa |

Nem toda alteração de alvo muda imediatamente a frequência na pequena amostra. A missão acessível de Bloco sólido foi atingida por todas as dez participações maduras após o ajuste; é uma observação a acompanhar, não uma dificuldade definitivamente validada. Não se ajustaram critérios de estrelas nesta revisão.

## Preservação e futuras revisões

Parâmetros centralizados em [path-difficulty.js](../../js/path-difficulty.js), revisão `2026-10-19-goals`, gravada nas novas propostas. Objetivos são materializados antes do sorteio e ficam guardados: propostas reveladas e tentativas escolhidas não são recalculadas. Não há migração, adaptação automática, recálculo de semanas fechadas ou alterações a recompensas. Objetivos de missões/eventos configurados manualmente não são reescritos.

O [procedimento reutilizável](../guides/path-calibration.md) permite atualizar os dados, comparar todas as 477 combinações de modelo/fase/dificuldade que envolvem ações numéricas e discutir novos parâmetros antes de os editar. O [snapshot agregado](path-goals-2026-10-19.json) regista condições, contagens e comparação anterior/atual sem identidades.

## Validação e publicação

Passaram 32 testes dirigidos de catálogo, percursos e janelas, incluindo a auditoria (denominadores, equipas, valores ausentes, janela pendente e ausência de identidades), e os 149 testes da suite geral. Passaram três testes de integração de variedade no emulador Firestore, incluindo propostas persistidas, tentativa congelada, resultado numérico e avaliações históricas. Documentação validada: 32 documentos, 289 referências locais; build frontend `9ff7718065027a83`, 125 recursos. Sem alteração de layout. Publicação não executada.

Publicar `getPath`, `pathAction`, `onPathGame`, `onPathSummary`, `settlePaths`, `gameAction` e `feedbackAction`, e depois o frontend. Os dois últimos recebem a sincronização dos percursos e importam o modelo partilhado. As regras e índices não mudam.
