# Assets e proveniência

## Ajustes posteriores: ganzá castanha

Três edições pelo ImageGen integrado, preservando alpha e composição: `actor-brown.png` altera só as peças nas mãos, sem mudar o casaco verde; `parcel-brown.png` torna o bloco castanho; `ledge-brown.png` altera a pilha. Masters em `art-src/falesia/`, finais substituem `actor.png`, `parcel.webp` e `ledge.webp` em `ui/art/falesia/`. O script de preparação aplica estas versões por último. Reutilizada Bangers local com a licença OFL já incluída; sem novas fontes remotas.

## Falésia, 6 de novembro de 2026

Arte original gerada pelo **ImageGen integrado**, usando a [referência aprovada](revisao/referencia/falesia-aprovada.webp). Rosto: duas fotografias autorizadas da pasta WEED, usadas apenas como referência de identidade. Fotografias excluídas da build.

| Master em art-src/falesia | Runtime em ui/art/falesia | Conteúdo |
| --- | --- | --- |
| `environments.png` | `baixo.webp`, `medio.webp`, `alto.webp`, `extremo.webp` | Quatro ambientes horizontais; planos de céu, costa e mar separados no renderer |
| `portraits.png` | variantes `*-portrait.webp` | Composições verticais pintadas próprias |
| `cliff.png` | `cliff.webp` | Rocha limpa com cais, sem pinos pintados |
| `actor.png` | `actor.png` | Oito poses pintadas, atlas RGBA 4×2 com âncoras normalizadas |
| `objects-alpha.png` | `buoy.webp`, `boat.webp`, `parcel.webp` | Bóia com argola, lancha preta, placa com cordel; alpha corrigido por ImageGen |
| `decor.png` | `pergola.webp`, `ledge.webp`, `flowers.webp` | Pérgola, lanterna, buganvílias; rocha, tapete e pilha; hibiscos |

Preparação: `python games/ganza/scripts/prepare-falesia.py`. Masters locais preservados; recortes e redimensionamento com Pillow, WebP qualidade 90 e atlas PNG sem chroma key. Alpha descodificado pré-multiplicado. Prompts e produção em [PROMPTS-ARTE.md](revisao/falesia/PROMPTS-ARTE.md). Pinos, placa e lanchas têm posição independente da pintura de fundo. Fontes antigas preservadas para histórico, sem carregar nem publicar a pasta pastel.

O ambiente reutiliza as ondas CC0 inventariadas abaixo e acrescenta síntese local de aves, grilos, sinos e pad, através do bus de ambiente existente. As gravações de impactos e a música do dono não foram substituídas.

## Músicas fornecidas pelo dono

Recebidos `atividade.opus`, `premio_alto.opus`, `vinheta_ganza.opus` e `vinheta_carga_completa.opus`. Originais preservados em `art-src/music-owner/`. Foram cortados atrasos e selecionadas as partes enérgicas, normalizadas e exportadas para `activity`, `high`, `stinger-max` e `stinger-carga`, em OGG e MP3. Os OPUS originais na pasta de música são excluídos da build. Fontes e cortes em [PROMPT-MUSICA.md](docs/PROMPT-MUSICA.md) e [music-owner-cuts.json](revisao/music-owner-cuts.json). Não são gravações CC0 recolhidas por esta tarefa; são os ficheiros entregues pelo dono.

A base longa ainda não foi localizada. A base existente continua provisória e está identificada na configuração. O motor passou de stems simultâneos para músicas completas com crossfades de 1,2 segundos e prioridades entre atividade, vitória e vinhetas.

## Correção visual pastel, 6 de novembro de 2026

Esta revisão substitui a arte de runtime anterior. Quatro gerações pelo **ImageGen integrado**, com referência visual à progressão LoFi aprovada. A personagem também recebeu as duas fotografias autorizadas como referência de identidade; as fotografias não entram na build.

| Master em art-src | Asset final em ui/art/pastel | Uso |
| --- | --- | --- |
| `coasts-pastel-v3.png` | `baixo.webp`, `medio.webp`, `alto.webp`, `extremo.webp` | Quatro paisagens contínuas horizontais |
| `coasts-portrait-v3.png` | `baixo-portrait.webp`, `medio-portrait.webp`, `alto-portrait.webp`, `extremo-portrait.webp` | Quatro composições verticais próprias para telemóvel |
| `weed-seated-v3.png` | `weed-seated.png` | Oito poses pintadas de corpo inteiro, atlas RGBA 4×2, ciclo de 20 segundos |
| `boats-pastel-v3.png` | `boats.png` | Quatro lanchas semirrígidas pintadas, reflexos e espuma com alpha |

Preparação reproduzível: `python games/ganza/scripts/prepare-visual-v3.py`. O renderer extrai máscaras suaves de céu, costa, mar, terraço e primeiro plano das ilustrações contínuas; acrescenta reflexos, lanternas, fumo e pétalas em movimento. Os PNGs são descodificados com `createImageBitmap(..., {premultiplyAlpha: 'premultiply'})` e compostos em Canvas antes do upload WebGL. A inspeção do recorte a 400% está em [fundo escuro](revisao/correcao-visual/alpha-400-escuro.png) e [fundo claro](revisao/correcao-visual/alpha-400-claro.png).

Os prompts e escolhas de produção estão em [PROMPTS-ARTE.md](revisao/correcao-visual/PROMPTS-ARTE.md). Os atlas antigos de 480 frames e cenários `coast-*` ficam como fontes históricas e são excluídos da build. Música e efeitos sonoros não foram alterados.

## Arte

Arte original produzida com ImageGen integrado. Masters em `art-src/`, estudos em `revisao/`, quatro cenários finais WebP em `ui/art/coast-*.webp`. A direção é LoFi com cor natural viva, pastéis, costa marroquina, zellige, lanternas e fumo progressivo. As referências são as duas fotografias indicadas pelo dono e os estudos de composição da revisão. Fotografias e folhas nunca entram na build.

O WEED usa oito atlas PNG de 1024 × 1024 px, frames de 128 × 128 px, 480 frames a 24 fps num ciclo de 20 segundos. Origem: 24 poses geradas com a identidade das fotografias, com interpolação de fluxo bidirecional e alpha direto. Não são 480 desenhos individuais. [Prompt, masters e detalhes](revisao/weed-png-v2/README.md). O runtime mantém o atlas inicial, o atual e o seguinte, para limitar memória. Movimento reduzido usa a pose inicial.

Pinos, bola castanha-clara, ondas, barcos, partículas e moldura são desenhados no renderer. O percurso visual é guiado pelos bits do motor. As celebrações usam os mesmos atlas, sem novo rosto inventado. A composição WebGL aplica grão de papel subtil, sem meio-tom nem desalinhamento Pop Art.

## Som

Efeitos em OGG e MP3, quatro variações por família, compositados a partir das fontes abaixo. Masters e cópias das páginas de licença em `art-src/audio/`. O [manifesto](ui/audio/manifest.json) identifica as fontes de cada ficheiro, duração, estado provisório e processamento. Os efeitos são processados com FFmpeg loudnorm, alvo −16 LUFS, pico −1,5 dBTP, LRA 7. Não foi feita uma certificação ou revisão auditiva do dono.

| Fonte | Autor indicado na página | Licença e uso |
| --- | --- | --- |
| [Impact Sounds](https://kenney.nl/assets/impact-sounds) | Kenney | CC0, madeira e impactos macios dos pinos |
| [RPG Audio](https://kenney.nl/assets/rpg-audio) | Kenney | CC0, tecido, gesto e cordas a ranger |
| [Interface Sounds](https://kenney.nl/assets/interface-sounds) | Kenney | CC0, cliques |
| [Casino Audio](https://kenney.nl/assets/casino-audio) | Kenney | CC0, gesto de lançamento |
| [202 More Sound Effects](https://opengameart.org/content/202-more-sound-effects) | OwlishMedia | CC0, plástico e moedas |
| [Water Splash Slime SFX](https://opengameart.org/content/40-cc0-water-splash-slime-sfx) | rubberduck | CC0, água e salpicos |
| [Beach Ocean Waves](https://opengameart.org/content/beach-ocean-waves) | jasinski, distribuição qubodup | CC0, quatro ondas e ambiente |
| [Bicycle Horn](https://opengameart.org/content/bicycle-horn) | AntumDeluge | CC0, buzina transposta na composição marítima |
| [Fireworks with applause](https://opengameart.org/content/fireworks-with-applause-happy-people) | almitory | Opção CC0 indicada na página, festa e fogo de artifício |
| [Steamboat Engine](https://opengameart.org/content/steamboat-engine-sound) | Spring Spring | CC0, corpo mecânico dos arranques e fuga |

O motor é uma composição de som marítimo, não uma alegação de gravação documental de um motor fora de borda. Não foi usada uma voz de outra pessoa para fingir a voz do WEED. As suas reações são visuais. O cameo policial opcional foi omitido para manter o tom LoFi.

Há limite de vozes, round-robin, pequenas variações de tom e volume, panorama horizontal, reverberação curta e ducking de ambiente e música. O som só começa com gesto do jogador.

## Música e fonte

Três guias musicais locais de desenvolvimento, explicitamente provisórios, 80 BPM, Ré menor, 24 segundos, oito compassos. Não são a música final. O dono produz a música com os [prompts](docs/PROMPT-MUSICA.md). A [configuração](ui/audio/music/config.json) identifica os guias e permite ativar os stingers quando forem entregues.

Bangers, distribuição oficial Google Fonts, OFL em `ui/fonts/OFL.txt`, ficheiro TTF local. A interface final usa Georgia e Arial do sistema. Não há fontes ou áudio pedidos a serviços externos em runtime.

## Ajustes Falésia: composição costeira

A revisão pedida em [PROMPT-FALESIA-AJUSTES.md](PROMPT-FALESIA-AJUSTES.md) substitui a posição no topo por WEED lateral em primeiro plano. [Entrega e diferenças](revisao/falesia-v2/DEPOIS.md). Novos masters do ImageGen integrado: [falésia costeira](art-src/falesia/cliff-coast-v2.png) e [atlas com recorte revisto](art-src/falesia/actor-clean-v2.png), publicados como `cliff.webp` e `actor.png`. [Prompts completos](revisao/falesia-v2/PROMPTS-ARTE.md). O empacotador aplica estes masters por último. Barcos e bóias reutilizam os sprites existentes com proporções corrigidas. Sem novos serviços ou fontes remotas.

## Marca vetorial GANZÁ

[ganza-logo.svg](ui/art/falesia/ganza-logo.svg): desenho original em SVG, com letras em paths, medalhão jade/latão, placa com cordel em arco e proa de lancha. Criado diretamente em vetor, sem fontes externas, fotografias ou geração raster. Usado no cabeçalho do jogo.

## Thumbnail vertical da página inicial do casino

Arte original criada com ImageGen integrado a partir da referência Falésia e da personagem já aprovada. [Master e prompt](art-src/falesia/casino-cover-prompt.md). O catálogo usa [ganza-falesia.webp](../../assets/casino/covers/ganza-falesia.webp), WebP RGB 800×1200, cerca de 346 KiB; cópia promocional em [casino-thumbnail.webp](promo/casino-thumbnail.webp). Cartaz próprio com título GANZÁ dourado, WEED em primeiro plano, falésia com bóias, lanchas e mar jade; sem interface, saldo, falas ou fumo. A referência do catálogo tem nome próprio para não ser substituída por futuras capturas de gameplay.
