> Histórico. Atual: [4.11](./RTP-v4.11.md).

# RIFT//CORE 4.10 — Normal sem poderes

Resultados locais de 2026-10-26, aposta-base 0,10.

Desativados os quatro poderes aleatórios e REACTOR PULSE no perfil Normal. Wilds naturais, pagamentos e Scatters preservados. Hunt, compras e free spins não mudam. A redução de frequência dos bónus discutida anteriormente não foi aplicada.

| Modo | RTP estimado | IC95% aproximado |
|---|---:|---:|
| Normal | 209,93% | 207,22–212,48% |
| Hunt | 227,56% | 224,32–230,19% |

Normal anterior: 222,54%. Hunt anterior: 228,32%; a diferença entre amostras Hunt não resulta de alteração dos seus parâmetros. Ambos continuam acima do alvo de 94–98%. Só o ganho dos spins pagos Normal contribui agora 70,34 pontos percentuais; os bónus naturais contribuem cerca de 139,60.

Método: 1 000 000 de spins pagos novos por modo, seeds 511026/511027, ponderados com probabilidades exatas de Scatter e expectativas condicionais das [50 000 compras por bónus da 4.7](./purchases-v4.7-50000.json). Amostras de compras reutilizadas, não executadas novamente; o script compara todos os parâmetros dos FS e o motor de liquidação, permitindo diferenças nos parâmetros do perfil pago Normal e na entrada Scatter. Intervalos aproximados, com correção conservadora do limite acumulado; não é certificação. Preços das compras foram calibrados com a própria amostra, sem validação independente.

[Dados atuais, configuração e hashes](./rtp-v4.10-sample.json). [Dados anteriores](./rtp-v4.9-sample.json). [Relatório anterior](./RTP-v4.9.md).

## Verificação e reprodução

Na raiz do projeto:

```sh
node games/rift-core-overdrive/scripts/audit-paid-rtp.mjs 1000000 .1 511026 --reuse-bonus-sample
node --test games/rift-core-overdrive/tests/scatters.test.mjs
npm.cmd run test:casino:rift
npm.cmd run test:docs
```

Manter purchases-50000.json da 4.7 para reutilizar a amostra. Testes verificam ausência de poderes em 1000 spins Normal nos motores browser/servidor, preservação dos perfis Hunt/FS e compatibilidade de bónus 4.9. Motor e configuração 4.9 arquivados; o adaptador aceita rondas antigas sem recalcular saldos.

Publicação frontend: npm.cmd run deploy:frontend. Não foi executado deploy. Nenhuma função Firebase atual importa o motor de referência.

