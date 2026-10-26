# Proposta de calibração da progressão · 26/10/2026

Proposta para discussão, sem alteração das regras da aplicação. Simulações locais, sem leituras cloud. O ensaio está em [`simulate-progression-proposal.mjs`](../../scripts/simulate-progression-proposal.mjs); não é importado pelo frontend nem pelas Functions.

## Nota relativa

Substituir o bloqueio abrupto a −0,5 por um multiplicador contínuo sobre a componente de desempenho, sem apagar a componente de golos/assistências:

| Diferença para colegas, na mesma dimensão | Parcela de melhoria de desempenho conservada |
| --- | ---: |
| Até 0,75 estrelas abaixo | 100% |
| 1 estrela abaixo | 85% |
| 1,5 estrelas abaixo | 50% |
| 2 ou mais abaixo | 25% |

Interpolar entre pontos. Uma nota absoluta boa, a partir de 3,5, deve conservar pelo menos 75% da componente de desempenho: pertencer a uma equipa excelente não deve transformar um bom jogo num mau jogo. A nota absoluta baixa também precisa de redução gradual própria; o protótipo usa fator entre zero a 1,5 estrelas e um a 2,8, sem atribuir automaticamente crescimento por vencer. São parâmetros experimentais, sem fundamento estatístico validado nesta liga.

Para evitar penalizar várias vezes a mesma comparação, ensaiar a nota absoluta com peso dominante: coeficientes 0,85 para nota−3, 0,10 para diferença dos colegas e 0,05 para diferença adversária. Limitar os desvios relativos usados nessa soma a ±1 estrela. Estes coeficientes e o multiplicador devem ser calibrados em conjunto; não são uma versão final aprovada.

## Contribuições decisivas

Curva experimental, aplicada separadamente a golos/finalização e assistências/passe:

| Quantidade | Bónus antes do patamar do atributo |
| --- | ---: |
| 0 | 0 |
| 1 | +0,30 |
| 2 | +0,35 |
| 3 | +0,40 |
| 4 | +0,60 |
| 5 | +0,80 |
| 6 | +1,15 |
| 7 | +1,25 |
| 8 | +1,35 |
| 9 | +1,45 |
| 10 ou mais | +1,50 |

Não são pontos de OVR. O patamar reduz ganhos em atributos elevados. O ensaio atribui ainda 25% da soma dos dois bónus a drible, com teto +0,5 antes do patamar. Não distribuir automaticamente golos por todos os atributos nem aumentar defesa por marcar muito.

Reservar espaço para contribuições dentro do teto total é indispensável: a fórmula atual pode atingir o limite só com a nota, tornando vários golos adicionais indistinguíveis. Não basta aumentar a curva bruta. Bónus individuais devem depender da respetiva ação e de uma qualidade mínima, sem desaparecer apenas por a média dos colegas ser superior.

## Resultado do primeiro ensaio

Um cenário constante com nota 3,9, colegas 3,8, adversários 3,5, vitória, seis golos e uma assistência evolui de 60 para 71/80/90 OVR após 5/10/20 jogos. A partir de 80 chega a 87/90/94. É um cenário repetido extraordinário, não uma previsão para jogadores reais.

O primeiro ensaio reduz o ganho de finalização de Vitor de +3,50 para +2,555 e drible de +3,50 para +2,00375, mantendo o mesmo estado exato anterior ao jogo. Assim, **não está pronto para substituir o motor**: diferencia contribuições, mas reduz demasiado melhorias que já existiam. É necessário ajustar o orçamento entre nota e ações decisivas e comparar jogos normais, excelentes e fracos, em várias posições e patamares. A comparação sintética com o motor atual usa os valores iniciais do código; a comparação de Vitor usa os deltas calculados com a política real recolhida.

## Outros fatores a modelar em conjunto

- **Base comunitária:** estabilizar após a calibração inicial e definir como entram revisões futuras. Enquanto puder baixar livremente e reproduzir todo o histórico, pode absorver um excelente jogo.
- **Resultado:** deve modular a nota, sem garantir progressão ampla por uma vitória fraca nem impedir ganhos numa derrota excelente.
- **Margem:** manter influência limitada e evitar multiplicar excessivamente nota, resultado e golos pelo mesmo resultado folgado.
- **Patamares e tetos:** medir o efeito acumulado, incluindo o limiar 75/85/90, e distinguir pontos de atributo de pontos de OVR.
- **Posição e pesos:** uma mudança pode alterar o OVR e a progressão reproduzida; comparar também a evolução sem mudança de posição.
- **Recompensas:** mostrar pontos permanentes e bónus temporários separadamente; considerar limites por período antes de somar aos ganhos dos jogos.
- **Feedback tardio:** mostrar a que jogo pertence a mudança, em vez de a apresentar como desempenho da semana atual.
- **Confiança:** 1 voto e 7 votos não oferecem a mesma segurança. Não aumentar ganhos apenas por ter mais votos; avaliar mínimos e estabilização.
- **Apresentação:** discriminar base, jogos, recompensas e mudança de posição. A seta semanal isolada não explica a causa.

Antes de implementar, definir objetivos de progressão por patamar para jogos médios, bons e excecionais; verificar também contributos em derrotas, poucos votos, GR N/A e jogadores sem golos noutras posições. Mudanças de fórmula devem ter uma data de entrada em vigor, sem reinterpretar silenciosamente jogos antigos ou semanas fechadas.
