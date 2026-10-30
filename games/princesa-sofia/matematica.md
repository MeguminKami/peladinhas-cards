# Matemática da Princesa Sofia

## Âmbito e estado

Formulação de desenvolvimento de 30 de outubro de 2026, baseada nas [regras da etapa 1](01-logica-mecanicas-rtp.md). O utilizador autorizou simulação e ajuste para RTP entre 98% e 100%, compras do comum entre 80× e 100×, super entre 200× e 240× e secret a partir de 300×. Interpretação de trabalho: 100 000 compras **de cada tipo**, além de 1 000 000 de jogadas base com todos os bónus que originem.

Alvo central proposto: 99% em cada um dos quatro modos. Os preços atuais em afinação são 80×, 225× e 316×. As tabelas de probabilidades, pagamentos e limiares da etapa 1 constituem a configuração inicial, incorporada no [motor](src/engine.js), não uma configuração calibrada. O [guia de execução](README.md) documenta testes, API e simulador.

## 1. Unidades e aposta

- `b`: aposta base, expressa em unidades inteiras de crédito; durante a análise usar `b = 1` como unidade normalizada.
- `Cj`: preço do bónus `j` em múltiplos de `b`. A compra custa `Cj × b`, uma única vez.
- `L = 12500`: pagamento máximo de uma jogada em múltiplos de `b`, inclusive numa compra. O teto de uma compra não é `12500 × Cj`.
- Pagamentos são retornos brutos. O lucro é `retorno - custo`; não descontar a aposta de cada prémio nem contar a devolução da aposta uma segunda vez.
- Guardar XP em centésimos inteiros, probabilidades em unidades por milhão e a tabela de prémios em centésimos da aposta. A menor probabilidade atual de scatter, 0,04%, corresponde a 400 por milhão.
- Proposta de liquidação: acumular a jogada em centésimos da aposta e só no fim converter para unidades de crédito, arredondando por defeito. Para aposta inteira `b` e pagamento normalizado inteiro `v` em centésimos, creditar `floor(b × v / 100)`. Validar também o RTP efetivo nas apostas mínimas disponíveis: o arredondamento pode reduzi-lo.
- Como a lista de apostas comerciais ainda não existe, os primeiros resultados devem declarar explicitamente que usam a unidade normalizada, sem arredondamento adicional de carteira.

## 2. Sorteio por posição e geração de pares

Para cada posição vazia visitada pela ordem de geração, seja `s` o número de scatters já existentes no spin e `m` o modo:

1. Gerar um número uniforme independente e testar `q[m,s]`, probabilidade do próximo scatter.
2. Se tiver sucesso, colocar scatter, incrementar `s` e avançar.
3. Se falhar, sortear um dos dez símbolos com pesos condicionais `w[i]`, cuja soma é 1.
4. Se for normal, testar a probabilidade de par de 0,20. Havendo vizinhas ortogonais livres, escolher uma uniformemente e colocar uma cópia. A cópia não desencadeia outro par.
5. Posições ocupadas por cópias são saltadas nos sorteios seguintes.

As escolhas de vizinha uniforme, cópias sem recursão, aplicação em cascatas e ordem de geração seguem a proposta técnica da etapa 1. A compactação por gravidade ocorre antes de gerar os símbolos de substituição; a geração percorre colunas da esquerda para a direita e os espaços livres de baixo para cima. As posições de cópias são posições finais do preenchimento, sem uma segunda compactação antes de avaliar os grupos.

Para uma posição que recebe sorteio próprio:

`P(scatter | m,s) = q[m,s]`

`P(símbolo i | m,s) = (1 - q[m,s]) × w[i]`

Os pesos iniciais de N1 a P5 são `18,16,14,12,10,9,7,6,5,3%`. As tabelas iniciais de `q` constam da etapa 1: base `3,01;2,01;0,655;0,15;0,04%` e bónus `3;1,2;0,3%`. Acima de cinco scatters no base ou três no bónus, `q = 0`.

A distribuição final da grelha não é independente: pares ocupam posições, scatters persistem e as cascatas acrescentam sorteios. As probabilidades de grupos ou bónus não se obtêm multiplicando simplesmente os pesos nem usando uma binomial de 30 células.

### Probabilidades efetivas por posição sorteada

As tabelas seguintes incluem o teste de scatter: cada coluna soma 100%. São probabilidades condicionadas pela contagem atual do tabuleiro no spin e aplicam-se também às novas posições sorteadas nas cascatas. Não representam a distribuição marginal de todas as células finais, porque as cópias dos pares não fazem um sorteio próprio.

Jogo base:

| Símbolo | 0 scatters | 1 scatter | 2 scatters | 3 scatters | 4 scatters | 5 scatters |
| --- | --- | --- | --- | --- | --- | --- |
| Scatter | 3,01% | 2,01% | 0,655% | 0,15% | 0,04% | 0% |
| N1 | 17,4582% | 17,6382% | 17,8821% | 17,973% | 17,9928% | 18% |
| N2 | 15,5184% | 15,6784% | 15,8952% | 15,976% | 15,9936% | 16% |
| N3 | 13,5786% | 13,7186% | 13,9083% | 13,979% | 13,9944% | 14% |
| N4 | 11,6388% | 11,7588% | 11,9214% | 11,982% | 11,9952% | 12% |
| N5 | 9,699% | 9,799% | 9,9345% | 9,985% | 9,996% | 10% |
| P1 | 8,7291% | 8,8191% | 8,94105% | 8,9865% | 8,9964% | 9% |
| P2 | 6,7893% | 6,8593% | 6,95415% | 6,9895% | 6,9972% | 7% |
| P3 | 5,8194% | 5,8794% | 5,9607% | 5,991% | 5,9976% | 6% |
| P4 | 4,8495% | 4,8995% | 4,96725% | 4,9925% | 4,998% | 5% |
| P5 | 2,9097% | 2,9397% | 2,98035% | 2,9955% | 2,9988% | 3% |

Qualquer bónus:

| Símbolo | 0 scatters | 1 scatter | 2 scatters | 3 scatters |
| --- | --- | --- | --- | --- |
| Scatter | 3% | 1,2% | 0,3% | 0% |
| N1 | 17,46% | 17,784% | 17,946% | 18% |
| N2 | 15,52% | 15,808% | 15,952% | 16% |
| N3 | 13,58% | 13,832% | 13,958% | 14% |
| N4 | 11,64% | 11,856% | 11,964% | 12% |
| N5 | 9,7% | 9,88% | 9,97% | 10% |
| P1 | 8,73% | 8,892% | 8,973% | 9% |
| P2 | 6,79% | 6,916% | 6,979% | 7% |
| P3 | 5,82% | 5,928% | 5,982% | 6% |
| P4 | 4,85% | 4,94% | 4,985% | 5% |
| P5 | 2,91% | 2,964% | 2,991% | 3% |

Exemplo: sem scatters no base, N1 tem `96,99% × 18% = 17,4582%` por sorteio próprio. Depois de três scatters, tem `99,85% × 18% = 17,973%`. O quarto scatter tem nessa altura 0,15%, sem multiplicar esse valor pelo peso de outro símbolo.

## 3. Grupos, prémios e multiplicadores

Para cada símbolo regular `i`, encontrar os componentes ortogonais usando exclusivamente posições desse símbolo e wilds. Exigir pelo menos um símbolo `i`. Deduplicar os componentes encontrados para esse símbolo. Um wild pode pertencer a componentes vencedores de símbolos diferentes; dentro do mesmo componente conta uma única vez.

Seja `n` o tamanho do componente. O escalão `t(n)` é:

| n | t(n) |
| --- | --- |
| Menos de 5 | Sem pagamento |
| 5 | 1 |
| 6–7 | 2 |
| 8–10 | 3 |
| 11–14 | 4 |
| 15–17 | 5 |
| 18–30 | 6 |

Seja `A[i,t]` o valor da tabela de pagamentos da etapa 1. Não interpolar dentro de um escalão.

- No base e no comum: `M(G) = 1`, independentemente do número de wilds sem multiplicador.
- No super e no secret: `M(G) = max(1, soma dos valores individuais dos wilds em G)`.
- Prémio normalizado do grupo: `V(G) = A[i,t(n)] × M(G)`.
- Exemplo: P3 com oito posições paga `12×`; wilds ×2 e ×3 no grupo dão `12 × (2+3) = 60×`.

Todos os grupos de uma avaliação são calculados sobre a mesma grelha antes de remover qualquer posição. Somar os prémios e remover a união das posições vencedoras; não remover um wild antes de avaliar os outros grupos que o partilhem.

Exceção confirmada: se todas as 30 posições forem wilds ou scatters, atribuir um único prémio `A[P5,6] × M`, com todos os wilds participantes. No base admite 25–30 wilds; no bónus, 27–30. Não exigir ligação entre componentes separados por scatters neste prémio especial e não o acumular com grupos regulares fictícios.

## 4. XP e ordem da cascata

Índice de raridade proposto `r[i] = 0..9`, de N1 a P5. XP do grupo:

`X(G) = n × (1 + 0,02 × r[i])`.

Em centésimos inteiros: `X100(G) = n × (100 + 2 × r[i])`. Wilds usados contam em `n`; o seu multiplicador não multiplica XP. Wild partilhado conta no XP de cada grupo em que participa. Para o prémio especial do ecrã, usar `r[P5] = 9` e contar apenas wilds.

Limiar atual `T`: base 39, comum 18,80, super 17,10 e secret 16,50 XP. Todos foram reduzidos face à configuração inicial de 40/32/24/24 XP. Estes valores são calibráveis.

Para cada avaliação com hits:

1. Somar e liquidar os prémios, respeitando o máximo acumulado de 12 500×. Se atingir o máximo, emitir MAX WIN e terminar sem gerar novo estado de jogo.
2. Somar o XP de todos os grupos desta avaliação ao saldo da barra.
3. Remover a união das posições vencedoras, aplicar gravidade e preencher.
4. Se `XP >= T`, fazer exatamente uma ativação: colocar XP a zero, descartar o excesso, avançar a progressão e colocar os wilds antes de avaliar os novos grupos.
5. Avaliar a nova grelha e repetir enquanto existirem hits.

O XP de um lote simultâneo de hits é agregado antes da decisão de ativação; não depende da ordem de enumeração dos grupos. Hits posteriores à magia podem voltar a encher a barra. No base, a barra reinicia no spin seguinte. No bónus, mantém o XP entre spins; começa vazia ao entrar e é descartada ao sair.

### Barras e XP por símbolo e intervalo

Limiares definidos para a configuração inicial de desenvolvimento:

| Modo | XP necessário por barra | Persistência |
| --- | --- | --- |
| Jogo normal | 39 XP | Apenas entre cascatas do mesmo spin |
| Bónus comum | 18,80 XP | Entre todos os spins do mesmo bónus |
| Super bónus | 17,10 XP | Entre todos os spins do mesmo bónus |
| Secret bónus | 16,50 XP | Entre todos os spins do mesmo bónus |

O limiar de cada modo é constante durante a jogada/bónus: subir o nível da magia não aumenta nem reduz esse limiar. O secret tem um limiar menor que o super e sobe o multiplicador a cada ativação. Estes são valores iniciais definidos para implementação, ainda sujeitos a calibração de RTP.

XP de cada hit, antes de verificar se a barra encheu:

| Símbolo | XP por posição | 5 | 6–7 | 8–10 | 11–14 | 15–17 | 18+ (18–30) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| N1 | 1,00 | 5,00 | 6,00–7,00 | 8,00–10,00 | 11,00–14,00 | 15,00–17,00 | 18,00–30,00 |
| N2 | 1,02 | 5,10 | 6,12–7,14 | 8,16–10,20 | 11,22–14,28 | 15,30–17,34 | 18,36–30,60 |
| N3 | 1,04 | 5,20 | 6,24–7,28 | 8,32–10,40 | 11,44–14,56 | 15,60–17,68 | 18,72–31,20 |
| N4 | 1,06 | 5,30 | 6,36–7,42 | 8,48–10,60 | 11,66–14,84 | 15,90–18,02 | 19,08–31,80 |
| N5 | 1,08 | 5,40 | 6,48–7,56 | 8,64–10,80 | 11,88–15,12 | 16,20–18,36 | 19,44–32,40 |
| P1 | 1,10 | 5,50 | 6,60–7,70 | 8,80–11,00 | 12,10–15,40 | 16,50–18,70 | 19,80–33,00 |
| P2 | 1,12 | 5,60 | 6,72–7,84 | 8,96–11,20 | 12,32–15,68 | 16,80–19,04 | 20,16–33,60 |
| P3 | 1,14 | 5,70 | 6,84–7,98 | 9,12–11,40 | 12,54–15,96 | 17,10–19,38 | 20,52–34,20 |
| P4 | 1,16 | 5,80 | 6,96–8,12 | 9,28–11,60 | 12,76–16,24 | 17,40–19,72 | 20,88–34,80 |
| P5 | 1,18 | 5,90 | 7,08–8,26 | 9,44–11,80 | 12,98–16,52 | 17,70–20,06 | 21,24–35,40 |

Cada intervalo mostra o mínimo e o máximo de XP nesse escalão; não é um sorteio de XP. A quantidade exata determina o valor pela fórmula acima. Por exemplo, nove posições de P3 geram `9 × 1,14 = 10,26 XP`. No escalão 18+, 18 posições de P3 geram 20,52 XP e 30 geram 34,20 XP, apesar de o prémio base desse escalão ser igual.

Somar o XP de todos os hits simultâneos e o saldo anterior da barra. Os wilds usados contam como posições do símbolo substituído; não recebem um XP adicional separado. Multiplicadores dos wilds afetam apenas o prémio. Não atribuir XP por scatters, símbolos não vencedores, entrada num bónus ou simples colocação de wilds. Ao encher a barra, ativar a magia e colocar o saldo a zero, descartando o excedente. Exemplo: no super, saldo de 12 XP e hit de nove P3 totalizam 22,26 XP; ocorre uma magia e o saldo fica zero, sem guardar os 5,16 XP excedentes.

## 5. Magia

No base, sortear a quantidade: `P(1)=0,50`, `P(2)=0,35`, `P(3)=0,15`. Média pretendida: `1,65 wilds` por ativação, antes da limitação de posições. Sem multiplicador.

No bónus, seja `k` a ativação, começando em 1:

- Quantidade pretendida: `W(k) = k + 1`.
- Comum: sem multiplicador.
- Super: `m(k) = 1 + floor((k - 1)/2)` por wild novo.
- Secret: `m(k) = k` por wild novo.

Se existirem `e` posições regulares elegíveis, colocar `min(W,e)` wilds, escolhendo posições uniformemente sem reposição. Nunca substituir scatters nem wilds existentes. Não guardar os wilds excedentes. O contador progride mesmo quando faltam posições; não há teto de nível ou multiplicador. Cada wild antigo conserva o seu valor individual durante as cascatas. Nenhum wild passa ao spin seguinte; o contador do bónus mantém-se, incluindo nos spins adicionais.

## 6. Bónus naturais, retriggers e compras

Quando o spin termina sem mais hits ou magias pendentes, contar scatters. No base, exatamente 3 inicia comum, 4 super e 5 secret. O bónus começa depois de terminar o spin de origem, com 12 spins, XP zero e contador de magia zero.

Em cada free spin, consumir um spin, resolver completamente as cascatas e então atribuir `a(s)`: `a(2)=2`, `a(3)=4`, outros valores zero. Atualizar `spins_restantes = spins_restantes - 1 + a(s)`. Não mudar o tipo de bónus e não transportar scatters para outro spin. Reiniciar o tabuleiro no spin seguinte.

Contrato implementado das compras: registar o custo uma vez e entrar diretamente no mesmo estado inicial do bónus natural, com 12 spins e sem spin de gatilho pago ou prémio adicional de entrada. A apresentação pode mostrar a entrada, mas não sortear uma grelha de gatilho premiada. Usar exatamente as mesmas probabilidades e regras internas para bónus comprado e natural do mesmo tipo. O motor local calcula custo e liquidação; não movimenta uma carteira real.

Scatters não têm pagamento monetário próprio na configuração inicial proposta. O prémio máximo da compra é 12 500× a aposta base; o custo da compra serve apenas para calcular o RTP dessa modalidade.

A duração tem de ser observada por nível de magia: `E[a] = 2P(s=2) + 4P(s=3)` por spin pode depender do estado. A aproximação `12 / (1 - E[a])` só é válida num modelo estacionário com média inferior a 1; não usar como cálculo exato deste jogo. O número de oportunidades de scatter cresce com as cascatas. Um limite técnico de execução deve interromper com erro e invalidar a amostra, nunca descartar spins ou liquidar uma jogada incompleta como se fosse normal.

## 7. Preços e retornos necessários

Seja `Fj` o pagamento de um bónus iniciado vazio, incluindo retriggers e limitado a 12 500×. Seja `μj = E[Fj]`. Para compra ao preço `Cj`:

`RTP_compra_j = μj / Cj`.

Para alvo de 99%: `μj_alvo = 0,99 × Cj`. Para um retorno médio estimado, o preço central candidato é `Cj = μj / 0,99`. O preço não deve ser escolhido a partir de uma amostra final que depois se reutiliza como validação independente.

| Compra | Faixa autorizada de preço | Preço inicial proposto | Retorno médio alvo | Retorno médio compatível com 98%–100% ao preço proposto |
| --- | --- | --- | --- | --- |
| Comum | 80×–100× | 80× | 79,20× | 78,40×–80,00× |
| Super | 200×–240× | 225× | 222,75× | 220,50×–225,00× |
| Secret | 300× ou mais | 316× | 312,84× | 309,68×–316,00× |

Para existir algum preço válido na faixa: comum precisa de média entre 78,40× e 100×; super entre 196× e 240×; secret de pelo menos 294×. Isto é uma condição sobre médias verdadeiras, não uma aceitação baseada só na média de uma amostra. Para preços fixos ao alvo de 99%, as médias pretendidas têm proporção `1 : 2,8125 : 3,95`.

Por isso não basta escalar todos os pagamentos: isso não altera livremente a força relativa dos três bónus e o teto pode alterar as proporções. Se os retornos não permitirem os preços autorizados, ajustar limiares, probabilidades e tabela, preservando as regras confirmadas; não fixar artificialmente o retorno de cada compra.

## 8. RTP do jogo base completo

Seja `B` o pagamento das cascatas base da jogada, já limitado ao teto, e `J` o tipo de bónus obtido, se existir. O pagamento total é:

`Y = min(12500, B + FJ)`, tomando `FJ = 0` quando não há bónus.

`RTP_base = E[Y]` quando a aposta normalizada é 1. O bónus natural não tem uma compra adicional no denominador. Uma cascata ou free spin também não é uma nova aposta.

Decomposição exata: `E[Y] = E[B] + soma_j E[1(J=j) × min(Fj, 12500-B)]`.

Não substituir automaticamente a segunda parcela por `P(J=j) × μj`: o espaço restante até ao teto depende do pagamento base. Essa aproximação serve apenas para planeamento e tem de ser corrigida pelo motor completo.

Proposta de repartição para orientar a primeira calibração, sem alterar as regras nem garantir frequências:

| Origem | Contribuição pretendida para o RTP base | Frequência de entrada aproximada, usando a média alvo da compra |
| --- | --- | --- |
| Cascatas do jogo base | 59 pontos percentuais | Não se aplica |
| Bónus comum natural | 20 pontos percentuais | 1 em 396 spins pagos |
| Super natural | 13 pontos percentuais | 1 em 1 713,5 spins pagos |
| Secret natural | 7 pontos percentuais | 1 em 4 469,1 spins pagos |
| Total | 99% | Cerca de 1 bónus em 300,1 spins pagos |

Estes números são objetivos derivados de `contribuição / μj`, ignorando apenas para planeamento a correção do teto. Não são saídas da configuração inicial nem percentagens a aplicar diretamente às células. A probabilidade de entrada deve emergir dos scatters sorteados por posição. As probabilidades iniciais muito pequenas do quarto e quinto scatter podem precisar de aumentos substanciais.

## 9. Amostras e métricas

Executar as quatro populações separadamente, com a configuração congelada, RNG reproduzível e seeds independentes das usadas para afinação:

| População de validação | Amostra inicial solicitada | Custo normalizado, usando os preços propostos |
| --- | --- | --- |
| Jogo base completo | 1 000 000 de apostas pagas | 1 000 000× |
| Compras comum | 100 000 bónus completos | 8 000 000× |
| Compras super | 100 000 bónus completos | 22 500 000× |
| Compras secret | 100 000 bónus completos | 31 600 000× |

Os free spins e retriggers são trabalho adicional dentro destas amostras; não consomem unidades da contagem de apostas pagas ou compras. Um bónus de 40 free spins continua a ser uma compra ou um bónus natural, não 40 observações independentes.

Registar por população: versão e hash da configuração, seed e algoritmo RNG, contagem de jogadas completas, aposta total, pagamento total, RTP, variância, intervalo de confiança, frequência de qualquer retorno, frequência de lucro, mediana e percentis 90/95/99/99,9, incidência de MAX WIN, duração e cascatas, ativações de magia, nível máximo e retriggers. No base, separar pagamentos base e contribuições dos três bónus naturais, frequências exatas de 3/4/5 scatters e número de amostras de cada bónus. Não misturar compras com o RTP base.

Para custo constante `c`, amostras completas de retorno `yi` e `zi = yi/c`:

`RTP_estimado = média(zi)`.

`erro_padrao = desvio_padrao_amostral(zi) / sqrt(N)`.

Intervalo normal aproximado de 95%: `média ± 1,96 × erro_padrao`. Para avaliar simultaneamente os quatro modos, usar também intervalos aproximados de Bonferroni com cobertura conjunta de 95%: `média ± 2,50 × erro_padrao` para cada modo. Documentar que ambos dependem de aproximação amostral; zero eventos raros observados não prova contribuição zero.

Reportar resultados por lotes independentes para detetar concentração de prémios raros, sem tratar lotes ou spins internos como novas compras. A amostra pedida é um mínimo inicial, não garantia de precisão. Se os intervalos forem largos ou faltarem observações dos eventos relevantes, aumentar a amostra e declarar a limitação. Testes dirigidos provam funcionamento de eventos raros, não a sua frequência natural.

## 10. Calibração e aceitação

1. Construir um único motor para testes, simulações e futura apresentação; verificar conectividade, wilds partilhados, pares, XP, ordem da magia, preservação de scatters, bónus, teto e ausência de cobrança/pagamento duplicados.
2. Executar pilotos locais para conhecer a ordem de grandeza dos quatro retornos, duração e incidência de MAX WIN. Os pilotos são dados de afinação, não validação final.
3. Ajustar distribuição dos símbolos e relações de pagamentos para a frequência e dimensão dos hits. Manter 20% de pares e as regras de progressão confirmadas.
4. Ajustar os limiares de XP, preservando `Tbase > Tcomum > Tsuper >= Tsecret`, para aproximar os retornos relativos dos bónus. Se a proposta de limiares não conseguir os objetivos, registar a nova configuração; não mudar as regras silenciosamente.
5. Afinar os três valores de scatter dos bónus para retriggers e duração. Ajustar os preços dentro das faixas; secret está atualmente proposto a 316×, sem obrigação de ficar nesse valor. Se não houver preço comum/super compatível, voltar à configuração em vez de sair da faixa autorizada.
6. Afinar os cinco valores de scatter base para as contribuições naturais; cada mudança exige medir novamente o base completo, porque também muda as posições disponíveis e a evolução das cascatas.
7. Reavaliar os quatro modos após qualquer alteração partilhada; limitar mudanças a parâmetros versionados e independentes do jogador, saldo ou histórico de ganhos.
8. Congelar uma candidata e executar as quatro amostras de validação acima com seeds novas. Alvo de aceitação: estimativas perto de 99% e intervalos conjuntos inteiramente dentro de 98%–100%, com observações suficientes dos eventos que dominem a variância. Atingir uma média pontual de 99% não basta.
9. Se a candidata falhar, qualquer ajuste cria uma nova versão; fazer nova validação independente. Se não houver precisão suficiente, reportar estado inconclusivo e ampliar a amostra. Não selecionar apenas seeds favoráveis nem interromper quando o RTP momentaneamente entra no intervalo.

Como as cascatas, XP, retriggers e teto interagem, a formulação é exata nas regras e identidades acima, mas a expectativa final ainda precisa de estimação. Não há fundamento para prometer já que os pagamentos propostos, os preços iniciais e a experiência desejada são simultaneamente compatíveis com 99%.

## Estado de entrega

Motor, configuração, eventos, testes e simulador local implementados. Comandos reais e limites no [guia de execução](README.md). A configuração executável é `sofia-growth-4-hunt-3`, com `calibrated: false`; revê os scatters do Bonus Hunt, sem alterar as tabelas de `sofia-growth-4` dos quatro modos anteriores. A configuração ainda não está validada para 99%.

### Primeira medição completa — 30 de outubro de 2026

Comando executado nesta pasta: `npm.cmd run simulate -- --mode all --seed 20261031 --out initial-validation.json`. Os [resultados completos](initial-validation.json) incluem seeds, hash, intervalos, lotes e contribuições. A unidade de aposta foi 100, sem perda adicional por arredondamento de créditos. Foram também aprovados 24 testes dirigidos e realizada uma amostra piloto separada de 1 000 jogadas por modalidade.

| Modo | Jogadas/compras completas | RTP observado | Intervalo aproximado de 95% | MAX WIN |
| --- | --- | --- | --- | --- |
| Base, com bónus obtidos | 1 000 000 | 8,177357% | 8,141944%–8,212770% | 0 |
| Compra comum a 90× | 100 000 | 1,145744% | 1,141670%–1,149819% | 0 |
| Compra super a 220× | 100 000 | 0,758867% | 0,536141%–0,981593% | 4 |
| Compra secret a 350× | 100 000 | 0,678383% | 0,468393%–0,888373% | 9 |

No base foram obtidos 9 734 bónus comuns, 81 super e zero secret. Zero secret observado não significa probabilidade zero. Os intervalos normais de super/secret são apenas aproximados, com contribuição relevante de poucos eventos MAX WIN; não servem como prova de cobertura da cauda rara. A configuração inicial falha o alvo de 98%–100% nos quatro modos. Os resultados demonstram o ponto de partida, não preços validados nem conclusão da calibração. Esta execução completa não altera os pagamentos, probabilidades ou limiares solicitados.

### Pagamentos crescentes, redução de XP e aumento de scatters — 30 de outubro de 2026

O utilizador autorizou aumentar pagamentos com maior peso nos clusters grandes, reduzir XP e aumentar scatters. A versão atual, `sofia-growth-4`, preserva pesos dos símbolos, 20% de pares, progressão da magia, 12 spins iniciais e MAX WIN de 12 500×. A tabela de XP por hit não muda; mudam os limiares da barra.

- Pagamentos: aproximadamente 1,5× / 3× / 6× / 12× / 24× / 48× a tabela original nos seis escalões. As diferenças de arredondamento ficam nos centésimos. Cada passo de escalão na tabela final multiplica o pagamento por pelo menos 2,8, com passos próximos de 4 nos clusters grandes.
- Exemplo N1: 0,15× / 0,45× / 1,50× / 6× / 24× / 96×. Exemplo P5: 2,25× / 7,50× / 24× / 96× / 384× / 1 440×. Os multiplicadores dos wilds continuam a aplicar-se depois da tabela.
- XP necessário: base 40 → 39; comum 32 → 18,80; super 24 → 17,10; secret 24 → 16,50. Os quatro limiares foram reduzidos, sem alterar a regra de descarte do excedente.
- Scatters base: 3% → 3,01%; 2% → 2,01%; 0,65% → 0,655%; 0,12% → 0,15%; 0,025% → 0,04%. No bónus: 2% → 3%; 0,8% → 1,2%; 0,2% → 0,3%. Todas as probabilidades aumentam relativamente à versão original.
- Preços em afinação: comum 80×, super 225× e secret 316×, dentro das faixas autorizadas. Não são ainda preços validados para 99%.

Foram usados pilotos separados para afinação. Os [dados da primeira afinação](growth-tuning.json) e os [dados da revisão intermédia](growth-refinement-tuning.json) incluem as configurações efetivamente executadas. Uma primeira candidata completa, `sofia-growth-2`, com pagamentos mais agressivos e XP base de 28, produziu 110,466702% / 94,690003% / 107,287080% / 92,088928% no base/comum/super/secret, respetivamente; os [resultados dessa candidata](growth-validation.json) são preservados e não substituem a medição da versão atual.

A configuração atual foi congelada antes de executar `npm.cmd run simulate -- --mode all --seed 20261230 --out growth-final-validation.json`. Os [resultados completos da versão atual](growth-final-validation.json) incluem a configuração executada, SHA-256, seeds e métricas. Nenhum parâmetro foi alterado depois de observar esta amostra.

| Modo | Jogadas/compras completas | RTP observado | Intervalo aproximado de 95% | MAX WIN |
| --- | --- | --- | --- | --- |
| Base, com bónus obtidos | 1 000 000 | 106,812521% | 87,060320%–126,564722% | 65 |
| Compra comum a 80× | 100 000 | 94,811785% | 87,485161%–102,138408% | 576 |
| Compra super a 225× | 100 000 | 99,885795% | 95,379437%–104,392154% | 1 744 |
| Compra secret a 316× | 100 000 | 94,748080% | 91,061840%–98,434320% | 2 315 |

No base foram obtidos 9 662 bónus comuns, 89 super e zero secret. As contribuições observadas foram 21,851877 pontos percentuais do base, 79,905233 do comum natural e 5,055411 do super natural. Zero secret natural continua a ser falta de observações desse evento, não evidência de impossibilidade.

Os 25 testes dirigidos e a verificação documental passaram. A implementação executa as alterações pedidas e as duas medições completas terminaram sem erros técnicos. O alvo de 98%–100% **ainda não está validado**: só a estimativa pontual do super está nesse intervalo e nenhum modo passa o critério de precisão conjunta. O base tem grande incerteza devido aos MAX WIN raros; não é correto interpretar a média de 106,81% como uma expectativa teórica exata nem ajustar parâmetros apenas para forçar esta seed a dar 99%. A calibração e a avaliação dos eventos raros continuam pendentes.

### Bonus Hunt: custo 4× e alvo de frequência 3× — 30 de outubro de 2026

O pedido deste ensaio altera apenas o custo da aposta e as probabilidades de scatter no spin base e nas cascatas desse spin. Pagamentos, pesos condicionais dos regulares, pares, XP, magia, bónus, retriggers, compras e MAX WIN permanecem iguais. O modo `hunt` começa com a mecânica base, mantém a aposta de referência `b` e regista custo `4b`, sem cobrar novamente pelas cascatas ou free spins. Ao entrar num bónus, retoma as probabilidades normais desse bónus.

Seja `h` o fator aplicado aos scatters. Para o próximo scatter `s`, usar em partes por milhão:

`q_hunt[s] = min(1000000, round(h × q_base[s]))`.

O alvo de frequência é `P(J_hunt existe) ≈ 3 × P(J_base existe)`, não `h = 3`. Como os scatters são dependentes da contagem e das cascatas, o fator precisa de medição.

A primeira interpretação, `h = 3`, foi testada em 1 000 000 de jogadas, seed 20270101, produzindo 132 460 bónus e RTP de 258,0528395% ao custo de 4×. A frequência foi 13,584× o base de referência, incompatível com o objetivo de 3×. Os [dados dessa tentativa](hunt-scatter-3x-validation.json) ficam preservados como experiência rejeitada.

Pilotos de afinação, separados da validação final, com 150 000 apostas por candidato e seed 20270111, observaram:

| Fator de scatter | Bónus obtidos | Frequência | Razão face ao base de referência |
| --- | --- | --- | --- |
| 1,50 | 4 247 | 2,831333% | 2,9036× |
| 1,55 | 4 489 | 2,992667% | 3,0691× |
| 1,60 | 4 809 | 3,206000% | 3,2879× |

Foi fixado `h = 1,53` antes da nova validação, com custo 4×. As cinco probabilidades resultantes são 4,6053%, 3,0753%, 1,0022%, 0,2295% e 0,0612%, respeitando o limite de cinco scatters. O fator só se aplica ao modo hunt, sem alterar a configuração do base normal.

Execução final: `npm.cmd run simulate -- --mode hunt --count 1000000 --seed 20270121 --out hunt-validation.json`. Os [resultados completos](hunt-validation.json) contêm a configuração `sofia-growth-4-hunt-2`, hash, seed e métricas. Não foram repetidas as outras quatro populações completas neste ensaio; a comparação usa o milhão de apostas base anterior com as mesmas tabelas de jogo.

| Métrica | Resultado |
| --- | --- |
| Jogadas hunt completas | 1 000 000 |
| Custo total, em apostas base | 4 000 000× |
| Pagamento total, em apostas base | 2 108 231,38× |
| RTP observado, incluindo bónus | 52,705785% |
| Intervalo aproximado de 95% do RTP | 45,381825%–60,029744% |
| Bónus comum | 28 799 |
| Super | 462 |
| Secret | 2 |
| Entradas em qualquer bónus | 29 263 — 2,9263% |
| Frequência média | 1 em 34,17 spins pagos |
| MAX WIN | 143 |

Referência base: 9 751 entradas em 1 000 000 de apostas, ou 0,9751%, da medição `sofia-growth-4`. Razão observada hunt/base: 3,001026×. Intervalo aproximado de 95% da razão: 2,933523×–3,070082×, calculado na escala logarítmica com erro padrão `sqrt(1/n_h - 1/N_h + 1/n_b - 1/N_b)`. É evidência compatível com um aumento de 3×, não prova de igualdade teórica exata nem garantia por sessão.

O retorno por aposta de referência é `Y_hunt = min(12500, B_hunt + F_Jhunt)`, mas o RTP do modo é `E[Y_hunt] / 4`. Os prémios e o teto não são multiplicados pelo custo 4×. Aumentar aproximadamente 3× a frequência de bónus não garante manter o RTP ao multiplicar o custo por 4; o ensaio confirma que este modo está muito abaixo do alvo global de 98%–100%. Não foram alterados pagamentos, XP ou bónus para compensar esse custo. Passaram 30 testes, incluindo cinco dirigidos ao hunt.

### Hunt: aumento de scatter para aproximar o RTP da meta — 30 de outubro de 2026

Após observar o RTP de 52,705785%, o utilizador autorizou aumentar a chance de scatter do Hunt para aproximar o retorno da meta. O objetivo anterior de cerca de 3× entradas em bónus foi substituído nesta afinação; o custo permanece 4×. Apenas o fator de scatter do Hunt muda: 1,53 → 1,94, um aumento de cerca de 26,8% nas probabilidades locais. Foram removidos os metadados do antigo alvo de frequência, sem alteração de qualquer outra mecânica.

Os [pilotos de afinação](hunt-rtp-tuning.json) usaram 200 000 jogadas por candidato, seed 20270201:

| Fator de scatter | RTP observado | Frequência de bónus |
| --- | --- | --- |
| 1,90 | 94,291185% | 4,9040% |
| 2,00 | 105,914705% | 5,5305% |
| 2,10 | 129,858585% | 6,1930% |

Estes pilotos apresentam intervalos largos devido a eventos raros e servem apenas para afinação. Foi escolhido e congelado o fator 1,94, versão `sofia-growth-4-hunt-3`, antes da execução independente: `npm.cmd run simulate -- --mode hunt --count 1000000 --seed 20270221 --out hunt-rtp-validation.json`.

Probabilidades por posição, conforme a contagem atual de scatters: 5,8394%, 3,8994%, 1,2707%, 0,291% e 0,0776%; após cinco, zero. Aplicam-se ao preenchimento base e cascatas do Hunt. Ao entrar no bónus obtido, usar os valores normais desse bónus. O custo, pagamentos, pesos dos símbolos, XP, pares, magia, bónus e teto foram comparados com a configuração do ensaio anterior e mantêm-se iguais.

| Métrica | Resultado da nova execução |
| --- | --- |
| Jogadas completas | 1 000 000 |
| Custo total em apostas base | 4 000 000× |
| Pagamento total em apostas base | 4 090 823,85× |
| RTP observado | 102,270596% |
| Intervalo aproximado de 95% do RTP | 91,752064%–112,789129% |
| Comum / super / secret obtidos | 50 062 / 1 160 / 1 |
| Total de bónus | 51 223 — 5,1223% |
| Frequência média de bónus | 1 em 19,52 spins pagos |
| Razão face à frequência base de referência | 5,2531× |
| MAX WIN | 295 |

Os [resultados completos](hunt-rtp-validation.json) incluem configuração, hash, seed, lotes e métricas. Foram executados apenas os pilotos e o milhão final de Hunt, sem repetir as quatro populações completas anteriores. Passaram 30 testes e a verificação documental. O RTP observado aproximou-se da meta, mas a média ainda está acima de 100% e o intervalo de confiança é demasiado largo para validar 98%–100%. Não foram ajustadas seeds nem alterados parâmetros depois desta medição; `calibrated` continua `false`.
