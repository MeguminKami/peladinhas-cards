# Matemática — configuração atual `sofia-entry-clusters-balanced-hunt-v33`

Fonte executável: [src/config.js](../src/config.js) (validada e congelada pelo motor em [src/engine.js](../src/engine.js)). O contrato fixado pelo dono do jogo está em [AGENTS.md](../AGENTS.md) e prevalece sobre este resumo. `calibrated: false`: os RTP abaixo são medições locais, não certificação.

## Grelha, grupos e pagamentos

- Grelha de 6 colunas × 5 linhas. Paga um grupo de pelo menos 5 símbolos iguais ligados na horizontal ou vertical; os W substituem símbolos normais e premium.
- Cascatas: os grupos pagam, desaparecem e caem símbolos novos até não haver grupos. Prémio máximo 10 000× por jogada completa (bónus incluído).
- Tabela única para todos os modos, em × a aposta base, antes dos multiplicadores:

| Símbolo | Peso | 5 | 6–7 | 8–10 | 11–14 | 15–17 | 18+ |
| --- | --- | --- | --- | --- | --- | --- | --- |
| N1 Folha encantada | 15,5% | 0,1× | 0,2× | 0,5× | 1× | 2× | 5× |
| N2 Laço de seda | 13,7% | 0,1× | 0,2× | 0,5× | 1× | 2× | 5× |
| N3 Lua dourada | 12,1% | 0,1× | 0,2× | 0,5× | 1× | 2× | 10× |
| N4 Coração rubi | 11,9% | 0,2× | 0,4× | 0,7× | 1,5× | 3× | 10× |
| N5 Cristal de aurora | 10,3% | 0,2× | 0,4× | 0,7× | 1,5× | 3× | 10× |
| P1 Miffy 2 | 9,5% | 0,5× | 0,8× | 1,5× | 3× | 10× | 50× |
| P2 Miffy 1 | 8,5% | 0,5× | 0,8× | 1,5× | 3× | 10× | 50× |
| P3 Misty | 8% | 0,8× | 1,2× | 2,5× | 5× | 15× | 75× |
| P4 Príncipe João | 6,5% | 0,8× | 1,2× | 2,5× | 5× | 15× | 100× |
| P5 Princesa Sofia | 4% | 1× | 1,5× | 5× | 10× | 25× | 150× |

- Cópias vizinhas (formação de grupos): par 70% normais / 45% premium; repetição 45%; cópias extra normais 18% / 5% / 1%, premium 10% / 4% / 1%. No jogo normal e Hunt, cada passo de cópia usa 80% do valor dos bónus.

## Multiplicadores e magia

- Nos bónus cada W tem o seu multiplicador e guarda-o até sair; os W do mesmo grupo somam-se (2× + 3× = 5×). No jogo normal os W não têm multiplicador.
- XP por grupo (só símbolos regulares; menos de 5 regulares dão 0): normais 3/5/7/9/11/13, premium 5/7/9/11/13/15 para 5 / 6–7 / 8–10 / 11–14 / 15–17 / 18+.
- Barra cheia → magia: coloca W antes de procurar novos grupos; no máximo 10 W ao mesmo tempo (incluindo os que já estão); o excesso de XP perde-se.

| Modo | Barra | 1.ª magia | Cada barra seguinte |
| --- | --- | --- | --- |
| Jogo normal / Hunt | 40 XP | 1 a 3 W (50% / 35% / 15%) | sem multiplicador |
| Jardim Encantado | 18 XP | 2 W de 1× | +1 W e +1× |
| Baile ao Luar | 17 XP | 2 W de 2× | +1 W e +2× |
| Coroa da Aurora | 18 XP | 2 W de 2× | +2 W; multiplicador +2 / +3 alternado |

Com 10 W no tabuleiro só o multiplicador continua a crescer.

## Flores (Scatter), bónus e compras

- As flores contam em qualquer posição, no fim de todas as cascatas. 3 / 4 / 5 flores abrem Jardim Encantado / Baile ao Luar / Coroa da Aurora, com 12 spins grátis.
- Nos bónus: 2 flores dão +2 spins, 3 dão +4 (máximo 3 flores).
- Probabilidade condicional de cada flor por posição sorteada (1.ª, 2.ª, …):

| Modo | Probabilidades |
| --- | --- |
| Jogo normal | 3,01% · 2,01% · 0,61% · 0,15% · 0,04% |
| Jardim Encantado | 1,8% · 0,18% · 2,3% |
| Baile ao Luar | 1,8% · 0,18% · 2,1% |
| Coroa da Aurora | 1,8% · 0,127% · 1,8% |

- **Bonus Hunt:** cada spin custa 4× a aposta e multiplica por 2,09 as probabilidades das flores no spin de entrada e nas suas cascatas (não dentro dos bónus). Prémios sobre a aposta base.
- **Compras:** Jardim Encantado 95×, Baile ao Luar 237×, Coroa da Aurora 754× (limites do contrato: 80–100×, 200–250×, até 800×).

## RTP medido (v33)

Reproduzir: `npm.cmd run validate:rtp` (100 000 entradas base, 100 000 Hunt e 10 000 compras de cada bónus) e `npm.cmd run validate:rtp -- --large` (1 000 000 base e Hunt). Relatórios em [relatorios/](../relatorios/).

| Modo | Entradas | RTP observado |
| --- | --- | --- |
| Jogo normal | 100 000 | 95,845% |
| Bonus Hunt | 100 000 | 98,163% |
| Jardim Encantado (compra) | 10 000 | 96,722% |
| Baile ao Luar (compra) | 10 000 | 96,861% |
| Coroa da Aurora (compra) | 10 000 | 104,876% |
| Jogo normal — amostra alargada, outras seeds | 1 000 000 | 101,674% |
| Bonus Hunt — amostra alargada, outras seeds | 1 000 000 | 98,588% |
| Jogo normal — agregado de 2 milhões | 2 000 000 | 97,469% |
| Bonus Hunt — agregado de 2 milhões | 2 000 000 | 98,375% |

Meta de calibração: 96%–98% por modo. Pendentes conhecidos: a Coroa da Aurora mediu 104,9% na amostra de 10 000 compras (variância alta: prémios raros muito grandes); o jogo normal varia bastante entre amostras de 100 000. Nenhum destes números é certificação: as seeds foram usadas durante a calibração. Para dinheiro real é preciso validação independente com um gerador adequado no servidor.
