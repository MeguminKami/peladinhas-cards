# Clube favorito e emblemas

[Documentação](../README.md) · [Contrato das cartas](../reference/modelo-base-carta.md) · [Publicação](../../DEPLOY.md)

## Escolha técnica

Usar **API-Football + catálogo global em Firestore + URLs de emblemas no CDN do fornecedor**. Reutiliza Auth, Functions, Secret Manager, Firestore e Hosting existentes, sem novas dependências. A pesquisa internacional depende da cobertura do fornecedor; não se promete cobertura universal.

Comparação das fontes, consultadas em 30/10/2026:

| Fonte | Cobertura, condições e decisão |
| --- | --- |
| API-Football / API-Sports | Pesquisa de equipas por nome, incluindo Portugal; [plano gratuito de 100 pedidos/dia](https://www.api-football.com/pricing). Os [termos](https://www.api-football.com/terms) distinguem identificação de clubes de autorização sobre marcas. O [guia do fornecedor](https://www.api-football.com/news/post/how-to-get-started-with-api-football-the-complete-beginners-guide) recomenda cache de imagens. Escolhida pela pesquisa dedicada e limites previsíveis. |
| Football-Data.org | O [plano gratuito](https://www.football-data.org/coverage) inclui a Primeira Liga e outras competições, com cobertura delimitada por competição. Não foi confirmada autorização geral de redistribuição de emblemas; não foi escolhida como pesquisa internacional. |
| TheSportsDB | [Pesquisa por nome](https://www.thesportsdb.com/docs_api_guide), base colaborativa e cobertura variável. Os [termos atuais](https://api.thesportsdb.com/docs_terms_of_use.php) limitam a publicação em app stores no plano gratuito e exigem atenção à licença de cada imagem e a direitos de terceiros. Não assumir que a chave pública demonstra autorização comercial. |
| Wikidata / Wikimedia Commons | Dados estruturados úteis, mas nem todos os clubes têm emblemas reutilizáveis. A [reutilização de imagens](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia) depende da licença de cada ficheiro e pode exigir atribuição. Resolver identidade, imagem e licença adicionaria pedidos e manutenção. |
| Repositórios GitHub | Por exemplo, [football-logos](https://github.com/luukhopman/football-logos) cobre 25 ligas europeias, com organização por época. A existência de um ficheiro público não comprova licença comercial do emblema. Não oferece pesquisa internacional mantida como serviço nem garantia de disponibilidade. |
| Outras fontes | Não foi encontrada, entre as fontes verificadas, uma alternativa que justificasse mais um serviço ou scraping. Não se usa scraping de motores de busca ou de páginas de clubes. |

Os emblemas são marcas dos clubes; o fornecedor não transfere esses direitos. A utilização implementada é identificativa. Monetização, publicidade ou associação comercial podem exigir autorização adicional. Não foi ativada uma subscrição nem validada uma chave real.

## Arquitetura e dados

| Opção | Avaliação |
| --- | --- |
| A — URL externo no jogador | Pouco armazenamento, mas sem catálogo comum duplicaria pesquisas. |
| B — descarregar emblemas | Mais controlo, com custos de Storage, tráfego próprio, atualização e direitos de redistribuição. Sem benefício suficiente nesta fase. |
| C — catálogo comum e apenas ID no jogador | Evita duplicação do catálogo, mas exigiria resolver referências ao apresentar perfis e classificações. |
| D — híbrida escolhida | Catálogo comum, cache de pesquisas e pequeno snapshot no jogador. Imagens externas, sem downloads antecipados e sem consultas adicionais para renderizar. |

Os documentos ficam em subcoleções de `footballClubData/main`, inacessíveis diretamente ao browser:

- `clubs/{af-ID}`: ID, nome, país e URL canónico do emblema. O ID do fornecedor deriva do prefixo `af-`.
- `searches/{SHA256(query)}`: até 20 clubes, validade e lease curta contra pedidos simultâneos. Resultados válidos duram 30 dias; resultados vazios, um dia. Uma falha do fornecedor não é guardada como resultado vazio.
- `budgets/global` e `budgets/{hash}`: teto global e por conta/IP; não se guarda o IP em texto. Os documentos são reutilizados, sem criar um contador por dia.
- `selections/{uid}`: dia de Lisboa e número de trocas desse dia, exclusivos do servidor.

Esta estrutura evita invocar o trigger genérico de documentos da raiz para cada clube ou entrada de cache. Não exige novos índices ou ficheiros em Storage. Não existe limpeza automática destas subcoleções: resultados expirados são renovados a pedido, e pesquisas distintas podem acumular até 80 documentos/dia. Os campos `expiresAt` dos orçamentos não ativam TTL por si só.

`users/{uid}.favoriteClub` contém um snapshot pequeno do clube, validado pelo servidor. Esta duplicação deliberada evita joins ao mostrar jogadores. O URL é reconstruído a partir do ID validado e do domínio fixo `media.api-sports.io`, nunca de texto enviado pelo utilizador. Os dados já acompanham as leituras habituais do perfil e a projeção pública de `getHome`.

O emblema aparece por baixo da bandeira nas cartas normais e da loja, no perfil e no ranking. Usa carregamento diferido, dimensões reservadas e fallback local com o nome do clube acessível. A cache HTTP das imagens depende dos cabeçalhos do CDN; não se promete que o browser nunca volte a descarregar a imagem.

## Pesquisa, seleção e segurança

O formulário partilhado serve a criação e a edição de perfil. Pesquisa após 500 ms sem escrever, com pelo menos três caracteres; Enter também pesquisa. Normaliza acentos/espaços, limita tamanho, mostra o país e ignora respostas ultrapassadas. Cada página conserva até 50 pesquisas durante uma hora. Nomes de pesquisa usam caracteres latinos normalizados; refinar o nome quando houver mais de 20 correspondências.

A pesquisa aceita visitantes para funcionar antes da criação da conta. Respeita o modo e as funcionalidades globais, App Check quando exigido, e bloqueia contas desativadas. Apenas novas consultas ao fornecedor consomem os limites persistentes: **80/dia UTC globalmente, 15/dia por conta ou IP e 8/minuto globalmente**. Reservas são transacionais, incluindo pedidos falhados; não há upgrades automáticos. Resultados em cache continuam disponíveis quando se atinge o teto. Estes limites protegem a quota externa; não constituem um teto absoluto de custos de invocações ou leituras públicas sob abuso.

A seleção exige autenticação e conta ativa. Recebe apenas o ID, confirma o clube no catálogo e grava o snapshot e o contador numa transação. **A primeira escolha não consome trocas; depois são permitidas duas trocas por dia civil em `Europe/Lisbon`**, incluindo horário de verão. Selecionar o mesmo clube é idempotente. As regras impedem atribuir ou alterar `favoriteClub` diretamente, também por administradores. Não há remoção do clube pela interface, evitando repor a primeira escolha através de uma remoção.

No registo, o perfil é criado antes da callable de seleção; uma falha desta mantém a conta e mostra a indicação para escolher o clube mais tarde. Na edição, a seleção tem a sua transação e a gravação dos restantes campos mantém o fluxo existente; não é uma única transação para todo o formulário.

## Consumo estimado

Contagens base sem repetições de transação, leituras de regras, triggers ou reconstrução dos caches existentes:

| Operação | Firestore | API externa / imagens |
| --- | --- | --- |
| Mostrar clube num perfil/carta/ranking já carregado | 0 leituras e 0 escritas adicionais; apenas alguns campos no payload habitual | 0 chamadas à API; imagem no CDN, reutilizável pelo browser |
| Repetir pesquisa na cache da página | 0 leituras/escritas | 0 chamadas |
| Pesquisa na cache partilhada | 2 leituras como visitante; 3 com conta; 0 escritas | 0 chamadas |
| Pesquisa sem cache, com N clubes | 5 leituras como visitante; 6 com conta; N + 4 escritas, N ≤ 20 | 1 chamada; imagens só quando apresentadas |
| Seleção diferente | 7 leituras e 4 escritas, incluindo o limitador de segurança já existente; a edição ainda grava os outros dados do perfil | 0 chamadas externas |

Uma escolha também aciona a invalidação habitual do início, com dois sinais e posterior reconstrução a pedido. Alterar apenas o clube não enfileira cálculos de atributos, eventos ou percursos. Não há recálculo obrigatório de dados abertos; os previews da semana aberta usam o clube atual. Novos snapshots guardam o clube; semanas já fechadas permanecem intactas e não recebem retroativamente o clube atual.

O armazenamento adicional é metadata, proporcional aos clubes, pesquisas e jogadores; não há bytes de emblemas no Storage próprio. O tráfego exato depende dos PNG do fornecedor e da cache dos dispositivos. Functions, Firestore e Secret Manager mantêm os preços e quotas da infraestrutura existente: plano gratuito da API não significa custo total garantidamente nulo.

## Configuração e publicação

Criar uma conta API-Football no plano gratuito e obter a chave para a API direta API-Sports. Guardá-la localmente através do prompt seguro do CLI, nunca no frontend, Git ou nesta documentação:

```powershell
npx.cmd firebase functions:secrets:set FOOTBALL_API_KEY --project pedalinhas-cards
```

O secret só é associado a `searchFootballClubs`. Uma chave ausente/inválida impede novas pesquisas; o formulário permite continuar sem clube. No deploy, o Firebase exige que o secret declarado exista. Não foi feita configuração cloud nem publicação nesta implementação.

Publicar Functions e regras antes do frontend. Os consumidores efetivos são:

- Pesquisa e seleção: `searchFootballClubs`, `selectFootballClub`.
- Projeção e invalidação do início: `getHome`, `onHomeSource`.
- Novos snapshots: `rebuildHistory`, `rebuildLeague`, `refreshCardCollection`, `closeCardWeek`, `openCardWeek`, `eventAction`, `maintenanceAction`, `systemHeartbeat`.
- Entradas do ciclo que executam o construtor partilhado: `processFeedback`, `closeEvents`, `settlePaths`, `scheduledNotifications`, `onCommunityWork`, `onFeedbackWork`, `gameAction`.

O tracker pode marcar outras Functions conservadoramente por partilharem o ficheiro de entrada; isso não demonstra consumo efetivo.

```powershell
npm.cmd run deploy:pending -- --only "functions:peladinhas:searchFootballClubs,functions:peladinhas:selectFootballClub,functions:peladinhas:getHome,functions:peladinhas:onHomeSource,functions:peladinhas:rebuildHistory,functions:peladinhas:rebuildLeague,functions:peladinhas:refreshCardCollection,functions:peladinhas:closeCardWeek,functions:peladinhas:openCardWeek,functions:peladinhas:eventAction,functions:peladinhas:maintenanceAction,functions:peladinhas:systemHeartbeat,functions:peladinhas:processFeedback,functions:peladinhas:closeEvents,functions:peladinhas:settlePaths,functions:peladinhas:scheduledNotifications,functions:peladinhas:onCommunityWork,functions:peladinhas:onFeedbackWork,functions:peladinhas:gameAction,firestore:rules"
npm.cmd run deploy:pending -- --only hosting
```

## Testes locais

```powershell
node --test tests/football-clubs.test.js
node tests/football-clubs.mjs
node scripts/emulator-cli.mjs emulators:exec --config firebase.backend.json --project demo-peladinhas-clubs --only firestore "node --test tests/football-clubs.backend.test.js tests/firestore.rules.test.js"
npm.cmd run test:docs
npm.cmd run check
```

O teste de browser inicia o servidor de fixtures e usa imagens indisponíveis simuladas para verificar o fallback. O backend usa respostas de API simuladas e um projeto demo no emulador; não valida a cobertura ou disponibilidade de logótipos reais. Se a porta do emulador estiver ocupada, usar uma configuração local com portas livres, sem parar processos de outras tarefas.
