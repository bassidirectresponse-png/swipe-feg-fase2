# Histórico da Business Manager em Ofertas Insider

O modelo de referência é a prévia administrativa de Ultima Peak. Cada leitura da BM é identificada pela data de captura. Dentro da leitura, cada janela (1, 7, 14 ou 30 dias) tem seus próprios totais e campanhas. O carrossel mostra as leituras mais recentes primeiro e mantém o mesmo período ao trocar de data.

## Cadastro de uma nova leitura

Acrescente objetos em `bmReports` sem remover os relatórios anteriores. Use uma chave única por data e janela, como `2026-09-18-7d`. Uma correção do mesmo recorte pode substituir o objeto com a mesma chave; uma nova data deve gerar uma nova chave.

```json
{
  "key": "2026-09-18-7d",
  "label": "Últimos 7 dias",
  "range": "12/09/2026 a 18/09/2026",
  "capturedAt": "2026-09-18",
  "level": "Campanhas",
  "currency": "USD",
  "totals": {
    "spend": "US$ 8.379,11",
    "results": "89 compras",
    "roas": "—",
    "avgConversion": "US$ 100,88",
    "ctr": "1,95%",
    "cpc": "US$ 2,51",
    "cpm": "US$ 48,96"
  },
  "campaigns": [
    {
      "name": "04/08/26 | BnB | BS-CBO | CA01",
      "spend": "US$ 2.367,57",
      "results": "19 compras",
      "roas": "0,81",
      "costResult": "US$ 124,61"
    }
  ]
}
```

Transcreva apenas os campos visíveis na fonte. Deixe `"—"` quando o agregado não existir; não calcule um ROAS total a partir dos ROAS individuais. Diferencie compras de visitas no texto de `results`. Um resultado auxiliar, como visitas da campanha Aquec, pode ir em `totals.otherResults` sem entrar na contagem de vendas.

Os campos aceitos em `totals` e em cada campanha são `spend`, `results`, `roas`, `avgConversion`, `costResult`, `ctr`, `cpc`, `cpcLink`, `cpm` e `costUnique`. Quando a origem mostrar CPC de clique no link e não houver CPC geral separado, preencha `cpc`; o painel rotula esse valor como “CPC no link”. Se ambos existirem, preencha também `cpcLink`.

Os links de anúncios ficam em `brandTopAds` com `period` e `sourceDate`. Não inclua capturas da BM em `bmPrints`: os números entram nos campos estruturados. O histórico de Ultima Peak permanece no rascunho `admin_offer_drafts` até a validação da versão pública.
