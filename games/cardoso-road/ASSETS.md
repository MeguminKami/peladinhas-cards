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

[food-monsters.png](./assets/food-monsters.png) é o atlas de referência dos quatro inimigos. A primeira versão do renderer usava imagens independentes: [óleo](./assets/enemy-oil.png), [bolo](./assets/enemy-cake.png), [hambúrguer](./assets/enemy-burger.png) e [fritadeira](./assets/enemy-fryer.png). Estes quatro recursos foram preservados como referência. A versão ativa usa os 18 PNG completos descritos abaixo. Os sprites são animados por deslocação e rotação no Canvas; o motor não consulta as suas posições.

As quatro imagens foram separadas com a ferramenta integrada `image_gen`, usando o atlas como referência. Prompt comum: «Isolate ONLY the selected character from the reference. Preserve its exact design, face, expression, materials and cartoon 3D appearance. Remove all other characters completely. Output ONE complete full-body monster centered, all hands, feet, cap/candles/basket handle/steam fully contained. True alpha transparent background, no glows, no backdrop, no cast shadow, no extra objects, no detached fragments. Standalone game sprite, not a sheet.» Seleções: primeira personagem, garrafa ÓLEO; segunda, bolo de chocolate com duas velas; terceira, hambúrguer com sésamo; quarta, fritadeira de inox com rodas e vapor.

A coluna com identificação JBL é desenhada no [cenário](./scene.mjs), não corresponde a um modelo comercial específico e não implica parceria com a marca. Anéis, luz, pulsação e ondas sonoras são procedurais.

O [áudio](./audio.mjs) combina duas faixas MP3 locais, efeitos de evento OGG, sinais de passo sintetizados e as oito falas do Cardoso. As faixas e os efeitos novos foram fornecidos pelo utilizador em 26/10/2026. O jogo não usa síntese de voz do sistema nem chama serviços de voz externos. Os OGG mantêm os bytes originais; os WAV são alternativas PCM geradas localmente pelo descodificador do browser.

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


## Atualização de 26/10/2026

Os quatro [cenários e prompts](./ART-DIFFICULTIES.md) ativos são PNG panorâmicos 2172 × 724 (3:1). O [renderer](./scene.mjs) conserva a proporção natural com recorte cover. O [catálogo de vilões](./enemies.mjs) define 18 personagens: seis por tier, geradas individualmente como sprites PNG completos com transparência em [assets/villains](./assets/villains). As composições com acessórios Canvas foram removidas. A seleção usa o ID da ronda, mantém a identidade após recarregar e não altera probabilidades nem pagamentos.

| Recurso | Utilização |
| --- | --- |
| [easy_medium_hard.mp3](./assets/audio/easy_medium_hard.mp3) | Fácil, normal e difícil, em loop |
| [extreme.mp3](./assets/audio/extreme.mp3) | Extremo, em loop |
| [starrt_1.ogg](./assets/audio/starrt_1.ogg) | Aposta aceite, na partida |
| [win_1.ogg](./assets/audio/win_1.ogg) | Cash Out e vitória final |
| [perdeu_1.ogg](./assets/audio/perdeu_1.ogg), [perdeu_2.ogg](./assets/audio/perdeu_2.ogg) | Derrotas alternadas |

A barra de volume da música permanece no rodapé, independente do volume de efeitos/vozes no menu. A música inicia após interação, pausa ao ocultar o jogo e muda de faixa ao escolher extremo. As preferências ficam no dispositivo. O fluxo visível é Apostar (reserva a aposta na partida), Avançar (uma tentativa por clique) e Cash Out (disponível após primeiro sucesso).

Validação local: testes de motor/apresentação e verificação no browser em 320/390/768/1440 px, incluindo fluxo e controlo de música, através de `node tests/update-browser.mjs` com `npm.cmd run dev` ativo. Sem consulta Firebase real ou publicação.


A [galeria dos 18 vilões e quatro fundos](./art-gallery.html) permite inspecionar todos os recursos em conjunto. Prompts: [nível 1](./ART-VILLAINS-TIER1.md), [nível 2](./ART-VILLAINS-TIER2.md), [nível 3](./ART-VILLAINS-TIER3.md). Verificação local de assets, proporções e galeria: `node tests/art-browser.mjs` com o servidor local ativo.


## Correção da mistura de áudio · 27/10/2026

O [controlador de áudio](./audio.mjs) usa um único canal substituível para o feedback da jogada. Início, derrota e pagamento tocam a gravação do evento, sem acrescentar uma fala antiga ou fanfarra sintetizada em paralelo. Os passos usam uma fala; com vozes desligadas, usam um sinal curto se os efeitos estiverem ligados. Com efeitos desligados, as falas antigas dos eventos continuam disponíveis através do controlo de vozes. Cada evento cancela o anterior, incluindo downloads de falas pendentes. A música baixa temporariamente para 22% do volume escolhido durante o feedback; ocultar ou fechar o jogo cancela os sons.

Diagnóstico local em 27/10/2026: os MP3 fornecidos para [fácil/normal/difícil](./assets/audio/easy_medium_hard.mp3) e [extremo](./assets/audio/extreme.mp3) têm bytes idênticos, incluindo os originais do utilizador. SHA-256 comum: `D8F44971F4F1123D2B2A6BDF1EB50A9B685C47BDEDA0475BFCFB5BF30D731112`. O seletor já aponta para o URL específico do extremo e interrompe a faixa anterior, mas uma música realmente diferente requer o ficheiro correto do utilizador. Este diagnóstico não confirma ficheiros publicados.

Validação local: `npm.cmd test`, `npm.cmd run test:voices` e `node tests/audio-browser.mjs` passaram, cobrindo substituição, mute, downloads tardios, redução do volume da música e troca de URL entre dificuldades. Sem Firebase real e sem deploy.


### Faixa do Extremo substituída · 27/10/2026

Recebida a faixa correta, Jan Fleck - Kicknapping (SlugoS & MKM Remix). Copiada para [extreme.mp3](./assets/audio/extreme.mp3), preservando o original do utilizador. SHA-256: `0ACDD4F3D14021181F308ACF3C8277A84DB4194406202379D607CE0CB1B1016B`. O novo ficheiro difere da faixa das restantes dificuldades e resolve a duplicidade identificada no diagnóstico acima. Sem publicação.
