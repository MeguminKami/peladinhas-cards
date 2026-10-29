# RIFT//CORE — rift-4.16

Implementação e testes locais: **2026-10-29**. Sem leituras cloud ou deploy.

Cada Scatter acima de 3 num retrigger acrescenta 2 FS ao prémio base do bónus.

| Scatters | CORE | RIFT | OVERDRIVE |
|---|---:|---:|---:|
| 3 | +4 FS | +5 FS | +6 FS |
| 4 | +6 FS | +7 FS | +8 FS |
| 5 | +8 FS | +9 FS | +10 FS |
| 6 | +10 FS | +11 FS | +12 FS |

O total atribuído na ronda continua limitado a 40 FS. A atribuição é truncada ao espaço disponível. Dois Scatters não dão retrigger. Probabilidades dos Scatters, pagamentos, preços e entradas dos bónus mantêm-se.

O motor do navegador e o adaptador Node gerado aplicam a mesma fórmula. Rondas locais já iniciadas na versão 4.15 continuam pelo motor arquivado. O serviço Node de exemplo mantém o bloqueio de rondas de outras versões; a migração destas sessões exige tratamento pelo host antes da atualização.

Testes: `node --test tests/retrigger.test.mjs tests/scatters.test.mjs tests/ways.test.mjs` (74 aprovados). Cobertura dos três modos, 2 a 6 Scatters, limite de 40 FS e compatibilidade de rondas locais 4.15.

Esta alteração aumenta os FS esperados dos retriggers de 4 a 6 Scatters. O [relatório 4.15](./RTP-v4.15.md) é histórico; o RTP da versão 4.16 ainda não foi medido nem validado. Não usar o alvo configurado de 96% como resultado medido.

Publicação no site: `npm.cmd run deploy:frontend` na raiz do projeto. Não há função Firebase que importe estes módulos no código atual. Um host externo que use o adaptador Node deve atualizar também o motor, configuração e arquivos de versões importados.
