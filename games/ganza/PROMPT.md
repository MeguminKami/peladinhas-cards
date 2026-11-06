# Prompt — GANZÁ, o Plinko Pop Art do WEED

Copiar tudo a partir da linha seguinte e entregar ao Codex.

---

## A ambição

Vais criar **GANZÁ**, um Plinko para o casino Peladinhas protagonizado pelo **WEED**, em estilo **Pop Art** de banda desenhada. Não é um protótipo nem um Plinko genérico com outra cor. O objetivo é um jogo que pareça saído de um estúdio: arte desenhada e animada a sério, efeitos com peso, sons realistas e uma direção visual tão forte que qualquer captura de ecrã pareça um cartaz.

Há tempo. Trabalha por fases, mostra ao dono cada ponto de aprovação e não avances para a produção final antes de o estilo estar aprovado. Prefere fazer menos coisas excelentes a muitas coisas médias, mas a lista de entrega abaixo é para cumprir toda.

Uso privado entre amigos, créditos fictícios (DJC), português de Portugal. O jogo fica em `games/ganza/` e integra-se no casino como os outros jogos.

### Leitura obrigatória antes de começar

- `AGENTS.md` da raiz e `games/piece-police/AGENTS.md` (regras de motor determinístico, inteiros e escrita, que também valem aqui).
- `games/piece-police/docs/fase3/PESSOAS.md` (regras para personagens com rosto de pessoas reais).
- `games/piece-police/docs/TEMA.md` (quem é o WEED, a sua cor e atitude). O estilo deste jogo é Pop Art, não o Acidwave do Peace Police, mas a personagem é a mesma.
- `docs/reference/interface-quality.md` (só as secções aplicáveis) e `DEPLOY.md`.
- Integração no casino: `js/casino-catalog.js`, `js/casino.js`, `js/casino-sofia-host.js`, `js/casino-sofia-local.js`, `js/casino-local-wallet.js` e `games/princesa-sofia/INTEGRACAO.md`. Segue o padrão da Princesa Sofia em vez de inventar outro.

## O tema

Noite de lua cheia na costa norte de Marrocos. No topo de uma falésia está o **WEED — The Chiller** (P1 do Peace Police), sentado na beira, pernas a balançar, chapéu de tecido, bigode e barba no queixo, sorriso tranquilo, casaco largo. Ao lado tem uma pilha de **placas de ganzá** embrulhadas em película e carimbadas.

Ele larga as placas, uma a uma, sem pressa nenhuma. Elas ressaltam por um tabuleiro de bóias e cabeços de amarração presos à falésia e aterram numa fila de **lanchas de narcotráfico** à espera no mar. Cada lancha tem o multiplicador pintado no casco. Quanto mais para a ponta, mais rara e mais rica é a lancha.

O nome é **GANZÁ**, escrito sempre em maiúsculas e com acento. No logótipo, o acento do «Á» é uma placa a cair, com linhas de velocidade. «GANZÁ!!» é também a onomatopeia dos grandes prémios.

Tom: comédia de banda desenhada, simpática. Regras de `PESSOAS.md`: favorecer, não humilhar, rosto sempre reconhecível. O dono autorizou drogas e objetos de consumo na arte para uso privado. Isso não autoriza publicação nem distribuição. Os adereços são ilustração, sem instruções de preparação ou dosagem.

## Direção de arte: Pop Art de banda desenhada

O jogo inteiro é uma **página de banda desenhada viva** e um cartaz Pop Art dos anos 60, animado.

### Linguagem visual

- **Contornos pretos grossos** em tudo, com espessura variável como traço a tinta (mais grosso por baixo e nas sombras).
- **Cores chapadas e saturadas**: amarelo-limão, vermelho-tomate, ciano, magenta, preto e branco-papel. A cor do WEED, **verde jade `#00F5A8`**, é a cor de assinatura do jogo e aparece nas placas, nas bóias acesas, no fumo e nos prémios.
- **Pontos Ben-Day** (meio-tom) para sombras, céu, mar e pele, com tamanhos de ponto que variam para dar volume. Feitos com um shader de meio-tom em tempo real, não só com texturas, para que luzes e flashes se transformem em pontos.
- **Desalinhamento de impressão**: um leve deslocamento das cores (efeito de impressão barata em offset) que aumenta nos momentos de euforia.
- **Textura de papel** de revista antiga sobre todo o ecrã, com grão subtil e cantos ligeiramente amarelados.
- **Linhas de velocidade**, **estrelas de impacto** e **onomatopeias** desenhadas à mão: «TOC!», «PLOC!», «SPLASH!», «VRUUUM!», «GANZÁ!!». Cada uma com letras inclinadas, contorno duplo e sombra sólida.
- **Balões de fala e de pensamento** com a tipografia clássica de banda desenhada (maiúsculas, traço irregular).
- **Repetição em grelha** ao estilo cartaz serigrafado: o retrato do WEED repetido em 4 ou 9 quadrados com paletas diferentes, nos grandes prémios.
- Tipografia: uma fonte de banda desenhada com licença livre (Google Fonts, por exemplo Bangers ou Luckiest Guy) para títulos e onomatopeias, e uma fonte limpa e legível para números e controlos.

### Cena (camadas com parallax e animação contínua)

1. **Céu:** lua enorme amarela com meio-tom vermelho, estrelas em forma de estrela de banda desenhada a cintilar, nuvens com contorno preto a deslizar devagar.
2. **Horizonte:** as luzes da outra costa em pontos coloridos e um farol cujo feixe é um cone de linhas de velocidade a varrer a cena.
3. **Falésia:** rocha em blocos chapados com sombras em pontos, plantas a abanar ao vento, a pilha de placas e o WEED sentado no topo.
4. **Tabuleiro:** bóias e cabeços néon presos à rocha por cordas, em triângulo. Cada pino tem estado normal e estado aceso (estrela de impacto jade, a encolher em 200 ms).
5. **Mar e lanchas:** ondas em faixas onduladas com meio-tom ciano, a mexer em ciclo. As lanchas pretas semirrígidas balançam desfasadas. O multiplicador está pintado no casco dentro de uma estrela de banda desenhada, com cor por valor: cinzento nas baixas, jade nas médias, amarelo nas altas, vermelho e magenta a piscar nas máximas.
6. **Primeiro plano:** fumo jade em nuvens de banda desenhada, folhas a voar, salpicos com contorno.
7. **Moldura:** o ecrã inteiro tem margem de vinheta de banda desenhada (contorno preto e calha branca). Nos grandes momentos, a cena divide-se em vinhetas.

**Cameo opcional e puramente decorativo:** de vez em quando passa ao fundo uma lancha da Peace Police com a sirene a piscar e um balão «… nada a ver aqui». Nunca coincide com resultados nem dá a entender nada sobre eles.

### Personagem

- Parte **sempre** da folha aprovada `games/piece-police/art-src/characters/CHR-P1-SHEET.png` como imagem de referência (edição, img2img ou referência de personagem). Converte-a para Pop Art mantendo o rosto: forma da cara, olhos, nariz, bigode, barba, chapéu, tom de pele. Se a ferramenta não aceitar referência, para e diz ao dono em vez de inventar o rosto.
- O WEED é animado de verdade, não uma imagem parada com zoom: rig em esqueleto (Spine, DragonBones ou rig próprio em PixiJS) com partes separadas (cabeça, olhos, pálpebras, boca, bigode, chapéu, braços, mãos, pernas) **ou** animação quadro a quadro em sprite sheets a 12–24 fps, como desenho animado. Pode combinar os dois.
- Animações necessárias (todas em ciclo limpo ou com entrada e saída):
  - **Inativo:** respira, pisca os olhos, abana a cabeça ao ritmo da música, balança as pernas. A cada 8–15 s escolhe uma variação: fuma e solta um anel de fumo em forma de folha, acena à câmara, boceja, coça o bigode, olha para a lua.
  - **Pegar e largar:** pega numa placa, dá-lhe um toque no chapéu ou um beijo, atira com um gesto preguiçoso (antecipação, lançamento, seguimento). Duas ou três variações.
  - **Seguir a placa:** os olhos e a cabeça acompanham a placa a cair.
  - **Reações:** encolher de ombros (lancha baixa), polegar para cima (média), de pé a apontar e a gritar (alta), dança da vitória (máxima), erguer a pilha ao céu (prémio máximo do jogo).
  - **Autoplay:** atira placas em ritmo, como quem dá cartas, com uma animação mais curta.
- Lábios e expressões com mudanças de forma claras, como em desenho animado.

### A placa

- Bloco retangular com cantos gastos, película brilhante com reflexo em pontos brancos, contorno preto, e um carimbo inventado e cómico (folha, sol, camelo, lua, «100 % BIO»). Pelo menos 6 carimbos, escolhidos ao acaso só na apresentação.
- Roda, inclina e achata ligeiramente ao bater (squash and stretch), com linhas de velocidade e um rasto de fumo jade. Tem peso: nunca parece uma bola disfarçada.

## Animação e efeitos

### O percurso

- O motor decide o percurso **antes** da animação (ver Matemática). A trajetória é coreografada para o seguir: em cada pino a placa vai para o lado decidido, com ressalto, rotação e velocidade naturais (física cinemática guiada por pontos alvo, curvas de Bézier ou simulação com correção suave). Tem de parecer física real, sem teletransportes nem mudanças de direção impossíveis.
- Variações de altura do ressalto e rotação para duas placas no mesmo percurso não parecerem iguais.
- Queda de 2,5–3,5 s em 16 linhas, mais curta em 8. Várias placas no ar passam à frente e atrás umas das outras em camadas.
- Cada toque num pino: estrela de impacto, pino aceso, pequena onomatopeia «TOC!» de vez em quando (não em todos, para não poluir), faísca de pontos.

### Momentos de resultado

| Lancha | Duração | Animação |
| --- | --- | --- |
| Baixa (< 1×) | 0,8 s | «PLOC!», a lancha afunda um pouco, o piloto encolhe os ombros, o WEED também. |
| Média (1–10×) | 1,2 s | «SPLASH!» com salpicos de contorno, a lancha arranca uns metros e volta, o multiplicador salta do casco numa estrela. Polegar para cima do WEED. |
| Alta (10–100×) | 2 s | Congela 100 ms como uma vinheta, «VRUUUM!», a lancha empina com linhas de velocidade, fumo jade, câmara a abanar ligeiramente, impressão desalinhada a aumentar. O WEED levanta-se a apontar com um balão («ISTO É DO BOM!»). |
| Máxima (≥ 100×) | 4 s | A cena parte-se em **três vinhetas**: grande plano dos olhos do WEED a arregalar, a mão do piloto a acelerar, a lancha a sair de cena a toda a velocidade. Depois volta ao plano geral com «GANZÁ!!» em letras gigantes, chuva de notas e folhas, farol a apontar à lancha. Pode ser saltada com um toque. |
| Prémio máximo do jogo | 7 s | **«CARGA COMPLETA»**: o ecrã vira um cartaz serigrafado com o WEED repetido em grelha de 3 × 3 em paletas diferentes, depois explode em fogo de artifício de pontos, todas as lanchas buzinam e o WEED ergue a pilha ao céu. Pode ser saltada. |

### Transições e interface animada

- Mudar linhas ou risco: o tabuleiro reorganiza-se com um virar de página de banda desenhada ou com os pinos a saltar para as novas posições, e os números dos cascos rolam até aos novos valores.
- O saldo sobe com contador animado e uma estrela «+DJC».
- O botão **LARGAR** é um botão grande de banda desenhada (contorno grosso, sombra sólida que desaparece ao carregar, como um botão físico).
- Frases do WEED em balões, sem repetir seguidas: «Calma, que vai», «Tá-se bem», «Mais uma para o barco», «Isto é do bom», «Sem stress, irmão».

### Qualidade técnica da animação

- Easing com intenção (antecipação, overshoot, assentamento) em tudo. Nada de movimentos lineares sem motivo.
- Squash and stretch, sobreposição de ação (o chapéu e o casaco atrasam-se ao corpo), arcos naturais.
- Renderização em WebGL (PixiJS ou equivalente) com o shader de meio-tom e o de desalinhamento de impressão aplicados por camadas. Partículas em pool.
- 60 fps em portátil normal e fluido em telemóvel médio com 10 placas no ar. Qualidade adaptativa (baixa partículas e shaders se o fps cair). Pré-carregar tudo com um ecrã de carregamento que já é Pop Art (a pilha de placas a encher).

## Som: efeitos realistas (cria tu)

Os efeitos têm de soar **reais e com corpo**, como foley de cinema, mesmo com a imagem em banda desenhada. Cria-os tu com geração de áudio, gravações livres de direitos (CC0, com origem registada) e camadas em Web Audio. Nada de bips sintéticos para os sons principais.

- Cada som importante tem **4–6 variações** (round-robin) e pequenas variações de tom e volume em tempo real, para nunca soar repetido.
- **Espacialização:** o som segue a posição horizontal no ecrã (panorâmica estéreo) e o tamanho do evento.
- **Ambiente acústico:** reverberação de exterior à beira-mar à noite (espaço aberto, eco na falésia), aplicada de forma coerente a tudo.
- Exporta em OGG com fallback MP3, normalizado a −16 LUFS, em `games/ganza/ui/audio/`. Regista a origem e a licença de cada som em `ASSETS.md`.

| Som | Quando | Como deve soar |
| --- | --- | --- |
| Película | pegar na placa | plástico de embrulho a amarrotar entre os dedos |
| Lançamento | a placa sai da mão | deslocação de ar curta, peso de um bloco pequeno |
| Toque no pino | cada ressalto | bloco embrulhado a bater em bóia de borracha ou cabeço de madeira molhada, com um toque tonal subtil afinado na tonalidade da música, a subir à medida que desce. Com várias placas, limita vozes e volume. |
| Água pequena | lancha baixa | placa a cair na água ao lado da lancha, «plop» abafado |
| Splash | lancha média | queda na lancha com salpico, casco de borracha a ceder, motor fora de borda a engasgar e a ligar |
| Arranque | lancha alta | motor fora de borda a rugir, casco a bater nas ondas, salpicos grandes |
| Fuga | lancha máxima | dois motores a fundo a afastar-se (efeito Doppler), buzina de barco, gritos de festa sem palavras |
| Carga completa | prémio máximo | fogo de artifício real sobre o mar, todas as buzinas, multidão ao longe |
| Ambiente | sempre | ondas a bater na rocha, vento na falésia, cordas a ranger, gaivota rara, grilos |
| Farol | ciclo do feixe | zumbido grave e muito discreto |
| Lancha da Peace Police | cameo | sirene curta ao longe, motor a passar |
| WEED | reações | risos baixos, «hmm» satisfeito, assobio, expiração de fumo, sem palavras |
| UI | botões | cliques de botão físico, discretos e consistentes. O botão LARGAR tem um clique mais grave. |
| Contador de DJC | ganhos | moedas reais a cair, curto, proporcional ao prémio |

- Mistura com prioridades: os grandes prémios baixam a música e o ambiente (ducking).
- Volumes separados para música, efeitos e ambiente, e botão de silêncio. O som só arranca depois do primeiro toque do jogador.

## Música de fundo (prompt no fim do desenvolvimento)

A música é feita pelo dono numa IA de música (Suno ou semelhante), **no fim**. Tu não a geras. O teu trabalho:

1. Durante o desenvolvimento, usa uma faixa provisória simples, marcada como provisória em `ASSETS.md`.
2. Prepara o motor de áudio para **música adaptativa por camadas** sincronizadas (mesmo BPM, tom e duração): camada base sempre, camada 2 com várias placas no ar ou em autoplay, camada 3 durante 8 compassos depois de um prémio alto. Mais stingers para prémio máximo e carga completa.
3. **No fim**, quando o jogo estiver acabado, escreve `games/ganza/docs/PROMPT-MUSICA.md` com as prompts completas e prontas a colar, feitas a partir do jogo real: andamento, tonalidade (a mesma das notas dos pinos), duração em compassos, estrutura de cada camada, instrumentos, ambiente, e a indicação de loop sem cortes. Em inglês, porque as IAs de música respondem melhor. A direção é **dub reggae noturno com influência gnawa marroquina e um toque retro dos anos 60** (para casar com o Pop Art): baixo quente, bateria one-drop, castanholas metálicas, alaúde de baixo dedilhado, guitarra em contratempo com eco, órgão retro, sem voz. Não uses nomes de artistas.
4. Nesse ficheiro indica também os nomes de ficheiro, o formato e a duração que esperas, e o plano B se a IA não gerar camadas separadas (separar stems de uma faixa completa ou usar uma faixa única com filtros controlados pelo jogo).

## Matemática (contrato fixo)

- **RTP 99 %** em cada combinação de linhas e risco. **Ganho máximo 9 999×** a aposta (só em 16 linhas com risco alto).
- Configurações: **8, 12 e 16 linhas**, risco **baixo, médio e alto** (9 tabelas).
- O resultado nasce do percurso: em cada linha a placa vai para a esquerda ou para a direita com probabilidade 1/2, a partir de um RNG com seed. A lancha final é o número de «direitas», com probabilidade `C(n, k) / 2^n`.
- É proibido sortear o prémio e depois fabricar o percurso.
- Tabelas de multiplicadores em `tabelas/`, separadas do código e legíveis (`npm run tabelas` mostra-as), em **centésimos inteiros**, simétricas, a crescer do centro para as pontas, desenhadas por uma curva suave e documentadas em `docs/matematica.md`.
  - O RTP de cada tabela calcula-se **exatamente** por enumeração e tem de ficar entre 98,99 % e 99,01 %. Um teste falha se alguma sair desse intervalo.
  - Risco baixo: centro perto de 0,5×, pontas até ~16×. Médio: centro ~0,3–0,4×, pontas até ~100–200×. Alto: centro 0,2×, pontas enormes (9 999× nas pontas de 16 linhas).
  - Nenhuma lancha paga 0×.
- Valores em **inteiros**. Pagamento = `floor(aposta × multiplicador_em_centésimos / 100)`.
- As probabilidades nunca dependem do saldo, das perdas ou do histórico do jogador. Nada de «quase ganhaste» fabricado.

### Autoridade e justiça

- O percurso nasce no motor antes da animação. A física visual é encenação, nunca a fonte do resultado.
- Seed comprometida: hash da seed antes da jogada, seed e percurso revelados no fim (painel «Verificar jogada»).
- O motor (`src/`) não usa DOM, relógio, rede, `Math.random()` nem estado global. Mesma seed + mesmo pedido + mesma versão = mesmo resultado. A apresentação pode usar aleatoriedade própria só para efeitos visuais.
- Cada placa é uma jogada independente, debitada quando cai.
- Segue o caminho de carteira da Princesa Sofia. Se o jogo tiver de liquidar no backend, descreve o plano ao dono antes de mexer em `functions/` e nunca leias nem escrevas dados reais do Firebase sem autorização explícita.

### Simulador

- `npm run sim` sem argumentos: RTP exato de cada tabela e 1 000 000 de placas por tabela com o mesmo motor do jogo. Mostra RTP simulado, intervalo de confiança a 95 %, frequência esperada e observada por lancha, desvio padrão e maior ganho. Grava CSV e JSON em `relatorios/` com seed e versão.
- `MATH_VERSION` com histórico. As seeds de validação não são as de calibração. Nunca escrever «RTP confirmado» nem «certificado».

## Interface

- Controlos: aposta (+/−, ½, 2×), linhas (8, 12, 16), risco (baixo, médio, alto), botão **LARGAR** (também barra de espaço) e autoplay (10, 25, 50, 100 placas, com paragem por ganho ou perda). Linhas e risco só mudam sem placas no ar.
- Histórico das últimas 20 placas em pílulas com a cor da lancha. Ao passar por cima de uma lancha, mostrar a probabilidade dela.
- Os controlos são painéis de banda desenhada (contorno, sombra sólida, meio-tom), mas os números ficam sempre com contraste alto e sem efeitos por cima. Nenhuma animação tapa o saldo, o botão ou os cascos.
- Responsivo como a Princesa Sofia: computador, compacto e telemóvel na vertical, sem scroll, dentro do iframe por baixo do menu do site. Em telemóvel o tabuleiro ocupa o centro, o WEED fica no topo e os controlos em baixo, ao alcance do polegar. Em 16 linhas os cascos continuam legíveis a 320 px.
- `prefers-reduced-motion` e botão «Efeitos reduzidos»: tira tremores, desalinhamento de impressão e flashes, mantém quedas e resultados claros. Nenhum flash acima de 3 por segundo.
- Textos em português de Portugal, sem ponto e vírgula nos textos visíveis.

## Fases e pontos de aprovação

1. **Motor e matemática:** motor, tabelas, testes e simulador. Mostrar ao dono a tabela de RTP.
2. **Direção de arte (aprovação do dono):** um *style frame* em alta resolução com a cena completa em Pop Art, a folha do WEED em Pop Art (frente, ¾, 6 expressões) e as placas e lanchas. Não avançar sem aprovação do rosto e do estilo.
3. **Protótipo animado:** o jogo jogável com arte provisória, para acertar o ritmo da queda, os ressaltos e os tempos dos resultados.
4. **Produção de arte e animação:** rig ou sprite sheets do WEED, cena final, shaders, partículas, todos os momentos de resultado. Mostrar ao dono um vídeo curto com os momentos principais.
5. **Som:** efeitos realistas, ambiente e mistura.
6. **Polimento e testes:** desempenho, responsividade, acessibilidade, estados extremos.
7. **Música:** escrever `docs/PROMPT-MUSICA.md` e deixar o jogo pronto a receber os ficheiros.

Guarda as fontes de arte em `games/ganza/art-src/` e só os ficheiros finais otimizados (WebP, atlas, ficheiros do rig) em `games/ganza/ui/art/`. As fotografias da pessoa nunca entram no jogo publicado.

## Testes e entrega

1. Testes do motor: distribuição binomial, simetria e RTP exato de cada tabela, máximo 9 999× só em 16 linhas com risco alto, nenhum 0×, determinismo, inteiros, placas independentes.
2. `npm run sim` com a tabela de RTP (exato e simulado), amostra e intervalo.
3. Modo de demonstração (`?demo=lancha&k=0`, `?demo=max`, `?demo=carga`, `?demo=chuva`) só para testar a apresentação, desligado no jogo real e sem afetar o motor.
4. Teste no browser: uma placa, várias seguidas, autoplay, mudança de linhas e risco, prémio máximo, em 1920×1080, 1366×768 com menu, 390 px e 320 px. Confirmar que a placa termina sempre na lancha que o motor decidiu, sem cortes nem sobreposições, cascos legíveis e fps com 10 placas no ar.
5. Material para o grupo: `promo/queda.gif` e `promo/queda.mp4` (uma placa até uma lancha alta, 5–7 s, 720 px, loop limpo), `promo/carga-completa.gif`, e `promo/capa.webp` copiada para `assets/casino/covers/ganza.webp`.
6. Registar o jogo em `js/casino-catalog.js` com a capa e o movimento «GANZÁ» no histórico da carteira.
7. Criar `games/ganza/README.md`, `AGENTS.md` (com este contrato fixo), `INTEGRACAO.md`, `ASSETS.md`, `docs/matematica.md` e `docs/PROMPT-MUSICA.md`.
8. Resposta final: o que foi feito, o que foi testado, o que falta (música do dono), e terminar com **Deploy:** `.\deploy.ps1`.

Perguntar ao dono só nos pontos de aprovação ou se faltar uma decisão que bloqueie. O resto decide-se de forma autónoma.
