# Funções exclusivamente na Europa

27/10/2026. Pedido: executar o servidor apenas em `europe-west1`.

Diagnóstico confirmado pelos metadados de Cloud Functions: 67 funções em `europe-west1` e duas em `us-central1`, `getCasinoShop` e `buyCasinoCard`. Não foram consultados documentos do Firestore nem ficheiros ou metadados do Storage.

As duas funções da loja eram criadas antes de aplicar `setGlobalOptions`. A criação foi movida para depois da configuração global. A inspeção local dos metadados passou: 69 funções, todas e apenas em `europe-west1`. O cliente e os endpoints push já usam essa região.

Foi acrescentado `scripts/check-function-regions.mjs` a `npm.cmd run check`, para impedir que novas funções sejam criadas noutra região ou antes de definir a configuração global. A verificação não usa credenciais nem acessos à cloud.

Publicação seletiva executada em 27/10/2026 para `getCasinoShop` e `buyCasinoCard`. Verificação posterior com `functions:list`: 69 funções em `europe-west1`, ambas as funções da loja em estado `ACTIVE`, nenhuma função fora dessa região. As cópias em `us-central1` deixaram de existir. A configuração local e a documentação passaram as verificações.

O âmbito da correção é Cloud Functions; não migra bases de dados, buckets ou outros serviços. A confirmação publicada foi feita apenas através dos metadados de funções, sem executar os endpoints de negócio nem consultar dados dos jogadores.
