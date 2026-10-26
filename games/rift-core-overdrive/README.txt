# RIFT//CORE: OVERDRIVE — rift-4.3

Executar npm.cmd start e abrir http://localhost:4173 para a demonstração local. A integração por iframe usa saldo e resultados confirmados pelo backend do site, sem nome nem símbolo de moeda. Ver INTEGRACAO.md para o agente do site. npm.cmd test executa 46 testes. Frontend sem dependências de instalação; backend de referência Node.js.

## Três compras de bónus

| Bónus | Custo da aposta | FS iniciais | Global inicial | Global máximo | Retrigger 3+ portais |
|---|---:|---:|---:|---:|---:|
| CORE AWAKENING | 79× | 8 | ×1 | ×25 | +4 |
| RIFT ASCENSION | 240× | 10 | ×3 | ×50 | +5 |
| CRITICAL OVERDRIVE | 804× | 12 | ×5 | ×100 | +6 |

RIFT ASCENSION é o bónus intermédio, com apresentação verde, perfil próprio e música própria. Disponível na compra do menu inicial e dos controlos. Seleção/cancelamento não cobram; só a confirmação debita. As entradas naturais continuam: 4 portais→CORE, 5/6→OVERDRIVE. O RIFT é exclusivo da compra e coloca 4 portais apenas como apresentação da ativação; não paga prémios base nem consome um FS.

Cascata: ×1, ×1, ×2, ×2… até ×10; reinicia por spin. Todos os bónus sobem o global +1 a cada três vitórias, acumulando progresso entre FS da mesma ronda. Prémios usam o global anterior ao aumento. Retriggers limitados a 40 FS concedidos e cap de ronda 25 000×. Só OVERDRIVE tem Wild preparatório obrigatório. CORE mantém a evolução ao atingir ×10; RIFT tem as probabilidades intermédias abaixo.

## Poderes por oportunidade

| Modo | Mega Wild Drop | Neon Storm | Wild Surge | Rift Link | Reactor Pulse |
|---|---:|---:|---:|---:|---:|
| base | 0,17% | 1,3% | 1,9% | 1,3% | 4% |
| hunt | 0,22% | 1,8% | 2,4% | 1,8% | 12% |
| core | 0,6% | 3% | 5% | 4% | 20% |
| rift | 0,8% | 4% | 6% | 5% | 25% |
| overdrive | 1% | 5% | 7% | 6% | 30% |

Poderes precisam de alvos válidos. Mega/Storm/Surge/Link são sorteados inicialmente e após cada queda vencedora. Pulse apenas após a 3.ª/6.ª/9.ª… vitória. Podem repetir-se. Ícones têm cor própria, chamas durante a utilização e cor retida até ao fim do spin. Scatters são preservados pelos poderes e dividem os segmentos da queda.

Símbolos sorteados individualmente, com os mesmos pesos nas seis colunas e premiums progressivamente mais raros; probabilidades efetivas nas regras. Scatters têm distribuição própria e transformações são eventos explícitos. Nenhum ajuste ao saldo/perdas.

## Verificação

| Modo | Rondas completas | RTP observado | IC95% |
|---|---:|---:|---:|
| base | 100000 | 98.437% | 91.238%–105.636% |
| hunt | 100000 | 104.863% | 98.828%–110.898% |
| core | 100000 | 93.483% | 89.857%–97.110% |
| rift | 100000 | 95.244% | 93.289%–97.199% |
| overdrive | 100000 | 95.963% | 93.124%–98.801% |

Estimativas Monte Carlo, não confirmação de RTP de 96%. O relatório RTP-v4.md contém parâmetros, sementes, hashes, pagamentos e limitações. Os ensaios anteriores não validam esta versão; históricos preservados em reports, incluindo RTP-v4.1.md e RTP-v4.2.md.

46 testes, incluindo cobrança/FS/retrigger/crescimento/serialização do RIFT, equivalência das modalidades existentes com a versão 4.2, transações do site, idempotência, concorrência, origens autorizadas, repetição após timeout e proteção após troca de conta. Bónus locais já iniciados mantêm a matemática original. QA de compra, sequência completa de FS, resumo, histórico e mobile em reports/v4/rift-browser.json. QA do iframe entre origens diferentes e recuperação após resposta perdida em reports/v4/site-wallet-browser.json.

Gerar relatório: npm.cmd run report:rtp. Retomar/prolongar ensaios: npm.cmd run measure:rtp -- --rounds=100000 --workers=4. Cada lote termina rondas completas; não alterar motor/configuração durante ensaios.

RIFT-CORE-OVERDRIVE-v4.zip contém a aplicação, adaptadores e INTEGRACAO.md; RIFT-CORE-OVERDRIVE-v4-source.zip inclui também testes e relatórios. Servir dist por HTTP/HTTPS. O agente do site deve ligar integration/host.js ao endpoint autenticado e integration/round-service.mjs à transação da carteira, conforme INTEGRACAO.md. Um iframe integrado não recorre ao saldo local se faltar a ligação; para uma demonstração explícita em iframe usar ?demo=1.
