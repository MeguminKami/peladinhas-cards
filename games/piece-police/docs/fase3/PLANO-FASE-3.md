# Plano da Fase 3: arte e animação, com três agentes

Preparado em 04-11-2026, no fim da Fase 2 (matemática `pp-v6`). O dono deixa as referências em `INSPIRATION/`. Todo o trabalho dos agentes fica fora dessa pasta.

> **Atualização do dono, 04-11-2026:** bíblia e referências das seis pessoas aprovadas («Aprovo tudo»). O dono permite bebidas, drogas e objetos de consumo na arte para uso privado, sem venda nem distribuição; esta decisão substitui as proibições correspondentes nos prompts históricos abaixo. Etapa 1 iniciada com B (seis folhas para revisão) e C (pipeline) em paralelo. Não dispensa aprovação das folhas e da amostra, não autoriza commits nem deploy.

> **Atualização seguinte:** seis folhas aprovadas pelo dono, com pedido de maior personificação das drogas sobretudo nos estados ativos. Iniciada a amostra final, seguindo `docs/TEMA.md` §6. A aprovação da amostra integrada continua pendente.

> **05-11-2026 — amostra aprovada:** o dono aprovou a amostra integrada («aprovo»). Produção por lotes 1–4 iniciada com B (arte) e C (interface/animações) em paralelo. A mostra capturas por lote; a próxima porta de aprovação é a Fase 3 integrada, após QA. Sem autorização de commit ou deploy.

> **05-11-2026 — produção e QA local concluídos:** quatro lotes, 63 IDs/60 WebP, 29 apresentações e 87 momentos capturados. [Relatório final](RELATORIO-FASE-3.md) com testes, pesos, resoluções nativas e medições CPU 4×. Aguarda revisão/aprovação final do dono. Sem commit ou deploy.

> **Revisão visual do dono, 05-11-2026:** fonte Oxanium local, correntes 3D nos cantos fechados, premium a preencher a célula com holografia suave, botões temáticos e utilitários no fundo do horizontal compacto. A palavra «Scatter» vermelho prismático na pulseira amarela/prata é uma exceção explícita à regra histórica de texto fora dos bitmaps.

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
| **0. Direção** | Lê `INSPIRATION/` e `docs/fase3/PESSOAS.md`. Pede ao dono a **autorização das pessoas** e, se faltarem, mais fotografias (o LCD tem só 240 px). Confirma que a ferramenta de imagem aceita **referências de rosto**. Escreve o moodboard (o que se tira de cada referência e o que se rejeita). Escreve `docs/TEMA.md` (Acidwave): conceito, paleta HEX, materiais, luz, linha, tipografia, formas, personagens, modos e o **bloco de estilo** de 3–5 linhas. Esboça `docs/visuais-animacoes.md` | espera | espera | 🟢 **Dono aprova a bíblia** |
| **1. Amostra** | Revê as folhas de personagem com o dono. Integra a amostra no tabuleiro real e tira capturas (desktop, vertical, horizontal) | Primeiro as **6 folhas de personagem** (CHR-*-SHEET, rostos das referências). Depois a amostra final: **SYM-N1, SYM-N4, SYM-P1, SYM-P5, SYM-W**, mais um retrato de carta (CHR-P5-PORT) | Pipeline: carregamento com `decode()` e progresso, `theme.css` com tokens, tema da barra, células a ler o manifesto, esqueleto de `fx-visual.js` | 🟢 **Dono aprova a amostra** |
| **2. Produção** (paralela, por lotes) | Revê cada lote contra a bíblia e a amostra, atualiza o inventário, pede correções | Lote 1: símbolos restantes, CW, DW, S, canto fechado · Lote 2: retratos, Alter Egos, Peace Police (4 estados) · Lote 3: cenários × 4, molduras do palco, logótipo, key art · Lote 4: emblemas (bónus, MAIS SCATTERS, 10 fusões), avisos, celebrações | Animações por grupos de eventos: spin/cascatas → prémios e escalões → poderes → fusões (+ surpresa) → Chemistry, cantos, Party Mode → Peace Police → bónus (entrada, retrigger, resumo, compra teatral, MAX WIN). Depois a pele: painéis, janelas, regras ilustradas, **registo visual do bónus** | 🟦 o dono vê capturas a cada lote |
| **3. Integração e QA** | `tests/art.browser.js`, capturas de todos os momentos-chave nos 3 desenhos, desempenho (`?perf=1`, CPU 4×), movimento reduzido, relatório final | Corrige o que A pedir | Corrige o que A pedir | 🟢 **Dono aprova a Fase 3** |

## 4. Regras que os três seguem

- `AGENTS.md` (o contrato), `guides/3-VISUAIS-E-ANIMACOES.md` (o guia técnico completo), `docs/fase3/PERFIL-DO-JOGO.md` e `docs/TEMA.md`.
- **Primeiro a amostra, depois a série.** Nenhum lote começa antes de a amostra estar aprovada.
- **Um prompt por peça**, sempre com o bloco de estilo. Os prompts guardam-se em `docs/art/prompts.md`.
- **Texto nunca em bitmap.** WILD, SCATTER, multiplicadores, preços e nomes vão em HTML.
- **Inspiração ≠ cópia.** Nada de personagens, marcas nem arte de terceiros. Bebidas, drogas e objetos de consumo permitidos na arte privada por decisão expressa do dono (contrato 15 atualizado).
- **A interface só apresenta eventos.** Não sorteia, não calcula e não muda a ordem dos eventos. Animações sempre através de `ui/tempo.js`. Só se animam `transform` e `opacity`.
- **Não publicar:** `INSPIRATION/`, `art-src/` (masters PNG), páginas de pré-visualização e rejeitados.
- **Antes de dar uma etapa por feita:** `npm test`, `npm run test:ui`, `npm run verificar:kit`. Se `npm run test:ui` não arrancar por falta do browser do Playwright, A pede ao dono para correr `npx.cmd playwright install chromium`.
- **Matemática:** não se altera. Se um efeito parecer precisar de mudar a lógica, A explica ao dono em vez de o fazer.

## 5. Prompts

### 5.1 Prompt inicial: o dono cola isto numa sessão nova do Claude Code, na pasta `games/piece-police`

```text
Vamos fazer a Fase 3 (arte e animação) do Peace Police: The Afterparty, na pasta games/piece-police.

PAPEL: és o COORDENADOR GRÁFICO (agente A). Trabalhas com mais DOIS agentes EM PARALELO, que tu próprio
abres como sessões separadas e coordenas:
  - B = ARTE: todas as imagens (folhas de personagem, símbolos, retratos, Alter Egos, cenários, logótipo,
    emblemas, celebrações);
  - C = INTERFACE E ANIMAÇÃO: pele da interface, tema da barra, fontes, ícones e uma animação por evento.
B e C trabalham ao mesmo tempo, cada um só nos seus ficheiros (tabela do §2 do plano). Tu és o único que fala
comigo, o único que aprova e o único que faz commits (sempre com o meu OK).

DIREÇÃO (decisões minhas):
  - Estilo ACIDWAVE NEON: néon ácido, flyers de rave anos 90/Y2K, cromados líquidos, gradientes ácidos,
    distorção psicadélica, halftone e grão.
  - Paleta: tangerine, royal blue, violet, raspberry pink, lime green, neon yellow, red orange, punk yellow,
    neon jade (HEX de partida e papel de cada cor em docs/fase3/PERFIL-DO-JOGO.md §4).
  - As personagens PERSONIFICAM as substâncias, mas continuam HUMANAS e têm o ROSTO das pessoas das
    fotografias em INSPIRATION/<PERSONAGEM>/ (mapa e regras em docs/fase3/PESSOAS.md). Rosto reconhecível e
    favorecido; nunca objetos de consumo (contrato 15).

LÊ PRIMEIRO, por esta ordem:
 1. PARA-O-PROXIMO-AGENTE.md
 2. AGENTS.md (contrato fixo: prevalece sobre tudo)
 3. docs/fase3/PLANO-FASE-3.md (equipa, quem mexe em quê, etapas, prompts de B e C)
 4. docs/fase3/PERFIL-DO-JOGO.md
 5. docs/fase3/PESSOAS.md
 6. docs/fase3/INVENTARIO-ARTE.md (todas as peças que precisam de arte)
 7. guides/3-VISUAIS-E-ANIMACOES.md (guia técnico)
 8. docs/GDD.md (§02 símbolos, §03 poderes, §04 fusões, §05 cantos, §06 Peace Police, §07 bónus, §10)
 9. docs/estrutura-ui.md e docs/eventos.md
Depois vê TODAS as imagens de INSPIRATION/ (só leitura; não alteres nada nessa pasta).

ETAPA 0 (só tu, antes de abrires B e C):
 - confirma comigo que cada pessoa das fotografias autoriza aparecer no jogo e pede-me as fotografias que
   faltarem (o LCD só tem uma de 240 px);
 - confirma que a ferramenta de imagem aceita fotografias de referência para manter os rostos;
 - escreve o moodboard e a bíblia visual em docs/TEMA.md, com o bloco de estilo Acidwave de 3–5 linhas;
 - esboça docs/visuais-animacoes.md com uma linha por evento;
 - mostra-me a bíblia e espera pela minha aprovação.
ETAPA 1: abre B e C EM PARALELO, cada um numa sessão própria, com os prompts do §5.2 e §5.3 do plano
(completa-os com o bloco de estilo e o lote). B começa pelas 6 folhas de personagem (aprovo-as eu) e depois a
amostra; C prepara o pipeline ao mesmo tempo. Integra a amostra no tabuleiro real, tira capturas em desktop e
telemóvel, e espera pela minha aprovação.
ETAPAS 2 e 3: produção por lotes em paralelo (B arte, C animação) e QA, como no plano. Mostra-me capturas
a cada lote e mantém o inventário atualizado.

Não alteres a matemática (src/, tabelas/), a sessão/carteira nem a barra do kit (ui/kit/) sem me perguntar.
Nada de objetos de consumo, de marcas reais nem de cópias de outros jogos. Português de Portugal.
Antes de dares algo por feito: npm test, npm run test:ui e npm run verificar:kit.
```

### 5.2 Prompt do agente B (arte): A completa os campos e abre a sessão

```text
És o agente de ARTE da Fase 3 do Peace Police: The Afterparty (pasta games/piece-police).
O coordenador gráfico (A) dirige-te. Não falas com o dono e não fazes commits.

Lê: AGENTS.md, docs/fase3/PLANO-FASE-3.md (§2 diz em que ficheiros podes escrever), docs/fase3/PERFIL-DO-JOGO.md,
docs/TEMA.md (bíblia aprovada), docs/fase3/INVENTARIO-ARTE.md e guides/3-VISUAIS-E-ANIMACOES.md §1–§2.
Podes ver INSPIRATION/ (só leitura; inspiração, nunca cópia). Lê também docs/fase3/PESSOAS.md: as personagens
são HUMANAS com o ROSTO das fotografias da pasta de cada uma (gera sempre com a fotografia como referência,
preserva as feições, favorece, tira logótipos de roupa). Começa pelas folhas de personagem.

BLOCO DE ESTILO (repete em todos os prompts de imagem):
<A cola aqui o bloco de docs/TEMA.md>

LOTE ATUAL: <A cola aqui os IDs do inventário, p. ex. SYM-N1, SYM-N4, SYM-P1, SYM-P5, SYM-W, CHR-P5-PORT>

Regras:
- um prompt por peça, guardado em docs/art/prompts.md;
- master PNG em art-src/ e WebP publicado em ui/art/ (símbolos 320 px q88, emblemas 512 px, cenários q80);
- ui/art/manifest.json atualizado com ficheiro, papel, dimensões, alpha, ferramenta, prompt e licença;
- alpha verdadeiro, nada cortado na margem, sem halos; silhueta legível a 64 px;
- sem texto nas imagens (WILD, SCATTER, números e nomes vão em HTML);
- estilo ACIDWAVE NEON e a paleta de docs/TEMA.md;
- sem objetos de consumo (as personagens personificam pela atitude, cor e poder), sem marcas, sem copiar terceiros;
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

## 6. Está tudo pronto para começar?

| Item | Estado |
|---|---|
| Matemática fechada (`pp-v6`, testes a passar) | ✅ |
| GUI de teste com todos os eventos e cenários forçados (`?debug=1`) | ✅ |
| Perfil, paleta Acidwave, pessoas, inventário, plano, prompts | ✅ `docs/fase3/` |
| Referências com rosto para as 6 personagens | ✅ em `INSPIRATION/` (o **LCD** tem só 240 px: pedir mais) |
| Autorização das pessoas das fotografias | ✅ confirmação solicitada e aprovada pelo dono em 04-11-2026 |
| Ferramenta de imagem com referência de rosto | ✅ ferramenta integrada ImageGen aceita referências; fidelidade a rever nas folhas |
| Commit das Fases 1 e 2 (ponto seguro antes de 3 agentes mexerem na mesma pasta) | ⏳ recomendado antes de começar |
| `npm run test:ui` direto (browser do Playwright 1.64) | ⏳ `npx.cmd playwright install chromium` |
