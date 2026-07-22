# Automações do Swipe

## Ativação no Supabase

Execute no SQL Editor, nesta ordem:

1. `db/swipe-automation-hardening.sql`
2. confira a quantidade de itens que serão afetados pelo backfill;
3. `db/swipe-automation-backfill.sql`

Consulta de conferência antes do backfill:

```sql
select
  count(*) filter (
    where coalesce(data->>'kind', 'oferta') in ('oferta', 'brandsgeneral', 'brandsvalidated')
      and coalesce(data->>'tipoTrafego', 'meta') = 'meta'
      and jsonb_typeof(data->'bibliotecas') = 'array'
      and jsonb_array_length(data->'bibliotecas') > 0
      and not (data ? 'analysisStatus')
  ) as analises_pendentes,
  count(*) filter (
    where data->>'kind' in ('criativo', 'megabrain')
      and nullif(btrim(coalesce(data->>'video', '')), '') is not null
      and nullif(btrim(coalesce(data->>'transcricao', '')), '') is null
      and not (data ? 'transcriptionStatus')
  ) as transcricoes_pendentes
from public.offers;
```

O backfill somente marca os itens elegíveis como `pending`. Os workflows processam em lotes, com lock, limite de tentativas e backoff; transcrições existentes não são apagadas.

## Agendamentos

- Transcrição: 06:00 e 18:00, horário de São Paulo (`09:00` e `21:00` UTC).
- Análise da biblioteca: 08:00 e 20:00, horário de São Paulo (`11:00` e `23:00` UTC).
- Ambos também aceitam execução manual protegida pelo GitHub Actions.

Credenciais obrigatórias no repositório:

- `SUPABASE_BOT_EMAIL`
- `SUPABASE_BOT_PASSWORD`

## Observabilidade

A view `public.swipe_automation_health` resume os estados respeitando o RLS de `offers`. Os scripts escrevem logs JSON com identificador da execução, item, tentativa, resultado e duração.

## Rollback

Execute `db/swipe-automation-rollback.sql`. O rollback remove trigger, view e índices, mas preserva os campos JSONB e o histórico já produzido.
