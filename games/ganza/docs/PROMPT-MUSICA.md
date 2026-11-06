# Música final de GANZÁ

## Integração das gravações entregues pelo dono

A orientação atual é uma **base longa de cerca de três minutos**, a tocar continuamente, mais músicas curtas completas para Atividade e Prémio Alto e duas vinhetas. Os 24 segundos do plano inicial eram oito compassos a 80 BPM, não um limite para os ficheiros. Os prompts históricos abaixo continuam como referência de estilo; já não é obrigatório entregar stems de 24 segundos.

As músicas completas são alternadas com transições de volume de 1,2 segundos, não sobrepostas como se fossem stems sincronizados. A base mantém a sua posição enquanto baixa de volume e regressa quando termina o momento especial. Atividade entra com várias bolas ou AUTO; Prémio Alto tem prioridade e fica ativo durante 24 segundos, repetindo o excerto útil. As vinhetas entram nos prémios de pelo menos 100× e no máximo do jogo, com prioridade da Carga Completa. A prioridade evita acumular várias músicas de vitória. A água contínua permanece desligada.

| Gravação | Corte inicial | Excerto preparado |
| --- | --- | --- |
| `atividade.opus` | 9,55 s | cerca de 15,02 s, com junção em crossfade |
| `premio_alto.opus` | 9,69 s | cerca de 15,05 s, com junção em crossfade |
| `vinheta_ganza.opus` | 1,12 s | 4,78 s |
| `vinheta_carga_completa.opus` | 1,36 s | 7,56 s |

O início da parte enérgica foi escolhido por ataques de energia próximos dos dez segundos. O início das vinhetas foi medido pelo sinal acima do silêncio; na Carga Completa há áudio útil a partir de aproximadamente 1,4 segundos, portanto não foram eliminados três segundos automaticamente. Estes cortes foram medidos por análise de sinal, sem afirmar revisão auditiva humana. Normalização para −18 LUFS e limite de pico de −2 dBTP, exportação OGG/MP3 e fades nas extremidades.

**Base longa pendente:** nas gravações entregues foram encontrados os quatro OPUS acima. `base.ogg` e `base.mp3` ainda são o guia anterior de 24 segundos. A configuração assinala `basePending: true` e `provisional: true` até chegar o nome/caminho da soundtrack nova.

Originais preservados em `art-src/music-owner/`, sem entrarem na build. Preparação: `python games/ganza/scripts/prepare-owner-music.py`. [Cortes medidos](../revisao/music-owner-cuts.json). O motor e o guião não assumem que músicas independentes têm o mesmo andamento ou fase.

O dono gera a música, não foi produzida música final nesta tarefa. O jogo LoFi tem uma costa marroquina ao luar, quatro volatilidades com intensidade visual progressiva, quedas de 2,1–3,1 segundos, o WEED a fumar num ciclo de 20 segundos e resultados de 0,8–7 segundos.

Contrato comum: **80 BPM, D natural minor, 4/4, oito compassos, exatamente 24,000 segundos**, instrumental. Todas as camadas começam no mesmo downbeat e têm igual duração, andamento e afinação. Escala D E F G A B♭ C. Os acentos dos pinos seguem esta escala. Exportar WAV master 48 kHz estéreo e depois OGG Vorbis com fallback MP3. Evitar silêncio ou cauda fora dos 24 segundos. Os guias atuais não servem como mastering de referência.

## 1. Base, sempre ativa

> Instrumental nocturnal lofi dub reggae with subtle Moroccan gnawa influence and a warm 1960s analog character. Exactly 80 BPM, D natural minor, 4/4, an eight-bar seamless loop lasting exactly 24 seconds. A calm full-moon coast, intimate and friendly, vivid natural colors translated into warm sound. Round deep bass, restrained one-drop drums, soft brushed texture, muted offbeat guitar with short tape echoes, sparse warm retro organ, a few dry qraqeb metallic castanet details and low plucked guembri-like bass-lute accents. Plenty of space for physical wooden impacts, water splashes and boat sounds. No vocals, no spoken words, no chants, no artist references, no cinematic risers, no aggressive festival drop. No intro, no outro, no count-in. First sample is the first downbeat. Render reverb and echo so the loop boundary joins without a gap, click or tail beyond the exact eight-bar duration. Produce the base layer alone.

Guardar como `base.ogg` e `base.mp3` em `ui/audio/music/`.

## 2. Atividade, várias bolas ou autoplay

> A synchronized additive instrumental activity stem for the same nocturnal lofi Moroccan dub loop. Exactly 80 BPM, D natural minor, 4/4, eight bars, exactly 24 seconds. No bass line and no complete drum kit, because those exist in a separate base stem. Light interlocking qraqeb, muted hand percussion, a dry shaker, occasional short offbeat guitar echo and tiny syncopated plucked bass-lute answers. Playful, relaxed, a little busier, with clear empty spaces for Plinko impacts. Same downbeat, key, swing and eight-bar structure as the base. This stem must layer over the base without doubling its fundamental instruments or changing loudness drastically. No voice, no chant, no count-in, no intro, no outro. Seamless exact loop.

Guardar como `activity.ogg` e `activity.mp3`. O jogo mantém esta camada sincronizada e sobe o volume com várias bolas ou autoplay.

## 3. Prémio alto, oito compassos

> A synchronized instrumental celebratory stem for an existing warm nocturnal Moroccan lofi dub loop. Exactly 80 BPM, D natural minor, 4/4, eight bars, exactly 24 seconds. Joyful retro organ answers, short bright muted brass-like keyboard notes, elegant gnawa-inspired plucked motifs and a little more qraqeb sparkle. No new bass or complete drums. The feeling is a friendly boat leaving a moonlit Moroccan cove, gently psychedelic and colorful, never harsh or frantic. Leave room for a real engine roar. Match the base downbeat and musical phrase exactly. No vocals, no words, no chants, no artist references. No intro or outro. Exact seamless loop with no extra tail.

Guardar como `high.ogg` e `high.mp3`. O jogo sobe esta camada durante 24 segundos após um prémio de 10× ou mais. As três camadas arrancam numa única referência de tempo, com ganhos independentes.

## 4. Stinger GANZÁ, prémio de 100× ou mais

> Instrumental four-second victory stinger, 80 BPM, D natural minor. Warm dub bass punctuation, bright retro organ flourish, a short elegant qraqeb shimmer and a cheerful plucked Moroccan bass-lute answer. A soft but unmistakable celebration for a fast boat departure. No vocal or spoken name, no chant, no explosive synthetic alarm. Immediate recognizable onset, resolve naturally within exactly four seconds. Keep headroom for engines and water foley.

Guardar `stinger-max.ogg` e `stinger-max.mp3`, duração 4 segundos.

## 5. Stinger CARGA COMPLETA

> Instrumental seven-second maximum-win flourish, 80 BPM, D natural minor. A joyful warm 1960s lofi dub and Moroccan gnawa-inspired celebration, deep bass punctuation, playful retro organ, short plucked motifs, lively qraqeb and a rounded final resolving chord. Richer than the normal victory, but friendly and spacious enough for distant fireworks, applause and boat horns. No voice, no words, no chant, no artist references, no harsh EDM drop. Immediate start and complete natural resolution within exactly seven seconds.

Guardar `stinger-carga.ogg` e `stinger-carga.mp3`, duração 7 segundos. Quando os cinco pares finais existirem, alterar `provisional` para false e `stingers` para `["stinger-max", "stinger-carga"]` no ficheiro `ui/audio/music/config.json`. Não mudar BPM, compassos ou duração sem adaptar o relógio musical.

## Plano B

Se a ferramenta não entregar camadas isoladas, gerar uma faixa completa com o prompt base e os instrumentos das outras camadas, depois separar stems. Recortar todos no mesmo downbeat e na mesma grelha de oito compassos, sem alterar o tempo de uns face aos outros. Confirmar a duração por amostras e ouvir a junção repetida.

Se a separação não for utilizável, fornecer apenas base.ogg e base.mp3 e silenciar activity e high com ficheiros de silêncio de 24 segundos. O jogo continua com uma faixa única, volumes e ducking. O motor aceita stingers opcionais pela configuração. Não apresentar camadas não sincronizadas como se fossem adaptativas.
