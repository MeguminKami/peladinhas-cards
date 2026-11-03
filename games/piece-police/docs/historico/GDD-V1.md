# PEACE POLICE: THE AFTERPARTY
## GAME DESIGN MASTER DOCUMENT — V1.0

**Estado:** conceito consolidado / especificação para protótipo de entretenimento  
**Idioma:** Português (Portugal)  
**Data:** 02-11-2026  
**Género:** slot audiovisual de clusters, cascatas, símbolos transformáveis e combinação de poderes  
**Público:** adulto (18+)  
**Formato do ficheiro:** texto UTF-8 com estrutura Markdown e extensão `.dm`, conforme solicitado; NÃO é código executável de Dream Maker.  
**Título oficial proposto:** **PEACE POLICE: THE AFTERPARTY**  
**Tagline:** *Five Personalities. One Party. Total Chaos.*  
**Nome interno / codename:** PP_AFTERPARTY  
**Termos de mecânica originais (de trabalho):** Party Stage, Alter Ego, Chemistry System, Party Corners, Contact, Peace Police, The Afterparty.

> **Nota de produção:** este é um documento de conceito e pré-produção suficientemente definido para orientar a criação de um protótipo gratuito com créditos fictícios. Não representa uma implementação matemática fechada, um jogo certificado, nem autorização para exploração comercial de apostas. As probabilidades, RTP, volatilidade, tabela de pagamentos e máximo de prémio necessitam de modelação, simulação, auditoria e, se aplicável, licenciamento.

---

# 00. VISÃO CRIATIVA

## Elevator pitch
Cinco personagens adultas, caricaturas de diferentes estados mentais e estilos de festa, ocupam o mesmo palco de slot. Cada uma paga autonomamente, desperta um Alter Ego e modifica o tabuleiro com um poder exclusivo. Quando duas ou mais se ativam na mesma sequência, os poderes interagem através de Chemistry. Um agente chamado Peace Police pode entrar como **CALMER**, limitando novas transformações, ou como **JOINER**, acrescentando novas possibilidades. O tabuleiro, fácil de ler, tem formato de palco com quatro cantos bloqueados que podem abrir durante a jogada.

## A experiência pretendida
1. **Ler imediatamente a jogada:** cinco rolos, símbolos claros, pagamentos visíveis, cascatas.
2. **Reconhecer cada personagem:** o seu comportamento não depende apenas de uma cor ou de um multiplicador.
3. **Ver consequências mecânicas:** os poderes alteram posições, persistência, movimento e continuidade.
4. **Desfrutar de encontros:** duas ou mais personagens podem executar efeitos coordenados.
5. **Celebrar o imprevisível sem enganar:** grandes animações não implicam prémios garantidos nem mudanças ocultas nas probabilidades.

## Pilares / antiobjetivos
| Pilares | Evitar |
|---|---|
| Regras-base intuitivas | Um mapa, labirinto ou grafo visível difícil de seguir |
| Identidade e humor adulto | Incentivo ou instruções de consumo de substâncias |
| Cinco poderes únicos | Cinco versões de «aumentar multiplicador» |
| Poder individual útil | Obrigatoriedade do Peace Police para grandes prémios |
| Escalada de combinações | Contadores e subsistemas excessivos |
| Board original mas familiar | Copiar xWays, Megaways ou elementos protegidos de outras produtoras |
| Clareza de resultados | «Quase-vitórias» apresentadas como vitórias ou perdas celebradas |

## Significado do tema
A ficção assenta em **personagens humanas personificadas**, não em conselhos sobre drogas. «LCD» é o nome escolhido para a personagem, mantido exatamente assim. «COPIUM» é apresentado como conceito humorístico/meme de negação otimista. Os comportamentos são poderes de fantasia e **não correspondem a efeitos médicos reais**, nem sugerem que misturas de substâncias sejam seguras, positivas ou recomendáveis. Nunca mostrar preparação, administração, dosagens ou tutoriais de consumo.

---

# 01. BOARD — THE PARTY STAGE

## Geometria oficial V1
- **5 rolos**, cada um com **3–5–5–5–3 posições disponíveis**.
- Altura total de referência: **5 posições**. O primeiro e quinto rolo não começam com a posição superior e inferior disponíveis.
- **21 células ativas** no início e **4 Party Corners** fechados.
- Após determinadas funcionalidades, os cantos abrem progressivamente, com **máximo de 25 células ativas**.
- Os quatro cantos situam-se em (R1,C1), (R1,C5), (R5,C1), (R5,C5). A notação usa linha R de cima para baixo e coluna C da esquerda para a direita.
- Não se altera o número de colunas no protótipo V1; a sensação de expansão é conseguida pela abertura dos cantos e por transformações visuais de símbolos.

```text
                P E A C E   P O L I C E
                  THE PARTY STAGE

                C1     C2     C3     C4     C5
          R1    [🔒]   [  ]   [  ]   [  ]   [🔒]
          R2    [  ]   [  ]   [  ]   [  ]   [  ]
          R3    [  ]   [  ]   [  ]   [  ]   [  ]
          R4    [  ]   [  ]   [  ]   [  ]   [  ]
          R5    [🔒]   [  ]   [  ]   [  ]   [🔒]

                   INÍCIO = 21 CÉLULAS
                   EXPANSÃO = ATÉ 25
```

**Visual:** uma moldura de palco ligeiramente recortada, sem aspeto de retângulo 6×4. Os cantos trancados devem ser discretamente identificados; quando abrem, a moldura ilumina-se e aparece uma nova posição.

## Sistema de pagamentos
**Cluster Pays ortogonal:** um grupo de **4 ou mais símbolos pagantes do mesmo tipo**, ligados horizontalmente ou verticalmente pelas células ativas, origina um prémio. Diagonais por si só não formam ligações. Cada célula pertence a um ou a vários conjuntos apenas se o motor suportar explicitamente a regra de símbolos especiais; nenhum símbolo normal é contado duas vezes numa única avaliação de cluster.

**Regras de leitura:**
1. Todos os clusters vencedores presentes no estado atual são identificados e resolvidos no mesmo ciclo.
2. O prémio do ciclo é calculado antes da remoção de símbolos.
3. Símbolos pagantes vencedores são removidos; posições ocupadas por símbolos persistentes obedecem às regras do poder que os preserva.
4. Novos símbolos entram por cascata a partir do topo de cada rolo; não existem linhas de pagamento tradicionais nem exigência de começar no primeiro rolo.
5. O processo repete-se enquanto houver grupos vencedores ou efeitos especiais de resolução pendentes.
6. Os prémios somam-se para o total da jogada; cada operação é registada no histórico.

**Valores por grupo e distribuição de símbolos:** ainda por definir pelo responsável de matemática. Não declarar RTP ou max win até existir validação.

## Party Corners
- Inicialmente fechados, não contam para combinações nem recebem símbolos.
- **Triple Chemistry:** abre 2 dos 4 cantos ainda fechados, se estiverem disponíveis; a seleção é determinada pelo motor e comunicada visualmente.
- **Full Chaos (4 personagens):** abre todos os cantos ainda fechados.
- **Total Chemistry (5 personagens):** utiliza o estado de 25 posições e executa a sequência conjunta, sem voltar a abrir posições inexistentes.
- Aberturas são temporárias durante a jogada; no **The Afterparty** existe a persistência específica descrita na secção de bónus.
- Após abertura, a célula recebe o símbolo determinado pelo motor antes de verificar novos pagamentos.

---

# 02. ELENCO — CINCO PERSONAGENS PAGANTES

| Símbolo | Nome de personagem | Personalidade | Verbo de gameplay | Cor de identificação |
|---|---|---|---|---|
| 🌀 | LCD — THE GLITCH | excêntrico, distorce a realidade | TRANSFORMAR | violeta elétrico `#A98CFF` |
| 🌿 | WEED — THE CHILLER | calmo, lento, indiferente | PRESERVAR | verde menta `#62DCA6` |
| ⚡ | MDMA — THE RAVE MANIAC | hiperativo, frenético, louco | MOVIMENTAR | magenta/neon `#FF4FAE` |
| 🥃 | ALCOOL — THE WILDCARD | impulsivo, descoordenado | REORGANIZAR | laranja âmbar `#FFAB52` |
| ☁️ | COPIUM — THE DREAMER | esperança absurda, negação | PROLONGAR | azul celeste `#72CCFF` |

## Estados para as cinco personagens
**NORMAL:** retrato humano caricatural e animação de espera reconhecível; participa nos clusters comuns.

**ALTER EGO:** retrato com aura/contorno da cor associada; a personagem executa a sua assinatura mecânica e passa a estar representada no indicador Chemistry da jogada.

**Despertar:** no protótipo, um cluster de **5+ símbolos iguais** permite despertar o Alter Ego da personagem desse tipo. Um cluster de 4 paga, mas não desperta. A personagem só pode **despertar uma vez por jogada normal**, exceto se o JOINER ou uma regra explicitamente definida conceder uma segunda execução.

### 02.1 LCD — THE GLITCH
- **Visual normal:** pessoa com óculos assimétricos, cabelo geométrico e sorriso desconcertado.
- **Visual Alter Ego:** distorção RGB, espelhos, rastos e duplicações.
- **Poder principal: REALITY BREAK.** Transforma uma célula elegível num **símbolo de dupla-face**, mostrando duas metades. Na V1 de protótipo, as duas metades têm tipos predefinidos pelo motor, mas apenas **uma metade contribui por avaliação de grupo** conforme a regra de prioridade documentada; a outra é descartada nesse ciclo. **Não duplicar um mesmo prémio** por ambiguidade visual.
- **Alternativa técnica para o MVP se a dupla-face for onerosa:** escolher um dos dois tipos e converter integralmente a célula. O design visual de «fenda» permanece, mas o pagamento usa um único símbolo.
- **Papel nas junções:** reinterpreta ou transforma símbolos envolvidos por poderes de outras personagens.
- **Áudio:** micro-glitches, sintetizador desafinado e eco curto.

### 02.2 WEED — THE CHILLER
- **Visual normal:** postura relaxada, olhar sonolento, gestos lentos.
- **Visual Alter Ego:** bolha temporal suave, nuvem esmeralda, efeitos amortecidos.
- **Poder: SLOW MOTION.** Seleciona um símbolo elegível e **fixa-o por uma cascata subsequente**. A célula protegida mantém-se visível enquanto as restantes resolvem.
- **Regra importante:** um símbolo fixo pode participar num prémio se cumprir as regras; depois de cumprida a duração de proteção, a fixação termina. A proteção não bloqueia indefinidamente o ciclo.
- **Papel nas junções:** conserva posições transformadas por LCD, MDMA ou ALCOOL.
- **Áudio:** filtro low-pass, pad suave, desaceleração curta.

### 02.3 MDMA — THE RAVE MANIAC
- **Visual normal:** personagem elétrica, olhos arregalados, pés inquietos, dança sem parar.
- **Visual Alter Ego:** neon intenso, luz estroboscópica moderada com opção sem flashes, rastos de velocidade.
- **Poder: RAVE RUSH.** Faz **1 a 3 deslocações** determinadas pelo motor entre posições elegíveis, trocando de lugar com outros símbolos. Cada deslocação altera a configuração; a avaliação de clusters é realizada no momento definido pela sequência de resolução.
- **Papel nas junções:** **motor de movimento**; desloca símbolos criados por LCD, reorganizados por ALCOOL ou preservados por WEED.
- **NÃO usar o conceito de amor/abraços/ligação emocional como identidade principal.** O seu tema é energia extrema, caos e movimentação.
- **Áudio:** breakbeat curto, passos acelerados, sintetizador percussivo; evitar loops incessantes.

### 02.4 ALCOOL — THE WILDCARD
- **Visual normal:** figura expansiva, desequilibrada, expressão exagerada e teatral.
- **Visual Alter Ego:** cenário inclinado, cartões a rodar, gestos descoordenados.
- **Poder: DRUNK SHUFFLE.** Permuta posições de uma **área de até 4 símbolos elegíveis**. O conjunto e a permutação são definidos pelo motor antes da animação.
- **Papel nas junções:** rearranja posições e abre possibilidades de novos clusters; não é «MDMA mais lento» — é o modificador de ordem/posição de conjuntos.
- **Áudio:** percussão desalinhada, queda de objetos caricatural, corte seco.

### 02.5 COPIUM — THE DREAMER
- **Visual normal:** pessoa excessivamente confiante, sorriso forçado, olhos brilhantes de esperança absurda.
- **Visual Alter Ego:** nuvens, imagens de sonho, pensamento «isto ainda vai melhorar».
- **Poder: ONE MORE CHANCE.** Preserva **uma célula especial elegível** por um ciclo adicional ou recupera um símbolo especial removido para uma posição predefinida da cascata seguinte (nunca ambos simultaneamente na V1).
- **Papel nas junções:** prolonga uma funcionalidade já iniciada sem garantir novos prémios.
- **Áudio:** harpa sintética surreal, voz sussurrada cómica e suspensão curta.

## Silhuetas gráficas obrigatórias
Não depender exclusivamente de emojis ou cores. Cada personagem tem (a) cabeça/cabelo distinto; (b) pose própria; (c) elemento de vestuário reconhecível; (d) marca gráfica monocromática legível a 32px. A identidade deve funcionar para quem tem daltonismo.

---

# 03. ALTER EGO & CONTACT

## Lógica do Alter Ego
Cada tipo vencedor com 5+ símbolos entra no conjunto de personagens despertas durante a jogada. A execução do poder é tratada como um evento previsível e registável, não como uma animação que «decide» o resultado.

**Ordem de resolução sugerida:**
1. Pagar todos os clusters da avaliação corrente.
2. Registar novos despertares (cada tipo no máximo uma vez, salvo exceção expressa).
3. Resolver poderes individuais que ficaram pendentes, por ordem canónica predefinida ou por ordem sorteada e registada pelo RNG.
4. Detetar os contactos Chemistry elegíveis.
5. Resolver Chemistry e eventuais Party Corners.
6. Resolver intervenção do Peace Police se existir e estiver elegível.
7. Fazer cascata / reavaliar clusters; repetir até estabilizar.

**Contact** não é um novo sistema complicado de caminhos. É apenas a regra interna: **duas personagens diferentes que despertaram na mesma jogada** podem gerar Chemistry mesmo que os seus símbolos originais já tenham desaparecido. A UI mostra as duas personagens lado a lado na barra Chemistry. Não é preciso contacto físico entre células.

## Regra de legibilidade
O jogador vê sempre três coisas: (1) quem despertou; (2) que poder ocorreu; (3) o que mudou no board. As animações nunca escondem símbolos relevantes quando é necessário verificar pagamentos.

---

# 04. CHEMISTRY SYSTEM — O CORAÇÃO DA SLOT

## Definição
Chemistry é uma **combinação de poderes** entre tipos de personagens despertas **na mesma jogada**. Não representa mistura ou efeito real de substâncias. Qualquer personagem, isolada, continua a poder originar pagamentos relevantes.

## Níveis
| Personagens diferentes despertas | Nome | Efeito de design |
|---|---|---|
| 1 | SOLO POWER | executa o poder individual |
| 2 | DUAL CHEMISTRY | executa os dois poderes + interação do par |
| 3 | TRIPLE CHEMISTRY | sequência coordenada + desbloqueio de 2 cantos |
| 4 | FULL CHAOS | sequência coordenada + desbloqueio dos 4 cantos |
| 5 | TOTAL CHEMISTRY | todas as personagens participam num evento conjunto |

**Regra de escalada:** mais participantes abrem **mais tipos de eventos e potencial máximo configurável**, mas **não garantem maior pagamento** em cada resultado individual. O máximo de prémio do jogo e o RTP só podem ser definidos após modelação.

## As dez interações entre pares
| Par | Nome da interação | Aplicação visual/mecânica proposta |
|---|---|---|
| LCD + WEED | FROZEN REALITY | WEED preserva durante uma cascata a posição transformada por LCD |
| LCD + MDMA | RAVE DIMENSION | MDMA percorre uma posição modificada por LCD e pode trocar outro símbolo elegível |
| LCD + ALCOOL | REALITY SHUFFLE | ALCOOL baralha uma área que inclui um símbolo transformado pelo LCD |
| LCD + COPIUM | DREAM GLITCH | COPIUM preserva por um ciclo a transformação visual/mecânica do LCD |
| WEED + MDMA | FREEZE & FREAK | WEED fixa uma célula enquanto MDMA troca outras posições próximas |
| WEED + ALCOOL | SLOW DISASTER | a célula fixa permanece, e o baralhamento atua sobre as restantes células elegíveis |
| WEED + COPIUM | NEVER ENDING DREAM | uma célula especial fica preservada durante o prolongamento permitido por COPIUM |
| MDMA + ALCOOL | TOTAL MAYHEM | duas trocas rápidas do MDMA seguidas de permutação local do ALCOOL |
| MDMA + COPIUM | ONE MORE RAVE | COPIUM permite uma deslocação suplementar do MDMA se houver célula elegível |
| ALCOOL + COPIUM | ONE MORE MESS | após o baralhamento, COPIUM pode conservar ou repor um símbolo especial |

**Proposta de MVP:** todos os pares funcionam usando os poderes existentes; apenas três pares recebem animação e VFX verdadeiramente exclusivos no primeiro marco de produção: Rave Dimension, Freeze & Freak e One More Mess. Os outros ficam com composição de efeitos reutilizáveis, sem perder funcionalidade.

## Triplos, quartetos e quinteto
Em vez de desenhar 10+ ações exclusivas, a regra é composicional:
- Despertam 3: executam os poderes e abrem-se 2 cantos (Triple Chemistry).
- Despertam 4: executam os poderes e abrem-se os 4 cantos (Full Chaos).
- Despertam 5: executa-se uma **cena curta TOTAL CHEMISTRY** com os cinco efeitos, sem movimentos extra ilimitados. O limite de passos será explicitado pelo modelo matemático.

## Limites anti-loop
Cada cascata ou efeito incrementa um contador de resolução. Definir no protótipo um limite máximo interno de subeventos, comportamento de término seguro e auditoria dos estados. **Não truncar arbitrariamente prémios válidos**: o motor matemático deve ser desenhado para não produzir ciclos intermináveis, com probabilidades e estados absorventes, e a proteção de runtime deve permitir concluir e pagar resultados já determinados.

---

# 05. PEACE POLICE — CALMER / JOINER

## Identidade
A sexta personagem é um agente/polícia fictício de estilo comédia, reconhecível pelo chapéu, silhueta e entradas teatrais. É **uma entidade especial de evento**, não um sexto símbolo pagante obrigatório. Aparece **fora da área dos cinco rolos** e entra brevemente quando existe uma intervenção válida.

### MODO A — CALMER («EVERYBODY CALM DOWN!»)
- Interrompe **a próxima transformação especial Chemistry ainda pendente** na jogada; não apaga o estado dos rolos nem retira prémios já ganhos.
- Se não existir transformação Chemistry pendente, usa uma reação audiovisual curta, sem efeito matemático adverso inventado.
- A função narrativa é «controlar a confusão»; o efeito matemático é limitar o desenvolvimento futuro elegível, nunca modificar retroativamente um resultado pago.
- **Visual:** azul/vermelho policial abstrato, apito cómico, pose de autoridade, som de travagem.

### MODO B — JOINER («I'M JOINING THE PARTY!»)
- Se apenas uma personagem estiver desperta e a regra o permitir: repete **uma execução limitada** do seu poder.
- Se duas ou mais estiverem despertas: concede **uma intervenção Chemistry adicional** pertencente ao nível elegível; poderá abrir uma célula especial restante, se disponível.
- Se todas as posições estiverem abertas: substitui o desbloqueio indisponível por um modificador alternativo já previsto no modelo, por exemplo uma nova transformação de símbolo, nunca por uma promessa de prémio.
- **Visual:** remove o chapéu, entra na dança, muda da paleta policial para um gradiente da festa, executa uma animação cómica de entrada.

## Regras de independência
- O Peace Police **não é condição** para prémios significativos nem para Total Chemistry.
- Não gera por si só resultados garantidos.
- Os modos Calmer e Joiner são selecionados pelo modelo matemático com **probabilidades documentadas**, não presumidas como 50/50.
- Não se altera a probabilidade em função de perdas anteriores, tempo de jogo ou comportamento individual.
- No mesmo subevento só existe **uma intervenção ativa** do Peace Police; múltiplas intervenções requerem regras e limites explícitos.

## Diálogos opcionais, legendáveis
- CALMER: «Everybody calm down!» / «Acabou a confusão!»
- JOINER: «I'm joining the party!» / «Também vou entrar!»
- Respeitar opção de silenciar vozes; legendas sempre disponíveis.

---

# 06. FUNCIONALIDADE ESPECIAL — THE AFTERPARTY

## Entrada proposta
Ao despertar **3 personagens diferentes numa mesma jogada de base**, após a resolução dessa jogada, é atribuída a funcionalidade THE AFTERPARTY com **5 rodadas grátis de protótipo**. A frequência real tem de ser validada: o trigger poderá ser ajustado durante o balanceamento, nunca anunciado como regra final antes da certificação.

## Regras para protótipo
- Em cada rodada de Afterparty, pelo menos **1 dos 4 cantos começa aberto**, escolhido e apresentado antes de girar.
- O contador Chemistry **reinicia a cada rodada** para evitar interpretações ambíguas; a persistência de símbolos entre rodadas só existe se o bónus a especificar expressamente.
- Os mesmos cinco poderes individuais e dez combinações de pares continuam válidos.
- Despertar 3 ou 4 personagens na rodada pode abrir mais cantos, dentro do máximo de 25 posições.
- Peace Police mantém Calmer/Joiner. O Calmer limita a próxima melhoria pendente daquela rodada; o Joiner poderá criar uma intervenção adicional.
- O total dos prémios de todas as rodadas é somado e apresentado no resumo final.
- **Sem multiplicadores globais arbitrários na V1**: dar protagonismo ao sistema de poderes e à forma do palco.
- A duração, reativações e transições têm de ser revistas na modelação matemática.

## Encenação
A iluminação muda de nightclub escuro para «afterparty ao nascer do sol». O palco conserva a sua geometria reconhecível, mas os cantos ganham molduras luminosas; as personagens parecem mais exageradas. A música recebe uma camada instrumental, não um volume necessariamente superior.

---

# 07. FLUXO DE UMA JOGADA — MODELO TÉCNICO

```text
SPIN
  -> RNG determina símbolos / possíveis intervenções / resultados de transformações
  -> mostrar board inicial (21 células; ou estado de bónus)
  -> identificar clusters de 4+ e pagar
  -> identificar clusters de 5+ e marcar Alter Egos inéditos
  -> executar poderes individuais elegíveis
  -> avaliar Chemistry (2 / 3 / 4 / 5 personagens)
  -> abrir Party Corners conforme nível elegível
  -> resolver Calmer/Joiner, se evento elegível
  -> cascata / nova avaliação de clusters
  -> repetir até estabilização matemática
  -> verificar trigger de Afterparty
  -> apresentar total e histórico
FIM
```

**Observação técnica:** a ordem acima é a **ordem de apresentação e resolução**. O modelo de jogo deve definir o resultado e os eventos probabilísticos de forma auditável, separando a animação da determinação de prémios. Interações simultâneas e casos-limite precisam de testes unitários.

## Pseudocódigo orientador (não executável)
```text
state = prepare_spin(rng, mode)
repeat:
    clusters = find_orthogonal_clusters(state, min_size=4)
    if clusters:
        award_payments(clusters, paytable)
        wake_new_personas(clusters_size_at_least=5)
    pending = choose_valid_solo_and_chemistry_events(state, rng)
    apply_events_in_documented_priority(pending, state)
    apply_police_event_if_eligible(state, rng)
    apply_cascade_and_refill(state, rng)
until stable(state)
if base_spin and afterparty_triggered(state): queue_afterparty()
finalize_payout_and_audit_log()
```

## Dados necessários para cada jogada
- Seed/identificador auditável apropriado ao motor e jurisdição.
- Estado inicial e final das células.
- Clusters pagos (células, tipo, tamanho e valor).
- Alter Egos despertos, potência de cada evento e ordem de resolução.
- Chemistry (pares / nível / cantos desbloqueados).
- Peace Police (nenhum / Calmer / Joiner; efeito efetivo).
- Cascatas, símbolos novos, modificações e prémio total.
- Dados para «replay» visual exato do resultado.

---

# 08. DIREÇÃO ARTÍSTICA — VISUAL DESIGN BIBLE

## Universo e tom
**Neon Underground Cartoon.** Uma afterparty ficcional numa cidade estilizada: pista de dança, fumo de cenário, luzes de clube, posters rasgados, silhuetas expressivas e uma equipa de personagens humanas completamente distintas. Equilibrar energia urbana, humor nonsense e legibilidade de jogo. Evitar estética infantil, realismo de consumo de drogas, imagens médicas e referências a marcas reais.

## Mistura de referências criativas (não copiar)
- **Cartoon expressivo adulto:** silhuetas fortes, exagero facial, reações humorísticas.
- **Poster de música eletrónica / rave:** tipografia impactante, cromatismo contrastado, recortes geométricos.
- **Motion graphics de jogos arcade:** respostas rápidas, transições limpas, contornos luminosos.
- **UI premium de slots modernas:** informação de apostas, prémios e estado do bónus muito clara.

## Paleta principal sugerida
| Finalidade | Cor | HEX |
|---|---|---|
| Fundo noturno | Midnight Ink | `#101224` |
| Superfície dos rolos | Deep Plum | `#29243D` |
| Acento do título | Electric Violet | `#B477FF` |
| LCD | Reality Purple | `#A98CFF` |
| WEED | Chill Mint | `#62DCA6` |
| MDMA | Rave Pink | `#FF4FAE` |
| ALCOOL | Wild Amber | `#FFAB52` |
| COPIUM | Dream Blue | `#72CCFF` |
| Joiner | Party Teal | `#48DCC9` |
| Calmer | Warning Coral | `#FF6C78` |
| Texto | Pearl | `#F5F1FF` |

**Acessibilidade:** não usar cor como único meio de distinção; ícone + silhueta + nome/etiqueta. Testar contraste, tamanho mínimo no telemóvel e modo de redução de movimento.

## Logo e lettering
- **PEACE POLICE:** logótipo condensado e inclinado, com aparência de poster noturno e um distintivo policial fictício reinterpretado como símbolo de festa.
- **THE AFTERPARTY:** subtítulo largo, mais estreito, com tratamento de LED ou sinal de saída de clube.
- Evitar reproduzir logótipos, personagens e fontes proprietárias de outras produtoras.
- Tipografia de produção: sans-serif display de licença comercial válida; UI em sans-serif de alta legibilidade. Não distribuir fontes sem licença.

## Composição desktop
1. Cabeçalho com logótipo compacto.
2. Indicador Chemistry acima do board: 5 ícones simples com estado **normal / ativo**.
3. Board Party Stage ao centro, com quatro cantos bloqueados visíveis.
4. Peace Police à direita (fora dos rolos) apenas quando relevante; não roubar espaço ao board em permanência.
5. Rodapé com valor apostado, saldo/créditos fictícios, prémio, menu e botão SPIN.
6. Em Afterparty, contador de rondas discreto, sem cobrir células.

## Composição mobile / vertical
1. Logótipo pequeno no topo; Chemistry numa barra de uma linha.
2. Board com largura máxima e tamanho mínimo adequado por célula.
3. Peace Police entra pelo topo/lateral durante o evento.
4. Painel inferior fixo com SPIN e controlos.
5. Informação secundária em painel recolhível; nunca sobrepor clusters ou valores pagos.
6. Suporte a redução de animações, volume, legendas e descrição de símbolos.

## Guia de cada personagem para ilustrador/animador
| Personagem | Forma / roupa | Idle | Transformação | Efeito no board |
|---|---|---|---|---|
| LCD | angular, assimétrico, óculos geométricos | olha para duplicado de si | separa-se em imagens RGB | fenda dupla-face |
| WEED | arredondado, casaco largo, postura descaída | boceja e flutua | cria bolha de tempo | fixação suave de célula |
| MDMA | espigado, ténis exagerados, acessórios neon | dança e salta sem parar | deixa rastos elétricos | troca veloz de símbolos |
| ALCOOL | desequilibrado, gravata torta, movimentos largos | quase perde equilíbrio | tropeça e rodopia | shuffle regional |
| COPIUM | sorriso teimoso, olhos estrelados, hoodie | afirma que vai correr bem | nuvem de fantasia | reaparecimento/persistência |
| PEACE POLICE | silhueta de agente caricatural | fiscalização séria | CALMER: travagem / JOINER: dança | bloqueio ou expansão |

## Requisitos de arte para cada símbolo
- Ícone 2D ou 3D estilizado, exportação em dimensões múltiplas (por exemplo 128/256/512 px, a validar).
- State sheet: NORMAL, ALTER EGO, HIGHLIGHT, WIN, LOCKED, DISABLED e SMALL_UI.
- Expressões faciais e VFX separados do sprite principal sempre que possível.
- Não depender de texto legível dentro do ícone para reconhecer personagens.
- Evitar flashes intensos: alternativa reduzida para acessibilidade.

---

# 09. ÁUDIO, ANIMAÇÃO E FEEDBACK

## Direção musical
**House / breaks / synth eletrônico originais**, com intensidade moderada, humor rítmico e camadas por evento. As personagens têm «assinaturas» sonoras curtas; a música não necessita acelerar em função do valor apostado nem do tempo passado.

## Biblioteca sonora mínima
- Ambiente do clube, loop principal e variante Afterparty.
- Spin, paragem de rolos e cascata.
- Pequeno prémio, prémio maior e resumo de prémio, sem celebrar perda líquida como vitória.
- Cinco stingers individuais dos Alter Egos.
- Três stingers de Chemistry (dupla, tripla, total).
- Peace Police Calmer e Joiner.
- Abrir cantos: som de portas/desbloqueio, sem efeito ensurdecedor.

## Timing orientador (ajustável)
- Resultado base: feedback imediato, sem suspense artificial prolongado.
- Alter Ego: animação curta 0,5–1,2 s, dependendo do poder.
- Chemistry: 0,8–1,8 s de transição legível.
- Total Chemistry: máximo de encenação, mas sempre com opção SKIP / reduzir animações.
- Números de prémio e histórico de eventos devem permanecer consultáveis após o efeito.

---

# 10. REFERÊNCIAS DAS PRODUTORAS — O QUE APRENDER, O QUE NÃO COPIAR

**Regra:** referências são de linguagem de game design, nunca autorização para reutilizar marcas, arte, nomes de funcionalidades registados, matemática proprietária ou assets.

### NOLIMIT CITY
- **Estudar:** progressão de transformações e interação entre efeitos em jogos que usam xWays®, xNudge®, xSplit® e outras funcionalidades.
- **Aplicar ao nosso jogo:** diversidade de efeitos combinados; LCD transforma, MDMA move, WEED fixa, sem reproduzir o funcionamento ou branding proprietário.
- **Não copiar:** nomenclatura com prefixo «x», matemática ou animações exatas.
- **Fonte oficial:** https://static.nolimitcity.com/documents/internal/Nolimit_City_xWays_xNudge_Trademark_2020.pdf
- **Ficha de referência:** https://fan-cdn.nolimitcity.com/Nolimit_City_Game_sheet_Slots_The_Border_7456aff989.pdf

### HACKSAW GAMING
- **Estudar:** jogos como Le Bandit, com **cascatas e Golden Squares**, posições que ganham relevância após pagamentos.
- **Aplicar:** Party Corners que abrem e estados de célula visuais, com linguagem e regras próprias.
- **Não copiar:** Golden Squares, Rainbow, coletores e animações específicas.
- **Fonte oficial:** https://www.hacksawgaming.com/games/le-bandit

### PAPERCLIP GAMING
- **Estudar:** Conductor of Death, em especial os **Sticky Note Wilds** que podem evoluir quando permanecem no board.
- **Aplicar:** sensação de continuidade/persistência dos poderes de WEED e COPIUM.
- **Não copiar:** Notas Wild, regras de duplicação e tabelas de pagamento.
- **Fonte oficial:** https://paperclipgaming.com/games/conductor-of-death

### VALKYRIE STUDIO
- **Estudar:** Waylanders Forge, nomeadamente a apresentação de um personagem que ativa eventos como Hammer Time e diversos símbolos de funcionalidade.
- **Aplicar:** Peace Police como personagem de intervenção com duas interpretações dramáticas e Alter Egos com assinatura audiovisual.
- **Não copiar:** Hammer Time, personagens, arte ou tabelas de símbolos.
- **Fonte oficial:** https://valkyriestudio.gg/game/waylanders-forge

### BIG TIME GAMING — CONTEXTO TÉCNICO DE FORMATO
- **Estudar:** o princípio de alturas variáveis / possibilidades de combinações de Megaways, como linguagem histórica de inovação em rolos.
- **Aplicar:** apenas a coragem de fugir ao retângulo rígido; o Party Stage tem geometria própria e pagamentos por clusters, portanto **não se designa Megaways** nem afirma usar licença.
- **Fonte oficial:** https://www.bigtimegaming.com/games/vegas-megaways

## Referências de direção gráfica (sem reutilização de imagem)
1. Posters de raves e festivais eletrónicos: contraste neon, tipo condensado, ritmo visual.
2. Ilustração adulta expressiva para personagens humanas e humor de situação.
3. Arcade de alto contraste: telemetria simples, retângulos de feedback e brilho seletivo.
4. Fotografia noturna de pista de dança apenas como referência de luz/atmosfera, não como asset final.
5. Sequências de animação de comédia física: exagero de movimentos e timing curto.

**Entrega criativa sugerida ao artista:** moodboard separado por «personagens», «board e moldura», «iluminação», «motion», «tipografia». Usar arte original ou assets com licença clara.

---

# 11. UX, ACESSIBILIDADE E CONFIANÇA

- Os símbolos e poderes devem poder ser consultados num **HELP** com vídeo/diagrama simples.
- Mostrar o valor do prémio real de cada combinação, sem dar a entender que todos os efeitos especiais produzem lucro.
- Não ocultar apostas, saldo, despesas acumuladas ou duração de sessão numa implementação a dinheiro real.
- Controlo de áudio, legendas, redução de movimento, ausência de flashes obrigatórios, tamanho de toque adequado, suporte de teclado e contraste verificado.
- Evitar animações de «quase-garantia» e sons de vitória para retornos inferiores à aposta.
- Na versão demonstrativa, usar créditos **explicitamente fictícios**, sem possibilidade de levantamento e sem métodos de pagamento.
- Público adulto, classificação etária e revisão legal da temática e comunicação comercial.

## Portugal / outros mercados regulados
Para comercialização, validar enquadramento jurídico, licença, certificação de RNG, RTP e conteúdo de acordo com a jurisdição. Em Portugal, o SRIJ exige informações claras e medidas de jogo responsável, proteção de menores, limites e autoexclusão para operadores abrangidos. O caráter adulto e as referências às drogas necessitam de análise jurídica e de políticas de plataforma antes de publicar.
- https://www.srij.turismodeportugal.pt/pt/jogo-responsavel/protecao-legal-ao-jogador
- https://www.srij.turismodeportugal.pt/pt/jogos-e-apostas-online/obrigacoes-das-entidades
- https://www.srij.turismodeportugal.pt/pt/jogo-seguro/direitos-e-deveres-do-jogador

---

# 12. MATEMÁTICA DE JOGO — VARIÁVEIS A DEFINIR

Não inventar números para dar aparência de especificação final. Antes de converter um protótipo de créditos fictícios em produto real, produzir o **Mathematics Specification**:

| Campo | Estado |
|---|---|
| RTP teórico global | POR DEFINIR |
| Repartição de RTP entre base / Afterparty | POR DEFINIR |
| Volatilidade / desvio-padrão de retornos | POR DEFINIR |
| Hit frequency (prémio bruto vs lucro líquido) | POR DEFINIR |
| Paytable por símbolo e tamanho de cluster | POR DEFINIR |
| Pesos de símbolos no RNG | POR DEFINIR |
| Frequência de Alter Ego por tipo | POR DEFINIR |
| Frequência de 2/3/4/5 personagens despertas | POR DEFINIR |
| Frequência de Peace Police | POR DEFINIR |
| Percentagens Calmer vs Joiner | POR DEFINIR |
| Frequência e retorno do Afterparty | POR DEFINIR |
| Max win e regras de cap | POR DEFINIR |
| Condições finais dos efeitos especiais | POR DEFINIR |

**Testes necessários:** Monte Carlo em larga escala; RTP e confiança estatística; distribuição de tamanho de prémios; frequência de funcionalidades; auditoria do estado das cascatas; detetor de loops; limites; correção de pagamento; replays determinísticos; testes adversariais; compatibilidade desktop/mobile.

**Importante:** eventuais exemplos de vitória/diagrama neste documento são casos de design, não valores prováveis, taxas reais ou promessas de pagamento.

---

# 13. STACK E MÉTODOS DE DESENVOLVIMENTO SUGERIDOS

## Arquitetura
- **Core/Engine (headless):** TypeScript puro ou linguagem de backend apropriada; não depender de framerate para determinar sorteios.
- **RNG/adaptação matemática:** módulo testável separado, com logs de estado e possibilidade de replay do mesmo resultado.
- **Presentation:** Canvas/WebGL (PixiJS, Phaser ou equivalente), com timeline de animações separada dos resultados.
- **UI:** HTML/CSS ou framework existente no site, camada de acessibilidade, ajuda e controlos.
- **Data:** descrições externas para símbolos, poderes, animações, probabilidades e paytable; versionamento da configuração.
- **Asset pipeline:** ilustração em layers, sprites/atlases, transições Spine/Rive/Canvas conforme orçamento e licenciamento.
- **Telemetria:** duração da sessão, compreensão de regras e falhas técnicas; não otimizar para exploração de vulnerabilidades dos jogadores.

## Estados mínimos
```text
IDLE -> SPINNING -> SETTLE -> EVALUATE
  -> PAY -> WAKE_ALTER_EGO -> RESOLVE_SOLO
  -> RESOLVE_CHEMISTRY -> RESOLVE_PEACE_POLICE
  -> CASCADE -> EVALUATE (se aplicável)
  -> CHECK_AFTERPARTY -> SUMMARY -> IDLE
```

## Eventos nomeados sugeridos
`SPIN_STARTED`, `BOARD_SETTLED`, `CLUSTER_AWARDED`, `PERSONA_AWAKENED`, `SOLO_POWER_APPLIED`, `CHEMISTRY_STARTED`, `CORNER_UNLOCKED`, `POLICE_CALMER`, `POLICE_JOINER`, `CASCADE_STARTED`, `AFTERPARTY_AWARDED`, `SPIN_COMPLETED`.

## Critérios de aceitação V1
1. Board visual exatamente 3–5–5–5–3, 21 células iniciais, 4 cantos bloqueados.
2. Clusters ortogonais de 4+ pagam corretamente segundo tabela configurável.
3. Cinco tipos de personagem, normal e Alter Ego, com comportamento distinto.
4. Um cluster 5+ consegue acionar despertar pelo menos nos testes determinísticos.
5. Todas as dez combinações de pares são reconhecidas e resolvidas sem duplicar prémios.
6. Abertura de 2 e de 4 cantos, sem exceder 25 células.
7. Calmer não elimina qualquer prémio já atribuído.
8. Joiner funciona com 1 ou 2+ personagens, sem se tornar dependência de vitória.
9. Afterparty de 5 rodadas de demonstração, com estado e total corretamente contabilizados.
10. Replay reproduz exatamente a jogada, incluindo ordem de efeitos.
11. Telemóvel em portrait, desktop e modo de movimento reduzido funcionam.
12. Interface assinala sempre que o protótipo usa créditos fictícios.

## Roadmap de produção
**P0 — documentação e riscos:** fechar estado, regras de vizinhança e identidade original; rever marcas/licenças e temática.

**P1 — protótipo matemático:** simulação headless de clusters/cascatas/despertares/Power/Police e testes automáticos.

**P2 — protótipo visual:** board real, símbolos temporários, barra Chemistry, controlo Spin e demonstração Afterparty.

**P3 — direção artística:** concept art, sprites e animações normais/Alter Ego, interface e áudio originais.

**P4 — balanceamento e QA:** performance, documentação das probabilidades, deteção de bugs, acessibilidade, verificações de consistência.

**P5 — preparação de publicação:** se for apenas demo, aprovação de conteúdo e alojamento; se houver apostas, processo legal, técnico, RNG e certificação específicos.

---

# 14. EXEMPLO DE JOGADA — STORYBOARD DE REGRAS

1. A jogada gera um cluster de cinco LCD; paga segundo a paytable.
2. LCD desperta e transforma uma posição elegível em símbolo de dupla-face (ou conversão simples no MVP).
3. Após nova cascata, surge cluster de cinco MDMA; o MDMA desperta e executa RAVE RUSH.
4. Como LCD + MDMA despertaram, ativa-se **RAVE DIMENSION**, que combina uma transformação e uma deslocação adicional definida pelo motor.
5. Noutra avaliação, cinco WEED formam cluster; WEED desperta e fixa um símbolo elegível.
6. Há três personagens distintas despertas: **TRIPLE CHEMISTRY**, abertura de dois cantos e geração de símbolos nesses pontos.
7. O Peace Police pode não aparecer; se surgir CALMER, limita a próxima transformação extra pendente. Se surgir JOINER, adiciona uma intervenção elegível.
8. O motor resolve cascatas restantes, soma prémios e apresenta o resumo. Se todas as condições de Afterparty forem verificadas, atribui o bónus de cinco rodadas.

**Ponto de design:** uma sequência complexa deve ser narrada visualmente em frases simples: «LCD transformou», «MDMA correu», «WEED fixou», «3/5 Chemistry», «Joiner entrou».

---

# 15. NOMENCLATURA FINAL / COPY DE MARKETING

**Nome da slot:** PEACE POLICE: THE AFTERPARTY

**Nome do board:** THE PARTY STAGE

**Mecânica principal:** CHEMISTRY SYSTEM

**Estados de personagens:** ALTER EGO

**Cantos expansíveis:** PARTY CORNERS

**Bónus:** THE AFTERPARTY

**Personagem especial:** PEACE POLICE — CALMER / JOINER

**Tagline internacional:** *Five Personalities. One Party. Total Chaos.*

**Descrição curta para o catálogo:**
> Entra no Party Stage, onde cinco personagens imprevisíveis despertam poderes próprios, se juntam em reações Chemistry e transformam o palco. Quando o Peace Police aparece, pode travar a confusão — ou juntar-se à Afterparty.

**Descrição alargada:**
> PEACE POLICE: THE AFTERPARTY é uma slot de cascatas e grupos vencedores com um board de 21 posições que pode expandir até 25. LCD transforma símbolos, WEED preserva-os, MDMA salta freneticamente entre posições, ALCOOL baralha a ordem e COPIUM prolonga acontecimentos. Cada personagem consegue pagar e ativar funcionalidades sozinha; quando várias despertam na mesma jogada, os seus efeitos combinam-se no Chemistry System. O Peace Police pode tentar impor a calma ou transformar-se no inesperado convidado da festa.

**Aviso contextual:** obra de ficção e sátira destinada a adultos; a representação das personagens não constitui informação nem recomendação sobre substâncias reais.

---

# 16. DECISÕES CONGELADAS VS. DECISÕES ABERTAS

## Fechado para V1
- Nome proposto e atmosfera «neon underground cartoon».
- Cinco personagens: LCD, WEED, MDMA, ALCOOL, COPIUM.
- MDMA = hiperatividade, energia, velocidade e movimento; **não amor**.
- Peace Police = Calmer/Joiner, independente do valor potencial das drogas.
- Todas as drogas pagam isoladamente; Chemistry junta poderes.
- Board 5 rolos **3–5–5–5–3** com quatro cantos desbloqueáveis até 25.
- Cluster Pays + cascatas, em vez de linhas tradicionais.
- Power System + Chemistry + Afterparty; sem mapa ou navegação complexa.

## Aberto e necessário antes da produção final
- Paytable e pesos RNG.
- Casos-limite de LCD dupla-face; como validar a contribuição de metades sem pagamento duplo.
- Seleção exata dos símbolos elegíveis para WEED/ALCOOL/COPIUM.
- Quantos movimentos MDMA pode executar em cada modo, segundo a matemática aprovada.
- Prioridade entre Chemistry/Police/cascatas quando eventos ocorrem simultaneamente.
- Probabilidades e limites das intervenções do Peace Police.
- Critério final de trigger e duração de Afterparty.
- Indicadores de performance e assets finais.
- Registo de nome e revisão de marcas antes do lançamento.
- Conformidade regulatória do mercado de destino.

---

# 17. CHECKLIST EXECUTIVA PARA A EQUIPA

[ ] Criar mockup final do Party Stage com 21/25 posições.  
[ ] Desenhar seis personagens (incluindo Peace Police) em NORMAL/ALTER EGO.  
[ ] Prototipar clusters e cascatas com testes determinísticos.  
[ ] Implementar cinco poderes individuais com duração e elegibilidade explícitas.  
[ ] Implementar dez pares Chemistry.  
[ ] Implementar níveis 3, 4 e 5 de Chemistry e abertura dos cantos.  
[ ] Implementar Calmer e Joiner sem apagar prémios passados.  
[ ] Construir cinco rodadas gratuitas de demo no Afterparty.  
[ ] Criar indicadores de pagamento, Chemistry, Police e histórico de efeitos.  
[ ] Produzir animações e stingers com opção de reduzir efeitos.  
[ ] Confirmar áudio, contraste, legendas e responsividade.  
[ ] Validar simulações, regras, replays e compliance antes de qualquer jogo a dinheiro real.

---

## FIM DO DOCUMENTO — V1.0
**Proposta de título: PEACE POLICE: THE AFTERPARTY**
**Arquitetura:** Party Stage (3–5–5–5–3) + Alter Egos + Chemistry + Calmer/Joiner + Afterparty.
