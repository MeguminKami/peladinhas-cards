# Especificação matemática — proposta 0.1

> Vigente: **0.9.4**, [Novos poderes e medições](PODERES_0_9_0.md). P1 Passe Curto até um P1 aleatório pelo caminho mais curto, sem multiplicador, P2 1–2 Wilds ortogonais 50/50, P3 origem fora da quota. Lendas: compra 450×, sticky 25%, Wilds 7%. As notas abaixo são históricas.

> Configuração vigente **0.6.0**: Bonus Hunt opcional, custo 3× e chances positivas de Scatters multiplicadas por 1,5 no jogo base. [Regras atuais](BONUS_HUNT_0_6_0.md). RTP atual não medido. Esta nota prevalece sobre as atualizações históricas abaixo.


> Configuração vigente: **0.5.1**. O Maestro sorteia P1/P2/P3/P4 com 25% cada, uma escolha partilhada por todas as ativações do spin. [Regra atual e migração](MAESTRO_0_5_1.md). RTP atual não medido; esta nota prevalece sobre as versões históricas abaixo.


> Atualização vigente: **0.5.0**. Três Scatters nos dois bónus atribuem +5 FS; contador de FS sob o global; festejo por clique ou 10 s. [Regras, frequência proposta e restauro](RETRIGGER_0_5_0.md). Esta atualização prevalece sobre as notas históricas abaixo. RTP atual não medido.
> Configuração atual: **0.4.0**, com global persistente entre FS da mesma ronda. RTP não medido nem recalibrado por pedido do utilizador. As medições 0.3.1 abaixo são históricas. Ver [ATUALIZACAO_0_4_0.md](ATUALIZACAO_0_4_0.md).
> Atualização de 24/10/2026: meta atual de 60–70%, alvo central 65%. A configuração ativa é a 0.3.1: P4 aditivo, P3 converte de 2 a 10 normais e P1 ×2 multiplica o global final nas linhas que usam esse wild. Fatores fixos: base ×2,72, normal ×11,77 e superior ×3, aplicados antes do arredondamento e do teto. Roubo nas quatro direções. As referências a 96% e às médias correspondentes são históricas. Ver `DECISOES.md` e `../reports/RESUMO.md` para as medições versionadas.

Estado: desenho inicial para discussão e futura simulação. Todos os pesos, probabilidades e pagamentos abaixo são parâmetros propostos, não uma matemática já calibrada. RTP pretendido: aproximadamente 96%; máximo por ronda: 10 000 vezes a aposta de referência.

## 1. Requisitos e interpretações

- Grelha de 4 linhas por 6 colunas, 24 posições.
- Oito símbolos pagadores: N1–N4 normais, P1–P4 premium. Wild W e scatter S são adicionais: dez tipos no total.
- Linhas pagam da esquerda para a direita, começando na primeira coluna, com 3 a 6 símbolos consecutivos.
- O wild substitui qualquer pagador; nunca substitui scatter.
- Roubo de poderes quando um premium está imediatamente acima, abaixo, à esquerda ou à direita do wild. Não existem diagonais nem ligação entre margens.
- Scatter pode aparecer em qualquer coluna. Três iniciam 10 free spins normais; quatro iniciam 10 free spins superiores (a duração do superior é uma proposta).
- Compra normal: 90× a aposta; compra superior: 220× a aposta. Interpreta-se 220× como preço de compra, não prémio por quatro scatters.
- Interpreta-se a aposta mínima como 0,20 unidades de crédito, não 0,002 unidades. Escada proposta: 0,20; 0,40; 0,60; 0,80; 1; 1,50; 2; 3; 4; 5; 7,50; 10. Confirmar se “0.2c” pretendia literalmente 0,2 cêntimos.
- Cada aposta é o custo total de uma jogada. Não é necessário multiplicá-la pelo número de linhas.

## 2. Linhas fixas

Propõem-se 40 linhas, todas ativas. Numerar linhas da grelha de 1 (topo) a 4 (fundo); cada sequência indica uma linha por coluna. O conjunto é explícito, sem duplicados, com simetria vertical:

```text
01 111111    02 444444
03 222222    04 333333
05 123432    06 432123
07 234321    08 321234
09 112211    10 443344
11 223322    12 332233
13 122221    14 433334
15 233332    16 322223
17 123321    18 432234
19 234432    20 321123
21 121212    22 434343
23 232323    24 323232
25 212121    26 343434
27 112233    28 443322
29 332211    30 223344
31 122334    32 433221
33 211223    34 344332
35 123444    36 432111
37 111234    38 444321
39 222333    40 333222
```

Cada linha paga apenas a sua melhor combinação, com desempate por maior comprimento e depois pela ordem N1…P4. Linhas diferentes somam, mesmo partilhando posições. Não há pagamento da direita para a esquerda, clusters, cascatas ou pagamento por apenas dois símbolos.

## 3. Tabela de pagamentos inicial

Valores em múltiplos da aposta TOTAL por linha vencedora; não dividir novamente por 40. Valores são conservadores para permitir a soma de linhas e os poderes, mas exigem calibração.

| Símbolo | 3 iguais | 4 iguais | 5 iguais | 6 iguais |
|---|---:|---:|---:|---:|
| N1 | 0,03× | 0,10× | 0,30× | 1× |
| N2 | 0,04× | 0,12× | 0,40× | 1,40× |
| N3 | 0,05× | 0,16× | 0,55× | 2× |
| N4 | 0,06× | 0,20× | 0,75× | 3× |
| P1 | 0,10× | 0,40× | 1,50× | 6× |
| P2 | 0,12× | 0,50× | 2× | 8× |
| P3 | 0,15× | 0,70× | 3× | 12× |
| P4 | 0,20× | 1× | 5× | 20× |

Avaliar todos os símbolos candidatos para resolver wilds na abertura da linha; escolher o prémio final mais alto. Uma linha só de wilds usa a tabela P4. Scatter interrompe qualquer linha e não tem pagamento próprio.

## 4. Geração de símbolos

Primeiro colocar scatters; nas restantes posições sortear símbolos independentemente pelos pesos abaixo. Estes são pesos relativos condicionados à posição estar disponível, não percentagens absolutas da grelha. Sem tiras de rolos nesta versão.

| Símbolo | Base | Free spins normais | Free spins superiores |
|---|---:|---:|---:|
| N1 | 240 | 240 | 240 |
| N2 | 215 | 215 | 215 |
| N3 | 185 | 185 | 185 |
| N4 | 155 | 155 | 155 |
| P1 | 80 | 80 | 80 |
| P2 | 55 | 55 | 55 |
| P3 | 35 | 35 | 35 |
| P4 | 20 | 20 | 20 |
| W | 15 | 45 | 55 |
| Total | 1 000 | 1 030 | 1 040 |

Assim, no jogo base: wild 1,5%; premiums somados 19%; normais somados 79,5%, antes dos scatters. Nos free spins: wild cerca de 4,37% ou 5,29% por posição livre, respetivamente.

### Scatters no jogo base

Sortear a quantidade primeiro:

| Quantidade | Probabilidade proposta |
|---|---:|
| 0 | 75% |
| 1 | 20% |
| 2 | 4,65% |
| 3 | 0,32% |
| 4 | 0,03% |

Escolher uniformemente essa quantidade de colunas distintas entre as seis; escolher uma linha uniforme em cada coluna. Máximo de um scatter por coluna e quatro no tabuleiro. Frequência inicial de qualquer bónus: 0,35%, aproximadamente 1 em 285,7 jogadas. Três: 1 em 312,5; quatro: 1 em 3 333,3. Estes valores são consequências deste sorteio proposto, não medições.

Os scatters são símbolos efetivamente gerados e o bónus resulta da sua contagem; nunca gerar um prémio monetário alvo. É uma escolha de modelo usar uma distribuição explícita de contagens, em vez de scatters independentes ou tiras de rolos.

## 5. Roubo de poderes

Cada wild novo pode tentar roubar um poder uma vez por spin. Inspecionar os premiums adjacentes no tabuleiro original desse spin; se houver vários, escolher um uniformemente. Premiums não são consumidos. Um premium pode fornecer poder a vários wilds.

| Modo | Chance de roubo havendo vizinho elegível |
|---|---:|
| Base | 12% |
| Free spins normais | 35% |
| Free spins superiores | 100% |

Garantia no superior significa roubar sempre que existe premium elegível numa das quatro direções. Sem premium adjacente, não existe poder para roubar. Gerar um premium artificial para cumprir uma garantia seria outra regra, não incluída aqui.

Cada wild recebe no máximo um poder. Roubo não altera o sorteio do prémio nem cria efeitos recursivos.

| Fonte | Poder proposto | Regra exata |
|---|---|---|
| P1 | Amplificação | O wild passa a ×2 nas linhas que o utilizem; esse fator multiplica o global final. Exemplo: linha × wild ×2 × global ×5 = linha ×10. Não soma ao global. |
| P2 | Expansão | Converte a posição imediatamente acima e a imediatamente abaixo em wilds simples, se estiverem dentro da grelha e não forem scatters ou wilds. |
| P3 | Conversão | Sorteia uniformemente uma quantidade inteira entre 2 e 10 e converte essa quantidade de posições normais num premium sorteado uniformemente entre P1/P2/P3/P4 (25% cada), com a mesma escolha para todas as ativações do spin, escolhidas sem reposição. Se houver menos posições elegíveis, converte as existentes. |
| P4 | Sobrecarga aditiva | Soma +2, +3 ou +5 ao multiplicador global do spin, com probabilidades de 75%, 23% e 2%. O global começa em ×1. |

### Ordem e sobreposição

1. Fixar o tabuleiro inicial e contar scatters.
2. Decidir roubos de todos os wilds originais sobre esse mesmo tabuleiro, em ordem de linha e depois coluna.
3. Aplicar expansões P2; posições já wild permanecem wild e conservam os atributos existentes.
4. Aplicar conversões P3 sobre normais ainda presentes; cada conversão vê as alterações anteriores.
5. Avaliar linhas, aplicar amplificação e depois multiplicador global.
6. Liquidar prémio, aplicar limite de ronda e preparar stickies do próximo spin.

Wilds criados por expansão não roubam, não ganham sticky e não voltam a expandir nesse spin. Só geram substituição.

Vários wilds P1 numa linha multiplicam os seus fatores, limitados a ×8 por linha. O fator só conta quando o wild integra a sequência paga. Os incrementos de todos os P4 somam ao global inicial ×1: por exemplo, +2 e +3 resultam em ×6. O global aplica-se ao total das linhas e não ao saldo acumulado do bónus.

## 6. Bónus

### Normal — três scatters / compra 90×

- 10 free spins, aposta de referência fixa na aposta que ativou ou comprou o bónus.
- Pesos da coluna de free spins normais e roubo a 35%.
- Sem sticky e sem novos scatters; sem reativações nesta primeira versão.
- Cada spin começa com uma grelha nova.

### Superior — quatro scatters / compra 220×

- 10 free spins, aposta de referência fixa.
- Pesos da coluna superior e roubo a 100% quando existe premium elegível.
- Cada wild sorteado diretamente tem 18% de chance de ficar sticky até terminar o bónus.
- A decisão de sticky ocorre uma única vez quando esse wild nasce, após o spin. Não se volta a tentar em cada spin se falhar.
- Sticky conserva a posição e a função de substituição; poderes roubados e multiplicadores duram apenas o spin em que foram obtidos.
- Em cada spin seguinte, o sticky pode roubar novamente a um premium elegível da nova grelha.
- Posições sticky não são novamente sorteadas. Sem scatters nem reativações.
- Sem limite artificial de quantidade de stickies: no máximo as 24 posições disponíveis.

### Compra

A compra desconta exatamente 90× ou 220× e entra diretamente no respetivo estado de bónus. Não concede pagamento de uma grelha de ativação. O bónus comprado usa as mesmas regras do natural. Não há prémio mínimo garantido; um bónus pode pagar zero.

## 7. RTP, preços e calibração

Metas separadas:

| Produto | Meta de RTP | Consequência para o retorno médio |
|---|---:|---|
| Compra normal | 96% | 86,40× por bónus de 90× |
| Compra superior | 96% | 211,20× por bónus de 220× |
| Jogo base incluindo bónus naturais | 96% | 0,96× por jogada paga |

Os retornos médios são metas, não garantias por sessão. A aposta inicial é custo, não uma parcela a acrescentar ao pagamento da tabela.

Com as frequências propostas e SE os bónus atingirem essas médias, a contribuição dos bónus naturais seria:

```text
normal:   0,0032 × 86,40 = 0,27648 = 27,648 pontos percentuais
superior: 0,0003 × 211,20 = 0,06336 =  6,336 pontos percentuais
total:                                 33,984 pontos percentuais
pagamentos do jogo base pretendidos:    62,016 pontos percentuais
RTP pretendido:                         96,000%
```

Esta conta é uma decomposição de expectativa antes de eventuais perdas por limite acumulado. O RTP final mede-se no fluxo completo, incluindo o teto de ronda e o pagamento da jogada de ativação. Não ajustar resultados depois de gerados para cumprir estes números.

Calibrar primeiro os dois bónus, depois o jogo base. Ajustar pesos, pagamentos e frequência/intensidade dos poderes por configuração, repetir simulações e validar o conjunto. As duas compras podem não atingir 96% com estes parâmetros iniciais; é precisamente isso que a simulação deve determinar.

Volatilidade pretendida: alta. Frequência indicativa de qualquer prémio em jogadas pagas: 25–35%, a validar. Registar separadamente pagamentos abaixo, iguais e acima da aposta; não descrever um retorno inferior à aposta como lucro.

## 8. Máximo, precisão e liquidação

- Máximo de 10 000× por ronda paga, incluindo pagamento de ativação e todos os free spins derivados.
- Numa compra, teto de 10 000× a aposta de referência, não 10 000× o preço da compra.
- Atingido o teto, pagar apenas o restante e terminar a ronda/bónus. O limite faz parte do cálculo de RTP.
- Usar unidades monetárias mínimas inteiras e multiplicadores exatos. Somar pagamentos fracionários numa representação racional ou de ponto fixo comum; arredondar para baixo apenas o total a liquidar de cada spin. Nunca arredondar linha a linha.
- A simulação deve reproduzir o arredondamento para cada aposta da escada; o seu impacto pode ser relevante na aposta mínima.
- O teto é uma regra, não prova de que 10 000× seja alcançável ou tenha uma frequência aceitável. Verificar alcançabilidade e medir a cauda.

## 9. Plano de simulação

1. Implementar avaliador e poderes com tabuleiros manuais; validar ausência de duplicados nas linhas, limites e casos de wilds.
2. Executar uma primeira amostra de 1 milhão de jogadas base e 100 mil de cada bónus para encontrar erros e desvios grandes.
3. Calibrar em lotes maiores: pelo menos 10 milhões de jogadas base e 1 milhão de cada bónus, repartidos por seeds.
4. Validar a configuração candidata com amostras independentes; aumentar até o intervalo de confiança ser suficientemente estreito. Esses números de spins não garantem precisão para uma distribuição com prémios raros.
5. Relatar média, desvio, intervalo de confiança de 95%, frequência de prémios, lucro líquido, scatters, roubos por poder, stickies, duração e quantis dos bónus.
6. Medir frequência de teto, maior prémio observado e faixas de retorno: zero, até 1×, 1–5×, 5–20×, 20–100×, 100–500×, 500–2 000× e 2 000–10 000×, com fronteiras sem sobreposição na implementação.
7. Guardar versão de configuração, seed, quantidade de amostras, soma apostada e paga e estado de aleatoriedade para reprodução.

## 10. Decisões pendentes de validação pelo utilizador

- Confirmar aposta mínima de 0,20 créditos e escada proposta.
- Confirmar linhas fixas em vez de sistema de ways.
- Direções de roubo confirmadas: cima, baixo, esquerda e direita.
- Confirmar 10 free spins também no bónus superior e ausência de reativações.
- Rever os quatro poderes após as primeiras distribuições simuladas; esta versão privilegia regras explícitas e sem cadeias recursivas.
