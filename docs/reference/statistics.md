# Explorar estatísticas

[← Documentação](../README.md)

Em **Estatísticas**, a consulta inicial mostra Jogos, Vitórias, Golos, Assistências, média de Físico e média das componentes, ordenada por golos. O jogador fica sempre na primeira coluna. As vistas rápidas **Visão geral**, **Ataque**, **Avaliações** e **Defesa** alteram as colunas e ordenação, preservando os filtros e o período escolhidos. Na vista de avaliações, Físico aparece primeiro.

## Construir uma consulta

- **Pesquisar jogador** procura no nome e no username, sem distinguir maiúsculas ou acentos; várias palavras têm de corresponder.
- **Colunas** permite pesquisar, acrescentar, remover e reordenar as 41 métricas. Jogador é fixo e fica sempre pelo menos uma coluna numérica. As alterações aparecem imediatamente.
- **Filtros** combina até 12 condições com E. Cada condição escolhe métrica, comparação (`≥`, `>`, `≤`, `<`, `=`) e valor. Só entram jogadores que cumprem todas; sem dados, uma comparação não passa. Aplicar confirma as condições; fechar sem aplicar descarta o rascunho.
- **Período** permite todos os jogos, últimos 30/90 dias, ano atual ou datas inclusivas; pode escolher-se também um jogo específico, a posição atual do perfil e o mínimo de 1/3/7 votos por critério e jogo. Os filtros de jogo e datas intersectam-se.
- Os cabeçalhos ordenam nos dois sentidos; o seletor de ordenação também permite escolher uma métrica ainda não visível e adiciona-a à tabela. Valores ausentes ficam no fim em ambos os sentidos.
- Os filtros aplicados aparecem em etiquetas removíveis. **Repor** restaura a consulta inicial. A vista é guardada automaticamente neste browser, por utilizador, sem gravar dados na liga. Se o armazenamento estiver indisponível, a consulta continua na sessão.
- **Exportar CSV** descarrega apenas os jogadores filtrados e as colunas escolhidas, pela ordem visível. Usa ponto e vírgula, decimais portugueses e proteção contra fórmulas em nomes. Não exige permissões de escrita.

Exemplo para encontrar jogadores com intensidade consistente: escolher **Avaliações**, adicionar **Físico · média ≥ 4** e **Jogos ≥ 2**, escolher o mínimo de votos e ordenar por Físico. A célula mostra quantos jogos efetivamente sustentam a média: dois jogos disputados não significam necessariamente duas avaliações elegíveis.

## Métricas e significado

| Grupo | Conteúdo |
| --- | --- |
| Resultados, 13 | Jogos, vitórias, empates, derrotas, golos, assistências, contribuições, golos da equipa, sofridos, saldo, jogos sem sofrer, jogos a marcar e jogos a assistir |
| Por jogo e eficácia, 6 | Percentagem de vitórias; médias por jogo de golos, assistências, contribuições, golos da equipa e sofridos |
| Avaliações, 9 | Médias de Geral, Ataque, Passe, Defesa, Físico, Atitude e GR; média das componentes e número de jogos avaliados |
| Carta, 13 | OVR e os 12 atributos da carta apresentada atualmente, identificados com escala /99 |

As estatísticas são reconstruídas a partir dos jogos carregados, não dos totais acumulados da carta. Só contam jogos encerrados, não eliminados, com data de fecho não futura e resultado numérico. O período usa a data marcada do jogo (`scheduledAt`), com fallback para o fecho, no calendário de Lisboa; dias inicial e final são inclusivos. Inclui participações como suplente. A posição filtrada é a atual do perfil, não uma prova da posição jogada.

As avaliações usam os resumos publicados (`gameSummaries`); nos dados antigos, pode usar-se o agregado do jogador associado ao mesmo jogo. Cada critério só entra quando tem estrelas entre 0 e 5 e a amostra mínima escolhida. Resumos antigos sem contagem por critério usam a contagem global existente. **GR com `goalkeepingEligible: false` ou avaliação não aplicável nunca entra**, independentemente das outras estrelas. Zero estrelas é válido; ausência de dados mostra «—».

A média de cada critério dá o mesmo peso a cada jogo elegível, não a cada voto. A média das componentes calcula primeiro a média das seis componentes disponíveis sem GR em cada jogo, e depois a média desses jogos. A amostra aparece por célula. Os resumos são os disponíveis agora: não reproduzem necessariamente o corte histórico de 48 horas usado nas missões. Filtros e ordenação usam os valores completos antes do arredondamento.

OVR e atributos são os valores da carta apresentada atualmente, incluindo a apresentação semanal existente. Não simulam a carta de uma data passada ao escolher um período. A tabela identifica-os como **Carta atual · /99**, separados de **Avaliação · /5**.

O resumo superior refere-se a todos os jogos do recorte, independentemente da pesquisa e dos filtros de jogadores. Golos da liga são a soma dos dois resultados, assistências são os registos das duas equipas e golos por jogo usa esse total. Não somar os golos de equipa de todas as linhas para obter o total da liga: os colegas partilham o mesmo resultado.

## Interface e manutenção

No telemóvel, o resumo da liga fica recolhido; o botão **Resumo dos jogos** abre-o. A tabela mantém linhas e colunas, com deslocação local, nome fixo à esquerda e cabeçalho fixo na deslocação vertical. Não transforma cada jogador num grande cartão. Os painéis são acessíveis por teclado, Escape fecha e devolve o foco, e o movimento reduzido é respeitado.

Modelo de consulta e cálculos: `js/statistics-model.js`; interface: `js/statistics.js`; estilos consolidados: `css/statistics.css`. As regras antigas da tabela foram removidas de `css/responsive.css` e `css/experience.css`. Os dados vêm da liga já carregada, sem novas chamadas ou consulta de votos individuais.

Testar com `node --test tests/statistics.test.js` (também incluído em `npm.cmd test`) e `npm.cmd run test:statistics` para a interface. [Relatório de validação](../reports/statistics-explorer-2026-10-19.md).

Esta funcionalidade só altera frontend. Não exige migração, recálculo ou alteração de semanas fechadas. Publicar com `npm.cmd run deploy:frontend`.
