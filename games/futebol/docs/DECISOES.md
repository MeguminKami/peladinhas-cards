# Decisões de implementação

- Aposta mínima interpretada como 0,20 créditos. 40 linhas fixas, 10 FS nos dois bónus e ausência de reativação seguem a proposta 0.1. O roubo inclui cima, baixo, esquerda e direita, conforme correção explícita do utilizador.
- Tabuleiros são listas planas em ordem de linha, com posições 0–23. Os números das linhas de pagamento apresentados ao utilizador começam em 1.
- Em cada wild original, escolher o vizinho premium antes do teste de roubo; mesmo havendo apenas um vizinho, consumir o sorteio de escolha. Depois decidir sucesso. Isto torna o consumo de RNG explícito.
- Todos os roubos usam o tabuleiro inicial. Aplicar P1, todas as expansões P2, todas as conversões P3 e finalmente sorteios P4, por ordem dos wilds. A ordem dos sorteios P4 não estava fixada no texto inicial; esta é a convenção reproduzível adotada.
- Premium roubado não é consumido. Não existe roubo recursivo, nem sticky de wild criado por expansão. Stickies existentes voltam a tentar roubar em cada FS superior, sem conservar poderes anteriores.
- Sortear sticky no fim do spin até no último FS; o registo mostra o evento, mas nenhum sticky persiste fora do bónus. `newSticky` mede aquisições sorteadas, não posições ativas no fim da ronda.
- `eligible` conta wilds com pelo menos um vizinho elegível, isto é, tentativas efetivas; `wilds` inclui também wilds sem vizinho. `success` conta roubos bem-sucedidos. `powers` conta ativações mesmo se a expansão/conversão não tiver alvos.
- Tabuleiros manuais são uma ferramenta de depuração, não um modelo de geração. Permitem testar situações extremas fora das restrições de sorteio, como muitos scatters.
- `spin` devolve o estado seguinte; `round` executa a ronda completa sem gerir uma carteira externa. Não existe persistência de saldo nem dinheiro real.
- Quantis aproximados são apresentados como faixas delimitadas do histograma; evita-se reter cada amostra e sugerir precisão inexistente.

## Mudança de objetivo solicitada em 24/10/2026

Após observar a primeira simulação, o utilizador pediu RTP entre 60% e 70%. Foi adotado alvo central de 65% para base e ambas as compras, substituindo a meta anterior de 96%.

A configuração 0.2.0 mantém preços, pesos, scatters, tabela relativa, poderes, stickies e duração. Introduz fatores públicos e estáticos por modo: base ×3, normal ×22 e superior ×19. São aplicados ao pagamento das linhas antes do arredondamento por spin e do teto. Isto altera a tabela efetiva por modo e deve ser apresentado nas futuras regras do jogo.

Estes fatores foram escolhidos a partir dos retornos medidos da versão inicial e validados por simulações, sem adaptar resultados individuais. Não constituem uma distribuição de prémios sorteados antecipadamente. A versão inicial e os relatórios foram preservados. A documentação histórica da proposta 0.1 continua em `MATEMATICA.md`; consultar primeiro a nota de versão no início desse ficheiro.

## Correção de adjacência — versão 0.2.1

O utilizador confirmou que a direita também é uma direção válida de roubo. A ordem de inspeção passa a cima, baixo, esquerda, direita, com escolha uniforme entre premiums elegíveis. As margens não se ligam. Os relatórios 0.2.0 são históricos e não validam esta mudança; a versão 0.2.1 é simulada separadamente.

## Recalibração após a direita — versão 0.2.2

A versão 0.2.1 mediu 68,7142% no base, 66,8639% no normal e 76,9606% no superior. Para respeitar a meta de 60–70%, a 0.2.2 mantém base ×3 e ajusta os fatores fixos para normal ×21,4 e superior ×16. Não muda probabilidades nem poderes. O fator fracionário é representado exatamente por 214 000 basis points, sem arredondamento intermédio.

## Novos poderes — versão 0.3.0

- P4 passa a somar +2/+3/+5, mantendo probabilidades 75%/23%/2%. O global começa em ×1; +2 e +3 produzem ×6. Não é o maior nem o produto das ativações.
- P3 sorteia uniformemente um inteiro de 2 a 10 (1/9 por quantidade), sem reposição de posições normais. Se houver menos normais que a quantidade pedida, converte os disponíveis. Continua a converter para P3, depois das expansões P2.
- P2 permanece igual.
- P1 mantém ×2 por wild, multiplicando o global final nas linhas em que participa. O utilizador confirmou o exemplo ×2 × global ×5 = ×10 sobre o valor da linha. Mantém-se o limite local anterior de ×8 por linha; o global é aplicado uma única vez, depois desse fator local. P1 não aumenta o global para linhas que não usem o wild.
- O RTP da 0.2.2 deixa de validar a configuração nova. Executar novas simulações e identificar separadamente os resultados. Uma sessão local de configuração antiga deve ser exportada/reposta, sem continuar a ronda com regras diferentes.

## Recalibração dos novos poderes — versão 0.3.1

Mantidos os fatores da 0.2.2, os novos poderes mediram na 0.3.0: base 104,3249%, normal 118,1255%, superior 335,6787% (1 milhão de rondas base e 100 mil compras de cada bónus). O superior atingiu o teto em 620 compras. Preservados os relatórios e a configuração em `reports/config-v030.json`.

A versão 0.3.1 ajusta apenas fatores estáticos para base ×2,72, normal ×11,77 e superior ×3 para procurar o intervalo de RTP pedido. Os poderes permanecem exatamente como definidos acima. Validar com seeds novas, incluindo os efeitos de arredondamento e teto, antes de publicar novas estimativas na GUI.
