# Escolhe o teu caminho! — variedade de missões

Data: 19 de outubro de 2026, Europe/Lisbon.

**Estado: proposta para uma próxima implementação.** Este documento não altera o catálogo, os sorteios ou as recompensas em execução. Os exemplos abaixo são propostas, não missões já disponíveis.

## Objetivo

Dar identidade às especializações e variar o desafio real. Trocar apenas o nome ou a frase de uma missão não conta como variedade. Evitar que o jogador receba sempre três versões de «obtém uma média».

Base técnica consultada: `js/path-model.js`, `js/path-window.js` e `js/utils.js`. Os dados atuais permitem usar golos e assistências individuais, resultado da equipa, posição registada no jogo e avaliações de Ataque, Passe, Físico, Defesa, Guarda-redes e Atitude. Não permitem medir velocidade, distância, dribles, interceções ou defesas efetuadas.

## Regras que se mantêm

- Cada tentativa vale exclusivamente para o próximo jogo do jogador. Não criar séries de vários jogos.
- A preparação congela quando o jogo abre. Não adaptar o objetivo após conhecer o resultado ou os votos.
- Missões só numéricas apuram ao fechar. Qualquer combinação com avaliações espera as 48 horas desde o fecho.
- Exigir sete votos válidos por critério e reconstruir os votos no corte. Sem amostra suficiente, cancelar sem perder progresso, mesmo que outra condição já tenha falhado.
- Falhar reinicia apenas o nó da tentativa. Cancelar mantém o progresso. Os nós anteriores e as cartas mantêm-se.
- Cada nó tem 100%; excedente passa aos seguintes. Manter 25/50/100%, com variantes raras de 150/200%, e os limites próprios de +15 por atributo e +25 GR.
- Cada nó entrega no máximo +1 em cada um de até três atributos. Não criar recompensas adicionais por combinar condições.
- Conservar as três propostas e o único reroll diário global. Persistir tudo no servidor.

## Novas famílias de objetivos

| Família | Exemplo proposto | Dados necessários | Apuramento |
| --- | --- | --- | --- |
| Contribuição ofensiva | Somar pelo menos 2 entre golos e assistências | Registos individuais | Fecho |
| Marcar e servir | Marcar 1 golo e fazer 1 assistência | Registos individuais | Fecho |
| Contribuição na vitória | Vencer e marcar 1 golo; ou vencer e fazer 1 assistência | Resultado e registos | Fecho |
| Participação no ataque da equipa | Contribuir com pelo menos 1 golo/assistência e a equipa marcar pelo menos 3 | Resultado e registos | Fecho |
| Dupla avaliação | Obter 3,5★ em Físico e 3,25★ em Atitude | Dois critérios distintos | 48h |
| Ação com qualidade | Fazer 1 assistência e obter 3,5★ em Passe | Registo e avaliação | 48h |
| Solidez coletiva | Sofrer no máximo 2 golos e obter 3,5★ em Defesa | Resultado e avaliação | 48h |
| Equilíbrio na vitória | Vencer e obter 3,25★ em dois critérios | Resultado e avaliações | 48h |

Contribuição significa a soma de golos e assistências registados para aquele jogador. Não significa percentagem dos golos da equipa nem envolvimento num número de lances distintos: os registos atuais não identificam cada lance.

Os números são exemplos para calibrar, não limites finais aprovados. Uma combinação com mais condições deve exigir metas individuais menores do que uma missão de avaliação única da mesma dificuldade.

## Identidade por atributo

Manter as missões existentes como parte do catálogo. Acrescentar estas possibilidades para diversificar, sem prometer métricas que o jogo não regista.

| Percurso | Exemplos novos propostos | Identidade e limites |
| --- | --- | --- |
| Velocidade | 3,5★ em Físico + 1 contribuição ofensiva; 3,5★ em Físico + 3,25★ em Ataque | Usar Físico como aproximação explícita; não chamar «sprints» ao objetivo |
| Finalização | 1 golo + 3,5★ em Ataque; 2 contribuições com pelo menos 1 golo; vitória + 1 golo | O jogador tem de marcar nas variantes que representam finalização |
| Passe | 1 assistência + 3,5★ em Passe; vitória + 1 assistência; 3,5★ em Passe + 3,25★ em Atitude | Valorizar criação e execução, sem inventar passes completos |
| Drible | 3,5★ em Ataque + 3,25★ em Físico; 1 contribuição + 3,5★ em Ataque | Não afirmar que uma contribuição comprova um drible |
| Defesa | Sofrer até 2 + 3,5★ em Defesa; 3,5★ em Defesa + 3,25★ em Atitude | O resultado coletivo nunca deve ser a única condição das novas variantes de solidez |
| Físico | 3,5★ em Físico + 3,25★ em Defesa; vitória + 3,25★ em Físico e Atitude | Variar entre presença defensiva e rendimento coletivo |
| Guarda-redes | Jogar a GR + 3,5★ em GR e 3,25★ em Passe; jogar a GR + vencer + 3,5★ em GR | Todas exigem posição GR no próprio jogo; não usar o perfil atual |
| Resistência | 3,5★ em Físico + 3,5★ em Atitude; vencer + 3,25★ em Físico e Defesa | Resistência continua uma aproximação; não medir minutos ou distância inexistentes |
| Visão de jogo | 1 assistência + 3,5★ em Passe; 3,5★ em Passe + 3,25★ em Ataque; 1 contribuição + 3,5★ em Passe | Criação e leitura ofensiva |
| Posicionamento | 3,5★ em Defesa + 3,25★ em Passe; sofrer até 2 + 3,5★ em Defesa | Organização e saída de jogo |
| Jogo de equipa | 1 assistência + 4★ em Atitude; 4★ em Atitude + 3,25★ em Passe; vitória + 4★ em Atitude | Preservar exigência própria das avaliações de Atitude |
| Compostura | 4★ em Atitude + 3,25★ em Passe; 1 contribuição + 4★ em Atitude | Não inventar golos sob pressão, recuperação de desvantagem ou penáltis |

Não bloquear uma especialização por falta de progresso noutra. Usar uma segunda avaliação numa missão não exige desbloquear o percurso desse atributo.

## Fusões com mais do que duas médias

Conservar o desbloqueio no marco 5 das duas origens, a unificação visual, os três focos e os cinco nós de Combinação. Diversificar apenas o catálogo desse foco.

| Fusão | Novas variantes propostas |
| --- | --- |
| Atacante completo | 1 golo + 1 assistência; 1 golo + média em Passe; 1 assistência + média em Ataque; contribuição ofensiva + médias em Ataque e Passe |
| Fortaleza | Jogar a GR + limitar golos sofridos + média em Defesa; jogar a GR + vitória + médias em Defesa e GR |
| Motor criativo | 1 assistência + média em Físico; contribuição ofensiva + médias em Físico e Passe; vitória + médias em Físico e Passe |

Cada variante deve usar evidência das duas áreas da fusão. Na Fortaleza, a posição GR é obrigatória em todas as variantes, mesmo quando não se pede avaliação de GR.

Não exigir simultaneamente uma vitória folgada, baliza a zero e duas avaliações extremas. Uma fusão não deve tornar-se impossível pela acumulação de condições.

## Sorteio: três escolhas diferentes de verdade

1. Construir candidatos por percurso e fase de dificuldade, com família, condições, raridade e avanço.
2. Sempre que o catálogo permitir, apresentar uma proposta direta, uma de desempenho combinado e uma de maior exigência. Não fixar permanentemente a família a um dos três lugares.
3. Preferir três famílias distintas. Se não houver candidatos adequados, admitir repetição de família com condições realmente diferentes.
4. Normalizar condições para detetar equivalências: «vencer + marcar» e «marcar + vencer» são a mesma missão. Comparar métricas e metas, não apenas textos ou IDs.
5. Impedir que uma proposta tenha exatamente as mesmas condições de outra e dê menos avanço. Avaliar também dominância simples: um objetivo estritamente mais exigente não pode dar menos avanço no mesmo trio.
6. Reduzir a probabilidade das famílias vistas nas últimas três tentativas daquele percurso; isto é uma preferência, não um bloqueio de progressão.
7. O reroll deve preferir famílias diferentes do trio substituído. Não prometer novidade total quando o catálogo é pequeno. Não conceder outro reroll por falta de candidatos.
8. Sortear no servidor e guardar a versão completa. Abrir outro separador, trocar de percurso ou atualizar a página nunca volta a sortear.

As variantes raras conservam a família sorteada e podem aumentar avanço, sem acrescentar condições ocultas. A raridade visual não é uma medida exata da probabilidade de sucesso.

## Dificuldade e calibração

Manter fundamentos até +4, evolução desde +5 e metas finais desde +10, calculadas pelos pontos efetivamente entregues nesta origem. Nas fusões, conservar o cálculo atual com os pontos das áreas envolvidas.

- Comparar famílias antes de atribuir metas. «1 golo e 1 assistência» pode ser mais difícil que «2 contribuições» e não deve ser tratado como equivalente.
- Reduzir as metas de avaliação quando se exigem dois critérios ou uma ação adicional. Não reutilizar automaticamente a mesma meta em todas as combinações.
- Manter 5 golos e 4,5★ como possibilidades finais de grande exigência, não como mínimos universais. Rever separadamente Atitude, cuja distribuição difere dos outros critérios.
- Evitar objetivos dependentes de desempenho negativo de colegas. Não pedir derrotas, votos baixos a outros jogadores ou ausência de assistências.
- Não criar objetivos de posição para jogadores de campo nesta fase. Para GR, informar a exigência antes da escolha e cancelar sem penalização se a condição de participação elegível não se verificar, conforme a lógica de elegibilidade aprovada.

Antes de fechar números, executar análise só de leitura sobre jogos reais anonimizados: distribuição de golos/assistências, resultados e avaliações com sete votos válidos. Para ratings, só estimar cumprimento histórico se for possível reconstruir a janela de 48h; as médias atuais não substituem esse corte. Se faltar histórico, identificar a amostra como incompleta e recolher dados futuros.

Medir frequência de cumprimento por fase, percurso e família; separar cancelamentos por falta de votos das falhas. Não fixar percentagens de sucesso desejadas sem observar volume e qualidade da amostra. Não alterar metas de propostas já reveladas para reagir às métricas.

## Modelo e funções a acrescentar

Propor `proposalVersion: 4` com `templateId`, `family` e `objective.kind: "conditions"`, contendo uma lista de condições ligadas por **E**. Sem lógica arbitrária, código executável ou expressões fornecidas pelo cliente.

Tipos permitidos nesta primeira fase: posição GR, golos mínimos, assistências mínimas, contribuições mínimas, vitória, golos da equipa mínimos, golos sofridos máximos e média mínima por critério. Não introduzir condições **OU** nesta fase; uma alternativa deve ser outra proposta.

Funções sugeridas:

- `pathMissionTemplates(routeId, stage)`: catálogo e limites válidos.
- `normalizePathConditions(objective)`: representação canónica para equivalência e validação.
- `pathObjectiveRequirements(objective)`: critérios de avaliação, posição e dados necessários.
- `evaluatePathConditions(objective, game, summary, uid)`: avalia todas as condições, sem efeitos laterais.
- `pickDiversePathOffers(candidates, recentFamilies, random)`: sorteio com variedade e sem duplicados/dominância.
- `pathObjectiveLines(objective)`: título curto e lista de condições para interface e administração.

Reutilizar os mesmos dados autoritativos do fecho e do corte de votos. Não procurar médias novas ou dados do perfil ao apurar uma tentativa congelada.

O novo objeto precisa de tratamento explícito em `pathUsesRatings`, nos requisitos de sete votos, na elegibilidade GR e na apresentação. Não classificar automaticamente um tipo desconhecido como missão de avaliação.

## Compatibilidade, interface e publicação futura

- Não converter propostas existentes em novas combinações. Preservar sorteios, tentativas, reservas de excedente, rerolls, conquistas e cartas anteriores.
- Manter os avaliadores e textos das versões anteriores até não haver tentativas antigas por apurar. Novos sorteios usam a versão nova, sem recalcular semanas fechadas.
- Missões compostas mostram título curto, raridade, avanço e lista de condições: «Marca 1 golo» / «Obtém 3,5★ em Passe». Na missão preparada, manter a mesma lista e o bloco de recompensa.
- Explicar quando se apura e quais critérios exigem sete votos. Com duas avaliações, mostrar contagem e resultado por critério.
- Falta de votos cancela a tentativa sem penalização; falha desportiva reinicia o nó. Não confundir estes estados com erro técnico ou revisão administrativa.
- Validar desktop, 768, 390 e 320 px, quatro temas, teclado e redução de movimento. Rever títulos longos, listas de condições e estados preparados/bloqueados/em avaliação.
- A futura implementação altera frontend e backend: catálogo/avaliadores partilhados, apuramento e consumidores que os importam. Identificar os exports afetados no momento da implementação e publicar seletivamente. Regras só precisam de deploy se forem alteradas.
- Este plano não altera funções nem dados e não exige deploy.

## Fora desta fase

Dribles bem-sucedidos, passes completos, desarmes, interceções, defesas do GR, minutos, sprints, quilómetros, ordem dos golos e recuperação de desvantagem exigem novos registos validados e fluxos próprios. Não adicionar estes objetivos com confirmação manual do próprio jogador. Uma fase futura pode estudar registo administrativo por lance e respetiva auditoria.

## Checklist de implementação futura

- [ ] Aprovar famílias e calibrar metas com dados, sem alterações cloud durante a análise.
- [ ] Criar esquema e catálogo versionados; validar métricas e combinações permitidas por percurso.
- [ ] Implementar avaliação numérica e mista, elegibilidade GR e corte histórico de cada critério.
- [ ] Implementar sorteio com diversidade, equivalência, dominância e fallback determinístico.
- [ ] Preservar propostas antigas e comportamento do reroll global.
- [ ] Testar todas as condições, limites, fusões, seis/sete votos, edições após o corte, cancelamento e idempotência.
- [ ] Testar sorteio em muitos seeds: três escolhas, sem duplicados e sem alternativas dominadas.
- [ ] Adaptar interface e administração; validar visualmente nas larguras e temas suportados.
- [ ] Atualizar referência funcional, testes e lista de consumidores a publicar.
