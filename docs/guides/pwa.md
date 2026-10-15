# PWA e instalação

[← Documentação](../README.md) · [Publicação](deployment.md) · [Push](notifications.md)

## O que é instalado

```mermaid
flowchart TB
    classDef default fill:#11251d,stroke:#42e66c,color:#f4f7f5,stroke-width:1px;
    A["Website por HTTPS"] --> B["Instalar pelo browser"]
    B --> C["Ícone no dispositivo"]
    C --> D["Janela própria<br/>Mesmo frontend e Firebase"]
```

| Android                                     | iPhone                                         |
| :------------------------------------------ | :--------------------------------------------- |
| Pedido nativo quando disponível.            | Abrir no Safari.                               |
| Alternativa: instruções no menu do browser. | Partilhar → Adicionar ao ecrã principal.       |
| Abrir pelo ícone instalado.                 | Ativar “Abrir como aplicação”, quando aparece. |

**Não gera APK/IPA nem publica nas lojas.** A instalação utiliza a aplicação web.

## Rede e atualizações

| Situação            | Comportamento                                                 |
| :------------------ | :------------------------------------------------------------ |
| **Com Internet**    | Consultar a liga e guardar alterações.                        |
| **Sem Internet**    | Ecrã de recuperação; recursos públicos da interface em cache. |
| **Rede recuperada** | Verificar o servidor e recuperar o destino.                   |
| **Nova versão**     | Oferecer atualizar ou adiar; não interromper formulários.     |

**O cache não guarda pedidos Firebase, dados privados nem gravações.** O worker publicado é o gerado por `build:hosting`.

[Ativação e leitura dos alertas →](notifications.md)

---

<details>
<summary><strong>Procedimentos completos e detalhes técnicos</strong></summary>

## Aplicação instalada

A PWA é a aplicação web instalada pelo browser: recebe um ícone no ecrã inicial, abre em modo standalone e continua a usar o mesmo frontend e Firebase. A distribuição atual não cria um APK/IPA nem publica nas lojas.

O início apresenta **“Instala já a APP”**, com símbolos iOS/Android e ajuda por plataforma. A instalação também está disponível na navegação. Quando a aplicação já está instalada/aberta em standalone, a interface evita repetir a promoção de instalação.

No layout desktop, o bloco fica no fim da página inicial. No layout mobile, aparece depois da saudação. A posição acompanha mudanças de largura sem duplicar o bloco nem alterar os botões de instalação.

No Android/Chromium, o botão usa o pedido nativo quando o browser disponibiliza `beforeinstallprompt`; caso contrário, mostra as instruções de instalação pelo menu. No iPhone, a ajuda orienta Safari → Partilhar → Adicionar ao ecrã principal, incluindo “Abrir como aplicação” quando aparece.

## Identidade

`manifest.webmanifest` define nome, idioma, âmbito relativo, arranque, cores, modo standalone e atalhos para jogos, missões e perfil. Os ícones PNG, maskable e Apple touch derivam do emblema da liga e ficam em `assets/pwa/`.

O frontend considera safe areas, alturas dinâmicas e o modo standalone. Os quatro temas mantêm a identidade da interface; a escolha também atualiza a cor do browser.

## Cache e rede

`build:hosting` calcula uma versão a partir dos recursos públicos e injeta o inventário em `sw.js`. O worker guarda a versão completa e separa caches por âmbito, preservando os de outras aplicações no mesmo domínio.

HTML e módulos mantêm a mesma versão até ativar uma atualização. O cache inclui recursos públicos; não guarda pedidos Firebase, APIs, fotografias privadas ou gravações. A consulta dos dados da liga e as alterações precisam de internet.

Sem ligação, a abertura apresenta `offline.html`. A recuperação verifica o servidor, conserva o destino e volta à aplicação quando a rede está disponível. A fila de confirmações de leitura de push é independente e pode persistir offline; ver [notificações](notifications.md).

## Atualizações

Um novo worker fica à espera. A aplicação oferece atualizar ou adiar e indica que o trabalho deve ser guardado. Não recarrega automaticamente um formulário a meio de uma edição.

O worker deve ser publicado a partir do build em `.firebase/site`, com inventário/hash corretos. O ficheiro fonte é destinado ao desenvolvimento e tem um inventário mínimo.

## Confirmar nos aparelhos

`npm run test:pwa` verifica o worker real em raiz e subpasta, manifest, ícones, cache privado excluído, recuperação offline e atualização adiada/ativada. Os testes não substituem a instalação física.

Depois de publicar por HTTPS, testar em iPhone e Android: instalação, arranque pelo ícone, conta, navegação, safe areas, teclado, fotografias, reabertura offline, regresso da rede e atualização de uma versão já instalada.

A instalação Web Push no iPhone exige a aplicação no ecrã inicial e uma versão do sistema compatível. Os passos e limites estão no [guia de push](notifications.md).

</details>
