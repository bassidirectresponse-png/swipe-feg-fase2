import { timingSafeEqual } from "node:crypto";
import runCreativeTranscriptionDispatch from "./_creative-transcription-dispatch.mjs";
import runArchiveDispatch from "./_offer-creative-archive-dispatch.mjs";

const TRIGGER_SECRET = process.env.N8N_ARCHIVE_TRIGGER_SECRET || "";

function secureEqual(left, right) {
  const supplied = Buffer.from(String(left || ""), "utf8");
  const expected = Buffer.from(String(right || ""), "utf8");
  return supplied.length === expected.length
    && supplied.length > 0
    && timingSafeEqual(supplied, expected);
}

function bearerToken(headers = {}) {
  const authorization = String(headers.authorization || headers.Authorization || "");
  return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
}

export const handler = async event => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { Allow: "POST" },
      body: JSON.stringify({ ok: false, error: "método não permitido" }),
    };
  }

  if (!TRIGGER_SECRET || !secureEqual(bearerToken(event.headers), TRIGGER_SECRET)) {
    return {
      statusCode: 401,
      body: JSON.stringify({ ok: false, error: "não autorizado" }),
    };
  }

  try {
    const [archiveResponse, transcriptionResponse] = await Promise.all([
      runArchiveDispatch(),
      runCreativeTranscriptionDispatch(),
    ]);
    const [archive, transcription] = await Promise.all([
      archiveResponse.json().catch(() => ({ ok: false })),
      transcriptionResponse.json().catch(() => ({ ok: false })),
    ]);
    const ok = archiveResponse.ok && transcriptionResponse.ok;
    return {
      statusCode: ok ? 200 : 207,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        ...archive,
        ok,
        media: archive,
        transcription,
      }),
    };
  } catch (error) {
    console.error("offer archive n8n:", String(error?.message || error));
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ ok: false, error: "não foi possível iniciar a automação" }),
    };
  }
};
