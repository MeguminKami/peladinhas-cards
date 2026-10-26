# Recursos de apresentação

Gerados pela ferramenta integrada `image_gen`, guardados no projeto. Os rostos usam fotografias fornecidas pelo utilizador como referência, sem incluir as fotografias originais no pacote público. A tipografia Manrope conserva a licença OFL incluída.

## Ginásio

[gym.png](./assets/gym.png)

Prompt: «Create a premium stylized 3D arcade videogame background environment, wide landscape 1536x1024. An extravagant enormous modern fitness gym interior, view from side at slight elevated 3/4 perspective, vivid rich turquoise purple magenta orange lime LED lighting. Four coherent exercise bays visible with oversized dumbbells, benches, cable chest machines, treadmill, giant protein supplement jars on shelves. Bright clean premium polished game art, rounded sculpted objects, detailed material shading, warm sunlight mixing RGB strips, mirrored wall panels. NO people NO characters NO letters NO text NO logos NO UI. Composition: all gym machinery and wall detail only in upper 60 percent; bottom 40 percent is empty continuous broad dark violet rubber training floor with subtle reflections lit by teal and purple strips, unobstructed walkable space for large hero sprites, no objects in foreground. Panoramic continuous interior, energetic friendly comedic fitness adventure, no road no city no outdoor scenery. High quality commercial cartoon game render, strong depth and beautiful controlled lighting.»

## Personagens e poses

O atlas original [characters.png](./assets/characters.png) mantém Cardoso e Sofia em duas metades; o jogo usa apenas a metade da Sofia. [cardoso-poses.png](./assets/cardoso-poses.png) é o estudo inicial de quatro poses. O jogo usa [cardoso-poses-realistic.png](./assets/cardoso-poses-realistic.png): corrida A, corrida B, bíceps de vitória e susto, todos com o rosto corrigido usando como referência principal a fotografia facial enviada no feedback de 26/10/2026. A pose de bíceps também serve como pose parada, com respiração.

[characters-realistic.png](./assets/characters-realistic.png) é o estudo de aparência com ambos os personagens; não é usado como sprite porque conserva luz ambiente no fundo.

Prompt de correção do rosto: «Authoritative REAL FACE of Cardoso. Correct all men's faces to the same realistic recognizable identity. Male Portuguese olive skin, near-black hair short faded sides tall dark textured top, thick straighter dark eyebrows, brown almond eyes normal size, realistic nose, oval long face narrower jaw, neatly trimmed very dark beard with defined cheek edges and connected mustache. Resemblance to photo is highest priority, accurate realistic 3D portrait face, substantially less cartoon/caricature, no generic square-jawed superhero face. Preserve full-body poses and positions, muscular gym body, ZERO ÓLEO black lime clothes and shaker. True transparent alpha background.»

## Coluna e áudio

[food-monsters.png](./assets/food-monsters.png) é o atlas de referência dos quatro inimigos. O renderer usa agora imagens independentes: [óleo](./assets/enemy-oil.png), [bolo](./assets/enemy-cake.png), [hambúrguer](./assets/enemy-burger.png) e [fritadeira](./assets/enemy-fryer.png). Assim, os recortes não incluem fragmentos dos vizinhos. São animados por deslocação e rotação no Canvas; o motor não consulta as suas posições.

As quatro imagens foram separadas com a ferramenta integrada `image_gen`, usando o atlas como referência. Prompt comum: «Isolate ONLY the selected character from the reference. Preserve its exact design, face, expression, materials and cartoon 3D appearance. Remove all other characters completely. Output ONE complete full-body monster centered, all hands, feet, cap/candles/basket handle/steam fully contained. True alpha transparent background, no glows, no backdrop, no cast shadow, no extra objects, no detached fragments. Standalone game sprite, not a sheet.» Seleções: primeira personagem, garrafa ÓLEO; segunda, bolo de chocolate com duas velas; terceira, hambúrguer com sésamo; quarta, fritadeira de inox com rodas e vapor.

A coluna com identificação JBL é desenhada no [cenário](./scene.mjs), não corresponde a um modelo comercial específico e não implica parceria com a marca. Anéis, luz, pulsação e ondas sonoras são procedurais.

O [áudio](./audio.mjs) combina música/efeitos sintetizados em Web Audio com as oito gravações fornecidas pelo utilizador. O jogo não usa síntese de voz do sistema nem chama serviços de voz externos. Os OGG mantêm os bytes originais; os WAV são alternativas PCM geradas localmente pelo descodificador do browser.

| Gravação | Evento |
| --- | --- |
| [Uma chupadela de cada vez](./assets/voices/uma_chupadela_de_cada_vez.ogg) | Início da ronda |
| [Mais um PR](./assets/voices/mais_um_pre.ogg) | Passo bem-sucedido |
| [Proteína pura](./assets/voices/proteina_pura.ogg) | Passo bem-sucedido |
| [É só gains](./assets/voices/e_so_gains.ogg) | Passo bem-sucedido |
| [Isso não tem óleo](./assets/voices/isso_nao_tem_oleo.ogg) | Passo bem-sucedido |
| [Zero óleo](./assets/voices/zero_oleo.ogg) | Passo bem-sucedido e vitória final |
| [Fui frito](./assets/voices/fui_frito.ogg) | Derrota |
| [Grito de cashout](./assets/voices/grito_de_cashout.ogg) | Levantamento |

O nome original «uma_chupadela _de_cada-vez.ogg» foi normalizado para URL sem espaços. O [relatório de descodificação](./reports/voice-assets.json) regista os oito recursos verificados.
