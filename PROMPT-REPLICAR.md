# Prompt para replicar o dashboard "Swipe / Benchmarking" (sem credenciais)

> Cole tudo abaixo (a partir de **"INÍCIO DO PROMPT"**) numa sessão nova do Claude Code
> (ou outra IA que edite arquivos). Antes, preencha a tabela de **PLACEHOLDERS** com as
> SUAS credenciais novas. Nenhuma credencial do projeto original está aqui.

---

## PLACEHOLDERS — preencha com os SEUS valores

| Placeholder | O que é | Onde conseguir |
|---|---|---|
| `<SUPABASE_URL>` | URL do seu projeto Supabase (ex.: `https://xxxx.supabase.co`) | Supabase → Project Settings → API |
| `<SUPABASE_ANON_KEY>` | Chave `anon` pública (pode ir no front) | Supabase → Project Settings → API |
| `<SUPABASE_SERVICE_KEY>` | Chave `service_role` (**NUNCA** no front/git — só local/CI seguro) | Supabase → Project Settings → API |
| `<ADMIN_EMAIL>` | E-mail do login admin (único que edita) | você cria em Auth → Users |
| `<ADMIN_UUID>` | UUID do usuário admin | aparece após criar o usuário |
| `<BOT_EMAIL>` | E-mail do bot de automação (baixo privilégio) | você cria em Auth → Users |
| `<BOT_PASSWORD>` | Senha do bot (só em secrets, nunca no código) | você define ao criar |
| `<BOT_UUID>` | UUID do usuário bot | aparece após criar o usuário |
| `<GROQ_API_KEY>` | Chave da Groq p/ transcrição instantânea | console.groq.com/keys |
| `<APIFY_TOKEN>` | Token da Apify p/ mineração TikTok (opcional) | apify.com → Settings → Integrations |
| `<GITHUB_REPO>` | seu repositório (ex.: `usuario/meu-swipe`) | GitHub |
| `<CUSTOM_DOMAIN>` | domínio próprio (opcional; senão apague o CNAME) | seu registrador |
| `<MARCA>` | nome que aparece no topo (ex.: "Grupo FEG") | você escolhe |

**Regras de segurança (valem para toda a construção):**
- A chave `service_role` **jamais** entra no `index.html`, em script versionado ou em log. Só é usada localmente (ex.: para criar bucket/usuários) ou como secret de CI.
- A chave `anon` é pública por natureza — pode ficar embutida no front.
- Senha do bot e Groq/Apify **só** como variáveis de ambiente (Netlify) e secrets (GitHub Actions).

---

## INÍCIO DO PROMPT

Você vai construir, do zero, um **dashboard de benchmarking de ofertas de resposta direta**
(nicho de suplementos/nutra). É um **site estático de arquivo único** (`index.html` com HTML+CSS+JS
vanilla, sem build), backend **Supabase**, deploy **Netlify**, automações em **GitHub Actions**.
Recrie EXATAMENTE a arquitetura e as features descritas abaixo. Use os valores da tabela de
PLACEHOLDERS onde indicado; nunca invente credenciais nem exponha a `service_role`.

### 1. Stack e arquitetura
- **Frontend:** um único `index.html` (sem framework, sem bundler). CSS num `<style>` inline,
  JS num `<script>` inline. Cliente Supabase via CDN: `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`.
- **Backend/dados:** Supabase — uma tabela `offers (id uuid pk default gen_random_uuid(),
  created_at timestamptz default now(), data jsonb not null default '{}')`. TODO o conteúdo do
  app vive dentro de `data` (jsonb); o tipo de card é `data.kind`.
- **Storage:** bucket **público** `criativos` (guarda prints, MP4 de criativos e capas de TikTok).
  `allowed_mime_types` deve incluir `video/mp4, video/webm, image/jpeg, image/png, image/webp`.
- **Auth:** Supabase Auth (e-mail/senha). Dois usuários: **admin** (edita tudo) e **bot** (automações, baixo privilégio).
- **Deploy:** Netlify servindo a raiz (sem build). Funções serverless em `netlify/functions/`.
- **Automação:** GitHub Actions (runners têm egress liberado; gravam no Supabase via REST com o bot).

### 2. Design system (fiel ao original)
- Fonte: **Space Grotesk** (Google Fonts, pesos 300–700).
- Tema **dark**, fundo preto (`#000`), com dois radial-gradients sutis amarelo-limão no topo.
- Cor de acento: **amarelo-limão `#e5ff2d`** (botões primários, destaques, ícone de lupa com glow).
  Vermelho `#ff5d5d` para perigo. Azul `#1877f2` = Meta; roxo `#7c5cff` = Native/Taboola.
- Tokens CSS em `:root` (surfaces `#0c0c0e`/`#121215`/`#17171b`, borders `#1d1d22`/`#2a2a31`,
  radius 18/10/8px, sombras grandes, `--ease:cubic-bezier(.2,.7,.3,1)`).
- Ícones: SVG inline (stroke currentColor) via uma função `ic(nome)` e um dicionário `ICONS`
  (cart, newspaper, play, brain, clock, external, eye, heart, flame, share, message, film, image,
  file, maximize, trending, info, type, search, etc.).
- Layout: **topbar sticky** (marca com logo + busca + "quem sou" + pill "Somente leitura" + sair),
  **nav de seções** horizontal, **sidebar de nichos** (colapsável no mobile), grid de cards responsivo.
- Respeite `prefers-reduced-motion`. Foco visível com ring de acento. Scrollbar estilizada.

### 3. Seções (SECTIONS) — 7 tipos de card
Um array `SECTIONS` define abas. Cada card é uma linha `offers` com `data.kind`:

1. **`oferta`** — "Ofertas": card completo de uma oferta. Campos em `data`:
   `nomeMarca, nomeOferta, nicho, tipoTrafego("meta"|"native"), imagemProduto(print),
   bibliotecas:[{nome,link}], dominios:[{nome,linkDominio,linkCheckout,backRedirect,printPV,printCheckout}],
   precos:[{descricao,valor,tipo}], criativos:[{nome,link,transcricao}], funil(texto),
   numAdsAtivos(string), adsUpdatedAt, adsHistory:[{d,n}], comentario`.
   O card mostra thumb do produto, chips (nº bibliotecas, nichos), nº de ads ativos e mini-gráfico
   do histórico. A visão detalhada (`openView`) tem seções numeradas: Bibliotecas, Domínios+Checkouts
   (com prints amplíáveis em lightbox), Criativos, Funil, Preços, Comentário.
2. **`presell`** — "Presell / Advertorial": `nome, marca, nicho, tipoTrafego, link, print, comentario`.
3. **`criativo`** — "Swipe Criativos": `nome, marca, nicho, plataforma("meta"|"taboola"), video(MP4/Drive/YT/Vimeo),
   linkAnuncio, print, transcricao, transcricaoStatus, transcricaoLang`. No Taboola, só imagem.
4. **`megabrain`** — "Mega Brain — Copy Validadas": `nome, marca, nicho, copy, copyLink, video,
   transcricao, print, comentario`.
5. **`noticia`** — "Notícias 24 Horas": `nome, link, nicho, fonte, dataPub, resumo, engajamento,
   categoria, topic`. Alimentada por automação (RSS).
6. **`tiktok`** — "Radar TikTok": vídeos orgânicos minerados. Schema em `data`:
   `kind:"tiktok", nicho, videoId, nome, caption, autor, autorNome, seguidores, url, thumb, thumbOrig,
   views, likes, comentarios, shares, saves, engajamento(0–1), duracao, dataPub(unix), regiao, som,
   somAutor, hashtags:[], faixa("viral"≥1M/"high"≥100k/"mid"≥10k/"low"), isAd, viewsHistory:[{d,v}], fetchedAt`.
   Cards agrupados por **faixa** (viral/high/mid/low) e ordenáveis por views/engajamento/likes/comentários/recente.
   Clicar no card abre a visão do vídeo (sem lupa/lightbox). Mostra métricas com `kfmt` (1.2M, 340k), duração e data relativa.

`NICHOS` (datalist global): Emagrecimento, Disfunção Erétil, Memória, Próstata, Diabetes / Glicose,
Neuropatia, Visão, Audição, Articulações / Dores, Cabelo / Unhas, Sono / Ansiedade,
Energia / Testosterona, Detox / Intestino, Menopausa, Imunidade, Outro.

### 4. Formulários e edição
- Oferta usa um formulário completo (`openForm`) com grupos repetíveis (adicionar/remover bibliotecas,
  domínios, preços, criativos), dropzones de imagem (colar/arrastar/clicar), segmented control Meta/Native.
- As demais seções usam um formulário simples (`openSimpleForm`) montado dinamicamente por `kind`.
- Upload de imagem: comprimir no cliente antes de subir (canvas → webp/jpeg) e enviar ao bucket `criativos`.
- Upload de vídeo: MP4/WebM até ~50MB direto pro Storage; salvar a URL pública em `data.video`.
- Cache local (localStorage, versão `feg_cache_v2`) para render instantâneo antes do fetch (versão "lite" sem imagens pesadas).

### 5. Autenticação + Controle de acesso (RBAC)
- Tela de **login** própria (e-mail/senha → `sb.auth.signInWithPassword`). Sem sessão → mostra login.
- `const ADMIN_EMAILS=["<ADMIN_EMAIL>"]`. `applyRole(user)` seta `isAdmin` e faz
  `document.body.classList.toggle("readonly", !isAdmin)`. Pill "Somente leitura" aparece p/ não-admin.
- `requireAdmin()` protege: novo/editar/excluir/salvar/transcrever. CSS `body.readonly [data-admin-only]{display:none!important}`
  esconde os botões de ação. O grid só adiciona o "card de adicionar" se `isAdmin`.
- **RLS no banco** (fonte da verdade — front é só UX). Rode este SQL no Supabase (idempotente):

```sql
alter table public.offers enable row level security;
-- limpa policies antigas de offers
do $$ declare pol record; begin
  for pol in select policyname from pg_policies where schemaname='public' and tablename='offers'
  loop execute format('drop policy if exists %I on public.offers', pol.policyname); end loop;
end $$;
-- leitura: qualquer logado
create policy "offers_read_all_authenticated" on public.offers for select to authenticated using (true);
-- escrita: só admin e bot
create policy "offers_insert_admin" on public.offers for insert to authenticated
  with check (auth.uid() in ('<ADMIN_UUID>','<BOT_UUID>'));
create policy "offers_update_admin" on public.offers for update to authenticated
  using (auth.uid() in ('<ADMIN_UUID>','<BOT_UUID>'))
  with check (auth.uid() in ('<ADMIN_UUID>','<BOT_UUID>'));
create policy "offers_delete_admin" on public.offers for delete to authenticated
  using (auth.uid() in ('<ADMIN_UUID>','<BOT_UUID>'));
-- storage bucket 'criativos': leitura pública; escrita só admin/bot
drop policy if exists "criativos_insert" on storage.objects;
drop policy if exists "criativos_update" on storage.objects;
drop policy if exists "criativos_delete" on storage.objects;
create policy "criativos_insert" on storage.objects for insert to authenticated
  with check (bucket_id='criativos' and auth.uid() in ('<ADMIN_UUID>','<BOT_UUID>'));
create policy "criativos_update" on storage.objects for update to authenticated
  using (bucket_id='criativos' and auth.uid() in ('<ADMIN_UUID>','<BOT_UUID>'));
create policy "criativos_delete" on storage.objects for delete to authenticated
  using (bucket_id='criativos' and auth.uid() in ('<ADMIN_UUID>','<BOT_UUID>'));
```

### 6. Vídeo + transcrição
- Player embutido (`videoEmbedUrl`) reconhece YouTube, Vimeo, Google Drive (`/preview`) e MP4 direto.
- Cards mostram **preview**: para MP4 direto, um `<video muted loop playsinline preload=metadata>` com
  poster (seek para 0.1s) e play no hover; senão, o print como capa.
- **Transcrição instantânea (Groq):** ao salvar um criativo com MP4 no Storage, o app chama uma
  **Netlify Background Function** que baixa o vídeo, manda pro Groq Whisper e grava a transcrição de
  volta. O app faz polling da linha até aparecer. Fallback: workflow horário com faster-whisper.

Crie `netlify/functions/transcribe-background.mjs` (Background Function — nome termina em
`-background`, responde 202 na hora, roda até 15 min):
- Lê env `GROQ_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ADMIN_EMAILS`.
- Recebe `{id, videoUrl}` + `Authorization: Bearer <token do usuário>`.
- Valida: token válido, e-mail ∈ ADMIN_EMAILS, `videoUrl` começa com
  `${SUPABASE_URL}/storage/v1/object/public/criativos/` (anti-SSRF). MAX 40MB.
- Baixa o vídeo, chama `https://api.groq.com/openai/v1/audio/transcriptions`
  (`model=whisper-large-v3-turbo`, `response_format=verbose_json`), **com retry (até 3x) em 429 e 5xx**.
- PATCH em `offers?id=eq.<id>`: `data.transcricao`, `data.transcricaoStatus="done"`, `data.transcricaoLang`
  (com o token do admin; o RLS confirma).
- Opcional: manter também `transcribe.mjs` (versão síncrona, MAX 24MB, retorna JSON) como health-check/uso avulso.

`netlify.toml`:
```toml
[build]
  publish = "."
  command = ""
[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"
[[redirects]]
  from = "/"
  to = "/index.html"
  status = 200
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "geolocation=(), microphone=(), camera=(), payment=()"
    Strict-Transport-Security = "max-age=31536000; includeSubDomains; preload"
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://*.supabase.co https://*.tiktokcdn.com https://*.tiktokcdn-us.com https://*.tiktokcdn-eu.com; media-src 'self' blob: data: https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://drive.google.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'"
```

### 7. Automações (GitHub Actions + Python stdlib)
Todos os scripts logam com o **bot** (`POST /auth/v1/token?grant_type=password` com `<BOT_EMAIL>`/`<BOT_PASSWORD>`
lidos de env) e escrevem via REST com a chave `anon`. Nenhuma senha no código. Secrets do repo:
`SUPABASE_BOT_EMAIL`, `SUPABASE_BOT_PASSWORD`, `APIFY_TOKEN`. Env var da Netlify: `GROQ_API_KEY`
(e opcionalmente `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ADMIN_EMAILS`).

1. **`scripts/noticias_ingest.py`** + `.github/workflows/noticias-24h.yml` (cron `0 9 * * *`):
   lê RSS de veículos (ScienceDaily por nicho; CNN Health/NBC/TMZ/Page Six roteados por palavra-chave),
   monta `kind:"noticia"`, **deduplica por URL normalizada**, **só INSERT** (nunca update/delete), limite por nicho.
2. **`scripts/ads_scraper.py`** + `ads-ativos.yml` (cron 2x/dia, Playwright Chromium):
   para cada oferta Meta com bibliotecas, abre a Biblioteca de Anúncios do Meta, lê o contador
   "X resultados" (regex multi-idioma), soma, e grava `numAdsAtivos`/`adsUpdatedAt`/`adsHistory`.
   Se todas as bibliotecas de uma oferta falharem, **não sobrescreve** o valor anterior.
3. **`scripts/transcrever.py`** + `transcrever-videos.yml` (cron horário, faster-whisper `small`, CPU int8):
   pega criativos/megabrain com MP4 no Storage **sem** transcrição, transcreve e grava `data.transcricao`.
   `requirements-transcricao.txt`: `faster-whisper==1.2.1`. Fallback do Groq.
4. **`scripts/tiktok_mining.py`** + `tiktok-mining.yml` (cron diário, `PROVIDER=apify`):
   para cada nicho, taxonomia de duas camadas — `queries` (o que buscar, inclui fármacos/ângulos de DR)
   e `must` (termos que PRECISAM aparecer na legenda/hashtags p/ contar como do nicho, cortando o
   viral que só "encostou" no tema). Usa o ator Apify `clockworks~tiktok-scraper`
   (`run-sync-get-dataset-items`, input `searchQueries/searchSection:"/video"/resultsPerPage/
   videoSearchSorting/videoSearchDateFilter`). Normaliza pro schema tiktok, descarta `isAd` e itens
   velhos, dedup global por `videoId` (1º nicho ganha), rankeia por views, atualiza métricas e
   `viewsHistory` dos já existentes. Também tem provider `tikwm` (grátis, sem key) para começar.
   Capa: tenta rehospedar no Storage `criativos/tiktok/<id>.jpg`; se o bot não puder subir, cai pra
   URL do CDN do TikTok (por isso o CSP libera `*.tiktokcdn*`; a renovação diária mantém válida).

### 8. Passos finais de deploy
1. Supabase: criar projeto → tabela `offers` → bucket público `criativos` (com mimetypes) → criar
   usuários admin e bot em Auth → rodar o SQL de RLS (seção 5) com os UUIDs.
2. Netlify: importar o repo (build vazio, publish `.`) → env var `GROQ_API_KEY` (e demais opcionais).
3. GitHub: cadastrar secrets do bot e `APIFY_TOKEN` → habilitar Actions.
4. `index.html`: preencher `DEFAULT_URL=<SUPABASE_URL>`, `DEFAULT_KEY=<SUPABASE_ANON_KEY>`,
   `ADMIN_EMAILS=["<ADMIN_EMAIL>"]`, marca no `<title>`/topbar = `<MARCA>`, e a logo (`logo-feg.jpg` → sua).
5. (Opcional) domínio próprio: arquivo `CNAME` com `<CUSTOM_DOMAIN>` — ou remova se não for usar.

Entregue o projeto completo e funcional, com o mesmo visual e as mesmas features. Confirme ao final
que nenhuma credencial `service_role` ficou versionada e que as senhas/keys estão só em env/secrets.

## FIM DO PROMPT
