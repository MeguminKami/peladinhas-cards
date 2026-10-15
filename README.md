<div align="center">

<img src="docs/media/hero.svg" width="100%" alt="Peladinhas Cards — gestão de uma comunidade de futebol e cartas de jogador." />

<br />

**Plataforma para gerir jogos de futebol, avaliar jogadores e acompanhar a evolução de uma comunidade.**

Perfis com cartas individuais, organização de equipas, estatísticas, classificações e objetivos partilhados.

[![JavaScript](https://img.shields.io/badge/JavaScript-ES_Modules-131b22?style=flat-square&logo=javascript&logoColor=F7DF1E)](docs/reference/architecture.md)
[![Firebase](https://img.shields.io/badge/Firebase-Backend-131b22?style=flat-square&logo=firebase&logoColor=FFCA28)](docs/guides/deployment.md)
[![PWA](https://img.shields.io/badge/PWA-iPhone_%26_Android-131b22?style=flat-square&logo=pwa&logoColor=42e66c)](docs/guides/pwa.md)
[![Idioma](https://img.shields.io/badge/Idioma-PT--PT-131b22?style=flat-square)](docs/README.md)

<br />

<a href="https://pedalinhas-cards.web.app/"><strong>Abrir a aplicação ↗</strong></a>
&nbsp; · &nbsp;
<a href="#funcionalidades">Funcionalidades</a>
&nbsp; · &nbsp;
<a href="docs/README.md">Documentação</a>

</div>

## Sobre o projeto

**Peladinhas Cards** centraliza a gestão de uma comunidade de futebol amador. Os membros podem consultar jogadores, acompanhar jogos e resultados, avaliar colegas e comparar o seu desempenho ao longo do tempo. A organização dispõe de ferramentas para gerir equipas, eventos, recompensas e regras de evolução.

Cada jogador tem uma carta que reúne fotografia, posição, atributos e classificação geral (OVR). Essa carta combina avaliações da comunidade com a progressão obtida nos jogos, mantendo um histórico semanal para consultar a evolução.

A aplicação está disponível no browser e pode ser instalada como PWA em iPhone e Android. As operações de gestão dependem do papel atribuído à conta.

## Funcionalidades

### Painel pessoal

O ecrã inicial reúne a carta do utilizador, forma recente, jogos, vitórias, golos e assistências. Inclui os destaques semanais, as missões pendentes e os últimos jogos, com acesso direto ao perfil e às estatísticas da liga.

<img src="docs/media/dashboard.png" width="100%" alt="Painel inicial com carta de jogador, estatísticas pessoais e lista de missões pendentes." />

### Perfis, cartas e evolução

- **Perfil de jogador:** fotografia, posição, nacionalidade, carta e estatísticas individuais.
- **Avaliações:** autoavaliação inicial, avaliação de colegas e feedback dos jogos, sujeitos às regras de elegibilidade.
- **Atributos e OVR:** 12 atributos, classificação geral e seis raridades base, com regras próprias para cartas especiais.
- **Progressão:** evolução calculada a partir dos jogos e das avaliações válidas, com limites e critérios definidos no servidor.
- **Histórico semanal:** consulta das cartas e da evolução registada em semanas anteriores.

<img src="docs/media/card-rarities.png" width="100%" alt="Galeria das seis raridades base: bronze, prata e ouro, em versões comuns e raras." />

<sub>Os valores desta galeria ilustram os estilos visuais; não representam os limiares de cada raridade. [Regras de cartas e avaliações](docs/reference/cards-and-ratings.md) · [Modelo de progressão](docs/reference/progression.md)</sub>

### Organização de jogos

Os responsáveis podem criar jogos, definir data e local, distribuir jogadores entre equipas e gerir titulares e suplentes. O sorteio equilibrado utiliza os valores dos jogadores para apoiar a composição das equipas.

Depois do jogo, é possível registar o resultado, os golos e as assistências. Os participantes elegíveis podem avaliar o desempenho dos colegas; os resultados e as avaliações alimentam os indicadores e a progressão individual.

### Estatísticas e classificação

A área de estatísticas permite comparar jogadores por OVR, forma, jogos, vitórias, golos, assistências e taxa de vitória, com ordenação por indicador. O ranking semanal destaca o desempenho recente e identifica quando o OVR é usado como referência por falta de avaliações.

<img src="docs/media/statistics.png" width="100%" alt="Página de estatísticas com indicadores da liga e tabela de comparação entre jogadores." />

### Missões, eventos e recompensas

Os membros consultam objetivos, progresso, competições e eventos da comunidade. Conforme as regras de cada evento, podem votar e acompanhar classificações e resultados.

A administração pode criar missões e eventos, escolher participantes, configurar objetivos ou critérios de classificação, definir recompensas, agendar a publicação e confirmar os resultados. As recompensas podem incluir melhorias de atributos e elementos visuais para as cartas.

[Consultar modalidades, critérios e recompensas →](docs/reference/events-and-missions.md)

### Personalização e Card Lab

A interface disponibiliza quatro temas: **Club Original**, **Volt Arena**, **Champions Night** e **Ultimate 20**.

O Card Lab é a ferramenta de administração para compor e pré-visualizar cartas. Permite trabalhar modelos, camadas, paletas, molduras e fotografias, e guardar configurações visuais para utilização na aplicação.

<img src="docs/media/card-lab.png" width="100%" alt="Card Lab com opções de composição, cores e pré-visualização de uma carta de jogador." />

### Administração e apoio

As ferramentas de gestão incluem jogadores e papéis, jogos, avaliações, parâmetros de OVR, cartas, eventos e mensagens da administração. O sistema de tickets permite aos membros enviar pedidos de apoio e acompanhar as respostas.

| Papel         | Principais capacidades                                                                                   |
| :------------ | :------------------------------------------------------------------------------------------------------- |
| Membro        | Gerir o perfil, consultar a liga, fazer avaliações elegíveis, participar em eventos e contactar o apoio. |
| DBS           | Capacidades de membro e gestão dos jogos permitidos, incluindo equipas e encerramento.                   |
| Administrador | Gerir jogadores, papéis, cartas, regras de evolução, eventos, avaliações e apoio.                        |

As permissões são verificadas no servidor e nas regras de acesso aos dados.

## Experiência mobile e instalação

<table>
<tr>
<td width="36%" valign="top" align="center">
<img src="docs/media/mobile.png" width="100%" alt="Painel pessoal no telemóvel, com carta, indicadores e navegação inferior." />
</td>
<td width="64%" valign="top">

### Browser e aplicação instalada

A versão mobile adapta a navegação, os painéis e os controlos ao ecrã do telemóvel. A instalação como PWA cria um ícone no dispositivo e permite abrir a aplicação numa janela própria.

- **Android:** instalação através do browser compatível, com orientação na aplicação.
- **iPhone:** instruções para adicionar ao ecrã principal através do Safari.
- **Atualizações:** deteção de novas versões e opção de atualizar a aplicação.
- **Sem ligação:** recursos da interface em cache e ecrã de recuperação. As operações que dependem do servidor continuam a exigir Internet.
- **Notificações:** caixa de notificações na aplicação e integração Web Push com ativação por dispositivo, quando suportada.

[Instalação e funcionamento da PWA](docs/guides/pwa.md) · [Configuração e estado das notificações](docs/guides/notifications.md)

</td>
</tr>
</table>

<sub>As capturas mostram a aplicação real com contas e dados fictícios. A entrega de notificações no telemóvel depende das permissões do dispositivo e da configuração do serviço; o estado de validação está documentado no guia de notificações.</sub>

## Tecnologia

O frontend utiliza **HTML, CSS e JavaScript com ES Modules**, sem framework de interface. O **Firebase** suporta autenticação, dados em Firestore, fotografias em Storage e processamento em Cloud Functions. O manifest e o service worker suportam a instalação, o cache da interface e a integração push.

O projeto inclui testes de lógica, regras de acesso, backend, interface no browser e comportamento da PWA. A estrutura, as dependências e os procedimentos de validação estão descritos na documentação.

## Documentação

O README apresenta o produto. Os guias seguintes detalham o desenvolvimento, a operação e as regras de funcionamento.

| Desenvolvimento e operação                                     | Regras e funcionalidades                                                |
| :------------------------------------------------------------- | :---------------------------------------------------------------------- |
| [Desenvolvimento local](docs/guides/development.md)            | [Cartas, avaliações e OVR](docs/reference/cards-and-ratings.md)         |
| [Arquitetura e estrutura](docs/reference/architecture.md)      | [Progressão por jogo](docs/reference/progression.md)                    |
| [Testes e validação](docs/guides/testing.md)                   | [Eventos, missões e recompensas](docs/reference/events-and-missions.md) |
| [Publicação no Firebase](docs/guides/deployment.md)            | [PWA e instalação](docs/guides/pwa.md)                                  |
| [Migração de repositório](docs/guides/repository-migration.md) | [Notificações do telemóvel](docs/guides/notifications.md)               |
| [Recursos de design](design/README.md)                         | [Revisão da experiência](docs/reports/experience-review.md)             |

[Consultar o índice completo →](docs/README.md)

---

<div align="center">

<img src="assets/logo.svg" width="30" alt="Emblema Peladinhas Cards" />

**Peladinhas Cards**

<a href="https://pedalinhas-cards.web.app/">Aplicação</a>
&nbsp; · &nbsp;
<a href="docs/README.md">Documentação</a>
&nbsp; · &nbsp;
<a href="#sobre-o-projeto">Voltar ao início ↑</a>

</div>
