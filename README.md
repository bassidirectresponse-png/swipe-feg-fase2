# Swipe FEG — Fase 2 · Dashboard de Ofertas

Dashboard de apresentação de ofertas (sem login). Cada card é uma oferta completa:
produto, biblioteca de anúncios (Meta), domínios + checkouts + prints vinculados,
criativos com transcrição, funil, preços e comentário.

## Stack
- **Arquivo único** `index.html` (HTML + CSS + JS vanilla)
- **Backend:** Supabase (tabela `offers`, coluna `jsonb`)
- **Deploy:** Netlify (site estático, sem build)

## Rodar localmente
Basta abrir o `index.html` no navegador. As credenciais do Supabase já vêm embutidas
(chave `anon`, pública por natureza).

## Deploy na Netlify
1. **Add new site → Import from Git** e selecione este repositório.
2. Build command: *(vazio)* · Publish directory: `.`
   (já configurado em `netlify.toml`).
3. Deploy. Cada `git push` na branch principal republica o site.

## Banco (Supabase)
Tabela criada com:

```sql
create table if not exists offers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  data jsonb not null default '{}'::jsonb
);
alter table offers enable row level security;
create policy "public_all" on offers
  for all using (true) with check (true);
```
