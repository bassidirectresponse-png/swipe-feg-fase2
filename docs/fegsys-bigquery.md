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

- O backend lê os últimos 365 dias da view `gold_feg.vw_ads_criativo_diario`, incluindo pedidos, faturamento e mídia, e usa `gold_feg.fct_meta_ads_performance` apenas para complementar os detalhes da Meta.
- Pedidos, faturamento e ticket vêm da própria `vw_ads_criativo_diario`. O ROAS principal é calculado com o faturamento da view dividido pelo investimento consolidado.
- Compras, receita, ROAS, CPA, checkouts, alcance, frequência e retenção reportados pela Meta aparecem separadamente no detalhe do card.
- Um snapshot diário é mantido em Netlify Blobs e atualizado de hora em hora.
- O endpoint do Mega Brain exige uma sessão do usuário administrador.
- Cards manuais nunca são alterados.
- Um criativo sincronizado cujo nome já exista no acervo manual é omitido, evitando duplicidade.
- Os filtros de hoje, ontem, 7, 14, 30, 90 dias e período personalizado afetam somente os dados sincronizados.

## Limite atual das fontes

As fontes atuais não fornecem URL do vídeo, texto da copy, autor ou nicho. `creative_id` e `ad_id` ficam disponíveis para uma futura integração com a API da Meta, mas não são arquivos de mídia. Por isso, vídeo e copy continuam pendentes até existir uma fonte autorizada que entregue esses materiais.
