# Integração FEGSYS → Mega Brain

## Segurança obrigatória

A conta de serviço deve continuar com acesso somente leitura:

- `BigQuery Data Viewer` no dataset `gold_feg`;
- `BigQuery Job User` no projeto `grupofeg-lakehouse`.

Nunca salve o JSON no repositório. Como a primeira chave foi compartilhada em uma conversa, ela deve ser revogada e substituída antes da ativação.

## Ativação na Netlify

1. Gere uma nova chave JSON para `swipe-reader@grupofeg-lakehouse.iam.gserviceaccount.com`.
2. Converta o arquivo completo para Base64 sem quebras de linha.
3. Na Netlify, crie a variável protegida `GOOGLE_SERVICE_ACCOUNT_JSON_B64` com esse valor.
4. Faça um novo deploy. A função `fegsys-sync` executa no minuto 13 de cada hora.

Também é aceito `GOOGLE_SERVICE_ACCOUNT_JSON`, mas Base64 evita problemas com as quebras de linha da chave privada.

## Comportamento

- O backend lê os últimos 365 dias da view `gold_feg.vw_ads_criativo_diario`.
- Um snapshot diário é mantido em Netlify Blobs e atualizado de hora em hora.
- O endpoint do Mega Brain exige uma sessão do usuário administrador.
- Cards manuais nunca são alterados.
- Um criativo sincronizado cujo nome já exista no acervo manual é omitido, evitando duplicidade.
- Os filtros de hoje, ontem, 7, 14, 30, 90 dias e período personalizado afetam somente os dados sincronizados.

## Limite atual da view

A view fornece data, criativo, plataforma, investimento, impressões, cliques, visualizações de vídeo e conversões informativas do Google. Ela não fornece vídeo, copy, autor, nicho nem vendas oficiais da Meta. Por isso, esses campos aparecem como pendentes nos cards sincronizados até que uma fonte vinculada seja adicionada à view.

