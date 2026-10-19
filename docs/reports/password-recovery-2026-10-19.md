# Recuperação de passwords — 19 de outubro de 2026

Implementado localmente o fluxo aprovado com código de uso único. O admin autoriza em Jogadores, entrega o código ao próprio jogador e pode revogá-lo. No login, o jogador define a nova password, confirmando-a. Não é criada outra conta.

- Código aleatório de 144 bits, validade de uma hora, apenas hash guardado e consumo transacional exclusivo.
- Capacidade `access`, autenticação recente do admin e proteção de administradores completos.
- Tentativas públicas limitadas por IP; App Check respeitado quando exigido.
- Alteração Firebase Auth, revogação de sessões, auditoria sem credenciais e falhas que exigem nova autorização.
- UI verificada em 1440, 768, 390 e 320 px, com redução de movimento e operação por teclado.

Validação local: seis testes de backend nos emuladores Firestore/Auth; teste de regras que impede leitura/escrita direta das autorizações; teste de browser de autorização/revogação, confirmação e envio pelo login. Sintaxe ES Modules e ligações da documentação verificadas. As capturas usam dados fictícios. Não foi executado deploy nem verificada a configuração Auth/App Check de produção.

Procedimento e publicação seletiva: [referência de Manutenção](../reference/maintenance.md#recuperação-pelo-próprio-jogador). Comandos reutilizáveis: [guia de testes](../guides/testing.md). Sem migração de utilizadores nem alteração de regras Firestore.
