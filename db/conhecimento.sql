-- ============================================================================
-- BASE DE CONHECIMENTO — "Feguinho Copy Chief" (vault MEGABRAIN → Supabase)
-- Tabela que guarda o vault dissecado (skills, frameworks, ads validados,
-- análises-master, blocos de VSL) pra alimentar a geração/dissecação de copy.
--
-- COMO RODAR: Supabase → SQL Editor → cole tudo → Run. Idempotente.
--
--   admin = ff9e002e-7ed1-4bc3-8571-18ffcb0c95c3
--   bot   = 8257fb1f-74de-47c8-8367-83b5095a1bc0
-- ============================================================================

create table if not exists public.conhecimento (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  tipo text,        -- ads-validado | analise-master | skill | skill-dissecador | framework | template | vsl | outro
  nicho text,       -- emagrecimento | memoria | ... | '' (genérico)
  produto text,     -- ex: chocolate-bariatrico (quando aplicável)
  titulo text,
  vendas int,       -- nº de vendas quando for uma copy validada
  fonte text,       -- caminho do arquivo no vault
  conteudo text     -- markdown do bloco
);

create index if not exists conhecimento_nicho_idx on public.conhecimento (nicho);
create index if not exists conhecimento_tipo_idx  on public.conhecimento (tipo);

alter table public.conhecimento enable row level security;

drop policy if exists "kb_read_auth"      on public.conhecimento;
drop policy if exists "kb_write_admin_bot" on public.conhecimento;

-- leitura: qualquer usuário logado (o Feguinho precisa ler pra gerar copy)
create policy "kb_read_auth" on public.conhecimento
  for select to authenticated using (true);

-- escrita: só admin e bot (a ingestão roda com o bot)
create policy "kb_write_admin_bot" on public.conhecimento
  for all to authenticated
  using      (auth.uid() in ('ff9e002e-7ed1-4bc3-8571-18ffcb0c95c3','8257fb1f-74de-47c8-8367-83b5095a1bc0'))
  with check (auth.uid() in ('ff9e002e-7ed1-4bc3-8571-18ffcb0c95c3','8257fb1f-74de-47c8-8367-83b5095a1bc0'));
