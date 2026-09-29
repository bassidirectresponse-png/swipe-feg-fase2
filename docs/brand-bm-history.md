# Histórico da Business Manager em Ofertas Insider

O modelo de referência é a prévia administrativa de Ultima Peak. Cada leitura da BM é identificada pela data de captura. Dentro da leitura, cada janela (1, 7, 14 ou 30 dias) tem seus próprios totais e campanhas. O carrossel mostra as leituras mais recentes primeiro e mantém o mesmo período ao trocar de data. Julho permanece nos dados publicados; setembro é acrescentado apenas à prévia administrativa, sem sobrescrever o histórico.

Na validação de layout, apenas a Ultima Peak tem uma subseção própria em **Ofertas Insider → Saúde masculina → Ultima Peak** no painel admin. A capa desse produto mostra identidade e nicho, sem gastos, compras, leitura ou contadores; os dados continuam no detalhe. O gráfico de anúncios ativos é independente dos relatórios da BM e deve continuar usando `adsHistory` existente. Não crie séries de ads a partir dos gastos nem preencha valores ausentes. Os demais produtos e a visão de usuários comuns mantêm a apresentação anterior até a aprovação do padrão.

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

Os links de anúncios ficam em `brandTopAds` com `period` e `sourceDate`. Não inclua capturas da BM em `bmPrints`: os números entram nos campos estruturados.

Para o admin ver a prévia mesmo antes de aplicar a migração no Supabase, o histórico de setembro é gerado a partir de `supabase/migrations/202609290001_admin_only_ultima_peak_september_draft.sql` com `npm run bm:sync` e servido por `admin-bm-history`, que exige uma sessão administrativa. A tabela `admin_offer_drafts`, quando existir, pode acrescentar ou corrigir leituras; os relatórios são combinados pela chave única. `npm run bm:check` detecta divergências entre a migração e o módulo gerado.

Ao cadastrar a próxima análise mensal, crie uma nova leitura com data de captura própria, mantenha as anteriores e use o mesmo esquema de `bmReports`. A versão publicada não recebe essa prévia até a aprovação explícita para disponibilizar a todos.
