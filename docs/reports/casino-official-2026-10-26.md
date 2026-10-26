# Integração do casino — 26 de outubro de 2026

Implementação local preparada para o site oficial; não foi executado deploy nem consultado Firebase/Storage real.

## Implementado

- Edição de carteira `official-2026-10-shared`: reinício atómico para 100 DJC no primeiro acesso, sem varrimento de contas. O progresso local antigo fica isolado por versão.
- Recompensas de 20–200 DJC por jogo fechado, calculadas a partir da participação, resultado, diferença de golos, golos e assistências. Sem backfill ou alteração de semanas fechadas.
- Quatro jogos disponíveis; confirmações a cada 15 spins normais, fim de bónus e fim de ronda das mesas. O SDK continua a guardar débitos intermédios localmente.
- Sessões independentes por dispositivo, todas com acesso ao saldo comum completo, diferenças acumuladas e idempotência. Mantida proteção entre abas do mesmo navegador.
- Envio administrativo de 0–10 000 DJC, incluindo ao próprio administrador, com autorização no servidor e recuperação de pedidos repetidos.
- Convite do casino imediatamente abaixo do pódio no início, conforme o ajuste pedido em 26 de outubro; a posição mantém-se quando o bloco de instalação muda de lugar.

## Validação local

- Testes unitários da economia e sessões: 9 passaram, incluindo concorrência, recusa de saldo negativo e recuperação idempotente do lote.
- Carteira no navegador: lotes de 15 spins, fim de bónus, respostas perdidas, rede lenta, reentrada offline, duplicação, armazenamento cheio e proteção entre abas passaram.
- Entrada de jogo no navegador: saldo comum atualizado, falha de consulta sem fallback antigo, conflito de saldo com lote conservado, interrupção de novas apostas e recuperação exata após reposição de saldo passaram.
- Interface do casino: temas, 320/390/768/1440 px, teclado, redução de movimento, erros de carteira e slot passaram.
- Mesas: rondas completas e uma confirmação por ronda, carteira partilhada, recuperação, centragem e larguras 320/390/768/1440 px passaram.
- Rift: 3 testes da adaptação local passaram.
- Backend: 7 testes passaram no emulador Firestore `demo-peladinhas-casino`, na porta local 8388, com checkpoints concorrentes sobre o mesmo saldo, reinício e recibos administrativos. Regras de acesso direto negaram leituras/escritas dos clientes.
- Convite no início e diálogo administrativo inspecionados em 320/390/768/1440 px; sem overflow horizontal. Envio fictício e navegação por teclado verificados.
- `npm.cmd run check`, `npm.cmd run test:docs` e `npm.cmd run build:hosting` passaram. Uma build não confirma publicação.

## Decisão sobre vários dispositivos

O utilizador pediu acesso ao mesmo saldo completo em todos os dispositivos e rejeitou reservas ou distribuição por aparelho. O fluxo consulta o saldo no casino e em cada entrada de jogo, confirma lotes pendentes e respeita os checkpoints de 15 spins, fim de bónus e fim de ronda das mesas.

Saldo negativo é recusado atomicamente no servidor; o lote conserva os totais e o identificador, e novas apostas locais param perante esse conflito. A confirmação é recuperada quando houver saldo suficiente. Validar apenas por lotes não impede que dois aparelhos iniciem apostas com o mesmo saldo antigo; essa limitação está registada no guia, sem prometer prevenção de todos os gastos concorrentes antes da confirmação.

Publicação e comandos seletivos: [guia do casino](../guides/casino.md). Nenhuma configuração cloud foi verificada nesta tarefa.
