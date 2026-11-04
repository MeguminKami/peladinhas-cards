# Para o próximo agente — PEACE POLICE: THE AFTERPARTY

Estado em 04-11-2026. Lê primeiro, por esta ordem: `GUIA-DO-PROJETO.md`, `AGENTS.md`, `docs/estrutura-ui.md`, `docs/eventos.md`, `docs/matematica.md` (§4, §16, §17) e `README.md`.

## Onde estamos

| Fase | Estado |
|---|---|
| 0 — Design | ✅ `docs/GDD.md` (V2.3) |
| 1 — Matemática e motor | ✅ `pp-v6`, em afinação pelo dono (`npm run sim`) |
| 2 — GUI de teste | ✅ entregue e revista pelo dono (`npm run dev` → `game.html`, `?debug=1`) |
| 3 — Visuais e animações | ⏳ **próxima, preparada**: `docs/fase3/` (plano com 3 agentes, perfil do jogo, inventário da arte); referências do dono em `INSPIRATION/` |
| 4 — Som e música | ⏳ (`guides/4-SOM-E-MUSICA.md`, input §7.4) |

## Decisões recentes do dono (já no motor e nos documentos)

- **Os wilds contam por inteiro**: basta 1 símbolo real num cluster (`clusterMinimoReais = 1`); um cluster só de wilds não paga.
- **HOLD wild**: W que fica no tabuleiro até entrar num prémio e depois sai com o cluster (rasto do SLOW DISASTER, W presos em grupos do WEED que pagam noutro cluster). CW e Distintivo ficam até ao fim do spin.
- `pp-v6` (04-11-2026): fusão surpresa em 3 % dos spins do jogo base e do MAIS SCATTERS; alvo de RTP 98 %; Scatter do jogo base mais raro; MAIS SCATTERS a 2× com mais Scatters; compras 160× / 336× / 830×. RTP medido em `docs/matematica.md` §16.
- `pp-v5` (04-11-2026): tabela de pagamentos fixa de design (4 regras de forma validadas no arranque; calibra-se com probabilidades e multiplicadores, nunca com a tabela); ganho máximo 25 000×; volatilidade por bónus (AFTERPARTY média, VIP alta, POLICE PARTY muito alta); compras 161× / 336× / 836×. RTP e volatilidade em `docs/matematica.md` §16.
- Recalibração `pp-v4` (04-11-2026): nenhum prémio abaixo de 0,10×; colunas 18–20, 21–24 e 25 na tabela; menos wilds do ALCOOL, SLOW DISASTER e TOTAL MAYHEM; compras 61,5× / 160× / 864×. RTP medido em `docs/matematica.md` §16.
- Ecrã: coluna esquerda = compras, MAIS SCATTERS e Peace Police (no bónus passa a ser o **registo do free spin**, limpo em cada spin); palco ao centro com néon **PARTY MODE · ON/OFF**; cartas de Chemistry à direita com a dica do próximo nível; barra do kit com SALDO | GANHO | **APOSTA**.
- **O registo do bónus tem de ser visual, não texto, na Fase 3** (nota do dono).
- Integração no casino Peladinhas: **ainda não** (decisão do dono). A lógica da carteira está pronta em `ui/carteira-local.js`.

## Regras de trabalho (do dono)

- Não alterar a matemática (`src/`, `tabelas/`) sem perguntar. Se mudar: subir `MATH_VERSION`, histórico, `npm test`, simulação rápida, documentos.
- O dono corre as simulações; não dar números de RTP sem corrida reproduzível (seed + versão).
- A barra de controlos é a do kit (`guides/kit` = `games/guias-slot/kit`): não editar a cópia em `ui/kit/`; `npm run verificar:kit`.
- A interface só apresenta eventos: nunca sorteia, calcula prémios nem compara grelhas (`ui/modelo.js`, testado em `tests/modelo.test.js`).
- Português de Portugal. Créditos fictícios.

## Comandos

```text
npm test            motor, carteira e modelo da interface
npm run test:ui     testes de browser (Playwright, ~6 min; capturas em test-results/)
npm run dev         http://127.0.0.1:4177/  (game.html, ?debug=1, carteira.html, site.html, pc.html, telemovel.html)
npm run sim         simulação completa
```

## Pendentes conhecidos

- Decisões D5–D8, D12, D13 por aprovar (`docs/matematica.md` §17).
- O aviso de ganho máximo só foi testado com uma fixture sintética.
- `npm run test:ui` precisa do browser do Playwright 1.64 (`npx.cmd playwright install chromium`, com autorização do dono).
- Nada da Fase 1/2 está commitado: pedir ao dono antes do primeiro commit.

## Fase 3: como começar

Tudo está em `docs/fase3/`:

| Ficheiro | Para quê |
|---|---|
| [PLANO-FASE-3.md](docs/fase3/PLANO-FASE-3.md) | Equipa de 3 agentes (A coordenador gráfico, B arte, C interface e animação), quem mexe em quê, etapas com aprovação do dono, **prompts** |
| [PERFIL-DO-JOGO.md](docs/fase3/PERFIL-DO-JOGO.md) | Identidade, tom, pilares visuais, paleta, personagens, modos, momentos-chave, o que não queremos |
| [INVENTARIO-ARTE.md](docs/fase3/INVENTARIO-ARTE.md) | Todas as peças que precisam de arte ou animação, com ID, tamanhos e responsável |

As referências do dono ficam em `INSPIRATION/` (só leitura, nunca publicadas). O prompt para abrir o coordenador gráfico está em `docs/fase3/PLANO-FASE-3.md` §5.1.
