# Ultimate mais exigente do que Ícone — 21/10/2026

Revisão `2026-10-21-ultimate-step`. A transformação de novas propostas Ultimate/200% passa a aplicar um requisito estritamente superior ao da Ícone/150% do mesmo modelo/fase. Antes, ambas usavam o mesmo degrau sobre D2. A Ícone mantém os seus alvos; não se alteram probabilidades de raridade, avanço, recompensas, amostras mínimas, janela de 48 horas ou regra de próximo jogo.

O reforço depende do caminho e das condições presentes: contribuições em Velocidade/Drible/Resistência/Motor criativo; assistência complementar na Finalização com quatro golos ou Atacante completo; golo complementar na Visão com assistências; qualidade do critério principal nos restantes; máximo de sofridos reduzido em Fortaleza apenas acima de cinco. Fallbacks preservam todos os requisitos anteriores e garantem uma condição adicional não redundante, sem superar cinco estrelas. Não se aplicam todos os reforços simultaneamente. Regras e exemplos exatos dos 15 caminhos/fusões são gerados no [QuestETC](../../QuestETC.md).

Os exemplos discutidos foram adaptados aos alvos e fases existentes: não se substituiu todo o catálogo por 15 missões fixas. Exemplo efetivo em Finalização/F0: Ícone exige quatro golos; Ultimate exige quatro golos e uma assistência. Continua a haver 225 modelos e progressão por fase. Os intervalos de raridade e exemplos reais foram regenerados a partir do código.

Sem nova recolha Firestore: a referência estatística continua a ser dois jogos 5x5 de 19/10. Não há medição nova de taxa de sucesso destas combinações, sobretudo GR. Esta é uma decisão de desenho fundamentada na amostra provisória e no pedido de progressão de dificuldade, não uma recalibração cloud automática.

## Preservação

Ofertas já reveladas, preparações, tentativas pendentes e resultados existentes não recebem o agravamento. Não há migração nem recálculo de semanas fechadas. Uma Ultimate antiga pode manter a dificuldade igual à Ícone; novas propostas e rerolls usam a nova revisão. A correção defensiva histórica conserva o seu âmbito anterior.

## Validação local

- 160 testes da suite geral passaram. A verificação exaustiva cobre todos os modelos D2 nos 15 caminhos e três fases: Ultimate implica Ícone, Ícone não implica Ultimate, alvos válidos e entradas não mutadas. Inclui amostragem de ofertas reais de 150/200% e tetos de estrelas.
- 4 testes backend passaram em projeto demo isolado. O caso novo grava uma Ultimate antiga, consulta novamente e aceita a oferta, verificando que o objetivo permanece intacto.
- Interface dos percursos: condições, teclado, redução de movimento, quatro temas e larguras 1440/768/390/320 passaram. Não houve alteração de layout.
- Inventário QuestETC regenerado e conferido com `--check`; documentação e build de hosting passaram. Os testes não consultaram documentos de produção.

A porta habitual 8086 estava ocupada; usou-se um emulador separado em 8097, sem parar nem limpar o serviço existente. O emulador desta validação terminou normalmente.

## Publicação necessária

Não foi executado deploy. O parâmetro é partilhado pelo motor de percursos, sincronização de jogos e feedback; publicar os sete consumidores e o frontend:

```powershell
npx.cmd firebase deploy --only "functions:peladinhas:getPath,functions:peladinhas:pathAction,functions:peladinhas:onPathGame,functions:peladinhas:onPathSummary,functions:peladinhas:settlePaths,functions:peladinhas:gameAction,functions:peladinhas:feedbackAction"
npm.cmd run deploy:frontend
```

Não são necessárias alterações de regras, índices ou dados existentes. Configuração e publicação cloud não foram verificadas.
