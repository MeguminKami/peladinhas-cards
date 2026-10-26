# GUI fase 1 — estrutura funcional genérica

> Celebrações de ganho implementadas: Golo / Belo Golo / Golaço sem overlay; contador monetário progressivo a partir de 15× com nomes e efeitos por escalão. Sons sintetizados opcionais. [Funcionamento e limiares](ANIMACOES_DE_GANHO.md).
Estado: protótipo local implementado em `web/`, servido por Vite. Inclui botões, controlador local em `src/session.ts`, saldo fictício, preferências e histórico no localStorage, restauro RNG e continuação dos FS após recarga. As secções abaixo continuam a definir o contrato funcional; integração de servidor, áudio e arte final ficam para fases futuras.

Executar `npm.cmd run dev` e abrir `http://127.0.0.1:5173/`. Nesta versão as sobreposições usam diálogos HTML nativos. O movimento é apenas uma indicação visual temporária sobre os símbolos, com durações normal/rápida/super-rápida de 1 500/750/150 ms. O botão CONCLUIR revela o resultado já guardado. Não existem rolos ou partículas artísticos.

Objetivo: testar o jogo completo com símbolos N1–N4, P1–P4, W e S, caixas simples e texto. Não definir tema, personagens, materiais ou imagens finais nesta fase.

## Camadas

1. Motor: já implementado; gera resultados matemáticos.
2. Serviço de jogo: interface para iniciar ronda, continuar FS, recuperar sessão e consultar histórico. Adaptador local primeiro, servidor depois, seguindo `SERVIDOR.md`.
3. Controlador: valida comandos de interface, impede duplicação, mantém estado de sessão e expõe capacidades dos botões.
4. Apresentador: consome resultados/eventos e organiza tempos, destaques e contadores. Não sorteia nem recalcula resultados.
5. GUI genérica: mostra o estado e envia intenções. A futura arte substitui a aparência sem alterar o serviço ou a matemática.

O adaptador local preserva a sequência RNG por sessão e usa `spin` para avançar cada passo. Não chamar `round` para cada frame ou para repetir uma animação. O restauro já foi implementado com `SeededRandom.restore`: carregar o estado interno exato, sem reaplicar o hash da seed.

Resultados, saldo, histórico e estado RNG são guardados num único snapshot antes da apresentação. Escritas entre abas usam Web Locks e revisão otimista. Se a escrita falhar, a transação calculada em memória não é aplicada à sessão. Isto é um protótipo local, não substitui as transações de uma base de dados de servidor. Dados locais são controlados pelo utilizador.

O histórico retém até 500 rondas, com paginação de 20 e detalhe por spin. Se a quota de armazenamento esgotar antes desse limite, o adaptador remove as rondas mais antigas em lotes e avisa, preservando sempre a ronda atual. Se nem um único registo couber, a escrita falha sem aplicar o spin. Exportar/repor a sessão nas definições. A origem do endereço importa: `localhost` e `127.0.0.1` têm armazenamentos diferentes; usar sempre o mesmo endereço para continuar a sessão.

## Composição dos elementos

Atualização implementada: ecrã único de slot que ocupa todo o viewport, sem página com scroll e sem barra lateral. Estilo geométrico escuro, tipografia e símbolos por IDs, sem arte temática. Interface em `web/main.ts` e `web/screen.css`.

```text
┌──────────────────────────────────────────────────────┐
│ SLOT / LAB        Histórico / Definições / Regras / ⛶  │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Modo / FS             Global ×N              Estado   │
│                 GRELHA 4 × 6                         │
│       símbolos, wilds, sticky e poderes               │
│                                                      │
├──────────────────────────────────────────────────────┤
│ Mensagem contextual / combinação / ganho do spin      │
├──────────────────────────────────────────────────────┤
│ Saldo / Ganho spin / Ganho ronda                      │
│ [−] [Aposta ▼] [+]    [Velocidade]     [ SPIN ↻ ]       │
│ [Bónus normal]    [Bónus superior]    [Último spin]     │
│ Versão / Máximo                         [RTP / sessão] │
└──────────────────────────────────────────────────────┘
```

Em telemóvel, manter a grelha inteira e os controlos no mesmo ecrã; o layout também adapta a orientação horizontal. O spin é um botão circular com ícone e rótulo de estado. Histórico, definições, regras, detalhes e estatísticas abrem em diálogos sobre o jogo; fechar regressa ao tabuleiro sem navegação. O botão ⛶ usa a API de fullscreen quando disponível. Não há autoplay de rondas pagas.

O painel Último spin mostra eventos e linhas sem ocupar espaço permanente no tabuleiro. RTP / sessão distingue as medições da configuração e os totais das rondas concluídas retidas no histórico. Essas estatísticas locais não incluem rondas em curso nem reposições de créditos e podem incluir configurações históricas.

Verificação automática de enquadramento: 320×568, 390×844, 844×390, 1280×720 e 1920×1080, incluindo tabuleiro, compras, aposta, velocidade, spin e acesso aos menus. As sobreposições podem ter scroll interno para conteúdos longos.

Definir tokens semânticos de espaçamento, tipografia, cor, tamanho dos controlos e camadas. Separar grelha, HUD, controlos e sobreposições. A arte futura não deve mudar áreas de clique nem a ordem de navegação sem revisão funcional.

## Estados e botão de spin

| Estado da GUI | Botão principal | Aposta/compra | Comportamento |
|---|---|---|---|
| A carregar/recuperar | Indisponível | Bloqueadas | Obter estado antes de aceitar comandos |
| Pronto | `SPIN` | Disponíveis se permitidas | Abrir uma ronda com a aposta selecionada |
| A pedir resultado | Indisponível | Bloqueadas | Manter a chave idempotente; sem segundo pedido |
| A apresentar resultado | `CONCLUIR` quando seguro | Bloqueadas | Concluir apresentação do resultado já recebido |
| Entrada de bónus | `CONTINUAR` | Bloqueadas | Mostrar tipo, aposta fixa e 10 FS |
| Bónus ativo | `PRÓXIMO FS` ou indisponível durante avanço | Bloqueadas | Executar o próximo FS; sem custo novo |
| Resumo final | `CONTINUAR` | Bloqueadas até fechar | Mostrar total da ronda e regressar a pronto |
| A reconectar | Indisponível | Bloqueadas | Recuperar resultado confirmado; não abrir outra ronda |
| Erro recuperável | `TENTAR NOVAMENTE` | Bloqueadas | Repetir o mesmo comando, não criar outra chave |

Um toque, clique ou tecla só produz um comando. Segurar espaço não repete spins; ignorar repetição automática de teclado. Não disparar spin quando há modal aberto ou foco num campo. Na fase 1 não há autoplay de rondas pagas. O avanço automático dos FS pode existir como opção de apresentação, com no máximo um pedido em curso.

Fechar um menu, rodar o dispositivo ou mudar de velocidade não abre jogadas. `CONCLUIR` revela o resultado existente e nunca modifica os ganhos. Durante um pedido pendente, não existe resultado para saltar.

## Valor da aposta / moeda

Nesta fase, “valor da moeda” é o valor total da aposta em créditos fictícios, sem uma segunda multiplicação por linhas ou quantidade de moedas. Usar o rótulo `Aposta` para evitar ambiguidade.

Escada: 0,20; 0,40; 0,60; 0,80; 1; 1,50; 2; 3; 4; 5; 7,50; 10. Os botões menos/mais percorrem essa lista e ficam desativados nos extremos; o seletor permite escolher diretamente. Não aceitar valores livres fora da escada.

A seleção só muda entre rondas. Ao ativar um bónus, congelar a aposta de referência até ao fim. Aposta, custo e saldo usam inteiros na camada funcional, formatados apenas ao mostrar.

A compra abre uma confirmação com tipo, 10 FS, aposta de referência e custo calculado (90× ou 220×). Confirmar cobra uma vez e inicia o bónus; cancelar não sorteia nada. Saldo insuficiente impede o comando. No exemplo de aposta 0,20: compra normal 18 créditos; superior 44 créditos.

## Velocidade normal, rápida e super-rápida

Perfis iniciais de apresentação, ajustáveis quando houver animação:

| Perfil | Movimento dos rolos | Intervalo entre paragens | Destaque de linhas |
|---|---:|---:|---:|
| Normal | 900 ms | 120 ms | 700 ms |
| Rápida | 450 ms | 60 ms | 350 ms |
| Super-rápida | 150 ms | 0 ms | 100 ms |

Tempos propostos são mínimos visuais locais, não prazos para obter resposta do servidor. Nunca mostrar resultado inventado enquanto se espera. A preferência nova aplica-se à próxima sequência; não interrompe um pedido em curso. Saltar destaques não omite o estado final dos poderes ou o total pago. Movimento reduzido substitui deslocamentos/partículas por transições simples.

Os três perfis usam o mesmo resultado matemático para a mesma entrada/RNG. Não mudam pesos, roubo, sticky, RTP, aposta, custo ou prémios.

## Definições do utilizador

| Preferência | Valor inicial proposto | Persistência |
|---|---|---|
| Velocidade | Normal | Local por utilizador/dispositivo |
| Áudio geral / música / efeitos | 70% / 40% / 70% | Local; ativação do áudio após interação |
| Silenciar | Não | Local |
| Movimento reduzido | Seguir sistema | Local; opção explícita pode substituir |
| Efeitos visuais | Automático | Local |
| Avançar FS automaticamente | Sim | Local; nunca inicia rondas pagas |
| Idioma | Português | Local |
| Destaque de linhas / mostrar IDs | Sim / Sim na fase 1 | Local |

O utilizador altera preferências de apresentação. RTP, raridades, pagamentos, poderes, custos e limite de prémio não são definições pessoais. Um editor matemático futuro pertence às ferramentas de desenvolvimento e identifica sempre a configuração experimental, fora das sessões normais.

## Histórico

Guardar uma entrada por ronda, com spins filhos, apenas após confirmação do serviço. Campos: IDs, data/hora, versão/hash, aposta, custo, modo, total pago, resultado líquido, saldo após liquidação e estado concluído/em curso. Nos filhos: tabuleiros inicial/final, poderes, linhas, pagamento e estado dos FS/stickies.

Separar “pagamento” de “lucro líquido”: pago menos custo total da ronda. Numa compra de 90×, um pagamento de 20× não é lucro. Free spins têm custo individual zero, mas pertencem à ronda que os originou.

Lista inicial: 20 rondas por página, mais recentes primeiro. No adaptador local, proposta de reter 500 rondas concluídas, preservando sempre a ronda em curso; no servidor usar paginação por cursor e uma política de retenção própria. Filtros: todas, base, compra normal, compra superior e rondas com bónus natural.

O detalhe permite rever símbolos e eventos guardados. Rever não executa RNG, não cobra e não volta a creditar pagamentos. Seed secreta e estado interno RNG não aparecem no histórico do jogador.

## Prémios altos

Classificação de apresentação baseada no pagamento dividido pela aposta de referência, independente do cálculo matemático:

| Classe genérica | Intervalo |
|---|---|
| Pagamento comum | Maior que zero e menor que 20× |
| Prémio alto | De 20× inclusive a 50× exclusive |
| Prémio muito alto | De 50× inclusive a 100× exclusive |
| Prémio extraordinário | A partir de 100×, abaixo do teto |
| Máximo da ronda | Teto acumulado de 10 000× atingido |

Usar estes nomes provisórios até à direção artística. Zero mostra ausência de pagamento. Num spin mostrar o ganho desse spin; no resumo, o total da ronda. Identificar o âmbito explicitamente, sem contabilizar o resumo como um pagamento novo.

Para compras, mostrar sempre também custo e resultado líquido; a classe por multiplicador de referência não implica lucro. Se o pagamento ficar abaixo do custo da ronda, usar indicação neutra e não mensagem de lucro.

Contadores são saltáveis para o valor final exato. O teto tem prioridade sobre as outras classes e mostra que a ronda terminou. As classes só escolhem apresentação e não multiplicam pagamentos. Tempos propostos de celebração: 1,5 s / 2,5 s / 4 s / 4 s, com movimento reduzido e opção de concluir.

## Informação e acessibilidade

- Mostrar “créditos fictícios”, saldo, aposta, ganho do spin e acumulado do bónus em campos distintos.
- Mostrar modo, FS restantes, stickies e poderes por IDs/rótulos além da cor.
- Regras consultáveis: linhas, tabela efetiva por modo, fatores fixos, scatter, quatro direções de roubo, preços e teto.
- Apresentar RTP como estimativa empírica da configuração: na 0.3.1, base 63,67%, normal 65,46%, superior 65,55% (1 milhão de rondas base e 100 mil compras de cada). Não é retorno garantido por sessão. Mostrar o global do último spin e identificar P4 como incremento aditivo, sem confundir com P1 ×2 que multiplica o global nas linhas elegíveis.
- Navegação por teclado, foco visível, texto legível, alvos de toque com pelo menos 44×44 px como objetivo de design e anúncios de resultados sem narrar cada frame do contador.
- Fechar painéis por botão e Escape, devolver foco ao controlo que abriu e evitar que um clique atravesse a sobreposição.

## Critérios de conclusão da fase 1

- Jogar base e compras, completar FS e ver estado/pagamentos sem arte final.
- Mais/menos e seletor usam exatamente a escada; aposta bloqueada na ronda.
- Saldo inicial de desenvolvimento proposto: 1 000 créditos fictícios, sem efeito nas probabilidades; qualquer reposição manual fica identificada e é proibida durante uma ronda ativa.
- Um único comando em curso; cliques repetidos e atalhos não duplicam jogadas.
- Mesma sequência de comandos matemáticos produz os mesmos resultados nas três velocidades.
- Comprar, apresentar, saltar, abrir histórico e rever nunca duplicam cobranças ou pagamentos.
- Adaptador de testes consegue forçar resultados, poderes, bónus, zero, saldo insuficiente, prémio alto, teto e erros de ligação. Não expor essa função no modo normal.
- Histórico distingue custo, pagamento e lucro; compras mostram o denominador correto.
- Recuperação segue o contrato do serviço; no modo local sem restauro, a limitação é visível.
- Layout utilizável em computador e telemóvel, com teclado e movimento reduzido.
- Só depois desta validação começar a aplicação de arte e animações finais.

## Atualização 0.5.0

Os FS ficam debaixo do multiplicador global, com restantes e total concedido. O retrigger dos dois bónus concede +5 FS e apresenta Prolongamento!, animação e confirmação por clique ou 10 segundos. Auto-FS aguarda esta confirmação. A sessão guarda o festejo pendente; reload não volta a atribuir os FS. Ver `RETRIGGER_0_5_0.md`.

Atualização do painel FS: bloco independente abaixo de todo o bloco do global e poderes, com moldura e espaçamento próprios. Mostra A / B, onde A = total concedido menos FS restantes e B = total concedido, incluindo retriggers. Exemplo: 7 / 10; depois de ganhar +5 no mesmo ponto, 7 / 15. O denominador cresce sem reiniciar os spins rodados.
