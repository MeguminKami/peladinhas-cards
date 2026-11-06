# Prompt — RISCO, o crash do LCD

Copiar tudo a partir da linha seguinte e entregar ao Codex.

---

## Missão

Cria um jogo de **crash** novo para o casino Peladinhas, chamado **RISCO** (nome de trabalho, o dono pode mudar). Fica em `games/risco/` e integra-se no casino como os outros jogos. Uso privado entre amigos, créditos fictícios (DJC), português de Portugal.

Este jogo vive da apresentação. A matemática é simples e fixa, por isso a maior parte do esforço vai para **animação, arte, som e sensação de jogo**. Usa ao máximo as tuas capacidades de geração de imagem, sprites, shaders, partículas, GIF e vídeo. O resultado tem de parecer um jogo de estúdio, não um protótipo.

Antes de escrever código, lê: `AGENTS.md` da raiz, `games/piece-police/AGENTS.md` (regras de motor e de escrita que também valem aqui), `games/piece-police/docs/fase3/PESSOAS.md`, `games/piece-police/docs/TEMA.md`, `games/piece-police/docs/visuais-animacoes.md`, `docs/reference/interface-quality.md` (só as secções aplicáveis) e `DEPLOY.md`. Para a integração, estuda como a Princesa Sofia entra no casino: `js/casino-catalog.js`, `js/casino.js`, `js/casino-sofia-host.js`, `js/casino-sofia-local.js`, `js/casino-local-wallet.js` e `games/princesa-sofia/INTEGRACAO.md`. Segue esse padrão em vez de inventar outro.

## Conceito

Uma linha de pó branco («um risco») estende-se por uma mesa de vidro escuro enquanto o multiplicador sobe. O protagonista é o **LCD — The Glitch** (P5 do Peace Police), sempre com o mesmo rosto da folha aprovada `games/piece-police/art-src/characters/CHR-P5-SHEET.png`. Ele está debruçado sobre a mesa, nota enrolada na mão, à espera do momento.

O jogador aposta, a linha cresce e o LCD vai perdendo a cabeça. Quem faz cashout a tempo fica com a sua parte. No crash, o LCD não aguenta mais: passa a nota de ponta a ponta e cheira a linha toda.

Tom: caricatura simpática e cómica, como nas regras de `PESSOAS.md` (favorecer, não humilhar). O dono autorizou drogas e objetos de consumo na arte para uso privado. Isso não autoriza publicação nem distribuição.

## Matemática (contrato fixo)

- **RTP 99 %** para qualquer estratégia de cashout. **Ganho máximo 9 999×** a aposta.
- Ponto de crash `C`, sorteado no início da ronda a partir de um RNG com seed:
  - `u` uniforme em [0, 1) com 52 bits de precisão.
  - `C = floor(99 / (1 − u)) / 100` em multiplicador, com mínimo 1,00× e máximo 9 999,00×.
  - Isto dá `P(C ≥ m) = 0,99 / m` para 1,01 ≤ m ≤ 9 999. O crash a 1,00× (antes do primeiro cashout possível, 1,01×) acontece em cerca de 2 % das rondas.
  - Para qualquer alvo `m` ≤ 9 999, o retorno esperado é `m × 0,99 / m = 0,99`. Aos 9 999× o cashout é forçado.
  - Confirma a fórmula com testes de fronteira (arredondamentos a 0,01×, `u` muito próximo de 1, 9 999 exato). Se o arredondamento desviar o RTP de 99 %, corrige a fórmula, não o alvo.
- Valores em **inteiros** (centésimos de multiplicador e unidades inteiras de aposta). Nada de floats para dinheiro. Pagamento = `floor(aposta × multiplicador_em_centésimos / 100)`.
- O multiplicador visível segue uma curva determinística no tempo, por exemplo `m(t) = e^(0,00006 × t_ms)` arredondado a 0,01× (2× por volta dos 11–12 s, 100× por volta dos 75 s). A curva **não** depende do crash, do saldo nem do histórico.
- As probabilidades nunca dependem do saldo, das perdas ou do histórico do jogador. Nada de «quase ganhaste» fabricado. As animações reagem ao multiplicador atual, **nunca** ao crash que vem aí (nada de tremer mais quando o crash está perto).

## Autoridade e justiça

- O ponto de crash nasce no motor **antes** da ronda e **nunca** é enviado ao cliente antes do crash. O cliente recebe o início da ronda e, no fim, o valor do crash.
- O cashout manual é decidido pelo multiplicador do **tempo do motor** quando o pedido chega, não pelo número que o cliente diz ter visto. Se `m(t_pedido) < C`, paga `m(t_pedido)`. Senão, perdeu. Como a curva é independente de `C`, o RTP de 99 % mantém-se com qualquer latência.
- **Auto-cashout** opcional (1,01× a 9 999×), definido antes da ronda e aplicado pelo motor de forma exata.
- Seed comprometida: mostra o hash da seed antes da ronda e revela a seed no fim (painel «Verificar ronda»).
- Determinismo: o motor (`src/`) não usa DOM, relógio, rede, `Math.random()` nem estado global. O tempo entra como parâmetro. Mesma seed + mesmos pedidos + mesma versão = mesmo resultado. A apresentação pode usar aleatoriedade própria só para efeitos visuais.
- Segue o caminho de carteira que o casino já usa para a Princesa Sofia. Se o jogo tiver de liquidar no backend, descreve o plano ao dono antes de mexer em `functions/` e nunca leias nem escrevas dados reais do Firebase sem autorização explícita.

## Simulador

- `npm run sim` sem argumentos: 1 000 000 de rondas por estratégia (alvos fixos 1,01×, 1,5×, 2×, 5×, 10×, 100×, 1 000×, 9 999× e cashout aleatório). Mostra RTP, intervalo de confiança a 95 %, frequência de crash a 1,00×, distribuição de `C` por faixas e o maior ganho. Grava CSV e JSON em `relatorios/` com seed e versão.
- O simulador usa exatamente o mesmo motor do jogo. As seeds de validação não são as de calibração.
- `MATH_VERSION` num ficheiro de tabelas, com histórico.
- Nunca escrever «RTP confirmado» nem «certificado». Apresenta a tabela com amostra e intervalo.

## Direção de arte

Estilo **Acidwave** do Peace Police: néon ácido (verde-limão, magenta, ciano) sobre preto profundo, grão de filme, aberração cromática, scanlines leves de ecrã LCD. O pó branco é o único branco puro do ecrã, para a linha ser sempre o centro da atenção.

### Cena (camadas com parallax)

1. **Fundo:** uma casa de banho de discoteca às 5 da manhã, desfocada, com luzes néon a piscar, azulejos, espelho rachado e um cartaz do Peace Police meio rasgado. Ligeiro movimento contínuo (luzes, fumo).
2. **Mesa:** vidro preto espelhado em perspetiva, com reflexos do néon. A linha corre da esquerda para a direita em diagonal ligeira, a subir, como um gráfico.
3. **LCD:** em primeiro plano, à esquerda, de ¾, debruçado, nota enrolada na mão. Corpo animado em esqueleto (Spine, DragonBones ou rig próprio em Canvas/WebGL) ou sprite sheets de alta qualidade. Rosto sempre fiel à folha de personagem.
4. **Primeiro plano:** cartão de crédito, notas soltas, um copo, partículas de pó no ar.
5. **HUD:** multiplicador enorme, botões, histórico.

### A linha

- Renderização procedimental em Canvas 2D ou WebGL, **não** um sprite esticado: grão a grão, com textura de pó, bordas irregulares, pequenos montinhos e brilho especular.
- A ponta da linha avança com a curva do multiplicador e deixa um pequeno rasto de partículas. Por baixo, um gráfico fantasma em néon mostra a curva.
- Depois de 10× a linha começa a ganhar «vida»: ondula ligeiramente, pulsa ao ritmo da música e o pó solta faíscas cromáticas. Depois de 100× ganha um contorno de glitch RGB.

### Estados e linha do tempo das animações

| Momento | Duração | O que acontece |
| --- | --- | --- |
| Entre rondas | 5 s com contagem | O LCD usa o cartão de crédito para alinhar o pó. Três batidas secas do cartão na mesa marcam a contagem 3, 2, 1. Barra de progresso em forma de linha a encher. |
| Arranque | 0,6 s | Zoom suave da câmara para a mesa, a linha nasce com um «puff» de pó. |
| 1–2× | contínuo | LCD calmo e confiante, sorriso de lado, a abanar a cabeça ao ritmo. |
| 2–10× | contínuo | LCD ansioso: pupilas a dilatar, perna a tremer, gotas de suor, olha para a linha e para a câmara. |
| 10–100× | contínuo | LCD alucinado: olhos enormes, cabelo a eriçar, rosto com glitch em fatias, o fundo distorce em ondas, cores a rodar no matiz. Câmara com micro-tremor. |
| 100–1 000× | contínuo | Glitch total: a imagem parte-se em blocos de ecrã LCD avariado, pixel sorting, o LCD vibra entre várias cópias de si mesmo, o multiplicador ganha chamas néon. |
| 1 000–9 999× | contínuo | Modo lenda: o fundo desaparece num túnel psicadélico, o LCD flutua, coro de ecos na música. |
| Cashout do jogador | 1,2 s | Uma porção da linha descola-se e voa em arco até ao saldo como pó brilhante, contador de DJC a rolar, o LCD olha para o jogador com cara de traído. O resto da ronda continua a correr em fundo, mais discreto, até ao crash. |
| **Crash** | 2,5 s | Congela 150 ms. O LCD inclina-se, encosta a nota e varre a linha toda da esquerda para a direita a grande velocidade (a linha desaparece atrás da nota com partículas a ser sugadas). Cabeça atira-se para trás, olhos a girar, flash branco, onda de choque, câmara a tremer, ecrã a partir em glitch. Texto grande «CRASH @ 3,47×» a entrar com distorção. O multiplicador fica vermelho e a estalar. |
| Crash a 1,00× | 1,5 s | Nem dá tempo à linha: o LCD cheira o monte inicial antes de ele se espalhar, pisca os olhos e encolhe os ombros para a câmara. Texto «NEM DEU PARA ALINHAR». |
| MAX WIN 9 999× | 6 s | Cashout forçado. A linha atravessa todo o ecrã e sai pela borda, o LCD transcende (aura, coroa de néon, olhos em espiral), chuva de notas, «MAX WIN 9 999×» em letras gigantes. Pode ser saltado com um toque. |

- Use easing com intenção (antecipação, overshoot, settle). Nenhuma animação é linear sem motivo.
- O crash tem de ser a animação mais satisfatória e engraçada do jogo. Faz pelo menos duas variações para não ficar repetitivo (por exemplo, a nota varre numa passagem só, ou em duas fungadas com uma pausa cómica).
- Micro-reações do LCD a cada marco (2×, 5×, 10×, 50×, 100×, 500×, 1 000×): uma frase curta em balão («Ainda não…», «Agora é que é», «ESTOU A VER SONS»), escolhida de uma lista sem repetir seguidas.
- Tudo a 60 fps em portátil normal e fluido em telemóvel médio. Pré-carregar todos os recursos antes da primeira ronda. Orçamento de partículas e qualidade adaptativa (baixar efeitos se o fps cair).

### Arte a gerar

- Partir **sempre** da folha `CHR-P5-SHEET.png` como imagem de referência (edição, img2img ou referência de personagem). Se a ferramenta não aceitar referência, para e diz ao dono em vez de inventar o rosto.
- Estados do LCD: a alinhar com o cartão, calmo, ansioso, alucinado, glitch total, lenda, a cheirar (sequência de 6–10 poses chave), cabeça para trás pós-crash, encolher de ombros, cara de traído, MAX WIN.
- Elementos: fundo em camadas, mesa, nota enrolada, cartão, notas soltas, textura de pó, partículas, logótipo RISCO com uma linha de pó a formar o «I».
- Guarda as fontes em `games/risco/art-src/` e só as imagens finais otimizadas (WebP, sprite sheets ou atlas) em `games/risco/ui/art/`. As fotografias da pessoa nunca entram no jogo publicado.
- Antes de integrar, mostra ao dono uma folha com os estados do LCD para aprovação do rosto.

### Material para partilhar no grupo

Gera também, a partir do próprio motor de apresentação:

- `promo/crash.gif` e `promo/crash.mp4`: um crash completo (6–8 s, 720 px de largura, em loop limpo), para mandar no WhatsApp.
- `promo/max-win.gif`: a animação de MAX WIN.
- `promo/capa.webp`: a capa do jogo para o catálogo do casino (também copiada para `assets/casino/covers/risco.webp`).

## Som (cria tu)

Cria todos os efeitos sonoros tu mesmo, com síntese em Web Audio, geração de áudio ou ambos. Exporta para ficheiros curtos (OGG/MP3 com fallback, normalizados a −16 LUFS) em `games/risco/ui/audio/` e regista a origem de cada um em `ASSETS.md`. Nada de sons copiados de outros jogos ou bibliotecas sem licença.

| Som | Quando | Carácter |
| --- | --- | --- |
| Batida do cartão | contagem entre rondas (×3) | toque seco de plástico em vidro, cada um mais agudo |
| Puff de arranque | a linha nasce | sopro curto de pó com brilho |
| Tom de subida | contínuo durante a ronda | camada sintetizada cujo tom e filtro sobem com o multiplicador, a acompanhar a música sem a tapar |
| Marcos | 2×, 10×, 100×, 1 000× | sino néon ascendente, cada marco mais rico |
| Fungada de crash | crash | fungada longa e exagerada, com a variante em duas fungadas, seguida de um «glitch» digital e um impacto grave |
| Crash a 1,00× | crash instantâneo | fungada curta e cómica, com um «boing» triste |
| Cashout | o jogador sai | «ka-ching» com pó brilhante e contador a rolar |
| Traído | LCD reage ao cashout | gemido curto ou «hmpf» sem palavras |
| Ronda perdida | o jogador estava dentro no crash | estalo grave curto, não frustrante |
| MAX WIN | 9 999× | explosão orquestral-eletrónica curta e uma chuva de moedas |
| UI | botões, +/−, auto | cliques discretos e consistentes |

- Mistura com prioridades: o crash e o cashout cortam por cima de tudo (ducking da música).
- Controlo de volume separado para música e efeitos, e botão de silêncio. O som só arranca depois do primeiro toque do jogador.

## Música (o dono gera noutra IA)

O dono vai criar a música numa IA de música (Suno ou semelhante). Tu **não** geras a música. Em vez disso:

1. Entrega ao dono, num ficheiro `games/risco/docs/PROMPT-MUSICA.md`, as prompts completas e prontas a colar, partindo das que estão abaixo e ajustando-as ao que construíste (BPM, duração, transições).
2. Prepara o motor de áudio para **música adaptativa por camadas**: as faixas têm o mesmo BPM e duração, tocam em sincronia e a intensidade entra por camadas conforme o multiplicador (camada 1 sempre, camada 2 a partir de 2×, camada 3 a partir de 10×, camada 4 a partir de 100×). Entre rondas toca a faixa de espera.
3. Enquanto o dono não entrega os ficheiros, usa uma música provisória sintetizada por ti com a mesma estrutura, e deixa claro em `ASSETS.md` que é provisória.
4. Indica os nomes de ficheiro e o formato que esperas, para o dono só ter de os largar na pasta.

Prompts de partida (em inglês, porque as IAs de música respondem melhor):

- **Espera (loop, 32 compassos, 124 BPM):** «Dark acid house loop, 124 BPM, A minor, late night club bathroom vibe, muffled kick through a wall, squelchy 303 acid bassline filtered low, distant crowd murmur, neon hum, tense but groovy, no vocals, seamless loop.»
- **Ronda, camada base (124 BPM, A minor, mesmo comprimento):** «Driving acid techno, 124 BPM, A minor, punchy kick, tight hats, rolling 303 acid bassline slowly opening its filter, rising tension, hypnotic, no vocals, seamless loop.»
- **Ronda, camada 2:** «Same track, add glitchy percussion, pitched vocal chops without words, sidechained synth stabs, more energy.»
- **Ronda, camada 3:** «Same track, psychedelic layer, detuned lead synth arpeggios, reverse cymbals, chaotic but in key, euphoric and paranoid.»
- **Ronda, camada 4:** «Same track, maximum intensity, distorted supersaw chords, choir pads, sirens in key, rave climax, still loopable.»
- **Stinger de crash (3 s):** «Short glitch stinger, tape stop, bitcrushed sub drop, comedic sniff sound replaced by synth whoosh, ends in silence.»
- **Stinger de MAX WIN (6 s):** «Triumphant rave stinger, huge supersaw chord, choir, coin shower sparkles, big drum fill, A minor to A major resolution.»

Se a IA de música não gerar camadas separadas com o mesmo andamento, diz ao dono o plano B: gerar uma faixa completa e separar stems numa ferramenta de separação, ou usar a faixa única com filtros e volume controlados pelo multiplicador.

## Interface

- Multiplicador enorme ao centro, com tipografia néon e contorno legível sobre qualquer fundo.
- Por baixo: valor da aposta (+/−, ½, 2×), auto-cashout, botão principal que alterna **APOSTAR → CASHOUT (valor atual em DJC) → À ESPERA**. Histórico dos últimos 20 crashes em pílulas (vermelho < 2×, verde ≥ 2×, dourado ≥ 100×).
- O botão de cashout é enorme, sempre visível e responde também à barra de espaço. Nenhuma animação, flash ou glitch o tapa ou o torna ilegível. O multiplicador e o botão ficam fora dos efeitos de distorção.
- Responsivo como a Princesa Sofia: computador, compacto e telemóvel na vertical, sem scroll, dentro do iframe por baixo do menu do site. Em telemóvel o LCD passa para cima da mesa e o HUD fica em baixo, ao alcance do polegar.
- `prefers-reduced-motion` e um botão «Efeitos reduzidos»: tira glitch, tremores e flashes fortes, mantém o crash e o cashout claros com transições suaves. Nenhum flash acima de 3 por segundo.
- Identidade Peladinhas. Textos em português de Portugal, sem ponto e vírgula nos textos visíveis.

## Testes e entrega

1. Testes do motor: distribuição de `C`, fronteiras (1,00×, 1,01×, 9 999×), cashout antes e depois do crash, auto-cashout, teto, determinismo por seed, inteiros.
2. `npm run sim` e tabela de RTP por estratégia com amostra e intervalo (alvo 99 %, todas entre 98,8 % e 99,2 % com 1 M de rondas).
3. Modo de demonstração com crash forçado (`?demo=crash&m=3.47`, `?demo=max`, `?demo=instant`) só para testar a apresentação, desligado no jogo real e sem afetar o motor.
4. Teste no browser: apostar → subir → cashout, apostar → crash, auto-cashout, crash a 1,00×, MAX WIN, em 1920×1080, 1366×768 com menu, 390 px e 320 px. Verificar cortes, sobreposições, o botão sempre visível e o fps.
5. Registar o jogo em `js/casino-catalog.js` com a capa e o movimento «RISCO» no histórico da carteira.
6. Criar `games/risco/README.md`, `AGENTS.md` (com este contrato fixo), `INTEGRACAO.md`, `ASSETS.md` e `docs/PROMPT-MUSICA.md`.
7. Resposta final: o que foi feito, o que foi testado, o que falta (música do dono, aprovação do rosto), e terminar com **Deploy:** `.\deploy.ps1`.

Perguntar ao dono só se faltar uma decisão que bloqueie (nome final, aprovação do rosto, carteira no servidor). O resto decide-se de forma autónoma.
