# Retrigger — configuração 0.5.0

Atualização de 24/10/2026. Substitui as indicações anteriores de ausência de Scatters nos FS e ausência de reativações.

## Regras

- Nos dois bónus, três ou mais Scatters no resultado inicial atribuem **mais 5 free spins**, uma vez por jogada.
- Primeiro consome-se a jogada atual; depois somam-se os cinco novos FS. Exemplo: 1 restante → joga → retrigger → 5 restantes. Com 10 antes do spin, ficam 14.
- O total concedido começa em 10 e cresce 10 → 15 → 20… Os retriggers podem repetir-se; não há alteração de modo, aposta ou preço da compra.
- Global, Wilds fixos e prémio acumulado mantêm-se. Os poderes locais continuam a expirar entre spins.
- O teto de 10 000× mantém prioridade: atingir o limite termina a ronda sem novos FS.
- Não existe prémio monetário direto por Scatter. A jogada também pode pagar linhas, normalmente.

Frequência **proposta**, configurável em `src/config.ts`, igual nos dois bónus: pesos 8000 / 1400 / 500 / 100 para zero / um / dois / três Scatters, respetivamente. Isto corresponde a 80% / 14% / 5% / 1% antes da limitação de espaço. Um Scatter por coluna, com coluna e linha aleatórias; nunca ocupa um Wild fixo. Se não houver três colunas com posições livres, a contagem possível é reduzida. O jogo base mantém os pesos anteriores e as ativações de três ou quatro Scatters.

## Estado, restauro e apresentação

O motor regista `retrigger`, `totalFreeSpins` e as métricas `retriggers` / `extraFreeSpins`. O simulador inclui os FS adicionais no número real de spins e na duração média dos bónus; a CLI identifica cada retrigger.

A sessão confirma os FS antes de apresentar a animação e guarda `pendingRetrigger` com ronda, índice do spin e FS ganhos. Enquanto aguarda confirmação não aceita outro spin. Clicar ou atingir 10 segundos apenas reconhece o festejo: não atribui novamente o prémio, não muda RNG nem saldo. Repetir o clique é idempotente. Recarregar recupera o festejo pendente e reinicia apenas os seus 10 segundos visuais. Sessões 0.3.1 e 0.4.0 migram sem repor saldo, histórico, seed ou bónus em curso.

Festejo: **PROLONGAMENTO!**, **+5 FREE SPINS**, bilhetes ilustrados, raios, brilho e animação suave de pulsação/balanço para parecer vivo. Botão CONTINUAR e indicador de 10 segundos; Escape não dispensa o festejo. Movimento reduzido simplifica os efeitos. Auto-FS retoma após a confirmação; em manual aguarda o próximo clique no spin.

O contador de FS está debaixo do global no painel esquerdo: restantes em destaque, total concedido por baixo e aviso nas últimas três jogadas. A zona fica oculta no jogo base. O histórico e o inspetor identificam os FS concedidos por retrigger.

## Verificação

Testes cobrem: geração de três Scatters em colunas distintas, proteção de sticky, retrigger na última jogada, repetição, global e modo preservados, prioridade do teto, custo único, restauro pendente, reconhecimento idempotente, clique, animação, countdown e continuação aos 10 segundos.

RTP 0.5.0 não medido nem recalibrado. Pesos, fatores de pagamento e teto anteriores permanecem, mas as medições antigas não representam a nova regra.

Atualização do painel FS: bloco independente abaixo de todo o bloco do global e poderes, com moldura e espaçamento próprios. Mostra A / B, onde A = total concedido menos FS restantes e B = total concedido, incluindo retriggers. Exemplo: 7 / 10; depois de ganhar +5 no mesmo ponto, 7 / 15. O denominador cresce sem reiniciar os spins rodados.
