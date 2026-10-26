# Rift: 1000 compras completas de cada bónus

Simulação local de 2026-10-26, versão rift-4.14, aposta-base 0,10. Prémios brutos em × da aposta-base; não são lucro líquido nem × do preço da compra. Inclui todos os FS, retriggers e cap. Seeds 811026/811027/811028.

| Bónus | Preço | Média | Mínimo | Máximo | RTP da amostra |
|---|---:|---:|---:|---:|---:|
| core | 80× | 74,61× | 1,10× | 2649,10× | 93,27% |
| rift | 220× | 209,12× | 6,30× | 3386,90× | 95,06% |
| overdrive | 450× | 433,00× | 26,00× | 4584,00× | 96,22% |

## Distribuição em intervalos de 100×

Limite inferior incluído e superior excluído. Contagens sobre 1000 compras por bónus.

| Intervalo da win | Core | Rift | Overdrive |
|---|---:|---:|---:|
| 0–<100× | 787 | 356 | 69 |
| 100–<200× | 142 | 318 | 192 |
| 200–<300× | 41 | 133 | 214 |
| 300–<400× | 13 | 73 | 137 |
| 400–<500× | 10 | 51 | 100 |
| 500–<600× | 0 | 23 | 72 |
| 600–<700× | 3 | 11 | 54 |
| 700–<800× | 2 | 10 | 51 |
| 800–<900× | 0 | 5 | 27 |
| 900–<1000× | 0 | 3 | 20 |
| 1000–<1100× | 0 | 4 | 11 |
| 1100–<1200× | 0 | 2 | 13 |
| 1200–<1300× | 1 | 1 | 5 |
| 1300–<1400× | 0 | 2 | 10 |
| 1400–<1500× | 0 | 0 | 5 |
| 1500–<1600× | 0 | 1 | 4 |
| 1600–<1700× | 0 | 2 | 1 |
| 1700–<1800× | 0 | 1 | 1 |
| 1800–<1900× | 0 | 0 | 0 |
| 1900–<2000× | 0 | 0 | 1 |
| 2000–<2100× | 0 | 0 | 3 |
| 2100–<2200× | 0 | 1 | 5 |
| 2200–<2300× | 0 | 0 | 1 |
| 2300–<2400× | 0 | 0 | 0 |
| 2400–<2500× | 0 | 0 | 1 |
| 2500–<2600× | 0 | 1 | 0 |
| 2600–<2700× | 1 | 0 | 0 |
| 2700–<2800× | 0 | 0 | 0 |
| 2800–<2900× | 0 | 0 | 0 |
| 2900–<3000× | 0 | 0 | 1 |
| 3000–<3100× | 0 | 0 | 0 |
| 3100–<3200× | 0 | 1 | 0 |
| 3200–<3300× | 0 | 0 | 0 |
| 3300–<3400× | 0 | 1 | 1 |
| 3400–<3500× | 0 | 0 | 0 |
| 3500–<3600× | 0 | 0 | 0 |
| 3600–<3700× | 0 | 0 | 0 |
| 3700–<3800× | 0 | 0 | 0 |
| 3800–<3900× | 0 | 0 | 0 |
| 3900–<4000× | 0 | 0 | 0 |
| 4000–<4100× | 0 | 0 | 0 |
| 4100–<4200× | 0 | 0 | 0 |
| 4200–<4300× | 0 | 0 | 0 |
| 4300–<4400× | 0 | 0 | 0 |
| 4400–<4500× | 0 | 0 | 0 |
| 4500–<4600× | 0 | 0 | 1 |

[Dados completos e prémios de cada ronda](./rift-purchases-1000-2026-10-26.json).

Estes 1000 resultados mostram a dispersão de prémios, não certificam o RTP. Não se alterou qualquer parâmetro do jogo.

Reproduzir, na raiz do projeto:

```sh
node games/rift-core-overdrive/scripts/purchase-distribution.mjs 1000 0.1 811026
```
