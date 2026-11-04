# Plano da Fase 3: arte e animação, com três agentes

Preparado em 04-11-2026, no fim da Fase 2 (matemática `pp-v6`). O dono deixa as referências em `INSPIRATION/`. Todo o trabalho dos agentes fica fora dessa pasta.

## 1. A equipa

| Agente | Papel | O que entrega |
|---|---|---|
| **A — Coordenador gráfico** (o agente que o dono abre) | Dono da direção visual. Lê as inspirações, escreve a bíblia, decide, revê, integra e testa. **Única pessoa que fala com o dono** e que faz commits | `docs/TEMA.md`, `docs/visuais-animacoes.md`, o inventário atualizado, aprovações, integração final, `tests/art.browser.js`, o relatório |
| **B — Arte** | Gera e acaba todas as imagens raster com o bloco de estilo de A | `art-src/` (masters PNG), `ui/art/` (WebP publicados), `ui/art/manifest.json`, `docs/art/prompts.md` |
| **C — Interface e animação** | Pele da interface e uma animação por evento, sobre a arte de B | `ui/fx-visual.js`, `ui/theme.css`, `ui/presentation.css`, `ui/tema-barra.css` (só `--deck-*`), sprite SVG, `ui/fonts/`, registo visual do bónus, carregamento com progresso |

B e C trabalham **em paralelo**, cada um na sua sessão. A coordena: dá-lhes as tarefas por lotes, revê o que entregam e junta tudo.

## 2. Quem mexe em quê (para dois agentes nunca editarem o mesmo ficheiro)

| Caminho | A | B | C |
|---|---|---|---|
| `INSPIRATION/` | só lê | só lê | só lê |
| `docs/TEMA.md`, `docs/fase3/*`, `docs/visuais-animacoes.md` | escreve | lê | lê |
| `art-src/`, `ui/art/`, `ui/art/manifest.json`, `docs/art/prompts.md` | revê | **escreve** | lê |
| `ui/fx-visual.js`, `ui/theme.css`, `ui/presentation.css`, `ui/tema-barra.css`, `ui/fonts/`, `ui/icons.svg` | revê | — | **escreve** |
| `game.html`, `ui/app.js`, `ui/layout.css`, `ui/base.css`, `ui/regras.js`, `ui/texto.js` (apresentação) | escreve ou aprova | — | escreve **com aprovação de A** |
| `tests/art.browser.js` e restantes testes | escreve | — | ajuda |
| `src/`, `tabelas/`, `ui/kit/`, `ui/session.js`, `ui/modelo.js`, `ui/tempo.js`, `ui/carteira-*` | **ninguém** sem o dono aprovar | — | — |

- **Os três trabalham na mesma pasta** (`games/piece-police`). Não se usam worktrees: o projeto tem trabalho por commitar das Fases 1 e 2, e um worktree começaria sem ele.
- **Só A faz commits**, e só com o OK do dono.
- B e C não trocam de branch nem fazem commits.
- Se B ou C precisarem de mudar um ficheiro de outro, pedem a A.

## 3. Sequência e portas de aprovação

| Etapa | A | B | C | Porta |
|---|---|---|---|---|
| **0. Direção** | Lê `INSPIRATION/` e escreve o moodboard (o que se tira de cada referência e o que se rejeita). Escreve `docs/TEMA.md`: conceito, paleta HEX, materiais, luz, linha, tipografia, formas, personagens, modos e o **bloco de estilo** de 3–5 linhas. Esboça `docs/visuais-animacoes.md` | espera | espera | 🟢 **Dono aprova a bíblia** |
| **1. Amostra** | Integra a amostra no tabuleiro real e tira capturas (desktop, vertical, horizontal) | Amostra final: **SYM-N1, SYM-N4, SYM-P1, SYM-P5, SYM-W**, mais um retrato de carta (CHR-P5-PORT) | Pipeline: carregamento com `decode()` e progresso, `theme.css` com tokens, tema da barra, células a ler o manifesto, esqueleto de `fx-visual.js` | 🟢 **Dono aprova a amostra** |
| **2. Produção** (paralela, por lotes) | Revê cada lote contra a bíblia e a amostra, atualiza o inventário, pede correções | Lote 1: símbolos restantes, CW, DW, S, canto fechado · Lote 2: retratos, Alter Egos, Peace Police (4 estados) · Lote 3: cenários × 4, molduras do palco, logótipo, key art · Lote 4: emblemas (bónus, MAIS SCATTERS, 10 fusões), avisos, celebrações | Animações por grupos de eventos: spin/cascatas → prémios e escalões → poderes → fusões (+ surpresa) → Chemistry, cantos, Party Mode → Peace Police → bónus (entrada, retrigger, resumo, compra teatral, MAX WIN). Depois a pele: painéis, janelas, regras ilustradas, **registo visual do bónus** | 🟦 o dono vê capturas a cada lote |
| **3. Integração e QA** | `tests/art.browser.js`, capturas de todos os momentos-chave nos 3 desenhos, desempenho (`?perf=1`, CPU 4×), movimento reduzido, relatório final | Corrige o que A pedir | Corrige o que A pedir | 🟢 **Dono aprova a Fase 3** |

## 4. Regras que os três seguem

- `AGENTS.md` (o contrato), `guides/3-VISUAIS-E-ANIMACOES.md` (o guia técnico completo), `docs/fase3/PERFIL-DO-JOGO.md` e `docs/TEMA.md`.
- **Primeiro a amostra, depois a série.** Nenhum lote começa antes de a amostra estar aprovada.
- **Um prompt por peça**, sempre com o bloco de estilo. Os prompts guardam-se em `docs/art/prompts.md`.
- **Texto nunca em bitmap.** WILD, SCATTER, multiplicadores, preços e nomes vão em HTML.
- **Inspiração ≠ cópia.** Nada de personagens, marcas nem arte de terceiros. Nada de objetos de consumo (contrato 15).
- **A interface só apresenta eventos.** Não sorteia, não calcula e não muda a ordem dos eventos. Animações sempre através de `ui/tempo.js`. Só se animam `transform` e `opacity`.
- **Não publicar:** `INSPIRATION/`, `art-src/` (masters PNG), páginas de pré-visualização e rejeitados.
- **Antes de dar uma etapa por feita:** `npm test`, `npm run test:ui`, `npm run verificar:kit`. Se `npm run test:ui` não arrancar por falta do browser do Playwright, A pede ao dono para correr `npx.cmd playwright install chromium`.
- **Matemática:** não se altera. Se um efeito parecer precisar de mudar a lógica, A explica ao dono em vez de o fazer.

## 5. Prompts

### 5.1 Prompt para abrir o coordenador (A) — o dono cola isto numa sessão nova, na pasta `games/piece-police`

```text
Vamos fazer a Fase 3 (arte e animação) do Peace Police: The Afterparty, na pasta games/piece-police.
És o COORDENADOR GRÁFICO. Trabalhas com mais dois agentes em paralelo, que tu próprio abres e coordenas:
B (arte: todas as imagens) e C (interface e animação). Tu és o único que fala comigo e o único que faz commits.

Lê primeiro, por esta ordem:
1. PARA-O-PROXIMO-AGENTE.md
2. AGENTS.md (contrato fixo: prevalece sobre tudo)
3. docs/fase3/PLANO-FASE-3.md (equipa, quem mexe em quê, etapas, prompts de B e C)
4. docs/fase3/PERFIL-DO-JOGO.md (direção do jogo)
5. docs/fase3/INVENTARIO-ARTE.md (todas as peças que precisam de arte)
6. guides/3-VISUAIS-E-ANIMACOES.md (guia técnico)
7. docs/GDD.md (§02 símbolos, §03 poderes, §04 fusões, §05 cantos, §06 Peace Police, §07 bónus, §10 arte)
8. docs/estrutura-ui.md e docs/eventos.md
Depois vê TODAS as referências em INSPIRATION/ (só leitura).

Etapa 0 (só tu): escreve o moodboard e a bíblia visual em docs/TEMA.md, com o bloco de estilo de 3–5 linhas,
e esboça docs/visuais-animacoes.md com uma linha por evento. Mostra-me a bíblia e espera pela minha aprovação
antes de gerar imagens ou de abrir B e C.
Etapa 1: abre B e C, cada um numa sessão própria, com os prompts do §5.2 e §5.3 do plano (completa-os com o
bloco de estilo e o lote). Integra a amostra no tabuleiro real, tira capturas em desktop e telemóvel, e espera pela
minha aprovação.
Etapas 2 e 3: produção por lotes e QA, como no plano. Mostra-me capturas a cada lote.

Não alteres a matemática (src/, tabelas/), a sessão/carteira nem a barra do kit (ui/kit/) sem me perguntar.
Nada de objetos de consumo das substâncias, de marcas reais nem de cópias de outros jogos. Português de Portugal.
Antes de dares algo por feito: npm test, npm run test:ui e npm run verificar:kit.
```

### 5.2 Prompt do agente B (arte): A completa os campos e abre a sessão

```text
És o agente de ARTE da Fase 3 do Peace Police: The Afterparty (pasta games/piece-police).
O coordenador gráfico (A) dirige-te. Não falas com o dono e não fazes commits.

Lê: AGENTS.md, docs/fase3/PLANO-FASE-3.md (§2 diz em que ficheiros podes escrever), docs/fase3/PERFIL-DO-JOGO.md,
docs/TEMA.md (bíblia aprovada), docs/fase3/INVENTARIO-ARTE.md e guides/3-VISUAIS-E-ANIMACOES.md §1–§2.
Podes ver INSPIRATION/ (só leitura; inspiração, nunca cópia).

BLOCO DE ESTILO (repete em todos os prompts de imagem):
<A cola aqui o bloco de docs/TEMA.md>

LOTE ATUAL: <A cola aqui os IDs do inventário, p. ex. SYM-N1, SYM-N4, SYM-P1, SYM-P5, SYM-W, CHR-P5-PORT>

Regras:
- um prompt por peça, guardado em docs/art/prompts.md;
- master PNG em art-src/ e WebP publicado em ui/art/ (símbolos 320 px q88, emblemas 512 px, cenários q80);
- ui/art/manifest.json atualizado com ficheiro, papel, dimensões, alpha, ferramenta, prompt e licença;
- alpha verdadeiro, nada cortado na margem, sem halos; silhueta legível a 64 px;
- sem texto nas imagens (WILD, SCATTER, números e nomes vão em HTML);
- sem objetos de consumo, sem marcas, sem copiar personagens de terceiros;
- os rejeitados não ficam em ui/art/.
No fim do lote, entrega a A a lista de peças, os caminhos e as notas do que te parece mais fraco.
```

### 5.3 Prompt do agente C (interface e animação): A completa e abre a sessão

```text
És o agente de INTERFACE E ANIMAÇÃO da Fase 3 do Peace Police: The Afterparty (pasta games/piece-police).
O coordenador gráfico (A) dirige-te. Não falas com o dono e não fazes commits.

Lê: AGENTS.md, docs/fase3/PLANO-FASE-3.md (§2 diz em que ficheiros podes escrever), docs/fase3/PERFIL-DO-JOGO.md,
docs/TEMA.md, docs/visuais-animacoes.md, docs/fase3/INVENTARIO-ARTE.md, guides/3-VISUAIS-E-ANIMACOES.md §3–§6,
docs/estrutura-ui.md e docs/eventos.md.

TAREFA ATUAL: <A cola aqui o grupo de eventos ou as peças de interface, p. ex. «pipeline + spin/cascatas»>

Regras:
- trabalhas em ui/fx-visual.js, ui/theme.css, ui/presentation.css, ui/tema-barra.css (só variáveis --deck-*),
  ui/fonts/ e ui/icons.svg; app.js, layout.css, game.html e regras.js só com a aprovação de A;
- a interface só apresenta eventos: nunca sorteia nem calcula; tudo através de ui/tempo.js;
- só animas transform e opacity (nada de filter, box-shadow nem backdrop-filter em animação);
- Normal, Rápido, Ultra (coreografia própria) e movimento reduzido para cada evento;
- os toques que aceleram ou saltam funcionam a meio de qualquer animação;
- mantém os três desenhos (landscape, portrait, compact) sem scroll;
- o registo do bónus é visual (miniaturas, retratos, conta 3,40 × 4 = 13,60);
- não removas as chamadas a fx.audio; não edites ui/kit/ (npm run verificar:kit tem de passar).
Antes de entregares a A: npm test e npm run test:ui.
```
