# RISCO · contrato fixo

Ler o [AGENTS da raiz](../../AGENTS.md), [pedido](PROMPT.md), [matemática](docs/MATEMATICA.md) e [integração](INTEGRACAO.md).

- Uso privado entre amigos, DJC fictícios, português de Portugal. Não autoriza publicação da arte. Não usar ponto e vírgula nos textos visíveis.
- Sobrevivência automática teórica 99%, teto 9 999×. Amostra uniforme inteira de 52 bits. `Ccent = clamp(floor(99 * 2^52 / (2^52 - q)), 100, 999900)`, cálculo BigInt.
- Pagamento inteiro `floor(aposta * multiplicadorCent / 100)`. Documentar a redução de retorno por arredondamento em apostas pequenas.
- Manual usa tempo do host, `m < C`. Auto é definido antes da ronda, `alvo <= C`. Não prometer retorno idêntico entre ambos.
- Curva independente de crash, saldo e histórico. Motor sem DOM, relógio, rede, Math.random ou estado global. Mesma seed e pedidos dão o mesmo resultado.
- Compromisso SHA-256 antes da contagem de cinco segundos. Seed e crash só são revelados no crash, mesmo após cashout. Nunca enviar estado interno ao iframe.
- Simulador usa exatamente o motor, nove estratégias, 1 M por estratégia sem argumentos, CSV/JSON com seed, versão e IC 95%. Seeds de validação distintas de calibração. Nunca escrever «RTP confirmado» ou «certificado».
- Mudar matemática exige subir MATH_VERSION e histórico em [versao.js](tabelas/versao.js), testes e simulação reproduzível. Não fabricar estabilidade estatística nas caudas raras.
- Preservar carteira da Sofia, idempotência, gravação durável e recuperação. Descrever plano antes de alterar Functions. Firebase real exige autorização explícita e limite.
- Derivar LCD sempre da [folha aprovada](../piece-police/art-src/characters/CHR-P5-SHEET.png), preservar rosto e óculos opacos. Caricatura simpática. Nova folha exige aprovação antes de integrar. Fontes em art-src, finais aprovados em ui/art. Fotografias nunca são publicadas.
- Efeitos só reagem a multiplicador atual e crash público. HUD HTML protegido, movimento reduzido, sem estroboscópio, pré-carga e orçamento adaptativo.
- Direção revista pelo dono: LCD com o mesmo rosto, colete sem mangas e manga de tatuagens de caveiras. Cheira durante a subida, para de cheirar no crash. Isto substitui a coreografia inicial de só cheirar depois do crash. Não muda o motor nem antecipa o resultado. A folha revista e a animação foram aprovadas pelo dono com «Sim aprovo», o atlas está ativo. Novas revisões de identidade continuam a exigir aprovação.
- Demos apenas na apresentação isolada, nunca na carteira. Música final vem do dono. Preservar interface de cinco faixas sincronizadas e prompts.
- Validar motor, carteira, interface e documentação conforme o risco. Terminar com o deploy da raiz, sem o executar por inferência.
