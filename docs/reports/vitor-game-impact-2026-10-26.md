# Vitor Rocha · impacto do jogo · 26/10/2026

Análise offline dos snapshots recolhidos em 26/10/2026 às 00:20 UTC. Nenhuma nova leitura cloud ou alteração de dados reais. Os valores abaixo são um recálculo local com o código atual e a política recolhida, não uma nova confirmação da carta publicada.

## Conclusão

Na Peladinha Matinal, Vitor tem 6 golos, 1 assistência e vitória por 7 golos. A média apresentada sem GR é 3,9167. O jogo aumenta todos os atributos no recálculo. As quatro descidas face à carta anterior resultam de uma base comunitária inferior, após passar de 11 para 13 avaliações externas, que absorve os ganhos do jogo.

| Atributo | Base anterior → atual | Ganho exato do jogo | Carta anterior → recálculo atual |
| --- | --- | ---: | --- |
| Velocidade | 82 → 77 | +2,8964 | 84 → 82 |
| Finalização | 79 → 75 | +3,5000 | 79 → 80 |
| Drible | 84 → 79 | +3,5000 | 84 → 82 |
| Defesa | 57 → 54 | +2,1988 | 58 → 57 |
| Posicionamento | 75 → 72 | +2,1988 | 76 → 75 |

Os valores finais incluem jogos anteriores, recompensas e arredondamento; não são simplesmente a base mais o último jogo. Removendo apenas os dois votos externos novos e mantendo os restantes dados atuais, o OVR recalculado passa de 76 para 78. Esta simulação não recupera versões antigas de votos editados.

## Comparação com as equipas

Por dimensão, a referência de avaliação é `0,70 × (nota − 3) + 0,30 × (nota − média dos colegas) + 0,20 × (nota − média adversária)`. São coeficientes que se somam, não percentagens normalizadas de uma média. A comparação usa cada dimensão; não usa a média de 3,9 para todos os atributos. Desempenho geral entra na média apresentada, mas não alimenta diretamente um atributo no mapeamento atual.

Vitor tem ataque 4,5 contra 3,375 dos colegas e 3,0333 dos adversários; a comparação favorece-o. Em defesa, tem 3,1667 contra 3,5 e 2,7667: o pequeno efeito líquido negativo reduz o ganho de +2,2540 para +2,1988. Em velocidade, o ganho sobe de +2,4794 para +2,8964 com as comparações; em finalização e drible mantém-se +3,5 por atingir o limite aplicável. A simulação sem comparações também neutraliza mecanismos dependentes de vantagem relativa.

Existe uma regra mais abrupta: numa vitória, ficar mais de 0,5 estrelas abaixo dos colegas, ou ter menos de 2,5 nessa dimensão, zera o delta dessa dimensão mesmo com bónus individuais. Não provoca perdas nessa vitória, mas pode anular ganhos e golos não ultrapassam essa condição. Vitor não atravessa esse limiar em nenhuma dimensão deste jogo.

## Limites relevantes

A política recolhida define velocidade 2,3, ganho máximo 5 e perda máxima 0,25. O limite de ganho real difere do valor inicial 4 referido em exemplos da documentação. Os ganhos são depois multiplicados por 0,7 entre 75 e 85, 0,4 entre 85 e 90 e 0,12 a partir de 90. Abaixo de 75, a parcela acima de +3 exige nota superior a 4 e vantagem relativa.

O bónus de finalização atinge o teto aos 5 golos: `min(0,9, golos × 0,725 × 0,25)`, com multiplicador de vitória limitado a 1,25. Assim, os 6 golos produzem +1,125 no delta bruto de finalização; o sexto já não aumenta esse bónus. Uma assistência dá +0,271875 bruto em passe e os 7 envolvimentos dão +0,634375 bruto em drible. Estes valores são componentes do cálculo, antes da velocidade, limites e patamares; não são pontos finais garantidos na carta.

Ferramenta reutilizável offline: [`audit-player-game-impact.mjs`](../../scripts/audit-player-game-impact.mjs). Executar `node scripts/audit-player-game-impact.mjs "Vitor Rocha"` com os snapshots locais das auditorias anteriores. O código da aplicação não foi alterado nesta análise.
