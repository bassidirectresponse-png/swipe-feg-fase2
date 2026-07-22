import { fetchDriveMedia, verifyDriveMedia } from "./_fegsys-drive.mjs";

const baseHeaders = {
  "cache-control": "private, max-age=300",
  "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer"
};

export default async req => {
  if (req.method !== "GET" && req.method !== "HEAD") return new Response("método inválido", { status: 405, headers: { ...baseHeaders, allow: "GET, HEAD" } });
  const url = new URL(req.url), fileId = url.searchParams.get("id") || "", exp = url.searchParams.get("exp") || "", sig = url.searchParams.get("sig") || "";
  if (!verifyDriveMedia(fileId, exp, sig)) return new Response("link de mídia inválido ou expirado", { status: 403, headers: baseHeaders });
  let upstream;
  try { upstream = await fetchDriveMedia(fileId, req.headers.get("range") || ""); }
  catch { return new Response("mídia temporariamente indisponível", { status: 502, headers: baseHeaders }); }
  if (!upstream.ok && upstream.status !== 206) return new Response("mídia não encontrada", { status: upstream.status === 404 ? 404 : 502, headers: baseHeaders });
  const headers = new Headers(baseHeaders);
  for (const name of ["content-type", "content-length", "content-range", "accept-ranges", "etag", "last-modified"]) {
    const value = upstream.headers.get(name); if (value) headers.set(name, value);
  }
  headers.set("content-disposition", "inline");
  return new Response(req.method === "HEAD" ? null : upstream.body, { status: upstream.status, headers });
};
