# Matemática de GANZÁ

## Contrato

Versão atual `ganza-v2`, 12 tabelas, para 8, 12 e 16 linhas e quatro volatilidades. O percurso é criado antes da apresentação. Em cada linha usa-se um bit equiprovável do gerador determinístico. A lancha k é a soma das direitas e tem probabilidade C(n,k)/2^n. Não se sorteia um prémio nem se consultam saldo ou histórico.

Os multiplicadores estão em centésimos inteiros em [tabelas](../tabelas/index.js). A enumeração exata é a soma de C(n,k) × valor[k], dividida por 2^n. Nesta unidade o resultado é diretamente a percentagem de RTP, próxima de 99. Os testes exigem 98,99–99,01%, simetria, crescimento não estrito do centro para as pontas e nenhum zero. Apenas 16 linhas, Extrema, tem pontas de 999 900 centésimos, ou 9 999×.

O motor recebe aposta em cêntimos de DJC e paga floor(aposta × valor / 100). A carteira aceita apostas inteiras de DJC, logo múltiplos de 100 cêntimos. Assim o pagamento é exato em cêntimos e não há redução do RTP por truncatura nas apostas públicas. O motor conserva a regra floor para verificar pedidos antigos e casos de fronteira.

## Curvas

Forma original antes da quantização: centro + (ponta − centro) × (distância normalizada ao centro)^p. O expoente p é resolvido por bisseção para RTP de 99%, sem simulação de calibração. Arredonda-se cada multiplicador a centésimos inteiros e corrige-se apenas o erro residual com os pesos binomiais, preservando simetria e ordem. O [gerador](../scripts/generate-tables.js) documenta o procedimento e as tabelas guardam p.

Centros: Baixa 0,50×, Média 0,42×, Alta 0,35×, Extrema 0,20×. Em 8 linhas, Alta tem pontas próximas de 64×. Pontas de 100× e centro 0,35× seriam incompatíveis com 99%, mesmo com os outros valores reduzidos ao centro. A nova Média interpola o perfil de risco entre Baixa e Alta.

## Aleatoriedade e prova

O motor usa uma seed textual e PRNG Mulberry32 inicializado por hash FNV-1a, sem dependências do browser. Mesma seed, pedido e versão dão o mesmo percurso e pagamento. A carteira cria a seed com crypto.getRandomValues. O compromisso SHA-256 é entregue antes da queda e a seed é revelada após liquidar. A prova mostra seed, versão, bits, lancha, aposta, multiplicador e pagamento.

É um jogo privado de créditos fictícios, com autoridade local no browser, seguindo a Sofia. O compromisso não transforma este modelo num serviço remoto inviolável. O PRNG não se apresenta como gerador criptográfico nem como certificação.

## Simulação e histórico

`npm.cmd run sim --prefix games/ganza`, na raiz, enumera todas as tabelas e joga 1 000 000 de bolas por tabela com o mesmo playRound. Grava seed, versão, RTP exato e simulado, IC95% normal aproximado, desvio padrão, maior ganho e frequências esperadas e observadas por lancha em [JSON](../relatorios/simulacao.json) e [CSV](../relatorios/simulacao.csv).

A amostra total é 12 milhões. A seed de validação `validacao-ganza-v2-20261106` não foi usada na construção das curvas. O intervalo é muito largo na Extrema, devido às pontas raras. A enumeração exata é a evidência matemática, a amostra descreve a corrida. Os números completos estão no [relatório](../RELATORIO.md).

| Versão | Mudança |
| --- | --- |
| ganza-v1 | Primeiras nove tabelas, três níveis de risco. Conservada para conferir provas antigas. |
| ganza-v2 | Pedido do dono, quatro volatilidades e 12 tabelas. O perfil antigo de alto passa a Extrema. Nova Média entre Baixa e Alta. |
