# PEACE POLICE: THE AFTERPARTY — motor, tabelas, simulador e GUI de teste

Fase 1 (`guides/1-MATEMATICA-E-MOTOR.md`): motor puro em JavaScript (ES modules, sem build e sem dependências), tabelas editáveis e um simulador autónomo.
Fase 2 (`guides/2-GUI-DE-TESTE.md`): o jogo jogável com todas as funcionalidades e apresentação neutra (secção «GUI de teste» abaixo).

> Antes de qualquer coisa, lê `GUIA-DO-PROJETO.md` (estado e decisões), `docs/GDD.md` (design) e `AGENTS.md` (contrato fixo).

## Requisitos

Node.js 20 ou superior. Não há nada para instalar: não existe `npm install`. Só os testes de browser (`npm run test:ui`) precisam do Playwright, que já está no `node_modules` da raiz do repositório.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run sim` | **Simulação completa**: 250 000 spins base + 250 000 hunt + 50 000 de cada compra. Usa todos os núcleos e grava relatórios |
| `npm run sim -- --modo base` | Só um modo: `base`, `hunt`, `buy-afterparty`, `buy-vip`, `buy-police` ou `compras` |
| `npm run sim -- --spins 5000000 --compras 200000` | Amostras maiores (RTP mais preciso; demora mais ou menos 1 minuto num PC de 8 núcleos) |
| `npm run sim -- --seed teste1` | Seed fixa: a mesma corrida dá exatamente os mesmos números |
| `npm run sim -- --resumo` | Só a tabela de resumo |
| `npm run sim:rapido` | 25 000 / 5 000, para testar depressa |
| `npm run sim -- --modo buy-police --impacto` | **Quanto vale cada peça**: corre com tudo e depois sem cada peça (poderes, fusões, cantos, Joiner…), com a mesma seed, e mostra quanto RTP se perde sem cada uma |
| `npm run sim -- --desligar fusoes` | Corre a simulação normal com uma ou mais peças desligadas (`--desligar ajuda` lista-as). Só para análise |
| `npm run validate:rtp` | Corre a simulação e diz, modo a modo, se cumpre 97–98 % (sai com erro se não cumprir) |
| `npm run tabelas` | Mostra todas as tabelas em vigor (`-- --csv` exporta-as para `relatorios/tabelas/`) |
| `npm run round` | Mostra uma jogada passo a passo (`-- --procurar fusion:SLOW_DISASTER`, `-- --min-x 500`, `-- --modo buy-police`, `-- --grelhas`) |
| `npm run cenario -- <nome>` | Cenário de diagnóstico forçado (sem nome: lista todos) |
| `npm test` | Testes do motor |

## O que a simulação mostra

**No terminal:**
- **Resumo** de todos os modos:
  - RTP direto com intervalo de confiança a 95 % e **RTP decomposto** (base sem bónus + Σ frequência × valor medido nas compras);
  - σ, % de rondas com prémio e com ganho líquido;
  - × máximo, × mínimo pago, p99 e quantas vezes se bateu no máximo.
- **Por modo:**
  - distribuição dos prémios por escalões (frequência e parte do RTP de cada escalão) e percentis (p50 a p99,99);
  - bónus: frequência (1 em N), prémio médio, desvio, máximo e parte do RTP; nas compras, o **preço justo** para o RTP alvo;
  - funcionalidades: cascatas, despertares (total e por personagem), níveis de Chemistry, cada fusão, Peace Police (Calmer e Joiner), cantos, Total Chemistry, respins do COPIUM;
  - **valor médio por disparo** de cada poder e fusão;
  - **de onde vem o RTP**: cada prémio dividido por quem criou ou mexeu nas células (`natural`, poderes, fusões, `mult:CW`, `mult:DW`).

**Em ficheiros**, em `relatorios/<versão>/<data-hora>/`: `resumo.csv`, `histograma.csv`, `percentis.csv`, `bonus.csv`, `funcionalidades.csv`, `atribuicao.csv` e `relatorio.json` (tudo). Os CSV usam `;` e vírgula decimal, por isso abrem diretamente no Excel em português. `relatorios/ULTIMO.txt` aponta para a última corrida.

### «De onde vem o RTP» vs «--impacto»

A tabela «De onde vem o RTP» diz **quem pôs as células** de cada prémio e **quem multiplicou**. Não diz quanto se perde sem cada peça. Para isso usa `--impacto`, que compara o RTP com e sem cada peça. As peças dependem umas das outras (as fusões criam os clusters que os cantos multiplicam), por isso as percentagens não somam 100 %. Em `--impacto` usa compras (precisas) ou muitos spins no base (`--spins 2000000`).

### Ler o RTP com honestidade

Numa slot de volatilidade alta, o RTP de uma corrida oscila. Com 250 000 spins, a margem do jogo base é de cerca de ±5 a ±6 pp (o RTP decomposto ajuda pouco, porque o próprio jogo base tem cauda pesada). Para ±1 a ±2 pp são precisos cerca de 4 a 5 milhões de spins. As compras ficam bem medidas com 50 000. **Isto é medição local, não certificação.**

## Onde mexer

| Quero mudar… | Ficheiro |
|---|---|
| Pesos dos símbolos, empilhamento | `tabelas/simbolos.js` |
| Tabela de pagamentos | `tabelas/pagamentos.js` |
| Parâmetros dos poderes, fusões, Chemistry, cantos | `tabelas/poderes.js` |
| Peace Police (probabilidades, Distintivo) | `tabelas/peace-police.js` |
| Bónus, retrigger | `tabelas/bonus.js` |
| Custos, preços das compras, apostas, ganho máximo | `tabelas/jogo.js` |
| Versão da matemática | `tabelas/versao.js` (**sobe sempre** que algo mude) |
| Lógica (regras, poderes, fusões) | `src/engine.js` |

Depois de qualquer mudança: `npm test` e depois `npm run sim`. O motor valida as tabelas ao arrancar e recusa valores inválidos com uma mensagem clara (raridade fora de ordem, percentagens fora de 0–100, tabela incompleta, etc.).

## Organização

```text
tabelas/      valores editáveis (só dados)
src/          motor puro: config.js (validação), random.js (RNG xoshiro128**), engine.js (regras),
              scenarios.js (diagnóstico), simulation.js (métricas), index.js (API)
scripts/      simulate.js (+ sim-worker.js), round.js, tabelas.js, format.js
tests/        node --test
docs/         GDD.md (design), matematica.md (regras exatas e números), eventos.md (catálogo para a UI)
relatorios/   saída das simulações
guides/       pipeline das 4 fases (partilhado entre slots)
```

## GUI de teste (Fase 2)

```text
npm run dev              servidor local -> http://127.0.0.1:4177/
```

| URL | O que é |
|---|---|
| `/game.html` | O jogo, com 10 000 DJC de teste (recomeçam num separador novo; sobrevivem a um reload) |
| `/game.html?debug=1` | O jogo com o painel de diagnóstico: seed, cenários forçados, «procurar e jogar», passo a passo, registo de eventos, simulação rápida, desempenho |
| `/game.html?seed=texto` | Separador novo com uma seed fixa (jogadas reproduzíveis) |
| `/carteira.html` | Carteira simulada: o jogo em modo `HostSession`, com latência e falhas injetáveis (resposta perdida, rejeição, recarregar) |
| `/site.html` | O jogo por baixo de uma simulação do menu do site (86 px) |
| `/pc.html`, `/telemovel.html` | Molduras com tamanhos de PC e de telemóvel |

Atalhos: `npm run dev:debug`, `npm run dev:carteira`, `npm run dev:site`, `npm run dev:pc`, `npm run dev:telemovel`; `npm run dev:rede` para abrir no telemóvel na mesma rede Wi-Fi.

| Comando | O que faz |
|---|---|
| `npm test` | Testes do motor, da carteira e do modelo da interface (o modelo acompanha o motor em milhares de jogadas) |
| `npm run test:ui` | Testes de browser (Playwright): botões e janelas, teclado, jogadas, compras, retrigger, limite, cenários, reload a meio do bónus, autoplay, carteira simulada, 10 tamanhos sem scroll, consola limpa. Capturas em `test-results/`. `npm run test:ui -- tamanhos` corre só os que têm «tamanhos» no nome |
| `npm run verificar:kit` | Confirma que a barra de controlos é a do kit, sem alterações |

**O que publicar** (para o site): `game.html`, `ui/` (exceto `preview.*`, `site.css`, `carteira-simulada.*`) e `src/` + `tabelas/` (o motor importa as tabelas). Não publicar: `scripts/`, `tests/`, `docs/`, `relatorios/`, `guides/`, `pc.html`, `telemovel.html`, `site.html`, `carteira.html`, `index.html`, `test-results/`.

Estrutura, pontos de ligação para as Fases 3 e 4, máquina de estados e protocolo da carteira: `docs/estrutura-ui.md`.
