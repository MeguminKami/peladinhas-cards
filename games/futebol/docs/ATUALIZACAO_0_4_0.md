# Atualização 0.4.0 — global persistente e rotação

Pedido do utilizador de 24/10/2026: manter o global e dispensar nova medição/calibração de RTP nesta alteração.

## Matemática

- Cada ronda começa com global ×1.
- P4 continua a somar +2, +3 ou +5, mas o resultado fica guardado para os próximos FS de ambos os bónus.
- Uma ativação natural leva também o global do spin base para os FS dessa ronda.
- P1 continua a multiplicar o global final pelas suas linhas; não soma nem aplica o global duas vezes.
- Uma nova ronda base ou compra inicia um global novo em ×1. O global final da ronda anterior pode continuar visível no resultado até ao próximo spin.
- Estado e detalhe registam `global` e `globalBefore`, incluindo resultados sem prémio. Reload conserva o acumulado.
- Pesos, tabelas, fatores estáticos, custo das compras e teto 10 000× não mudaram.
- RTP 0.4.0 não medido. Os relatórios 0.3.1 são históricos e não validam esta configuração.

Sessões locais 0.3.1 migram sem apagar saldo, histórico, contador, RNG ou FS. Num bónus em curso, a continuação começa no global final do último spin já guardado; os pagamentos anteriores não são recalculados. A ronda recebe a indicação de transição entre versões. Não existe reinício da seed.

## Rotação e Scatter

As faixas usam texturas temporárias de 256 px geradas no browser a partir dos PNG originais, sem alterar os masters. Retirados blur, sombras e animações individuais das imagens em movimento. Só o transform da faixa é animado; máscaras são usadas apenas em colunas com Wilds fixos.

Velocidades por célula: normal 145 ms, rápido 95 ms, super 55 ms. Os quatro símbolos finais são inseridos acima da faixa ainda em movimento, preservando a fase atual, e entram por uma desaceleração contínua. O Scatter deixa de aparecer apenas depois de retirar a faixa. Suspense conserva a coluna iluminada e usa uma chegada mais lenta, sem animação de filtro a cada frame. Não se afirma um FPS garantido em dispositivos que não foram medidos.

## Emblema dos quatro Scatters

Asset exclusivo da Noite de Glória: quatro bilhetes em leque, bola dourada, coroa e estádio do bairro. Aparece na compra, confirmação, ativação e entrada natural no bónus superior. Não é um 11.º símbolo do motor; os quatro Scatters continuam a ser os bilhetes da grelha.

Master PNG: `public/assets/football/symbols/bonus-four-scatter-v1.png`. Prompt e origem: `art/PROMPT_BONUS_4_SCATTERS.json`.

Verificações: testes de continuação do global, P1, nova ronda, ativação natural, migração e restauro de sessão; regressões de GUI e cancelamento das animações. Sem nova campanha de simulação de RTP.

Revisão posterior da apresentação: a paragem passou a usar duração física variável e velocidade contínua, substituindo os tempos fixos descritos acima. Ver `ROLETAS_FLUIDAS.md`.
