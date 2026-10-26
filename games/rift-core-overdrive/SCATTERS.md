> Relatório histórico 4.5. Dados atuais: [RTP-v4.8.md](./RTP-v4.8.md).

# Scatters condicionais — rift-4.5

Implementação e validação local: **2026-10-26**. Sem pedidos cloud ou deploy.

O motor sorteia cada coluna por ordem conforme os Scatters já na grelha.
Nunca se pré-escolhe a quantidade final. Máximo de um por coluna; linha
uniforme entre cinco. O contador reinicia por spin. Sem novos portais nas cascatas.

| Scatters atuais | Chance na próxima coluna |
|---|---:|
| 0 | 0,11% |
| 1–4 | 85,16% |
| 5 | 86,41% |

## Frequências calculadas

Propagação exata: a cada coluna, a massa do estado `k` divide-se entre `k`
com peso `1-p[k]` e `k+1` com peso `p[k]`. Este cálculo analisa o motor;
não escolhe a quantidade final durante o jogo.

| Entrada | FS | Probabilidade por spin | Média aproximada |
|---|---:|---:|---:|
| CORE, 3 Scatters | 8 | 0,13% | 1/781 |
| RIFT, 4 Scatters | 10 | 0,12% | 1/813 |
| OVERDRIVE, 5 Scatters | 12 | 0,10% | 1/1000 |
| OVERDRIVE, 6 Scatters | 14 | 0,05% | 1/2000 |
| Qualquer bónus | — | 0,40% | 1/249 |

Médias completas do OVERDRIVE: 1000,05 e 2000,33 spins. Chances configuradas
com duas casas decimais percentuais; frequências não são prazos garantidos.
CORE/RIFT recalibrados para priorizar o objetivo do OVERDRIVE.

Compras colocam 3/4 portais para CORE/RIFT; OVERDRIVE coloca 5 ou 6, com
33,33% de chance de 6/14 FS. Débito único, sem prémios base na ativação.
Hunt mantém cada quantidade positiva final multiplicada por 1,5. Enquanto
há zero Scatters, a chance depende também da coluna para preservar esse
aumento; depois do primeiro usa as mesmas chances de continuação.
Perfis de FS e retriggers anteriores preservados: o extra de 2 FS é na entrada.

## Validação local

Revisão de interação em 2026-10-26: abertura direta na grelha, sem menu
automático. Nas entradas naturais e compradas há pausa, convergência dos
Scatters e materialização central antes da explicação. Resultado e cobrança
continuam a ser guardados antes da apresentação; controlos ficam bloqueados
durante a sequência. Recuperação repõe a apresentação sem nova cobrança.
Redução de movimento omite esta transição. O menu manual é preservado.

### Revisão de bónus em 2026-10-26

Compra com símbolo e cor por bónus; instruções em três passos.
Retrigger apresenta convergência, transformação central e saldo de FS.
Saldo retido visualmente até continuar no resumo final, com ganho da rodada
e acumulado de bónus separados. Liquidação confirmada permanece imediata.
Testes locais a 320/390/768/1440 px, sem pedidos externos; recuperação do
resumo confirmou saldo retido antes de Continuar e atualizado depois.
Rondas locais 4.4 são encaminhadas para o motor/configuração arquivados.

OVERDRIVE altera MEGA WILD DROP de 1% para 2%, NEON STORM de 5% para 10%,
WILD SURGE de 7% para 14%, RIFT LINK de 6% para 12% e REACTOR PULSE de
30% para 60% em cada oportunidade elegível. Não duplica a frequência de
Scatters nem altera preços. Aplica-se a novas rondas OVERDRIVE, incluindo
entradas de 5/6 Scatters e compras, que partilham o mesmo perfil.

### Amostra local de RTP em 2026-10-26

Amostra hist?rica de 2026-10-26 (os dados atuais em `local-math-report.json` pertencem ? vers?o 4.7): 10 000 rondas completas por modo,
aposta-base 1. IC95% aproximado; amostra diagnóstica, sem certificação.

| Modo | RTP observado | IC95% |
|---|---:|---:|
| Base | 684,43% | 163,11–1205,74% |
| Hunt | 334,69% | 202,44–466,94% |
| Compra CORE | 96,38% | 87,48–105,29% |
| Compra RIFT | 89,67% | 84,77–94,58% |
| Compra OVERDRIVE | 379,36% | 367,99–390,73% |

**Não confirma o alvo de 96%.** Não foram recalibrados pagamentos para
compensar o aumento dos poderes. Base/Hunt incluem os novos bónus e têm
intervalos largos. [RTP-v4.md](./RTP-v4.md) e [rtp.json](./rtp.json) são
históricos anteriores, sem validar a configuração atual.

## Consumidores e publicação

[Configuração](./math-config.js) e [motor](./engine.js) alimentam o navegador.
Regenerar o [motor Node](./integration/server-engine.mjs) com
`node games/rift-core-overdrive/scripts/build-server-engine.mjs`, na raiz.
`npm.cmd run deploy:frontend` prepara/publica o casino integrado.

Nenhuma função Firebase atual importa o motor Node de referência. Um host
externo que importe o [serviço](./integration/round-service.mjs) precisa de
publicar o motor/configuração e módulos arquivados em conjunto. O serviço
integrado rejeita rondas de outra versão: concluí-las antes da troca.
O standalone retoma as antigas com o motor arquivado. Não recalcular
resultados ou saldos históricos. Não foi publicado nenhum ambiente.

### Apresentação do reator revista em 2026-10-26

A convergência preserva os Scatters visíveis em órbita antes do colapso
simultâneo e da materialização central. Entrada e retrigger usam o mesmo
protocolo, com leitura própria antes/depois; sem antecipar o diálogo.
Os testes capturam órbita, fusão e emblema e verificam o movimento real
do resultado com redução de movimento desativada. O retrigger explica o
multiplicador preservado. A contagem de ganhos anima a energia extraída e
mantém o espaço do comando de continuar reservado.

[Estilos do reator](./reactor-presentation.css) substituem os estilos
anteriores dos painéis; [componentes](./interface.js) contêm os chassis
SVG, instruções por bónus e comandos. Sem alteração da matemática
nesta revisão.


