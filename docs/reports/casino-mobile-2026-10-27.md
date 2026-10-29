# Casino no telemóvel — 27 de outubro de 2026

## Ajustes

- Blackjack: a mesa integrada foi enquadrada mais acima. As apostas dos lugares extremos foram afastadas dos acessórios no desktop; os acessórios não são desenhados em larguras até 650 px. As regras escritas na mesa têm textura maior e inclinação virada para o jogador. A indicação duplicada junto ao dealer saiu.
- Rift Core Overdrive: em larguras até 750 px, o aviso de um poder surge no topo da grelha e não cobre o estado da ronda nem os controlos. Em larguras até 390 px, a aposta, AUTO, spin e utilitários têm linhas próprias. A faixa de controlos também foi separada entre 751 e 900 px. No website, o iframe tem altura mínima de 760 px até 650 px de largura para preservar a grelha completa; os controlos inferiores ficam acessíveis por scroll da página.

- Jogo aberto (até 700 px): o cabeçalho da app e a barra inferior ficam ocultos e a barra do casino passa a uma só linha (voltar, título, saldo, fechar). O jogo ocupa o resto do ecrã, sem ficar por baixo da navegação.
- Roleta (até 650 px): o tapete cabe na largura, sem deslocação horizontal, e as apostas externas já não saem da própria linha.
- Admin, Jogadores (até 700 px): cada jogador é um cartão com todas as ações legendadas, em vez de uma tabela com scroll horizontal. Em Avaliações, a seta de «Anterior» aponta para trás.

## Verificação local

- `npm.cmd run test:casino:blackjack`: regras, cinco jogadores, teclado, movimento reduzido, geometria em 1440/768/390/320 px e ações online.
- `npm.cmd run test:casino`: carteira local, sessões, spins da slot Futebol de Bairro e interface em 1440/768/390/320 px.
- `npm.cmd run test:casino:tables`: roleta integrada, apostas, recuperação e centragem em 1440/768/390/320 px; Rift integrada em 390/320 px, com grelha de pelo menos 160 px e aviso separado do estado e dos controlos.
- `npm.cmd run test:casino:cardoso`: carteira, avanço, cashout, derrota e quatro larguras. Uma execução paralela falhou numa observação temporal do intervalo de 500 ms; repetido isoladamente, passou.
- `npm.cmd run test:casino:rift`: motor e teste de interface em 320/390/768 px, com aviso de poder, ausência de colisões entre controlos e um spin local.
- Capturas em `test-results/` foram inspecionadas para blackjack, roleta, Cardoso Road, Futebol de Bairro e Rift Core Overdrive.

Estes testes usam dados locais e navegador de desktop com larguras móveis. Não medem desempenho, áudio nem gestos num telemóvel físico. Não houve consulta à base de dados ou Storage reais nem publicação.
