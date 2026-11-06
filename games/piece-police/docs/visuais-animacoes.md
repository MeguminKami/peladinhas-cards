# Mapa de animações — Fase 3

05-11-2026 · **29 apresentações implementadas; QA local executado, aprovação final pendente.** Segue a [bíblia](TEMA.md), o [catálogo de eventos](eventos.md) e o [contrato de interface](estrutura-ui.md).

## Regras comuns

Durações de animação abaixo em ms da velocidade Normal. A revisão posterior do dono recuperou Normal/Rápido/Turbo, com taxas 1/2/3,75. Ultra é o identificador interno do Turbo. Toda a animação usa `ctx.tempo`, apenas `transform` e `opacity`. Movimento reduzido usa fades de 80–120 ms, conservando nomes, células, valores e confirmações. Desde 06-11-2026, os avisos textuais permanecem totalmente visíveis durante 3–5 segundos reais conforme o texto, antes da saída. Esse mínimo prevalece sobre os tempos da tabela e não é encurtado por velocidade, mudança de velocidade durante o aviso ou movimento reduzido. Fusões e introduções conservam as confirmações manuais existentes.

Conclusão comum: finalizar a sequência, remover elementos transitórios e deixar o DOM igual a `ctx.model`. Toques adicionais não aceleram nem saltam efeitos. A interface não calcula prémios, não infere acontecimentos comparando grelhas e mantém as chamadas de áudio. As durações não substituem mínimos de interação e ciclo existentes.

## Um evento, uma apresentação

| Evento | Apresentação implementada | Normal | Conclusão específica | Ultra | Movimento reduzido |
|---|---|---:|---|---|---|
| `step.start` | Atualizar contador e estados persistentes, entrada discreta do chip | 120 | HUD e modo sincronizados | Atualização direta | Fade do chip |
| `grid.drop` | Colunas entram com os símbolos finais; sequência curta da esquerda para a direita | 950 + suspense 170–240 por pausa | Última coluna pousada | Colunas quase juntas, 160 ms | Fade conjunto |
| `win.cluster` | Destacar só a combinação atual; símbolo e base → × multiplicador → resultado | 880 / 1050 sticky final | Conta legível concluída antes da próxima combinação | Apresentação conjunta dos prémios do grupo consecutivo, sem duplicar valores | Destaque estático e conta completa |
| `cap.hit` | Moldura própria MAX WIN e total final | 1000 | Entrada concluída; confirmação continua no fluxo existente | Entrada 180 ms, confirmação preservada | Fade e valor final |
| `multiplier.change` | Realçar CW afetado e trocar o valor em escala curta | 220 | Novo valor visível | Atualização em onda, 80 ms | Troca com fade |
| `persona.awaken` | Retrato abre a cor, Alter Ego entra à margem e lança assinatura do poder; refire usa gesto curto | 800 / 450 refire | Retrato no estado do modelo | Retrato e assinatura, 140 ms | Retrato e nome, sem deslocação |
| `fusion.trigger` | Dois retratos convergem para emblema; surpresa nasce de faísca do palco sem despertar cartas | 1210 / 950 surpresa | Emblema e par identificados | Emblema direto, 180 ms | Fade do emblema e par |
| `grid.remove` | Células vencedoras encolhem e desvanecem | 220 | Células removidas transparentes | Saída conjunta, 70 ms | Fade curto |
| `grid.refill` | Queda contínua e entrada dos novos símbolos, sem troca final | 400 | Grelha completa e grupos visíveis | Queda compacta, 100 ms | Fade da atualização |
| `power.reality_break` | Prisma da origem e planos RGB chegam às células indicadas | 960 | Todas as células `cells` mostram `target` | Impacto conjunto, 120 ms | Contorno violeta e fade da transformação |
| `power.slow_motion.start` | Bolha jade / gelo rosa / gelo violeta envolve o grupo conforme `kind` | 610 | Contorno sticky fixo | Contorno direto, 100 ms | Contorno estático |
| `power.slow_motion.grow` | Bolha expande até às células indicadas; leitura do novo tamanho | 560 | Células e tamanho atualizados | Expansão conjunta, 90 ms | Fade do novo contorno |
| `power.slow_motion.end` | Bolha recolhe e desaparece | 180 | Overlay do grupo removido | Saída direta | Fade do overlay |
| `power.rave_rush.move` | Rasto elétrico de `from` a `to`; `from=-1` apresenta transformação local | 320 | Destino, origem e troca/cópia correspondem ao evento | Transferência curta, 60 ms | Marca origem/destino e fade |
| `power.drunk_walk.step` | Passo diagonal tangerina e laço wild; salto usa arco próprio | 340 (+260 desde personagem) | Wild e marca HOLD, se aplicável, no destino | Wilds em onda por sequência, 50 ms por passo | Fade por destino |
| `power.one_more_chance.armed` | Nuvem royal chega ao retrato, marca de respin armado | 400 | Estado armado legível | Marca direta, 80 ms | Marca estática |
| `power.one_more_chance.respin` | Grupo `held` permanece; resto da grelha revela o resultado fornecido | 1060 (+180 raspadinhas) | Grelha final e retenções corretas | Revelação conjunta, 140 ms | Fade só nas células reveladas |
| `wild.place` | Distintivo ou wild da origem indicada pousa, com multiplicador HTML | 280 | Símbolo e valor presentes | Pouso curto, 80 ms | Fade e valor |
| `chemistry.level` | Linha de ligação alcança o novo nível, nome breve | 400 | Nível atualizado | Marca direta, 80 ms | Nome e estado estáticos |
| `corner.open` | Chave aproxima/entra/roda, argola abre, correntes separam-se, conjunto desvanece e revela CW | 1660 | CW e multiplicador do evento legíveis; peças removidas | Desativado | Fade curto fechadura → CW |
| `chemistry.total` | Moldura e cinco assinaturas convergem, faixa TOTAL CHEMISTRY | 950 | Faixa terminou, multiplicadores continuam guiados pelos seus eventos | Impacto conjunto, 180 ms | Faixa e moldura estáticas |
| `police.enter` | Retrato entra pela margem; pose e cor conforme `mode` | 750 | Polícia visível sem tapar símbolos | Retrato direto, 140 ms | Fade do retrato |
| `police.calmer.arrest` | Palma trava, fitas corais marcam só os baixos indicados | 500 | Marcas concluídas; refill seguinte faz a atualização | Marcas conjuntas, 120 ms | Fitas estáticas e fade |
| `police.joiner.party_mode` | Tira chapéu, pose abre, néon ON; origem do distintivo destacada | 850 | Party Mode conforme modelo; colocação respeita `wild.place` | Pose e ON juntos, 160 ms | Retrato JOINER, ON explícito |
| `bonus.trigger` | Scatters convergem, emblema, nome, spins e frase do modo | 1080 | Introdução entregue ao fluxo que espera CONTINUAR | Entrada 180 ms, confirmação preservada | Fade do painel, mesma informação |
| `bonus.retrigger` | Emblema e +N spins, contador atualizado | 550 + aviso | Confirmação ou avanço automático cerca de 10 s, através do relógio | Entrada 120 ms, mesma condição de saída | Painel estático e mesma saída |
| `bonus.end` | Esperar prémios anteriores, manter cenário e contar resumo | 800 + resumo | Total revelado; saída só na confirmação existente | Entrada curta, total pode revelar por toque | Total final com fade e confirmação |
| `safety.stop` | Aviso discreto de diagnóstico, sem celebração | 0 | Informação acessível; preservar recuperação existente | Igual | Igual |
| `step.end` | Fixar ganho do spin, recolher FX transitórios | 180 | Sem FX órfãos; HUD final correto | Limpeza direta | Fade curto |

O agrupamento em Ultra está integrado por apresentação: a aplicação dos eventos continua sequencial, enquanto as etiquetas de prémios coexistem até ao fim do grupo, incluindo eventos de multiplicadores intercalados. Não se recalculam nem se repetem os prémios.

## Apresentações sem evento novo

| Momento | Direção e condição |
|---|---|
| Pré-carregamento | Carregar manifesto e descodificar imagens com `decode()`; progresso por recursos realmente concluídos e tratamento de erro. Não libertar primeiro spin antes da arte essencial pronta |
| Suspense Scatter | Só com símbolos já visíveis e posições ainda por revelar que permitam subir de nível; não olhar para resultados futuros. Intensificar luz e pausa por níveis; reduzido usa destaque estático. Se faltar informação pública suficiente, omitir suspense |
| Compra teatral | Apresentação identificada como entrada de compra; não é um spin pago adicional. Usar somente solução de apresentação compatível com o contrato, sem RNG do motor ou alteração de eventos; esclarecer com A qualquer necessidade de aleatoriedade visual |
| Ganhos 20× / 50× / 100× | GRANDE / ENORME / ÉPICO. Contagem por tempo decorrido, escalões progressivos. Primeiro toque revela total; segundo confirma; CONTINUAR só no fim, com os mínimos existentes |
| Registo do free spin | Miniatura por prémio, conta com valores fornecidos, retratos para despertar/fusão/polícia, marcas de cantos e distintivo; limpar no início do próximo free spin |
| Mudança de modo | Cenário e moldura em fade inferior a 1 s; conservar o ambiente do bónus até à confirmação do resumo |

## Verificação local

Os cenários locais já cobrem os 29 eventos, os três desenhos, movimento reduzido, aceleração e skip. A captura completa percorre 87 momentos de apresentação; será repetida com o catálogo final. A medição com `?perf=1` e CPU 4× abrange spin, scatters, cascatas, ganho grande e bónus em Ultra. Os resultados e limitações finais pertencem ao relatório da Fase 3.


## Estado da implementação — 05-11-2026

Todos os 29 eventos têm ramo próprio. Ultra usa queda conjunta, transferências curtas e prémios coexistentes; movimento reduzido usa fades. O respin conserva held, revela as raspadinhas indicadas em revealed e roda as restantes células. Os atributos visuais sticky e COPIUM armado acompanham o modelo. Os elementos transitórios são removidos ao terminar/saltar. Retrigger: aviso próprio, confirmação ou 10 000 ms virtuais automáticos, respeitando o mínimo real de interação mesmo com turbo. Restantes avisos exigem confirmação. Contadores de ganho: 1300/1700/2200 ms virtuais nos escalões 20/50/100×, resumo 1200; primeiro toque revela, segundo confirma.

O teste de arte suporta `npm.cmd run test:art -- --edge --full` para capturas dos momentos-chave e `npm.cmd run test:art -- --edge --perf` para medição local com CPU 4×. Os resultados finais e limitações estão no [relatório da Fase 3](fase3/RELATORIO-FASE-3.md): 87 momentos capturados, 63 entradas de arte validadas e cinco medições CPU 4×. Implementação e QA local não equivalem à aprovação final do dono.
