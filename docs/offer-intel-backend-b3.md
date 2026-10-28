# Offer Intelligence B3 — execução e validação

Implementação no worktree backend. Atualização após smoke de produção:
001–003 foram aplicadas pelo Maestro; a correção 004
(`202610280001_offer_intelligence_fixes.sql`) é **somente arquivo, não aplicada aqui**.
Os testes usam storage/auth/fetch/DNS FAKE. Os testes de domínio fazem HTTP real
somente contra um servidor FAKE local, por transporte explicitamente injetado.
Não há configuração de produção que permita localhost ou portas alternativas.

## API

Todas as rotas públicas usam _security, admin-only, no-store e o envelope da nota
offer-intel-contratos v1.2. As listas discoveries/relations/funnels exigem job_id
OU offer_id + offer_ref_kind; revisões exigem expected_version e idempotency_key.
As revisões só alteram estado auxiliar; não criam ofertas. Cursores preservam
microssegundos do PostgreSQL. Contagens desconhecidas são null, nunca zero.

- GET offer-intel-discoveries: type/status/q/sort=recent|ads, cursor e limit.
- POST offer-intel-discovery: CAS; Discovery achatada.
- GET offer-intel-relations; POST offer-intel-relation: CAS; Relation achatada.
- GET offer-intel-funnels: resumo inclui steps_count; GET offer-intel-funnel?id.
- GET offer-intel-summary: active_job, last_job, counts, latest_at, limits.
- GET offer-intel-evidence?id: projeção limitada a 4 mil caracteres de detalhe;
  nenhum HTML, token, snapshot ou caminho privado é retornado.

## Worker

RPCs novas read, worker_state, persist e provider são invoker, com search_path
fixo e EXECUTE apenas service_role. persist verifica lease/status/cancelamento
na mesma transação que grava resultados. IDs determinísticos mantêm FKs sob
retry. Recoleta preserva review/status/version. Evidências são snapshots por job;
descobertas/relações são estáveis por scope. Contagens são recalculadas de dados
persistidos; interrupções preservam resultados parciais.

Domain Explorer usa Node http(s).request, DNS fixado e revalidação por salto.
Limites: 20 páginas, profundidade 2, redirects 5, concorrência 2, 20s/página,
2 MiB e 200 links/página. Faz apenas GET, sem cookies/Authorization, sem scripts,
formulários ou navegador. Extrai título, links e sinais públicos de tecnologias.
401/403/login/CAPTCHA/timeout ficam inaccessible com motivo. A classificação
guarda classification_basis e separa observação de inferência. Checkpoints por
URL permitem retomar sem repetir páginas concluídas. Destinos persistidos pelo
Apify também entram na fila limitada a 20 páginas. O worker reserva margem
no orçamento interno de 12 minutos para checkpoints; pendências ficam retomáveis.
Screenshot continua indisponível e screenshot_url=null.

## Apify (implementado, sem execução real autorizada)

Reutiliza lib/apify-offer-discovery.mjs e actor apify~facebook-ads-scraper.
Credenciais: APIFY_TOKEN e SUPABASE_SERVICE_ROLE_KEY; identidade da Netlify para
Blobs e a assinatura já usada pelo worker. Nenhum segredo novo em arquivo.
Page IDs conhecidos são seeds antes das buscas por nome/domínio; máximo 2 queries,
15 resultados/query. IDs meta:ad/meta:page são deduplicados.

Reserva diária autoritativa no Postgres: offer_intel_budget, até 15 runs/dia UTC
calculado pelo servidor. A RPC offer_intel_budget_reserve usa advisory lock por dia,
reutiliza a mesma reservation antes de verificar o teto e rejeita excedente com
daily_limit. A leitura offer_intel_budget_usage alimenta limits.apify.daily_used;
falha de leitura omite o valor desconhecido, enquanto falha de reserva impede o POST.
Não existe fallback em Blobs ou memória. O SDK Blobs 9.1.5 permanece inalterado:
setJSON retorna void e não implementa o CAS antes presumido pelo budget.
provider_runs passa reserved -> starting ANTES do POST e salva provider_run_id
imediatamente depois. Há somente um POST por reserva, inclusive sob concorrência.
Timeout/resposta perdida/storage indisponível deixam unknown (ou starting caso
também falhe a gravação). Retry reconcilia por GET e pelo User-Agent único
armazenado em Run.meta.userAgent. Inspeciona até 10 runs recentes; correspondência
ausente/ambígua permanece unknown e nunca dispara outro POST. Reserva não é
reembolsada automaticamente. Uma execução com ID conhecido retoma o mesmo run
e dataset. Campos de uso não são estimativas de preço.

Documentação consultada: https://docs.apify.com/api/v2/actors-runs-post
(resposta imediata, Run.meta.userAgent e defaultDatasetId). maxItems limita
itens cobrados em actors pay-per-result, não garante teto monetário universal.
O custo real e a preservação do marcador pelo provedor ainda precisam de
validação autorizada; os testes atuais comprovam apenas o protocolo com FAKE.

## Correção SQL 004 e revisão de ambiguidades

offer_intel_persist usa v_counts para o resultado agregado e SET counts=v_counts;
não qualifica variável declarada com nome da função. SECURITY INVOKER e search_path
são explícitos; os grants/revokes são reaplicados. A tabela budget tem RLS sem
acesso anon/authenticated; tabela e RPCs são restritas a service_role.

Revisadas por leitura as nove funções das migrations 001–003: create, action,
claim, checkpoint, review, read, worker_state, persist e provider. A colisão
declarada encontrada foi counts em persist. As demais usam records j/r/n ou
nomes distintos das colunas consultadas (actor/actor_id, scope/scope_key,
next_status/status, patch, row_data, updated/updated_at, entity etc.).
As migrations já aplicadas não foram editadas.

## Limitações de validação desta correção

- SQL 004/RLS/RPC não executados aqui: o Maestro validará em PostgreSQL real
  dentro de transação com ROLLBACK antes de aplicar.
- Sem merge, push, deploy ou acesso a produção nesta correção.
- Sem execução paga ou teste real Apify; unknown sem correspondência exige
  investigação operacional, não repetição cega da cobrança. Cancelar o job bloqueia
  novas etapas e gravações, mas não aborta um run já aceito pelo Apify; ele pode
  seguir até terminar ou atingir seu timeout de 120s.
- HTTP estático: páginas que dependem de JavaScript podem ter poucos sinais.
- Matches existentes são os comprovados pelo snapshot da referência resolvida;
  não há varredura global de rascunhos de outras ofertas.
- Bucket privado/runtime de screenshot continuam fora do escopo.

Validação local: npm test; npm run security:secrets; npm run graph:check.
O ambiente de testes precisa permitir listen em 127.0.0.1 para o servidor FAKE.
