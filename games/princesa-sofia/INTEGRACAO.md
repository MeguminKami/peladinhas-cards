# Integração da Princesa Sofia no site Peladinhas Cards

Guia para quem vai colocar o jogo no site principal. O jogo é autónomo: uma página (`game.html`) que se adapta sozinha ao tamanho do espaço onde está. O site só tem de lhe dar esse espaço, por baixo do menu.

## Ver como fica antes de integrar

```powershell
npm.cmd run dev          # servidor local em http://127.0.0.1:4175
```

| Página | Para quê |
| --- | --- |
| `site.html` | O jogo por baixo de uma simulação do cabeçalho do site (menu de 86 px). É o modelo a seguir. |
| `pc.html` | O jogo em tamanhos de PC (1920×1080, 1440×900, 75%, janela baixa…). Botão **Com menu do site** mostra-o dentro de `site.html`. |
| `telemovel.html` | O jogo em molduras de telemóvel (iPhone, Pixel, Galaxy, iPad), vertical e horizontal, também com **Com menu do site**. |

Atalhos: `npm.cmd run dev:site`, `npm.cmd run dev:pc`, `npm.cmd run dev:telemovel`. Para testar num telemóvel real na mesma rede Wi-Fi: `npm.cmd run dev:rede`.

## Forma recomendada: iframe por baixo do menu

1. Publicar esta pasta (só os ficheiros do jogo, ver abaixo) num caminho do site, por exemplo `/jogos/princesa-sofia/`.
2. Na página do site onde o jogo aparece, por baixo do cabeçalho:

```html
<div class="game-slot">
  <iframe data-sofia-game data-bottom-gap="css"
          src="/jogos/princesa-sofia/game.html"
          title="Slot Princesa Sofia"
          allow="fullscreen; autoplay" allowfullscreen></iframe>
</div>
<script type="module" src="/jogos/princesa-sofia/ui/embed.js"></script>
```

```css
.game-slot { max-width: 1440px; margin: 0 auto; padding: 16px 20px 0; }
.game-slot iframe { --game-bottom-gap: 16px; display: block; width: 100%;
  height: calc(100dvh - var(--altura-do-menu) - 32px);   /* valor inicial; embed.js corrige */
  border: 0; border-radius: 16px; background: #100b24; }
@media (max-width: 760px) {           /* telemóvel: jogo de ponta a ponta */
  .game-slot { padding: 0; }
  .game-slot iframe { --game-bottom-gap: 0px; border-radius: 0; }
}
```

[ui/embed.js](ui/embed.js) faz o iframe ocupar exatamente o espaço **visível** entre o fundo do menu e o fundo do ecrã, e acompanha redimensionar a janela, rodar o telemóvel, a barra do browser móvel e mudanças de altura do menu. Não é preciso saber a altura do menu: mede a posição real do iframe. `data-bottom-gap` aceita um número em px, `css` (lê `--game-bottom-gap`, para margens diferentes por ecrã) ou `margin` (igual à margem superior do elemento pai). Também pode ser usado por código: `import { fitGameFrame } from '.../ui/embed.js'; fitGameFrame(iframe, { bottomGap: 16 })`.

A página do site não deve ter scroll vertical enquanto o jogo está aberto (por exemplo `body { overflow: hidden }` nessa página), para o jogo ficar sempre inteiro à vista.

## O que o jogo faz sozinho dentro do iframe

- Escolhe o desenho pela forma do espaço: **computador** (o desenho aprovado), **compacto** (espaço baixo e largo, ex.: 1366×768 com menu, telemóvel na horizontal) ou **vertical** (telemóvel ao alto, janelas estreitas). Escala tudo por igual, sem deformar símbolos e sem scroll.
- Escala máxima 1,6× (ecrãs enormes ficam centrados); textos pequenos são reforçados quando o jogo encolhe.
- Ecrã inteiro pelo botão do próprio jogo (o iframe precisa de `allow="fullscreen"` e `allowfullscreen`). No iPhone o Safari não permite e o botão esconde-se.
- O som só arranca depois do primeiro toque do jogador (regra dos browsers); `allow="autoplay"` ajuda nos browsers que o respeitam.

Medido com o cabeçalho de 86 px: 1920×1080 → desenho de computador a 96%; 1366×768 → compacto a 92%; iPhone 14 → vertical a 80%. Sem scroll em nenhum.

## Ficheiros a publicar

```
game.html
ui/            (todo: js, css, art/, audio/, fonts/; ui/embed.js inclui-se)
src/           (motor: config.js, engine.js, random.js, simulation.js, index.js)
```

Não são precisos no site: `scripts/`, `tests/`, `audio-lab/`, `audio-lab.html`, `pc.html`, `telemovel.html`, `site.html`, `index.html`, `ASSETS/`, `docs/`, `relatorios/`, `ui/audio/music/*.full.opus`, `ui/preview.*`, `ui/site.css`, `ui/audio-lab.*`, `.env`.

## Cabeçalhos HTTP e segurança

- O jogo usa só ficheiros da sua própria origem (nenhum pedido externo). A política de segurança do servidor local é `default-src 'self'` sem scripts nem estilos inline; o servidor do site pode usar a mesma.
- Se o jogo for servido noutra origem (outro domínio/subdomínio) do site, essa origem tem de permitir ser incorporada pelo site: `Content-Security-Policy: frame-ancestors https://<domínio-do-site>` (e não enviar `X-Frame-Options: DENY`). Na mesma origem, `frame-ancestors 'self'` chega.
- Tipos MIME necessários: `.webp` → `image/webp`, `.opus` → `audio/ogg`, `.mp3` → `audio/mpeg`, `.woff2` → `font/woff2`, `.json` → `application/json`. A arte publicada é WebP; os `ui/art/*.png` são só fonte e não precisam de ser publicados.

## Saldo, apostas e contas (importante)

**No casino do Peladinhas Cards** o jogo usa o saldo Djabucoin do jogador, com as mesmas regras da Rift Core Overdrive:

- O casino abre `assets/games/princesa-sofia/game.html?wallet=host&parentOrigin=<site>` (`js/casino-sofia-host.js`). Com estes parâmetros o jogo usa `HostSession` (`ui/session.js`) em vez de `TestSession` e só apresenta.
- O motor corre no site, dentro da carteira local partilhada do casino (`js/casino-sofia-local.js` + `sofiaRequest` em `js/casino-local-wallet.js`). Pedidos `connect`, `start` e `step` por `postMessage` (canal `princesa-sofia:v1`), cada um com id e recibo idempotente.
- A entrada (spin, Hunt 4× ou compra) é debitada uma vez no `start`; o prémio é creditado quando o último passo é entregue. O resultado da jogada fica fixo no início; a carteira guarda só o estado do gerador e o passo atual e reconstrói cada passo com o mesmo motor.
- Fechar ou recarregar a meio não perde nada: ao voltar, o jogo retoma no passo confirmado. Enquanto há uma jogada da Sofia por concluir, o casino não deixa abrir outro jogo. Se a matemática mudar entre versões, a jogada pendente é liquidada com o resultado guardado.
- Totais gastos/ganhos sincronizam com o servidor (`casinoSession`) como os restantes jogos: no fim de cada bónus e a cada 15 spins normais.
- O jogo publica o saldo apresentado em `html[data-casino-balance]`, retido até à contagem final, para o cabeçalho do casino não mostrar o prémio antes do tempo.
- Build: `node scripts/build-casino-sofia.mjs` (incluído em `npm.cmd run build:casino`); testes: `npm.cmd run test:casino:sofia`.

**Fora do casino** (páginas de pré-visualização) continua a usar créditos locais de teste (10 000 DJC que reiniciam ao recarregar) com o gerador reprodutível Mulberry32, que não é um gerador para dinheiro real. O RTP medido ainda não está certificado (ver `docs/matematica.md`).

## Latência e ritmo (para o lado do site)

O jogo esconde a latência da carteira assim:

- **Passo seguinte antecipado:** enquanto apresenta o passo *n*, o `HostSession` já pede o passo *n+1* (mesmo id idempotente `roundId-index`). Nos bónus, a latência deixa de se somar a cada free spin. Consequência: o último passo pode ser entregue (e o prémio creditado) um pouco antes de a animação terminar; o saldo mostrado continua retido até à contagem final.
- **`withFirstStep` no `start` (já implementado em `js/casino-local-wallet.js`):** o pedido `start` leva `withFirstStep: true`. Se o site responder com `firstStep` (exatamente a resposta que daria a `step` com `index: 0`, guardada como recibo desse id), o jogo poupa uma ida e volta por spin. Um site que ignore o campo continua a funcionar como antes.
- **As respostas a `start`/`step` não devem esperar pela rede.** A sincronização com o servidor (`casinoSession`) deve correr em segundo plano; se a resposta ao `step` esperar por ela, cada spin fica com esse atraso.

Medido com uma carteira simulada a 150 ms por resposta, em Ultra: o spin base passou de +300 ms para +60 ms de atraso, e num bónus comprado a latência deixou de acrescentar tempo (antes +1,9 s).

### Diagnóstico no site real

Painel de desempenho do jogo (FPS, tarefas longas e tempo de resposta da carteira por pedido): na consola do site, `localStorage.setItem('sofia-perf', '1')` e recarregar; para desligar, `localStorage.removeItem('sofia-perf')`. Fora do casino também funciona com `game.html?perf=1`. Os mesmos números ficam em `window.sofiaPerf` dentro do iframe.

O jogo corre num iframe da **mesma origem** que o site, por isso partilha o fio principal com a página do casino: trabalho pesado do site (listeners, animações, `backdrop-filter`) também faz a slot perder frames.
