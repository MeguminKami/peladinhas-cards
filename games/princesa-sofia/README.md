# Princesa Sofia — slot de cascatas

Slot de conto de fadas para o site Peladinhas Cards: grelha 6×5 de grupos ligados com cascatas, magia que coloca WILDs com multiplicador, flores Scatter que abrem três bónus (Jardim Encantado, Baile ao Luar, Coroa da Aurora) e Bonus Hunt. Corre no browser, sem dependências externas, com créditos locais de teste.

> Regras fixas do jogo (matemática e interface): **[AGENTS.md](AGENTS.md)**. Integração no site principal: **[PARA-O-PROXIMO-AGENTE.md](PARA-O-PROXIMO-AGENTE.md)** e **[INTEGRACAO.md](INTEGRACAO.md)**.

## Abrir

A partir desta pasta, com Node.js 22:

```powershell
npm.cmd run dev            # servidor local em http://127.0.0.1:4175
npm.cmd run dev:pc         # abre a pré-visualização de PC
npm.cmd run dev:telemovel  # abre a pré-visualização de telemóvel
npm.cmd run dev:site       # abre o jogo por baixo do menu do site
npm.cmd run dev:rede       # aceita ligações da rede local (testar num telemóvel real)
```

| Página | O que é |
| --- | --- |
| `/game.html` | O jogo |
| `/site.html` | O jogo por baixo do menu do site (modelo para a integração) |
| `/pc.html` | O jogo em tamanhos de PC, com ou sem o menu do site |
| `/telemovel.html` | O jogo em molduras de telemóvel e tablet, vertical e horizontal |
| `/audio-lab.html` | Página de teste de som: ouvir variantes e aplicar ao jogo |
| `/` | Demonstração simples do jogo numa página |

Se o servidor já estiver ligado, `dev:pc`, `dev:telemovel` e `dev:site` só abrem a página.

## Organização

```
game.html            a slot
ui/                  apresentação (app, layout, motion, presentation, sessão de teste), CSS, arte, áudio, fontes
  embed.js           encaixe do jogo numa página (iframe por baixo do menu)
src/                 motor: config.js (fonte da matemática), engine.js, simulation.js, random.js
tests/               testes do motor (node --test) e de browser (Playwright)
scripts/             servidor local, simulação, validação de RTP, aplicar/gerar sons, loops de música
relatorios/          medições de RTP da configuração atual (v33)
docs/                matemática, estrutura da interface, visuais e animações, sons
audio-lab/           variantes de som e escolhas da página de teste
ASSETS/              referências de produção da arte
site.html, pc.html, telemovel.html, index.html   páginas de pré-visualização e integração
```

## Comandos

```powershell
npm.cmd test                         # testes do motor
npm.cmd run test:ui                  # teste de browser do protótipo
npm.cmd run validate:rtp             # RTP dos 5 modos (100 000 base/Hunt, 10 000 compras de cada bónus)
npm.cmd run validate:rtp -- --large  # 1 000 000 base e Hunt
npm.cmd run simulate -- --mode all --count 1000 --seed 20261030 --out piloto.json
npm.cmd run audio:apply              # aplica as escolhas da página de teste de som
npm.cmd run audio:candidates         # gera variantes de som na ElevenLabs (chave no .env)
```

## Estado

- Configuração `sofia-entry-clusters-balanced-hunt-v33`, não certificada. Resumo e RTP medidos em [docs/matematica.md](docs/matematica.md).
- Interface responsiva para PC, telemóvel e tablet: [docs/estrutura-ui.md](docs/estrutura-ui.md).
- Animações (suspense de Scatters, cálculo dos ganhos com WILD, magia, bónus): [docs/visuais-animacoes.md](docs/visuais-animacoes.md).
- Sons e músicas: [docs/sons.md](docs/sons.md).
- Saldo, aposta e ganhos são créditos locais de teste. O motor usa um gerador reprodutível (Mulberry32), adequado a desenvolvimento e não a dinheiro real.

## API do motor

```js
import { createEngine } from './src/index.js';
const engine = createEngine({ seed: 123 });
const result = engine.play({ mode: 'base', betUnits: 100, trace: true });   // jogada completa com eventos
let state = engine.start({ mode: 'secret', betUnits: 100 });                // ou spin a spin, para a apresentação
while (!state.complete) state = engine.step(state).state;
```

Modos: `base`, `hunt`, `common`, `super`, `secret`. Valores em centésimos da aposta (`paid100 = 123` → 1,23×); probabilidades em partes por milhão. Eventos por ordem: `spin-start`, `hits`, `xp-gained`, `refill`, `magic`, `spin-end`, `bonus-start`/`retrigger`, `max-win`, `round-end`.
