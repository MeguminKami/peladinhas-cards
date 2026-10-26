> Histórico. Atual: [4.14](./RTP-v4.14.md).

> Histórico. Preços fixos e bónus reforçados: [4.14](./RTP-v4.14.md).

# RIFT//CORE 4.13 — ways primeiro, comprimento moderado, sem multiplicador de cascata

Resultados locais de 2026-10-26, aposta-base 0,10. Sem leituras cloud nem deploy.

## Regra de pagamento e exemplos

**Prémio = ways × valor por way para o comprimento × aposta-base × global CORE.**

A cascata apenas remove e repõe símbolos: nas novas rondas, o fator cm é sempre 1. O global dos bónus continua a crescer segundo as regras de cada modo. Normal e Hunt continuam sem poderes.

| Símbolo | 3 colunas | 4 colunas | 5 colunas | 6 colunas |
|---|---:|---:|---:|---:|
| Mais fraco | 0,10× | 0,125× | 0,15× | 0,20× |
| Mais forte | 0,70× | 0,875× | 1,05× | 1,40× |

Valores **por way**. Fatores relativos dos dez símbolos: 1; 1,1; 1,2; 1,3; 1,4; 1,8; 2,5; 3,5; 5; 7. O mínimo por way é 0,1×; para as mesmas ways, seis colunas pagam o dobro de três. O comprimento já não provoca uma diferença de dezenas de vezes.

- 3 ocorrências em cada uma das primeiras 3 colunas: **3×3×3 = 27 ways**, não 9.
- Símbolo fraco, 27 ways em 3 colunas, aposta 0,10, global 11: **27×0,10×0,10×11 = 2,97**.
- As mesmas 27 ways em 6 colunas, por exemplo 3×3×3×1×1×1: **27×0,20×0,10×11 = 5,94**.
- Uma única way fraca em 3 colunas com aposta 0,10 e global 1: **0,01**, correspondendo a **0,1× a aposta**.

Os pagamentos continuam arredondados a cêntimos por avaliação; os grupos visuais somam exatamente o valor creditado. O cap de 25000× aplica-se à ronda inteira.

## Auditoria das ways

A multiplicação 3×3×3 já produzia 27 no avaliador anterior. Foi corrigido um problema distinto: quando um prefixo só de Wilds se prolongava com um símbolo natural, podia ainda receber um prémio adicional de comprimento menor. Agora a combinação prolongada não recebe esse prémio curto duplicado. Cada símbolo mantém apenas a maior extensão válida; caminhos só de Wilds sem extensão pagam uma vez, pela melhor interpretação.

Os testes incluem contagens explícitas de 27 e 125 ways, colunas interrompidas, distribuição 3×3×3×1×1×1, prefixos Wild com/sem extensão e **1000 grelhas mistas verificadas por enumeração independente dos caminhos**. O modo rápido usado nas simulações é comparado com o mesmo resultado. Outros testes confirmam cm=1 em Normal, Hunt e nos três bónus, e a fórmula visível de 27 ways/global 11 em 320/390/768/1440 px.

## RTP principal e compras

| Modalidade | RTP estimado | IC95% aproximado | Amostra |
|---|---:|---:|---|
| Normal | 95,65% | 95,26–95,95% | 1 000 000 de spins pagos + expectativa de FS |
| Hunt | 95,78% | 95,29–96,04% | 1 000 000 de spins pagos + expectativa de FS |
| Compra CORE | 95,96% | 94,74–97,18% | 50 000 rondas completas independentes |
| Compra RIFT | 94,66% | 93,66–95,65% | 50 000 rondas completas independentes |
| Compra OVERDRIVE | 96,60% | 95,72–97,48% | 50 000 rondas completas independentes |

Preços: **4,4× / 16,6× / 148,1×**, respetivamente. São novos preços para o novo modelo; não se deve reutilizar o preço antigo com esta tabela.

As estimativas pontuais estão entre 94–98%; não é certificação. O intervalo do RIFT estende-se abaixo de 94%. As medições são para aposta 0,10; arredondamento a cêntimos pode variar com a aposta.

## Conferência com rondas naturais completas

Foi executada uma segunda simulação independente, **250 000 rondas completas em cada modo**, jogando todos os FS e retriggers de cada bónus natural, antes de iniciar a ronda paga seguinte:

| Modo | RTP medido | IC95% aproximado | FS jogados |
|---|---:|---:|---:|
| Normal | 96,44% | 94,37–98,51% | 4 988 |
| Hunt | 96,56% | 95,23–97,89% | 13 804 |

São amostras distintas da estimativa principal e compatíveis com a sua incerteza. Não se escolheu a seed com o resultado mais próximo do alvo. [Resultados das rondas completas](./round-crosscheck-v4.13.json).

## Calibração, amostras e configuração

1. Tabela de prémios fixada com mínimo 0,1× e fatores de comprimento 1 / 1,25 / 1,5 / 2. Removido o multiplicador de cascata e corrigido o caso Wild.
2. **50 000 compras por bónus**, seeds 621026/621027/621028, para calcular preços como prémio médio por aposta-base dividido por 0,96, arredondado a décimas. [Amostra de calibração](./purchases-v4.13-calibration.json).
3. Perfis pagos calibrados com pesos fixos: Normal, bias por coluna **2,02**, Wild **0,1%**; Hunt, sem bias por coluna, Wild **4,16%**. Nenhuma alteração dos perfis FS, da frequência de entrada dos Scatters ou dos multiplicadores globais foi necessária. [Ensaio preliminar de pesos/Wilds](./paid-calibration-v4.13.json).
4. Após fixar preços e parâmetros, **outras 50 000 compras completas por bónus**, seeds independentes 661026/661027/661028. Incluem todos os FS, retriggers e cap; os preços não foram adaptados aos resultados desta validação. [Validação dos bónus e hashes](./purchases-v4.13-validation.json).
5. Estimativa principal: **1 000 000 de spins pagos por modo**, seeds 681026/681027, mais expectativas condicionais dos FS da validação ponderadas pelas probabilidades exatas de entrada. Há correção conservadora no limite inferior para o cap acumulado e os cenários partilham as amostras de FS. [Configuração, resultados e hashes atuais](./rtp-v4.13-sample.json).
6. Conferência direta: 250 000 rondas completas por modo, seeds 671026/671027. Esta amostra inclui de facto os bónus naturais e não apenas a sua expectativa.

Frequências naturais preservadas: qualquer bónus em média 1/615,80 Normal ou 1/205,27 Hunt. Seis Scatters: 1/4939,66 Normal ou 1/1646,55 Hunt. Hunt custa 3× e triplica cada probabilidade positiva de Scatter. Não são garantias por contador. FS: 3+ Scatters mantêm 2% por spin; retrigger +4/+5/+6 conforme o modo, máximo 40 FS concedidos.

## Verificação e publicação

Passaram 28 testes de matemática/ways, 7 testes de integração e as verificações de interface e fórmula visível em desktop e telemóvel. O indicador de multiplicador de cascata foi removido das novas rondas; só permanece em rondas antigas recuperadas.

Na raiz do projeto, com a configuração final:

```sh
node games/rift-core-overdrive/scripts/measure-purchases.mjs 50000 .1 661026 --validation
node games/rift-core-overdrive/scripts/audit-paid-rtp.mjs 1000000 .1 681026
node games/rift-core-overdrive/scripts/measure-local.mjs 250000 base,hunt ../round-crosscheck-v4.13.json .1 671026
node games/rift-core-overdrive/scripts/build-server-engine.mjs
node --test games/rift-core-overdrive/tests/scatters.test.mjs games/rift-core-overdrive/tests/ways.test.mjs
node games/rift-core-overdrive/tests/browser-smoke.mjs --layout
npm.cmd run test:casino:rift
npm.cmd run test:docs
```

Rondas iniciadas em 4.12 e anteriores preservam o motor original, incluindo pagamentos e multiplicador de cascata antigo. Não recalcular saldos ou históricos. Novas rondas usam 4.13. O motor de referência Node e os assets integrados devem acompanhar a mesma configuração.

Publicação frontend: npm.cmd run deploy:frontend. Nenhum deploy foi executado. Nenhuma função Firebase atual importa o motor de referência.



