# AGENTS.md — PEACE POLICE: THE AFTERPARTY

Regras fixas do dono do jogo. **Prevalecem sobre tudo.** Lê também `GUIA-DO-PROJETO.md` (estado e registo de decisões), `docs/GDD.md`, `docs/matematica.md` e `docs/eventos.md`.

## Forma de trabalhar (decidida pelo dono, 03-11-2026)

- **O dono corre as simulações no terminal** (`npm run sim`) e lê os resultados. O agente não «dá» números de RTP sem uma corrida reproduzível (seed e versão).
- Quando o dono pede uma mudança, o agente muda as **tabelas** (`tabelas/*.js`) ou a **lógica** (`src/engine.js`). Depois **sobe `MATH_VERSION`** em `tabelas/versao.js`, acrescenta uma linha ao histórico, corre `npm test` e confirma com uma simulação rápida que tudo corre. Também atualiza `docs/matematica.md` e, se o design mudar, `GUIA-DO-PROJETO.md` §5 e `docs/GDD.md`.
- O simulador tem de continuar **autónomo**: `npm run sim` sem argumentos corre tudo (250 000 base, 250 000 hunt, 50 000 por compra), mostra todas as estatísticas e grava CSV e JSON.
- As tabelas ficam **separadas do código** e legíveis. `npm run tabelas` mostra-as.

## Contrato fixo (não se mexe para calibrar)

1. Grelha 3–5–5–5–3: 21 células, 4 Party Corners que podem abrir até 25.
2. Cluster Pays ortogonal, 4+, com cascatas. Diagonais não ligam (só o rasto do ALCOOL anda em diagonal).
3. 10 símbolos pagantes: N1–N5 (baixos, cada um ligado a uma personagem) e P1–P5 (personagens). Mais W, CW, DW e S.
4. Despertar = cluster 5+ de um premium. Uma vez por spin no jogo base; no bónus fica desperto até ao fim e volta a disparar a cada novo cluster 5+.
5. Cinco poderes com verbos distintos: LCD transforma, WEED cresce, MDMA junta, ALCOOL deixa rasto diagonal de wilds, COPIUM dá respin no fim. Cada um usa o seu símbolo baixo.
6. Party Mode = versão máxima de cada poder, dada pelo Joiner.
7. Cada despertar a partir do 2.º gera exatamente uma fusão (com o parceiro de rank mais forte). A fusão substitui o poder normal. 10 fusões.
8. Chemistry: 3 → abrem 2 cantos; 4 → abrem os restantes; 5 → Total Chemistry.
9. Os cantos abrem com um Wild de Canto multiplicador sticky que cresce com os prémios.
10. Peace Police: no máximo 1 por spin. O Calmer prende os baixos e fecha a escalada, sem nunca tirar prémios. O Joiner ativa o Party Mode e deixa cair o Distintivo.
11. Três bónus: 3 S AFTERPARTY, 4 S VIP AFTERPARTY, 5 S POLICE PARTY (Joiner em todos os spins). 10 free spins em todos.
12. Dentro de um cluster, os Wilds de Canto (e qualquer outra fonte que não o Joiner) somam; o Distintivo do Joiner multiplica essa soma (decisão do dono, 05-11-2026). O multiplicador de um cluster tem um teto por modo.
13. As probabilidades nunca dependem do saldo, das perdas ou do histórico do jogador.
14. O resultado nasce dos símbolos. É proibido sortear o prémio e depois fabricar a grelha.
15. Créditos fictícios. Português de Portugal. Na versão de uso privado, o dono autoriza bebidas, drogas e objetos de consumo na arte (decisão de 04-11-2026). Esta autorização visual não altera a matemática nem autoriza publicação ou distribuição.
16. RTP 97–98 % em cada modo (base, hunt e cada compra), com alvo de 98 % (decisão do dono, 04-11-2026). Volatilidade alta no jogo base; nos bónus, AFTERPARTY média, VIP alta e POLICE PARTY muito alta (decisão do dono, 04-11-2026). Ganho máximo 25 000× por jogada completa.
17. Compras dos 3 bónus. Aposta extra «MAIS SCATTERS» (2×, decisão do dono, 04-11-2026). Sem wilds naturais. Integração com o casino Peladinhas.
18. A tabela de pagamentos é design: valor base × curva comum, com as 4 regras de forma de `docs/matematica.md` §4. Nenhum cluster, de qualquer tamanho ou símbolo, paga menos de 0,10× no prémio base (decisão do dono, 05-11-2026). Calibra-se com probabilidades e multiplicadores, não com a tabela.

## Regras técnicas

- O motor (`src/`) não usa DOM, relógio, rede, `Math.random()` nem estado global entre jogadas. É determinístico: a mesma seed, o mesmo pedido e a mesma versão dão a mesma jogada.
- Os valores são inteiros em milésimos de aposta. Nada de somar floats para dinheiro.
- O simulador usa exatamente o mesmo `playRound` do jogo.
- Depois de mudanças de matemática: `npm test`, depois `npm run validate:rtp` (ou `npm run sim`), e apresentar a tabela de RTP por modo com a amostra e o intervalo. Nunca escrever «RTP confirmado» nem «certificado».
- As seeds de validação não podem ser as mesmas da calibração.

## Escrita dos textos

- Não usar ponto e vírgula como substituto de vírgulas nos textos do jogo e da documentação. Usar vírgulas ou frases separadas conforme o sentido. Esta regra não se aplica aos terminadores de instruções do código.
