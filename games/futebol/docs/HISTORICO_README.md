# Motor de slot e simulador

> Celebrações de ganho implementadas: Golo / Belo Golo / Golaço sem overlay; contador monetário progressivo a partir de 15× com nomes e efeitos por escalão. Sons sintetizados opcionais. [Funcionamento e limiares](docs/ANIMACOES_DE_GANHO.md).
> Atualização vigente: **0.5.0**. Três Scatters nos dois bónus atribuem +5 FS; contador de FS sob o global; festejo por clique ou 10 s. [Regras, frequência proposta e restauro](docs/RETRIGGER_0_5_0.md). Esta atualização prevalece sobre as notas históricas abaixo. RTP atual não medido.
> Configuração atual: **0.4.0**, com global persistente entre FS da mesma ronda. RTP não medido nem recalibrado por pedido do utilizador. As medições 0.3.1 abaixo são históricas. Ver [atualização 0.4.0](docs/ATUALIZACAO_0_4_0.md).
Motor TypeScript, CLI e GUI para créditos fictícios. Node.js 24.16 ou posterior executa os ficheiros TypeScript diretamente. A primeira amostra artística **Futebol de Bairro — Noite de Glória** já está integrada: cenário, dez símbolos ilustrados, interface temática e primeiras animações. A GUI usa Vite, HTML e CSS; o motor continua independente da apresentação.

## Abrir a versão de teste

```powershell
npm.cmd install
npm.cmd run dev
```

Abrir **http://127.0.0.1:5173/** no mesmo computador. O servidor escuta apenas no endereço local. Para parar, usar Ctrl+C no terminal que o iniciou. Para compilar: `npm.cmd run build`.

Inclui SPIN, aposta de 0,20 a 10, velocidades normal/rápida/super-rápida, compras dos dois bónus, FS automáticos ou manuais, histórico paginado e detalhe por spin, regras e preferências. Começa com 1 000 créditos fictícios; nas definições é possível adicionar créditos, exportar ou repor a sessão quando não há ronda ativa.

A GUI ocupa um ecrã único com tabuleiro central e controlos integrados, sem scroll de página. Histórico, definições, regras, Último spin e RTP / sessão abrem como sobreposições. O botão ⛶ permite ecrã inteiro quando suportado. Funciona em computador e telemóvel nas duas orientações. O tabuleiro antes da primeira jogada é uma apresentação identificada; não gera prémios nem consome aleatoriedade.

Assets em `public/assets/football/`. Prompts, manifesto e estado da produção em [docs/art/PRODUCAO.md](docs/art/PRODUCAO.md). Esta amostra usa masters PNG e efeitos de código; rigs, áudio e otimização por atlas continuam pendentes.

Saldo, histórico, bónus e sequência RNG são guardados neste browser e endereço. Recarregar continua os FS pendentes. Usar sempre `127.0.0.1:5173` para aceder à mesma sessão. Existem sons de vitória sintetizados; não há servidor de jogo; os dados locais podem ser alterados pelo utilizador. As velocidades alteram apenas a apresentação.

## Preparação do servidor e da GUI

- [Continuidade no servidor](docs/SERVIDOR.md): seed, RNG/contador por jogador, transações, idempotência, recuperação e contrato do serviço.
- [GUI fase 1](docs/GUI_FASE_1.md): estrutura genérica, estados dos botões, aposta, velocidades, preferências, histórico e prémios altos.
- [Tema e produção artística](docs/TEMA.md): Futebol de Bairro — Noite de Glória; símbolos, cenários, HUD, bónus, animações, inventário de assets e prompts de design.

A GUI e o histórico persistido local estão implementados. O documento de servidor continua a ser uma especificação para a integração futura.

## Instalação e verificação

```powershell
npm.cmd install
npm.cmd run check
npm.cmd test
```

No Windows, `npm.cmd` evita depender da permissão para executar scripts PowerShell. TypeScript e tipos de Node são dependências de desenvolvimento; a CLI não precisa de bibliotecas de execução externas.

## Utilização

```powershell
# Spin isolado; mostra o estado de eventual bónus, mas não o executa
npm.cmd run cli -- spin --bet 0.20 --seed exemplo

# Ronda paga completa, incluindo eventual bónus natural
npm.cmd run cli -- round --bet 0.20 --seed exemplo --output reports/ronda.json

# Bónus comprados completos
npm.cmd run cli -- buy --mode normal --bet 0.20 --seed exemplo
npm.cmd run cli -- buy --mode superior --bet 0.20 --seed exemplo

# Simulações: --spins é um alias de --rounds e conta RONDAS completas
npm.cmd run cli -- simulate --mode base --rounds 1000000 --bet 0.20 --seed validation-base-v022 --output reports/base.json
npm.cmd run cli -- simulate --mode normal --rounds 100000 --bet 0.20 --seed validation-normal-v022 --output reports/normal.json
npm.cmd run cli -- simulate --mode superior --rounds 100000 --bet 0.20 --seed validation-superior-v022 --output reports/superior.json

# Tabuleiro manual, modo de depuração com poderes ativos
npm.cmd run cli -- evaluate --mode superior --board examples/board.json --bet 0.20 --seed exemplo
```

Exemplo do formato de saída de um spin:

```text
Modo: base | aposta: 0.20 | pagamento: ... | antes do teto: ...
Inicial
N1 N2 N3 N4 P1 P2
...
Final
...
Roubos: [...]
Poderes: [...]
Linhas: [...]
Próximo estado: {...}
```

`evaluate` resolve o tabuleiro fornecido, incluindo aleatoriedade dos poderes. Não simula um sorteio desse tabuleiro. Não deve ser usado para medir frequências. Aceita JSON com quatro listas de seis símbolos ou uma lista plana com 24 símbolos.

## Estrutura e utilização do motor

| Ficheiro | Responsabilidade |
|---|---|
| `src/config.ts` | Parâmetros versionados e validação |
| `src/random.ts` | Interface RNG e implementação reproduzível |
| `src/board.ts` | Geração e validação dos símbolos |
| `src/powers.ts` | Roubo e resolução dos quatro poderes |
| `src/evaluate.ts` | Avaliação das 40 linhas |
| `src/settlement.ts` | Pagamento exato, arredondamento e teto |
| `src/engine.ts` | Um spin e progressão da ronda/bónus |
| `src/simulate.ts` | Estatísticas incrementais e relatórios |
| `src/cli.ts` | Argumentos, terminal e ficheiros |

```typescript
import {config} from './src/config.ts';
import {round, spin, start} from './src/engine.ts';
import {SeededRandom} from './src/random.ts';

const rng = new SeededRandom('exemplo');
const result = round('superior', 20, rng, config, true);
// Aposta em cêntimos de crédito: 20 = 0,20.
// false no último argumento evita reter os registos detalhados dos spins.
const first = spin(start('base'), 20, new SeededRandom('isolado'));
// Para continuar um bónus natural: spin(first.next, 20, mesmoRng), até done.
```

O chamador mantém o estado devolvido e deve preservar a aposta de referência e a instância RNG ao continuar a mesma ronda. `round` faz isso automaticamente. O motor não gere carteira; devolve o custo a descontar e o pagamento a creditar.

## Configuração e reprodução

Alterar parâmetros em `src/config.ts`, incrementar a versão, atualizar a documentação matemática e executar testes e novas simulações. Para experiências por código, usar `structuredClone(config)` e passar a configuração explicitamente a `round`/`simulate`.

O RNG usa hash FNV-1a da seed seguido de Mulberry32 (operações de 32 bits). É destinado à simulação reproduzível, não é criptográfico. O relatório guarda versão, hash SHA-256 de toda a configuração, seed e estado final do RNG. Reproduzir exige a mesma configuração, algoritmo, aposta, modo e quantidade de rondas. `SeededRandom.restore` permite retoma por estado e é usado na GUI; a CLI continua a reproduzir desde a seed.

## Verificação da GUI

`npm.cmd run check`, `npm.cmd test` e `npm.cmd run build` validam tipos, motor/sessão e compilação. `npm.cmd run test:gui` executa os testes Playwright de browser (requer Chromium instalado por `npx.cmd playwright install chromium`, ou caminho no ambiente `PLAYWRIGHT_CHROMIUM_EXECUTABLE`). Os testes iniciam Vite automaticamente se não existir um servidor na porta 5173.

## Pagamentos e estatísticas

Os pagamentos das linhas usam centésimos de multiplicador. Na versão ativa 0.4.0 há fatores fixos por modo: base ×2,72, normal ×11,77 e superior ×3. P4 soma incrementos ao global inicial ×1; P3 converte uniformemente de 2 a 10 normais em P3; P1 conserva ×2 e multiplica esse fator pelo global nas linhas que usam o wild (ex.: ×2 × ×5 = ×10). Mantém-se o limite local ×8 por linha. O roubo inclui cima, baixo, esquerda e direita, sem diagonais. Os fatores são públicos e estáticos, sem adaptação ao histórico.

Pagamento de cada spin em cêntimos:

```text
floor(soma_dos_centésimos_das_linhas × aposta_em_cêntimos × fator_em_basis_points / 1 000 000)
```

Depois aplica-se o teto restante da ronda. Multiplicadores locais e globais estão incluídos na soma das linhas. O detalhe exporta o fator separado; os valores `hundredths` das linhas são anteriores a esse fator.

RTP é total pago dividido pelo custo total. Uma compra normal de aposta 0,20 custa 18 créditos; a superior custa 44. O teto continua a ser 10 000× a aposta de referência. Não confundir retorno de 5× a aposta com lucro numa compra de 90×.

Cada ronda completa é uma amostra estatística. Médias e variâncias usam Welford; pagamentos totais e soma dos quadrados usam BigInt e são exportados como strings. Histograma e contadores não retêm rondas individuais. Quantis são intervalos do histograma, não valores pontuais exatos.

O IC95 usa aproximação normal da média por ronda. Não prova RTP teórico nem resolve sozinho uma cauda rara; usar mais amostras e seeds independentes. As frequências dos scatters em relatórios de compras são zero porque essas modalidades não geram scatters.

Ver `docs/DECISOES.md` para interpretações e `reports/RESUMO.md` para resultados iniciais e da calibração pedida. A documentação original de 96% foi preservada como referência histórica; a meta atual é 60–70%, com alvo central de 65%.
