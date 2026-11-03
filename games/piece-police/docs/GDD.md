# PEACE POLICE: THE AFTERPARTY
## Game Design Document — V2.2

**Estado:** design consolidado, pronto para a Fase 1 (matemática e motor)
**Data:** 03-11-2026
**Pasta do jogo:** `games/piece-police`
**Género:** slot de clusters com cascatas, poderes de personagem, fusões e três bónus
**Público:** adulto (18+) · créditos fictícios
**Tagline:** *Five Personalities. One Party. Total Chaos.*

> Este é o documento de design: diz **o que** o jogo é e **como se comporta**. Os números (pesos, tabela, RTP, frequências) são da Fase 1 e vivem em `docs/matematica.md`. Tudo o que aqui estiver marcado **(provisório)** pode ser ajustado na calibração. Tudo o resto é contrato. Para mudar contrato, regista a decisão em `GUIA-DO-PROJETO.md` → «Registo de decisões».

---

# 00. VISÃO

## Pitch
Cinco personagens que caricaturam estilos de festa partilham um palco. Cada uma paga sozinha, desperta um **Alter Ego** e mexe no tabuleiro com um poder que nenhuma outra tem. Quando duas despertam na mesma jogada, os poderes **fundem-se** num efeito novo. Os cantos do palco abrem com wilds multiplicadores. E há o **Peace Police**: às vezes acalma a festa, outras vezes **entra nela**, e é aí que tudo enlouquece.

## Fantasia central
**A festa vai crescendo.** Cada despertar aproxima o jogador da próxima fusão, dos cantos e do Peace Police. Nos bónus, a festa não volta a zero entre rodadas.

## Pilares
| Pilar | Na prática |
|---|---|
| Cinco poderes **realmente diferentes** | Cinco verbos distintos, cada um num momento diferente da jogada (ver §03) |
| Poderes que **dão valor** | Cada poder procura ativamente prémios: junta, cresce, cria wilds, dá mais uma oportunidade |
| Fusões que se **antecipam** | A barra de Chemistry mostra que fusões estão à distância de um despertar |
| **Joiner = loucura** | O Peace Police a juntar-se à festa é o caminho principal para as vitórias grandes |
| Bónus com **saltos notáveis** | 3, 4 e 5 Scatters dão bónus claramente diferentes no estado inicial e na persistência |
| Leitura imediata | Clusters, cascatas e um poder de cada vez, sempre narrados no ecrã |

## Antiobjetivos
- Cinco versões de «aumentar o multiplicador».
- Poderes que só fazem animação e raramente produzem prémio.
- Funcionalidades puramente negativas (o Calmer arruma, não castiga).
- Quase-vitórias falsas: a antecipação mostra só o que é realmente possível.
- Objetos de consumo das substâncias, preparação, dosagens ou realismo de consumo.
- Copiar nomes, matemática ou arte de outras produtoras (xWays, Megaways, Golden Squares, etc.).

## Tema e limites
As personagens são **caricaturas humanas de estilos de festa**, não informação sobre substâncias. «LCD» mantém-se assim escrito. «COPIUM» é o meme da negação otimista. Os poderes são fantasia. Os símbolos baixos são **objetos de ambiente de festa**, nunca parafernália.

---

# 01. TABULEIRO — THE PARTY STAGE

- **5 colunas, alturas 3–5–5–5–3**, numa área de referência 5×5.
- **21 células ativas** no início e **4 Party Corners** fechados: (col 0, row 0), (col 4, row 0), (col 0, row 4), (col 4, row 4).
- Coordenadas `col`, `row`, com origem no canto superior esquerdo (0-based no motor).
- Máximo de **25 células** com os cantos todos abertos.

```text
          c0     c1     c2     c3     c4
   r0    [🔒]   [  ]   [  ]   [  ]   [🔒]
   r1    [  ]   [  ]   [  ]   [  ]   [  ]
   r2    [  ]   [  ]   [  ]   [  ]   [  ]
   r3    [  ]   [  ]   [  ]   [  ]   [  ]
   r4    [🔒]   [  ]   [  ]   [  ]   [🔒]
```

**Cascata nas colunas 0 e 4:** com os cantos fechados, a coluna tem 3 células (r1–r3) e os símbolos novos entram por r1. Um canto aberto é ocupado pelo **Wild de Canto** (§05), que é sticky, por isso a queda continua a entrar pela primeira célula livre não-sticky.

## Pagamento — Cluster Pays
- Grupo de **4 ou mais** símbolos pagantes do mesmo tipo, ligados **na horizontal ou na vertical**. As diagonais não ligam. **Os wilds contam por inteiro**: basta 1 símbolo real para dar o tipo ao cluster (V2.3).
- **HOLD wild:** um wild que fica no tabuleiro através das cascatas até entrar num prémio; quando paga, sai com o cluster (só paga uma vez). Os Wilds de Canto e o Distintivo não são HOLD: ficam até ao fim do spin.
- Os wilds substituem todos os símbolos pagantes (N e P), nunca o Scatter. O mesmo wild pode fazer parte de clusters de tipos diferentes no mesmo ciclo. Um cluster só de wilds não paga.
- Todos os clusters do ciclo são pagos em simultâneo, depois são removidos (exceto os sticky) e há cascata.
- **Multiplicador de um cluster** = soma dos multiplicadores dos wilds multiplicadores que contém (Wild de Canto, Distintivo), com mínimo ×1. Os multiplicadores somam, não se multiplicam entre si.
- A tabela é em × aposta total, por tipo de símbolo e tamanho do cluster (Fase 1).

**Exemplo:** cluster de 7 × P3 que, na tabela (provisória), paga 1,5×. Contém um Wild de Canto ×3 e um Distintivo ×2, por isso o multiplicador é ×5 e o prémio é 1,5 × 5 = **7,5×** a aposta.

---

# 02. SÍMBOLOS

Cada personagem tem **um símbolo baixo próprio**, que é a **matéria-prima do seu poder**: quando a personagem desperta, os seus baixos deixam de ser lixo. A raridade é decrescente de N1 a P5 (N1 é o mais comum). A ordem das personagens está fixa: a mais rara (LCD) tem o poder mais forte.

| ID | Símbolo | Personagem associada | Papel |
|---|---|---|---|
| N1 | Lava lamp | WEED | baixo |
| N2 | Copo de shot | ALCOOL | baixo |
| N3 | Raspadinha «quase» | COPIUM | baixo |
| N4 | Coluna de som | MDMA | baixo |
| N5 | Prisma / espelho partido | LCD | baixo |
| P1 | WEED — The Chiller | — | premium |
| P2 | ALCOOL — The Wildcard | — | premium |
| P3 | COPIUM — The Dreamer | — | premium |
| P4 | MDMA — The Rave Maniac | — | premium |
| P5 | LCD — The Glitch | — | premium (o mais raro) |
| W | Wild (copo de néon / rasto) | criado por poderes | substitui N e P |
| CW | Wild de Canto ×N | Party Corners | wild multiplicador sticky |
| DW | Distintivo ×N | Peace Police (Joiner) | wild multiplicador sticky |
| S | Pulseira VIP | — | Scatter, ativa os bónus |

- **Não caem wilds naturais** (nem no jogo base nem nos bónus). Os wilds nascem dos poderes, dos cantos e do Peace Police, o que dá protagonismo às personagens.
- **Scatter S:** podem cair vários na mesma coluna. É protegido: nenhum poder o move, transforma ou cobre. Não é removido nas cascatas. É contado no fim do spin.

---

# 03. ALTER EGO — DESPERTAR E OS CINCO PODERES

## Despertar
- Um cluster de **5 ou mais** de um premium P*k* (os wilds contam para o tamanho) desperta essa personagem.
- **Jogo base:** cada personagem desperta no máximo **uma vez por spin**.
- **Bónus:** a personagem fica desperta até ao fim do bónus. Cada novo cluster 5+ do seu tipo **volta a disparar o poder** (ver §07).
- Os símbolos baixos pagam, mas não despertam ninguém.

## Momento de cada poder

| Momento na jogada | Poder |
|---|---|
| Logo após o refill da cascata em que desperta | LCD, MDMA, ALCOOL |
| Ao longo das cascatas seguintes | WEED |
| Quando a sequência de cascatas acaba | COPIUM |

## Fichas de poder
Formato: **condição → sorteio → alvo → efeito → duração → limites → sem alvo**. Os valores entre parêntesis são provisórios. **PARTY MODE** é a versão máxima, ativada pelo Joiner (§06).

### LCD — REALITY BREAK *(transformar)*
- **Condição:** LCD desperta.
- **Sorteio:** escolhe o tipo-alvo T = o premium com o maior grupo no tabuleiro depois do refill (em caso de empate, decide o RNG).
- **Efeito:** **todos os Prismas (N5)** do tabuleiro transformam-se em T.
- **Duração:** instantâneo, seguido de reavaliação.
- **Sem alvo:** se não houver Prismas, transforma 2 células baixas aleatórias em T.
- **Party Mode:** também transforma **um segundo tipo de baixo**, escolhido pelo RNG.

### WEED — SLOW MOTION *(crescer)*
- **Condição:** WEED desperta.
- **Efeito:** o cluster que o despertou **não é removido**: fica sticky. Depois de cada refill, as **Lava lamps (N1)** ortogonalmente adjacentes ao grupo convertem-se em P1 e juntam-se a ele. **Enquanto cresce não paga** (nem o cluster que o criou). Quando para de crescer, paga **uma única vez o tamanho final**, com os multiplicadores desse momento.
- **Duração:** enquanto crescer. Na primeira cascata em que não cresce, paga o tamanho final e sai.
- **Party Mode:** o grupo fica sticky até ao fim do spin, mesmo sem crescer, e paga o tamanho final nesse momento.

### MDMA — RAVE RUSH *(juntar)*
- **Condição:** MDMA desperta.
- **Sorteio:** número de movimentos = 1 + número de **Colunas de som (N4)** no tabuleiro (máximo 3).
- **Alvo:** o maior grupo de premium no tabuleiro.
- **Efeito:** cada movimento leva o símbolo igual mais próximo que está fora do grupo para uma célula adjacente ao grupo, trocando de lugar com o que lá estava (de preferência uma Coluna de som).
- **Sem alvo:** se não houver símbolos iguais soltos, as Colunas de som transformam-se no tipo do grupo, até ao número de movimentos.
- **Party Mode:** máximo de 6 movimentos.

### ALCOOL — DRUNK WALK *(rasto de wilds)*
- **Condição:** ALCOOL desperta.
- **Sorteio:** começa num **Copo de shot (N2)** aleatório (se não houver, numa célula normal aleatória). Número de passos = 2 + número de Copos de shot (máximo 5).
- **Efeito:** a personagem cambaleia **sempre em diagonal**, e o RNG escolhe a direção entre as válidas. Cada célula pisada torna-se **W**. É o único elemento do jogo que se move em diagonal.
- **Limites:** não pisa S, CW, DW nem sticky. Para na borda ou num canto fechado. Os W não são sticky.
- **Party Mode:** dois rastos em simultâneo.

### COPIUM — ONE MORE CHANCE *(segunda oportunidade)*
- **Condição:** COPIUM desperta. O poder fica **armado** até a sequência de cascatas acabar.
- **Efeito:** quando já não há mais prémios, guarda o **maior grupo pagante** (2 ou mais células), os especiais e todas as **Raspadinhas (N3)**. As Raspadinhas são «raspadas»: cada uma revela o tipo do grupo guardado com probabilidade *p* (calibração) ou outro símbolo. As restantes células fazem **respin**. Depois avalia e faz cascatas normalmente.
- **Duração / limites:** 1 respin por spin.
- **Party Mode:** 2 respins.

## Party Mode (resumo)
| Personagem | Normal | Party Mode |
|---|---|---|
| LCD | transforma os Prismas | + um segundo tipo de baixo |
| WEED | sticky enquanto cresce | sticky até ao fim do spin |
| MDMA | até 3 movimentos | até 6 movimentos |
| ALCOOL | 1 rasto | 2 rastos |
| COPIUM | 1 respin | 2 respins |

---

# 04. CHEMISTRY — FUSÕES

## Regra de fusão
- **Cada despertar a partir do segundo gera exatamente uma fusão**: entre a personagem que acabou de despertar e o parceiro já desperto com o **ranking de fusão mais alto**.
- A fusão **substitui** o poder normal dessa personagem nesse momento. Não é uma sequência de dois poderes: é um efeito novo.
- Cada par funde no máximo uma vez por spin (no jogo base).

## As dez fusões
| # rank (provisório) | Par | Fusão | Efeito |
|---|---|---|---|
| 1 | WEED + COPIUM | NEVER ENDING DREAM | O respin do COPIUM repete-se **enquanto o grupo guardado crescer** (máximo 5). O grupo fica sticky. |
| 2 | ALCOOL + COPIUM | ONE MORE ROUND | Cada respin que não faz crescer o grupo **deixa um W adjacente** e dá outro respin (máximo 3 extra). |
| 3 | WEED + ALCOOL | SLOW DISASTER | Os W do rasto são HOLD wilds (ficam até pagarem), e o bêbado **dá mais um passo em cada cascata** (máximo 4 extra). |
| 4 | LCD + MDMA | RAVE DIMENSION | Cada símbolo que o MDMA move **deixa uma cópia** na célula de onde saiu. |
| 5 | MDMA + ALCOOL | TOTAL MAYHEM | Depois de cada cascata, os W do rasto **saltam** para a célula que liga dois grupos do mesmo tipo (ou, se não houver, para junto do maior grupo). |
| 6 | LCD + WEED | FROZEN REALITY | As células transformadas pelo LCD ficam sticky até ao fim do spin e crescem como o SLOW MOTION (os baixos adjacentes juntam-se ao tipo T). |
| 7 | WEED + MDMA | FREEZE & FREAK | Enquanto o grupo sticky do WEED existir, depois de cada refill o MDMA **puxa mais um símbolo igual** para ele. |
| 8 | LCD + COPIUM | DREAM GLITCH | No respin só caem símbolos do tipo guardado ou baixos, e as Raspadinhas revelam sempre o tipo guardado. |
| 9 | MDMA + COPIUM | ONE MORE RAVE | No respin, cada símbolo igual ao grupo guardado é **puxado** de imediato para junto do grupo. |
| 10 | LCD + ALCOOL | DOUBLE VISION | Dois rastos de wilds **em espelho**: o segundo é o reflexo horizontal do primeiro (col → 4 − col). |

## Níveis de Chemistry
O nível = número de personagens diferentes despertas (no spin, ou no bónus).

| Nível | Nome | Acontece |
|---|---|---|
| 1 | SOLO | poder normal |
| 2 | DUAL CHEMISTRY | primeira fusão |
| 3 | TRIPLE CHEMISTRY | fusão + **abrem 2 cantos** |
| 4 | FULL CHAOS | fusão + **abrem os restantes cantos** |
| 5 | TOTAL CHEMISTRY | fusão + **todos os multiplicadores do tabuleiro duplicam** (uma vez) e cada personagem desperta volta a disparar o seu poder uma vez, em Party Mode |

## Antecipação (UI)
- A **barra de Chemistry** mostra os 5 retratos. Quando um desperta, acendem-se os **4 slots de fusão possíveis**, com o nome visível: «falta o WEED → SLOW DISASTER».
- O próximo nível (cantos, Total Chemistry) aparece sempre como objetivo seguinte.
- Só se mostra o que é realmente possível nesse estado. Nunca se finge que esteve «quase».

---

# 05. PARTY CORNERS

- Abrem nos níveis 3 e 4 de Chemistry. No nível 3, o RNG escolhe 2 cantos e mostra-os.
- Um canto abre já ocupado por um **Wild de Canto (CW) ×2**, sticky até ao fim do spin.
- **Cada vez que um CW participa num cluster pago, ganha +1** (máximo provisório ×10).
- Os CW são a principal fonte de multiplicador do jogo base, por isso são o setup das vitórias grandes.

---

# 06. PEACE POLICE — CALMER / JOINER

Não é símbolo pagante. Aparece fora da grelha e entra quando há um evento.

## Quando aparece
- Em cada despertar há uma probabilidade *p_pp* (calibração) de o Peace Police aparecer. **No máximo uma vez por spin.**
- Resolve-se depois do poder ou da fusão desse despertar.
- O modo (Calmer ou Joiner) é sorteado com probabilidades documentadas **por modo de jogo** (base e cada bónus). Nunca dependem do saldo, das perdas ou do histórico do jogador.

## CALMER — «Everybody calm down!» *(arruma a festa)*
- **Prende todos os símbolos baixos** do tabuleiro: são removidos, há refill e reavaliação. É um pequeno ganho imediato.
- **Fecha a escalada nesse spin:** acabam as fusões e não abrem mais cantos. Novos despertares continuam a pagar e a usar o poder normal.
- Nunca retira prémios já ganhos nem desfaz cantos já abertos.
- Papel matemático: é o **estabilizador do RTP**, porque corta a cauda explosiva sem castigar.

## JOINER — «I'm joining the party!» *(a loucura)*
- Todas as personagens despertas, e as que despertarem a seguir nesse spin, ficam em **Party Mode** (§03).
- O Peace Police deixa cair **um Distintivo (DW)**, wild multiplicador **×2 a ×5** (sorteado), sticky até ao fim do spin, numa célula adjacente ao maior grupo.
- Se as fusões ainda estiverem por vir, a próxima fusão já corre com Party Mode.
- Visual: tira o chapéu, a paleta muda de azul/vermelho de polícia para o gradiente da festa e entra a dançar.

---

# 07. BÓNUS — 3, 4 E 5 SCATTERS

## Regras comuns
- 3, 4 ou 5 Scatters no fim de um spin base ativam o bónus correspondente.
- **10 free spins** em todos. A diferença entre bónus está no estado inicial e na persistência, não no número de spins.
- **As personagens despertas ficam despertas até ao fim do bónus.** Contam para o nível de Chemistry, e cada novo cluster 5+ do seu tipo volta a disparar o poder.
- **Fusões persistentes:** depois de um par fundir, sempre que uma dessas personagens dispara o poder, dispara-o na forma fundida com o parceiro de ranking mais alto.
- Cantos abertos ficam abertos até ao fim do bónus.
- **Retrigger (provisório):** 3 ou mais Scatters dentro do bónus dão +5 spins. Não sobe de nível de bónus.

## Os três bónus
| | 3 S — **AFTERPARTY** | 4 S — **VIP AFTERPARTY** | 5 S — **POLICE PARTY** |
|---|---|---|---|
| Personagens despertas no início | 0 | 1 (RNG) | 2 (RNG) — fusão já ativa |
| Cantos no início | fechados | 2 abertos | 4 abertos |
| CW entre spins | voltam a ×2 em cada spin | **persistem** | **persistem e começam em ×3** |
| Peace Police | Calmer ou Joiner (como na base) | Joiner mais provável | **Joiner em todos os spins** |
| Distintivo | só via Joiner | só via Joiner | 1 novo em cada spin |
| Sensação | a festa começa | já há ambiente | o polícia entra na festa desde o início |

**Objetivo de calibração:** o valor médio de cada bónus tem de subir de forma clara de nível para nível (ordem de grandeza provisória ×1 → ×3 → ×10 do bónus de 3 S). A Fase 1 mede e ajusta.

## Compras de bónus e aposta extra
- **Compras:** os três bónus podem ser comprados. O preço é calculado a partir do valor medido de cada bónus e do RTP alvo (ordem de grandeza provisória: ~100× / ~300× / ~1000×). Uma compra garante os Scatters correspondentes no spin de entrada.
- **Aposta extra «MAIS SCATTERS»:** custo de ~1,5× a aposta base (provisório). Caem mais Scatters, e o bónus natural fica ~2× mais frequente (provisório). Os prémios são calculados sobre a aposta base. Não acumula com as compras.
- **RTP 97–98 %** em cada modo: base, aposta extra e cada compra.

## Encenação
- **AFTERPARTY:** discoteca escura a passar para luz de madrugada.
- **VIP AFTERPARTY:** zona VIP, cordas de veludo, luz dourada.
- **POLICE PARTY:** luzes de polícia, azul e vermelho, misturadas com néon da festa. O Peace Police fica em palco, sem chapéu, a dançar.

---

# 08. ORDEM DE RESOLUÇÃO DE UM SPIN

```text
SPIN
 1. grid.drop (21 células, ou o estado do bónus)
 2. CICLO:
    a. avaliar clusters (4+), aplicar multiplicadores e pagar
    b. marcar novos despertares (5+ de premium ainda não desperto)
    c. remover vencedores (exceto sticky: grupo do WEED, CW, DW, sticky de fusão)
    d. refill
    e. para cada despertar, pela ordem do pagamento:
         poder normal OU fusão (se for o 2.º despertar ou seguinte)
         → nível de Chemistry → cantos / Total Chemistry
         → Peace Police (se sair; no máximo 1 por spin)
    f. efeitos de cascata contínuos (WEED a crescer, SLOW DISASTER, FREEZE & FREAK, TOTAL MAYHEM)
    g. se houver prémios, voltar a (a)
 3. sequência acabou → COPIUM armado? → respin(s) → voltar a 2
 4. contar Scatters → bonus.trigger
 5. step.end
```

- **Ordem de desempate** quando há vários despertares no mesmo ciclo: pela ordem de pagamento dos clusters (do maior para o menor; em caso de empate, P5 → P1).
- **Anti-loop:** cada efeito tem um máximo explícito (ver fichas). O motor tem também um limite de segurança de subeventos por spin, com teste. **O limite nunca corta prémios já determinados.**
- **Ganho máximo:** limite por jogada completa, bónus incluído: **10 000×**. A ordem é: prémio bruto → multiplicadores → arredondamento → limite.

---

# 09. EVENTOS (proposta para `docs/eventos.md`)

Os eventos genéricos vêm do Guia 1 (`step.start`, `grid.drop`, `win.cluster`, `grid.remove`, `grid.refill`, `scatter.land`, `bonus.*`, `cap.hit`, `step.end`). Eventos próprios deste jogo:

| Evento | Campos principais |
|---|---|
| `persona.awaken` | `persona`, `cluster` |
| `power.reality_break` | `target`, `cells` |
| `power.slow_motion.grow` | `cells`, `newSize` |
| `power.rave_rush.move` | `from`, `to`, `swapped` |
| `power.drunk_walk.step` | `walker`, `cell` |
| `power.one_more_chance.respin` | `held`, `revealed` |
| `fusion.trigger` | `pair`, `fusionId` |
| `chemistry.level` | `from`, `to` |
| `corner.open` | `cell`, `multiplier` |
| `multiplier.change` | `cell`, `from`, `to` |
| `police.enter` | `mode: 'calmer'\|'joiner'` |
| `police.calmer.arrest` | `cells` |
| `police.joiner.party_mode` | `personas`, `badge: {cell, multiplier}` |
| `chemistry.total` | — |

A Fase 1 fecha os nomes e os campos.

---

# 10. DIREÇÃO ARTÍSTICA (base para a Fase 3)

**Estilo:** *Neon Underground Cartoon*. Uma afterparty ficcional numa cidade estilizada: cartoon adulto expressivo, posters de rave, contornos luminosos de arcade. Nada infantil, nada realista em relação ao consumo, nenhuma marca real.

| Finalidade | Cor | HEX |
|---|---|---|
| Fundo noturno | Midnight Ink | `#101224` |
| Superfície da grelha | Deep Plum | `#29243D` |
| Título | Electric Violet | `#B477FF` |
| LCD | Reality Purple | `#A98CFF` |
| WEED | Chill Mint | `#62DCA6` |
| MDMA | Rave Pink | `#FF4FAE` |
| ALCOOL | Wild Amber | `#FFAB52` |
| COPIUM | Dream Blue | `#72CCFF` |
| Joiner | Party Teal | `#48DCC9` |
| Calmer | Warning Coral | `#FF6C78` |
| Texto | Pearl | `#F5F1FF` |

| Personagem | Forma / roupa | Idle | Alter Ego |
|---|---|---|---|
| LCD | angular, assimétrico, óculos geométricos | olha para um duplicado de si | separa-se em imagens RGB |
| WEED | arredondado, casaco largo, postura descaída | boceja e flutua | bolha de tempo esmeralda |
| MDMA | espigado, ténis exagerados, acessórios néon | não para de dançar | rastos elétricos |
| ALCOOL | desequilibrado, gravata torta | quase perde o equilíbrio | tropeça e rodopia, cenário inclinado |
| COPIUM | sorriso teimoso, olhos estrelados, hoodie | jura que vai correr bem | nuvem de sonho |
| PEACE POLICE | agente caricatural, chapéu, apito | fiscaliza, sério | CALMER: travagem · JOINER: tira o chapéu e dança |

- **Baixos:** objetos com a cor da personagem associada, mais simples e menos saturados do que os premium, para a hierarquia se ler à primeira.
- **Acessibilidade:** cada personagem tem silhueta, pose e marca monocromática legíveis a 32 px. Nunca só cor (daltonismo). Há uma alternativa sem flashes para as luzes estroboscópicas.
- **Logótipo:** «PEACE POLICE» condensado e inclinado, com um distintivo de polícia fictício transformado em símbolo de festa. «THE AFTERPARTY» como letreiro LED.

---

# 11. SOM (base para a Fase 4)

- **Direção:** house, breaks e synth originais, com humor rítmico e camadas por evento.
- **Música por modo:** base (clube) → AFTERPARTY (madrugada, camada instrumental) → VIP (mais cheio, groove) → POLICE PARTY (sirene estilizada integrada no drop).
- **Assinaturas por personagem:** LCD (micro-glitches, eco), WEED (low-pass, pad suave), MDMA (breakbeat curto), ALCOOL (percussão desalinhada, objetos a cair), COPIUM (harpa sintética surreal).
- **Peace Police:** Calmer (apito e travagem) e Joiner (scratch e drop). Vozes opcionais e sempre legendadas: «Everybody calm down!» / «I'm joining the party!».
- Nenhum som de vitória para retornos abaixo da aposta.

---

# 12. UX E CONFIANÇA

- Narração curta de cada passo no ecrã: «LCD transformou», «WEED cresceu», «SLOW DISASTER», «3/5 Chemistry», «Joiner entrou».
- As regras são geradas a partir da configuração, com um diagrama por poder e por fusão.
- Botão SKIP e modo de movimento reduzido nas sequências longas (Total Chemistry, Police Party).
- O jogo indica sempre que usa **créditos fictícios**.
- **Para lá da demo:** juntar jogo e nomes de substâncias exige revisão jurídica (SRIJ em Portugal), além das políticas das lojas de apps e das redes de anúncios. Fora de âmbito enquanto o jogo for gratuito.

---

# 13. EM ABERTO (a decidir na Fase 1 ou pelo dono do jogo)

Ver a lista viva em `GUIA-DO-PROJETO.md` → «Decisões em aberto».

---

# HISTÓRICO

| Versão | Data | Mudanças |
|---|---|---|
| V1.0 | 02-11-2026 | Conceito inicial (arquivado em `docs/historico/GDD-V1.md`) |
| V2.3 | 03-11-2026 | Os wilds contam por inteiro nos clusters (1 símbolo real chega); HOLD wild (fica até pagar, depois sai). Matemática `pp-v3` |
| V2.2 | 03-11-2026 | Grupo sticky paga uma vez o tamanho final; vários Scatters por coluna; mínimo de 3 símbolos reais por cluster; empilhamento na geração (decisões do dono na Fase 1) |
| V2.1 | 03-11-2026 | Decisões do dono: RTP 97–98 %, volatilidade alta, ganho máximo 10 000×, compras dos 3 bónus, aposta extra «mais Scatters», P5 = LCD, sem wilds naturais, 10 spins em todos os bónus, casino Peladinhas |
| V2.0 | 03-11-2026 | Símbolos baixos ligados às personagens; 5 poderes redesenhados com momentos distintos; Party Mode; fusões reais com regra de ranking; cantos com Wild de Canto multiplicador; Calmer positivo e Joiner como caminho para a loucura (Distintivo); 3 bónus por 3/4/5 Scatters com persistência; ordem de resolução e eventos próprios |
