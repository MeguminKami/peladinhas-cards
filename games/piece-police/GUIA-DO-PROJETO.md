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

**Fase de som (05-11-2026):** 62 efeitos refeitos e cinco músicas entregues pelo dono integrados localmente. Crossfades de 2 segundos, loops, laboratório e verificações automáticas. Revisão auditiva e aparelhos reais pendentes. Ler [a passagem atualizada](PARA-O-PROXIMO-AGENTE.md) e [o estado sonoro e prompts](docs/sons.md). Não reiniciar a produção visual.

| Fase | Estado | Entrega |
|---|---|---|
| 0 — Design | ✅ **Concluída** (V2, 03-11-2026) | `docs/GDD.md` |
| 1 — Matemática e motor | 🔧 **Entregue, em afinação pelo dono** (03-11-2026) | motor, tabelas, simulador, RTP medido: `README.md`, `docs/matematica.md` |
| 2 — GUI de teste | 🔧 **Entregue** (03-11-2026), por rever pelo dono | `npm run dev` → `game.html`; `docs/estrutura-ui.md` |
| 3 — Visuais e animações | ⏳ | arte e animações |
| 4 — Som e música | 🟨 efeitos e cinco músicas integrados, revisão auditiva pendente | [Estado, validação e prompts](docs/sons.md), [audição local](audio-lab.html) |

**Agora:** Fase 3 implementada e QA local concluído: 63 IDs de arte, 29 apresentações e 87 capturas, com [relatório e medições](docs/fase3/RELATORIO-FASE-3.md). Falta a revisão/aprovação final do dono; sem publicação ou commit. O jogo local continua em `npm.cmd run dev` (e `?debug=1` para o diagnóstico). A afinação da matemática continua em paralelo (`npm run sim`); a interface lê tudo da configuração e dos eventos, por isso acompanha as mudanças sem trabalho extra. Continuam por aprovar as decisões D2, D5–D8, D12 e D13 (`docs/matematica.md` §17). A integração no casino Peladinhas fica para depois.

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
12. Dentro de um cluster, os Wilds de Canto **somam** e o Distintivo do Joiner **multiplica** essa soma (pp-v7), até ao teto do modo.
13. As probabilidades **nunca** dependem do saldo, das perdas ou do histórico do jogador.
14. O resultado nasce dos símbolos. Não se sorteia o prémio para depois fabricar a grelha.
15. Créditos fictícios. Português de Portugal.
16. As personagens são caricaturas. Na arte da versão privada, o dono permite bebidas, drogas e objetos de consumo (04-11-2026); não é autorização de publicação ou distribuição.
17. **RTP 97–98 %** em cada modo (base, aposta extra e cada compra). **Volatilidade alta.**
18. **Ganho máximo 25 000×** a aposta por jogada completa, bónus incluído (pp-v5; era 10 000×).
19. **Compras dos 3 bónus** (AFTERPARTY, VIP, POLICE PARTY), com preço calculado a partir do valor medido.
20. **Aposta extra «mais Scatters»:** custo 1,4× a aposta base (provisório; era 1,5×), com mais Scatters a cair. Os prémios são calculados sobre a aposta base.
21. Ordem de raridade: P1 WEED · P2 ALCOOL · P3 COPIUM · P4 MDMA · **P5 LCD** (a mais rara e a mais forte).
22. **Sem wilds naturais no jogo base.** Os wilds nascem só dos poderes, dos cantos e do Peace Police.
23. **10 free spins nos 3 bónus.** A diferença está no estado inicial e na persistência.
24. Integração com o **casino Peladinhas** (carteira Djabucoin).

---

## 5. Registo de decisões

**05-11-2026 — Músicas entregues e transições suaves:** dono colocou cinco MP3 em ui/audio/music e pediu transições sempre suaves. Integradas por modo com sobreposição de potência constante de 2 segundos, sem parar a faixa atual durante a carga. Junções de loop com sobreposição curta, volume e retoma com rampas. Velocidade e afinação musicais independentes de Normal/Rápido/Turbo. Originais preservados, sem deploy. Ver [sons](docs/sons.md).

**05-11-2026 — Revisão da paleta sonora:** dono rejeitou os efeitos demasiado semelhantes. Substituída a síntese comum por composições explícitas, fontes de materiais e gestos próprios por ID, com arranjos separados para cada fusão. Laboratório passa a comparar personagens e fusões. Continua a ser síntese original, sem gravações ou vozes. Nova aprovação auditiva pendente, sem mudança à integração nem à matemática. Ver [sons](docs/sons.md).

**05-11-2026 — Direção sonora aprovada:** o dono delegou a escolha estética, recusou vozes e escolheu gerar pessoalmente as músicas no Suno com os prompts do agente. Acid house/breaks com intensidade crescente e efeitos irreverentes, sem falas nem sirenes realistas. Autorizou produzir os efeitos de todo o jogo enquanto gera as músicas. Primeira versão com 62 efeitos locais, laboratório e integração nos eventos, sem mudança à matemática. Escuta do dono e mistura final pendentes, ver [sons](docs/sons.md).

**05-11-2026 — Scatter aprovado:** o Passe da Afterparty amarelo reúne os motivos das cinco personagens e Peace Police, com «Scatter» em vermelho. Substitui a pulseira na arte e nos nomes apresentados. Mantêm-se o ID S e as regras atuais: 3 Scatters no bónus dão +5 rodadas grátis, até ao limite configurado. Dois não dão retrigger.

**05-11-2026 — Símbolos baixos aprovados individualmente:** dono aprovou Bob Joint (N1, WEED), Cope Cannister, botija de gás Copium (N3, COPIUM), Pastilha vermelha com «Move» (N4, MDMA) e Selo psicadélico colorido (N5, LCD). Arte e nomes substituídos na apresentação e documentação. IDs, efeitos, pesos e pagamentos preservados. A abertura da botija substitui a linguagem de raspar sem mudar o resultado do COPIUM. A variante revelada reutiliza a botija aprovada.

**05-11-2026 — Clareza das imagens 1–8:** dono recuperou Normal/Rápido/Turbo (1×/2×/5× de ritmo visual), pediu poderes cinzentos/coloridos com resumos, rosto Peace Police visível, cadeados reativos à compra, regras do bónus separadas da fusão, registo sem sobreposições e WILD explícito em W/CW. O copo W continua wild normal e recebe paleta ALCOOL; N2 continua símbolo pagante. Fusões são explicadas uma vez por bónus (incluindo fusões iniciais), com memória visual na retoma; cada ativação tem indicador ilustrado fora da grelha. POLICE PARTY mantém a indicação Party entre spins após a primeira ativação, sem repetir anúncios; o motor já dá Joiner/Party em cada spin. Degradê usa o par da fusão ativa. Matemática pp-v7 preservada.

**05-11-2026 — Joiner e explicações:** dono pediu que o símbolo DW represente a pessoa de PEACE_POLICE_PERSONAGEM e identifique claramente JOINER/WILD. Introduções dos bónus mostram imagens das personagens realmente ativas; fusões mostram retratos, explicação partilhada com as regras e confirmação manual, sem desaparecer durante a leitura. Exceção visual aos nomes escondidos: JOINER/WILD é uma indicação funcional. Matemática pp-v6 e significado de DW mantidos.

**05-11-2026 — Refinamento Acidwave:** dono pediu fechadura central com chave e correntes animadas, premium a preencher as células, títulos mais expressivos, identidade nos menus e confirmação de compra numa janela independente. Velocidade exclusivamente normal: removidos Turbo, Rápido, Ultra, aceleração por toques e repetição por tecla mantida. A compra tem uma entrada visual de 3/4/5 Scatters, sem pagamentos próprios, depois da aceitação da sessão; continua a entrar diretamente nos free spins do motor. A composição decorativa não altera RNG, grelhas, prémios ou versão pp-v6. Ver [estrutura da interface](docs/estrutura-ui.md) e [tema](docs/TEMA.md).

**05-11-2026 — Amostra aprovada:** dono aprovou a amostra final integrada (N1, N4, P1, P5, W e retrato LCD ativo). Iniciada a produção dos quatro lotes e das animações em paralelo; mantém-se a direção de personificação reforçada nos estados ativos e a aprovação final após integração/QA.

**04-11-2026 — Folhas aprovadas:** dono aprovou rostos e arte das seis folhas e pediu maior personificação das drogas, sobretudo com as personagens ativas. As folhas fixam a identidade; não são os símbolos finais. Amostra final em produção (N1, N4, P1, P5, W e retrato ativo LCD), antes de aprovação no tabuleiro e produção em série. Ver `docs/TEMA.md` §6 para as assinaturas por estado.

**04-11-2026 — Fase 3:** dono aprovou a bíblia visual e as referências das seis pessoas («Aprovo tudo»). Autorizou bebidas, drogas e objetos de consumo na arte para uso privado, sem venda nem distribuição, substituindo a restrição visual anterior. N2 mantém copo de shot e W copo/rasto de néon. B inicia seis folhas para revisão e C o pipeline em paralelo; continuam as portas de aprovação das folhas e amostra. Matemática pp-v6 inalterada.

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
| 04-11-2026 | **Nenhum prémio abaixo de 0,10×** e **ecrãs cheios de wilds mais raros e mais bem pagos**: a tabela ganha as colunas 18–20, 21–24 e 25 (×1,5 / ×2,1 / ×4,2 o valor de 15–17); o ALCOOL, o SLOW DISASTER e o TOTAL MAYHEM criam menos wilds. Recalibrado em `pp-v4` (preços 61,5 / 160 / 864) | Decisão do dono: «nada pode pagar menos que 0,1×»; «com um full screen ter 136× não sei como se tem um 1000×» |
| 04-11-2026 | **Tabela de pagamentos fixa de design** (valor base × curva comum; 4 regras validadas ao arrancar: o símbolo de cima paga sempre mais, o crescimento nunca abranda, a diferença entre símbolos nunca encolhe, +15 % mínimo por coluna). **Ganho máximo 25 000×.** **Volatilidade por bónus:** AFTERPARTY média (4 cantos ×1, teto ×2), VIP alta (3 cantos persistentes, teto ×10), POLICE PARTY muito alta (cantos fechados, ×1 +2 por prémio até ×50, Distintivo até ×50). RTP afinado pelo Scatter (base 20, hunt 26) e preços 161 / 336 / 836. `pp-v5` | Decisões do dono: «nunca uma ultrapassagem de pagamento»; «prémios mais raros mas bem melhores»; «cada bónus com a sua volatilidade»; opção A (trocar o desenho dos bónus) |
| 05-11-2026 | **O Joiner multiplica a soma dos cantos** (m = Σ cantos × Distintivo, teto por modo: base ×30, AFTERPARTY ×8, VIP ×30, POLICE ×100). **Os símbolos pagam mais**: valores base ~2× (N1 0,10 … P5 2,00) e curva mais forte no fim (15–17 ×10, 18–20 ×16, 21–24 ×25, ecrã cheio ×50); nenhum prémio base abaixo de 0,10× (validado ao arrancar). **Multiplicadores mais baixos**: cantos nascem ×1 (base até ×3, VIP até ×4, POLICE +1 até ×10); Distintivo base ×2–×4; o Total Chemistry soma +1 aos cantos em vez de duplicar. **Clusters grandes mais difíceis com os poderes**: LCD transforma no máximo 5 células (8 em Party), WEED 2 conversões, MDMA 3/5 movimentos, ALCOOL 3 passos, NEVER ENDING DREAM 2 respins; menos empilhamento premium (base/hunt 14,5/10,5, AFTERPARTY 17/13). Scatter base 18 (N1 420), MAIS SCATTERS 33 (N1 392); compras 126 / 334 / 840. `pp-v7` | Decisões do dono: «os símbolos pagam muito pouco»; «o Joiner multiplica o multiplicador somado dos cantos»; «nenhum cluster sem multiplicador pode pagar menos de 0,1×»; «reduzir a facilidade de grandes clusters com os poderes» |
| 04-11-2026 | **Fusão surpresa:** em 3 % dos spins do jogo base e do MAIS SCATTERS dispara uma fusão ao acaso, sem acordar personagens. **Alvo de RTP 98 %.** Para compensar, o Scatter do jogo base fica mais raro (20 → 16, N1 430); o **MAIS SCATTERS passa a custar 2×** com o Scatter mais comum (26 → 29). Compras 160 / 336 / 830. `pp-v6` | Decisões do dono: «dar ânimo ao jogo base»; «mete 3 %, os scatters ligeiramente mais raros, aumenta o preço do MAIS SCATTERS e torna aí os scatters mais comuns»; «98 % RTP é o aim» |
| 04-11-2026 | **Direção da Fase 3:** estilo **ACIDWAVE NEON** (paleta tangerine, royal blue, violet, raspberry pink, lime green, neon yellow, red orange, punk yellow, neon jade); as personagens **personificam as substâncias** mas continuam **humanas**, com o **rosto das pessoas** das fotografias em `INSPIRATION/` (com autorização de cada uma); sem objetos de consumo. Fase 3 com 3 agentes em paralelo (coordenador gráfico, arte, interface e animação): `docs/fase3/` | Decisão do dono |
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
SÍMBOLOS NORMAIS (comum -> raro): N1 Bob Joint, N2 Copo de shot, N3 Botija de Copium, N4 Pastilha, N5 Selo
SÍMBOLOS PREMIUM (comum -> raro): P1 WEED, P2 ALCOOL, P3 COPIUM, P4 MDMA, P5 LCD (fixo)
WILD: W criado só por poderes (sem wilds naturais na base, fixo); CW Wild de Canto x1 sticky, +1 por
prémio, máx. x3 no jogo base; DW Distintivo x2-x4 sticky (Joiner); os cantos somam e o Distintivo multiplica a soma
SCATTER: S Pulseira VIP, máx. 1 por coluna, protegido, contado no fim do spin; 3/4/5 -> três bónus; não paga sozinho
PODERES / MECÂNICAS ESPECIAIS: despertar com cluster 5+ de premium; 5 poderes, Party Mode, 10 fusões,
níveis de Chemistry, Party Corners, Peace Police Calmer/Joiner — fichas completas em docs/GDD.md §03-§06
MULTIPLICADORES: só nos wilds CW e DW; Σ CW × DW por cluster, com teto por modo; CW cresce +1 por participação; Total Chemistry +1 a cada CW
BÓNUS / FREE SPINS: AFTERPARTY (3S), VIP AFTERPARTY (4S), POLICE PARTY (5S); 10 spins cada (fixo);
retrigger 3S +5, máx. 3S por spin no bónus; o que muda em cada um está em docs/GDD.md §07
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
GANHO MÁXIMO: 25 000x a aposta por jogada completa, bónus incluído
O QUE É FIXO: GUIA-DO-PROJETO.md §4 (contrato fixo)
O QUE PODE SER AJUSTADO: pesos, tabela de pagamentos, p das Botijas de Copium, p_pp e % Calmer/Joiner por modo,
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
VELOCIDADES: Normal / Rápido / Turbo (recuperadas pelo dono em 05-11-2026)
MERCADO REGULADO? não
FUNCIONALIDADES EXTRA DE INTERFACE: barra de Chemistry acima da grelha (5 retratos + slots de fusão
possíveis com o nome visível); área lateral/topo para a entrada do Peace Police; indicador de Party Mode;
multiplicador visível em cada CW e DW; contador de spins e estado inicial de cada bónus; narração curta
de cada evento («LCD transformou», «SLOW DISASTER», «Joiner entrou»); cenários de diagnóstico para cada
poder, cada fusão, Calmer, Joiner, Total Chemistry e cada bónus
```

### 7.3 Input da Fase 3 (`guides/3-VISUAIS-E-ANIMACOES.md`)

> Desenvolvido em `docs/fase3/` (04-11-2026): plano com 3 agentes e prompt inicial, perfil do jogo (**Acidwave**, personagens humanas com os rostos das referências), pessoas, inventário da arte. Referências do dono em `INSPIRATION/`. Prevalece sobre o bloco abaixo, onde diferirem.

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
O QUE NÃO QUERO: estética infantil, marcas reais,
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
| Total Chemistry | Nível 5: +1 a cada Wild de Canto e repete os poderes em Party Mode |
| AFTERPARTY / VIP / POLICE PARTY | Bónus de 3 / 4 / 5 Scatters |
