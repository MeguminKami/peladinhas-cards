# Continuação da apresentação React

Recuperado o estado de `docs/migration/STATUS.md`, `docs/migration-fidelity.md`, dos componentes existentes e dos scripts `.react-auth-check.mjs`, `.react-card-check.mjs` e `.react-presentation-check*.mjs`. Esses scripts foram preservados. A referência continua a ser `artifacts/migration/reference-source` e a baseline congelada; nenhuma referência foi substituída.

## Integração e correções

- Entrada, registo, perfil, pódio, estatísticas e cartas já estavam integrados em React. Administração e consulta de eventos também já tinham implementação e testes de fluxo de criação existentes; não foram reimplementados.
- Corrigida a ausência do menu de administração no editor de perfil aberto por `#/admin/player/UID/edit`, onde o original injeta esse menu após o cabeçalho. O editor do próprio perfil mantém a composição anterior.
- Removidos quatro imports sem uso em apresentação, detetados pela verificação TypeScript com `noUnusedLocals`; sem reformatação nem alterações de comportamento.

## Verificação reproduzível

`node tests/react-presentation.mjs` inicia Vite em modo `test`, usa exclusivamente as fixtures existentes e bloqueia pedidos HTTPS externos e service workers. Não acede nem escreve dados reais.

O teste verifica em 1440, 768, 390 e 320 px:

- Registo completo, incluindo passwords diferentes, perfil com acentos e nome longo, fotografia opcional, confirmação e encaminhamento para autoavaliação.
- Persistência do país, altura, peso decimal, pé preferido e posições secundárias nas fixtures.
- Guardar alterações de perfil e regressar ao perfil atualizado.
- Os cinco passos do editor de eventos, erro por título vazio e ausência de overflow horizontal.
- Missão com objetivo de estrelas, recompensa de atributos e payload de rascunho preservando objetivo, âmbito individual e recompensa.
- Menu administrativo no editor de outro jogador.
- Oito variantes de cartas, incluindo motivos especiais e decoração/watermark do Card Lab sem erros de parsing SVG.

Capturas de apoio: `test-results/react-presentation/`. Estas capturas adicionais não substituem a matriz visual de referência. A inspeção manual inclui registo em 320 px e configuração de missão por estrelas em 320 px. A comparação sistemática de temas e rotas é responsabilidade da matriz de fidelidade já existente.

`npm.cmd run typecheck` passou nesta continuação. Os testes são locais com Chromium/Edge; não certificam Safari, entrega de emails ou autenticação Firebase real.

## Comparação adicional do editor de desafios

Criado `scripts/migration-event-editor-fidelity.mjs`, com `--reference` para servir exclusivamente o snapshot original e `--compare=PASTA` para comparar React. O script recusa sobrescrever relatórios existentes. Foram preservadas também as capturas intermédias de diagnóstico.

A matriz adicional percorre competição por estrelas, missão por estrelas e evento por votação, os cinco passos e a pré-visualização, em 1440 e 320 px: 36 capturas por implementação. Usa o mesmo título, descrição, datas explícitas, fixtures e recompensa combinando +2 velocidade com uma carta criada no Card Lab. A lista de campos visíveis e respetivos valores fica em cada relatório, além do overflow e diferenças de pixels. Nas capturas do componente oculta-se apenas o chrome fixo global para evitar sobreposição causada por posições diferentes de scroll; esse chrome continua coberto pela matriz de rotas.

Esta comparação encontrou e corrigiu diferenças reais em `event-admin.tsx`: ordem das regras escritas e da explicação da competição, posição do resumo dos participantes fora da grelha de campos, largura completa do seletor de audiência, descrição da audiência na revisão e ordem das opções avançadas da votação. Não foram alterados cálculos, permissões ou recompensas.

Referência adicional final: `artifacts/migration/resume-event-editor-reference-v6/`. React final: `artifacts/migration/resume-event-editor-verified-v5/`. Os relatórios anteriores documentam os problemas encontrados e as recapturas. A comparação dos campos visíveis não encontrou valores ou campos em falta nos estados exercidos. O teste funcional `node tests/react-presentation.mjs` passou novamente após estas correções, bem como TypeScript.

Resultado final: 36/36 comparações com dimensões iguais, zero erros JavaScript e zero overflow global. Identidade, regras, recompensas e revisões mobile coincidem em pixels nas amostras finais; a maior diferença residual é 0,0236% na agenda da missão em 320 px. A inspeção das imagens correspondentes confirma a mesma composição, campos, datas, texto e espaçamentos; diferenças residuais de rasterização de texto não alteram o layout. Todos os previews mobile coincidem em pixels. As seis regressões de composição identificadas foram corrigidas antes de fechar esta verificação.
