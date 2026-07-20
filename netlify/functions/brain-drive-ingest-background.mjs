import {
  SUPABASE_ANON_KEY as ANON,
  SUPABASE_URL,
  authenticateToken,
  boundedBuffer,
  isAdmin,
  rateLimit,
  safeRemoteFetch,
} from "./_security.mjs";

const MAX_BYTES = 150 * 1024 * 1024;
const DRIVE_HOSTS = ["google.com", "googleusercontent.com"];

function driveId(value) {
  const text = String(value || "");
  const match = text.match(/^https:\/\/drive\.google\.com\/file\/d\/([\w-]{10,})/i)
    || text.match(/^https:\/\/drive\.google\.com\/[^?]+\?.*\bid=([\w-]{10,})/i);
  return match ? match[1] : "";
}

function detectVideo(buffer) {
  if (buffer.length > 12 && buffer.subarray(4, 8).toString("latin1") === "ftyp") return { ext: "mp4", contentType: "video/mp4" };
  if (buffer.length > 4 && buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) return { ext: "webm", contentType: "video/webm" };
  return null;
}

async function collect(response) {
  return {
    buffer: await boundedBuffer(response, MAX_BYTES),
    contentType: String(response.headers.get("content-type") || "").toLowerCase(),
  };
}

async function downloadDrive(fileId) {
  const base = `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download`;
  let response = await safeRemoteFetch(`${base}&confirm=t`, { allowedHostSuffixes: DRIVE_HOSTS, timeoutMs: 45_000 });
  let contentType = String(response.headers.get("content-type") || "").toLowerCase();
  if (response.ok && !contentType.includes("text/html")) return collect(response);

  const html = response.ok ? (await boundedBuffer(response, 2 * 1024 * 1024)).toString("utf8") : "";
  if (!/download-form|[?&]confirm=/i.test(html) && /(sign in|need access|request access|faça login|não tem acesso|accounts\.google)/i.test(html)) {
    throw new Error("arquivo do Drive não está público");
  }

  const confirm = (html.match(/name="confirm"\s+value="([\w-]+)"/i) || html.match(/[?&]confirm=([\w-]+)/i) || [])[1];
  const uuid = (html.match(/name="uuid"\s+value="([\w-]+)"/i) || [])[1];
  if (confirm) {
    const confirmed = `${base}&confirm=${encodeURIComponent(confirm)}${uuid ? `&uuid=${encodeURIComponent(uuid)}` : ""}`;
    response = await safeRemoteFetch(confirmed, { allowedHostSuffixes: DRIVE_HOSTS, timeoutMs: 45_000 });
    contentType = String(response.headers.get("content-type") || "").toLowerCase();
    if (response.ok && !contentType.includes("text/html")) return collect(response);
  }

  response = await safeRemoteFetch(`https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}&confirm=t`, { allowedHostSuffixes: DRIVE_HOSTS, timeoutMs: 45_000 });
  contentType = String(response.headers.get("content-type") || "").toLowerCase();
  if (response.ok && !contentType.includes("text/html")) return collect(response);
  throw new Error("não foi possível baixar o arquivo do Drive");
}

async function patchOffer(id, token, mutate) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/offers?id=eq.${encodeURIComponent(id)}&select=data`, {
    headers: { apikey: ANON, Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("oferta não encontrada");
  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error("oferta não encontrada");
  const data = rows[0].data || {};
  mutate(data);
  const update = await fetch(`${SUPABASE_URL}/rest/v1/offers?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { apikey: ANON, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ data }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!update.ok) throw new Error("não foi possível atualizar a oferta");
}

function publicError(error) {
  const message = String(error && error.message || error).slice(0, 180);
  if (/sessão|admin|requisição|Drive|vídeo|arquivo|oferta/.test(message)) return message;
  return "não foi possível importar este vídeo";
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 202, body: "" };
  let id = "";
  let token = "";
  try {
    token = String(event.headers.authorization || event.headers.Authorization || "").replace(/^Bearer\s+/i, "").trim();
    if (Buffer.byteLength(event.body || "", "utf8") > 64 * 1024) throw new Error("requisição muito grande");
    const body = JSON.parse(event.body || "{}");
    id = String(body.id || "");
    const sourceUrl = String(body.driveUrl || "");
    if (!token || !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)) throw new Error("requisição inválida");
    const fileId = driveId(sourceUrl);
    if (!fileId) throw new Error("link do Drive inválido");
    const user = await authenticateToken(token);
    if (!user) throw new Error("sessão inválida");
    if (!isAdmin(user)) throw new Error("não é admin");
    const quota = await rateLimit("drive-ingest", user.id, { limit: 12, windowMs: 60 * 60_000 });
    if (!quota.allowed) throw new Error("limite temporário de importações atingido");

    const { buffer } = await downloadDrive(fileId);
    if (!buffer.length) throw new Error("Drive devolveu arquivo vazio");
    const video = detectVideo(buffer);
    if (!video) throw new Error("o arquivo do Drive não parece ser um vídeo suportado");

    const path = `megabrain/drive-${id}-${Date.now()}.${video.ext}`;
    const upload = await fetch(`${SUPABASE_URL}/storage/v1/object/criativos/${path}`, {
      method: "POST",
      headers: { apikey: ANON, Authorization: `Bearer ${token}`, "Content-Type": video.contentType, "x-upsert": "true" },
      body: buffer,
      signal: AbortSignal.timeout(90_000),
    });
    if (!upload.ok) throw new Error(`upload indisponível (HTTP ${upload.status})`);
    const storedUrl = `${SUPABASE_URL}/storage/v1/object/public/criativos/${path}`;
    await patchOffer(id, token, data => {
      if (!data.linkDrive) data.linkDrive = sourceUrl;
      data.video = storedUrl;
      data.driveIngestStatus = "done";
      data.driveIngestError = "";
      data.driveIngestAt = new Date().toISOString();
      if (!String(data.transcricao || "").trim()) data.transcricaoStatus = "pending";
    });
    console.log(`brain-drive-ingest ${id}: concluído`);
  } catch (error) {
    const message = publicError(error);
    console.error("brain-drive-ingest falhou:", message);
    if (id && token) {
      try {
        await patchOffer(id, token, data => {
          data.driveIngestStatus = "error";
          data.driveIngestError = message;
          data.driveIngestAt = new Date().toISOString();
        });
      } catch {}
    }
  }
  return { statusCode: 202, body: "" };
};
