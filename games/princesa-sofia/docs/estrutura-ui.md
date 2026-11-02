# Estrutura da interface e responsividade

## Peças principais

| Ficheiro | Papel |
| --- | --- |
| [game.html](../game.html) | A slot: grelha 6×5, coluna lateral (magia, spins grátis, botão Bónus), barra de controlos, janelas (Bónus, Regras, Autoplay, avisos). Sprite de ícones SVG embutido. |
| [ui/app.js](../ui/app.js) | Apresentação: lê os eventos do motor um a um e anima-os; som; controlos; regras. Nunca sorteia nada. |
| [ui/session.js](../ui/session.js) | `TestSession`: saldo local de teste (10 000 DJC) e velocidades. Único ponto que movimenta saldo. |
| [ui/layout.js](../ui/layout.js) | Escolhe o desenho e escala o jogo inteiro para caber, sem scroll. |
| [ui/motion.js](../ui/motion.js) | Animações da grelha: spin com suspense de Scatters, cascatas, hits, magia, flores, compra. |
| [ui/presentation.js](../ui/presentation.js) | Ganhos (incluindo o cálculo com WILD), contagens, avisos, barra de XP. |
| [ui/embed.js](../ui/embed.js) | Para quem incorpora o jogo: o iframe ocupa o espaço visível por baixo do menu do site. Ver [INTEGRACAO.md](../INTEGRACAO.md). |
| CSS | `prototype.css` (base) → `theme.css` → `presentation.css` → `responsive.css` (desenhos) → `icons.css` (ícones e barras) → `rules.css` (painel de regras). |

## Regras fixas da interface

- Nunca há scroll, nem na slot nem na barra de controlos, em widget ou ecrã inteiro (ver [AGENTS.md](../AGENTS.md)). Em espaços pequenos o jogo encolhe por inteiro.
- As células nunca deformam os símbolos (imagens com `object-fit: contain`).

## Três desenhos

O jogo é escalado por inteiro (`transform: scale`) a partir de uma largura de referência; o desenho escolhe-se pela forma do espaço disponível.

| Desenho | Largura | Quando | Disposição |
| --- | --- | --- | --- |
| `landscape` | 1040 px | Computador e janelas normais | Coluna lateral, grelha, barra de controlos por baixo. Redimensionar escala tudo por igual; uma janela a 75% mantém este desenho. |
| `portrait` | 430 px, altura = forma do ecrã | Telemóvel ao alto, janelas estreitas ou quase quadradas em que fica maior | Logo e ecrã inteiro; faixa com WILDs, spins grátis e Bónus; grelha a toda a largura (as células crescem em altura até 0,9 de proporção quando sobra espaço); Saldo e Ganho grandes; Rodar ampliado com −/+; regras, som e velocidade em baixo. |
| `compact` | 1180 px | Espaço baixo e largo (telemóvel na horizontal, 1366×768 com o menu do site) — quando o desenho de computador ficaria abaixo de 70% | Grelha grande ao centro, controlos numa coluna à direita. |

- Escala máxima 1,6 (ecrãs enormes ficam centrados). Abaixo do tamanho de referência, os rótulos pequenos são reforçados (`--ui-boost`, até 1,75×) para ficarem com ~9 px reais.
- Toque: área invisível à volta dos botões pequenos que cresce quando o jogo encolhe (~40 px reais); sem zoom de duplo toque nem menu de toque longo.
- iOS/Android: `viewport-fit=cover` e margens seguras; `text-size-adjust: 100%`; ecrã inteiro com prefixo webkit, e o botão esconde-se onde não existe (Safari no iPhone).

## Ícones e botões

Sprite SVG em `game.html` (`#i-info`, `#i-sound`/`#i-sound-off`, `#i-expand`/`#i-collapse`, `#i-spin`, `#i-minus`, `#i-plus`, `#i-close`, `#i-chevron`), com um brilho de estrela de 4 pontas como assinatura. Botões redondos em pérola com aro rosa-dourado; barras deslizantes com trilho rosa até ao valor (`--fill`) e puxador de pérola. Volume em duas barras (Música e Efeitos) e silêncio geral; valores guardados no browser.

## Velocidades

Normal, Rápido e Ultra (`ui/session.js`). Dentro dos bónus o Rápido é um pouco mais lento (0,42 em vez de 0,32, constante `BONUS_FAST` em `ui/app.js`). Carregar no spin durante uma jogada salta as animações.

## Pré-visualizações

`npm.cmd run dev` e abrir `pc.html`, `telemovel.html` (molduras de aparelhos, rodar) ou `site.html` (o jogo por baixo do menu do site). O botão **Com menu do site** das pré-visualizações alterna entre o jogo sozinho e o jogo no site.

## Testes de browser

`npm.cmd run test:ui` (`tests/prototype.browser.js`), `node tests/art.browser.js` e `node tests/presentation.browser.js`. Usam o Playwright do repositório. Nota: o passo do saldo das demonstrações em `prototype.browser.js` e o passo da poeira de XP em `presentation.browser.js` já falhavam antes das revisões de novembro e precisam de ser revistos.
