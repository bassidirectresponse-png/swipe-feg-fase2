# Ultima Peak

Arquivos persistentes usados pelo card de Ofertas Insider:

- `product.png`: capa oficial do produto.
- `print-01.jpeg` a `print-10.jpeg`: evidências da BM organizadas por período e configuração.
- `top-ad-01.jpg` a `top-ad-05.jpg/mp4`: mídias dos cinco links exatos enviados, preservadas localmente antes do envio ao Storage.

O script `scripts/ingest_extra_brands.mjs ultima-peak` publica as mídias no bucket `criativos` e grava no card os links permanentes.
