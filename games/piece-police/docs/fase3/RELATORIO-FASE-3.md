# Fase 3 — arte e apresentação

Data: 05-11-2026. Estado: implementação e QA local concluídos; aprovação do conjunto pelo dono ainda pendente. Matemática preservada em `pp-v6`.

## Entrega

A direção Acidwave Neon, as seis identidades e a amostra foram aprovadas pelo dono. Os símbolos, retratos ativos, Alter Egos e quatro estados da Peace Police já estão integrados. Existem quatro ambientes com versões verticais próprias, moldura partilhada, suporte de marca, imagem de grupo e ícones locais. O último lote acrescentou dez fusões, quatro emblemas de modos e duas molduras de celebrações. Catálogo atual: **63 IDs, 60 WebP únicos, 3 997 746 bytes**; fontes locais Oxanium + Manrope: **38 880 bytes**. Todas as peças foram revistas por A.

As personagens ativas reforçam a personificação: WEED com folhas/fumo jade, ALCOOL com bebida e gesto tangerina, COPIUM com nuvens royal, MDMA com corações rosa e LCD com prismas/distorção violeta. Arte para uso privado conforme autorização do dono.

Os [29 eventos têm apresentação implementada](../visuais-animacoes.md#um-evento-uma-apresentação), com duração, conclusão, Ultra e movimento reduzido documentados. Rápido usa a taxa do relógio existente. A interface usa os resultados e eventos fornecidos, sem recalcular prémios. O registo mostra miniaturas e contas com base precisa; usa ≈ quando há arredondamento e → quando o limite corta o prémio.

## Verificação local

- `npm.cmd test`: 56 testes passaram.
- `npm.cmd run verificar:kit`: ficheiros do kit intactos, tema só com variáveis `--deck-*`.
- Suite de interface em Microsoft Edge instalado: 13 testes passaram; a falha inicial de overflow em 320×640 foi corrigida e o teste de tamanhos repetido passou todos os casos. Cobertura dos 14 testes concluída. A causa era o crescimento do registo e da linha PARTY entre frames; o CSS vertical passou a reservar essa altura. A repetição do teste confirmou ausência de scroll nos 19 casos de tamanho, incluindo 320×640 no jogo e dentro do site.
- `npm.cmd run test:docs`, na raiz Peladinhas: 101 documentos e 508 referências válidas.
- `npm.cmd run test:art -- --edge --full`: 63 entradas descodificadas; dimensões, alpha e margens passaram, nove estados principais nos três desenhos, movimento reduzido e 87 capturas.
- `npm.cmd run test:art -- --edge --overlays`: repetição dirigida das 27 apresentações de introdução/retrigger/resumo/ganho após as correções de encaixe; verifica botões dentro do ecrã e miniaturas no resumo.
- `npm.cmd run test:art -- --edge --perf`: cinco medições finais concluídas, após estabilizar o layout.

O Chromium empacotado do Playwright não está instalado. Os testes foram executados com o Edge instalado e caminho explícito, sem descarregar browsers.

## Limites e publicação

Sem alterações a `src/`, `tabelas/`, `ui/kit/`, modelo, sessão, carteira ou relógio. Não houve leitura cloud, commit ou deploy. Os testes de apresentação dos escalões de ganho e MAX WIN usam fixtures sintéticas identificadas, sem inferência sobre RTP. Som e música pertencem à Fase 4. Masters PNG, referências pessoais, rejeitados e páginas de revisão não são recursos de runtime.

As resoluções nativas ImageGen variam e algumas são inferiores às metas iniciais do inventário; o manifesto e os prompts registam fontes e dimensões efetivas. A validação de desktop com CPU limitada não substitui uma medição num telemóvel real.

## Resolução e reutilização

| Família | Master nativo gerado | Runtime |
|---|---|---|
| Símbolos, retratos P1–P5, fusões e emblemas | 1254×1254 | 256/320/512 px conforme papel |
| Alter Egos, CALMER/JOINER e avisos | 1448×1086 | 1024×768 |
| Police IDLE/DANCE e moldura do palco | 1254×1254 | 768×768 / 1024×1024 |
| Fundos horizontais e grupo | 1672×941 | 1920×1080 / grupo 1600×900 |
| Fundos verticais | 941×1672 | 1080×1920 |
| Suporte da marca | 1774×887 | 1200×600 |

As metas de masters 4K do inventário não foram atingidas pela ferramenta. Há ampliação ligeira dos fundos; não se declara resolução nativa 4K. A moldura do palco tem três aliases para os outros modos. Os ícones derivam do Distintivo em três tamanhos. Introduções/retrigger/resumo partilham a moldura de aviso e os emblemas; os escalões/MAX e Total Chemistry combinam a moldura de celebração com HTML/CSS. Os efeitos dos poderes e fusões são composições animadas, sem uma sequência raster distinta por evento.

B verificou dimensões, alpha real e margem mínima de 9% nos recursos transparentes; 163 ligações dos prompts resolvem. Dois rejeitados ficaram fora de `ui/art/`. Não há peças de runtime em falta no catálogo contratado; os reusos acima são intencionais.

## Capturas finais

[Desktop — fusão WEED + ALCOOL](../../test-results/art-moment-landscape-fusao-SLOW_DISASTER.png) · [Vertical — WEED + COPIUM](../../test-results/art-moment-portrait-fusao-NEVER_ENDING_DREAM.png) · [Horizontal compacto — Joiner](../../test-results/art-moment-compact-joiner.png).

[Índice dos 87 momentos](../../test-results/art-moments.json) e [prancha das fusões e emblemas](../../test-results/art-review-lote4-final-1.png). Os cenários forçados são diagnósticos locais.

No QA foram corrigidos o crescimento vertical do registo/estado PARTY, a moldura escondida pela grelha, a hachura neutra dos cantos, o corte das compras em vertical, a altura do resumo em compacto e o emblema da introdução antes do primeiro step. Não foi necessário alterar contratos do motor.

[Entrada no Police Party](../../test-results/art-moment-portrait-intro-police.png) · [Ganho épico — fixture sintética](../../test-results/art-moment-compact-win-epico.png).

A entrega inicial usava Manrope variável local com licença OFL nos títulos e na interface; a revisão abaixo introduz Oxanium.

## Desempenho medido — entrega inicial

Microsoft Edge 156.0.4314.58 headless, viewport 390×844, CPU limitada a 4× pelo CDP, matemática `pp-v6`, sem outras sessões de teste a correr. Medição por intervalos de requestAnimationFrame e PerformanceObserver, após descodificar a arte; não inclui o carregamento inicial. Comando: `npm.cmd run test:art -- --edge --perf`.

| Caso | Seed / cenário | Velocidade | FPS médio | Frame p95 (ms) | Tarefas >50 ms | Ajustes de layout |
|---|---|---|---:|---:|---:|---:|
| spin | `fase3-perf-spin` | normal | 56,5 | 16,9 | 0 | 0 |
| scatters-5-suspense | `scatters-5` | normal | 57,4 | 17 | 1 | 0 |
| cascatas-19-refills | `fase3-perf-162` | normal | 58,3 | 16,9 | 13 | 13 |
| ganho-grande | `fase3-perf-678` | normal | 58,6 | 16,9 | 8 | 14 |
| bonus-police-ultra | `bonus:police` | ultra | 41,4 | 50,1 | 11 | 10 |

[Dados completos e condições](../../test-results/art-performance.json). O pior cenário fica em **41,4 FPS**, abaixo de 60; os restantes ficam entre 56,5 e 58,6. Não se garante 60 FPS nem equivalência com um aparelho real.

O perfil dirigido encontrou 244 ajustes de layout, com alternância de reforço tipográfico quase idêntico. A histerese de 0,005 e a reutilização das imagens eliminaram essa oscilação; a corrida final de Ultra registou 10 ajustes. Depois da correção foram verificadas as transições 390 vertical → 844 horizontal → 320 vertical → 390 vertical, sem scroll ou corte do palco/barra, além dos nove estados da suite de arte.

A Fase 3 está pronta para revisão final do dono. Esta entrega não constitui aprovação do dono nem publicação.

## Revisão do dono — painéis Acidwave e nomes

05-11-2026: removidos os nomes visíveis dos símbolos da grelha; mantidos multiplicadores e marcas funcionais. Nomes de personagens e fusões continuam nas apresentações. Reforçados os materiais e a cor dos painéis laterais e consola inferior, mantendo controlos e geometria do kit.

Validação desta revisão: suite de arte com 63 recursos e nove estados nos três desenhos passou; zero nomes visíveis na grelha, quatro formatos verificados (1280×800, 390×844, 844×390 e 320×640) sem overflow. Fusão NEVER ENDING DREAM e par WEED + COPIUM continuam visíveis na apresentação. Não se repetiu a medição CPU 4× nesta revisão estática; a tabela acima corresponde à medição anterior.

[Desktop revisto](../../test-results/acidwave-menus-desktop.png) · [Vertical revisto](../../test-results/acidwave-menus-vertical.png) · [Horizontal revisto](../../test-results/acidwave-menus-horizontal.png) · [Fusão com nomes](../../test-results/acidwave-menus-fusao.png).

## Revisão — fonte, correntes, premium e Scatter

05-11-2026: Oxanium variável local aplicada à marca, controlos e valores; Manrope conservada para leitura/fallback. Premium ampliados para preencher a célula e reflexo holográfico estático suave. Histórico/Definições tematizados; no horizontal compacto, utilitários no fundo da coluna esquerda. Sem mudanças de matemática, sessão, carteira ou relógio.

[SYM-LOCK-R2](../../ui/art/sym-lock-r2.webp): correntes cromadas 3D e centro transparente, sem cofre. [SYM-S-R2](../../art-src/production/SYM-S-R2.png): pulseira amarela com detalhes prata e «Scatter» vermelho prismático, conforme exceção expressa do dono. Produzidas com ImageGen integrado; prompts de [correntes](../art/prompts.md#sym-lock-r2) e [Scatter](../art/prompts.md#sym-s-r2), masters PNG em `art-src/production/` e anteriores em `art-src/retired/`.

Validação: fonte WOFF2 local carregada; 19 casos de tamanho (jogo/site) e abertura/fecho de janelas passaram. A suite de arte passou 63 recursos e nove estados nos três desenhos, incluindo premium a preencher a célula e utilitários abaixo da coluna lateral no compacto. Quatro capturas finais sem overflow: [desktop](../../test-results/revisao-final-desktop.png), [vertical](../../test-results/revisao-final-vertical.png), [horizontal](../../test-results/revisao-final-horizontal.png), [320 px](../../test-results/revisao-final-estreito.png). As medições da tabela anterior antecedem esta revisão de fonte e materiais.

Medição final desta revisão: Edge 156 headless, 390×844, CPU 4×, cenário `bonus:police`, Ultra, uma sessão isolada. Registou **23,4 FPS**, frame p95 de 150,1 ms, 53 tarefas longas e sete ajustes de layout em 14,47 s. Os 83 eventos terminaram em PRONTO, com zero erros, zero overflow e 63/63 recursos carregados. Inclui esperas de confirmação da introdução/resumo; não é uma comparação controlada com a tabela inicial. O reflexo holográfico foi integrado no fundo da célula para evitar uma camada adicional. A fluidez deste cenário pesado continua limitada; não se garante 30 ou 60 FPS. [Dados e condições da medição final](../../test-results/revisao-final-performance.json).

## Refinamento Acidwave — pedido integral de 05-11-2026

Implementado o pedido posterior do dono:

- Fechadura central com corpo metálico e argola articulada sobre as correntes existentes. A chave aproxima-se, entra e roda; a argola abre, as duas metades das correntes separam-se e o conjunto desvanece para o CW do evento. Sem GIF ou troca simples de imagem; apenas transform/opacity, pelo relógio existente, com limpeza em `finally`. Movimento reduzido conserva uma transição curta.
- Premium com recorte das margens transparentes até aos limites da célula, mantendo proporções/rostos e reflexo suave. HOLD/STICKY em fitas pequenas, inclinadas e alinhadas, sem nomes sobre os símbolos.
- Rubik Glitch local para títulos expressivos; Oxanium para controlos e valores, Manrope para leitura. Superfícies, cantos, tabs, botões e janelas recebem a mesma linguagem Acidwave. A fonte latina adicional pesa 76 048 bytes; licenças locais. O servidor local passou a servir WOFF. Não há chamadas externas durante o jogo.
- Seleção e confirmação de compra em dialogs independentes, com entrada/saída animadas. Cancelar/Escape regressa à seleção sem débito. Confirmação apresenta nome, custo e aposta; revalida preço, saldo e estado. Uma seleção só pode ser consumida uma vez; botões ainda fechados não confirmam.
- Apenas velocidade Normal: preferências antigas são normalizadas, seletor escondido/desativado e callback protegido. Toques adicionais não aceleram, saltam ou criam fila; tecla mantida não cria jogadas. Kit, relógio partilhado, sessão, carteira e motor mantêm-se intactos.
- Entrada comprada sobre o tabuleiro com cinco colunas em rotação e paragens progressivas. Posições, símbolos em trânsito e tempos variam por id/bónus; exatamente 3/4/5 Scatters fora dos cantos. A sessão já aceitou a compra antes desta apresentação, que não paga e não entra no modelo/RNG. Depois começa a introdução e os free spins reais do motor. Retoma não repete a entrada ou o débito.

Ficheiros principais: [controlador](../../ui/app.js), [peças e composição de entrada](../../ui/acid-symbols.js), [animações](../../ui/fx-visual.js), [pintura dos símbolos](../../ui/art-loader.js), [acabamento visual](../../ui/acid-refinement.css), [dialogs](../../game.html), [regras](../../ui/regras.js) e [servidor local](../../scripts/serve.js). Documentados no [tema](../TEMA.md#14-refinamento-integral-e-entrada-comprada--05-11-2026) e [contrato da interface](../estrutura-ui.md#compra-e-desbloqueio--revisão-acidwave).

Validações executadas:

- `npm.cmd test`: **57 testes passaram**, incluindo carteira, modelo, motor e variedade/repetibilidade das entradas decorativas em 100 ids por bónus. Matemática pp-v6 inalterada, sem calibração ou alegação nova de RTP.
- `npm.cmd run test:acidwave -- --edge`: passou confirmação/cancelamento em 1280×800, 390×844, 844×390 e 320×640; preferência Ultra antiga após reload; três compras reais de teste até ao resumo; exatamente 3/4/5 Scatters; tentativa de confirmação duplicada com um só pedido pago; saldo final exato; chave/correntes, movimento reduzido, toques sem fila e limpeza dos efeitos. **Zero erros de JavaScript/HTTP**. [Resultados](../../test-results/acidwave-review.json).
- `npm.cmd run test:art -- --edge`: 63 recursos/60 WebP e nove estados nos três desenhos passaram, sem overflow; integração premium, wilds e movimento reduzido.
- Caso existente de menus: regras/tabs, histórico, definições, compra/cancelamento, áudio e autoplay passaram no Edge. Verificações dirigidas adicionais: foco inicial em cancelar, fonte expressiva carregada, preço alterado e saldo insuficiente recusados sem pedido pago. Kit e documentação validados.

Capturas: [confirmação desktop](../../test-results/acidwave-confirm-1280.png), [390 px](../../test-results/acidwave-confirm-390.png), [horizontal](../../test-results/acidwave-confirm-844.png), [320 px](../../test-results/acidwave-confirm-320.png), [entrada com cinco Scatters](../../test-results/acidwave-purchase-spin.png), [desbloqueio em curso](../../test-results/acidwave-unlock.png), [premium/STICKY](../../test-results/acidwave-premium.png), [Party vertical](../../test-results/art-portrait-party.png).

Desempenho dirigido desta revisão: Edge 156 headless, 1280×800, sem limitação de CPU. A entrada POLICE PARTY em Normal registou **59,3 FPS médios em 160 intervalos**; AFTERPARTY/VIP foram verificados com movimento reduzido. Heap observado antes/depois de uma compra completa: cerca de 2,3 → 4,8–5,0 MB; DOM 434 → 482–495 nós, incluindo o registo final do bónus. Não são medições de fuga de memória nem prova de estabilidade prolongada; os efeitos transitórios terminaram sem resíduos. Não foi repetido o perfil CPU 4× nem testado um telemóvel físico. A medição anterior em Ultra é histórica, pois esse modo foi removido; não se garante 60 FPS em aparelhos reais.

Preview local atualizado em 4177. Sem commit, publicação ou alterações de matemática.

## Joiner Wild, imagens de bónus e leitura das fusões — 05-11-2026

DW mantém a matemática do Distintivo, mas passa a ser o retrato próximo da pessoa de `INSPIRATION/PEACE_POLICE_PERSONAGEM/`, com roupa violeta e moldura lima. JOINER/WILD é texto HTML funcional, legível e separado do multiplicador. [Master novo](../../art-src/production/SYM-DW-R2.png), [WebP 320²](../../ui/art/sym-dw-r2.webp), 42 416 bytes. Gerado com ImageGen integrado; [prompt exato e referências](../art/prompts.md#sym-dw-r2). Catálogo: mesmos 63 IDs/60 ficheiros carregados, agora 4 019 620 bytes WebP.

Introduções dos três bónus apresentam os retratos, nomes e poderes das personagens realmente ativas no primeiro evento do motor, incluindo estado vazio. Fusões ativas na introdução têm descrição. As dez fusões passam a apresentar o par ilustrado, o efeito e os limites configurados; a apresentação aguarda CONTINUAR sem timeout. Regras e apresentações partilham [fusion-copy](../../ui/fusion-copy.js), evitando explicações divergentes. Movimento reduzido conserva a leitura manual. Dialogs adaptam-se ao viewport e permitem scroll vertical em ecrãs baixos. Motor, tabelas, carteira e relógio não mudaram.

Validação: 57 testes de lógica passaram; [teste dirigido de briefings](../../tests/briefing.browser.js) passou os dez cenários reais de fusão, presença de duas imagens, pausa de leitura e continuação; estado inicial real dos três bónus comparado com os cartões; Joiner com imagem/rótulo/multiplicador em 1280×800, 390×844, 844×390 e 320×640. Zero erros de consola/JavaScript. [Resultados](../../test-results/briefing-review.json). Explicação FROZEN REALITY também verificada em 390/844/320 px, com botão acessível e sem overflow horizontal. Sem nova medição de FPS nem publicação.

Capturas: [Joiner no tabuleiro vertical](../../test-results/briefing-joiner-390.png), [introdução de bónus](../../test-results/briefing-bonus-vip-390.png), [fusão com LCD + WEED](../../test-results/briefing-fusion-desktop.png), [fusão no telemóvel](../../test-results/briefing-fusion-390.png).

## Clareza das imagens 1–8, velocidades e Party contínuo — 05-11-2026

Pedido implementado sobre a matemática **pp-v7 já existente**, sem editar motor ou tabelas nesta revisão:

- Poderes inativos em cinzento, ativos na sua cor e marca visual; resumos curtos em lugar de DESPERTO-PARTY e listas repetidas. Chemistry centrado e hierarquizado. A dica Total Chemistry lê o incremento atual dos cantos, sem repetir o antigo ×2.
- Peace Police passa a rosto/busto próximo, reutilizando a arte de identidade autorizada em vez da figura de corpo inteiro minúscula.
- Quatro cadeados visíveis na entrada comprada, com reação de brilho/movimento. Não se inventam desbloqueios: os cantos abertos vêm da grelha real do primeiro free spin.
- Regras do bónus em área própria, com Fusão Ativa como indicação curta. A explicação detalhada é um ecrã separado, com o par ilustrado, efeito, funcionamento, condições e duração.
- Cada fusão é explicada uma vez no bónus, incluindo as que já entram ativas. Retoma guarda apenas flags de apresentação por id da jogada em sessionStorage; nova jogada limpa-as. Todas as ativações atualizam o indicador ilustrado abaixo da grelha, sem retratos grandes a tapar reels. No jogo base cada ocorrência continua anunciada/explicada.
- Seletor **Normal/Rápido/Turbo** recuperado, com taxas 1/2/5, guardadas e alteráveis durante o spin. Turbo conserva o identificador interno `ultra`; o kit mantém-se intacto. Não se saltam eventos, alteram resultados ou reintroduzem filas por tecla mantida.
- POLICE PARTY apresenta uma ativação inicial de Party e conserva o estado visual entre spins. Os eventos reais Joiner/Party e o novo DW de cada spin continuam intactos. Não houve alteração matemática: o motor já aplica Party antes das cascatas em todos os spins deste bónus. Degradê e indicador usam as duas cores do par ativo.
- Registo com miniaturas/multiplicadores contidos nas linhas, cálculos em coluna própria, chips organizados e scroll local. W/CW identificados como WILD; DW continua JOINER WILD. O copo W recebeu [arte tangerina R2](../../ui/art/sym-w-r2.webp), 30 164 bytes, com [master](../../art-src/production/SYM-W-R2.png) e [prompt exato ImageGen integrado](../art/prompts.md#sym-w-r2). W continua wild normal; N2 continua shot pagante. Catálogo atual: 63 IDs, 60 ficheiros carregados, 4 028 732 bytes WebP.

Validação executada: **64 testes lógicos passaram**, incluindo regressões de motor/carteira pp-v7 e memória de UI; três casos dirigidos da memória/descrições repetidos após completar os textos; kit intacto. Suite de arte passou 63 recursos e nove estados nos três desenhos. Menus e seletor real foram verificados no Edge. Quatro formatos de bónus e explicações longas inspecionados, incluindo 320 px e horizontal; ação CONTINUAR acessível e sem overflow horizontal. A última compactação do texto móvel foi inspecionada em 390×844. Movimento reduzido mantém leitura manual.

O [teste de clareza](../../tests/clarity.browser.js) apresentou os mesmos resultados reais nas três velocidades: no jogo base, 14 eventos e 1 370 milésimos em todos; no POLICE PARTY, 83 eventos e 7 785 milésimos em todos. O anúncio Party apareceu uma vez e não houve OFF entre spins. Repetição final dos bónus: cerca de **34,2 s / 18,1 s / 4,5 s** em Normal/Rápido/Turbo, com confirmações automatizadas; são durações deste cenário local, não FPS ou garantias num aparelho. [Resultados completos](../../test-results/clarity-review.json) e [repetição final](../../test-results/clarity-bonus-review.json), ambos sem erros.

Regressão real de repetição, seed **ui-repeat-3**, modo buy-police: TOTAL MAYHEM disparou duas vezes; a explicação apareceu uma vez. ONE MORE ROUND e RAVE DIMENSION apareceram uma vez cada; cinco atualizações do indicador, incluindo a fusão inicial. Ver [evidência](../../test-results/clarity-repeat.json). Compra local verificada com quatro cadeados e dois ecrãs independentes de bónus/fusão. Sem consultas cloud, medição nova de RTP, deploy ou teste em telemóvel físico.

Capturas: [estado do bónus desktop](../../test-results/clarity-bonus-1280.png), [móvel final](../../test-results/clarity-mobile-final.png), [horizontal](../../test-results/clarity-bonus-844.png), [cadeados na compra](../../test-results/clarity-purchase-locks.png), [explicação completa](../../test-results/clarity-explanation-390.png), [copo WILD](../../test-results/clarity-cup-wild.png).
