# Depois da correção visual

6 de novembro de 2026. Contrato [PROMPT-CORRECAO-VISUAL.md](../../PROMPT-CORRECAO-VISUAL.md), executado sem pontos de espera. Direção LoFi pastel confirmada pelo dono. Não houve deploy, commit, push, edição de Functions nem acesso ao Firebase real.

## O que mudou

- Paisagem contínua em todo o iframe. Retirados cartão creme, moldura branca, triângulo bege e faixa técnica visível.
- Quatro ambientes horizontais e quatro composições verticais próprias, de costa calma a arco marroquino psicadélico. Céu, costa, água, terraço e primeiro plano usam máscaras suaves, parallax leve, reflexos, lanternas, folhas e fumo. Mudanças de volatilidade fundem durante 900 ms.
- WEED de corpo inteiro, sentado numa almofada com sombra de contacto. Rosto pintado a partir das duas fotografias autorizadas, oito poses num ciclo de 20 segundos e transições curtas. O fumo passa atrás e à frente. PNG descodificado com alpha pré-multiplicado. Inspeção ampliada a 400% sobre [escuro](alpha-400-escuro.png) e [claro](alpha-400-claro.png), sem cartão ou halo branco.
- Pinos de vidro jade sobre o mar e o céu, com reflexo, sombra e reação local ao toque. Bola castanha-clara preservada, com sombra na água e rasto de fumo.
- Uma só fila de lanchas pintadas, com espuma, reflexos, balanço e mosaicos progressivos. Em 320 px, as 17 placas ficam verticais e alinhadas. 709,64× aparece como 710× apenas no casco; painel de probabilidades, nome acessível e prova mantêm o valor exato.
- Aposta em madeira pintada, azulejos de linhas e volatilidade com ícones próprios, medalhão LARGAR, contador discreto, histórico em tecido e diálogos no mesmo tema. Os selects de configuração internos ficam invisíveis e conservam a ligação à lógica já existente. Mensagens técnicas continuam acessíveis; erros são apresentados numa placa legível.
- Prémios com pétalas, luz das lanternas e fogo de artifício pastel. Retirados cartões e retratos repetidos em grelha. Movimento reduzido conserva a queda e elimina efeitos decorativos.
- Atlas antigos excluídos da build para evitar carregar arte sem utilização. Arte nova e decisões documentadas em [ASSETS.md](../../ASSETS.md) e [DECISOES.md](../../DECISOES.md).

## Comparações e vídeo

Cada comparação apresenta **estudo aprovado | antes | depois**, preservando proporções. As 16 capturas individuais de antes e 16 de depois estão nesta pasta com nomes `antes-LARGURA-VOLATILIDADE.png` e `depois-LARGURA-VOLATILIDADE.png`.

| Janela | Baixa | Média | Alta | Extrema |
| --- | --- | --- | --- | --- |
| 1920×1080 | [Comparar](comparacao-1920-baixo.jpg) | [Comparar](comparacao-1920-medio.jpg) | [Comparar](comparacao-1920-alto.jpg) | [Comparar](comparacao-1920-extremo.jpg) |
| 1366×768 | [Comparar](comparacao-1366-baixo.jpg) | [Comparar](comparacao-1366-medio.jpg) | [Comparar](comparacao-1366-alto.jpg) | [Comparar](comparacao-1366-extremo.jpg) |
| 390×844 | [Comparar](comparacao-390-baixo.jpg) | [Comparar](comparacao-390-medio.jpg) | [Comparar](comparacao-390-alto.jpg) | [Comparar](comparacao-390-extremo.jpg) |
| 320×740 | [Comparar](comparacao-320-baixo.jpg) | [Comparar](comparacao-320-medio.jpg) | [Comparar](comparacao-320-alto.jpg) | [Comparar](comparacao-320-extremo.jpg) |

[Vídeo de 20 segundos](jogo-corrigido-20s.mp4): queda normal, prémio alto e transições entre ambientes. H.264/AAC, 1280×720, exportado a 12 fps. A taxa do vídeo não é a taxa do jogo. [Queda GIF](../../promo/queda.gif), [queda MP4](../../promo/queda.mp4), [carga completa GIF](../../promo/carga-completa.gif) e [capa](../../promo/capa.webp) atualizados. A capa também está no catálogo do website.

## O que foi testado

| Verificação | Resultado |
| --- | --- |
| `npm.cmd test --prefix games/ganza` | Seis testes passaram, sem mudar motor, tabelas, carteira ou provas |
| `node games/ganza/tests/browser.mjs` | Passou nos quatro tamanhos, dez bolas, destinos, configuração bloqueada, prova, celebração saltável, autoplay e recuperação |
| `node games/ganza/tests/final.mjs` | Passou: teclado, autoplay, rejeição de aposta fracionária, Escape, áudio sincronizado e saldo de 10 mil milhões de DJC em 320 px |
| `node games/ganza/tests/website.mjs` | Passou contra o website de fixtures em localhost:8080, em 1366×768, 768×1024, 390×844, 320×740 e 844×390, com toque e prova |
| `node games/ganza/tests/visual.mjs` | Passou: fila única e etiquetas dentro do ecrã nos quatro tamanhos, estados dos azulejos, valores exatos no painel, toque e dez bolas |
| Desempenho dirigido, 1920×1080 | 59,9988 FPS em 103 amostras com dez bolas, WebGL, qualidade completa, sem erros na consola |
| `npm.cmd run build:casino` | Passou, assets preparados e jogo disponível em http://localhost:8080/#/casino |
| Sintaxe e documentação | `node --check` passou nos ficheiros JS alterados; `npm.cmd run test:docs` passou |
| Media | GIFs de 6 e 11 s, MP4 de 6 e 20 s, codecs H.264/AAC e dimensões verificados por Pillow/ffprobe |

O teste novo de apresentação conserva os casos dos testes anteriores. Só foram adaptados os seletores dos selects visíveis para os azulejos e a origem geométrica do tabuleiro, agora deslocado à direita em desktop. Resultados: [visual-results.json](visual-results.json), [browser-results.json](../browser-results.json), [final-results.json](../final-results.json), [website-results.json](../website-results.json) e [media-results.json](../media-results.json). Foram usados dados locais e origens externas bloqueadas.

## Diferenças restantes em relação ao estudo

- O estudo mostra apenas duas lanchas de exemplo. O jogo apresenta até 17 destinos reais, por isso cada lancha e respetiva placa são menores. Em telemóvel, o WEED é deliberadamente pequeno para preservar o percurso e os controlos.
- Os pinos e efeitos são desenho procedural com acabamento jade, enquanto o fundo, o WEED e as lanchas são pintura raster. As camadas de ambiente são máscaras da mesma ilustração, sem reconstrução de objetos ocultos para grandes movimentos de câmara. O parallax é propositadamente discreto.
- A animação utiliza oito poses e transições de cerca de 400 ms, com pausas desenhadas. Não é animação tradicional de 480 desenhos diferentes. Evita as deformações da interpolação anterior.
- Medições realizadas em Edge headless no computador, não num telemóvel físico. A revisão a olho em aparelho e a música final do dono continuam por fazer. Não foi consultada configuração cloud nem publicada uma versão.

Fontes e prompts: [PROMPTS-ARTE.md](PROMPTS-ARTE.md). Música: [cinco prompts e plano B](../../docs/PROMPT-MUSICA.md).
