# Rodada 5 — dados opcionais dos cards (contrato 8e/v1.5)

Apify: `apify~facebook-ads-scraper`, sem chamada real nesta tarefa.
O código existente (`apify-offer-discovery.mjs`, `apify-brand-archive.mjs` e seus
testes) confirma `snapshot.body.text`/body string, linkUrl e startDateFormatted.
O adapter aceita também os nomes snake_case fornecidos no contrato:

| Origem | Campo achatado |
| --- | --- |
| snapshot.body.text ou snapshot.body | ad_text, texto puro até 500 caracteres |
| snapshot.link_url / linkUrl | landing_url, landing_domain derivado da URL |
| snapshot.cta_text / ctaText | cta_text |
| start_date / startDate; fallback start_date_formatted / startDateFormatted | started_at UTC ISO |
| publisher_platform / publisherPlatform | platforms, quatro valores permitidos |
| snapshot.display_format / displayFormat | display_format, image/video/carousel/dco |
| snapshot.page_profile_picture_url / pageProfilePictureUrl | page_picture_url, HTTPS fbcdn.net |

Campos ausentes/invalidáveis são omitidos, inclusive na projeção pública.
Recoletas preservam dados opcionais anteriores quando o novo lote não os traz.
Nenhum HTML bruto nem propriedades arbitrárias do provedor são projetados.

`202610280002_offer_intelligence_display.sql` é uma migration SOMENTE EM ARQUIVO.
Mantém a RPC de persistência, lease/lock e grants; acrescenta dados derivados
atomicamente nas tabelas auxiliares. `ads_found` conta identidades de anúncios
persistidos do Page ID em todo o escopo, incluindo coletas anteriores, sem
somar duplicatas. Não significa o total ativo na biblioteca Meta (`ads_count`).
`funnel_id` seleciona o funil mais recente cuja etapa inicial tem domínio original
ou final correspondente, sempre no mesmo escopo. Sem funil, não inventa um ID.
Esses dois campos dependem da aplicação autorizada da migration e de uma
persistência posterior. Não há backfill automático nem escrita em offers.data.

Fixture Apify realista identificada FAKE; não é captura de um dataset real.
Testes de agregados usam storage FAKE: SQL ainda não executado em PostgreSQL.
Sem alteração visual, screenshots, chamadas pagas, push ou deploy.
