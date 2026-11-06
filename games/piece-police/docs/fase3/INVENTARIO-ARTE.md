# Inventário da arte — Fase 3

Lista de **todas** as peças visuais do jogo. O coordenador gráfico mantém esta tabela atualizada: estado, ficheiro e aprovação. Copia-a para `ui/art/manifest.json` à medida que as peças ficam prontas.

**Responsável:**
- **A** — coordenador gráfico
- **B** — agente de arte (imagens)
- **C** — agente de interface e animação (CSS, SVG, `fx-visual.js`)

**Estados:** ⬜ por fazer · 🟨 amostra · 🟦 em revisão · ✅ aprovado pelo dono.

### Estado em 04-11-2026 — etapa 1

Bíblia, referências e **seis folhas aprovadas pelo dono**, com pedido de maior personificação das drogas nos derivados ativos. As folhas fixam identidade e roupa; não são símbolos finais. A amostra de seis peças foi **aprovada pelo dono em 05-11-2026**. Produção dos lotes 1–4 em curso. Prompts e referências em [prompts](../art/prompts.md). As folhas têm fundo opaco intencional e não entram no manifesto publicado. O tamanho gerado é inferior ao master planeado; não foi feito upscale.

| ID | Personagem | Ficheiro | Dimensões reais | Estado |
|---|---|---|---|---|
| CHR-P1-SHEET | WEED | [PNG](../../art-src/characters/CHR-P1-SHEET.png) | 1536 × 1024 | ✅ |
| CHR-P2-SHEET | ALCOOL | [PNG](../../art-src/characters/CHR-P2-SHEET.png) | 1536 × 1024 | ✅ |
| CHR-P3-SHEET | COPIUM | [PNG](../../art-src/characters/CHR-P3-SHEET.png) | 1672 × 941 | ✅ |
| CHR-P4-SHEET | MDMA | [PNG](../../art-src/characters/CHR-P4-SHEET.png) | 1536 × 1024 | ✅ |
| CHR-P5-SHEET | LCD | [PNG](../../art-src/characters/CHR-P5-SHEET.png) | 1536 × 1024 | ✅ com óculos; referência de 240 px |
| CHR-POL-SHEET | Peace Police | [PNG](../../art-src/characters/CHR-POL-SHEET.png) | 1536 × 1024 | ✅ |

### Amostra final — aprovada pelo dono (05-11-2026)

| ID | Ficheiro integrado | Dimensões | Estado |
|---|---|---|---|
| SYM-N1 | [Bob Joint](../../ui/art/sym-n1-approved.webp) | 320² | ✅ |
| SYM-N4 | [Pastilha](../../ui/art/sym-n4-approved.webp) | 320² | ✅ |
| SYM-P1 | [WEED](../../ui/art/sym-p1.webp) | 320² | ✅ folhas e bolha jade |
| SYM-P5 | [LCD base](../../ui/art/sym-p5.webp) | 320² | ✅ |
| SYM-W | [Wild](../../ui/art/sym-w-r2.webp) | 320² | ✅ copo com rasto |
| CHR-P5-PORT | [LCD ativo](../../ui/art/chr-p5-port.webp) | 256² | ✅ retrato e variante ativa de P5 na amostra |

Seis masters PNG gerados de 1254² em `art-src/sample/`; WebP q88 com alpha verdadeiro e margem transparente de pelo menos 8%, peso total **109 834 bytes**. LCD ativo tem óculos fractais, halo cromado e prismas derretidos; no tabuleiro substitui a imagem base quando LCD desperta. WEED tem folhas de cannabis e bolha orgânica. Chemistry conserva nome, poder e estado textual; adormecido atenua a arte, desperto revela-a, Party acrescenta a marca explícita e aura. Ainda faltam os restantes símbolos, retratos, Alter Egos, cenários e animações da série.

**QA local em 05-11-2026:** `npm.cmd test` (53/53) e `npm.cmd run verificar:kit` passaram. `npm.cmd run test:art -- --edge` verifica recursos, decode, dimensões, alpha, margens, troca de P5 ativo, três estados nos três desenhos, integração de WEED/wild e movimento reduzido; capturas em `test-results/art-*.png`. A reviu as capturas de desktop 1280 × 800, vertical 390 × 844 e horizontal 844 × 390. Sem overflow após estabilização do layout; etiquetas vazias não desenham marcas sobre a arte.

A suite de interface existente terminou **14 ok, 0 falhas**, usando o executável Edge instalado em substituição local do browser no arranque, sem alterar o script da suite. O comando normal `npm.cmd run test:ui` continua a requerer o Chromium do Playwright (`npx.cmd playwright install chromium`). Não se instalou browser nem se leu cloud. Pipeline de manifesto, `decode()` e progresso ativo para as seis peças; recursos em falta continuam com fallback textual. Sem FPS medidos ou aprovação final da Fase 3.

**Pipeline** (guia 3, §2):
- Os masters em PNG ficam em `art-src/`, que não é publicado.
- Em `ui/art/` fica só o WebP publicado:
  - símbolos com 320 px de lado, qualidade 88;
  - emblemas com 512 px;
  - cenários no tamanho de apresentação, qualidade 80.
- Texto da interface fica em HTML. Exceção pedida pelo dono em 05-11-2026: «Scatter» vermelho prismático na pulseira amarela/prata.

Tamanhos de célula atuais (`ui/layout.css`): `landscape` 84 px, `portrait` 72 px, `compact` 64 px. O jogo é escalado, por isso a arte tem de ficar nítida até cerca de 2× a célula.

---

## 1. Símbolos do tabuleiro (B, com integração de C)

| ID | Peça | Master | Publicado | Alpha | Notas |
|---|---|---|---|---|---|
| SYM-N1 | Bob Joint (WEED) | 1024² | 320² | sim | baixo, menta, simples |
| SYM-N2 | Copo de shot (ALCOOL) | 1024² | 320² | sim | bebida permitida na arte privada pelo dono, 04-11-2026; manter silhueta distinta do W |
| SYM-N3 | Cope Cannister, botija de gás (COPIUM) | 1024² | 320² | sim | também precisa de **estado de abertura / revelação** (DREAM GLITCH) |
| SYM-N4 | Pastilha (MDMA) | 1024² | 320² | sim | |
| SYM-N5 | Selo colorido (LCD) | 1024² | 320² | sim | |
| SYM-P1 | WEED — The Chiller | 1024² | 320² | sim | retrato com moldura premium nível 1 |
| SYM-P2 | ALCOOL — The Wildcard | 1024² | 320² | sim | |
| SYM-P3 | COPIUM — The Dreamer | 1024² | 320² | sim | |
| SYM-P4 | MDMA — The Rave Maniac | 1024² | 320² | sim | |
| SYM-P5 | LCD — The Glitch | 1024² | 320² | sim | o mais raro: moldura e brilho máximos |
| SYM-W | Wild normal (copo tangerina / rasto ALCOOL) | master real em produção | 320² | sim | R2: material tangerina/violeta, WILD nítido em HTML; não é uma mecânica Drunk Wild distinta |
| SYM-W-HOLD | Variante HOLD do wild (fica até pagar) | — | overlay | sim | anel ou corrente de néon; pode ser CSS/SVG (C) |
| SYM-CW | Wild de Canto ×N | 1024² | 320² | sim | WILD e multiplicador em HTML separados, moldura/reflexo Acidwave; **4 níveis visuais** (×1–×2, ×3–×5, ×6–×10, ×11–×50) |
| SYM-DW | JOINER WILD ×N (Distintivo) | 1254² | 320² | sim | retrato próximo da pessoa de PEACE_POLICE_PERSONAGEM, roupa violeta e moldura lima; JOINER/WILD e multiplicador em HTML; mesma mecânica DW |
| SYM-S | Pulseira VIP (Scatter) | 1024² | 320² | sim | pulseira amarela, detalhes prata, «Scatter» vermelho prismático no bitmap (exceção do dono); suspense apresentado por C |
| SYM-LOCK | Canto fechado (Party Corner) | 1024² | 320² | sim | correntes cromadas 3D com fechadura central DOM; chave, argola, duas metades das correntes e saída animadas; CW revelado conforme evento |
| SYM-STICKY | Moldura de grupo sticky (WEED, FROZEN, FREEZE) | — | overlay | sim | 3 variantes de cor (bolha esmeralda, gelo violeta, gelo rosa) |
| SYM-ARREST | Marca «preso» do CALMER nos baixos | — | overlay | sim | algemas ou fita de polícia de néon (sem violência) |

## 2. Personagens (B)

| ID | Peça | Master | Publicado | Notas |
|---|---|---|---|---|
| CHR-{P}-SHEET | **Folha de personagem** × 6 (5 personagens + Peace Police) | 3000×2000 | — (não publicada) | rosto da referência de frente e de ¾, corpo inteiro, paleta; **aprovada pelo dono antes de tudo o resto** (`docs/fase3/PESSOAS.md`) |
| CHR-{P}-PORT | Retrato da carta de Chemistry × 5 | 1024² | 256² | estados **adormecido** (dessaturado), **desperto** e **Party Mode** (néon máximo). Pode ser uma imagem com tratamento CSS ou 3 imagens |
| CHR-{P}-ALTER | Alter Ego × 5 (momento do despertar) | 2048×1536 | 1024×768 | o poder personificado (RGB, bolha, rastos, rodopio, nuvem) |
| CHR-POL-IDLE | Peace Police sério, com chapéu e apito | 2048² | 768² | painel da esquerda e entrada |
| CHR-POL-CALMER | Peace Police CALMER («Everybody calm down!») | 2048×1536 | 1024×768 | travagem, coral de aviso |
| CHR-POL-JOINER | Peace Police JOINER («I'm joining the party!») | 2048×1536 | 1024×768 | tira o chapéu, dança, verde-azulado de festa |
| CHR-POL-DANCE | Peace Police a dançar no palco (POLICE PARTY) | 2048² | 1024² | pode ser 2–3 poses em ciclo |
| CHR-GROUP | As 5 personagens juntas (loading, bónus, regras) | 3000×1700 | 1600×900 | key art do jogo |

## 3. Poderes e fusões (B: arte · C: animação)

| ID | Peça | Notas |
|---|---|---|
| PWR-LCD | REALITY BREAK: transforma Selos no premium | split RGB, estilhaços de espelho; Party Mode = mais um tipo |
| PWR-WEED | SLOW MOTION: grupo sticky que cresce | bolha de tempo esmeralda, crescimento visível |
| PWR-MDMA | RAVE RUSH: puxa símbolos iguais para o grupo | rasto elétrico de origem → destino |
| PWR-ALCOOL | DRUNK WALK: rasto diagonal de wilds | passos que tropeçam, wilds pousam um a um |
| PWR-COPIUM | ONE MORE CHANCE: respin no fim | nuvem de sonho; estados armado → respin |
| FUS-01…10 | Emblema de cada fusão × 10 (512²) | NEVER ENDING DREAM, ONE MORE ROUND, SLOW DISASTER, RAVE DIMENSION, TOTAL MAYHEM, FROZEN REALITY, FREEZE & FREAK, DREAM GLITCH, ONE MORE RAVE, DOUBLE VISION. O nome vai em HTML |
| FUS-FX-xx | Efeito de cada fusão no tabuleiro × 10 | ver as fichas em `docs/GDD.md` §04 |
| FUS-SURPRESA | Variante «FUSÃO SURPRESA» | não acorda personagens: entrada sem retrato aceso (p. ex. faísca do palco) |

## 4. Chemistry, cantos e Party Mode (C, com elementos de B)

| ID | Peça | Notas |
|---|---|---|
| CHM-CARD | Carta de Chemistry (moldura) × 5 estados | adormecida / desperta / fundida / Party Mode / dica «falta X → FUSÃO» |
| CHM-LVL-1…5 | Banner de nível: SOLO, DUAL CHEMISTRY, TRIPLE CHEMISTRY, FULL CHAOS, TOTAL CHEMISTRY | o nome vai em HTML; arte de fundo (B) |
| CHM-TOTAL | Momento TOTAL CHEMISTRY (multiplicadores ×2) | o momento mais forte do jogo base |
| CRN-OPEN | Animação de abertura do canto | o canto fechado parte-se → nasce o CW |
| PTY-NEON | Néon «PARTY MODE · ON/OFF» por cima do palco | dois estados; a moldura brilha (estática em movimento reduzido) |

## 5. Cenários, palco e marca (B)

| ID | Peça | Master | Publicado | Notas |
|---|---|---|---|---|
| BG-BASE | Clube underground escuro | 3840×2160 | 1920×1080 + versão vertical 1080×1920 | por trás da grelha: zona calma |
| BG-AFTER | AFTERPARTY: madrugada | idem | idem | |
| BG-VIP | VIP: dourado e veludo | idem | idem | |
| BG-POLICE | POLICE PARTY: sirene + néon | idem | idem | luz em ritmo, com alternativa sem flash |
| STG-FRAME | Moldura do palco 3–5–5–5–3 (× 4 modos) | 2048² | 1024² | os cantos fazem parte do desenho |
| LOGO | «PEACE POLICE» + «THE AFTERPARTY» (letreiro LED) | 2400×1200 | 1200×600 | com Distintivo integrado; variantes horizontal e compacta |
| LOAD | Ecrã de carregamento | — | — | key art + barra de progresso real (C) |
| ICON-APP | Favicon / ícone da app | 1024² | 512², 192², 32² | |

## 6. Bónus, compras e celebrações (B: arte · C: layout e animação)

| ID | Peça | Notas |
|---|---|---|
| EMB-AFTER / EMB-VIP / EMB-POLICE | Emblema de cada bónus (512²) | também nas cartas da janela de compra e nas regras |
| EMB-HUNT | Emblema MAIS SCATTERS (512²) | botão com estado ligado/desligado legível sem cor |
| OVL-INTRO × 3 | Introdução de cada bónus | emblema + nome + 10 FREE SPINS + uma frase sobre o que muda; espera por CONTINUAR |
| OVL-RETRIGGER | «+5 FREE SPINS» | arte própria |
| OVL-SUMMARY | Resumo do bónus | contagem animada |
| WIN-TIER × 3 | GANHO GRANDE (20×), ENORME (50×), ÉPICO (100×) | o contador avança por tempo real; os efeitos evoluem ao passar cada limiar |
| WIN-MAX | MAX WIN 25 000× | painel próprio |
| SCT-CONVERGE | Os scatters convergem ao entrar no bónus | |
| SCT-SUSPENSE | Suspense de scatters por níveis | só quando ainda é possível (guia 3, §4) |
| BUY-SPIN | Spin «teatral» das compras | só apresentação |

## 7. Interface (C, com ícones e texturas de B se for preciso)

| ID | Peça | Notas |
|---|---|---|
| UI-THEME | `ui/theme.css`: tokens, fundos, painéis, botões, estados | identidade néon, contraste AA |
| UI-DECK | `ui/tema-barra.css`: **só variáveis `--deck-*`** | `npm run verificar:kit` tem de passar; não se edita `ui/kit/` |
| UI-ICONS | Sprite SVG: histórico, definições, ecrã inteiro, comprar, info, som, autoplay, velocidade | com um elemento de assinatura (Distintivo ou estrela de néon) |
| UI-FONT | Rubik Glitch em títulos, Oxanium variável em controlos/valores e Manrope para leitura/fallback | WOFF latino + WOFF2 locais em `ui/fonts/`, licenças OFL incluídas |
| UI-TOPBAR | Marca, chip do modo, chip de forçado, botões | |
| UI-SIDE | Coluna esquerda: COMPRAR BÓNUS, MAIS SCATTERS, painel Peace Police | |
| UI-BONUSLOG | **Registo visual do free spin** (pedido do dono) | miniatura do símbolo em cada prémio, retratos nas fusões, despertares e Peace Police, conta «3,40 × 4 = 13,60» |
| UI-DIALOGS | Janelas: compra (3 cartas), regras (ilustradas), histórico, definições | |
| UI-OVERLAY | Moldura dos avisos | |
| UI-RULES-ART | Ilustrações do painel de regras (símbolos, poderes, fusões, bónus) | reutilizam a arte publicada |
| UI-PARTICLES | Partículas: confettis, faíscas, pó de néon, estilhaços | pool e limite (guia 3, §5) |

## 8. Animações (C): um evento, uma animação

Cada evento de `docs/eventos.md` tem uma linha em `docs/visuais-animacoes.md`: animação, duração em Normal, conclusão, Ultra e movimento reduzido.

`step.start` · `grid.drop` · `win.cluster` · `cap.hit` · `multiplier.change` · `persona.awaken` · `fusion.trigger` (normal e **surpresa**) · `grid.remove` · `grid.refill` · `power.reality_break` · `power.slow_motion.start` / `.grow` / `.end` · `power.rave_rush.move` · `power.drunk_walk.step` · `power.one_more_chance.armed` / `.respin` · `wild.place` · `chemistry.level` · `corner.open` · `chemistry.total` · `police.enter` · `police.calmer.arrest` · `police.joiner.party_mode` · `bonus.trigger` · `bonus.retrigger` · `bonus.end` · `safety.stop` · `step.end`

## 9. Fora do âmbito da Fase 3

- Som e música (Fase 4). Não se removem as chamadas a `fx.audio`.
- Matemática (`src/`, `tabelas/`), sessão, carteira e máquina de estados.
- Páginas de teste (`site.html`, `pc.html`, `telemovel.html`, `carteira.html`): só se ajustam se a arte nova as partir.


## 10. Produção após a amostra aprovada

**Lote 1 — 05-11-2026:** 11 peças integradas e revistas por A: SYM-N2, N3, N3-REVEALED, N5, P2, P3, P4, CW, DW, S e LOCK. O catálogo passou a 17 peças (316 478 bytes). `npm.cmd run test:art -- --edge` passou dimensões, alpha, margens e estados nos três desenhos. Capturas revistas: [desktop](../../test-results/fase3-lote1-desktop.png) e [vertical Party](../../test-results/fase3-lote1-portrait.png). Os lotes de retratos, Alter Egos, cenários e emblemas continuam em produção.

**Lote 2 — 05-11-2026:** 13 peças integradas e revistas por A: CHR-P1/2/3/4-PORT, CHR-P1/2/3/4/5-ALTER e CHR-POL-IDLE/CALMER/JOINER/DANCE. O retrato LCD já pertencia à amostra aprovada. Os estados ativos reforçam folhas e fumo jade, bebida tangerina, nuvens royal, corações rosa e distorção violeta, preservando as identidades. [Prancha de revisão do lote](../../test-results/art-review-lote2-1.png). Aprovação final do conjunto ainda depende do dono, após QA.

**Lote 3 — 05-11-2026:** quatro cenários horizontais e quatro recomposições verticais próprias, moldura do palco reutilizada nos quatro modos, suporte de marca sem texto bitmap, key art com as cinco personagens e ícones 512/192/32 derivados do Distintivo. Catálogo: 47 IDs, 44 ficheiros únicos, 3 051 328 bytes. [Prancha dos cenários horizontais](../../test-results/art-review-lote3-parcial-1.png), [verticais e grupo](../../test-results/art-review-lote3-final-1.png) e [integração desktop](../../test-results/c-stage-final-landscape.png). Masters reais variam consoante a saída ImageGen; as dimensões planeadas na tabela são metas, não uma alegação de resolução nativa. O manifesto regista dimensões efetivas e fontes.

**Lote 4 — 05-11-2026:** dez fusões, EMB-AFTER/VIP/POLICE/HUNT, OVL-SUMMARY e WIN-MAX integrados e revistos por A. [Prancha das 16 peças](../../test-results/art-review-lote4-final-1.png). Catálogo completo: 63 IDs, 60 ficheiros únicos, 3 983 324 bytes WebP. As introduções reutilizam os emblemas; retrigger, resumo e escalões reutilizam molduras e composição HTML/CSS, sem duplicar raster. Os quatro modos partilham a moldura do palco com tratamento de cor. O [relatório final](RELATORIO-FASE-3.md) distingue implementação, testes e aprovação do dono.

**QA final — 05-11-2026:** catálogo completo validado; 87 momentos nos três desenhos, 27 avisos repetidos após ajustes, movimento reduzido e aceleração/skip cobertos. Cinco medições finais em Edge/390×844/CPU 4×: 56,5–58,6 FPS em Normal e 41,4 no Police Party Ultra. A oscilação do reforço tipográfico foi corrigida com histerese. Ver testes, limitações e capturas no [relatório final](RELATORIO-FASE-3.md). Estado: pronto para revisão final do dono, sem publicação.
