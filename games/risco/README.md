# RISCO · LCD / The Glitch

Jogo de crash privado, créditos fictícios DJC e apresentação Acidwave. [Pedido](PROMPT.md), [contrato](AGENTS.md), [matemática](docs/MATEMATICA.md), [integração](INTEGRACAO.md) e [recursos](ASSETS.md).

Na raiz do projeto:

```powershell
npm.cmd test --prefix games/risco
npm.cmd run sim --prefix games/risco
npm.cmd run dev --prefix games/risco
```

Abre `http://127.0.0.1:4187/game.html`. Fora do casino, o saldo temporário reinicia em 10 000 DJC ao recarregar. No casino usa a carteira local partilhada da Princesa Sofia, com recibos e recuperação.

Pré-visualizações isoladas: `?demo=crash&m=3.47`, `?demo=instant` e `?demo=max`. Os parâmetros demo são ignorados no modo de carteira. O painel de verificação identifica resultados forçados.

Linha procedural Canvas, gráfico, partículas adaptativas, marcos, cashout, máximo e movimento reduzido. O HUD e os controlos ficam fora dos efeitos. Espaço permite sair quando o foco não está num campo ou botão.

Direção revista: o LCD cheira durante a subida e para no crash. A sucção é cortada imediatamente no estado público de crash, seguida por levantamento da cabeça, recuo e glitch. O módulo [choreography.js](ui/choreography.js) usa um atlas de 16 poses com rig contínuo, respiração e transições. A versão com manga de tatuagens de caveiras foi aprovada pelo dono com «Sim aprovo» e está integrada.

A [folha dos doze estados](art-src/lcd-states-approval.png) é o estudo inicial, substituído pela [versão tatuada aprovada](art-src/lcd-cocaine-tattoo-approval.png). O [atlas final](ui/art/lcd-cocaine-atlas.webp) está ativo no [manifesto](ui/art/character.json), com `approved: true`. As fontes e os estudos continuam fora da build.

`npm.cmd run promo` nesta pasta atualiza GIFs, MP4 e capa usando a personagem ativa no jogo. A opção `--preview-character` conserva a exportação privada a partir do atlas de estudo em art-src/character-preview. Não altera a carteira.

Os doze efeitos são síntese original pré-carregada em OGG Opus com fallback WAV, incluindo um loop de inalação que para no crash. A música sintetizada ao vivo é provisória, substituível pelas cinco faixas sincronizadas indicadas em [PROMPT-MUSICA.md](docs/PROMPT-MUSICA.md).

## Verificação local

```powershell
node scripts/build-casino-risco.mjs
node --test tests/casino-risco.test.js
node tests/risco-browser.mjs
npm.cmd run test:docs
```

O simulador grava [JSON](relatorios/sim.json) e [CSV](relatorios/sim.csv), com seed, versão, amostra e IC. Não se altera a distribuição para caber numa tolerância amostral. Os limites do RTP literal, cashout manual estrito e arredondamento de pagamentos estão na [matemática](docs/MATEMATICA.md).

Não houve acesso a Firebase real nem publicação. O modelo local não protege contra um jogador que altere o próprio browser.
