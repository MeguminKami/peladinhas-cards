# Simulacao retroativa semanal - 2026-10-26

Dados locais recolhidos em 2026-10-26T00:20:37.702Z. Nenhuma leitura cloud, escrita de dados ou publicacao.

Periodo de desempenho: 2026-10-21T17:00:00.000Z a 2026-10-28T18:00:00.000Z. Dois jogos fechados: 21 e 25 de outubro.

Compara recalculos com a mesma base, recompensas e ausencia de penalizacao por inatividade. A coluna comunidade remove votos submetidos com media inferior a 1.9/20. A coluna jogos ativa o motor de producao V2 apenas nos agregados dos jogos deste periodo, mantendo ordem e historico anterior. Datas simuladas nao sao guardadas nos jogos. Valores sao OVR finais arredondados, nao ganhos isolados por jogo nem confirmacao do estado publicado.

| Jogador | Jogos | Regras anteriores | So novos jogos | So comunidade | Combinado |
|---|---:|---:|---:|---:|---:|
| Pedro | 0 | 51 | 51 | 60 | 60 |
| Adão D. | 0 | 60 | 60 | 60 | 60 |
| Rocha | 0 | 62 | 62 | 67 | 67 |
| João Oliveira | 0 | 55 | 55 | 61 | 61 |
| Tomás | 1 | 72 | 72 | 77 | 77 |
| Martim | 0 | 64 | 64 | 67 | 67 |
| João | 1 | 70 | 70 | 70 | 70 |
| Vitor Rocha | 2 | 76 | 75 | 76 | 75 |
| Cardas | 2 | 68 | 66 | 68 | 66 |
| Capela | 2 | 76 | 76 | 76 | 76 |
| Sandro | 0 | 51 | 51 | 60 | 60 |
| Beatriz | 1 | 63 | 63 | 63 | 63 |
| Telmo Silva | 2 | 79 | 80 | 79 | 80 |
| Chabeca 🤫🧏‍♂️ | 1 | 68 | 66 | 72 | 71 |
| David Silva | 0 | 68 | 68 | 68 | 68 |
| Gormiti | 1 | 28 | 27 | 37 | 36 |
| J. Ferreira | 2 | 75 | 73 | 75 | 73 |
| Boda | 1 | 74 | 73 | 78 | 77 |
| IMA | 0 | 69 | 69 | 69 | 69 |
| Anão Ferreira | 0 | 51 | 51 | 66 | 66 |
| Gardn | 1 | 71 | 71 | 78 | 77 |
| André Meireles | 0 | 67 | 67 | 67 | 67 |
| Jonas | 1 | 81 | 81 | 81 | 81 |
| Carlos Costa | 2 | 72 | 72 | 72 | 72 |

Reproduzir offline: node scripts/simulate-week-retroactive.mjs. Requer os dois snapshots locais existentes em test-results/firestore-audits. Saida detalhada: test-results/weekly-retroactive-simulation.json.

O motor V2 entra em vigor em 26/10; esta simulacao nao altera essa transicao. Publicar ou recalcular a liga nao aplica V2 retroativamente aos jogos de 21/10 e 25/10. A exclusao de votos pode alterar a base e o replay de todo o historico atual; os aumentos grandes desta coluna nao sao recompensas pelos dois jogos. Semanas fechadas permanecem preservadas.
