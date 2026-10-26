# Blackjack 3D

Jogo independente em português, com demonstração local e integração com saldo do website, sem nome ou símbolo de moeda.

## Executar

Node.js 22.12+ e npm. No PowerShell: npm.cmd install, npm.cmd run dev. Abrir o URL que o Vite indicar.

## Validar

- npm.cmd test: testes próprios do motor.
- npm.cmd run check: TypeScript.
- npm.cmd run build: standalone e SDK.

Servir dist/ por HTTP(S) numa subpasta própria; base relativo. Não abrir com file://. O SDK é dist/sdk/blackjack.js com CSS correspondente e chunk Three.js. Ver INTEGRAR_COM_AI.md para carteira, idempotência e host.

REGRAS.md define a variante. ASSETS.json e THIRD_PARTY_NOTICES.txt documentam os recursos. reports contém simulações de 100 mil rondas em três seeds e limites de validação. As medições headless não certificam 60 FPS no dispositivo final. Não foi publicado externamente.

CLI: npx.cmd tsx tools/cli.ts

Simulador: npx.cmd tsx tools/simulate.ts 100000

Host de demonstração: servir host-exemplo.html pela mesma origem. O saldo do host demo é fictício e fica apenas neste browser.

Interação: clicar no + do lugar livre para ocupar sem apostar. Selecionar ficha e clicar na zona de aposta desse lugar para a colocar. Clicar num avatar ocupado muda o foco. Desfazer/Limpar fichas atuam só no foco, mantendo os outros lugares intactos. Não existem botões +/−/× por lugar. O dealer recolhe/paga fichas 3D automaticamente, sem confirmar resumo.

Apresentação por eventos: carta e total do jogador visíveis antes de revelar/comprar cartas do dealer, sem expor o retorno antes da liquidação. Fichas 0,20/0,50/1/5/10/25/50/100/500, apenas com o valor inscrito. Saldo ao lado do seletor, logótipo centrado e botões bordô/dourado. Fontes locais Manrope/Cormorant em WOFF2, licenças em src/assets/fonts.

Website principal: usar host-website.html com window.ATELIER_WEBSITE e os endpoints autenticados do site. O SDK exporta createHttpWallet; mode integrado exige carteira e playerId. Saldo sem nome/símbolo, escala 100, sem fundos locais de fallback. Ver INTEGRAR_COM_AI.md e reports/WEBSITE_INTEGRATION.md.


## Totais nas fichas ? 2026-10-26

Cada aposta, m?o e seguro apresenta uma ficha Three.js com o total exato
na face. Por exemplo, tr?s fichas de 25 colocadas no lugar mostram 75,
em vez de deixar vis?vel apenas a denomina??o 25 do topo da pilha.
O mesmo construtor representa stakes, m?os divididas e retornos pagos.
A decomposi??o contabil?stica das denomina??es mant?m-se dispon?vel.
Materiais de totais que deixam a mesa s?o libertados.

Depois de compilar as duas mesas com `npm.cmd run build` nas respetivas
pastas, executar a partir de `games`:

```sh
node blackjack-3d/tests/chip-totals.mjs
```

O teste usa apenas SDKs locais e bloqueia rede externa. Verifica 75,
75,50 e 75,70, desfazer/limpar, e captura desktop e mobile nas duas mesas.
A roleta j? agregava o total por posi??o e n?o precisou de altera??o no
c?digo. Matem?tica e carteira n?o foram alteradas. Publica??o do site:
`npm.cmd run deploy:frontend`, na raiz; n?o foi executado deploy.
