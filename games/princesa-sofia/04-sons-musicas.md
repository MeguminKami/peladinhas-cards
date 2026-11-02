# Etapa 4 — Sons e músicas da slot Princesa Sofia

Lista completa e fechada de todos os áudios do jogo, com a estrutura de pastas que o agente de produção deve usar. Os nomes de ficheiro são **exatos e obrigatórios**: a integração no jogo parte destes nomes. Se algum ficheiro faltar, esse cue fica simplesmente em silêncio — o jogo nunca pode falhar por causa de áudio.

## Estrutura de pastas

```
games/princesa-sofia/ui/audio/
├── music/                  ← temas musicais em loop
│   ├── theme-base.mp3
│   ├── theme-hunt.mp3
│   ├── theme-bonus-common.mp3
│   ├── theme-bonus-super.mp3
│   └── theme-bonus-secret.mp3
└── sfx/                    ← efeitos sonoros (one-shot, salvo indicação)
    ├── spin-whoosh.mp3
    ├── symbols-land.mp3
    ├── hit-small.mp3
    ├── hit-medium.mp3
    ├── hit-large.mp3
    ├── hit-epic.mp3
    ├── win-count.mp3
    ├── win-count-end.mp3
    ├── cascade-dissolve.mp3
    ├── xp-fly.mp3
    ├── magic-ready.mp3
    ├── magic-cast.mp3
    ├── wild-place.mp3
    ├── scatter-land.mp3
    ├── scatter-converge.mp3
    ├── bonus-trigger.mp3
    ├── intro-common.mp3
    ├── intro-super.mp3
    ├── intro-secret.mp3
    ├── retrigger.mp3
    ├── bonus-end.mp3
    ├── max-win.mp3
    ├── purchase-flowers.mp3
    ├── ui-click.mp3
    ├── ui-spin-press.mp3
    ├── ui-bet-step.mp3
    ├── ui-dialog-open.mp3
    ├── ui-dialog-close.mp3
    ├── ui-hunt-on.mp3
    ├── ui-hunt-off.mp3
    ├── ui-speed.mp3
    ├── ui-auto-start.mp3
    └── ui-auto-stop.mp3
```

## Convenções técnicas

- **Formato:** MP3, 44,1 kHz, estéreo. Música a 160 kbps; efeitos a 128 kbps. (Se o agente produzir WAV, converte para MP3 e não guarda os WAV no repositório.)
- **Loops de música:** perfeitamente contínuos (o fim liga ao início sem clique nem quebra); renderizar com a cauda da reverberação dobrada para o início.
- **Efeitos:** sem silêncio inicial/final (máx. 30 ms); ataque imediato, porque vários cues sincronizam com animações.
- **Loudness:** música ≈ −18 LUFS integrado; efeitos com true peak ≤ −1 dBFS e loudness consistente entre si (nenhum efeito pode soar muito mais alto que os restantes).
- **Estética global:** conto de fadas encantado — caixa de música/celesta, harpa, cordas, sinos cristalinos, poeira de fada. Evitar clichés de casino (moedas metálicas, sinos de slot física, buzinas); os prémios soam a cristal e magia, não a dinheiro.
- **Orçamento de tamanho:** total alvo ≤ 8 MB.

## Músicas (loops)

| Ficheiro | Descrição | Duração |
| --- | --- | --- |
| `music/theme-base.mp3` | **Tema do jogo normal.** Floresta encantada serena: melodia de caixa de música/celesta, arpejos de harpa, cordas suaves, flauta e sinos distantes. Tom maior, ≈ 90 BPM, 4/4. Mágico e acolhedor sem adormecer; volume pensado para ficar sob os efeitos. | 60 s, loop contínuo |
| `music/theme-hunt.mp3` | **Bonus Hunt.** O mesmo tema do jogo normal com mais pulso: cordas pizzicato/staccato, percussão leve (tamborim, taiko suave), arpa mais rítmica, ≈ 100 BPM. Sensação de expectativa e caça ao bónus, sem virar tensão escura. | 45–60 s, loop contínuo |
| `music/theme-bonus-common.mp3` | **Jardim Encantado (bónus Normal).** Pastoral alegre e luminoso: flauta com trinados de pássaro, harpa, cordas pizzicato, glockenspiel, celesta. ≈ 100 BPM, tom maior brilhante. Festivo mas doce — jardim em flor ao fim da tarde. | 60 s, loop contínuo |
| `music/theme-bonus-super.mp3` | **Baile ao Luar (bónus Super).** Valsa noturna em 3/4: ensemble de cordas, celesta, harpa, clarinete/oboe romântico. ≈ 110 BPM (compasso de valsa elegante). Luar, velas e baile real — mais nobre e emocionante que o Jardim. | 60 s, loop contínuo |
| `music/theme-bonus-secret.mp3` | **Coroa da Aurora (bónus Secret).** Etéreo e majestoso: pads ambientes, coro sem palavras, sinos cristalinos, harpa lenta, crescendo subtil que nunca explode. ≈ 70 BPM. Aurora boreal sobre o castelo — o momento mais raro e precioso do jogo. | 60–75 s, loop contínuo |

## Efeitos de jogo

| Ficheiro | Descrição | Duração |
| --- | --- | --- |
| `sfx/spin-whoosh.mp3` | **Arranque do spin.** Whoosh ascendente de ar magico com brilho de celesta, acompanhando a entrada dos símbolos por colunas (animação de 720–900 ms). Sincronizar o pico com a chegada das últimas colunas. | 0,8–1,0 s |
| `sfx/symbols-land.mp3` | **Pousar da grelha.** Impacto suave e cristalino quando os símbolos assentam — pequeno «thud» acolchoado com cauda de sino. Grave o suficiente para dar peso, curto para não tapar o whoosh. | 0,2–0,3 s |
| `sfx/hit-small.mp3` | **Prémio pequeno (< 1× aposta).** Brilho curto de celesta/sinos, 2–3 notas ascendentes discretas. | 0,5 s |
| `sfx/hit-medium.mp3` | **Prémio médio (≥ 1×).** Arpejo cristalino mais cheio, 4–5 notas, com leve acorde de cordas. | 0,8 s |
| `sfx/hit-large.mp3` | **Prémio grande (≥ 5×).** Fanfarra curta de harpa + cordas + sinos, acorde maior luminoso com cauda cintilante. | 1,2 s |
| `sfx/hit-epic.mp3` | **Prémio épico (≥ 20×).** Explosão mágica: glissando de harpa, acorde orquestral aberto, chuva de sinos e poeira de fada. O maior hit individual, sem atingir a escala do max-win. | 1,8 s |
| `sfx/win-count.mp3` | **Contagem de prémio.** Loop neutro e agradável para tocar enquanto os números sobem (saldo/ganho/totais): tique-taque suave de caixa de música ou pulso cristalino, sem melodia forte para não cansar. | 2 s, loop contínuo |
| `sfx/win-count-end.mp3` | **Fim da contagem.** Pequeno acorde de fecho (celesta + sino) quando o número final assenta. | 0,6 s |
| `sfx/cascade-dissolve.mp3` | **Cascata / desintegração.** Os símbolos vencedores desfazem-se em poeira: «shimmer» descendente, cristais a desvanecer, seguido do toque suave dos novos símbolos a cair. | 0,6–0,8 s |
| `sfx/xp-fly.mp3` | **Poeira de XP.** Faíscas que voam da grelha para a barra de XP: «whoosh» fininho e cintilante, agudo, com rasto de sinos pequenos. Toca durante a animação de voo (≈ 650 ms). | 0,5 s |
| `sfx/magic-ready.mp3` | **Barra de XP cheia.** A barra vibra com cores: acorde suspenso e expectante (cordas + celesta), como uma varinha a carregar energia. Anuncia que a magia vem aí. | 1,0 s |
| `sfx/magic-cast.mp3` | **Magia real.** A fada entra e lança o feitiço: glissando de harpa, explosão suave de poeira mágica, coro breve. O cue mais importante do jogo base — grandioso mas doce. | 1,5–2,0 s |
| `sfx/wild-place.mp3` | **Colocação de cada WILD.** Toque cristalino de sino com pequeno «thunk» mágico ao fixar na grelha. Toca repetidamente em sequência (uma vez por wild); deve soar bem em repetição rápida e em alturas sobrepostas. | 0,4 s |
| `sfx/scatter-land.mp3` | **Flor Scatter aterra.** Sino de flor com leve brilho mágico; mais pesado e chamativo que um símbolo normal, porque anuncia possibilidade de bónus. | 0,5 s |
| `sfx/scatter-converge.mp3` | **Scatters convergem.** As flores confirmadas voam para o centro: «whoosh» coletivo cintilante com notas ascendentes, terminando em acorde suspenso que liga com o fanfarra do bónus. | 0,8–1,0 s |
| `sfx/bonus-trigger.mp3` | **Entrada em bónus (gatilho natural).** Fanfarra de transição: harpa + cordas + sinos em crescendo, 3 acordes ascendentes que resolvem no tema do bónus. Toca entre a convergência e a introdução. | 2,5 s |
| `sfx/intro-common.mp3` | **Introdução Jardim Encantado.** Stinger de boas-vindas pastoral: flauta alegre, harpa, flores a abrir em sinos. Termina em acorde aberto que cede ao loop do bónus. | 4–5 s |
| `sfx/intro-super.mp3` | **Introdução Baile ao Luar.** Stinger de valsa: convite de cordas e celesta, elegante e lunar, como cortinas a abrir para o salão. Termina no primeiro compasso da valsa. | 4–5 s |
| `sfx/intro-secret.mp3` | **Introdução Coroa da Aurora.** Stinger etéreo: coro, sinos cristalinos e pads em crescendo, revelação da aurora. O mais solene dos três. | 5–6 s |
| `sfx/retrigger.mp3` | **Retrigger (+spins).** Fanfarra curta e eufórica: notas ascendentes rápidas de celesta + acorde de cordas, celebrando spins extra sem interromper o ritmo do bónus. | 1,5 s |
| `sfx/bonus-end.mp3` | **Fim de bónus / apresentação do total.** Fanfarra de encerramento: acorde orquestral quente com cauda de sinos, abrindo espaço para a contagem do prémio total. | 3 s |
| `sfx/max-win.mp3` | **MAX WIN (10 000×).** A maior celebração do jogo: orquestra completa, coro, chuva de sinos e poeira de fada em crescendo, com final majestoso sustentado. Pode sobrepor-se a tudo (a música faz duck). | 5 s |
| `sfx/purchase-flowers.mp3` | **Compra de bónus.** Simulação das 3/4/5 flores que aparecem e convergem: notas de sino sequenciais (uma por flor) + «whoosh» de convergência, ligando à introdução do bónus comprado. | 2 s |

## Efeitos de interface

Todos muito curtos, secos e discretos; nunca abafam a música nem os prémios.

| Ficheiro | Descrição | Duração |
| --- | --- | --- |
| `sfx/ui-click.mp3` | **Clique genérico** (regras, fechar menus, expandir, opções). Toque de madeira/cristal seco e suave. | 0,1 s |
| `sfx/ui-spin-press.mp3` | **Botão SPIN.** Clique com mais corpo e leve brilho — o botão principal merece identidade própria. | 0,15 s |
| `sfx/ui-bet-step.mp3` | **Aposta +/−.** Tique curto e agudo, tipo dente de roda de caixa de música. | 0,08 s |
| `sfx/ui-dialog-open.mp3` | **Abrir diálogo.** «Whoosh» suave e curto com brilho ascendente. | 0,25 s |
| `sfx/ui-dialog-close.mp3` | **Fechar diálogo.** Versão descendente e mais curta do anterior. | 0,2 s |
| `sfx/ui-hunt-on.mp3` | **Ativar Bonus Hunt.** Acorde curto ascendente com brilho de corneta suave — «modo especial ligado». | 0,4 s |
| `sfx/ui-hunt-off.mp3` | **Desativar Bonus Hunt.** Acorde curto descendente, neutro. | 0,3 s |
| `sfx/ui-speed.mp3` | **Mudar velocidade (Normal/Rápido/Ultra).** Tique duplo cristalino; quanto mais alto, mais rápido soa. | 0,15 s |
| `sfx/ui-auto-start.mp3` | **Iniciar autoplay.** Pequeno arpejo ascendente de 3 notas — «máquina a trabalhar por ti». | 0,4 s |
| `sfx/ui-auto-stop.mp3` | **Parar autoplay.** Duas notas descendentes suaves. | 0,3 s |

## Prompts de música para Suno/Udio

Gerar **instrumental** (sem voz; no Suno ativar «Instrumental»). Pedir a faixa mais longa possível; eu corto e faço o loop de 60 s com ffmpeg. Se o resultado tiver introdução falada, canto ou bateria forte, rejeitar e gerar outra vez. Guardar como `theme-*.mp3` em `ui/audio/music/` (eu trato da conversão e do loop).

### `theme-base.mp3` — jogo normal

```
Gentle enchanted forest music box lullaby, delicate celesta melody, soft harp arpeggios, warm string pads, distant glockenspiel sparkles, light flute, 90 BPM, 4/4, major key, cozy fairytale atmosphere, calm and magical, seamless loop, instrumental, no drums, no vocals
```

### `theme-hunt.mp3` — Bonus Hunt

```
Enchanted forest music box theme with added momentum, celesta melody, rhythmic pizzicato strings, light tambourine and soft taiko pulse, harp ostinato, 100 BPM, 4/4, major key, playful anticipation, fairytale treasure hunt, seamless loop, instrumental, no vocals
```

### `theme-bonus-common.mp3` — Jardim Encantado

```
Joyful enchanted garden pastoral, cheerful flute melody with birdsong trills, bright harp, pizzicato strings, glockenspiel and celesta, 100 BPM, 4/4, bright major key, flowers blooming at golden hour, light and festive, seamless loop, instrumental, no vocals
```

### `theme-bonus-super.mp3` — Baile ao Luar

```
Elegant moonlit royal ballroom waltz, 3/4 time, graceful string ensemble, celesta and harp, romantic clarinet and oboe lines, 110 BPM, dreamy candlelit castle atmosphere, noble and emotional, seamless loop, instrumental, no vocals
```

### `theme-bonus-secret.mp3` — Coroa da Aurora

```
Ethereal majestic aurora borealis theme, ambient pads, soft wordless choir, crystalline bells, slow harp, gentle swelling dynamics that never explode, 70 BPM, 4/4, rare precious magical moment over a sleeping castle, seamless loop, instrumental, no drums, no vocals
```

## Mapeamento evento → ficheiro (para a integração)

Referência para a etapa de incorporação. Hoje existem apenas tons provisórios (`sound.tone`) em [ui/app.js](ui/app.js); serão substituídos por este mapa.

| Evento no jogo | Ficheiro(s) | Notas |
| --- | --- | --- |
| Arranque de cada spin (`spin-start`) | `spin-whoosh` | Sem som de aterragem: o utilizador removeu o `symbols-land` no fim da animação de entrada. |
| Cada grupo vencedor (`hits`) | `hit-small` / `hit-medium` / `hit-large` / `hit-epic` | Escalão pelo múltiplo da aposta: <1× / ≥1× / ≥5× / ≥20×, como em `payout-presentation.js`. |
| Contagem de ganho/saldo | `win-count` (loop) + `win-count-end` | Parar o loop se o utilizador acelerar (fast-forward). |
| Cascata (`refill`) | — | Sem som próprio: o utilizador removeu o `cascade-dissolve`. Nos bónus, apenas `xp-fly` durante o voo da poeira. |
| Barra de XP completa | `magic-ready` | Imediatamente antes da magia. |
| Magia (`magic`) | `magic-cast` + `wild-place` ×N | Um `wild-place` por wild colocado, em sequência. |
| Scatter aterra na grelha | `scatter-land` | Um por scatter visível no fim do spin. |
| Gatilho de bónus (`bonus-start`) | `scatter-converge` → `bonus-trigger` → `intro-common/super/secret` | Trocar a música para o tema do bónus no início da introdução. |
| Compra de bónus | `purchase-flowers` → `intro-common/super/secret` | A simulação das flores usa o som sequencial. |
| Retrigger (`retrigger`) | `retrigger` | Junto ao ribbon «+N spins». |
| Fim de bónus com total | `bonus-end` → `win-count` + `win-count-end` | Contagem do total no aviso final. |
| Max win (`max-win`) | `max-win` | Música em duck durante o stinger. |
| Fim de ronda com prémio (`round-end`) | `win-count` + `win-count-end` | Só quando há valor a contar. |
| Botão SPIN | `ui-spin-press` | Também na tecla Espaço. |
| Aposta +/− | `ui-bet-step` | |
| Bonus Hunt ligar/desligar | `ui-hunt-on` / `ui-hunt-off` | |
| Velocidade | `ui-speed` | |
| Autoplay iniciar/parar | `ui-auto-start` / `ui-auto-stop` | |
| Abrir/fechar diálogos | `ui-dialog-open` / `ui-dialog-close` | Compra, regras, autoplay, avisos. |
| Restantes botões | `ui-click` | Regras, expandir, fechar, opções. |
| Música de fundo | `theme-base` / `theme-hunt` / `theme-bonus-*` | Loop contínuo por modo; Hunt troca o tema base; bónus trocam para o respetivo tema e voltam no fim. |

## Regras de integração (etapa seguinte)

- O áudio nunca bloqueia uma ronda: qualquer falha de carregamento ou reprodução fica em silêncio (padrão `try/catch` já existente).
- Respeitar o volume e o mute já existentes na barra de controlos; desbloquear o `AudioContext` na primeira interação.
- Velocidades Rápido/Ultra e fast-forward encurtam ou saltam efeitos não essenciais (`xp-fly`, `win-count`); nunca cortar `bonus-trigger`, `retrigger` ou `max-win`.
- Um único cue por evento; efeitos repetidos em sequência (`wild-place`, `scatter-land`) podem sobrepor-se a si próprios.
- Música em duck (−6 dB) durante `max-win`, `bonus-end` e contagens longas.
