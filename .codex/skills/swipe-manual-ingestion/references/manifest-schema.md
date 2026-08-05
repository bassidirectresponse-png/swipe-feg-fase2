# Manifesto de ingestão manual

## Estrutura raiz

```json
{
  "batchDate": "2026-08-05",
  "items": []
}
```

`batchDate` usa `AAAA-MM-DD`. O lote aceita no máximo 100 itens.

## Oferta

```json
{
  "kind": "oferta",
  "name": "Nome do produto",
  "niche": "Memória",
  "brand": "Marca opcional",
  "activeAds": 230,
  "format": "Suplemento",
  "image": "https://endereco-publico/imagem-produto.jpg",
  "domains": [
    {
      "name": "VSL 1",
      "offer": "https://dominio/pagina-vsl",
      "checkout": "https://checkout/pedido",
      "pageImage": "https://endereco-publico/print-pv.jpg",
      "checkoutImage": "https://endereco-publico/print-checkout.jpg"
    }
  ],
  "libraries": [
    { "name": "Biblioteca 1", "url": "https://facebook.com/ads/library/..." }
  ],
  "ads": [
    {
      "name": "Anúncio 1",
      "url": "https://facebook.com/...",
      "creativeName": "[ADS MM][01]",
      "platform": "meta"
    }
  ]
}
```

Tipos de oferta:

- `oferta`: FEG DR;
- `brandsgeneral`: FEG Brands — Ofertas no Geral;
- `brandsvalidated`: FEG Brands — Ofertas Insider.

## Criativo avulso

```json
{
  "kind": "criativo",
  "name": "[ADS MM][01]",
  "niche": "Memória",
  "platform": "meta",
  "adUrl": "https://facebook.com/...",
  "video": "https://arquivo-publico/video.mp4",
  "copy": "Transcrição já disponível",
  "copyLink": "https://docs.google.com/document/d/..."
}
```

`video`, `copy` e `copyLink` são opcionais. Sem vídeo, o card fica pendente para o arquivador de mídia. Sem copy, fica pendente para a automação de transcrição.

## Presell

```json
{
  "kind": "presell",
  "name": "Nome da presell",
  "niche": "Emagrecimento",
  "image": "https://endereco-publico/capa.jpg",
  "domains": [
    { "name": "Advertorial", "offer": "https://dominio/advertorial" }
  ]
}
```

## Resposta de validação

```json
{
  "ok": true,
  "mode": "validate",
  "plan": [
    {
      "kind": "oferta",
      "name": "Nome do produto",
      "action": "update",
      "newAds": 1,
      "duplicatesSkipped": 0
    }
  ],
  "totals": {
    "items": 1,
    "newCards": 0,
    "updates": 1,
    "newAds": 1
  }
}
```

Nunca aplique um lote cuja validação retorne `ok: false`.
