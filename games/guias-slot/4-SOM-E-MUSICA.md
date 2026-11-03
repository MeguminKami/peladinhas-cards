# Guia 4 — Som e música

> **Para o agente:** És responsável pela fase 4 de uma slot. Já existe um jogo funcional (fase 2), normalmente já com a arte e as animações (fase 3). Lê `AGENTS.md`, `docs/eventos.md`, `docs/estrutura-ui.md`, `docs/TEMA.md` e `docs/visuais-animacoes.md`. A tua tarefa é todo o áudio: músicas por modo, efeitos para cada evento, mistura, sincronia com as animações, controlos de volume e uma página para ouvir e escolher variantes. Trabalhas sobretudo em `ui/fx-audio.js`, num barramento de áudio (`ui/audio-bus.js`) e em `ui/audio/`. **O som nunca altera resultados nem tempos da lógica.** Não alteras a matemática, a sessão nem as animações. Se a sincronia exigir um ajuste visual, descreve-o no relatório. Sê honesto sobre a origem de cada som: sintetizado, gerado por IA ou com licença de terceiros.

## Input do dono do jogo

```text
PASTA DO JOGO:
DIREÇÃO SONORA: [ex.: caixa de música e marimba, suave | eletrónica agressiva | orquestral épica]
INSTRUMENTOS A EVITAR: [ex.: harpa; agudos estridentes]
MÚSICA POR MODO: [ex.: base calma; bónus 1 alegre; bónus 2 valsa; bónus 3 coro]
REFERÊNCIAS (descrições ou ficheiros próprios):
FERRAMENTAS DISPONÍVEIS: [ex.: ElevenLabs com chave no .env | só síntese local | ficheiros meus]
VOLUME GERAL PRETENDIDO: [discreto | presente]
```

## 1. Mapa de som (`docs/sons.md`)

Antes de produzir, faz uma tabela com **todos** os eventos de `docs/eventos.md`, mais a interface (clique, abrir e fechar janelas, aposta −/+, autoplay, velocidade, interruptor da aposta extra), com estas colunas: momento → ficheiro → como soa → duração → prioridade → intervalo mínimo entre repetições → variação (afinação ou volume) → se faz «duck» à música.

Define uma **paleta** coerente com o tema: instrumentos, tonalidade e escala (por exemplo dó pentatónico, para sons repetidos nunca desafinarem entre si) e a faixa de frequências a poupar. Por omissão, pouca energia entre 2 e 5 kHz, porque cansa em sessões longas.

Momentos que nunca podem faltar: queda de cada coluna, símbolos a pousar, cada escalão de prémio (pequeno / médio / grande / épico), contador de ganho e fim da contagem, scatter a pousar (uma nota acima a cada scatter), suspense por nível, scatters a convergir, entrada em bónus, introdução de cada bónus, retrigger, cada poder (carga, pronto, lançamento), wild a pousar, multiplicador, compra, fim de bónus, limite atingido (MAX WIN) e interface.

## 2. Música

- **Um loop por modo** (base, aposta extra se fizer sentido e cada bónus). Mesma família sonora, intensidade crescente com a raridade do modo.
- **Origem:** se houver uma ferramenta de geração de música ou de efeitos (ex.: ElevenLabs, com a chave no `.env`), usa-a com prompts guardados em `docs/sons.md`. Se não houver, usa síntese local trabalhada (Python com numpy, scipy e ffmpeg, ou Web Audio) ou os ficheiros do dono do jogo. Nunca descarregues música da internet sem uma licença verificável por ficheiro. Descrever como «royalty-free» ou «sem copyright» não chega como prova.
- **Loop sem costura:** um script (ex.: `scripts/loop-music.py`) encontra o ponto de loop, faz um crossfade curto na junção e grava o loop. Guarda o original como `*.full.<ext>` (só fonte, nunca publicado). Ouve a junção 3 vezes seguidas antes de aceitar.
- **Formato:** Opus a 96–128 kbps para a música (`.opus`, servido como `audio/ogg`). **Confirma a reprodução no Safari do iPhone.** Se falhar, publica também AAC (`.m4a`) e escolhe com `canPlayType`.
- **Transições:** a faixa que sai perde agudos (filtro passa-baixo) e baixa de volume, enquanto a que entra abre e sobe num crossfade de potência constante de cerca de 2 s, sem silêncio entre elas. Ligar a aposta extra troca a música de imediato. A música do bónus começa a carregar quando os scatters convergem ou na compra, para estar pronta na introdução.
- **Duck:** a música baixa nos grandes momentos (poder lançado, introduções, ganho épico, MAX WIN) e baixa progressivamente em cada nível de suspense (ex.: −18% por nível).

## 3. Efeitos

- **Formato:** MP3 ou Opus curtos, com o volume final já aplicado no ficheiro. Normaliza por categoria. Pontos de partida: interface cerca de −24 LUFS, quedas e scatters cerca de −20, prémios entre −18 (pequeno) e −14 (épico), MAX WIN cerca de −12 e picos sempre abaixo de −1 dBTP. Ajusta de ouvido no jogo.
- `ui/audio/sfx/manifest.json` lista os sons, as variantes opcionais (tocadas ao acaso para evitar repetição mecânica) e a origem e licença de cada ficheiro.
- Sons com nota musical ficam afinados entre si (desvio de no máximo ±6 cêntimos). Sequências sobem na escala: colunas a pousar em arpejo, scatters e wilds uma nota acima a cada um.

## 4. Motor de áudio (`ui/audio-bus.js` + `ui/fx-audio.js`)

- **Web Audio:** `master → (música, efeitos)`, com um ambiente comum leve (corte suave de agudos, compressor leve, reverberação curta gerada no código).
- **Desbloqueio:** o áudio só arranca depois do primeiro gesto do jogador (regra dos browsers, iOS incluído). No primeiro clique descodificam-se todos os efeitos e a música base. Antes disso não toca nada nem aparecem erros.
- **Sobreposição** (regras por som): prioridade e intervalo mínimo. No máximo cerca de 6 vozes, e quando é preciso cortar sai a mais fraca. Os grandes momentos silenciam os sons pequenos durante uma fração de segundo. Nunca acumules o mesmo som em loop.
- **Sincronia:** o som toca no **impacto** visual e não no início da animação. Por exemplo, a cerca de 84% de uma queda: usa `ctx.tempo` e as durações de `docs/visuais-animacoes.md`. Com velocidade Rápido ou Ultra, encurta ou omite os sons repetitivos (pousos, contador) para não haver metralhadora. A cascata soa no primeiro símbolo novo a pousar.
- **Contador de ganho:** som em loop discreto enquanto conta, parado exatamente quando a contagem termina, e um som de fim.
- **Volumes:** as barras de Música e Efeitos e o silêncio geral vêm da barra de controlos padrão (`ui/kit/barra.js`), que já os guarda e aplica a curva quadrática. Usa o callback `onVolumeChange({ music, sfx, muted })` para aplicar os valores com rampas curtas, sem estalos. Os sons de interface chegam por `onUiSound(nome)` com estes nomes: `bet-step`, `dialog-open`, `dialog-close`, `speed`, `auto-start`, `auto-stop`, `click`. Não alteres a barra.
- **Ciclo de vida:** suspende quando a página fica oculta e retoma sem duplicar loops. Destruir o jogo (sair do iframe) para todo o áudio. Mudar a velocidade a meio não desalinha nada.
- **Nunca** dependem do áudio o resultado, o saldo nem o avanço do fluxo. Um erro a carregar um som fica registado e o jogo continua em silêncio nesse som.

## 5. Página de teste de som

`audio-lab.html` (não publicada, só para desenvolvimento):

- Para cada momento, as variantes disponíveis em `audio-lab/candidates/<momento>/` (incluindo a atual), tocadas com o mesmo ambiente do jogo e, se quiseres, por cima da música do modo.
- Um botão «Simular um spin» que toca a sequência de um spin típico com as escolhas atuais.
- «Guardar e aplicar ao jogo» grava `audio-lab/choices.json` e copia as escolhidas para `ui/audio/sfx/`. Também há um comando equivalente: `npm run audio:apply`.
- Scripts para gerar candidatos: síntese local (`scripts/synthesize-sfx.py`) e, se houver chave, geração externa (`npm run audio:candidates`). **A chave fica em `.env`, que está no `.gitignore` e nunca é publicado.**

## 6. Verificação

- Teste automático: cada evento do catálogo tem um som mapeado (ou está assinalado como «silêncio» de propósito), todos os ficheiros existem, nenhum dá 404 e o manifesto bate com a pasta.
- Teste de browser: o primeiro clique desbloqueia o áudio; ocultar e mostrar a página não duplica a música; o silêncio geral e as barras persistem depois de um reload; a troca de modo não tem silêncio a meio.
- Análise dos ficheiros (ex.: `ffmpeg -af ebur128`): loudness e picos dentro dos alvos, sem clipping e sem silêncio no início que atrase o impacto.
- Escuta real de um bónus completo em Normal e em Ultra, com a música por baixo. Descreve no relatório o que ouviste e o que ajustaste. Se não conseguires ouvir, diz que a validação foi só por análise.
- Os testes das fases anteriores continuam a passar.

## 7. Entregáveis

1. `ui/audio/music/` (loops por modo, mais os `*.full` de origem fora da publicação) e `ui/audio/sfx/` com o `manifest.json`.
2. `ui/audio-bus.js` e `ui/fx-audio.js` ligados a todos os eventos.
3. `audio-lab.html` com os candidatos, as escolhas e os scripts de geração, aplicação e loop.
4. `docs/sons.md` com o mapa, a paleta, as regras de mistura, os prompts e as origens e licenças.
5. Script de build/publicação a excluir `audio-lab/`, `*.full.*`, `.env` e scripts.

## 8. Relatório final

Responde com: a tabela momento → som (com a origem: sintetizado / gerado por IA com a ferramenta X / ficheiro do dono), as músicas por modo com duração e ponto de loop, os níveis medidos, o peso total do áudio publicado, os browsers e aparelhos onde foi testado (iPhone incluído, ou a indicação de que não foi) e as limitações.

## Erros comuns a evitar

- Tocar o som no início da animação em vez de no impacto.
- Loops com clique na junção, ou duas músicas a tocar depois de mudar de separador.
- Muitos sons agudos simultâneos nas cascatas, sem limite de vozes.
- Apresentar áudio sintetizado como «gravação de instrumentos reais».
- Publicar a chave da API, os originais `*.full` ou os candidatos da página de teste.
