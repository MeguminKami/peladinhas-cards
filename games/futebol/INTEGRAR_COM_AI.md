# Integração da slot no projeto principal

Entrega este ficheiro à AI responsável pelo website, juntamente com esta pasta.

## Prompt para a AI

Integra a aplicação Futebol de Bairro — Noite de Glória neste website. A pasta contém o código completo da slot, assets ativos, testes e documentação. Primeiro lê `AGENTS.md` e `README.md` desta pasta e as instruções do website. Não alteres a matemática nem o aspeto do jogo para fazer a integração.

1. Inspeciona a arquitetura do website e identifica o utilizador autenticado, o saldo fictício e o local onde inserir o jogo.
2. Instala as dependências dentro da pasta da slot com `npm ci`. Requer Node.js 24.16 ou superior. Executa `npm run check`, `npm test` e `npm run build`. No PowerShell usa `npm.cmd` se necessário.
3. Integra a build como aplicação estática isolada num iframe, servida por uma rota própria, por exemplo `/jogos/futebol/`. Mantém a estrutura de `dist/`; não publiques fontes, testes, documentos ou dependências. Adapta a cópia/build ao sistema de deploy do website sem confundir a raiz pública com a raiz do código da slot.
4. Usa o módulo `slot-host.js` e `mountSlot` para montar `embed.html`. Usa `host-demo.html` como exemplo funcional, não como carteira de produção. Implementa a montagem/desmontagem segundo o ciclo de vida do framework; não criar instâncias duplicadas ou reiniciar a slot em cada render.
5. Liga `getBalance` e `settle` ao backend de saldo fictício já existente. Valores em inteiros: 20 = 0,20 créditos. O backend deve autenticar o jogador, verificar o débito antes do crédito e aplicar a liquidação atomicamente. Identificar cada operação por utilizador + ID estável, impedir duplicação e rejeitar o mesmo ID com dados diferentes. Uma resposta perdida deve permitir repetir a mesma operação com segurança. Só marcar uma rejeição como definitiva quando houver garantia de que a operação não foi aplicada.
6. Nunca confiar em `playerId` enviado pelo browser para autorizar acesso ao saldo. O resultado do motor local não é autoridade para dinheiro real. Não adicionar pagamentos reais.
7. Usa `playerId` estável, destrói a instância ao mudar de jogador e mantém seed/RNG/estado por utilizador. A seed é local ao browser e à origem; não migra automaticamente entre domínios nem dispositivos. Não apagar pedidos pendentes para resolver erros nem renovar a seed automaticamente.
8. Mantém os modos compacto e expandido no mesmo iframe. Mantém verificações de origem e janela nas mensagens; configura CSP/frame-ancestors quando necessário. Não colocar tokens de autenticação no URL.
9. Valida saldo insuficiente, liquidação e repetição idempotente, reload com pedido pendente, restauro de bónus, troca de jogador, expandir/recolher, imagens/som e layout mobile. Adapta a execução Playwright ao ambiente do website quando necessário.
10. Entrega a integração funcional e documenta comandos de build/publicação e alterações no website. Pergunta apenas pelos contratos ou acessos realmente indisponíveis; não inventes endpoints funcionais. Se o backend de carteira não existir, implementa a demonstração isolada de créditos fictícios e identifica claramente o que falta para a integração definitiva.

## Conteúdo do pacote

- `src/`, `web/`, `public/`: aplicação e assets ativos.
- `dist/`: build pronta para servir, regenerável a partir do código.
- `test/`, `e2e/`, configurações e lockfile: validação e instalação reproduzível.
- `docs/`, `reports/`, `examples/`: contexto, decisões e medições históricas versionadas.
- `README.md`: contrato detalhado da carteira e SDK.

Não estão incluídos `node_modules`, sessões locais, resultados temporários de testes, fotografias pessoais de referência ou arquivo de imagens antigas. Documentos históricos podem mencionar assets arquivados, que não são necessários para executar o jogo. A versão matemática atual é 0.6.0, com RTP ainda por medir; não reutilizar o RTP histórico como medição atual.
