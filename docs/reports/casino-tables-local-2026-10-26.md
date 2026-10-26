# Mesas no casino temporário — 26/10/2026

[Guia do casino](../guides/casino.md)

Blackjack e Roleta foram ligados ao casino temporário com fixtures, na porta 8081. Os SDKs usam a mesma carteira fictícia da slot, em unidades inteiras de escala 100. Os iframes isolam estilos, fontes e controlos dos fornecedores. O adaptador local guarda movimento e recibo juntos, rejeita pedidos alterados, verifica o débito antes do retorno e conserva recibos ao reabrir a carteira.

Validação local em 26/10/2026:

- TypeScript e os 21 testes do Blackjack passaram.
- TypeScript e os 15 testes da Roleta passaram, incluindo todos os 37 resultados e pagamentos sobrepostos.
- Browser com fixtures: ronda completa de Roleta e mão de Blackjack, saldo partilhado, débitos/retornos locais, repetição idempotente e recuperação depois de fechar/reabrir a carteira.
- Verificados rejeição por saldo insuficiente, concorrência de operações, bloqueio de saída durante uma mão e regresso ao catálogo após conclusão.
- Inspecionados desktop e larguras de 768/390/320 px; corrigido o cabeçalho do Blackjack em ecrãs estreitos, sem cortar os controlos. Centrar preserva o mesmo iframe.
- Atualização de 26/10/2026 após clarificação do utilizador: os jogos adaptam-se na página normal. Centrar apenas desloca a página, preservando largura/altura, iframe, cartas e RNG. Retirados o posicionamento fixo, a expansão e o bloqueio do scroll. Verificados 1366×768, 768×1024, 390×844, 320×740 e 844×390 e rondas completas. O ajuste da câmara da Roleta é apenas de apresentação.
- Rift Core Overdrive integrada com o motor de navegador e a carteira fictícia partilhada. Verificados spin pela interface, saldo no iframe/cabeçalho, compra e free spins no modelo, repetição e recuperação do recibo. As quatro capas estão aplicadas e as fontes da Rift são locais. Estes testes não confirmam os resultados estatísticos ou os 46 testes referidos no relatório do fornecedor.

Não foram consultados Firebase/Storage reais, implementada a carteira online, medidos custos cloud ou executados deploys. A futura cadência pedida pelo utilizador está registada no guia como orientação pendente, sem alterar o protocolo online existente.
