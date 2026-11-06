# GANZÁ — Falésia

6 de novembro de 2026. Implementação local da [direção aprovada](../../PROMPT-NOVO-VISUAL.md). Sem deploy, commit, push, alterações de Functions ou acesso ao Firebase real.

## Ajustes posteriores pedidos pelo dono

Sem popups por hover nas lanchas; detalhes exatos por clique. Ganzá castanha nas mãos, na pilha e em queda. WEED no topo da falésia, com lançamento descendente para o primeiro pino. Bangers local no título, LARGAR e resultados, Segoe UI nos números e controlos. Capturas desta correção: [desktop](ajustes-1920-medio.png) e [telemóvel](ajustes-320-medio.png), mais variantes `ajustes-LARGURA-DIFICULDADE.png`. A prévia em http://localhost:8090/#/casino usa fixtures com 100 000 DJC de teste, sem alterar saldo real. Os vídeos, GIFs e as capturas com prefixo `depois-` abaixo registam a entrega anterior a estas correções.

Regressão desta correção: destinos e recuperação passaram nos quatro tamanhos; o teste visual verificou a ausência do tooltip, personagem acima do primeiro pino, posições descendentes durante o lançamento e chegada à lancha. Dez peças: 59,4 FPS na medição dirigida. Teclado, autoplay e saldo grande também passaram.

## Resultado

- Falésia alaranjada independente, limpa de pinos pintados, com cais na base. Bóias jade presas por argolas de latão, sombra, balanço e brilho no impacto.
- Placa verde embrulhada e atada com cordel, rotação, achatamento nos impactos, pó de rocha e rasto jade no arco de lançamento. Mantém os bits do percurso e termina no centro da lancha correspondente, incluindo a disposição móvel.
- Uma fila de 9, 13 ou 17 semirrígidas pretas. Tubos pintados recebem cor pelo multiplicador, reflexos na água, brilho nas máximas, salpico, afundamento/balanço e saída com regresso nos prémios altos. Bandeiras legíveis com mastros; salto local do número. Etiquetas compactas não alteram valores exatos de probabilidades ou provas.
- WEED pintado com as fotografias autorizadas como referência, sentado na rocha, tapete e pilha de placas. Oito poses, ciclo de 20 s, respiração e transições curtas; gesto de lançamento, polegar, pose de pé e balanço na celebração máxima. Alpha pré-multiplicado, sem fotografia publicada.
- Pérgola, buganvílias, lanterna, hibiscos e folhas independentes. A decoração fica abaixo dos objetos jogáveis, preservando também a lancha da ponta.
- Quatro pinturas de ambiente horizontais e quatro verticais próprias. Dia dourado, pôr do sol rosa/lilás, crepúsculo violeta e noite com aurora. Luz, reflexos, fumo, pétalas, aves e geometria giratória variam apenas pela dificuldade. Transição de 1,25 s.
- Ambiente sonoro no bus existente: ondas CC0 e síntese local de aves, grilos, sinos distantes e pad, com transição suave. Música do dono e efeitos anteriores preservados.
- Controlos sobre madeira escura com friso de zellige; saldo em latão; placa verde no medalhão LARGAR; ícones de sol, pôr do sol, lua e aurora; histórico em tubos. Autoplay também usa azulejos, sem seletor visível. Configuração, teclado, prova e diálogos mantidos.
- Composição estática em cache, sprites de tubos em cache, qualidade adaptativa, carregamento prioritário da composição ativa e restantes pinturas em fundo. Retirados os renderers LoFi/pastel antigos e o shader Pop Art; arte pastel anterior excluída da build.

## Capturas finais

Em cada célula: cena inteira e integração com o menu do casino. As capturas anteriores estão na mesma pasta com prefixo `antes-`; [diferenças iniciais](ANTES.md).

| Janela | Baixa | Média | Alta | Extrema |
| --- | --- | --- | --- | --- |
| 1920×1080 | [Cena](depois-1920-baixo.png) · [Casino](casino-1920-baixo.png) | [Cena](depois-1920-medio.png) · [Casino](casino-1920-medio.png) | [Cena](depois-1920-alto.png) · [Casino](casino-1920-alto.png) | [Cena](depois-1920-extremo.png) · [Casino](casino-1920-extremo.png) |
| 1366×768 | [Cena](depois-1366-baixo.png) · [Casino](casino-1366-baixo.png) | [Cena](depois-1366-medio.png) · [Casino](casino-1366-medio.png) | [Cena](depois-1366-alto.png) · [Casino](casino-1366-alto.png) | [Cena](depois-1366-extremo.png) · [Casino](casino-1366-extremo.png) |
| 390×844 | [Cena](depois-390-baixo.png) · [Casino](casino-390-baixo.png) | [Cena](depois-390-medio.png) · [Casino](casino-390-medio.png) | [Cena](depois-390-alto.png) · [Casino](casino-390-alto.png) | [Cena](depois-390-extremo.png) · [Casino](casino-390-extremo.png) |
| 320×740 | [Cena](depois-320-baixo.png) · [Casino](casino-320-baixo.png) | [Cena](depois-320-medio.png) · [Casino](casino-320-medio.png) | [Cena](depois-320-alto.png) · [Casino](casino-320-alto.png) | [Cena](depois-320-extremo.png) · [Casino](casino-320-extremo.png) |

[Quatro ambientes](quatro-ambientes.jpg). Montagens da dificuldade Média com a referência, sem deformar proporções: [1920](comparacao-media-1920.jpg), [1366](comparacao-media-1366.jpg), [390](comparacao-media-390.jpg), [320](comparacao-media-320.jpg). [Movimento reduzido](reduced-390.png). Alpha ampliado: [fundo escuro](alpha-400-escuro.png), [fundo claro](alpha-400-claro.png).

## Vídeo e promoção

[Vídeo demonstrativo de 30 segundos](jogo-30s.mp4): quedas, prémio alto e passagem pelas quatro dificuldades. Exportação determinística local a 12 fps, 1280×720, H.264/AAC; essa taxa de exportação não é a taxa do jogo. Não documenta uma aposta real ou publicação.

[Queda GIF](../../promo/queda.gif), [queda MP4](../../promo/queda.mp4), [carga completa GIF](../../promo/carga-completa.gif) e [capa](../../promo/capa.webp) atualizados. Durações, dimensões e codecs em [media-results.json](../media-results.json). Fontes, prompts e preparação em [PROMPTS-ARTE.md](PROMPTS-ARTE.md) e [ASSETS.md](../../ASSETS.md).

## Validação local

| Verificação | Resultado |
| --- | --- |
| `npm.cmd test --prefix games/ganza` | Seis testes passaram: tabelas, binomial, determinismo, dinheiro, débito, recuperação, compromisso e pedidos inválidos |
| `node games/ganza/tests/browser.mjs` | Quatro tamanhos com altura do menu descontada, dez placas, destinos conferidos com o motor, configuração bloqueada, prova, celebração saltável, autoplay e recuperação; sem erros JS |
| `node games/ganza/tests/final.mjs` | Espaço, bloqueio manual durante autoplay, azulejos de contagem, aposta fracionária sem débito, Escape, 44 efeitos descodificados, música e saldo grande passaram |
| `node games/ganza/tests/visual.mjs` | Desempenho dirigido, fila em repouso, etiquetas dentro do ecrã, toque e valores exatos passaram; aguarda o salto de prémio antes de medir alinhamento |
| `node games/ganza/scripts/falesia-review.mjs depois` | Quatro dificuldades × quatro tamanhos; matriz 8/12/16 × quatro dificuldades a 320 px, movimento reduzido, sem overflow nem erros de consola |
| `node games/ganza/tests/website.mjs` | Casino de fixtures com menu, incluindo 1920, 1366, 768, 390, 320 e horizontal 844 px; sem overflow, controlos dentro do iframe, aposta e prova válidas |
| `npm.cmd run build:casino` | Build local concluída; não é deploy |
| Sintaxe, documentação e media | Sintaxe dos módulos verificada; `npm.cmd run test:docs`; GIFs e MP4 inspecionados por Pillow/ffprobe |

Resultados: [browser](../browser-results.json), [final](../final-results.json), [apresentação e matriz](depois-results.json), [desempenho dirigido](performance-results.json), [website](../website-results.json). Na regressão com dez placas, cerca de 60 FPS nos quatro tamanhos; na medição curta dirigida, cerca de 58 FPS. São medições de Edge headless no computador, sem outros browsers de captura em paralelo. Os valores de FPS do teste de integração do site não são um benchmark isolado.

## Diferenças em relação à referência

- A referência é uma pintura estática com oito linhas. A configuração inicial continua a ter 16 linhas e 17 destinos reais: bóias, lanchas e etiquetas são menores. No telemóvel, o WEED é menor e a composição reserva uma faixa de mar abaixo do cais.
- A parede é mais frontal e regular para acomodar todas as configurações. O tapete, a personagem, as flores e a luz são objetos distintos, por isso as junções e proporções não reproduzem cada pincelada do estudo.
- O WEED usa oito poses com transições e movimento contínuo subtil, não desenhos novos em cada frame. O olhar e os gestos usam as poses pintadas; não existe um rig ocular ou esqueleto independente para cada dedo e pé.
- Céu, costa e mar são planos das pinturas contínuas. Ondas, reflexos, luz e fumo são efeitos do renderer; não se reconstruiu um cenário 3D nem uma simulação física de água. O ambiente extremo tem geometria e brilho discretos para preservar a leitura.
- O som adicional é desenho sonoro sintetizado, não gravação de gaivotas, grilos ou uma vila. Não houve teste num telemóvel físico nem revisão auditiva em aparelho.

Motor, tabelas, carteira, provas e versão matemática não foram alterados. Não é necessário recalcular dados. Não houve consulta de configuração cloud ou entrega push.

**Deploy:** `.\deploy.ps1`, apenas quando o dono decidir publicar.
