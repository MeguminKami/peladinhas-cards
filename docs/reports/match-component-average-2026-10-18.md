# Médias das componentes nos jogos — 18 de outubro de 2026

A linha de cada jogador num jogo encerrado e «A tua média» na lista de jogos mostram a média das componentes disponíveis sem Guarda-redes. Entre parênteses surge a média incluindo Guarda-redes, quando aplicável. Zero é uma avaliação válida; campos por avaliar e Guarda-redes não aplicável não contam como zero. A ajuda acessível identifica quantas componentes estão disponíveis.

A média é calculada no browser a partir dos resumos existentes: não acrescenta consultas, campos persistidos, alterações de progressão ou recálculo do histórico. As componentes individuais continuam disponíveis no detalhe.

Validação local: 105 testes unitários aprovados, incluindo médias com/sem GR, valores zero, dados parciais e ausência de avaliação. Os testes de jogo encerrado e lista/edição de jogos passaram em 1440/768/390/320 px. Capturas inspecionadas em desktop e telemóvel. Sintaxe, documentação, build Hosting e diferenças Git verificados. Os testes de interface usam fixtures, sem leituras de produção.

Não foi executado deploy. Publicação necessária: `npm.cmd run deploy:frontend`.

## Uniformização dos resultados — 18 de outubro de 2026

A média partilhada está aplicada ao início, perfil (últimos cinco jogos e forma recente), estatísticas, ranking e pódio semanal e média pós-jogo no ADMIN, além das linhas dos jogos. A ordenação por forma/performance usa a média sem GR. Os resumos dão peso igual a cada jogo; a variante com GR inclui essa componente apenas quando aplicável. As regras individuais de missões, progressão e qualificação de cartas continuam independentes.

Validação: 107 testes unitários aprovados. `test:rating-consistency` passou com valores propositadamente diferentes de Desempenho geral, verificando ordem e valores no ranking, estatísticas, perfil, ADMIN e pódio, com ausência de overflow em 1440/768/390/320 px. `test:home-card` e `test:event-scopes` passaram. Capturas de perfil desktop e estatísticas em telemóvel inspecionadas. Sintaxe, referências documentais, build Hosting e `git diff --check` aprovados. Todos estes testes são locais, sem leituras de produção.

Limitação de regressão: `test:profile` falhou na expectativa de uma única variação positiva de atributos permanentes (encontrou oito). O teste usa os valores da carta, que incluem bónus, para construir a referência histórica; a interface compara atributos permanentes. Esse cenário fica por corrigir/validar separadamente e não permite afirmar que toda a suite de perfil passou. Os valores da média no perfil foram verificados pelo teste de consistência.

Sem alterações de backend, migração ou recálculo. Sem deploy executado. Publicação: `npm.cmd run deploy:frontend`.