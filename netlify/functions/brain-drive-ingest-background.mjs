// Import permanente de criativo do Google Drive → Supabase Storage — Mega Brain
// (BACKGROUND FUNCTION)
//
// Problema: o preview do Mega Brain é montado ao vivo do link do Drive. Se o
// arquivo for privado (ou o link cair), o card não mostra nada. Esta função
// baixa o vídeo do Drive (arquivo PÚBLICO) e sobe no nosso Storage (bucket
// criativos), deixando o vídeo permanente, sempre com capa e pronto p/ transcrever.
//
// Fluxo: o app manda { id, driveUrl } + o token do ADMIN. A função:
//   1) extrai o ID do arquivo do Drive,
//   2) baixa os bytes (contornando o aviso de vírus de arquivos grandes),
//   3) confere que é vídeo e sobe no Storage com o token do admin (igual upload manual),
//   4) grava data.video = URL do Storage, mantém linkDrive como origem e marca
//      a transcrição como pendente (o pipeline existente pega depois).
//
// Nome termina em "-background": a Netlify responde 202 na hora e deixa rodar até
// ~15 min (download + upload passa do limite das funções síncronas). O app
// acompanha lendo data.driveIngestStatus na linha do Supabase.
//
// Env (Netlify): SUPABASE_URL, SUPABASE_ANON_KEY (opcionais, com default),
//                ADMIN_EMAILS (opcional, csv). NÃO usa service key — usa o JWT do admin.

const SUPABASE_URL = (process.env.SUPABASE_URL || "https://ppaajtzbhjixhyfidojd.supabase.co").replace(/\/+$/, "");
const ANON = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwYWFqdHpiaGppeGh5Zmlkb2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMDkzNTcsImV4cCI6MjA5Njc4NTM1N30.uoC_3EHM_dfmkBHJYjPvlaC7DqkJziunz-tug0ItAJc";
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "adminswipefeg@swipefeg.app")
  .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
const MAX_BYTES = 150 * 1024 * 1024; // teto do criativo (memória da função + limite do Storage)

function driveId(url) {
  url = String(url || "");
  const m = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/i)
        || url.match(/[?&]id=([\w-]+)/i)
        || url.match(/\/d\/([\w-]+)/i);
  return m ? m[1] : "";
}

// sniff simples: mp4/mov começam com "....ftyp"; webm/mkv com EBML 1A45DFA3
function detectVideo(buf, ct) {
  ct = String(ct || "").toLowerCase();
  if (/^video\//.test(ct)) return { ok: true, ext: /webm/.test(ct) ? "webm" : "mp4", ct: /webm/.test(ct) ? "video/webm" : "video/mp4" };
  if (buf && buf.length > 12) {
    if (buf.slice(4, 8).toString("latin1") === "ftyp") return { ok: true, ext: "mp4", ct: "video/mp4" };
    if (buf[0] === 0x1A && buf[1] === 0x45 && buf[2] === 0xDF && buf[3] === 0xA3) return { ok: true, ext: "webm", ct: "video/webm" };
  }
  if (/octet-stream/.test(ct)) return { ok: true, ext: "mp4", ct: "video/mp4" }; // Drive às vezes manda genérico
  return { ok: false };
}

async function collect(r) {
  const buf = Buffer.from(await r.arrayBuffer());
  return { buf, ct: r.headers.get("content-type") || "" };
}

async function downloadDrive(fileId) {
  const base = `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;
  // 1) direto com confirm=t (resolve o aviso de vírus de arquivos grandes p/ arquivos públicos)
  let r = await fetch(base + "&confirm=t");
  let ct = (r.headers.get("content-type") || "").toLowerCase();
  if (r.ok && !ct.includes("text/html")) return await collect(r);

  // veio HTML: ou precisa de token de confirmação, ou não está público
  const html = r.ok ? await r.text() : "";
  if (!/download-form|[?&]confirm=/i.test(html) && /(sign in|need access|request access|faça login|não tem acesso|accounts\.google)/i.test(html))
    throw new Error("arquivo do Drive não está público — em Compartilhar, use \"Qualquer pessoa com o link\"");

  // 2) reenvia com confirm + uuid extraídos do form
  const conf = (html.match(/name="confirm"\s+value="([^"]+)"/i) || html.match(/[?&]confirm=([\w-]+)/i) || [])[1];
  const uuid = (html.match(/name="uuid"\s+value="([^"]+)"/i) || [])[1];
  if (conf) {
    let u = base + `&confirm=${encodeURIComponent(conf)}`;
    if (uuid) u += `&uuid=${encodeURIComponent(uuid)}`;
    r = await fetch(u);
    ct = (r.headers.get("content-type") || "").toLowerCase();
    if (r.ok && !ct.includes("text/html")) return await collect(r);
  }

  // 3) fallback: endpoint clássico uc?export=download
  r = await fetch(`https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`);
  ct = (r.headers.get("content-type") || "").toLowerCase();
  if (r.ok && !ct.includes("text/html")) return await collect(r);

  throw new Error("não consegui baixar do Drive (confirme que é um arquivo de vídeo público)");
}

async function patchOffer(id, token, mutate) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/offers?id=eq.${encodeURIComponent(id)}&select=data`,
    { headers: { apikey: ANON, Authorization: `Bearer ${token}` } });
  const rows = r.ok ? await r.json() : [];
  const data = (rows[0] && rows[0].data) || {};
  mutate(data);
  await fetch(`${SUPABASE_URL}/rest/v1/offers?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { apikey: ANON, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ data }),
  });
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 202, body: "" };
  let id = null, token = "";
  try {
    token = (event.headers.authorization || event.headers.Authorization || "").replace(/^Bearer\s+/i, "").trim();
    const body = JSON.parse(event.body || "{}");
    id = body.id; const driveUrl = body.driveUrl;
    if (!token || !id || !driveUrl) throw new Error("faltou token/id/driveUrl");
    const fileId = driveId(driveUrl);
    if (!fileId) throw new Error("link do Drive sem ID de arquivo (pode ser uma pasta ou um Doc)");

    // admin?
    const u = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: ANON, Authorization: `Bearer ${token}` } });
    if (!u.ok) throw new Error("sessão inválida");
    const email = String(((await u.json()) || {}).email || "").toLowerCase();
    if (!ADMIN_EMAILS.includes(email)) throw new Error("não é admin");

    // 1) baixa do Drive
    const { buf, ct } = await downloadDrive(fileId);
    if (!buf || !buf.length) throw new Error("Drive devolveu arquivo vazio");
    if (buf.length > MAX_BYTES) throw new Error(`vídeo muito grande (${Math.round(buf.length / 1048576)} MB) — suba manualmente`);
    const vid = detectVideo(buf, ct);
    if (!vid.ok) throw new Error("o arquivo do Drive não parece ser um vídeo");

    // 2) sobe no Storage (permanente) com o token do admin
    const path = `megabrain/drive-${id}-${Date.now()}.${vid.ext}`;
    const up = await fetch(`${SUPABASE_URL}/storage/v1/object/criativos/${path}`, {
      method: "POST",
      headers: { apikey: ANON, Authorization: `Bearer ${token}`, "Content-Type": vid.ct, "x-upsert": "true" },
      body: buf,
    });
    if (!up.ok) throw new Error(`upload no Storage falhou: HTTP ${up.status} ${(await up.text()).slice(0, 120)}`);
    const storedUrl = `${SUPABASE_URL}/storage/v1/object/public/criativos/${path}`;

    // 3) grava de volta
    await patchOffer(id, token, (data) => {
      if (!data.linkDrive && /drive\.google\.com|docs\.google\.com/i.test(driveUrl)) data.linkDrive = driveUrl; // preserva a origem
      data.video = storedUrl;
      data.driveIngestStatus = "done";
      data.driveIngestError = "";
      data.driveIngestAt = new Date().toISOString();
      if (!((data.transcricao || "").trim())) data.transcricaoStatus = "pending";
    });
    console.log(`brain-drive-ingest ${id}: salvo ${buf.length} bytes → ${path}`);
  } catch (e) {
    const msg = String(e && e.message ? e.message : e).slice(0, 200);
    console.error("brain-drive-ingest falhou:", msg);
    if (id && token) { try { await patchOffer(id, token, (data) => { data.driveIngestStatus = "error"; data.driveIngestError = msg; data.driveIngestAt = new Date().toISOString(); }); } catch {} }
  }
  return { statusCode: 202, body: "" };
};
