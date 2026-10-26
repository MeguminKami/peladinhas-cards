# Roleta Europeia 3D

Jogo independente em português, com demonstração local e integração com saldo do website, sem nome ou símbolo de moeda.

## Executar

Node.js 22.12+ e npm. No PowerShell: npm.cmd install, npm.cmd run dev. Abrir o URL que o Vite indicar.

## Validar

- npm.cmd test: testes próprios do motor.
- npm.cmd run check: TypeScript.
- npm.cmd run build: standalone e SDK.

Servir dist/ por HTTP(S) numa subpasta própria; base relativo. Não abrir com file://. O SDK é dist/sdk/roleta.js com CSS correspondente e chunk Three.js. Ver INTEGRAR_COM_AI.md para carteira, idempotência e host.

REGRAS.md define a variante. ASSETS.json e THIRD_PARTY_NOTICES.txt documentam os recursos. reports contém simulações de 100 mil rondas em três seeds e limites de validação. As medições headless não certificam 60 FPS no dispositivo final. Não foi publicado externamente.

CLI: npx.cmd tsx tools/cli.ts

Simulador: npx.cmd tsx tools/simulate.ts 100000

Host de demonstração: servir host-exemplo.html pela mesma origem. O saldo do host demo é fictício e fica apenas neste browser.

Roleta premium: logótipo centrado, fontes locais e botões bordô/dourado. Escolher ficha e apostar diretamente no tapete, com junções canónicas e seletor acessível. Reset limpa toda a mesa, Desfazer recupera a última alteração global; Repetir/Dobrar são atómicos e Jogar inicia a ronda. Fichas/controlos integrados no tapete, com combinações em Apostas no topo e uma ficha física de total exato por posição (50+50=100). Número só anunciado depois da bola assentar, seguido de recolha/perdas e pagamento 3D automático, sem confirmar resultado nem novo spin automático. Nove fichas 0,20/0,50/1/5/10/25/50/100/500, saldo ao lado, mínimo 0,20 e passo 0,10. A variante mantém 37 casas e pagamentos europeus. Ver reports/ROULETTE_PREMIUM.md.

Website principal: usar host-website.html com window.ATELIER_WEBSITE e os endpoints autenticados do site. O SDK exporta createHttpWallet; mode integrado exige carteira e playerId. Saldo sem nome/símbolo, escala 100, sem fundos locais de fallback. Ver INTEGRAR_COM_AI.md e reports/WEBSITE_INTEGRATION.md.
