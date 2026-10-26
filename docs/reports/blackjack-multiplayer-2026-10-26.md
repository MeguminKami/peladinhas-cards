# Blackjack multiplayer — validação local de 2026-10-26

[Procedimento e publicação](../guides/blackjack-multiplayer.md)

Implementação de uma mesa pública de cinco lugares, com regras e carteira validadas no servidor, baralho privado, recuperação por identificador e encerramento automático. Sem acesso ao Firebase ou Storage reais e sem deploy.

## Consumo por ronda

O cenário determinístico do emulador usa cinco pessoas já sentadas, cinco apostas de 1 DJC, uma carta e uma decisão de parar por pessoa, cinco vitórias, cinco consultas privadas de saldo após pagamento e reabertura das apostas.

| Componente | Leituras | Escritas |
| --- | ---: | ---: |
| Transações: confirmar, jogar, pagar e reabrir | 48 | 42 |
| Cinco consultas privadas de saldo | 10 | 0 |
| Política global e conta: 21 pedidos × 2 | 42 | 0 |
| 16 atualizações públicas × cinco clientes | 80 | 0 |
| Perfil necessário às regras desses listeners | 80 | 0 |
| **Total de referência** | **260** | **42** |

As 58 leituras de transação e 42 escritas foram contadas sobre transações executadas no Firestore Emulator. As restantes leituras são derivadas do fluxo e das regras; não são uma medição de faturação em produção. O cenário exclui entrada inicial, respostas perdidas, reconexões, reexecuções de transações, presença e recuperação agendada. Não é um limite máximo: splits, seguro, mais cartas, jogadores a entrar/sair e pedidos concorrentes alteram o consumo.

Cinco browsers visíveis enviam até dez renovações de presença por minuto: aproximadamente 30 leituras e dez escritas, sem fan-out público. A recuperação agendada lê uma vez por minuto sem mesa e duas numa passagem sem alterações com mesa; transições podem ler carteiras. Os clientes escalonam os pedidos de timeout por lugar para reduzir pedidos simultâneos. O Scheduler continua necessário quando todos fecham a aplicação.

A estimativa de conversa de 150–200 leituras não incluía completamente a validação de conta/política e as leituras dependentes das regras. O valor de referência completo desta implementação é 260 leituras, antes de presença e recuperação.

## Verificação

- Nove testes de estado multiplayer: cinco participantes, propriedade das mãos, repetição de pedidos, saldo insuficiente, revisão atrasada, restituição antes da distribuição, timeout e encerramento, split/dobrar, seguro, espera numa ronda longa e rejeição de apostas antigas após expirar a cache de recibos. O teste de encerramento confirma o limite de um minuto sem ronda, mesmo com presença, e o reinício desse minuto após terminar uma ronda que durou mais de dois minutos.
- Os 21 testes existentes do Blackjack e a verificação TypeScript passaram. A cópia do motor usada pelo servidor corresponde às fontes TypeScript.
- Testes backend no emulador: entradas simultâneas, reserva única, compatibilidade com sessões da carteira, documento público sem segredos, regras contra escritas forjadas e leitura privada, liquidação sem browsers e orçamento de operações.
- Browser com cinco páginas/identidades, numa ronda completa partilhada; inspeção em 1440, 768, 390 e 320 px, nomes longos e acentos, foco por teclado e movimento reduzido. Capturas e relatório ficam em `test-results/blackjack`.

Estes resultados não verificam Functions/Scheduler publicados, permissões de infraestrutura ou latência de dispositivos reais. Não existe publicação executada neste trabalho.
