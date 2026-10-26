# Carteira local do casino — 25/10/2026

[← Documentação](../README.md) · [Procedimento e contrato atuais](../guides/casino.md)

A carteira passou de uma chamada online por spin para confirmações por evento: entrada, saída, regresso à aba, bónus concluído e atualização manual. Não existem lotes por número de spins nem temporizadores de gravação. O motor matemático, arte e animações da slot 0.6.0 não foram alterados.

Cada spin grava saldo, totais e snapshot completo em IndexedDB antes de confirmar ao iframe. A rede recebe apenas totais acumulados e uma sequência idempotente. Uma sessão exclusiva no servidor impede gastar noutro dispositivo; Web Locks protegem abas locais. A última confirmação de uma sessão fica conservada para recuperar respostas perdidas.

## Validação local

- Testes do modelo: exclusividade, sequência, repetições, confirmações alteradas, saldo válido e prémios de futebol preservados.
- Browser isolado com fixtures: **1 000 spins sem qualquer chamada ao servidor**; nenhuma confirmação durante os primeiros FS de um bónus e uma confirmação após o último.
- Rede lenta: uma nova jogada local termina sem esperar pelo servidor; a resposta anterior preserva essa jogada e um prémio de futebol creditado entretanto.
- Recuperação: entrada com resposta perdida, saída sem rede, confirmação aplicada com resposta perdida, nova entrada com o mesmo pedido, sem reaplicar ganhos/perdas nem alterar RNG.
- Armazenamento cheio: a jogada não avança na carteira durável; segunda aba bloqueada antes de aceder ao servidor.
- Migração: compra de bónus pendente do protocolo antigo, retoma do RNG e continuação dos FS localmente, contando cada movimento uma única vez.
- Emulador Firestore demo: seis testes backend passaram, incluindo sessão exclusiva, repetição concorrente, proteção da API antiga, autorizações, regras privadas e prémios de futebol.
- Interface: verificação com fixtures nos quatro temas e larguras 1440/768/390/320 px, expansão no mesmo iframe, estado local/pendente, confirmação manual, recuperação e logout.
- Suite geral: 192 testes passaram; slot independente: 50 testes e TypeScript passaram. Sintaxe, build de Hosting e teste específico de empacotamento/cache passaram. Documentação: 65 documentos e 414 referências locais válidas.

Os testes usam apenas fixtures e emuladores `demo-`. Não houve leituras Firestore/Storage reais, publicação ou validação em aparelho físico. Não foi medido RTP nem custo de faturação cloud. As capturas são locais e não substituem a referência funcional.

## Publicação e limites

Se a versão anterior já foi publicada: atualizar `casinoSession`, `settleCasinoSlot` e frontend. Numa primeira publicação do casino, incluir também `getCasinoWallet` e `onCasinoGame`, conforme o guia. Sem alteração de regras/índices ou recálculo de semanas fechadas.

Não há garantia de envio ao fechar o navegador: os dados ficam pendentes para a próxima entrada no mesmo dispositivo. Não expirar sessões nem apagar armazenamentos pendentes automaticamente. Perder o armazenamento antes da confirmação pode perder progresso e exigir assistência para a carteira bloqueada. O motor local continua alterável pelo jogador; a sincronização protege a consistência transacional, sem provar a legitimidade de prémios calculados no browser.
