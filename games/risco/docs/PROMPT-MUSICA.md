# Música para RISCO

O dono gera as faixas noutra IA. A música Web Audio atual é **provisória**.

## Entrega

Guardar em `games/risco/ui/audio/music/`, OGG Vorbis estéreo 48 kHz, cerca de −16 LUFS e pico abaixo de −1 dBTP. Stems adicionais, não quatro misturas completas. Todos com exatamente 32 compassos 4/4 a 124 BPM em Lá menor, **61,935484 s**, início no primeiro tempo, sem intro ou silêncio final. Exportar na mesma sessão evita desalinhamento.

| Ficheiro | Entrada |
| --- | --- |
| espera.ogg | Mesa parada e contagem |
| ronda-base.ogg | Toda a ronda |
| ronda-camada-2.ogg | 2× |
| ronda-camada-3.ogg | 10× |
| ronda-camada-4.ogg | 100× |

Depois de colocar os cinco ficheiros, definir ready true no [manifesto](../ui/audio/music/manifest.json). O motor arranca todos em sincronia, alterna por ganho em 300 ms e baixa música durante crash/cashout. Valida durações das camadas. Stingers abaixo são referências opcionais, o jogo já tem efeitos originais.

## Prompts prontas a colar

**Espera**

> Dark acid house instrumental loop, exactly 124 BPM, A minor, 4/4, 32 bars, 61.935484 seconds. Late night club bathroom at 5 AM, muffled kick through a wall, low-filtered squelchy 303 bassline, distant nonverbal crowd atmosphere and neon hum. Tense but groovy, playful afterparty videogame mood. No vocals, no words, no intro, no ending or tail. Start on the downbeat, sample-accurate seamless loop. Leave space for game sound effects.

**Base**

> Driving acid techno BASE STEM ONLY, exactly 124 BPM, A minor, 4/4, 32 bars, 61.935484 seconds. Punchy kick, tight hats, rolling monophonic 303 bassline slowly opening its filter, hypnotic rising tension. Restrained arrangement with room for three additive stems. No lead, supersaw, choir or vocals. Exact bar-one downbeat, no intro or outro, seamless loop. Match tempo, key, bar count and phase of all RISCO stems.

**Camada 2**

> Additive PERCUSSION AND STAB STEM ONLY for the same RISCO session. Exactly 124 BPM, A minor, 4/4, 32 bars, 61.935484 seconds. Glitchy percussion, pitched nonverbal synthetic vocal-like chops, sidechained synth stabs, comic nervous anticipation. NO kick, bass, base hats or full mix. Must sum cleanly over the base. Identical duration and sample grid, exact downbeat start, no intro or tail, seamless loop.

**Camada 3**

> Additive PSYCHEDELIC LEAD STEM ONLY for the same RISCO session. Exactly 124 BPM, A minor, 4/4, 32 bars, 61.935484 seconds. Detuned resonant lead arpeggios, reverse cymbals, euphoric and paranoid but playful neon glitch atmosphere, notes in A minor. NO kick, bass, full drum mix or layer-two sounds. Designed to sum with earlier stems without clipping. Exact downbeat and duration, no intro or ending, seamless loop.

**Camada 4**

> Additive MAXIMUM INTENSITY HARMONY STEM ONLY for the same RISCO session. Exactly 124 BPM, A minor, 4/4, 32 bars, 61.935484 seconds. Distorted supersaw chords, distant synthetic choir pads, sirens in key, surreal euphoric rave climax. NO kick, bass or full mix. Leave transients clear for crash and cashout. Sum with the other three stems, controlled stereo width and headroom. Exact downbeat and length, no intro or outro, seamless loop.

**Crash, 3 s**

> Three-second instrumental game stinger, A minor, 124 BPM feel. Comedic glitch, tape stop, bitcrushed sub drop, exaggerated synthetic inhaling whoosh, one strong impact, ends in silence. No real voice or words. Cartoon private afterparty game.

**MAX WIN, 6 s**

> Six-second triumphant electronic rave stinger, 124 BPM feel, A minor resolving to A major. Huge supersaw chord, synthetic choir, sparkling coin-like chimes, celebratory drum fill. Playful, euphoric and concise, no words or singing, clean final tail and clear first impact.

## Plano B

Se a IA não gerar camadas sincronizadas, gerar uma faixa completa e separar stems numa ferramenta de separação, mantendo comprimento e alinhamento. Em alternativa usar faixa única com filtros e volume por multiplicador, o que exige adaptar o motor de áudio. Não somar quatro misturas completas com bateria e graves duplicados.
