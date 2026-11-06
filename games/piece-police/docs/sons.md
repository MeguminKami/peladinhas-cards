# Fase 4 — som e música Acidwave

Atualização de 05-11-2026: direção aprovada, música de clube acid house com efeitos irreverentes. Sem vozes, falas ou amostras vocais. O dono entregou as cinco músicas geradas no Suno e pediu transições sempre suaves. As faixas estão integradas por modo, com crossfades de 2 segundos e loops preparados localmente. O dono rejeitou a semelhança excessiva da primeira paleta de efeitos, que foi substituída por 62 composições com gestos próprios, ainda sujeitas a nova revisão auditiva. Seguir o [Guia 4](../guides/4-SOM-E-MUSICA.md), os [eventos](eventos.md) e a [estrutura da interface](estrutura-ui.md).

## Músicas integradas e transições

As faixas originais entregues pelo dono mantêm os bytes originais. O [manifesto musical](../ui/audio/music/manifest.json) regista SHA-256, tamanho, origem, duração, pontos de loop e níveis. Foram entregues 26 534 586 bytes em MP3. As condições da conta Suno não foram verificadas, não houve publicação.

| Modo | Faixa | Duração original | Trecho de loop | Duração do loop |
| --- | --- | --- | --- | --- |
| Base | [base.mp3](../ui/audio/music/base.mp3) | 229,61 s | 1,20–209,60 s | 208,40 s |
| MAIS SCATTERS | [maisscatters.mp3](../ui/audio/music/maisscatters.mp3) | 214,01 s | 12,14–205,48 s | 193,34 s |
| AFTERPARTY | [afterparty.mp3](../ui/audio/music/afterparty.mp3) | 228,33 s | 14,34–224,80 s | 210,46 s |
| VIP AFTERPARTY | [vipafterparty.mp3](../ui/audio/music/vipafterparty.mp3) | 219,21 s | 14,00–200,68 s | 186,68 s |
| POLICE PARTY | [policeparty.mp3](../ui/audio/music/policeparty.mp3) | 239,21 s | 13,66–235,04 s | 221,38 s |

O [analisador local](../scripts/analyze-music.js) escolhe regiões evitando extremos silenciosos e comparando os envelopes de amplitude. É uma seleção automática, não uma aprovação musical de fraseado, BPM ou tonalidade. O BPM no manifesto é o pedido no prompt, não uma medição. A [preparação do loop](../ui/music-loop.js) sobrepõe 160 ms na junção sem mexer nos ficheiros. A reprodução usa buffers estéreo a 32 kHz, com RMS perto de 0,12 e pico de amostra até 0,80. Não são medições de LUFS ou true peak.

O [leitor musical](../ui/music-player.js) mantém a faixa atual durante a carga da seguinte, depois faz crossfade de potência constante de 2 segundos. A faixa que sai fecha gradualmente o filtro e a que entra abre-o. Inverter uma transição em curso retoma a partir do ganho corrente. Mudanças rápidas invalidam pedidos antigos e mantêm até dois leitores lógicos, com saídas de 40 ms para leitores substituídos. Não há reinício a cada spin. Normal/Rápido/Turbo não mudam playbackRate nem afinação. A música é carregada só depois de um gesto, com cache limitada a dois loops, sem descarregar as cinco faixas no arranque.

Pré-carga do bónus começa no evento de ativação ou na entrada comprada. Duck de efeitos e suspense usa um barramento separado dos crossfades e respeita o volume escolhido. Silêncio geral, barras, suspensão e retoma têm rampas de ganho. Em segundo plano o contexto pausa, conservando a posição musical. Retoma não cria outro loop. Uma faixa ausente não corta a música anterior nem bloqueia o jogo.

No laboratório podes escolher cada modo, ajustar o volume musical, testar a troca enquanto ouves efeitos e sair da música com fade. Ao substituir algum MP3, atualizar o manifesto antes de testar:

```text
npm.cmd run audio:analyze
npm.cmd run test:music
```

A análise usa Edge e o Playwright já instalado, sem ferramentas novas nem serviços externos. Os originais MP3 são neste momento as fontes de carregamento local. Ainda não há exportação de loops comprimidos separados para publicação. O consumo de memória durante a descodificação, Safari/iPhone e a mistura final precisam de verificação em aparelhos reais. Não houve escuta humana pelo agente. Os testes de continuidade e ganho não comprovam que uma junção tem fraseado musical ideal.

Validação musical local concluída no Edge: os cinco MP3 descodificam, os hashes originais correspondem, as junções não apresentam salto de amostra anormal, o crossfade mantém potência constante e a afinação mantém playbackRate 1. Passaram inversão a meio da transição, regresso no fim do fade antes da limpeza, volume musical, mute, suspensão/retoma e falha de carga preservando a faixa anterior. O fluxo real base → MAIS SCATTERS → AFTERPARTY completo → MAIS SCATTERS terminou sem erros JS nem 404. O laboratório com música e os controlos de efeitos passaram em desktop e a 390 px. Também passaram os testes dirigidos dos efeitos e a verificação documental. Esta validação foi automática, sem escuta humana nem publicação.

## Efeitos implementados

- [Catálogo](../ui/audio-catalog.js) e [manifesto](../ui/audio/sfx/manifest.json) com origem, ficheiros, durações, prioridade, intervalo, nível de geração e duck. As durações efetivas estão nestes ficheiros, a tabela de intenção abaixo conserva o desenho inicial.
- [Gerador reproduzível](../scripts/synthesize-sfx.js), sem rede, samples, contas ou dependências externas. Ré menor, A4 a 440 Hz para as partes musicais, materiais percussivos podem ser inarmónicos. A paleta refeita usa fontes diferentes: ressonâncias modais de vidro/metal/madeira, cordas com atraso e realimentação, ruído filtrado para ar e mecanismos, bolhas FM, bateria sintetizada, baixo ácido e cortes digitais. São aproximações sintetizadas, não gravações desses materiais. Cada ID tem uma composição explícita com gesto, ritmos e durações próprios. As dez fusões têm arranjos separados, em vez de sobrepor duas versões do mesmo tom. Ganhos grandes e entradas de bónus também diferem em instrumentação e ritmo. Os materiais e gestos estão descritos no catálogo e manifesto.
- [Barramento Web Audio](../ui/audio-bus.js) com desbloqueio por gesto, volumes existentes sem aplicar novamente a curva, filtro, compressor, ambiente curto, prioridade e até seis vozes lógicas. Repetições da mesma identidade substituem a anterior com uma saída de 25 ms. Segundo plano suspende e limpa os sons, sair destrói o contexto. Um ficheiro em falta fica em silêncio sem bloquear o jogo.
- [Adaptador](../ui/fx-audio.js) cobre os 29 eventos, com silêncios intencionais em início/fim de passo e diagnóstico. Despertar com fusão não duplica a assinatura. Os impactos das quedas, transferências, wilds e abertura dos cantos são chamados pela apresentação, sem novas esperas nem alterações aos tempos. Scatters sobem de nota apenas quando revelados. No Turbo, quedas conjuntas e intervalos mínimos reduzem repetições. A velocidade não acelera a afinação dos sons.
- Contadores canceláveis e escalões grande/enorme/épico acompanham o contador visual. Clusters pequenos recebem apenas uma confirmação tátil curta. As entradas Joiner/Party já omitidas visualmente no POLICE PARTY também não repetem o anúncio sonoro.
- [Página de audição local](../audio-lab.html): ativar, ouvir cada efeito atual, filtrar, volume, sequência demonstrativa, comparar as cinco personagens, comparar as dez fusões e parar. Cada efeito mostra a descrição do gesto. Ouvir individualmente cancela a sequência anterior. Uma versão atual por efeito, sem candidatos alternativos nem ferramenta de guardar/aplicar escolhas nesta entrega. As sequências são demonstrações sonoras, não jogadas nem simulações de RTP.

Comandos existentes, confirmados em [package.json](../package.json):

```text
npm.cmd run audio:generate
npm.cmd run test:audio
npm.cmd run test:audio:browser -- --edge
npm.cmd run dev
```

Abrir `/audio-lab.html` no servidor local. Um servidor anterior à alteração de MIME precisa de ser reiniciado para servir WAV. Não executar o gerador para ouvir, os ficheiros já estão presentes.

Verificação local: paleta refeita com 62 WAV mono PCM a 24 kHz, 1 933 058 bytes no total. Pico máximo de amostra de −8,87 dBFS, caudas a zero e ausência de silêncio inicial significativo. Este valor não é true peak nem LUFS. FFmpeg não está disponível no PATH, não foram instaladas ferramentas. A integração anterior passou Edge com desbloqueio por teclado/ponteiro, mute, limite de vozes, intervalos, suspensão/retoma, ficheiro ausente, alinhamento de pousos e um AFTERPARTY completo em Normal e Turbo. Na revisão da paleta, voltaram a ser verificados os WAV, a cobertura dos eventos e a audição no laboratório por testes automáticos, incluindo os dois novos controlos de comparação e ausência de overflow a 1280 e 390 px. Não houve escuta humana pelo agente nem teste num iPhone físico. Faltam a nova revisão auditiva do dono, mistura com as músicas, medição LUFS/true peak e verificação Safari/iPhone. Os testes técnicos não comprovam qualidade nem distinção percetiva. WAV é o formato desta versão para revisão, a compressão de entrega fica para depois da aprovação.

O hosting usa uma pasta construída. O build atual do casino não inclui este jogo, cuja integração continua fora do âmbito. O laboratório, scripts de síntese e ficheiros de trabalho não foram adicionados a qualquer publicação. Não houve deploy.

## Direção proposta para discutir

Acid house, breaks e techno de afterparty, synths analógicos, baixo ácido e cromado sonoro. Som presente, divertido, sem agudos estridentes, sirenes realistas ou referências a artistas. Proposta inicial de Ré menor a 440 Hz, com os BPM abaixo. São escolhas para aprovação, não decisões finais. Poupar a região de 2 a 5 kHz e deixar espaço aos efeitos. Não acelerar a música para acompanhar o Turbo.

## Prompts das músicas

Prompts prontos a copiar para a ferramenta escolhida pelo dono. Não gerar música automaticamente nem presumir uma conta, licença ou serviço ligado. Instrumentais sem vozes. Guardar originais, prompts e condições de uso. Os 90 segundos pedidos são uma fonte para criar loops, não uma garantia de loop perfeito.

### Jogo base — 126 BPM

```text
Create an original instrumental acid house loop for an adult neon afterparty game called Peace Police. 126 BPM, D minor, 4/4. Warm analogue drums, restrained rubbery acid bass, rounded kick, soft hats, chrome-like synth plucks and playful psychedelic details. Hypnotic late-night club groove, confident and mischievous, moderate density with room for game sound effects. About 90 seconds of stable groove suitable for seamless looping. Begin on the groove and finish at a compatible bar boundary. No vocals, speech, lyrics, realistic sirens, abrupt drops, long intro, fade-out or imitation of existing songs. Comfortable upper mids for repeated listening.
```

### MAIS SCATTERS — 126 BPM

```text
Create an original instrumental acid house loop for enhanced-scatter mode in a neon afterparty game. 126 BPM, D minor, 4/4. Warm analogue drums, elastic acid bass, chrome plucks, a syncopated break layer and a rising two-note motif. More anticipation than the base groove, similar loudness, playful tension without an alarm or artificial near-win feeling. About 90 seconds of consistent groove, compatible first and last bars for seamless looping, space for game effects. No vocals, speech, lyrics, real sirens, long buildup, silence, final cadence, fade-out or borrowed melody. Keep upper mids smooth.
```

### AFTERPARTY — 128 BPM

```text
Create an original instrumental acid house and breakbeat loop for AFTERPARTY in an adult neon club game. 128 BPM, D minor, 4/4. Playful swung percussion, warm rolling acid bass, airy psychedelic chords, small sparkling arpeggios and tactile analogue fills. An open and loose late-night groove, celebratory but controlled, with clear space for short game effects. About 90 seconds with stable rhythm and compatible boundary bars for seamless looping. No vocals, lyrics, spoken announcements, harsh highs, realistic sirens, long intro, dramatic stop, fade-out or copied melody. Enjoyable over many repetitions.
```

### VIP AFTERPARTY — 132 BPM

```text
Create an original instrumental premium acid house and electro-breaks loop for VIP AFTERPARTY in an adult neon game. 132 BPM, D minor, 4/4. Deep rounded kick, precise broken percussion accents, rich resonant acid bass, dark velvet pads and polished metallic stabs. More weight and rhythmic contrast than a relaxed afterparty, confident and stylish, never orchestral or casino-jazz. About 90 seconds of repeatable groove, short controlled variations and compatible opening and ending bars for seamless looping. Leave headroom for game effects. No vocals, speech, lyrics, alarm sirens, shrill leads, excessive sub-bass, long intro, fade-out or imitation of known recordings.
```

### POLICE PARTY — 138 BPM

```text
Create an original instrumental acid techno and rave-breaks loop for POLICE PARTY, the wildest bonus in a neon afterparty game. 138 BPM, D minor, 4/4. Driving rounded drums, animated acid bass, punchy syncopated breaks, prismatic riffs and a playful two-note synthetic call suggesting the police joining the dancefloor, without resembling an emergency siren. Highest energy in the same musical family, exuberant but controlled, space for powers and multipliers. About 90 seconds of stable loopable groove with compatible boundary bars. No vocals, lyrics, speech, real sirens, piercing highs, disruptive drops, silence, long intro, fade-out, final chord or borrowed melody.
```

## Assinaturas propostas

| Personagem | Som |
| --- | --- |
| WEED | Baixo filtrado e bolhas elásticas que crescem |
| ALCOOL | Vidro e líquido com movimento estéreo nos passos |
| COPIUM | Sopro de válvula e pequeno motivo de nova oportunidade |
| MDMA | Atração percussiva e pulsação rítmica |
| LCD | Glitch cromático e pitch bend curto |
| Calmer | Varredura filtrada e batida seca de estabilização |
| Joiner | Entrada rítmica e golpe cromado no multiplicador |

As dez fusões precisam de identidade própria. NEVER ENDING DREAM combina bolha e sopro em espiral. ONE MORE ROUND usa vidro, sopro e ricochete do wild extra. SLOW DISASTER prolonga passos líquidos. RAVE DIMENSION duplica a percussão com eco cromático. TOTAL MAYHEM marca os saltos estéreo. FROZEN REALITY congela o glitch num acorde filtrado. FREEZE & FREAK combina baixo elástico com atração percussiva. DREAM GLITCH transforma sopro em glitch afinado. ONE MORE RAVE usa sopro seguido de atrações rítmicas. DOUBLE VISION usa vidro em espelho estéreo.

## Mapa dos eventos para implementação

Os IDs abaixo orientaram os assets agora existentes. Os perfis e valores efetivos estão no catálogo e manifesto acima. Perfis de intenção: UI, prioridade 1, 40–120 ms, intervalo mínimo 80 ms, sem duck. Movimento, prioridade 2, 80–220 ms, intervalo mínimo 90 ms. Destaque, prioridade 3, 250–700 ms, intervalo mínimo 250 ms, duck leve. Grande momento, prioridade 4, 0,6–1,5 s, intervalo mínimo 600 ms, duck forte. Máximo de seis vozes lógicas, uma por identidade repetitiva. A atual versão usa variantes afinadas por nível e posição, sem variações aleatórias.

| Evento | ID proposto | Som e perfil |
| --- | --- | --- |
| step.start | silêncio | Preparar contadores e cancelar caudas antigas |
| grid.drop | column-land, scatter-land | Colunas e notas por Scatter, movimento |
| win.cluster | win-small, win-medium | Acorde conforme o escalão real, movimento |
| cap.hit | max-win | Assinatura própria, grande momento |
| multiplier.change | multiplier-up | Nota ascendente, movimento |
| persona.awaken | awaken-personagem | Carga e assinatura das cinco personagens, destaque |
| fusion.trigger | fusion-ID | As dez assinaturas, destaque |
| grid.remove | cluster-clear | Dissolução leve, movimento |
| grid.refill | cascade-land, scatter-land | Impactos da cascata e Scatters, movimento |
| power.reality_break | lcd-transform | Glitch de transformação, destaque |
| power.slow_motion.start | weed-hold | Grupo preso, movimento |
| power.slow_motion.grow | group-grow | Crescimento afinado, movimento |
| power.slow_motion.end | group-release | Libertação, movimento |
| power.rave_rush.move | mdma-pull | Atração no destino, movimento |
| power.drunk_walk.step | alcohol-step | Passo ou salto real, movimento |
| power.one_more_chance.armed | copium-ready | Preparação curta, movimento |
| power.one_more_chance.respin | copium-respin | Sopro e nova queda, destaque |
| wild.place | wild-land, joiner-land | Distinguir wild comum e Joiner, movimento |
| chemistry.level | chemistry-up | Motivo por nível, destaque |
| corner.open | corner-open | Abertura e wild a pousar, destaque |
| chemistry.total | total-chemistry | Assinatura culminante, grande momento |
| police.enter | calmer-enter, joiner-enter | Entradas distintas, destaque |
| police.calmer.arrest | calmer-sweep | Varredura filtrada, movimento |
| police.joiner.party_mode | party-on | Entrada Party e Joiner, destaque |
| bonus.trigger | bonus-after, bonus-vip, bonus-police | Entrada por bónus, grande momento |
| bonus.retrigger | retrigger | Reforço reconhecível, destaque |
| bonus.end | bonus-summary | Saída da música do modo e resumo, grande momento |
| safety.stop | silêncio | Diagnóstico sem recompensa sonora |
| step.end | silêncio | Terminar sons da sequência sem cortar prémios visuais |

Interface: spin-press, buy, hunt-on, hunt-off, bet-step, dialog-open, dialog-close, speed, auto-start, auto-stop, click e overlay. Também contagem cancelável de ganho e som de fim, escalões grande/enorme/épico e entrada curta das cutscenes após desbloqueio. Nunca duplicar um prémio sonoro nem criar falsas quase-vitórias.

## Conclusão e revisão auditiva

O [fx-audio.js](../ui/fx-audio.js) preserva audio.play, audio.ui, audio.mode, audio.setVolumes e audio.unlock. A API mode troca as músicas com crossfade, preload antecipa bónus e o barramento aplica duck. Motor, matemática, sessão, carteira e kit não foram alterados para áudio. A apresentação só ganhou chamadas de impacto e pré-carga.

1. Rever auditivamente os efeitos refeitos, as cinco músicas, as suas junções e as mudanças de modo no laboratório e no jogo.
2. Ajustar pontos de loop, mistura e níveis conforme a escuta. Confirmar LUFS/true peak com ferramentas adequadas, os valores atuais são RMS e sample peak.
3. Validar Safari/iPhone e o consumo de memória num aparelho real, incluindo segundo plano e retoma.
4. Antes de publicar, preparar loops comprimidos de entrega e excluir as fontes MP3, laboratório e ferramentas do build. A integração no casino continua fora do âmbito.
5. Só documentar comandos audio:apply e audio:candidates quando existirem. package.json ainda não os tem. Não foi verificada qualquer chave ou conta externa e não foram lidos segredos.

A configuração Firebase foi consultada apenas em ficheiro local. O hosting publica uma pasta construída, não o workspace diretamente. Antes da publicação futura, confirmar que o build exclui originais, candidatos e segredos. Nenhum deploy foi executado.
