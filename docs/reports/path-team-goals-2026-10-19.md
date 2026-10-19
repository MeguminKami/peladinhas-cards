# Golos de equipa nas missões — 19/10/2026

Os novos alvos de golos de equipa passam de 2 / 3 / 4 para **5 / 7 / 8** nas três dificuldades. Ouro dos percursos individuais usa 8; as raridades de fusão e os avanços raros continuam a usar a dificuldade respetiva. Os outros critérios das missões mantêm-se, incluindo assistências. As propostas e tentativas já guardadas conservam os seus objetivos, sem recálculo de progresso ou semanas fechadas.

Consulta apenas de leitura executada com `node scripts/audit-path-difficulty.mjs`: dois jogos encerrados, quatro resultados de equipa e 20 participações. Média de 7,25 golos por equipa; quatro equipas atingiram 5, três atingiram 6, duas atingiram 8. Uma assistência individual ocorreu em 50% das participações e duas em 20%. Amostra pequena: calibração provisória, sem estimar probabilidades estáveis de sucesso de missões combinadas.

Verificação local: 31 testes de catálogo, percursos e janela de avaliação passaram, incluindo limites exatos, equipas corretas, propostas guardadas e ausência de recompensas duplicadas. Não há alteração de layout. Publicação não executada.

Publicar o módulo partilhado no frontend e os consumidores do servidor: `getPath`, `pathAction`, `onPathGame`, `onPathSummary`, `settlePaths`, `gameAction` e `feedbackAction` (estes dois recebem a sincronização de percursos). Não há alterações de regras ou índices.
