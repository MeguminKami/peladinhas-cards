# GUIA DO PROJETO — PEACE POLICE: THE AFTERPARTY

> **Lê isto primeiro.** Este é o ponto de partida de qualquer sessão de trabalho neste jogo, seja tua, minha ou de um agente. Diz em que fase estamos, o que já está decidido, o que falta decidir e onde está cada coisa. Se algo aqui contradisser outro ficheiro, **vale este guia**, e o outro ficheiro tem de ser corrigido.

---

## 1. O jogo numa frase

Slot de clusters num palco 3–5–5–5–3. Cinco personagens de festa despertam poderes únicos que se **fundem** entre si. Os cantos abrem com wilds multiplicadores. O **Peace Police** ou acalma a festa ou entra nela, e quando entra é a loucura. Há três bónus por 3, 4 e 5 Scatters.

**Fantasia central:** *a festa vai crescendo.*

---

## 2. Onde está cada coisa

| Ficheiro | O que é | Quem mexe |
|---|---|---|
| `GUIA-DO-PROJETO.md` | Este guia: estado, decisões, inputs das fases | Dono do jogo (e Claude, quando registar decisões) |
| `docs/GDD.md` | **Design completo V2**: regras, poderes, fusões, bónus, arte, som | Só muda com uma decisão registada (§5) |
| `docs/historico/GDD-V1.md` | Conceito original, só para consulta | Ninguém |
| `guides/00-LEIA-PRIMEIRO.md` | Pipeline genérico das 4 fases e contrato de pastas | Partilhado entre slots |
| `guides/1…4-*.md` | Guia de cada fase, para entregar a um agente | Partilhado entre slots |
| `guides/kit/` | Barra de controlos padrão (igual em todas as slots) | Só no kit, nunca na cópia |
| `AGENTS.md` | Contrato fixo do jogo e forma de trabalhar | Só o dono (o agente segue-o) |
| `README.md` | Comandos (`npm run sim`, `npm run tabelas`, `npm run round`…) e onde mexer | Fase 1 |
| `tabelas/*.js` | **Todos os valores** da matemática: pesos, pagamentos, poderes, fusões, Peace Police, bónus, preços | Claude, a pedido do dono |
| `src/` | Motor puro (regras), validação das tabelas, simulação | Claude, a pedido do dono |
| `scripts/` | Simulador, visualizador de jogadas, impressão das tabelas | Claude |
| `tests/` | Testes do motor (`npm test`) | Claude |
| `relatorios/` | Saída das tuas simulações (CSV e JSON) | O simulador |
| `docs/matematica.md` | Regras exatas tal como o motor as faz, RTP medido e decisões da Fase 1 | Claude |
| `docs/eventos.md` | Catálogo de eventos e API para a Fase 2 | Claude |
| `game.html`, `ui/` | GUI de teste (Fase 2): jogo jogável, sessão/carteira, pontos de ligação `ui/fx-visual.js` e `ui/fx-audio.js` | Claude (Fase 3/4 substituem os pontos de ligação) |
| `docs/estrutura-ui.md` | Estrutura da interface, `ctx` dos pontos de ligação, máquina de estados, protocolo da carteira | Claude |

**Nota sobre caminhos:** os guias referem `games/guias-slot/kit/`. Neste jogo, o kit está em `guides/kit/`, e o comando de verificação é `node guides/kit/verificar-kit.mjs .`

---

## 3. Estado atual

| Fase | Estado | Entrega |
|---|---|---|
| 0 — Design | ✅ **Concluída** (V2, 03-11-2026) | `docs/GDD.md` |
| 1 — Matemática e motor | 🔧 **Entregue, em afinação pelo dono** (03-11-2026) | motor, tabelas, simulador, RTP medido: `README.md`, `docs/matematica.md` |
| 2 — GUI de teste | 🔧 **Entregue** (03-11-2026), por rever pelo dono | `npm run dev` → `game.html`; `docs/estrutura-ui.md` |
| 3 — Visuais e animações | ⏳ | arte e animações |
| 4 — Som e música | ⏳ | áudio completo |

**Agora:** a Fase 2 está entregue: joga em `npm run dev` (e `?debug=1` para o diagnóstico) e diz o que mudar. A afinação da matemática continua em paralelo (`npm run sim`); a interface lê tudo da configuração e dos eventos, por isso acompanha as mudanças sem trabalho extra. Continuam por aprovar as decisões D2, D5–D8, D12 e D13 (`docs/matematica.md` §17). A integração no casino Peladinhas fica para depois.

---

## 4. Contrato fixo (não se mexe para calibrar)

A Fase 1 copia esta lista para o `AGENTS.md`.

1. Grelha **3–5–5–5–3**: 21 células iniciais e 4 Party Corners que podem abrir até 25.
2. **Cluster Pays ortogonal, 4+**, com cascatas. As diagonais não ligam (só o rasto do ALCOOL anda em diagonal).
3. **10 símbolos pagantes:** 5 baixos (N1–N5), cada um ligado a uma personagem, e 5 premium (P1–P5, as personagens). Mais W, CW, DW e S.
4. **Despertar = cluster 5+ de um premium.** Uma vez por spin no jogo base. No bónus fica desperto até ao fim.
5. **Cinco poderes com verbos e momentos distintos:** LCD transforma, WEED cresce, MDMA junta, ALCOOL deixa um rasto de wilds em diagonal, COPIUM dá um respin no fim. Cada poder usa o **seu símbolo baixo** como matéria-prima.
6. **Party Mode** = versão máxima de cada poder, ativada pelo Joiner.
7. **Fusões:** cada despertar a partir do segundo gera **exatamente uma fusão** (com o parceiro de ranking mais alto). A fusão **substitui** o poder normal. Há 10 fusões com efeitos próprios.
8. Níveis de Chemistry: 3 → abrem 2 cantos; 4 → abrem todos; 5 → Total Chemistry.
9. **Os cantos abrem com um Wild de Canto ×2 sticky** que ganha +1 por cada prémio em que participa.
10. **Peace Police:** no máximo 1 aparição por spin. O **Calmer** prende os baixos e fecha a escalada, sem nunca tirar prémios. O **Joiner** ativa o Party Mode e deixa cair o **Distintivo** (wild multiplicador).
11. **Três bónus:** 3 S AFTERPARTY, 4 S VIP AFTERPARTY, 5 S POLICE PARTY, com diferenças no estado inicial e na persistência (tabela no GDD §07). **No POLICE PARTY, o Joiner entra em todos os spins.**
12. Os multiplicadores dos wilds **somam** dentro de um cluster.
13. As probabilidades **nunca** dependem do saldo, das perdas ou do histórico do jogador.
14. O resultado nasce dos símbolos. Não se sorteia o prémio para depois fabricar a grelha.
15. Créditos fictícios. Português de Portugal.
16. Não se mostram objetos de consumo, preparação nem dosagens. As personagens são caricaturas.
17. **RTP 97–98 %** em cada modo (base, aposta extra e cada compra). **Volatilidade alta.**
18. **Ganho máximo 10 000×** a aposta por jogada completa, bónus incluído.
19. **Compras dos 3 bónus** (AFTERPARTY, VIP, POLICE PARTY), com preço calculado a partir do valor medido.
20. **Aposta extra «mais Scatters»:** custo 1,4× a aposta base (provisório; era 1,5×), com mais Scatters a cair. Os prémios são calculados sobre a aposta base.
21. Ordem de raridade: P1 WEED · P2 ALCOOL · P3 COPIUM · P4 MDMA · **P5 LCD** (a mais rara e a mais forte).
22. **Sem wilds naturais no jogo base.** Os wilds nascem só dos poderes, dos cantos e do Peace Police.
23. **10 free spins nos 3 bónus.** A diferença está no estado inicial e na persistência.
24. Integração com o **casino Peladinhas** (carteira Djabucoin).

---

## 5. Registo de decisões

Cada mudança de design entra aqui primeiro e depois no GDD. Formato: data — decisão — porquê.

| Data | Decisão | Porquê |
|---|---|---|
| 02-11-2026 | Conceito V1: 5 personagens, Party Stage, Chemistry, Peace Police, Afterparty | Ponto de partida |
| 03-11-2026 | Os baixos passam a estar ligados tematicamente às personagens e são a matéria-prima dos poderes | Dar valor aos baixos e ligar o tema à mecânica |
| 03-11-2026 | Os poderes foram redesenhados para serem distintos (transformar / crescer / juntar / rasto diagonal / respin) | Na V1, WEED≈COPIUM e MDMA≈ALCOOL |
| 03-11-2026 | Os poderes procuram ativamente valor | Entretenimento: o jogador tem de sentir o poder |
| 03-11-2026 | O Calmer arruma (prende os baixos), não castiga, e estabiliza o RTP. **O Joiner é a loucura** | Pedido do dono: «quero loucura quando ele se junta às drogas» |
| 03-11-2026 | Os cantos abrem com um Wild de Canto multiplicador que cresce | Os cantos têm de ser essenciais para as vitórias grandes |
| 03-11-2026 | Três bónus por 3/4/5 Scatters com um salto de potencial notável. As personagens persistem no bónus | A festa cresce; cada nível tem de se sentir diferente |
| 03-11-2026 | Fusões reais (efeito novo), não uma sequência de dois poderes, com antecipação visível na barra | O jogador tem de antecipar o que aí vem |
| 03-11-2026 | O Peace Police deixa de ser «não necessário para grandes prémios»: o Joiner passa a ser o caminho principal | Consequência da decisão anterior sobre o Joiner |
| 03-11-2026 | RTP 97–98 %, volatilidade alta, ganho máximo 10 000× | Decisão do dono |
| 03-11-2026 | Compras dos 3 bónus; aposta extra «mais Scatters» (≈1,5×) | Decisão do dono |
| 03-11-2026 | P5 = LCD; integração com o casino Peladinhas | Decisão do dono |
| 03-11-2026 | Aprovadas: 1 fusão por despertar, re-disparo do poder no bónus, sem wilds naturais, 10 spins em todos os bónus | Decisão do dono |
| 03-11-2026 | **Forma de trabalhar da Fase 1:** o dono corre as simulações no terminal (250 000 base e hunt, 50 000 por compra) e pede as mudanças; o Claude muda tabelas ou lógica, sobe a versão e testa. Tabelas separadas do código e sempre legíveis | Decisão do dono |
| 03-11-2026 | Fase 1 entregue (`pp-v1`) com calibração inicial. Decisões técnicas da Fase 1 por aprovar: ver `docs/matematica.md` §17 | Entrega da Fase 1 |
| 03-11-2026 | Aprovado: mínimo de 3 símbolos reais por cluster; empilhamento na geração; preços e tetos dos cantos recalculados | Decisão do dono (D1, D4, D9, D10) |
| 03-11-2026 | **Grupo sticky paga uma vez pelo tamanho final** (com os multiplicadores desse momento), quando para de crescer ou no fim do spin. O cluster que o cria também não paga logo | Decisão do dono: «está a crescer para pagar mais» |
| 03-11-2026 | **Vários Scatters por coluna** | Decisão do dono: aproxima a frequência do VIP e do POLICE PARTY |
| 03-11-2026 | Fase 2: os eventos do motor ganham informação só para a interface (`grid.drop.mult`, `symbol` nos movimentos do MDMA e no crescimento dos grupos, início dos grupos do FROZEN REALITY). Resultados iguais, sem mudar `MATH_VERSION` | Aprovado pelo dono: a interface não deduz nada |
| 03-11-2026 | **Os wilds contam por inteiro** nos clusters (basta 1 símbolo real; substitui o «mínimo de 3 reais» do D1). Os wilds que ficam presos chamam-se **HOLD wilds**: ficam até entrarem num prémio e saem com o cluster. Recalibrado em `pp-v3` (pagamentos comprimidos nos tamanhos grandes, aposta extra 1,4×, preços 53 / 128 / 687) | Decisão do dono: «o cluster paga com wilds, é para isso que o WILD serve» (num spin com o tabuleiro cheio de wilds e 2 ALCOOL, pp-v2 pagava 0) |
| 03-11-2026 | Revisão da GUI de teste: no bónus a coluna da esquerda passa a ser um **registo do free spin** (limpa em cada spin: prémios com o símbolo e o cálculo «3,40 × 4 = 13,60», despertares, fusões, Peace Police, Distintivo, cantos) com o contador e o ganho do bónus por cima; o MAIS SCATTERS e as compras desaparecem no bónus; as cartas de Chemistry passam para a direita do palco com a dica do próximo nível por baixo; Party Mode = néon à volta do palco (ligado/desligado); saem o painel Aposta/Custo/Ganho, a faixa de narração e «Créditos fictícios · versão» do topo; a **barra do kit ganha APOSTA** à direita do GANHO (vale para todas as slots) | Pedido do dono |
| 03-11-2026 | Fase 2 só dentro do jogo: `HostSession` e carteira simulada feitos; a ligação ao casino (ficheiros do site) fica para depois | Decisão do dono |

---

## 6. Decisões em aberto

**Por aprovar pelo dono:** as decisões D5–D8, D12 e D13 de `docs/matematica.md` §17 (D1, D2 (HOLD wilds), D3, D4, D9, D10 e D11 já estão decididas). Cada uma está numa tabela e pode ser revertida.

**Afinação contínua** (o dono pede, o Claude muda): pesos, empilhamento, pagamentos, poderes, fusões, Peace Police, cantos, Distintivo, bónus, preços e custo da aposta extra. Estão todos em `tabelas/` (`npm run tabelas`).

---

## 7. Inputs pré-preenchidos para cada fase

### 7.1 Input da Fase 1 (`guides/1-MATEMATICA-E-MOTOR.md`)

```text
NOME DO JOGO: PEACE POLICE: THE AFTERPARTY
PASTA DO JOGO: games/piece-police
IDEIA EM 2-3 FRASES: Slot de clusters num palco 3-5-5-5-3 com cinco personagens de festa que
despertam poderes únicos e se fundem entre si. Os cantos abrem com wilds multiplicadores. O Peace
Police ou acalma a festa (Calmer) ou entra nela (Joiner, Party Mode + Distintivo multiplicador).
Três bónus por 3/4/5 Scatters. Especificação completa em docs/GDD.md (é contrato).

GRELHA: 5 colunas com alturas 3-5-5-5-3 numa área 5x5; cantos (0,0) (4,0) (0,4) (4,4) fechados no início; até 25 células
SISTEMA DE PAGAMENTO: clusters, mínimo 4 ligados na horizontal/vertical; diagonais não contam
CASCATAS / TUMBLE: sim; os vencedores saem (exceto sticky) e os símbolos novos caem pelo topo de cada coluna
SÍMBOLOS NORMAIS (comum -> raro): N1 Lava lamp, N2 Copo de shot, N3 Raspadinha, N4 Coluna de som, N5 Prisma
SÍMBOLOS PREMIUM (comum -> raro): P1 WEED, P2 ALCOOL, P3 COPIUM, P4 MDMA, P5 LCD (fixo)
WILD: W criado só por poderes (sem wilds naturais na base, fixo); CW Wild de Canto x2 sticky, +1 por
prémio, máx. x10; DW Distintivo x2-x5 sticky (Joiner); multiplicadores somam dentro do cluster
SCATTER: S Pulseira VIP, máx. 1 por coluna, protegido, contado no fim do spin; 3/4/5 -> três bónus; não paga sozinho
PODERES / MECÂNICAS ESPECIAIS: despertar com cluster 5+ de premium; 5 poderes, Party Mode, 10 fusões,
níveis de Chemistry, Party Corners, Peace Police Calmer/Joiner — fichas completas em docs/GDD.md §03-§06
MULTIPLICADORES: só nos wilds CW e DW; somam; CW cresce +1 por participação; Total Chemistry duplica-os uma vez
BÓNUS / FREE SPINS: AFTERPARTY (3S), VIP AFTERPARTY (4S), POLICE PARTY (5S); 10 spins cada (fixo);
retrigger +5 com 3S (provisório); o que muda em cada um está em docs/GDD.md §07
COMPRAS DE BÓNUS: as 3 (AFTERPARTY, VIP, POLICE PARTY); preço = valor medido / RTP alvo;
ordem de grandeza provisória ~100x / ~300x / ~1000x
APOSTA EXTRA / HUNT / ANTE: «mais Scatters» — custo ~1,5x a aposta base, mais Scatters a cair
(bónus natural ~2x mais frequente, provisório); prémios sobre a aposta base
APOSTAS: 0,10 / 0,20 / 0,50 / 1 / 2 / 5 / 10 / 20 / 50 / 100
RTP ALVO E TOLERÂNCIA: 97%-98% em cada modo (base, aposta extra, cada compra)
VOLATILIDADE PRETENDIDA: alta
FREQUÊNCIAS DESEJADAS (provisórias): pelo menos 1 despertar em ~1 de 4 spins; fusão ~1 em 15;
Peace Police ~1 em 40; AFTERPARTY ~1 em 200; VIP ~1 em 700; POLICE PARTY ~1 em 2500;
valor médio dos bónus a crescer ~x1 -> x3 -> x10
GANHO MÁXIMO: 10 000x a aposta por jogada completa, bónus incluído
O QUE É FIXO: GUIA-DO-PROJETO.md §4 (contrato fixo)
O QUE PODE SER AJUSTADO: pesos, tabela de pagamentos, p das Raspadinhas, p_pp e % Calmer/Joiner por modo,
máximos dos poderes, ranking das fusões, CW máx., intervalo do DW, retrigger, custo/efeito da aposta extra,
preços das compras dentro do RTP alvo
INTEGRAÇÃO: casino Peladinhas (carteira Djabucoin)
OUTRAS REGRAS: as fusões substituem o poder normal; cada despertar a partir do 2.º gera exatamente uma
fusão; Peace Police máx. 1 por spin; o Calmer nunca retira prémios; o limite de segurança anti-loop nunca
corta prémios já determinados
```

**Pedido extra à Fase 1:** além das métricas do guia, mede e reporta a frequência de cada nível de Chemistry (1–5), de cada fusão, de Calmer e Joiner, e a contribuição para o RTP de cada poder, cada fusão, dos CW, dos DW e de cada bónus. São estes números que dizem se o design funciona.

### 7.2 Input da Fase 2 (`guides/2-GUI-DE-TESTE.md`)

```text
PASTA DO JOGO: games/piece-police
INTEGRAÇÃO: casino Peladinhas
SALDO DE TESTE INICIAL: 10 000
NOME DA MOEDA NA INTERFACE: DJC
VELOCIDADES: Normal / Rápido / Ultra
MERCADO REGULADO? não
FUNCIONALIDADES EXTRA DE INTERFACE: barra de Chemistry acima da grelha (5 retratos + slots de fusão
possíveis com o nome visível); área lateral/topo para a entrada do Peace Police; indicador de Party Mode;
multiplicador visível em cada CW e DW; contador de spins e estado inicial de cada bónus; narração curta
de cada evento («LCD transformou», «SLOW DISASTER», «Joiner entrou»); cenários de diagnóstico para cada
poder, cada fusão, Calmer, Joiner, Total Chemistry e cada bónus
```

### 7.3 Input da Fase 3 (`guides/3-VISUAIS-E-ANIMACOES.md`)

```text
PASTA DO JOGO: games/piece-police
TEMA E HISTÓRIA: Afterparty ficcional numa cidade estilizada. Cinco caricaturas de estilos de festa
partilham um palco; um polícia cómico tenta acalmar tudo, ou acaba a dançar com eles.
EMOÇÃO / AMBIENTE: néon underground, energia urbana, humor nonsense, sempre legível
ESTILO GRÁFICO: cartoon adulto expressivo com contornos luminosos (Neon Underground Cartoon)
PALETA: docs/GDD.md §10
REFERÊNCIAS: posters de rave, cartoon adulto, motion de arcade (nada copiado)
DIFERENÇAS VISUAIS ENTRE MODOS: base = clube escuro; AFTERPARTY = madrugada; VIP = dourado e veludo;
POLICE PARTY = luzes de polícia misturadas com néon
NOMES TEMÁTICOS: Party Stage, Alter Ego, Chemistry, Party Corners, Party Mode, Distintivo, 10 fusões (GDD §04)
O QUE NÃO QUERO: objetos de consumo das substâncias, realismo de consumo, estética infantil, marcas reais,
cópias de personagens ou funcionalidades de outras produtoras, flashes intensos sem alternativa
REGISTO DO BÓNUS (pedido do dono): tem de ser visual, não texto: arte do símbolo em cada prémio, retratos/ícones
nas fusões, despertares e Peace Police; o cálculo do prémio (ex.: 3,40 × 4) fica, bem formatado
```

### 7.4 Input da Fase 4 (`guides/4-SOM-E-MUSICA.md`)

```text
PASTA DO JOGO: games/piece-police
DIREÇÃO SONORA: house / breaks / synth originais, com humor rítmico e camadas por evento
INSTRUMENTOS A EVITAR: loops estridentes e incessantes; sirenes realistas agressivas
MÚSICA POR MODO: base clube; AFTERPARTY madrugada; VIP groove mais cheio; POLICE PARTY drop com sirene estilizada
REFERÊNCIAS: assinaturas por personagem em docs/GDD.md §11
FERRAMENTAS DISPONÍVEIS: ElevenLabs (confirmar a chave no .env)
VOLUME GERAL PRETENDIDO: presente
```

---

## 8. Regras de ouro para quem trabalha no jogo

1. **Design antes de código.** Uma regra nova ou alterada entra primeiro no §5 deste guia, depois no `docs/GDD.md`, e só então no motor.
2. **Cada poder tem um verbo.** Se uma ideia nova se parecer com um poder que já existe, reformula-a ou descarta-a.
3. **Um poder que não produz valor está errado.** Mede-se a contribuição de cada poder e fusão para o RTP. Se for quase zero, redesenha-se.
4. **O Joiner tem de ser o momento mais esperado do jogo.** Se as métricas mostrarem o contrário, ajusta-se.
5. **Cada bónus tem de valer claramente mais do que o anterior** (alvo ×1 → ×3 → ×10).
6. **A antecipação é honesta:** mostra o que é possível, nunca finge um «quase».
7. **Nada é dado como feito sem verificação** (testes, capturas, sons ouvidos), como dizem os guias das fases.

---

## 9. Glossário

| Termo | Significado |
|---|---|
| Party Stage | O tabuleiro 3–5–5–5–3 |
| Alter Ego / despertar | Personagem ativada por um cluster 5+ do seu premium |
| Party Mode | Versão máxima de um poder (dada pelo Joiner) |
| Fusão | Efeito novo que substitui o poder quando desperta a 2.ª personagem (ou seguinte) |
| Chemistry (nível) | Número de personagens diferentes despertas |
| Party Corner / CW | Canto que abre com um Wild de Canto multiplicador |
| Distintivo / DW | Wild multiplicador deixado pelo Peace Police Joiner |
| Calmer / Joiner | Os dois modos do Peace Police |
| Total Chemistry | Nível 5: duplica os multiplicadores e repete os poderes em Party Mode |
| AFTERPARTY / VIP / POLICE PARTY | Bónus de 3 / 4 / 5 Scatters |
