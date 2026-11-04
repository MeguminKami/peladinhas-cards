# Inventário da arte — Fase 3

Lista de **todas** as peças visuais do jogo. O coordenador gráfico mantém esta tabela atualizada: estado, ficheiro e aprovação. Copia-a para `ui/art/manifest.json` à medida que as peças ficam prontas.

**Responsável:**
- **A** — coordenador gráfico
- **B** — agente de arte (imagens)
- **C** — agente de interface e animação (CSS, SVG, `fx-visual.js`)

**Estados:** ⬜ por fazer · 🟨 amostra · 🟦 em revisão · ✅ aprovado pelo dono.

**Pipeline** (guia 3, §2):
- Os masters em PNG ficam em `art-src/`, que não é publicado.
- Em `ui/art/` fica só o WebP publicado:
  - símbolos com 320 px de lado, qualidade 88;
  - emblemas com 512 px;
  - cenários no tamanho de apresentação, qualidade 80.
- Texto da interface nunca vai dentro dos bitmaps.

Tamanhos de célula atuais (`ui/layout.css`): `landscape` 84 px, `portrait` 72 px, `compact` 64 px. O jogo é escalado, por isso a arte tem de ficar nítida até cerca de 2× a célula.

---

## 1. Símbolos do tabuleiro (B, com integração de C)

| ID | Peça | Master | Publicado | Alpha | Notas |
|---|---|---|---|---|---|
| SYM-N1 | Lava lamp (WEED) | 1024² | 320² | sim | baixo, menta, simples |
| SYM-N2 | Copo de shot (ALCOOL) | 1024² | 320² | sim | ⚠️ adereço de néon sem bebida; validar com o dono (perfil §5) |
| SYM-N3 | Raspadinha «quase» (COPIUM) | 1024² | 320² | sim | também precisa de **estado raspado / revelado** (DREAM GLITCH) |
| SYM-N4 | Coluna de som (MDMA) | 1024² | 320² | sim | |
| SYM-N5 | Prisma / espelho partido (LCD) | 1024² | 320² | sim | |
| SYM-P1 | WEED — The Chiller | 1024² | 320² | sim | retrato com moldura premium nível 1 |
| SYM-P2 | ALCOOL — The Wildcard | 1024² | 320² | sim | |
| SYM-P3 | COPIUM — The Dreamer | 1024² | 320² | sim | |
| SYM-P4 | MDMA — The Rave Maniac | 1024² | 320² | sim | |
| SYM-P5 | LCD — The Glitch | 1024² | 320² | sim | o mais raro: moldura e brilho máximos |
| SYM-W | Wild (copo de néon / rasto) | 1024² | 320² | sim | «WILD» em HTML por cima |
| SYM-W-HOLD | Variante HOLD do wild (fica até pagar) | — | overlay | sim | anel ou corrente de néon; pode ser CSS/SVG (C) |
| SYM-CW | Wild de Canto ×N | 1024² | 320² | sim | o multiplicador vai em HTML; **4 níveis visuais** (×1–×2, ×3–×5, ×6–×10, ×11–×50) |
| SYM-DW | Distintivo ×N | 1024² | 320² | sim | crachá de polícia fictício virado símbolo de festa; o multiplicador vai em HTML; níveis ×2–×5, ×10, ×25, ×50 |
| SYM-S | Pulseira VIP (Scatter) | 1024² | 320² | sim | «SCATTER» em HTML; estado **pousado a pulsar** (suspense) |
| SYM-LOCK | Canto fechado (Party Corner) | 1024² | 320² | sim | placa ou porta fechada do palco; **animação de abrir** (C) |
| SYM-STICKY | Moldura de grupo sticky (WEED, FROZEN, FREEZE) | — | overlay | sim | 3 variantes de cor (bolha esmeralda, gelo violeta, gelo rosa) |
| SYM-ARREST | Marca «preso» do CALMER nos baixos | — | overlay | sim | algemas ou fita de polícia de néon (sem violência) |

## 2. Personagens (B)

| ID | Peça | Master | Publicado | Notas |
|---|---|---|---|---|
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
| PWR-LCD | REALITY BREAK: transforma Prismas no premium | split RGB, estilhaços de espelho; Party Mode = mais um tipo |
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
| UI-FONT | Fonte display condensada (marca, títulos) + fonte de interface com algarismos tabulares | `.woff2` local em `ui/fonts/`, com licença conhecida |
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
