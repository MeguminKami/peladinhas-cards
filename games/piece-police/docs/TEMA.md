# Bíblia visual — Peace Police: The Afterparty

04-11-2026 · Fase 3, etapa 1 · **Bíblia aprovada pelo dono**, com a revisão de objetos de consumo abaixo.

Direção: agente A. Segue o [perfil](fase3/PERFIL-DO-JOGO.md), o [plano](fase3/PLANO-FASE-3.md) e o [guia visual](../guides/3-VISUAIS-E-ANIMACOES.md). O dono aprovou a direção e as referências das seis pessoas com «Aprovo tudo». B inicia as folhas e C o pipeline em paralelo. A aprovação das folhas e da amostra continua anterior à série. A matemática pp-v6, a sessão, a carteira e o kit mantêm os seus contratos.

## 1. Conceito

**O último clube aberto da noite, onde cada amigo muda a realidade da pista.** Uma caixa de palco escura recebe cinco personagens humanas, ilustradas com os rostos das referências. A energia cresce em episódios: um retrato desperta, o poder atravessa a grelha, dois poderes fundem-se, os cantos abrem e o polícia acaba por entrar na festa.

Acidwave Neon: grafismo de flyers de rave dos anos 90/Y2K, cromado líquido, recortes assimétricos, gradientes ácidos e textura de impressão. A exuberância concentra-se nas margens, personagens e momentos de impacto. O centro da grelha permanece escuro e legível. Humor simpático de amigos numa festa; anatomia adulta e expressões reconhecíveis.

## 2. Moodboard e leitura das referências

Foram vistas as **13 fotografias** existentes nas seis pastas de [INSPIRATION](../INSPIRATION/), em 04-11-2026. Não havia referências gráficas de flyers ou jogos: a linguagem Acidwave vem da direção escrita do dono. As fotografias são fontes de identidade, não cenários a reproduzir. Nenhuma fotografia será publicada.

| Referência vista | O que se retira | O que se rejeita / limite |
|---|---|---|
| [LCD](../INSPIRATION/LCD/), `diogo.jpg` | Cabelo muito curto, óculos escuros geométricos, bigode fino e barba no queixo; expressão confiante | Só 240 × 240 px, olhos ocultos. Não inventar olhos nem detalhes em falta; pedir 2–3 fotografias nítidas, frente e ¾, uma sem óculos |
| [MDMA](../INSPIRATION/MDMA/), 4 fotografias | Cabelo curto escuro, sobrancelhas marcadas, sorriso aberto; frente e perfil dão estrutura ao rosto | Retirar marcas do chapéu e roupa; não levar o equipamento nem a paisagem para a personagem |
| [COPIUM](../INSPIRATION/COPIUM/), 4 fotografias | Caracóis volumosos, sorriso, bigode e barba curta; referência com hoodie para o volume da roupa | Fotos com cabelo e ângulos diferentes não justificam mudar de rosto entre peças. Fixar a aparência na folha aprovada; retirar todas as marcas |
| [ALCOOL](../INSPIRATION/ALCOOL/), 1 fotografia | Caracóis, bigode, rosto alongado e camisa aberta; expressão descontraída | Não confundir com COPIUM: preservar proporções próprias. Sem gestos de consumo; uma única vista limita poses novas |
| [WEED](../INSPIRATION/WEED/), 2 fotografias | Retrato frontal e perfil, chapéu de tecido, sobrancelhas, bigode e barba no queixo; sorriso tranquilo | Retirar emblemas e padrões da roupa; paisagem natural não é o ambiente do jogo |
| [Peace Police](../INSPIRATION/PEACE_POLICE_PERSONAGEM/), 1 fotografia | Cabelo escuro ondulado, sobrancelhas espessas, barba cheia e sorriso discreto | Uniforme inteiramente fictício, sem insígnias reais. Mais ângulos ajudam nos quatro estados; não deformar o rosto para fazer humor |

Tradução do moodboard escrito: flyer recortado → molduras com chanfros; cromado líquido → bordos dos premium e distintivo; impressão halftone → áreas de sombra da roupa e fundos; ondas psicadélicas → exteriores do palco e efeitos do LCD; néon → contorno curto, com núcleo definido. Rejeitar ruído sobre os olhos, textura nos valores, arco-íris permanente, rostos plastificados e halos que apaguem a silhueta.

## 3. Paleta e hierarquia

| Cor | HEX | Função |
|---|---|---|
| Midnight Ink | `#0B0A1A` | Fundo principal e separação entre símbolos |
| Deep Plum | `#29243D` | Superfícies, células e painéis |
| Pearl | `#F5F1FF` | Texto principal e reflexos |
| Violet | `#8B3DFF` | LCD, marca, contraluz base |
| Royal Blue | `#2F4BFF` | COPIUM, profundidade e madrugada |
| Raspberry Pink | `#FF2D7A` | MDMA, energia elétrica |
| Tangerine | `#FF8A1F` | ALCOOL, rasto e desequilíbrio |
| Neon Jade | `#00F5A8` | WEED, bolhas e grupos sticky |
| Lime Green | `#9DFF1A` | JOINER e Party Mode |
| Red Orange | `#FF4422` | CALMER e avisos |
| Punk Yellow | `#FFD60A` | Pulseira Scatter e VIP |
| Neon Yellow | `#F2FF2A` | Multiplicadores e valores destacados |

Em repouso, aproximadamente três quartos da composição são escuros; uma cor de personagem domina cada intervenção. Gradientes violeta–royal, rosa–tangerina, jade–lima e punk–néon. A paleta completa fica reservada a Total Chemistry e POLICE PARTY. As cores saturadas são acentos, não texto pequeno sobre outra cor saturada. Confirmar contraste AA na interface renderizada; a tabela não é evidência de contraste.

## 4. Materiais, luz e linha

- Luz principal suave de cima e à esquerda, neutra o suficiente para preservar pele e feições. Contraluz na cor da personagem à direita. Reflexos coerentes em todas as peças.
- Tecido mate nas roupas, vinil nos acessórios, metal escuro na estrutura e cromado nos premium. Sem brilho molhado na pele.
- Contorno exterior escuro contínuo, com aproximadamente 2 px aparentes a 64 px; filete de néon exterior mais fino. Linha interior simples e confiante. Grão e halftone discretos, já no bitmap, sem textura animada.
- Símbolos isolados com alpha real; margem de segurança de pelo menos 8% em cada lado, incluindo cabelo e brilho. Massa principal com escala aparente coerente; comprovar em células reais de 64, 72 e 84 px.
- Efeitos atrás do símbolo ou no seu perímetro. Nunca tapar o rosto, a conta do prémio ou um multiplicador.

## 5. Tipografia e formas

Implementado: **Oxanium** para marca, títulos, controlos e valores, com Manrope para texto de leitura e fallback. Oxanium variável (200–800), WOFF2 local de 14 044 bytes, obtida da [distribuição oficial](https://github.com/google/fonts/tree/main/ofl/oxanium), com [licença OFL local](../ui/fonts/Oxanium-OFL.txt). Sem pedidos externos em runtime. Valores com algarismos alinhados e `lining-nums tabular-nums`; texto pequeno sem distorção.

Marca composta em texto/SVG, com suporte cromado raster separado e distintivo fictício. Nomes, números e letras necessários à leitura ficam em HTML, incluindo marca e WILD. Exceção expressa do dono em 05-11-2026: a pulseira Scatter inclui a palavra «Scatter» em vermelho prismático no próprio bitmap. Botões e painéis usam cantos chanfrados moderados; as cinco linguagens de personagem mantêm silhuetas distintas. A barra conserva a geometria do kit e recebe só variáveis `--deck-*`.

## 6. Personagens e símbolos

Os rostos são os das referências: o dono confirmou a aprovação solicitada para as seis pessoas em 04-11-2026. A ferramenta integrada ImageGen aceita imagens de referência e transparência; isso permite o fluxo, mas a fidelidade terá de ser avaliada nas folhas. O LCD começa como estudo com os óculos preservados; fotografias adicionais continuam recomendadas para melhorar a fidelidade, sem bloquear a primeira folha.

| Personagem | Direção de roupa e forma | Assinatura e poder |
|---|---|---|
| P1 WEED | Casaco largo, chapéu de tecido sem marca, ombros redondos | Jade, bolha e arcos arredondados; crescimento sticky |
| P2 ALCOOL | Camisa e gravata torta, pose inclinada com rosto legível | Tangerina, ziguezague diagonal; rasto de wilds |
| P3 COPIUM | Hoodie royal, gola macia, sorriso persistente | Nuvem e estrela geométrica fora dos olhos; respin |
| P4 MDMA | Roupa de pista, ténis expressivos, pose de dança | Rosa, pontas e linhas de atração; junta símbolos |
| P5 LCD | Casaco assimétrico, óculos geométricos preservados | Violeta, prisma e planos quebrados; transformação |
| Peace Police | Uniforme fictício, chapéu e apito; distintivo original | Sério: vertical; CALMER: palma aberta e travagem coral; JOINER: tira chapéu, abre a pose em lima; dança: gesto amplo sem tapar o palco |

As seis folhas (frente, ¾ e corpo inteiro) foram **aprovadas pelo dono em 04-11-2026**. São referências de identidade, roupa e acabamento, não os assets finais do tabuleiro. Cada rosto mantém cabelo, barba, proporções e tom de pele em símbolos, retratos e Alter Egos. Fusão mantém a identidade dos dois participantes.

### Personificação reforçada — revisão do dono

O dono pediu «mais personificação das drogas sobretudo quando eles estão ativos». Os derivados devem transformar a expressão, os adereços e o espaço à volta da pessoa; trocar apenas a cor da moldura não basta. As folhas aprovadas continuam a fixar os rostos. **Adormecido:** versão contida, textura e cor atenuadas, sem poder em execução. **Desperto:** expressão e assinatura próprias bem visíveis. **Party Mode:** a assinatura domina o enquadramento e torna-se mais surreal, mantendo o rosto e a leitura dos valores.

| Personagem | Desperto / Alter Ego | Party Mode |
|---|---|---|
| WEED | Olhar relaxado, sorriso sereno, silhueta descaída; motivos reconhecíveis de folhas de cannabis, bolha jade viscosa e fumo estilizado a envolver os ombros | Bolha de tempo orgânica maior, espirais lentas e folhas em órbita; pessoa ainda humana, sem rosto tapado |
| ALCOOL | Gravata e camisa desalinhadas, sorriso de festa, pose desequilibrada; copo e líquido tangerina em arco, rasto diagonal legível | Rodopio exagerado, reflexos duplicados e rasto que atravessa o enquadramento; humor simpático |
| COPIUM | Otimismo absurdo, sorriso confiante, hoodie e nuvem royal, pequenas miragens e estrelas | Ilusão de sonho mais teatral, nuvens cromadas e repetição de silhuetas; não confundir o meme com uma substância real |
| MDMA | Euforia calorosa, braços abertos e movimento de dança; ondas de atração, corações geométricos e motivos de comprimidos estilizados como adereços de festa | Aura rosa elétrica, vínculos visuais entre símbolos e rastos rítmicos; expressão humana legível |
| LCD | Óculos com reflexos fractais, prismas e espelhos derretidos, duplicados RGB e planos a distorcer; manter os óculos opacos da referência | Realidade caleidoscópica, cromado líquido e halos facetados mais largos; feições centrais estáveis |

Adereços permitidos na versão privada são recursos de ilustração, sem instruções de preparação ou dosagem. O poder continua a reconhecer-se pela sua ação no tabuleiro. A amostra desta etapa demonstra WEED e LCD; as restantes personagens só entram na produção após aprovação da amostra.

Baixos: N1 lava lamp jade arredondada; N3 bilhete de raspadinha com área metalizada e estado revelado, sem letras nem falsa indicação de vitória; N4 coluna de som rosa com dois cones grandes; N5 prisma violeta facetado. Premium: bustos com a mesma escala de cabeça; a moldura cresce em complexidade de P1 a P5, sem encolher o rosto.

**Revisão expressa do dono (04-11-2026):** permite bebidas, drogas e objetos de consumo para uso privado, sem venda nem distribuição. Substitui a proibição visual anterior. N2 mantém o **copo de shot tangerina**; W mantém **copo/rasto de néon**, com silhueta distinta. Os nomes são texto HTML nas apresentações, não rótulos sobre os símbolos da grelha. Não se introduzem objetos adicionais por rotina: os rostos, as formas dos poderes e a leitura do tabuleiro continuam a dirigir a arte. IDs, valores e comportamento mantêm-se.

CW: âncora quadrada de canto com núcleo luminoso, quatro níveis de bordo (×1–2, ×3–5, ×6–10, ×11–50). DW: distintivo fictício recortado, níveis ×2–5, ×10, ×25, ×50. S: pulseira amarela em arco aberto. CW, DW e S distinguem-se pela forma; os valores ficam em HTML.

## 7. Palco e modos

| Modo | Cenário e moldura | Energia |
|---|---|---|
| Base / MAIS SCATTERS | Clube subterrâneo, estrutura escura violeta e royal, quatro portas de canto fechadas conforme os eventos | Expectativa; MAIS SCATTERS identificado no controlo, sem sugerir prémio garantido |
| AFTERPARTY | Mesmo clube a abrir para a madrugada, royal e tangerina periférica | Mais luz, continuidade do palco |
| VIP AFTERPARTY | Veludo escuro, cromado, punk yellow | Exclusividade e tensão; sem dourado a competir com os valores |
| POLICE PARTY | Iluminação royal e coral, acentos lima, polícia a dançar | Pico de energia, sem estroboscópio |

Trocar cenário e moldura em menos de 1 s, preservando as posições das células e os cantos decididos pelo motor. Fundo central de baixo contraste, composições horizontal e vertical próprias. O néon PARTY MODE mantém ON/OFF explícito. Quatro modos não significam quatro layouts: conservar landscape, portrait e compact, sem scroll.

## 8. Movimento e leitura

O [mapa de animações](visuais-animacoes.md) define a apresentação por evento. Tudo passa pelo relógio existente; apenas `transform` e `opacity` animam. A revisão do dono fixa a velocidade Normal; não há aceleração ou salto de eventos. Movimento reduzido usa fades curtos, sem tremores, deslocações ou flashes.

Prémios mostram símbolo, base × multiplicador = resultado com os valores fornecidos. O registo de cada free spin usa miniaturas e retratos; continua limpo a cada spin. Fusões surpresa entram a partir do palco sem acender personagens que não despertaram. Ganhos: GRANDE 20×, ENORME 50×, ÉPICO 100×; MAX WIN conforme `cap.hit`. Contadores e confirmações conservam o fluxo existente.

## 9. Produção, revisão e aprovação

Um prompt por peça, com o bloco abaixo, registo futuro em `docs/art/prompts.md` quando a produção começar. Masters PNG em `art-src/`; só WebP ativos em `ui/art/`, com manifesto, origem e dimensões reais. Folhas e fotografias não são publicadas. Os caminhos de produção ainda não existem nesta etapa.

Depois de aprovada esta bíblia: B produz seis folhas para aprovação; C prepara pipeline e tema em paralelo, nos ficheiros autorizados pelo plano. Após aprovação das folhas, amostra SYM-N1, SYM-N4, SYM-P1, SYM-P5, SYM-W e CHR-P5-PORT no tabuleiro real, revista nos três desenhos. Só a aprovação dessa amostra abre os lotes.

Critérios: rosto reconhecível e favorecido, silhueta a 64 px, alpha sem halos, margens intactas, nenhum texto raster, materiais e luz coerentes. As seis folhas foram produzidas, revistas por A e aprovadas pelo dono; tamanhos reais e ficheiros no [inventário](fase3/INVENTARIO-ARTE.md). A amostra final de seis peças está integrada e foi inspecionada nos três desenhos em Edge local, incluindo estados adormecido/desperto/Party do LCD. Aguarda aprovação do dono; sem FPS medidos.

## 10. Bloco de estilo (repetir integralmente em cada prompt)

> Acidwave Neon original: ilustração cartoon adulta semi-realista, grafismo rave 90/Y2K, cromado líquido seletivo, halftone e grão discretos nas sombras.
> Paleta #0B0A1A / #29243D, reflexos #F5F1FF e a cor dominante da personagem; gradientes ácidos controlados, centro visual limpo e silhueta legível a 64 px.
> Luz suave de cima à esquerda, contraluz néon à direita, contorno escuro confiante e filete luminoso curto; tecido mate, pele natural, proporções humanas.
> Para personagens, preservar as feições e roupa da folha aprovada; personificação expressiva da substância por pose, expressão, adereços e poder surreal, sobretudo no estado ativo; rosto humano legível, sem marcas.
> Sem letras, números, logótipos ou marcas de água; peça completa com margem de segurança, alpha verdadeiro quando o inventário o exigir.

## 11. Porta atual

Bíblia, referências, seis folhas e amostra integrada aprovadas pelo dono em 05-11-2026. Produção dos quatro lotes e das animações iniciada por B/C em paralelo, com revisão de A. Pendente: QA e aprovação final da Fase 3 integrada. Fotografias adicionais do LCD são recomendadas. Nenhum commit ou deploy executado.

## 12. Revisão dos painéis e nomes — 05-11-2026

Por pedido do dono, os símbolos do tabuleiro deixam de ter nomes visíveis. A grelha conserva multiplicadores e marcas funcionais HOLD/STICKY; ativações e fusões conservam nomes e personagens representadas. As regras, o registo e os controlos continuam identificados.

Os painéis receberam maior presença Acidwave: compras rosa/tangerina, MAIS SCATTERS amarelo ácido com estado explícito, Peace Police royal/coral/lima conforme o estado e cartas de Chemistry com faixa e superfície na cor de cada personagem. A consola inferior usa violeta/royal, filete espectral, controlos jade, Rodar lima e velocidade Ultra raspberry. Cantos assimétricos e reflexos estáticos substituem o acabamento neutro. A barra mantém a geometria e o contrato do kit, apenas através de variáveis `--deck-*`.

## 13. Fonte, enquadramento e bloqueios — 05-11-2026

Pedido do dono: premium ampliados para preencher a célula, com reflexo holográfico suave e estático; rosto e multiplicadores preservados. Cofres substituídos por correntes cromadas 3D à volta do canto fechado, com centro transparente. Scatter passa a pulseira amarela com detalhes de prata e «Scatter» em vermelho prismático. Esta inscrição é uma exceção específica à regra geral de texto em HTML.

Histórico e Definições recebem materiais violeta/royal e jade; no desenho horizontal compacto, o grupo de utilitários ocupa o fundo da coluna esquerda. A ordem do DOM e os controlos existentes mantêm-se.

## 14. Refinamento integral e entrada comprada — 05-11-2026

**Atualização posterior — imagens 1–8:** o pedido mais recente recupera Normal/Rápido/Turbo e substitui a restrição de velocidade descrita abaixo. A versão atual usa resumos de poderes e estado cinzento/colorido; rosto Peace Police em close-up; reação dos quatro cadeados à compra, sem fingir cantos abertos; rótulos WILD funcionais em W/CW e JOINER WILD em DW. O copo W é tangerina, um wild normal; o shot N2 continua pagante. A explicação de cada fusão aparece uma vez no bónus, em ecrã separado das regras gerais, mas o indicador ilustrado pulsa a cada ativação fora dos reels. Party no POLICE PARTY mantém-se visualmente entre spins após a primeira ativação; as suas cores usam o par da última fusão ativa. Nenhuma destas escolhas altera pp-v7.

Revisão posterior do dono: DW passa a retrato próximo da referência PEACE_POLICE_PERSONAGEM, com JOINER/WILD e multiplicador nítidos em HTML. As introduções ilustram o estado inicial real com retratos e nomes das personagens ativas; fusões apresentam o par e uma explicação completa, partilhada com as regras, até o jogador confirmar CONTINUAR. Movimento reduzido não encurta a leitura. O distintivo continua a ser o mesmo wild multiplicador sticky do motor.

A revisão seguinte acrescenta uma fechadura central cromada/lima às correntes existentes. Peças DOM separadas permitem aproximar e inserir a chave, rodá-la, abrir a argola, separar as duas metades das correntes e desvanecer o conjunto antes de revelar o CW do evento. Movimento reduzido usa uma transição curta de opacidade. Não há GIF, nova biblioteca ou animação contínua.

Premium usam enquadramento até aos limites da célula, sem deformar rostos; HOLD/STICKY tornam-se pequenas fitas inclinadas com contorno jade e tipografia Oxanium. Rubik Glitch dá a textura expressiva aos títulos; Oxanium conserva hierarquia e valores, Manrope serve leitura longa. [Fonte oficial](https://github.com/google/fonts/tree/main/ofl/rubikglitch), [licença OFL local](../ui/fonts/RubikGlitch-OFL.txt). A versão web latina de 76 048 bytes inclui caracteres portugueses; não há pedidos externos em execução.

Janelas, tabs, seleção de bónus, confirmação, histórico, definições e autoplay partilham superfícies de tinta, linhas de impressão, cantos assimétricos e acentos ácidos. Seleção e confirmação são dois dialogs independentes, com transições de entrada/saída, foco inicial em cancelar e Escape de regresso à seleção. Confirmar valida aposta, preço, saldo e estado; consome a seleção antes do pedido para impedir compras duplicadas.

Só existe velocidade normal. Preferências antigas são normalizadas e o controlo de velocidade é escondido/desativado. Toques durante a apresentação e tecla mantida não aceleram nem criam filas. A cópia do kit e o relógio partilhado mantêm-se intactos.

Depois da aceitação de uma compra, uma grelha decorativa sobre o tabuleiro apresenta rotação de cinco colunas e paragens progressivas. Contém exatamente 3/4/5 Scatters de acordo com o bónus comprado, fora dos cantos fechados; posições, símbolos em trânsito e tempos variam por id de jogada. É uma apresentação sem pagamentos, não um spin base do motor. Desaparece antes da introdução dos free spins, cujo resultado vem integralmente da sessão.
