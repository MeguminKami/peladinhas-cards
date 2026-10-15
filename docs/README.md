# Documentação · Peladinhas Cards

[← Apresentação do projeto](../README.md)

O README apresenta a experiência. Aqui estão os guias para trabalhar no projeto, as regras do produto e o registo da revisão realizada.

## Guias

| Documento                                                | Para quê                                                                 |
| :------------------------------------------------------- | :----------------------------------------------------------------------- |
| [Desenvolvimento local](guides/development.md)           | Preparar o ambiente, configurar Firebase e conhecer o ciclo de trabalho. |
| [Testes e validação](guides/testing.md)                  | Escolher os testes, usar emuladores e rever o resultado no browser.      |
| [Publicação](guides/deployment.md)                       | Publicar Hosting, Functions e regras; atualizar a aplicação instalada.   |
| [PWA e instalação](guides/pwa.md)                        | Comportamento em iPhone/Android, offline, cache e atualizações.          |
| [Notificações push](guides/notifications.md)             | Permissões, envio, leitura, segurança e configuração VAPID.              |
| [Mudança de repositório](guides/repository-migration.md) | Preparar uma cópia limpa e rever origens, caminhos e segredos.           |

## Referência

| Documento                                                  | Conteúdo                                                           |
| :--------------------------------------------------------- | :----------------------------------------------------------------- |
| [Arquitetura e estrutura](reference/architecture.md)       | Pastas, módulos, fluxo de dados e permissões.                      |
| [Cartas, avaliações e OVR](reference/cards-and-ratings.md) | Primeira carta, comunidade, posições, ciclo semanal e inatividade. |
| [Progressão por jogo](reference/progression.md)            | Fórmula de evolução, limites e simulação reproduzível.             |
| [Eventos e missões](reference/events-and-missions.md)      | Objetivos, votos, recompensas, elegibilidade e privacidade.        |
| [Recursos de design](../design/README.md)                  | Originais, derivados e regeneração de fontes/ícones.               |

## Registo de trabalho

[Revisão da experiência](reports/experience-review.md) descreve as melhorias e os métodos de validação. É um registo da revisão; os guias acima documentam os procedimentos atuais.

As imagens da apresentação vivem em [`media/`](media/). São recursos locais, com dados de demonstração. Regeneração: `npm run docs:images`.
