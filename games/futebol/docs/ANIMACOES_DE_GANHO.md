# Celebrações progressivas de vitória

Apresentação comum ao jogo base e aos dois bónus. A matemática permanece na versão 0.5.0. O escalão usa **ganho do spin / aposta de referência**, nunca o preço da compra. Valores monetários são contados em cêntimos inteiros.

| Ganho | Nome | Apresentação |
|---|---|---|
| Menos de 1× | Sem nome especial | Apenas o pagamento confirmado |
| 1× a menos de 3× | Golo! | Reação curta no tabuleiro e no HUD |
| 3× a menos de 5× | Belo Golo! | Reação curta, cor própria |
| 5× a menos de 15× | Golaço! | Reação curta mais forte |
| 15× a menos de 40× | Golo de Placa! | Contador contínuo, rede, raios e primeiras partículas |
| 40× a menos de 100× | Melhor em Campo! | Promoção verde, impacto e mais partículas |
| 100× a menos de 250× | Campeões! | Taça destacada e confettis dourados |
| 250× a menos de 1 000× | Reis da Europa! | Azul europeu, luzes e mais confettis |
| 1 000× a menos de 10 000× | Lenda do Futebol! | Violeta, intensidade máxima de partículas |
| 10 000× | Vitória Histórica! | Acabamento branco/dourado de máximo ganho |

As três primeiras categorias não abrem ecrã sobreposto: animam as linhas pagadoras, os símbolos e o valor no módulo GANHO DO SPIN. O pequeno nome aparece no próprio HUD e desaparece com o efeito.

A partir de 15× abre uma única celebração. O dinheiro sobe desde zero, atravessa os limiares e termina exatamente no prémio confirmado. Cada mudança de escalão promove o nome, cor, impacto, raios, taça e quantidade de partículas sem reiniciar o contador. Exemplo de 180×: Golo de Placa → Melhor em Campo → Campeões; o contador continua até ao valor de 180×.

A contagem acelera os intervalos longos: cada trecho entre marcos demora 850 ms em normal, 650 ms em rápido ou 500 ms em super; a entrada no primeiro marco demora 400 ms. No valor final, mantém o destaque durante 1,4 / 1 / 0,75 segundos. Isto evita esperas proporcionais a valores monetários muito elevados.

Primeiro clique ou Escape conclui imediatamente a contagem no escalão final; segundo clique fecha. O fim natural da sequência também fecha automaticamente. A aposta e o próximo spin ficam bloqueados durante a apresentação. Auto-FS retoma depois; um retrigger pendente aparece depois da celebração monetária, sem sobrepor os dois festejos.

O resumo final de um bónus continua separado e identificado como Ronda concluída, com o total acumulado. Não existe uma segunda janela de resumo para cada ganho base grande.

## Som e acessibilidade

Sons curtos de vitória sintetizados por Web Audio, com textura de bancada/aplausos e motivo tonal ascendente. A opção **Sons das vitórias** nas definições permite desativá-los. O contexto é desbloqueado por uma interação de jogo; se o browser não permitir áudio, a apresentação visual continua normalmente. Não são gravações de uma bancada real.

Movimento reduzido conserva a contagem e a informação, removendo partículas, rotação e pulsações. Teclado e foco são tratados pelo diálogo modal. Mudar de separador ou receber uma sessão atualizada noutra aba interrompe os efeitos. A apresentação não escreve saldo, histórico, estado de bónus ou RNG.

## Implementação e validação

`web/win-tiers.ts`: nomes e limiares. `web/win-celebration.ts` e `.css`: contador, transições e efeitos. `web/win-audio.ts`: sons gerados. Integração em `web/main.ts` após a resolução dos poderes e antes de avançar para retrigger, próximo FS ou resumo.

Testes verificam fronteiras, marcos sem duplicação, três ganhos sem overlay, progressão 180×, clique para concluir, valor final exato, armazenamento inalterado, movimento reduzido e interrupção. Os efeitos são animações de código e SVG, não novos masters raster.
# Contagem contínua e confirmação

As vitórias a partir de 15× usam o mesmo ecrã desde o início da contagem até à confirmação. Dinheiro e multiplicador sobem juntos com interpolação suave: 1,8 segundos até ao primeiro patamar e cerca de 2,6–4 segundos por segmento seguinte, independentemente da velocidade das roletas. Os fundos dos escalões cruzam-se gradualmente durante 1,5 segundos.

Não existe botão separado para concluir a contagem. Tocar no ecrã revela o valor final; no fim natural ou após esse toque, surge CONTINUAR no mesmo ecrã. O resultado fica visível até à confirmação, sem fecho automático. Os efeitos foram reduzidos para 40 partículas, o contador reutiliza formatadores e referências de elementos, e as promoções não forçam uma leitura de layout.

