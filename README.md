# Swipe FEG — Fase 2 · Benchmarking

Acervo autenticado de benchmarking do Grupo FEG: ofertas, presells, criativos,
Mega Brain, notícias e Radar TikTok. Também inclui os assistentes Feguinho/Furtado
e um transcritor com player sincronizado por palavra.

## Stack
- **Arquivo único** `index.html` (HTML + CSS + JS vanilla)
- **Backend:** Supabase (`offers.data` em JSONB + bucket público `criativos`) e
  Netlify Blobs para os permalinks das transcrições avulsas
- **Funções:** Netlify Functions + Groq (transcrição)
- **Deploy:** Netlify (site estático, sem etapa de build)

## Rodar localmente
Sirva a raiz por HTTP para testar as rotas da SPA (por exemplo, com
`python3 -m http.server 8080`). A chave `anon` do Supabase é pública; o acesso e
as gravações continuam protegidos por autenticação/RLS.

## Deploy na Netlify
1. **Add new site → Import from Git** e selecione este repositório.
2. Build command: *(vazio)* · Publish directory: `.`
   (já configurado em `netlify.toml`).
3. Deploy. Cada `git push` na branch principal republica o site.

O repositório já possui o fallback de SPA e os headers de segurança em
`netlify.toml`. A variável `GROQ_API_KEY` deve existir no ambiente da Netlify.

## Dados legados

Os campos de preço por pote e resumo/link de ângulos não são mais lidos nem
gravados pela interface. Eles permanecem preservados no JSONB existente para
compatibilidade e auditoria; consulte `db/deprecated-offer-fields.sql`.

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
