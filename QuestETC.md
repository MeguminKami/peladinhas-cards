# QuestETC — Escolhe o Teu Caminho

Atualizado em **21/10/2026**. Ponto de entrada para rever a variedade e a dificuldade das missões ETC. Configuração local: `2026-10-21-position-fusions`. Última amostra estatística disponível: **19/10/2026**, não uma recolha atual. Publicação cloud desta configuração não verificada.

## Como usar este documento numa próxima revisão

Ao receber o pedido, executar o procedimento deste documento: verificar código e dados, analisar, explicar as decisões, implementar os ajustes justificados, testar e atualizar este documento e os relatórios. Não é preciso pedir outra prompt nem confirmação para alterações locais dentro deste âmbito. Isso não autoriza deploy, alterações manuais a dados reais, migrações ou recálculos globais.

O código é a fonte do comportamento; este ficheiro regista a configuração e a justificação. Se divergirem, mostrar a diferença antes de decidir. Não transformar uma regra sugerida aqui em comportamento já implementado.

Fontes: [motor](js/path-model.js), [modelos e transformação dos alvos](js/path-missions.js), [parâmetros](js/path-difficulty.js), [catálogo com objetivos escritos](docs/reference/path-mission-catalogue.md), [regras funcionais](docs/reference/player-paths.md), [procedimento técnico](docs/guides/path-calibration.md).

## Regras que a revisão deve preservar

- Cada tentativa aplica-se apenas ao **próximo jogo** elegível. Não importar totais históricos ou sequências de vários jogos do editor de missões/eventos para o ETC.
- Todas as condições da missão têm de ser cumpridas no mesmo jogo. Uma média entre critérios permite compensação apenas dentro dessa média; não elimina mínimos individuais adicionais.
- Avaliações exigem sete votos válidos por critério, com corte às 48 horas. Falta de amostra não é falha; distinguir espera, cancelamento e janela ainda aberta. «Não foi à baliza» na autoavaliação exclui a avaliação GR independentemente dos outros votos.
- Guarda-redes e Dono da Área exigem posição GR. Uma posição incompatível cancela sem perder progresso. Não inventar métricas de defesas, dribles, distância ou minutos que não são registadas.
- Conservar IDs estáveis, progresso, tentativas associadas a jogos, recompensas e semanas fechadas. Por defeito, alterações de dificuldade afetam apenas novas propostas. Não agravar propostas já reveladas. A correção dirigida de 20/10 a ofertas sem jogo associado é uma exceção histórica documentada, não uma autorização permanente para migrar ofertas.
- A dificuldade é revista manualmente; não se adapta automaticamente por jogador ou a cada partida. Missões e eventos criados pelo admin mantêm os seus próprios objetivos.

## Fusões atuais e forma de operação

Substituição de 21/10/2026, antes de existirem conquistas segundo o responsável: retiradas Atacante completo, Fortaleza e Motor criativo. São agora **12 especializações + 5 fusões, 255 modelos e 17 cartas permanentes**. Não se apagaram dados cloud nem se fez migração de progresso.

| Fusão / posição temática | Atributos e pesos padrão de OVR | Qualidades avaliadas no jogo | Carta final |
| --- | --- | --- | --- |
| Dono da Área · GR | Guarda-redes 35% + Posicionamento 12% | Guarda-redes + Defesa, posição GR obrigatória | `path-fusion-keeper` |
| Central Dominante · DEF | Defesa 25% + Físico 15% | Defesa + Físico | `path-fusion-central` |
| Desequilibrador · ALA | Velocidade 18% + Drible 18% | Físico + Ataque | `path-fusion-winger` |
| Maestro · MED | Passe 22% + Visão de jogo 15% | Passe + Atitude | `path-fusion-maestro` |
| Predador Completo · AV | Finalização 25% + Drible 15% | Ataque + Físico | `path-fusion-predator` |

Os pares são fixos e seguem os dois maiores pesos padrão; alterações no admin não os mudam automaticamente. As qualidades são indicadores aproximados, não medições novas de dribles, posicionamento ou visão. Todas as 15 missões de cada fusão mantêm os dois critérios como mínimos individuais, mesmo quando há uma média adicional.

Desbloqueio: concluir o marco 5 em cada origem, em qualquer ramo equivalente, e «Unificar e ativar». A combinação tem cinco nós; cada nó completo entrega até +1 em cada atributo, respeitando os tetos partilhados ETC. O quinto entrega a carta permanente. Há três focos (duas origens e combinação); não é obrigatório concluir a fusão para continuar a especialização. Drible pertence a duas fusões: ambas continuam acessíveis, sem saldo separado de atributo ou reroll. As missões são do próximo jogo, com sete votos por critério e corte às 48 horas. A posição temática é exigida apenas em «Cumprir o papel», exceto GR, sempre obrigatório em Dono da Área.

## Estatísticas usadas na calibração atual

Fonte: [snapshot agregado de 19/10](docs/reports/path-goals-2026-10-19.json), recolhido às 15:14:23 UTC, e [análise e decisão](docs/reports/path-goal-calibration-2026-10-19.md). **2 jogos 5x5, 4 observações de equipa, 20 participações**. Participações não são jogadores distintos nem observações independentes. Não foram lidos documentos cloud para criar este ficheiro.

| Indicador por jogo | Média | Frequências observadas |
| --- | ---: | --- |
| Golos individuais | 1,45 | ≥1: 85%; ≥2: 35%; ≥3: 15%; ≥4: 10%; ≥5: 0% |
| Assistências individuais | 0,70 | ≥1: 50%; ≥2: 20% |
| Golos + assistências individuais | — | ≥2: 60%; ≥3: 35%; ≥4: 15%; ≥5: 5% |
| Golos da própria equipa | 7,25 | Resultados: 5, 7, 8 e 9; ≥4: 100%; ≥7: 75%; ≥8: 50%; ≥9: 25% |
| Golos sofridos pela equipa | 7,25 | Mesmos quatro resultados na perspetiva adversária; ≤3: 0%; ≤5: 25%; ≤7: 50%; ≤8: 75% |
| ≥1 golo **e** ≥1 assistência | — | 35% das 20 participações |
| ≥2 golos **e** ≥1 assistência | — | 10% das 20 participações |

Só um jogo, com dez participações, tinha a janela de avaliação de 48 horas completa. Não havia casos GR elegíveis nesse jogo. **Não há estimativa fiável de dificuldade GR nem calibração estatística abrangente das estrelas** nesta amostra. Os limiares de estrelas são escolhas de desenho atuais, a rever com dados elegíveis. Os resumos atuais de avaliações não substituem votos reconstruídos no corte histórico.

O snapshot também conserva os seguintes **resumos de avaliações existentes em 19/10**. São referência descritiva antiga, não sucesso de missões no corte de 48 horas. As percentagens usam os casos com sete votos desse resumo; a média usa os 20 registos disponíveis. Em particular, os números GR são anteriores à verificação atual de elegibilidade e não devem servir para calibrar GR sem reconstrução e autoavaliação válidas.

| Critério | Média antiga | Casos com sete votos | ≥3,5★ | ≥4★ | ≥4,5★ |
| --- | ---: | ---: | ---: | ---: | ---: |
| Ataque | 3,43 | 20/20 | 35% | 25% | 5% |
| Passe | 3,42 | 20/20 | 45% | 10% | 0% |
| Defesa | 3,30 | 20/20 | 35% | 5% | 0% |
| Físico | 3,45 | 20/20 | 60% | 5% | 0% |
| Atitude | 4,28 | 20/20 | 100% | 95% | 20% |
| Guarda-redes, não validado para calibração | 2,91 | 13/20 | 38,5% | 7,7% | 0% |

Desempenho geral e médias entre critérios não têm distribuição própria guardada neste snapshot. Recalcular localmente a partir de dados elegíveis numa próxima revisão, sem substituir por uma média de percentagens.

Conclusões anteriores: quatro golos de equipa eram triviais nesta amostra; limites de um a três sofridos eram inalcançados. Avaliar combinações completas: não multiplicar frequências isoladas de condições correlacionadas.

## Fases, dificuldade e raridade

A fase usa o maior valor dos pontos já ganhos nas chaves de recompensa do nó: **F0 = 0–4**, **F1 = 5–9**, **F2 = 10 ou mais**. Não é o número de jogos nem a percentagem do nó.

| Nível de dificuldade | Percurso individual | Fusão | Avanço no percurso |
| --- | --- | --- | ---: |
| D0, acessível | Bronze | Ouro | 25% |
| D1, intermédio | Prata | Ouro especial | 50% |
| D2, superior | Ouro | Elite | 100% |
| D2 com degrau raro | Ícone | Ícone | 150% |
| Ícone com um requisito adicional mais exigente | Ultimate | Ultimate | 200% |

Apenas a terceira proposta pode passar a Ícone (4%) ou Ultimate (1%); normalmente mantém 100% (95%). São probabilidades desse sorteio, não taxas de sucesso da missão nem probabilidades de aparecer um modelo específico. O seletor evita redundâncias e considera famílias recentes.

**Ícone mantém o degrau atual sobre D2:** +0,25 estrela num único requisito `rating`/`ratingMean` elegível, prioritário; sem esse requisito, +1 num requisito ofensivo (`goals`, `assists`, `contributions`, `teamGoals`).

**Ultimate parte da Ícone e acrescenta uma exigência estrita**, conforme o caminho e as condições realmente presentes. Conserva os requisitos da Ícone, não os substitui por uma alternativa mais fácil. Só reforça uma condição adicional ou acrescenta uma ação complementar; não agrava todos os requisitos de uma vez.

| Caminho | Prioridade do reforço Ultimate quando a condição existe |
| --- | --- |
| Velocidade, Drible, Resistência, Desequilibrador | +1 contribuição; caso contrário, reforço de qualidade do caminho |
| Finalização | Com pelo menos 4 golos exigidos, acrescentar 1 assistência ou aumentar a assistência existente; abaixo disso, +1 golo |
| Predador Completo | Se exige golos, acrescentar 1 assistência ou aumentar a assistência existente; caso contrário, aumentar contribuições se presentes |
| Visão e Maestro | Se já exige pelo menos 2 assistências e não exige golos, acrescentar 1 golo; caso contrário, reforçar Passe |
| Compostura | +1 golo quando existe esse requisito; caso contrário, reforçar Atitude |
| Dono da Área | Reduzir o máximo de sofridos em 1 quando ainda está acima de 5; caso contrário, reforçar Guarda-redes |
| Passe, Defesa, Físico, Guarda-redes, Posicionamento, Jogo de equipa, Central Dominante | +0,25 estrela no critério principal elegível |

Fallback: se a prioridade não se aplicar, reforçar o critério principal, outra avaliação/média elegível ou um alvo ofensivo existente, por esta ordem. Estrelas nunca ultrapassam 5; mais de 4,75 passa a pelo menos 5. No teto de todas as avaliações, acrescentar contribuições com alvo suficiente para não ser redundante (pelo menos 3, ou acima da soma de golos/assistências já exigida). Posições e resultados não são alterados. O limite de sofridos não desce abaixo de 5 por esta regra. Ver `pathRareObjective(objective, advance, routeId)` e os exemplos reais gerados abaixo.

Estas regras implementam a progressão discutida, adaptada aos modelos e fases existentes: os exemplos da conversa não substituem todos os alvos atuais por números fixos. A referência exata passa a ser o inventário e os exemplos extraídos do código. São decisões de desenho baseadas na amostra antiga, não uma nova medição de sucesso. Ofertas reveladas de 200% mantêm a dificuldade antiga; apenas novas propostas/rerolls recebem o reforço.

## Alvos numéricos atuais

Cada célula é **D0 / D1 / D2**, com as raridades correspondentes na tabela anterior. São alvos por jogo. O alvo final de um modelo pode conservar um mínimo próprio mais alto; os intervalos gerados abaixo incluem esses casos e a transformação rara.

| Condição | F0 | F1 | F2 |
| --- | --- | --- | --- |
| Golos isolados | 1 / 2 / 3 | 1 / 2 / 3 | 2 / 3 / 4 |
| Golos em combinações | 1 / 1 / 2 | 1 / 1 / 2 | 1 / 2 / 2 |
| Assistências isoladas | 1 / 1 / 2 | 1 / 1 / 2 | 1 / 2 / 2 |
| Golos + assistências | 2 / 3 / 4 | 2 / 3 / 4 | 3 / 4 / 5 |
| Golos de equipa | 5 / 7 / 8 | 6 / 7 / 9 | 7 / 8 / 9 |
| Máximo de golos sofridos | 8 / 7 / 5 | 8 / 6 / 5 | 7 / 6 / 5 |

Assistências em combinações conservam o valor do modelo. Golos combinados e contribuições usam o máximo entre o mínimo do modelo e a matriz. As condições redundantes são normalizadas. Não interpretar um limite de sofridos como mínimo a atingir.

### Estrelas

Missão com um único requisito de avaliação antes da transformação (distinção feita pelo código):

| Critério | F0: D0 / D1 / D2 | F1 | F2 |
| --- | --- | --- | --- |
| Atitude | 3,5 / 4 / 4,25 | 3,75 / 4,25 / 4,5 | 4 / 4,5 / 4,75 |
| Restantes critérios | 3 / 3,5 / 4 | 3,25 / 3,75 / 4,25 | 3,75 / 4 / 4,5 |

Nos modelos combinados, transformar cada alvo original `t` por `t + (D−1)×0,25 + F×0,25`, limitado a **3,5–4,5 para Atitude** e **2,5–4 para os restantes critérios e médias**. O requisito original pode ser diferente entre modelos; não usar uma única estrela mínima por raridade para todos. Conservar `>` versus `≥`. A secção gerada mostra envelopes reais; o objetivo exato de cada variante vem de `pathMissionTemplates(route, F, D)` e, nas raras, `pathRareObjective`.

## Inventário e intervalos extraídos do código

Esta secção é gerada localmente por `node scripts/update-quest-etc.mjs`. Não consultar Firestore para a regenerar. Não editar à mão entre os marcadores. Os intervalos são mínimos/máximos de **alvos** encontrados, não uma distribuição estatística nem permissão para sortear qualquer número intermédio. Cada modelo conserva todas as suas condições.

<!-- QUEST_ETC_START -->

Revisão extraída: `2026-10-21-position-fusions`. **255 modelos**, 17 percursos/fusões.

### Intervalos por fase e raridade

Envelopes conjuntos dos percursos individuais ou fusões, conforme indicado. A inexistência de uma condição num modelo não é um alvo zero. Os comparadores são preservados; `gte` significa ≥ e `gt` significa >. A normalização pode tornar o limiar de uma combinação mais forte.

| Grupo | Fase | Raridade | Condição / critério / comparação | Alvos encontrados |
| --- | --- | --- | --- | --- |
| Individual | F0 | Bronze | assists / gte | 1 |
| Individual | F0 | Bronze | conceded / ≤ | 8 |
| Individual | F0 | Bronze | contributions / gte | 2–3 |
| Individual | F0 | Bronze | games / gte | 1 |
| Individual | F0 | Bronze | goals / gte | 1 |
| Individual | F0 | Bronze | nonLoss / gte | 1 |
| Individual | F0 | Bronze | position / = | ALA, AV, DEF, GR, MED |
| Individual | F0 | Bronze | rating / attack / gt | 3–3,25 |
| Individual | F0 | Bronze | rating / attack / gte | 2,75–3 |
| Individual | F0 | Bronze | rating / attitude / gt | 3,5 |
| Individual | F0 | Bronze | rating / attitude / gte | 3,5–3,75 |
| Individual | F0 | Bronze | rating / defense / gt | 3 |
| Individual | F0 | Bronze | rating / defense / gte | 2,75–3 |
| Individual | F0 | Bronze | rating / goalkeeping / gt | 3 |
| Individual | F0 | Bronze | rating / goalkeeping / gte | 2,75–3 |
| Individual | F0 | Bronze | rating / overall / gte | 3,25 |
| Individual | F0 | Bronze | rating / passing / gt | 3 |
| Individual | F0 | Bronze | rating / passing / gte | 2,75–3 |
| Individual | F0 | Bronze | rating / physical / gt | 3 |
| Individual | F0 | Bronze | rating / physical / gte | 2,75–3 |
| Individual | F0 | Bronze | ratingMean / attack+passing / gte | 3,25 |
| Individual | F0 | Bronze | ratingMean / attitude+passing / gte | 3,25 |
| Individual | F0 | Bronze | ratingMean / defense+passing / gte | 3,25 |
| Individual | F0 | Bronze | ratingMean / goalkeeping+passing / gte | 3,25 |
| Individual | F0 | Bronze | ratingMean / passing+physical / gte | 3,25 |
| Individual | F0 | Bronze | teamGoals / gte | 5 |
| Individual | F0 | Bronze | win / gte | 1 |
| Individual | F0 | Prata | assists / gte | 1 |
| Individual | F0 | Prata | conceded / ≤ | 7 |
| Individual | F0 | Prata | contributions / gte | 3 |
| Individual | F0 | Prata | games / gte | 1 |
| Individual | F0 | Prata | goals / gte | 1–2 |
| Individual | F0 | Prata | nonLoss / gte | 1 |
| Individual | F0 | Prata | position / = | ALA, AV, DEF, GR, MED |
| Individual | F0 | Prata | rating / attack / gt | 3,5 |
| Individual | F0 | Prata | rating / attack / gte | 3–3,5 |
| Individual | F0 | Prata | rating / attitude / gt | 4 |
| Individual | F0 | Prata | rating / attitude / gte | 3,5–4 |
| Individual | F0 | Prata | rating / defense / gt | 3,5 |
| Individual | F0 | Prata | rating / defense / gte | 3–3,5 |
| Individual | F0 | Prata | rating / goalkeeping / gt | 3,5 |
| Individual | F0 | Prata | rating / goalkeeping / gte | 3–3,5 |
| Individual | F0 | Prata | rating / overall / gte | 3,5 |
| Individual | F0 | Prata | rating / passing / gt | 3,5 |
| Individual | F0 | Prata | rating / passing / gte | 3–3,5 |
| Individual | F0 | Prata | rating / physical / gt | 3,5 |
| Individual | F0 | Prata | rating / physical / gte | 3–3,5 |
| Individual | F0 | Prata | ratingMean / attack+passing / gte | 3,5 |
| Individual | F0 | Prata | ratingMean / attitude+passing / gte | 3,5 |
| Individual | F0 | Prata | ratingMean / defense+passing / gte | 3,5 |
| Individual | F0 | Prata | ratingMean / goalkeeping+passing / gte | 3,5 |
| Individual | F0 | Prata | ratingMean / passing+physical / gte | 3,5 |
| Individual | F0 | Prata | teamGoals / gte | 7 |
| Individual | F0 | Prata | win / gte | 1 |
| Individual | F0 | Ouro | assists / gte | 1–2 |
| Individual | F0 | Ouro | conceded / ≤ | 5 |
| Individual | F0 | Ouro | contributions / gte | 4 |
| Individual | F0 | Ouro | games / gte | 1 |
| Individual | F0 | Ouro | goals / gte | 2–3 |
| Individual | F0 | Ouro | nonLoss / gte | 1 |
| Individual | F0 | Ouro | position / = | ALA, AV, DEF, GR, MED |
| Individual | F0 | Ouro | rating / attack / gt | 3,75–4 |
| Individual | F0 | Ouro | rating / attack / gte | 3,25–4 |
| Individual | F0 | Ouro | rating / attitude / gt | 4,25 |
| Individual | F0 | Ouro | rating / attitude / gte | 3,5–4,25 |
| Individual | F0 | Ouro | rating / defense / gt | 4 |
| Individual | F0 | Ouro | rating / defense / gte | 3,25–4 |
| Individual | F0 | Ouro | rating / goalkeeping / gt | 4 |
| Individual | F0 | Ouro | rating / goalkeeping / gte | 3,25–4 |
| Individual | F0 | Ouro | rating / overall / gte | 3,75 |
| Individual | F0 | Ouro | rating / passing / gt | 4 |
| Individual | F0 | Ouro | rating / passing / gte | 3,25–4 |
| Individual | F0 | Ouro | rating / physical / gt | 4 |
| Individual | F0 | Ouro | rating / physical / gte | 3,25–4 |
| Individual | F0 | Ouro | ratingMean / attack+passing / gte | 3,75 |
| Individual | F0 | Ouro | ratingMean / attitude+passing / gte | 3,75 |
| Individual | F0 | Ouro | ratingMean / defense+passing / gte | 3,75 |
| Individual | F0 | Ouro | ratingMean / goalkeeping+passing / gte | 3,75 |
| Individual | F0 | Ouro | ratingMean / passing+physical / gte | 3,75 |
| Individual | F0 | Ouro | teamGoals / gte | 8 |
| Individual | F0 | Ouro | win / gte | 1 |
| Individual | F0 | Ícone | assists / gte | 1–3 |
| Individual | F0 | Ícone | conceded / ≤ | 5 |
| Individual | F0 | Ícone | contributions / gte | 4–5 |
| Individual | F0 | Ícone | games / gte | 1 |
| Individual | F0 | Ícone | goals / gte | 2–4 |
| Individual | F0 | Ícone | nonLoss / gte | 1 |
| Individual | F0 | Ícone | position / = | ALA, AV, DEF, GR, MED |
| Individual | F0 | Ícone | rating / attack / gt | 4–4,25 |
| Individual | F0 | Ícone | rating / attack / gte | 3,5–4,25 |
| Individual | F0 | Ícone | rating / attitude / gt | 4,5 |
| Individual | F0 | Ícone | rating / attitude / gte | 3,75–4,5 |
| Individual | F0 | Ícone | rating / defense / gt | 4,25 |
| Individual | F0 | Ícone | rating / defense / gte | 3,25–4,25 |
| Individual | F0 | Ícone | rating / goalkeeping / gt | 4,25 |
| Individual | F0 | Ícone | rating / goalkeeping / gte | 3,5–4,25 |
| Individual | F0 | Ícone | rating / overall / gte | 3,75–4 |
| Individual | F0 | Ícone | rating / passing / gt | 4,25 |
| Individual | F0 | Ícone | rating / passing / gte | 3,25–4,25 |
| Individual | F0 | Ícone | rating / physical / gt | 4,25 |
| Individual | F0 | Ícone | rating / physical / gte | 3,25–4,25 |
| Individual | F0 | Ícone | ratingMean / attack+passing / gte | 3,75 |
| Individual | F0 | Ícone | ratingMean / attitude+passing / gte | 3,75 |
| Individual | F0 | Ícone | ratingMean / defense+passing / gte | 3,75 |
| Individual | F0 | Ícone | ratingMean / goalkeeping+passing / gte | 3,75 |
| Individual | F0 | Ícone | ratingMean / passing+physical / gte | 3,75 |
| Individual | F0 | Ícone | teamGoals / gte | 8 |
| Individual | F0 | Ícone | win / gte | 1 |
| Individual | F0 | Ultimate | assists / gte | 1–4 |
| Individual | F0 | Ultimate | conceded / ≤ | 5 |
| Individual | F0 | Ultimate | contributions / gte | 4–5 |
| Individual | F0 | Ultimate | games / gte | 1 |
| Individual | F0 | Ultimate | goals / gte | 1–5 |
| Individual | F0 | Ultimate | nonLoss / gte | 1 |
| Individual | F0 | Ultimate | position / = | ALA, AV, DEF, GR, MED |
| Individual | F0 | Ultimate | rating / attack / gt | 4–4,5 |
| Individual | F0 | Ultimate | rating / attack / gte | 3,5–4,5 |
| Individual | F0 | Ultimate | rating / attitude / gt | 4,75 |
| Individual | F0 | Ultimate | rating / attitude / gte | 4–4,75 |
| Individual | F0 | Ultimate | rating / defense / gt | 4,5 |
| Individual | F0 | Ultimate | rating / defense / gte | 3,25–4,5 |
| Individual | F0 | Ultimate | rating / goalkeeping / gt | 4,5 |
| Individual | F0 | Ultimate | rating / goalkeeping / gte | 3,75–4,5 |
| Individual | F0 | Ultimate | rating / overall / gte | 3,75–4 |
| Individual | F0 | Ultimate | rating / passing / gt | 4,5 |
| Individual | F0 | Ultimate | rating / passing / gte | 3,25–4,5 |
| Individual | F0 | Ultimate | rating / physical / gt | 4,5 |
| Individual | F0 | Ultimate | rating / physical / gte | 3,5–4,5 |
| Individual | F0 | Ultimate | ratingMean / attack+passing / gte | 3,75 |
| Individual | F0 | Ultimate | ratingMean / attitude+passing / gte | 3,75 |
| Individual | F0 | Ultimate | ratingMean / defense+passing / gte | 3,75 |
| Individual | F0 | Ultimate | ratingMean / goalkeeping+passing / gte | 3,75 |
| Individual | F0 | Ultimate | ratingMean / passing+physical / gte | 3,75 |
| Individual | F0 | Ultimate | teamGoals / gte | 8 |
| Individual | F0 | Ultimate | win / gte | 1 |
| Individual | F1 | Bronze | assists / gte | 1 |
| Individual | F1 | Bronze | conceded / ≤ | 8 |
| Individual | F1 | Bronze | contributions / gte | 2–3 |
| Individual | F1 | Bronze | games / gte | 1 |
| Individual | F1 | Bronze | goals / gte | 1 |
| Individual | F1 | Bronze | nonLoss / gte | 1 |
| Individual | F1 | Bronze | position / = | ALA, AV, DEF, GR, MED |
| Individual | F1 | Bronze | rating / attack / gt | 3,25–3,5 |
| Individual | F1 | Bronze | rating / attack / gte | 3–3,25 |
| Individual | F1 | Bronze | rating / attitude / gt | 3,75 |
| Individual | F1 | Bronze | rating / attitude / gte | 3,5–4 |
| Individual | F1 | Bronze | rating / defense / gt | 3,25 |
| Individual | F1 | Bronze | rating / defense / gte | 3–3,25 |
| Individual | F1 | Bronze | rating / goalkeeping / gt | 3,25 |
| Individual | F1 | Bronze | rating / goalkeeping / gte | 3–3,25 |
| Individual | F1 | Bronze | rating / overall / gte | 3,5 |
| Individual | F1 | Bronze | rating / passing / gt | 3,25 |
| Individual | F1 | Bronze | rating / passing / gte | 3–3,25 |
| Individual | F1 | Bronze | rating / physical / gt | 3,25 |
| Individual | F1 | Bronze | rating / physical / gte | 3–3,25 |
| Individual | F1 | Bronze | ratingMean / attack+passing / gte | 3,5 |
| Individual | F1 | Bronze | ratingMean / attitude+passing / gte | 3,5 |
| Individual | F1 | Bronze | ratingMean / defense+passing / gte | 3,5 |
| Individual | F1 | Bronze | ratingMean / goalkeeping+passing / gte | 3,5 |
| Individual | F1 | Bronze | ratingMean / passing+physical / gte | 3,5 |
| Individual | F1 | Bronze | teamGoals / gte | 6 |
| Individual | F1 | Bronze | win / gte | 1 |
| Individual | F1 | Prata | assists / gte | 1 |
| Individual | F1 | Prata | conceded / ≤ | 6 |
| Individual | F1 | Prata | contributions / gte | 3 |
| Individual | F1 | Prata | games / gte | 1 |
| Individual | F1 | Prata | goals / gte | 1–2 |
| Individual | F1 | Prata | nonLoss / gte | 1 |
| Individual | F1 | Prata | position / = | ALA, AV, DEF, GR, MED |
| Individual | F1 | Prata | rating / attack / gt | 3,75 |
| Individual | F1 | Prata | rating / attack / gte | 3,25–3,75 |
| Individual | F1 | Prata | rating / attitude / gt | 4,25 |
| Individual | F1 | Prata | rating / attitude / gte | 3,5–4,25 |
| Individual | F1 | Prata | rating / defense / gt | 3,75 |
| Individual | F1 | Prata | rating / defense / gte | 3,25–3,75 |
| Individual | F1 | Prata | rating / goalkeeping / gt | 3,75 |
| Individual | F1 | Prata | rating / goalkeeping / gte | 3,25–3,75 |
| Individual | F1 | Prata | rating / overall / gte | 3,75 |
| Individual | F1 | Prata | rating / passing / gt | 3,75 |
| Individual | F1 | Prata | rating / passing / gte | 3,25–3,75 |
| Individual | F1 | Prata | rating / physical / gt | 3,75 |
| Individual | F1 | Prata | rating / physical / gte | 3,25–3,75 |
| Individual | F1 | Prata | ratingMean / attack+passing / gte | 3,75 |
| Individual | F1 | Prata | ratingMean / attitude+passing / gte | 3,75 |
| Individual | F1 | Prata | ratingMean / defense+passing / gte | 3,75 |
| Individual | F1 | Prata | ratingMean / goalkeeping+passing / gte | 3,75 |
| Individual | F1 | Prata | ratingMean / passing+physical / gte | 3,75 |
| Individual | F1 | Prata | teamGoals / gte | 7 |
| Individual | F1 | Prata | win / gte | 1 |
| Individual | F1 | Ouro | assists / gte | 1–2 |
| Individual | F1 | Ouro | conceded / ≤ | 5 |
| Individual | F1 | Ouro | contributions / gte | 4 |
| Individual | F1 | Ouro | games / gte | 1 |
| Individual | F1 | Ouro | goals / gte | 2–3 |
| Individual | F1 | Ouro | nonLoss / gte | 1 |
| Individual | F1 | Ouro | position / = | ALA, AV, DEF, GR, MED |
| Individual | F1 | Ouro | rating / attack / gt | 4–4,25 |
| Individual | F1 | Ouro | rating / attack / gte | 3,5–4,25 |
| Individual | F1 | Ouro | rating / attitude / gt | 4,5 |
| Individual | F1 | Ouro | rating / attitude / gte | 3,75–4,5 |
| Individual | F1 | Ouro | rating / defense / gt | 4,25 |
| Individual | F1 | Ouro | rating / defense / gte | 3,5–4,25 |
| Individual | F1 | Ouro | rating / goalkeeping / gt | 4,25 |
| Individual | F1 | Ouro | rating / goalkeeping / gte | 3,5–4,25 |
| Individual | F1 | Ouro | rating / overall / gte | 4 |
| Individual | F1 | Ouro | rating / passing / gt | 4,25 |
| Individual | F1 | Ouro | rating / passing / gte | 3,5–4,25 |
| Individual | F1 | Ouro | rating / physical / gt | 4,25 |
| Individual | F1 | Ouro | rating / physical / gte | 3,5–4,25 |
| Individual | F1 | Ouro | ratingMean / attack+passing / gte | 4 |
| Individual | F1 | Ouro | ratingMean / attitude+passing / gte | 4 |
| Individual | F1 | Ouro | ratingMean / defense+passing / gte | 4 |
| Individual | F1 | Ouro | ratingMean / goalkeeping+passing / gte | 4 |
| Individual | F1 | Ouro | ratingMean / passing+physical / gte | 4 |
| Individual | F1 | Ouro | teamGoals / gte | 9 |
| Individual | F1 | Ouro | win / gte | 1 |
| Individual | F1 | Ícone | assists / gte | 1–3 |
| Individual | F1 | Ícone | conceded / ≤ | 5 |
| Individual | F1 | Ícone | contributions / gte | 4–5 |
| Individual | F1 | Ícone | games / gte | 1 |
| Individual | F1 | Ícone | goals / gte | 2–4 |
| Individual | F1 | Ícone | nonLoss / gte | 1 |
| Individual | F1 | Ícone | position / = | ALA, AV, DEF, GR, MED |
| Individual | F1 | Ícone | rating / attack / gt | 4,25–4,5 |
| Individual | F1 | Ícone | rating / attack / gte | 3,75–4,5 |
| Individual | F1 | Ícone | rating / attitude / gt | 4,75 |
| Individual | F1 | Ícone | rating / attitude / gte | 4–4,75 |
| Individual | F1 | Ícone | rating / defense / gt | 4,5 |
| Individual | F1 | Ícone | rating / defense / gte | 3,5–4,5 |
| Individual | F1 | Ícone | rating / goalkeeping / gt | 4,5 |
| Individual | F1 | Ícone | rating / goalkeeping / gte | 3,75–4,5 |
| Individual | F1 | Ícone | rating / overall / gte | 4–4,25 |
| Individual | F1 | Ícone | rating / passing / gt | 4,5 |
| Individual | F1 | Ícone | rating / passing / gte | 3,5–4,5 |
| Individual | F1 | Ícone | rating / physical / gt | 4,5 |
| Individual | F1 | Ícone | rating / physical / gte | 3,5–4,5 |
| Individual | F1 | Ícone | ratingMean / attack+passing / gte | 4 |
| Individual | F1 | Ícone | ratingMean / attitude+passing / gte | 4 |
| Individual | F1 | Ícone | ratingMean / defense+passing / gte | 4 |
| Individual | F1 | Ícone | ratingMean / goalkeeping+passing / gte | 4 |
| Individual | F1 | Ícone | ratingMean / passing+physical / gte | 4 |
| Individual | F1 | Ícone | teamGoals / gte | 9 |
| Individual | F1 | Ícone | win / gte | 1 |
| Individual | F1 | Ultimate | assists / gte | 1–4 |
| Individual | F1 | Ultimate | conceded / ≤ | 5 |
| Individual | F1 | Ultimate | contributions / gte | 4–5 |
| Individual | F1 | Ultimate | games / gte | 1 |
| Individual | F1 | Ultimate | goals / gte | 1–5 |
| Individual | F1 | Ultimate | nonLoss / gte | 1 |
| Individual | F1 | Ultimate | position / = | ALA, AV, DEF, GR, MED |
| Individual | F1 | Ultimate | rating / attack / gt | 4,25–4,75 |
| Individual | F1 | Ultimate | rating / attack / gte | 3,75–4,75 |
| Individual | F1 | Ultimate | rating / attitude / gte | 4,25–5 |
| Individual | F1 | Ultimate | rating / defense / gt | 4,75 |
| Individual | F1 | Ultimate | rating / defense / gte | 3,5–4,75 |
| Individual | F1 | Ultimate | rating / goalkeeping / gt | 4,75 |
| Individual | F1 | Ultimate | rating / goalkeeping / gte | 4–4,75 |
| Individual | F1 | Ultimate | rating / overall / gte | 4–4,25 |
| Individual | F1 | Ultimate | rating / passing / gt | 4,75 |
| Individual | F1 | Ultimate | rating / passing / gte | 3,5–4,75 |
| Individual | F1 | Ultimate | rating / physical / gt | 4,75 |
| Individual | F1 | Ultimate | rating / physical / gte | 3,75–4,75 |
| Individual | F1 | Ultimate | ratingMean / attack+passing / gte | 4 |
| Individual | F1 | Ultimate | ratingMean / attitude+passing / gte | 4 |
| Individual | F1 | Ultimate | ratingMean / defense+passing / gte | 4 |
| Individual | F1 | Ultimate | ratingMean / goalkeeping+passing / gte | 4 |
| Individual | F1 | Ultimate | ratingMean / passing+physical / gte | 4 |
| Individual | F1 | Ultimate | teamGoals / gte | 9 |
| Individual | F1 | Ultimate | win / gte | 1 |
| Individual | F2 | Bronze | assists / gte | 1 |
| Individual | F2 | Bronze | conceded / ≤ | 7 |
| Individual | F2 | Bronze | contributions / gte | 3 |
| Individual | F2 | Bronze | games / gte | 1 |
| Individual | F2 | Bronze | goals / gte | 1–2 |
| Individual | F2 | Bronze | nonLoss / gte | 1 |
| Individual | F2 | Bronze | position / = | ALA, AV, DEF, GR, MED |
| Individual | F2 | Bronze | rating / attack / gt | 3,75 |
| Individual | F2 | Bronze | rating / attack / gte | 3,25–3,75 |
| Individual | F2 | Bronze | rating / attitude / gt | 4 |
| Individual | F2 | Bronze | rating / attitude / gte | 3,5–4,25 |
| Individual | F2 | Bronze | rating / defense / gt | 3,75 |
| Individual | F2 | Bronze | rating / defense / gte | 3,25–3,75 |
| Individual | F2 | Bronze | rating / goalkeeping / gt | 3,75 |
| Individual | F2 | Bronze | rating / goalkeeping / gte | 3,25–3,75 |
| Individual | F2 | Bronze | rating / overall / gte | 3,75 |
| Individual | F2 | Bronze | rating / passing / gt | 3,75 |
| Individual | F2 | Bronze | rating / passing / gte | 3,25–3,75 |
| Individual | F2 | Bronze | rating / physical / gt | 3,75 |
| Individual | F2 | Bronze | rating / physical / gte | 3,25–3,75 |
| Individual | F2 | Bronze | ratingMean / attack+passing / gte | 3,75 |
| Individual | F2 | Bronze | ratingMean / attitude+passing / gte | 3,75 |
| Individual | F2 | Bronze | ratingMean / defense+passing / gte | 3,75 |
| Individual | F2 | Bronze | ratingMean / goalkeeping+passing / gte | 3,75 |
| Individual | F2 | Bronze | ratingMean / passing+physical / gte | 3,75 |
| Individual | F2 | Bronze | teamGoals / gte | 7 |
| Individual | F2 | Bronze | win / gte | 1 |
| Individual | F2 | Prata | assists / gte | 1–2 |
| Individual | F2 | Prata | conceded / ≤ | 6 |
| Individual | F2 | Prata | contributions / gte | 4 |
| Individual | F2 | Prata | games / gte | 1 |
| Individual | F2 | Prata | goals / gte | 2–3 |
| Individual | F2 | Prata | nonLoss / gte | 1 |
| Individual | F2 | Prata | position / = | ALA, AV, DEF, GR, MED |
| Individual | F2 | Prata | rating / attack / gt | 4 |
| Individual | F2 | Prata | rating / attack / gte | 3,5–4 |
| Individual | F2 | Prata | rating / attitude / gt | 4,5 |
| Individual | F2 | Prata | rating / attitude / gte | 3,75–4,5 |
| Individual | F2 | Prata | rating / defense / gt | 4 |
| Individual | F2 | Prata | rating / defense / gte | 3,5–4 |
| Individual | F2 | Prata | rating / goalkeeping / gt | 4 |
| Individual | F2 | Prata | rating / goalkeeping / gte | 3,5–4 |
| Individual | F2 | Prata | rating / overall / gte | 4 |
| Individual | F2 | Prata | rating / passing / gt | 4 |
| Individual | F2 | Prata | rating / passing / gte | 3,5–4 |
| Individual | F2 | Prata | rating / physical / gt | 4 |
| Individual | F2 | Prata | rating / physical / gte | 3,5–4 |
| Individual | F2 | Prata | ratingMean / attack+passing / gte | 4 |
| Individual | F2 | Prata | ratingMean / attitude+passing / gte | 4 |
| Individual | F2 | Prata | ratingMean / defense+passing / gte | 4 |
| Individual | F2 | Prata | ratingMean / goalkeeping+passing / gte | 4 |
| Individual | F2 | Prata | ratingMean / passing+physical / gte | 4 |
| Individual | F2 | Prata | teamGoals / gte | 8 |
| Individual | F2 | Prata | win / gte | 1 |
| Individual | F2 | Ouro | assists / gte | 1–2 |
| Individual | F2 | Ouro | conceded / ≤ | 5 |
| Individual | F2 | Ouro | contributions / gte | 5 |
| Individual | F2 | Ouro | games / gte | 1 |
| Individual | F2 | Ouro | goals / gte | 2–4 |
| Individual | F2 | Ouro | nonLoss / gte | 1 |
| Individual | F2 | Ouro | position / = | ALA, AV, DEF, GR, MED |
| Individual | F2 | Ouro | rating / attack / gt | 4–4,5 |
| Individual | F2 | Ouro | rating / attack / gte | 3,75–4,5 |
| Individual | F2 | Ouro | rating / attitude / gt | 4,75 |
| Individual | F2 | Ouro | rating / attitude / gte | 4–4,75 |
| Individual | F2 | Ouro | rating / defense / gt | 4,5 |
| Individual | F2 | Ouro | rating / defense / gte | 3,75–4,5 |
| Individual | F2 | Ouro | rating / goalkeeping / gt | 4,5 |
| Individual | F2 | Ouro | rating / goalkeeping / gte | 3,75–4,5 |
| Individual | F2 | Ouro | rating / overall / gte | 4 |
| Individual | F2 | Ouro | rating / passing / gt | 4,5 |
| Individual | F2 | Ouro | rating / passing / gte | 3,75–4,5 |
| Individual | F2 | Ouro | rating / physical / gt | 4,5 |
| Individual | F2 | Ouro | rating / physical / gte | 3,75–4,5 |
| Individual | F2 | Ouro | ratingMean / attack+passing / gte | 4 |
| Individual | F2 | Ouro | ratingMean / attitude+passing / gte | 4 |
| Individual | F2 | Ouro | ratingMean / defense+passing / gte | 4 |
| Individual | F2 | Ouro | ratingMean / goalkeeping+passing / gte | 4 |
| Individual | F2 | Ouro | ratingMean / passing+physical / gte | 4 |
| Individual | F2 | Ouro | teamGoals / gte | 9 |
| Individual | F2 | Ouro | win / gte | 1 |
| Individual | F2 | Ícone | assists / gte | 1–3 |
| Individual | F2 | Ícone | conceded / ≤ | 5 |
| Individual | F2 | Ícone | contributions / gte | 5–6 |
| Individual | F2 | Ícone | games / gte | 1 |
| Individual | F2 | Ícone | goals / gte | 2–5 |
| Individual | F2 | Ícone | nonLoss / gte | 1 |
| Individual | F2 | Ícone | position / = | ALA, AV, DEF, GR, MED |
| Individual | F2 | Ícone | rating / attack / gt | 4,25–4,75 |
| Individual | F2 | Ícone | rating / attack / gte | 4–4,75 |
| Individual | F2 | Ícone | rating / attitude / gte | 4,25–5 |
| Individual | F2 | Ícone | rating / defense / gt | 4,75 |
| Individual | F2 | Ícone | rating / defense / gte | 3,75–4,75 |
| Individual | F2 | Ícone | rating / goalkeeping / gt | 4,75 |
| Individual | F2 | Ícone | rating / goalkeeping / gte | 4–4,75 |
| Individual | F2 | Ícone | rating / overall / gte | 4–4,25 |
| Individual | F2 | Ícone | rating / passing / gt | 4,75 |
| Individual | F2 | Ícone | rating / passing / gte | 3,75–4,75 |
| Individual | F2 | Ícone | rating / physical / gt | 4,75 |
| Individual | F2 | Ícone | rating / physical / gte | 3,75–4,75 |
| Individual | F2 | Ícone | ratingMean / attack+passing / gte | 4 |
| Individual | F2 | Ícone | ratingMean / attitude+passing / gte | 4 |
| Individual | F2 | Ícone | ratingMean / defense+passing / gte | 4 |
| Individual | F2 | Ícone | ratingMean / goalkeeping+passing / gte | 4 |
| Individual | F2 | Ícone | ratingMean / passing+physical / gte | 4 |
| Individual | F2 | Ícone | teamGoals / gte | 9 |
| Individual | F2 | Ícone | win / gte | 1 |
| Individual | F2 | Ultimate | assists / gte | 1–4 |
| Individual | F2 | Ultimate | conceded / ≤ | 5 |
| Individual | F2 | Ultimate | contributions / gte | 3–6 |
| Individual | F2 | Ultimate | games / gte | 1 |
| Individual | F2 | Ultimate | goals / gte | 1–6 |
| Individual | F2 | Ultimate | nonLoss / gte | 1 |
| Individual | F2 | Ultimate | position / = | ALA, AV, DEF, GR, MED |
| Individual | F2 | Ultimate | rating / attack / gt | 4,25 |
| Individual | F2 | Ultimate | rating / attack / gte | 4–5 |
| Individual | F2 | Ultimate | rating / attitude / gte | 4,5–5 |
| Individual | F2 | Ultimate | rating / defense / gte | 3,75–5 |
| Individual | F2 | Ultimate | rating / goalkeeping / gte | 4,25–5 |
| Individual | F2 | Ultimate | rating / overall / gte | 4–4,25 |
| Individual | F2 | Ultimate | rating / passing / gte | 3,75–5 |
| Individual | F2 | Ultimate | rating / physical / gte | 4–5 |
| Individual | F2 | Ultimate | ratingMean / attack+passing / gte | 4 |
| Individual | F2 | Ultimate | ratingMean / attitude+passing / gte | 4 |
| Individual | F2 | Ultimate | ratingMean / defense+passing / gte | 4 |
| Individual | F2 | Ultimate | ratingMean / goalkeeping+passing / gte | 4 |
| Individual | F2 | Ultimate | ratingMean / passing+physical / gte | 4 |
| Individual | F2 | Ultimate | teamGoals / gte | 9 |
| Individual | F2 | Ultimate | win / gte | 1 |
| Fusão | F0 | Ouro | assists / gte | 1 |
| Fusão | F0 | Ouro | conceded / ≤ | 8 |
| Fusão | F0 | Ouro | contributions / gte | 2 |
| Fusão | F0 | Ouro | games / gte | 1 |
| Fusão | F0 | Ouro | goals / gte | 1–2 |
| Fusão | F0 | Ouro | nonLoss / gte | 1 |
| Fusão | F0 | Ouro | position / = | ALA, AV, DEF, GR, MED |
| Fusão | F0 | Ouro | rating / attack / gt | 3,25 |
| Fusão | F0 | Ouro | rating / attack / gte | 3–3,25 |
| Fusão | F0 | Ouro | rating / attitude / gte | 3,5–3,75 |
| Fusão | F0 | Ouro | rating / defense / gt | 3,25 |
| Fusão | F0 | Ouro | rating / defense / gte | 3–3,25 |
| Fusão | F0 | Ouro | rating / goalkeeping / gt | 3,25 |
| Fusão | F0 | Ouro | rating / goalkeeping / gte | 3–3,25 |
| Fusão | F0 | Ouro | rating / overall / gte | 3,25 |
| Fusão | F0 | Ouro | rating / passing / gt | 3,25 |
| Fusão | F0 | Ouro | rating / passing / gte | 3–3,25 |
| Fusão | F0 | Ouro | rating / physical / gt | 3,25 |
| Fusão | F0 | Ouro | rating / physical / gte | 3–3,25 |
| Fusão | F0 | Ouro | ratingMean / attack+physical / gte | 3,25 |
| Fusão | F0 | Ouro | ratingMean / attitude+passing / gte | 3,25 |
| Fusão | F0 | Ouro | ratingMean / defense+goalkeeping / gte | 3,25 |
| Fusão | F0 | Ouro | ratingMean / defense+physical / gte | 3,25 |
| Fusão | F0 | Ouro | teamGoals / gte | 5 |
| Fusão | F0 | Ouro | win / gte | 1 |
| Fusão | F0 | Ouro especial | assists / gte | 1 |
| Fusão | F0 | Ouro especial | conceded / ≤ | 7 |
| Fusão | F0 | Ouro especial | contributions / gte | 3 |
| Fusão | F0 | Ouro especial | games / gte | 1 |
| Fusão | F0 | Ouro especial | goals / gte | 1–2 |
| Fusão | F0 | Ouro especial | nonLoss / gte | 1 |
| Fusão | F0 | Ouro especial | position / = | ALA, AV, DEF, GR, MED |
| Fusão | F0 | Ouro especial | rating / attack / gt | 3,5 |
| Fusão | F0 | Ouro especial | rating / attack / gte | 3,25–3,5 |
| Fusão | F0 | Ouro especial | rating / attitude / gte | 3,5–4 |
| Fusão | F0 | Ouro especial | rating / defense / gt | 3,5 |
| Fusão | F0 | Ouro especial | rating / defense / gte | 3,25–3,5 |
| Fusão | F0 | Ouro especial | rating / goalkeeping / gt | 3,5 |
| Fusão | F0 | Ouro especial | rating / goalkeeping / gte | 3,25–3,5 |
| Fusão | F0 | Ouro especial | rating / overall / gte | 3,5 |
| Fusão | F0 | Ouro especial | rating / passing / gt | 3,5 |
| Fusão | F0 | Ouro especial | rating / passing / gte | 3,25–3,5 |
| Fusão | F0 | Ouro especial | rating / physical / gt | 3,5 |
| Fusão | F0 | Ouro especial | rating / physical / gte | 3,25–3,5 |
| Fusão | F0 | Ouro especial | ratingMean / attack+physical / gte | 3,5 |
| Fusão | F0 | Ouro especial | ratingMean / attitude+passing / gte | 3,5 |
| Fusão | F0 | Ouro especial | ratingMean / defense+goalkeeping / gte | 3,5 |
| Fusão | F0 | Ouro especial | ratingMean / defense+physical / gte | 3,5 |
| Fusão | F0 | Ouro especial | teamGoals / gte | 7 |
| Fusão | F0 | Ouro especial | win / gte | 1 |
| Fusão | F0 | Elite | assists / gte | 1 |
| Fusão | F0 | Elite | conceded / ≤ | 5 |
| Fusão | F0 | Elite | contributions / gte | 4 |
| Fusão | F0 | Elite | games / gte | 1 |
| Fusão | F0 | Elite | goals / gte | 2 |
| Fusão | F0 | Elite | nonLoss / gte | 1 |
| Fusão | F0 | Elite | position / = | ALA, AV, DEF, GR, MED |
| Fusão | F0 | Elite | rating / attack / gt | 3,75 |
| Fusão | F0 | Elite | rating / attack / gte | 3,5–3,75 |
| Fusão | F0 | Elite | rating / attitude / gte | 3,5–4,25 |
| Fusão | F0 | Elite | rating / defense / gt | 3,75 |
| Fusão | F0 | Elite | rating / defense / gte | 3,5–3,75 |
| Fusão | F0 | Elite | rating / goalkeeping / gt | 3,75 |
| Fusão | F0 | Elite | rating / goalkeeping / gte | 3,5–3,75 |
| Fusão | F0 | Elite | rating / overall / gte | 3,75 |
| Fusão | F0 | Elite | rating / passing / gt | 3,75 |
| Fusão | F0 | Elite | rating / passing / gte | 3,5–3,75 |
| Fusão | F0 | Elite | rating / physical / gt | 3,75 |
| Fusão | F0 | Elite | rating / physical / gte | 3,5–3,75 |
| Fusão | F0 | Elite | ratingMean / attack+physical / gte | 3,75 |
| Fusão | F0 | Elite | ratingMean / attitude+passing / gte | 3,75 |
| Fusão | F0 | Elite | ratingMean / defense+goalkeeping / gte | 3,75 |
| Fusão | F0 | Elite | ratingMean / defense+physical / gte | 3,75 |
| Fusão | F0 | Elite | teamGoals / gte | 8 |
| Fusão | F0 | Elite | win / gte | 1 |
| Fusão | F0 | Ícone | assists / gte | 1 |
| Fusão | F0 | Ícone | conceded / ≤ | 5 |
| Fusão | F0 | Ícone | contributions / gte | 4 |
| Fusão | F0 | Ícone | games / gte | 1 |
| Fusão | F0 | Ícone | goals / gte | 2 |
| Fusão | F0 | Ícone | nonLoss / gte | 1 |
| Fusão | F0 | Ícone | position / = | ALA, AV, DEF, GR, MED |
| Fusão | F0 | Ícone | rating / attack / gt | 4 |
| Fusão | F0 | Ícone | rating / attack / gte | 3,75–4 |
| Fusão | F0 | Ícone | rating / attitude / gte | 3,5–4,5 |
| Fusão | F0 | Ícone | rating / defense / gt | 4 |
| Fusão | F0 | Ícone | rating / defense / gte | 3,5–4 |
| Fusão | F0 | Ícone | rating / goalkeeping / gt | 3,75 |
| Fusão | F0 | Ícone | rating / goalkeeping / gte | 3,5–3,75 |
| Fusão | F0 | Ícone | rating / overall / gte | 3,75 |
| Fusão | F0 | Ícone | rating / passing / gt | 3,75 |
| Fusão | F0 | Ícone | rating / passing / gte | 3,5–3,75 |
| Fusão | F0 | Ícone | rating / physical / gt | 3,75 |
| Fusão | F0 | Ícone | rating / physical / gte | 3,5–3,75 |
| Fusão | F0 | Ícone | ratingMean / attack+physical / gte | 3,75 |
| Fusão | F0 | Ícone | ratingMean / attitude+passing / gte | 3,75 |
| Fusão | F0 | Ícone | ratingMean / defense+goalkeeping / gte | 3,75 |
| Fusão | F0 | Ícone | ratingMean / defense+physical / gte | 3,75 |
| Fusão | F0 | Ícone | teamGoals / gte | 8 |
| Fusão | F0 | Ícone | win / gte | 1 |
| Fusão | F0 | Ultimate | assists / gte | 1–2 |
| Fusão | F0 | Ultimate | conceded / ≤ | 5 |
| Fusão | F0 | Ultimate | contributions / gte | 4–5 |
| Fusão | F0 | Ultimate | games / gte | 1 |
| Fusão | F0 | Ultimate | goals / gte | 2 |
| Fusão | F0 | Ultimate | nonLoss / gte | 1 |
| Fusão | F0 | Ultimate | position / = | ALA, AV, DEF, GR, MED |
| Fusão | F0 | Ultimate | rating / attack / gt | 4,25 |
| Fusão | F0 | Ultimate | rating / attack / gte | 3,75–4,25 |
| Fusão | F0 | Ultimate | rating / attitude / gte | 3,5–4,5 |
| Fusão | F0 | Ultimate | rating / defense / gt | 4,25 |
| Fusão | F0 | Ultimate | rating / defense / gte | 3,5–4,25 |
| Fusão | F0 | Ultimate | rating / goalkeeping / gt | 4 |
| Fusão | F0 | Ultimate | rating / goalkeeping / gte | 3,75–4 |
| Fusão | F0 | Ultimate | rating / overall / gte | 3,75 |
| Fusão | F0 | Ultimate | rating / passing / gt | 4 |
| Fusão | F0 | Ultimate | rating / passing / gte | 3,5–4 |
| Fusão | F0 | Ultimate | rating / physical / gt | 4 |
| Fusão | F0 | Ultimate | rating / physical / gte | 3,5–4 |
| Fusão | F0 | Ultimate | ratingMean / attack+physical / gte | 3,75 |
| Fusão | F0 | Ultimate | ratingMean / attitude+passing / gte | 3,75 |
| Fusão | F0 | Ultimate | ratingMean / defense+goalkeeping / gte | 3,75 |
| Fusão | F0 | Ultimate | ratingMean / defense+physical / gte | 3,75 |
| Fusão | F0 | Ultimate | teamGoals / gte | 8 |
| Fusão | F0 | Ultimate | win / gte | 1 |
| Fusão | F1 | Ouro | assists / gte | 1 |
| Fusão | F1 | Ouro | conceded / ≤ | 8 |
| Fusão | F1 | Ouro | contributions / gte | 2 |
| Fusão | F1 | Ouro | games / gte | 1 |
| Fusão | F1 | Ouro | goals / gte | 1–2 |
| Fusão | F1 | Ouro | nonLoss / gte | 1 |
| Fusão | F1 | Ouro | position / = | ALA, AV, DEF, GR, MED |
| Fusão | F1 | Ouro | rating / attack / gt | 3,5 |
| Fusão | F1 | Ouro | rating / attack / gte | 3,25–3,5 |
| Fusão | F1 | Ouro | rating / attitude / gte | 3,5–4 |
| Fusão | F1 | Ouro | rating / defense / gt | 3,5 |
| Fusão | F1 | Ouro | rating / defense / gte | 3,25–3,5 |
| Fusão | F1 | Ouro | rating / goalkeeping / gt | 3,5 |
| Fusão | F1 | Ouro | rating / goalkeeping / gte | 3,25–3,5 |
| Fusão | F1 | Ouro | rating / overall / gte | 3,5 |
| Fusão | F1 | Ouro | rating / passing / gt | 3,5 |
| Fusão | F1 | Ouro | rating / passing / gte | 3,25–3,5 |
| Fusão | F1 | Ouro | rating / physical / gt | 3,5 |
| Fusão | F1 | Ouro | rating / physical / gte | 3,25–3,5 |
| Fusão | F1 | Ouro | ratingMean / attack+physical / gte | 3,5 |
| Fusão | F1 | Ouro | ratingMean / attitude+passing / gte | 3,5 |
| Fusão | F1 | Ouro | ratingMean / defense+goalkeeping / gte | 3,5 |
| Fusão | F1 | Ouro | ratingMean / defense+physical / gte | 3,5 |
| Fusão | F1 | Ouro | teamGoals / gte | 6 |
| Fusão | F1 | Ouro | win / gte | 1 |
| Fusão | F1 | Ouro especial | assists / gte | 1 |
| Fusão | F1 | Ouro especial | conceded / ≤ | 6 |
| Fusão | F1 | Ouro especial | contributions / gte | 3 |
| Fusão | F1 | Ouro especial | games / gte | 1 |
| Fusão | F1 | Ouro especial | goals / gte | 1–2 |
| Fusão | F1 | Ouro especial | nonLoss / gte | 1 |
| Fusão | F1 | Ouro especial | position / = | ALA, AV, DEF, GR, MED |
| Fusão | F1 | Ouro especial | rating / attack / gt | 3,75 |
| Fusão | F1 | Ouro especial | rating / attack / gte | 3,5–3,75 |
| Fusão | F1 | Ouro especial | rating / attitude / gte | 3,5–4,25 |
| Fusão | F1 | Ouro especial | rating / defense / gt | 3,75 |
| Fusão | F1 | Ouro especial | rating / defense / gte | 3,5–3,75 |
| Fusão | F1 | Ouro especial | rating / goalkeeping / gt | 3,75 |
| Fusão | F1 | Ouro especial | rating / goalkeeping / gte | 3,5–3,75 |
| Fusão | F1 | Ouro especial | rating / overall / gte | 3,75 |
| Fusão | F1 | Ouro especial | rating / passing / gt | 3,75 |
| Fusão | F1 | Ouro especial | rating / passing / gte | 3,5–3,75 |
| Fusão | F1 | Ouro especial | rating / physical / gt | 3,75 |
| Fusão | F1 | Ouro especial | rating / physical / gte | 3,5–3,75 |
| Fusão | F1 | Ouro especial | ratingMean / attack+physical / gte | 3,75 |
| Fusão | F1 | Ouro especial | ratingMean / attitude+passing / gte | 3,75 |
| Fusão | F1 | Ouro especial | ratingMean / defense+goalkeeping / gte | 3,75 |
| Fusão | F1 | Ouro especial | ratingMean / defense+physical / gte | 3,75 |
| Fusão | F1 | Ouro especial | teamGoals / gte | 7 |
| Fusão | F1 | Ouro especial | win / gte | 1 |
| Fusão | F1 | Elite | assists / gte | 1 |
| Fusão | F1 | Elite | conceded / ≤ | 5 |
| Fusão | F1 | Elite | contributions / gte | 4 |
| Fusão | F1 | Elite | games / gte | 1 |
| Fusão | F1 | Elite | goals / gte | 2 |
| Fusão | F1 | Elite | nonLoss / gte | 1 |
| Fusão | F1 | Elite | position / = | ALA, AV, DEF, GR, MED |
| Fusão | F1 | Elite | rating / attack / gt | 4 |
| Fusão | F1 | Elite | rating / attack / gte | 3,75–4 |
| Fusão | F1 | Elite | rating / attitude / gte | 3,75–4,5 |
| Fusão | F1 | Elite | rating / defense / gt | 4 |
| Fusão | F1 | Elite | rating / defense / gte | 3,75–4 |
| Fusão | F1 | Elite | rating / goalkeeping / gt | 4 |
| Fusão | F1 | Elite | rating / goalkeeping / gte | 3,75–4 |
| Fusão | F1 | Elite | rating / overall / gte | 4 |
| Fusão | F1 | Elite | rating / passing / gt | 4 |
| Fusão | F1 | Elite | rating / passing / gte | 3,75–4 |
| Fusão | F1 | Elite | rating / physical / gt | 4 |
| Fusão | F1 | Elite | rating / physical / gte | 3,75–4 |
| Fusão | F1 | Elite | ratingMean / attack+physical / gte | 4 |
| Fusão | F1 | Elite | ratingMean / attitude+passing / gte | 4 |
| Fusão | F1 | Elite | ratingMean / defense+goalkeeping / gte | 4 |
| Fusão | F1 | Elite | ratingMean / defense+physical / gte | 4 |
| Fusão | F1 | Elite | teamGoals / gte | 9 |
| Fusão | F1 | Elite | win / gte | 1 |
| Fusão | F1 | Ícone | assists / gte | 1 |
| Fusão | F1 | Ícone | conceded / ≤ | 5 |
| Fusão | F1 | Ícone | contributions / gte | 4 |
| Fusão | F1 | Ícone | games / gte | 1 |
| Fusão | F1 | Ícone | goals / gte | 2 |
| Fusão | F1 | Ícone | nonLoss / gte | 1 |
| Fusão | F1 | Ícone | position / = | ALA, AV, DEF, GR, MED |
| Fusão | F1 | Ícone | rating / attack / gt | 4,25 |
| Fusão | F1 | Ícone | rating / attack / gte | 4–4,25 |
| Fusão | F1 | Ícone | rating / attitude / gte | 3,75–4,75 |
| Fusão | F1 | Ícone | rating / defense / gt | 4,25 |
| Fusão | F1 | Ícone | rating / defense / gte | 3,75–4,25 |
| Fusão | F1 | Ícone | rating / goalkeeping / gt | 4 |
| Fusão | F1 | Ícone | rating / goalkeeping / gte | 3,75–4 |
| Fusão | F1 | Ícone | rating / overall / gte | 4 |
| Fusão | F1 | Ícone | rating / passing / gt | 4 |
| Fusão | F1 | Ícone | rating / passing / gte | 3,75–4 |
| Fusão | F1 | Ícone | rating / physical / gt | 4 |
| Fusão | F1 | Ícone | rating / physical / gte | 3,75–4 |
| Fusão | F1 | Ícone | ratingMean / attack+physical / gte | 4 |
| Fusão | F1 | Ícone | ratingMean / attitude+passing / gte | 4 |
| Fusão | F1 | Ícone | ratingMean / defense+goalkeeping / gte | 4 |
| Fusão | F1 | Ícone | ratingMean / defense+physical / gte | 4 |
| Fusão | F1 | Ícone | teamGoals / gte | 9 |
| Fusão | F1 | Ícone | win / gte | 1 |
| Fusão | F1 | Ultimate | assists / gte | 1–2 |
| Fusão | F1 | Ultimate | conceded / ≤ | 5 |
| Fusão | F1 | Ultimate | contributions / gte | 4–5 |
| Fusão | F1 | Ultimate | games / gte | 1 |
| Fusão | F1 | Ultimate | goals / gte | 2 |
| Fusão | F1 | Ultimate | nonLoss / gte | 1 |
| Fusão | F1 | Ultimate | position / = | ALA, AV, DEF, GR, MED |
| Fusão | F1 | Ultimate | rating / attack / gt | 4,5 |
| Fusão | F1 | Ultimate | rating / attack / gte | 4–4,5 |
| Fusão | F1 | Ultimate | rating / attitude / gte | 3,75–4,75 |
| Fusão | F1 | Ultimate | rating / defense / gt | 4,5 |
| Fusão | F1 | Ultimate | rating / defense / gte | 3,75–4,5 |
| Fusão | F1 | Ultimate | rating / goalkeeping / gt | 4,25 |
| Fusão | F1 | Ultimate | rating / goalkeeping / gte | 4–4,25 |
| Fusão | F1 | Ultimate | rating / overall / gte | 4 |
| Fusão | F1 | Ultimate | rating / passing / gt | 4,25 |
| Fusão | F1 | Ultimate | rating / passing / gte | 3,75–4,25 |
| Fusão | F1 | Ultimate | rating / physical / gt | 4,25 |
| Fusão | F1 | Ultimate | rating / physical / gte | 3,75–4,25 |
| Fusão | F1 | Ultimate | ratingMean / attack+physical / gte | 4 |
| Fusão | F1 | Ultimate | ratingMean / attitude+passing / gte | 4 |
| Fusão | F1 | Ultimate | ratingMean / defense+goalkeeping / gte | 4 |
| Fusão | F1 | Ultimate | ratingMean / defense+physical / gte | 4 |
| Fusão | F1 | Ultimate | teamGoals / gte | 9 |
| Fusão | F1 | Ultimate | win / gte | 1 |
| Fusão | F2 | Ouro | assists / gte | 1 |
| Fusão | F2 | Ouro | conceded / ≤ | 7 |
| Fusão | F2 | Ouro | contributions / gte | 3 |
| Fusão | F2 | Ouro | games / gte | 1 |
| Fusão | F2 | Ouro | goals / gte | 1–2 |
| Fusão | F2 | Ouro | nonLoss / gte | 1 |
| Fusão | F2 | Ouro | position / = | ALA, AV, DEF, GR, MED |
| Fusão | F2 | Ouro | rating / attack / gt | 3,75 |
| Fusão | F2 | Ouro | rating / attack / gte | 3,5–3,75 |
| Fusão | F2 | Ouro | rating / attitude / gte | 3,5–4,25 |
| Fusão | F2 | Ouro | rating / defense / gt | 3,75 |
| Fusão | F2 | Ouro | rating / defense / gte | 3,5–3,75 |
| Fusão | F2 | Ouro | rating / goalkeeping / gt | 3,75 |
| Fusão | F2 | Ouro | rating / goalkeeping / gte | 3,5–3,75 |
| Fusão | F2 | Ouro | rating / overall / gte | 3,75 |
| Fusão | F2 | Ouro | rating / passing / gt | 3,75 |
| Fusão | F2 | Ouro | rating / passing / gte | 3,5–3,75 |
| Fusão | F2 | Ouro | rating / physical / gt | 3,75 |
| Fusão | F2 | Ouro | rating / physical / gte | 3,5–3,75 |
| Fusão | F2 | Ouro | ratingMean / attack+physical / gte | 3,75 |
| Fusão | F2 | Ouro | ratingMean / attitude+passing / gte | 3,75 |
| Fusão | F2 | Ouro | ratingMean / defense+goalkeeping / gte | 3,75 |
| Fusão | F2 | Ouro | ratingMean / defense+physical / gte | 3,75 |
| Fusão | F2 | Ouro | teamGoals / gte | 7 |
| Fusão | F2 | Ouro | win / gte | 1 |
| Fusão | F2 | Ouro especial | assists / gte | 1 |
| Fusão | F2 | Ouro especial | conceded / ≤ | 6 |
| Fusão | F2 | Ouro especial | contributions / gte | 4 |
| Fusão | F2 | Ouro especial | games / gte | 1 |
| Fusão | F2 | Ouro especial | goals / gte | 2 |
| Fusão | F2 | Ouro especial | nonLoss / gte | 1 |
| Fusão | F2 | Ouro especial | position / = | ALA, AV, DEF, GR, MED |
| Fusão | F2 | Ouro especial | rating / attack / gt | 4 |
| Fusão | F2 | Ouro especial | rating / attack / gte | 3,75–4 |
| Fusão | F2 | Ouro especial | rating / attitude / gte | 3,75–4,5 |
| Fusão | F2 | Ouro especial | rating / defense / gt | 4 |
| Fusão | F2 | Ouro especial | rating / defense / gte | 3,75–4 |
| Fusão | F2 | Ouro especial | rating / goalkeeping / gt | 4 |
| Fusão | F2 | Ouro especial | rating / goalkeeping / gte | 3,75–4 |
| Fusão | F2 | Ouro especial | rating / overall / gte | 4 |
| Fusão | F2 | Ouro especial | rating / passing / gt | 4 |
| Fusão | F2 | Ouro especial | rating / passing / gte | 3,75–4 |
| Fusão | F2 | Ouro especial | rating / physical / gt | 4 |
| Fusão | F2 | Ouro especial | rating / physical / gte | 3,75–4 |
| Fusão | F2 | Ouro especial | ratingMean / attack+physical / gte | 4 |
| Fusão | F2 | Ouro especial | ratingMean / attitude+passing / gte | 4 |
| Fusão | F2 | Ouro especial | ratingMean / defense+goalkeeping / gte | 4 |
| Fusão | F2 | Ouro especial | ratingMean / defense+physical / gte | 4 |
| Fusão | F2 | Ouro especial | teamGoals / gte | 8 |
| Fusão | F2 | Ouro especial | win / gte | 1 |
| Fusão | F2 | Elite | assists / gte | 1 |
| Fusão | F2 | Elite | conceded / ≤ | 5 |
| Fusão | F2 | Elite | contributions / gte | 5 |
| Fusão | F2 | Elite | games / gte | 1 |
| Fusão | F2 | Elite | goals / gte | 2 |
| Fusão | F2 | Elite | nonLoss / gte | 1 |
| Fusão | F2 | Elite | position / = | ALA, AV, DEF, GR, MED |
| Fusão | F2 | Elite | rating / attack / gt | 4 |
| Fusão | F2 | Elite | rating / attack / gte | 4 |
| Fusão | F2 | Elite | rating / attitude / gte | 4–4,5 |
| Fusão | F2 | Elite | rating / defense / gt | 4 |
| Fusão | F2 | Elite | rating / defense / gte | 4 |
| Fusão | F2 | Elite | rating / goalkeeping / gt | 4 |
| Fusão | F2 | Elite | rating / goalkeeping / gte | 4 |
| Fusão | F2 | Elite | rating / overall / gte | 4 |
| Fusão | F2 | Elite | rating / passing / gt | 4 |
| Fusão | F2 | Elite | rating / passing / gte | 4 |
| Fusão | F2 | Elite | rating / physical / gt | 4 |
| Fusão | F2 | Elite | rating / physical / gte | 4 |
| Fusão | F2 | Elite | ratingMean / attack+physical / gte | 4 |
| Fusão | F2 | Elite | ratingMean / attitude+passing / gte | 4 |
| Fusão | F2 | Elite | ratingMean / defense+goalkeeping / gte | 4 |
| Fusão | F2 | Elite | ratingMean / defense+physical / gte | 4 |
| Fusão | F2 | Elite | teamGoals / gte | 9 |
| Fusão | F2 | Elite | win / gte | 1 |
| Fusão | F2 | Ícone | assists / gte | 1 |
| Fusão | F2 | Ícone | conceded / ≤ | 5 |
| Fusão | F2 | Ícone | contributions / gte | 5 |
| Fusão | F2 | Ícone | games / gte | 1 |
| Fusão | F2 | Ícone | goals / gte | 2 |
| Fusão | F2 | Ícone | nonLoss / gte | 1 |
| Fusão | F2 | Ícone | position / = | ALA, AV, DEF, GR, MED |
| Fusão | F2 | Ícone | rating / attack / gt | 4,25 |
| Fusão | F2 | Ícone | rating / attack / gte | 4,25 |
| Fusão | F2 | Ícone | rating / attitude / gte | 4–4,75 |
| Fusão | F2 | Ícone | rating / defense / gt | 4,25 |
| Fusão | F2 | Ícone | rating / defense / gte | 4–4,25 |
| Fusão | F2 | Ícone | rating / goalkeeping / gt | 4 |
| Fusão | F2 | Ícone | rating / goalkeeping / gte | 4 |
| Fusão | F2 | Ícone | rating / overall / gte | 4 |
| Fusão | F2 | Ícone | rating / passing / gt | 4 |
| Fusão | F2 | Ícone | rating / passing / gte | 4 |
| Fusão | F2 | Ícone | rating / physical / gt | 4 |
| Fusão | F2 | Ícone | rating / physical / gte | 4 |
| Fusão | F2 | Ícone | ratingMean / attack+physical / gte | 4 |
| Fusão | F2 | Ícone | ratingMean / attitude+passing / gte | 4 |
| Fusão | F2 | Ícone | ratingMean / defense+goalkeeping / gte | 4 |
| Fusão | F2 | Ícone | ratingMean / defense+physical / gte | 4 |
| Fusão | F2 | Ícone | teamGoals / gte | 9 |
| Fusão | F2 | Ícone | win / gte | 1 |
| Fusão | F2 | Ultimate | assists / gte | 1–2 |
| Fusão | F2 | Ultimate | conceded / ≤ | 5 |
| Fusão | F2 | Ultimate | contributions / gte | 5–6 |
| Fusão | F2 | Ultimate | games / gte | 1 |
| Fusão | F2 | Ultimate | goals / gte | 2 |
| Fusão | F2 | Ultimate | nonLoss / gte | 1 |
| Fusão | F2 | Ultimate | position / = | ALA, AV, DEF, GR, MED |
| Fusão | F2 | Ultimate | rating / attack / gt | 4,5 |
| Fusão | F2 | Ultimate | rating / attack / gte | 4,25–4,5 |
| Fusão | F2 | Ultimate | rating / attitude / gte | 4–4,75 |
| Fusão | F2 | Ultimate | rating / defense / gt | 4,5 |
| Fusão | F2 | Ultimate | rating / defense / gte | 4–4,5 |
| Fusão | F2 | Ultimate | rating / goalkeeping / gt | 4,25 |
| Fusão | F2 | Ultimate | rating / goalkeeping / gte | 4,25 |
| Fusão | F2 | Ultimate | rating / overall / gte | 4 |
| Fusão | F2 | Ultimate | rating / passing / gt | 4,25 |
| Fusão | F2 | Ultimate | rating / passing / gte | 4–4,25 |
| Fusão | F2 | Ultimate | rating / physical / gt | 4,25 |
| Fusão | F2 | Ultimate | rating / physical / gte | 4–4,25 |
| Fusão | F2 | Ultimate | ratingMean / attack+physical / gte | 4 |
| Fusão | F2 | Ultimate | ratingMean / attitude+passing / gte | 4 |
| Fusão | F2 | Ultimate | ratingMean / defense+goalkeeping / gte | 4 |
| Fusão | F2 | Ultimate | ratingMean / defense+physical / gte | 4 |
| Fusão | F2 | Ultimate | teamGoals / gte | 9 |
| Fusão | F2 | Ultimate | win / gte | 1 |

### Exemplos reais de Ícone e Ultimate por caminho

Variantes atuais em F0, extraídas dos mesmos modelos D2. Não substituem as restantes alternativas nem congelam os alvos das outras fases. Todas as condições são no próximo jogo.

| Caminho | Modelo | Ícone · 150% | Ultimate · 200% |
| --- | --- | --- | --- |
| Velocidade | Arranque ofensivo | Soma pelo menos 4 entre golos e assistências **e** Obtém pelo menos 3,75★ em Físico | Soma pelo menos 5 entre golos e assistências **e** Obtém pelo menos 3,75★ em Físico |
| Finalização | Instinto de marcador | Marca pelo menos 4 golos | Marca pelo menos 4 golos **e** Faz pelo menos 1 assistência |
| Passe | Assistência com qualidade | Faz pelo menos 1 assistência **e** Obtém pelo menos 3,75★ em Passe | Faz pelo menos 1 assistência **e** Obtém pelo menos 4★ em Passe |
| Drible | Desequilibrar e contribuir | Soma pelo menos 4 entre golos e assistências **e** Obtém pelo menos 3,75★ em Ataque | Soma pelo menos 5 entre golos e assistências **e** Obtém pelo menos 3,75★ em Ataque |
| Defesa | Bloco sólido | A tua equipa sofre no máximo 5 golos **e** Obtém pelo menos 3,75★ em Defesa | A tua equipa sofre no máximo 5 golos **e** Obtém pelo menos 4★ em Defesa |
| Físico | Força coletiva | Vence o jogo **e** Obtém pelo menos 4,25★ em Atitude **e** Obtém pelo menos 3,25★ em Físico | Vence o jogo **e** Obtém pelo menos 4,25★ em Atitude **e** Obtém pelo menos 3,5★ em Físico |
| Guarda-redes | Baliza protegida | Joga na posição GR **e** A tua equipa sofre no máximo 5 golos **e** Obtém pelo menos 3,75★ em Guarda-redes | Joga na posição GR **e** A tua equipa sofre no máximo 5 golos **e** Obtém pelo menos 4★ em Guarda-redes |
| Resistência | Motor vencedor | Vence o jogo **e** Obtém pelo menos 3,5★ em Físico | Vence o jogo **e** Obtém pelo menos 3,75★ em Físico |
| Visão de jogo | Encontrar o colega | Faz pelo menos 3 assistências | Marca pelo menos 1 golo **e** Faz pelo menos 3 assistências |
| Posicionamento | Disponível para construir | Obtém pelo menos 3,75★ em Defesa **e** Obtém pelo menos 3,5★ em Passe | Obtém pelo menos 4★ em Defesa **e** Obtém pelo menos 3,5★ em Passe |
| Jogo de equipa | Ao serviço dos outros | Faz pelo menos 1 assistência **e** Obtém pelo menos 4,5★ em Atitude | Faz pelo menos 1 assistência **e** Obtém pelo menos 4,75★ em Atitude |
| Compostura | Finalizar com cabeça | Marca pelo menos 2 golos **e** Obtém pelo menos 4,5★ em Atitude | Marca pelo menos 3 golos **e** Obtém pelo menos 4,5★ em Atitude |
| Dono da Área | Área protegida | Joga na posição GR **e** A tua equipa sofre no máximo 5 golos **e** Obtém pelo menos 3,75★ em Defesa **e** Obtém pelo menos 3,5★ em Guarda-redes | Joga na posição GR **e** A tua equipa sofre no máximo 5 golos **e** Obtém pelo menos 3,75★ em Defesa **e** Obtém pelo menos 3,75★ em Guarda-redes |
| Central Dominante | Duelo ganho | A tua equipa sofre no máximo 5 golos **e** Obtém pelo menos 3,75★ em Defesa **e** Obtém pelo menos 3,5★ em Físico | A tua equipa sofre no máximo 5 golos **e** Obtém pelo menos 4★ em Defesa **e** Obtém pelo menos 3,5★ em Físico |
| Desequilibrador | Mudança de velocidade | Soma pelo menos 4 entre golos e assistências **e** Obtém pelo menos 3,75★ em Ataque **e** Obtém pelo menos 3,5★ em Físico | Soma pelo menos 5 entre golos e assistências **e** Obtém pelo menos 3,75★ em Ataque **e** Obtém pelo menos 3,5★ em Físico |
| Maestro | No centro da decisão | Soma pelo menos 4 entre golos e assistências **e** Obtém pelo menos 3,75★ em Atitude **e** Obtém pelo menos 3,5★ em Passe | Soma pelo menos 4 entre golos e assistências **e** Obtém pelo menos 3,75★ em Atitude **e** Obtém pelo menos 3,75★ em Passe |
| Predador Completo | Atrair e decidir | Marca pelo menos 2 golos **e** Faz pelo menos 1 assistência **e** Obtém pelo menos 3,75★ em Ataque **e** Obtém pelo menos 3,5★ em Físico | Marca pelo menos 2 golos **e** Faz pelo menos 2 assistências **e** Obtém pelo menos 3,75★ em Ataque **e** Obtém pelo menos 3,5★ em Físico |

### Modelos disponíveis e raridades de entrada

A lista mostra a elegibilidade do modelo, não uma garantia de aparecer no sorteio. «Desde» refere-se à primeira raridade dentro do respetivo tipo de percurso. Não existe uma regra global que reserve todas as combinações para Ouro: quase todos os modelos já podem surgir em D0, com alvos ajustados. A vitória isolada só existe em D0; empate, derrota obrigatória e jogo sem sofrer deixaram de integrar o catálogo atual.

#### Velocidade

| ID estável | Missão | Família | Raridades possíveis |
| --- | --- | --- | --- |
| `pace:base` | Base física | `rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `pace:win` | Ritmo vencedor | `result-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `pace:contribute` | Arranque ofensivo | `action-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `pace:attack` | Acelerar o ataque | `combined-rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `pace:defend` | Recuperar terreno | `combined-rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `pace:pass` | Ritmo de circulação | `combined-rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `pace:goal` | Chegar para finalizar | `action-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `pace:assist` | Dar seguimento | `action-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `pace:next-position` | Cumprir o papel | `games` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `pace:next-unbeaten` | Somar sem perder | `nonLoss` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `pace:next-mean` | Equilíbrio de qualidades | `ratingMean` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `pace:next-overall` | Exibição completa | `combined-rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `pace:next-strict` | Superar a fasquia | `rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `pace:next-team-mean` | Qualidade ao serviço da equipa | `ratingMean` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `pace:next-overall-action` | Participação decisiva | `action-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |

#### Finalização

| ID estável | Missão | Família | Raridades possíveis |
| --- | --- | --- | --- |
| `shooting:base` | Qualidade ofensiva | `rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `shooting:goals` | Instinto de marcador | `individual-action` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `shooting:quality` | Golo com assinatura | `action-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `shooting:serve` | Marcar e servir | `score-and-assist` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `shooting:contribute` | Produção com golo | `contributions` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `shooting:win` | Golo na vitória | `result-action` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `shooting:team` | Parte do ataque | `team-action` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `shooting:attitude` | Finalizar com cabeça | `action-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `shooting:next-position` | Cumprir o papel | `games` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `shooting:next-unbeaten` | Somar sem perder | `nonLoss` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `shooting:next-mean` | Equilíbrio de qualidades | `ratingMean` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `shooting:next-overall` | Exibição completa | `action-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `shooting:next-strict` | Superar a fasquia | `action-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `shooting:next-team-mean` | Qualidade ao serviço da equipa | `ratingMean` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `shooting:next-overall-action` | Participação decisiva | `action-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |

#### Passe

| ID estável | Missão | Família | Raridades possíveis |
| --- | --- | --- | --- |
| `passing:base` | Qualidade de passe | `rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `passing:assists` | Serviço de golo | `individual-action` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `passing:quality` | Assistência com qualidade | `action-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `passing:assist-win` | Passe para ganhar | `result-action` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `passing:attitude` | Distribuir com critério | `combined-rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `passing:defend` | Saída de jogo | `combined-rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `passing:win` | Passe na vitória | `result-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `passing:team` | Construção coletiva | `team-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `passing:next-position` | Cumprir o papel | `games` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `passing:next-unbeaten` | Somar sem perder | `nonLoss` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `passing:next-mean` | Equilíbrio de qualidades | `ratingMean` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `passing:next-overall` | Exibição completa | `combined-rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `passing:next-strict` | Superar a fasquia | `rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `passing:next-team-mean` | Qualidade ao serviço da equipa | `ratingMean` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `passing:next-overall-action` | Participação decisiva | `action-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |

#### Drible

| ID estável | Missão | Família | Raridades possíveis |
| --- | --- | --- | --- |
| `dribbling:base` | Qualidade ofensiva | `rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `dribbling:goals` | Resolver na frente | `individual-action` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `dribbling:contribute` | Desequilibrar e contribuir | `action-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `dribbling:physical` | Presença ofensiva | `combined-rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `dribbling:assist` | Criar e servir | `action-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `dribbling:pass` | Ligar a jogada | `combined-rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `dribbling:win` | Atacar para ganhar | `result-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `dribbling:attitude` | Talento com critério | `combined-rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `dribbling:next-position` | Cumprir o papel | `games` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `dribbling:next-unbeaten` | Somar sem perder | `nonLoss` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `dribbling:next-mean` | Equilíbrio de qualidades | `ratingMean` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `dribbling:next-overall` | Exibição completa | `combined-rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `dribbling:next-strict` | Superar a fasquia | `rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `dribbling:next-team-mean` | Qualidade ao serviço da equipa | `ratingMean` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `dribbling:next-overall-action` | Participação decisiva | `action-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |

#### Defesa

| ID estável | Missão | Família | Raridades possíveis |
| --- | --- | --- | --- |
| `defending:base` | Segurança defensiva | `rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `defending:victory` | Resultado coletivo | `victory` | Bronze |
| `defending:win` | Defender para ganhar | `result-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `defending:solid` | Bloco sólido | `solidity` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `defending:attitude` | Compromisso defensivo | `combined-rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `defending:pass` | Defender e construir | `combined-rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `defending:physical` | Presença nos duelos | `combined-rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `defending:contribute` | Defender e decidir | `action-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `defending:next-position` | Cumprir o papel | `games` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `defending:next-unbeaten` | Somar sem perder | `nonLoss` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `defending:next-mean` | Equilíbrio de qualidades | `ratingMean` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `defending:next-overall` | Exibição completa | `combined-rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `defending:next-strict` | Superar a fasquia | `rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `defending:next-team-mean` | Qualidade ao serviço da equipa | `ratingMean` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `defending:next-overall-action` | Participação decisiva | `action-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |

#### Físico

| ID estável | Missão | Família | Raridades possíveis |
| --- | --- | --- | --- |
| `physical:base` | Presença física | `rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `physical:victory` | Resultado coletivo | `victory` | Bronze |
| `physical:win` | Força na vitória | `result-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `physical:defend` | Presença defensiva | `combined-rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `physical:goal` | Presença na frente | `action-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `physical:pass` | Força com critério | `combined-rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `physical:contribute` | Impor e contribuir | `action-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `physical:team-win` | Força coletiva | `result-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `physical:next-position` | Cumprir o papel | `games` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `physical:next-unbeaten` | Somar sem perder | `nonLoss` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `physical:next-mean` | Equilíbrio de qualidades | `ratingMean` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `physical:next-overall` | Exibição completa | `combined-rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `physical:next-strict` | Superar a fasquia | `rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `physical:next-team-mean` | Qualidade ao serviço da equipa | `ratingMean` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `physical:next-overall-action` | Participação decisiva | `action-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |

#### Guarda-redes

| ID estável | Missão | Família | Raridades possíveis |
| --- | --- | --- | --- |
| `goalkeeping:base` | Segurança na baliza | `rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `goalkeeping:solid` | Baliza protegida | `solidity` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `goalkeeping:pass` | Primeiro passe | `combined-rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `goalkeeping:attitude` | Comando da área | `combined-rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `goalkeeping:win` | Muralha vencedora | `result-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `goalkeeping:defend` | Organização defensiva | `combined-rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `goalkeeping:assist` | Assistência da baliza | `action-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `goalkeeping:solid-pass` | Solidez com distribuição | `solidity` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `goalkeeping:next-position` | Cumprir o papel | `games` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `goalkeeping:next-unbeaten` | Somar sem perder | `nonLoss` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `goalkeeping:next-mean` | Equilíbrio de qualidades | `ratingMean` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `goalkeeping:next-overall` | Exibição completa | `combined-rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `goalkeeping:next-strict` | Superar a fasquia | `rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `goalkeeping:next-team-mean` | Qualidade ao serviço da equipa | `ratingMean` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `goalkeeping:next-overall-action` | Participação decisiva | `action-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |

#### Resistência

| ID estável | Missão | Família | Raridades possíveis |
| --- | --- | --- | --- |
| `stamina:base` | Base física | `rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `stamina:victory` | Resultado coletivo | `victory` | Bronze |
| `stamina:win` | Motor vencedor | `result-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `stamina:attitude` | Compromisso total | `combined-rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `stamina:all-round` | Campo inteiro | `combined-rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `stamina:assist` | Fôlego criativo | `action-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `stamina:solid` | Sustentar o bloco | `solidity` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `stamina:balanced-win` | Equilíbrio na vitória | `result-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `stamina:next-position` | Cumprir o papel | `games` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `stamina:next-unbeaten` | Somar sem perder | `nonLoss` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `stamina:next-mean` | Equilíbrio de qualidades | `ratingMean` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `stamina:next-overall` | Exibição completa | `combined-rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `stamina:next-strict` | Superar a fasquia | `rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `stamina:next-team-mean` | Qualidade ao serviço da equipa | `ratingMean` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `stamina:next-overall-action` | Participação decisiva | `action-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |

#### Visão de jogo

| ID estável | Missão | Família | Raridades possíveis |
| --- | --- | --- | --- |
| `vision:base` | Leitura do jogo | `rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `vision:assists` | Encontrar o colega | `individual-action` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `vision:quality` | Ver e executar | `action-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `vision:attack` | Ligar o ataque | `combined-rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `vision:team` | Criador coletivo | `team-action` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `vision:contribute` | Ler e contribuir | `action-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `vision:win` | Criar para ganhar | `result-action` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `vision:attack-assist` | Criatividade validada | `action-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `vision:next-position` | Cumprir o papel | `games` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `vision:next-unbeaten` | Somar sem perder | `nonLoss` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `vision:next-mean` | Equilíbrio de qualidades | `ratingMean` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `vision:next-overall` | Exibição completa | `combined-rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `vision:next-strict` | Superar a fasquia | `rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `vision:next-team-mean` | Qualidade ao serviço da equipa | `ratingMean` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `vision:next-overall-action` | Participação decisiva | `action-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |

#### Posicionamento

| ID estável | Missão | Família | Raridades possíveis |
| --- | --- | --- | --- |
| `positioning:base` | Leitura defensiva | `rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `positioning:win` | Organização vencedora | `result-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `positioning:pass` | Disponível para construir | `combined-rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `positioning:attack` | Equilíbrio entre setores | `combined-rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `positioning:solid` | Fechar espaços | `solidity` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `positioning:attitude` | Disciplina coletiva | `combined-rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `positioning:assist` | Apoio à criação | `action-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `positioning:pass-win` | Saída vencedora | `result-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `positioning:next-position` | Cumprir o papel | `games` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `positioning:next-unbeaten` | Somar sem perder | `nonLoss` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `positioning:next-mean` | Equilíbrio de qualidades | `ratingMean` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `positioning:next-overall` | Exibição completa | `combined-rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `positioning:next-strict` | Superar a fasquia | `rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `positioning:next-team-mean` | Qualidade ao serviço da equipa | `ratingMean` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `positioning:next-overall-action` | Participação decisiva | `action-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |

#### Jogo de equipa

| ID estável | Missão | Família | Raridades possíveis |
| --- | --- | --- | --- |
| `teamwork:base` | Espírito coletivo | `rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `teamwork:assists` | Servir o colega | `individual-action` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `teamwork:victory` | Ganhar juntos | `victory` | Bronze |
| `teamwork:quality` | Ao serviço dos outros | `action-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `teamwork:pass` | Ligação coletiva | `combined-rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `teamwork:win` | Compromisso vencedor | `result-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `teamwork:team` | Todos contam | `team-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `teamwork:defend` | Ajudar a defender | `combined-rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `teamwork:next-position` | Cumprir o papel | `games` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `teamwork:next-unbeaten` | Somar sem perder | `nonLoss` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `teamwork:next-mean` | Equilíbrio de qualidades | `ratingMean` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `teamwork:next-overall` | Exibição completa | `combined-rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `teamwork:next-strict` | Superar a fasquia | `rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `teamwork:next-team-mean` | Qualidade ao serviço da equipa | `ratingMean` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `teamwork:next-overall-action` | Participação decisiva | `action-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |

#### Compostura

| ID estável | Missão | Família | Raridades possíveis |
| --- | --- | --- | --- |
| `composure:base` | Cabeça fria | `rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `composure:win` | Serenidade na vitória | `result-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `composure:pass` | Decidir com critério | `combined-rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `composure:goal` | Finalizar com cabeça | `action-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `composure:defend` | Segurança atrás | `combined-rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `composure:contribute` | Contribuir com critério | `action-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `composure:attack` | Qualidade ofensiva | `combined-rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `composure:pass-win` | Controlar e ganhar | `result-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `composure:next-position` | Cumprir o papel | `games` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `composure:next-unbeaten` | Somar sem perder | `nonLoss` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `composure:next-mean` | Equilíbrio de qualidades | `ratingMean` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `composure:next-overall` | Exibição completa | `combined-rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `composure:next-strict` | Superar a fasquia | `rating` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `composure:next-team-mean` | Qualidade ao serviço da equipa | `ratingMean` | Bronze, Prata, Ouro, Ícone, Ultimate |
| `composure:next-overall-action` | Participação decisiva | `action-quality` | Bronze, Prata, Ouro, Ícone, Ultimate |

#### Dono da Área

| ID estável | Missão | Família | Raridades possíveis |
| --- | --- | --- | --- |
| `fusion-keeper:base` | Dominar a área | `combined-rating` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-keeper:solid` | Área protegida | `solidity` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-keeper:win` | Última palavra | `result-quality` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-keeper:pass` | Saída segura | `combined-rating` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-keeper:attitude` | Comandar a linha | `combined-rating` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-keeper:assist` | Lançar o contra-ataque | `action-quality` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-keeper:solid-pass` | Antecipar e distribuir | `solidity` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-keeper:solid-win` | Fechar a vitória | `solidity` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-keeper:next-position` | Cumprir o papel | `games` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-keeper:next-unbeaten` | Somar sem perder | `nonLoss` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-keeper:next-mean` | Equilíbrio de qualidades | `ratingMean` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-keeper:next-overall` | Exibição completa | `combined-rating` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-keeper:next-strict` | Superar a fasquia | `combined-rating` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-keeper:next-team-mean` | Qualidade ao serviço da equipa | `ratingMean` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-keeper:next-overall-action` | Participação decisiva | `action-quality` | Ouro, Ouro especial, Elite, Ícone, Ultimate |

#### Central Dominante

| ID estável | Missão | Família | Raridades possíveis |
| --- | --- | --- | --- |
| `fusion-central:base` | Impor respeito | `combined-rating` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-central:solid` | Duelo ganho | `solidity` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-central:win` | Segurar os três pontos | `result-quality` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-central:pass` | Construção sem medo | `combined-rating` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-central:attitude` | Liderar o bloco | `combined-rating` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-central:contribute` | Decidir nas duas áreas | `action-quality` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-central:solid-pass` | Recuperar e sair | `solidity` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-central:solid-win` | Vitória de aço | `solidity` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-central:next-position` | Cumprir o papel | `games` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-central:next-unbeaten` | Somar sem perder | `nonLoss` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-central:next-mean` | Equilíbrio de qualidades | `ratingMean` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-central:next-overall` | Exibição completa | `combined-rating` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-central:next-strict` | Superar a fasquia | `combined-rating` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-central:next-team-mean` | Qualidade ao serviço da equipa | `ratingMean` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-central:next-overall-action` | Participação decisiva | `action-quality` | Ouro, Ouro especial, Elite, Ícone, Ultimate |

#### Desequilibrador

| ID estável | Missão | Família | Raridades possíveis |
| --- | --- | --- | --- |
| `fusion-winger:base` | Rasgar a linha | `combined-rating` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-winger:contribute` | Mudança de velocidade | `action-quality` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-winger:goals` | Diagonal de golo | `action-quality` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-winger:assist` | Ganhar a linha e servir | `action-quality` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-winger:win` | Ala decisivo | `result-quality` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-winger:pass` | Acelerar a combinação | `combined-rating` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-winger:team` | Abrir a defesa | `team-quality` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-winger:attitude` | Ousadia com critério | `combined-rating` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-winger:next-position` | Cumprir o papel | `games` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-winger:next-unbeaten` | Somar sem perder | `nonLoss` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-winger:next-mean` | Equilíbrio de qualidades | `ratingMean` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-winger:next-overall` | Exibição completa | `combined-rating` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-winger:next-strict` | Superar a fasquia | `combined-rating` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-winger:next-team-mean` | Qualidade ao serviço da equipa | `ratingMean` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-winger:next-overall-action` | Participação decisiva | `action-quality` | Ouro, Ouro especial, Elite, Ícone, Ultimate |

#### Maestro

| ID estável | Missão | Família | Raridades possíveis |
| --- | --- | --- | --- |
| `fusion-maestro:base` | Ler antes de receber | `combined-rating` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-maestro:assists` | O último passe | `action-quality` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-maestro:contribute` | No centro da decisão | `action-quality` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-maestro:win` | Ditar a vitória | `result-quality` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-maestro:defend` | Controlar os dois momentos | `combined-rating` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-maestro:team` | Fazer jogar a equipa | `team-quality` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-maestro:attack` | Encontrar a abertura | `combined-rating` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-maestro:serve` | Passe e chegada | `action-quality` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-maestro:next-position` | Cumprir o papel | `games` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-maestro:next-unbeaten` | Somar sem perder | `nonLoss` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-maestro:next-mean` | Equilíbrio de qualidades | `ratingMean` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-maestro:next-overall` | Exibição completa | `combined-rating` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-maestro:next-strict` | Superar a fasquia | `combined-rating` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-maestro:next-team-mean` | Qualidade ao serviço da equipa | `ratingMean` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-maestro:next-overall-action` | Participação decisiva | `action-quality` | Ouro, Ouro especial, Elite, Ícone, Ultimate |

#### Predador Completo

| ID estável | Missão | Família | Raridades possíveis |
| --- | --- | --- | --- |
| `fusion-predator:base` | Criar o próprio espaço | `combined-rating` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-predator:goals` | Instinto e desequilíbrio | `action-quality` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-predator:serve` | Atrair e decidir | `action-quality` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-predator:contribute` | Ameaça constante | `action-quality` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-predator:win` | Assinar a vitória | `result-quality` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-predator:team` | Romper o bloco | `team-quality` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-predator:attitude` | Frieza no último toque | `action-quality` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-predator:pass` | Decidir em combinação | `action-quality` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-predator:next-position` | Cumprir o papel | `games` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-predator:next-unbeaten` | Somar sem perder | `nonLoss` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-predator:next-mean` | Equilíbrio de qualidades | `ratingMean` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-predator:next-overall` | Exibição completa | `combined-rating` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-predator:next-strict` | Superar a fasquia | `combined-rating` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-predator:next-team-mean` | Qualidade ao serviço da equipa | `ratingMean` | Ouro, Ouro especial, Elite, Ícone, Ultimate |
| `fusion-predator:next-overall-action` | Participação decisiva | `action-quality` | Ouro, Ouro especial, Elite, Ícone, Ultimate |

<!-- QUEST_ETC_END -->

## Procedimento obrigatório na próxima revisão

1. **Verificar o estado.** Ler este ficheiro, os módulos fonte, `package.json`, o último relatório/snapshot e o guia de calibração. Confirmar a revisão e os modelos realmente existentes. Calcular quantos jogos encerrados novos há apenas se houver dados locais suficientes; não adivinhar. Recomenda-se rever após cerca de dez jogos novos, ou antes se houver desequilíbrio evidente; isto é uma cadência sugerida, não um trigger implementado.
2. **Obter dados uma vez.** Preferir exportação/snapshot local existente. Para dados realmente novos, uma recolha de leitura com finalidade e orçamento explícitos; guardar o snapshot e reutilizá-lo em toda a análise antes/depois. A invocação deste procedimento autoriza a recolha necessária, mas não orçamento ilimitado: definir o limite pelo volume estimado; se não couber ou não for estimável, explicar e pedir o limite antes de ler. Nunca aumentar automaticamente o orçamento após falha. Não confundir análise agregada com snapshot REST reutilizável.
3. **Separar formatos e qualidade.** Comparar 5x5 à parte de 6–12 titulares. Excluir jogos não encerrados, em remoção ou sem resultado válido. Registar jogos, equipas, participações, cobertura de votos e GR elegíveis. Reconstruir avaliações às 48 horas; separar janela pendente, espera e cancelamento do denominador `sucesso + falha`. Sem elegíveis, resultado é desconhecido, não 0%.
4. **Analisar toda a variedade.** Medir golos, assistências, contribuições, resultados de equipa, sofridos, posições e avaliações, incluindo Desempenho geral, médias e comparações estritas. A auditoria atual cobre sobretudo modelos com métricas numéricas de golos; não afirmar cobertura completa de estrelas/posição/resultados isolados sem complementar a análise local. Avaliar cada missão completa por percurso, fase, dificuldade e variante rara. Uma média global não basta.
5. **Comparar e pensar.** Mostrar antes/depois em amostra comum, distinguindo mudança de alvo, novos jogos e correções de dados. Procurar metas triviais, nunca atingidas, saltos excessivos, alternativas dominantes/equivalentes, falta de variedade e penalizações por posição. Usar medianas, quantis, histogramas e frequências empíricas; não extrapolar dois jogos nem decidir por um resultado extremo. Com poucos casos, conservar o alvo e assinalar incerteza quando não houver evidência suficiente.
6. **Explicar antes de implementar.** Apresentar brevemente diagnóstico, propostas concretas e efeitos esperados. Não há bandas percentuais de sucesso oficialmente definidas por raridade: não inventar que Bronze ou Ouro têm uma taxa obrigatória. Propor bandas de equilíbrio separadamente, identificadas como decisão de produto, se forem úteis. Depois implementar os ajustes justificados no âmbito desta revisão sem exigir nova prompt.
7. **Alterar apenas o necessário.** Centralizar alvos em `js/path-difficulty.js`; modelos e fórmulas em `js/path-missions.js`; mudar `PATH_DIFFICULTY_REVISION`. Ajustar o motor só quando necessário. Manter raridades, avanços, regras de perda/cancelamento e economia de recompensas, salvo pedido explícito. Não criar migração por conveniência.
8. **Repetir localmente, testar e documentar.** Reutilizar os mesmos dados; simular também Ícone/Ultimate e todos os critérios adicionais. Regenerar este inventário e o catálogo. Executar os testes dirigidos abaixo e atualizar relatório datado, snapshot agregado, tabelas deste ficheiro e índice. Inspecionar desktop/telemóvel se mudar UI/texto com impacto de layout. Não apresentar testes locais como validação cloud.
9. **Entregar e parar antes de publicar.** Explicar o que mudou, o que permanece provisório, verificações, impacto sobre ofertas existentes e comandos seletivos. Não executar deploy sem autorização.

### Comandos reutilizáveis

Replay offline de uma recolha existente (o snapshot REST pode conter dados pessoais; fica em pasta ignorada, não publicar):

```powershell
npm.cmd run audit:path-difficulty -- --snapshot test-results/firestore-audits/etc-recolha.json --team-size 5 --output test-results/etc-antes.json
```

Uma **nova** recolha requer `--live --scope revisao-ETC --max-reads N --snapshot test-results/firestore-audits/etc-recolha.json`, com `N` substituído por um orçamento inteiro previamente definido. Não executar este exemplo com um limite inventado. O script lê jogos, resumos e feedback/revisões; `--team-size` filtra a análise, não todas as leituras iniciais. `--scope` é descrição, não filtro. Custos de índices/regras não são medidos por esse contador. Se o snapshot tiver mais de sete dias, `--allow-stale-snapshot` permite apenas analisar explicitamente dados antigos; nunca o apresentar como atualização estatística.

Depois de alterar os alvos, usar o **mesmo snapshot REST** e `--compare test-results/etc-antes.json --output test-results/etc-depois.json`; não fazer uma segunda recolha real. Preservar agregados datados sem identidades em `docs/reports/` e ligar o relatório. Não substituir silenciosamente o histórico de 19/10.

```powershell
node scripts/update-path-catalogue.mjs
node scripts/update-quest-etc.mjs
node --test tests/path-variety.test.js tests/paths.test.js tests/path-window.test.js
node scripts/emulator-cli.mjs emulators:exec --config firebase.backend.json --project demo-peladinhas-etc --only firestore "node --test tests/path-variety.backend.test.js"
npm.cmd run test:docs
npm.cmd run build:hosting
```

Usar apenas fixtures/emuladores demo para desenvolvimento e testes. A recolha explicitamente delimitada acima é diagnóstico real, não teste local. Consultar [isolamento e orçamentos](docs/guides/firestore-read-diagnostics.md).

Se houver alterações aos cálculos partilhados, publicar os sete consumidores e o frontend, após autorização:

```powershell
npx.cmd firebase deploy --only "functions:peladinhas:getPath,functions:peladinhas:pathAction,functions:peladinhas:onPathGame,functions:peladinhas:onPathSummary,functions:peladinhas:settlePaths,functions:peladinhas:gameAction,functions:peladinhas:feedbackAction"
npm.cmd run deploy:frontend
```

## Registo de revisões

| Data | Dados | Decisão / estado |
| --- | --- | --- |
| 19/10/2026 | 2 jogos 5x5; 20 participações | Calibração de golos, assistências, combinações e sofridos; amostra provisória. Snapshot preservado. |
| 20/10/2026 | Sem nova amostra declarada nesta referência | Catálogo atual de 225 modelos; correções defensivas/resultados e degrau raro; revisão `2026-10-20-rare-step`. |
| 21/10/2026 | Reutilização dos ficheiros locais, zero leituras cloud | Criação deste ponto de entrada; inventário/intervalos extraídos do código. Nenhum alvo de missão alterado e nenhum deploy executado. |
| 21/10/2026, revisão Ultimate | Mesma amostra de 19/10; sem nova recolha | `2026-10-21-ultimate-step`: Ultimate estritamente superior à Ícone em todos os modelos/fases, com reforço por caminho. Ícone e ofertas existentes preservadas. Publicação não executada. |
| 21/10/2026, fusões por posição | Mesma amostra; pares dos pesos padrão de OVR | `2026-10-21-position-fusions`: cinco novas fusões em substituição das três anteriores, 15 modelos por fusão, cartas próprias e critérios pareados. Sem conquistas prévias segundo o responsável; sem migração nem deploy. |

Na próxima revisão acrescentar: data da recolha, formatos, jogos novos/totais, elegíveis por tipo, revisão antes/depois, mudanças e motivos, caminhos dos agregados/relatório, testes realizados e estado de publicação. Atualizar a data do documento sem apagar o histórico.

Validação de criação em 21/10/2026: gerador executado e conferido com `--check`; 35 testes dirigidos de variedade, percursos e janelas passaram; `test:docs` validou 45 documentos e 323 referências. Não foi necessário executar backend/emuladores nem build para esta alteração documental e de ferramentas offline. Não confirma configuração nem publicação cloud.

Validação da revisão Ultimate de 21/10: 160 testes gerais, quatro testes backend em emulador demo, interface em quatro larguras/temas, inventário, documentação e build passaram. [Relatório e publicação seletiva](docs/reports/path-ultimate-2026-10-21.md). Nenhuma recolha de documentos cloud nem deploy executado.

Validação das fusões por posição: 161 testes gerais, cinco testes backend demo com entrega das cinco cartas e interface/capturas em quatro larguras e temas. [Relatório e consumidores de publicação](docs/reports/path-position-fusions-2026-10-21.md). A revisão não usa estatísticas novas nem altera a amostra de referência.
