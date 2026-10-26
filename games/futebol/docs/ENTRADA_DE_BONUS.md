# Entrada no bónus

## Ordem da apresentação

O resumo final tem entrada animada própria e conta o total da ronda durante 3,2 segundos antes de revelar CONTINUAR. Com movimento reduzido, mostra o valor diretamente e espera 450 ms. O painel de FS permanece visível durante toda esta apresentação. A sequência das linhas pagas ocorre uma única vez antes da vitória; atualizações posteriores do tabuleiro não voltam a mostrar a primeira linha. A consulta manual continua disponível em Último spin.

A interface mantém um estado visual de bónus separado do resultado matemático já confirmado. A sequência é: cerimónia dos Scatters, anúncio e confirmação manual, entrada no cenário de FS com o seu painel, apresentação das jogadas, última contagem de ganho, resumo final e confirmação de saída para o jogo base.

O painel de FS fica oculto durante a ativação e o anúncio. O número de jogadas rodadas é atualizado depois da apresentação das roletas. Na última jogada mantém o total completo, mesmo que o motor já tenha encerrado a ronda. O cenário e o painel só regressam ao estado base quando o resumo final é fechado. Restaurar uma ronda ativa já aceite recupera diretamente o seu estado visual de FS.

Ao conquistar ou comprar um bónus, a cerimónia dos Scatters termina num ecrã sobreposto ao jogo, com moldura, fundo escurecido, emblema, nome do modo, dez free spins e uma explicação curta das diferenças.

O utilizador tem de clicar em **CONTINUAR**. Não existe temporizador, fecho por Escape ou avanço automático. Recarregar antes da confirmação volta a apresentar este ecrã. Depois da confirmação, o mesmo aviso não reaparece nessa ronda.

No Final do Bairro, a explicação destaca a maior frequência de Wilds e de roubo de poderes. Na Noite de Glória, destaca o roubo garantido quando existe um premium adjacente e a possibilidade de Wilds fixos. Ambos explicam a continuidade do multiplicador e o retrigger de mais cinco free spins por três Scatters.

Este ecrã só controla a apresentação. A compra conserva a operação atómica existente, que confirma a ronda e o primeiro resultado uma única vez; clicar em CONTINUAR não volta a sortear símbolos nem altera o saldo. O retrigger mantém o seu festejo separado, com confirmação manual ou avanço ao fim de dez segundos.

Validação automatizada: espera manual, Escape, ausência de avanço após dez segundos, recuperação após reload, entrada natural e comprada, modos normal e superior, disposição móvel e horizontal. Sem alteração da matemática ou da versão 0.5.0.


## Apito Final

O fecho do bónus usa um ecrã próprio com taça vetorial original, painel recortado verde-petróleo e dourado, luzes de estádio, confetti e total em destaque. Mostra FS efetivamente jogados, retorno em múltiplos da aposta e aposta de referência. O título Apito Final serve também para rondas sem ganho, sem anunciar falsamente lucro. Composição vertical no telemóvel e horizontal em ecrãs baixos; movimento reduzido preservado. CONTINUAR só surge no fim da contagem.
