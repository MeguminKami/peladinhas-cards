# Explorador de estatísticas — 19/10/2026

## Problema e implementação

A tabela anterior mostrava treze colunas fixas e, no telemóvel, convertia os jogadores em grelhas de dados, com várias regras CSS sobrepostas. Não permitia escolher componentes das avaliações, períodos ou condições numéricas.

Substituída por uma tabela de exploração com 41 métricas em quatro grupos, vistas rápidas, pesquisa de jogadores, escolha/ordenação de colunas, até 12 filtros combinados, recorte de jogos/datas/posição, mínimo de votos e CSV. A vista inicial inclui média de Físico; a vista Avaliações coloca esse critério primeiro. OVR e atributos da carta distinguem-se visualmente das estrelas.

Jogador fixo à esquerda; cabeçalho fixo na deslocação vertical; deslocação horizontal dentro da tabela. Ordenar preserva a posição horizontal quando as colunas não mudam. Painéis progressivos com foco, Escape, estados vazios e validação de datas. Resumo da liga recolhido no telemóvel. Persistência local por utilizador, com alternativa apenas na sessão se o armazenamento falhar. Não usa serviços de pesquisa externos, SQL ou bibliotecas novas.

O modelo calcula as estatísticas pelos jogos elegíveis do recorte e as médias com peso igual por jogo. Mostra amostra por célula, distingue zero de ausência e exclui GR não elegível. As avaliações são os resumos disponíveis agora, não uma reprodução do corte das missões. [Referência funcional](../reference/statistics.md).

## Verificação local

Quatro testes de modelo verificam resultados reais vs totais antigos, suplentes, amostras, zero válido, ausência de dados, GR N/A, datas inclusivas em Lisboa e transição de horário, períodos/jogo, filtros combinados, pesquisa sem acentos, ordenação de ausentes, normalização de consultas e CSV com proteção contra fórmulas.

Teste de interface com Playwright/Edge e fixtures: 1440, 768, 390 e 320 px, temas Club, Volt, Champions e Ultimate. Verificou os três painéis expandidos, nomes longos, todas as 41 métricas selecionadas, ausência de overflow da página, tabela sem conversão para cartões, pesquisa, adicionar/reordenar colunas, condições, datas inválidas, amostra mínima, jogo específico, CSV, persistência, armazenamento indisponível, estado vazio, foco/teclado, cabeçalho fixo, conservação de scroll e redução de movimento. Capturas em `test-results/statistics/`; composição inspecionada em desktop e telemóvel. As fixtures não comprovam configuração cloud nem publicação.

## Publicação

Verificação final: **154 testes gerais passaram**, teste `npm.cmd run test:statistics` passou, todos os módulos passaram a verificação de sintaxe e a documentação validou 35 documentos/296 referências locais. Build frontend `20d2fbf80e43196f`, com 127 recursos públicos.

Alterações apenas de frontend: `js/statistics.js`, novo modelo, novo stylesheet, entrada em `index.html` e ícones de pesquisa/filtros. CSS antigo consolidado, sem overrides da tabela anterior. Não altera funções, regras, índices, documentos cloud ou cartas fechadas.

Publicar com `npm.cmd run deploy:frontend`. Publicação não executada nesta sessão.
