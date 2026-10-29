# Lendas do Bairro — configuração 0.8.0

Implementado em 29/10/2026. Acrescenta um terceiro bónus à [0.7.0](MAESTRO_0_7_0.md). Preço escolhido pelo utilizador: **450×**, sem calibração para o alvo de 65%.

## Regras implementadas

- Ativação natural com 5 Scatters iniciais, em colunas distintas; compra sem pagamento de uma grelha de ativação.
- 10 FS iniciais; 3 Scatters durante o bónus dão +5 FS, repetíveis, sem mudar de modo.
- Wilds diretamente sorteados: 36% de chance de ficar sticky, uma tentativa no nascimento. Persistem até ao fim, sem conservar poderes locais. Wilds de expansão não ficam sticky.
- Roubo a 100% havendo premium ortogonal elegível. Global persistente, poderes, arredondamento e fator de pagamento ×3 iguais ao superior.
- Wild por posição livre antes dos Scatters: `(55 / 1040) × 1,10 = 5,8173076923%`. Os não-Wilds preservam as proporções relativas. Pesos inteiros N1…W: `47760,42785,36815,30845,15920,10945,6965,3980,12012`; total 206960.
- 5 Scatters no base: 0,005%, 1 em 20 000. Esta massa sai de zero Scatters; probabilidades de 1–4 mantidas. Pesos para 0…5: `149990,40000,9300,640,60,10`, total 200000.
- Hunt mantém custo 3× e boost relativo de 50% nas quantidades positivas. Pesos: `249970,120000,27900,1920,180,30`, total 400000. Cinco: 0,0075%, 1 em 13 333,33.
- Teto 10 000× a aposta base, incluindo a ronda natural completa; nunca o custo 450× da compra. Atingir o teto termina a ronda.

## Interface e integração

Emblema vetorial de cinco estrelas com acabamento violeta/dourado. Compra com cinco bilhetes animados, transição e entrada próprias; animações existentes de poderes, aquisição sticky, prolongamento e resumo ligadas ao modo `legend`. Respeita movimento reduzido e interrupção da apresentação sem alterar resultados/RNG.

Loja com seletor «Valor da moeda / aposta base». Usa a escada existente em créditos fictícios, atualiza os três preços e sincroniza o controlo principal; não converte divisas nem altera o saldo. Bloqueado durante rondas. SDK e histórico reconhecem `legend`; débito idempotente de 450× na compra.

Migração de sessões 0.7.0 conserva saldo, RNG, histórico confirmado, modo e retrigger pendente; não recalcula resultados nem semanas. Novas jogadas usam 0.8.0.

## Validação local — 29/10/2026

Testes do motor cobrem ativação natural alcançável, cinco colunas, proporção exata de Wilds, fronteira sticky de 36%, persistência, retrigger, idempotência, custo, teto, reprodução e migração. TypeScript e build locais verificados. Testes de browser local em Edge: loja a 320/390/768/1280 px, teclado, preços, entrada, retoma, prolongamento e conclusão. Capturas inspecionadas; sem acesso a Firebase/Storage real e sem deploy.

Amostra exploratória: 10 000 rondas por seed, duas seeds por modo, aposta 20 unidades mínimas; custos das compras/Hunt no denominador. [Relatório bruto](../reports/lendas-0.8.0-local.json).

| Modo | RTP observado seed A (IC95 aproximado) | Seed B (IC95 aproximado) |
|---|---:|---:|
| Base com naturais | 68,70% (54,78–82,61%) | 66,12% (47,84–84,39%) |
| Compra normal | 56,09% (53,00–59,18%) | 55,48% (52,99–57,98%) |
| Compra superior | 92,58% (85,89–99,27%) | 97,38% (90,36–104,39%) |
| Compra Lendas 450× | 263,16% (253,10–273,22%) | 258,58% (248,64–268,51%) |
| Base Hunt | 20,83% (16,12–25,53%) | 36,45% (8,90–64,01%) |

São medições exploratórias, não RTP teórico nem validação das caudas. Naturais de cinco Scatters são demasiado raros nesta amostra para estimar o contributo com precisão; as estatísticas separam o bónus natural por modo. O novo bónus a 450× está claramente acima do alvo: não anunciar 65% nem 96%. Não se ajustaram pagamentos para esconder este resultado. Calibração futura exige uma nova versão matemática e simulações independentes.

Publicação necessária: frontend, incluindo o motor distribuído no browser e o SDK. Na raiz do repositório: `npm.cmd run deploy:frontend`. Não há função cloud, regra ou índice alterado.
