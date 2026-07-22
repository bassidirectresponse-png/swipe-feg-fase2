import { aggregateSnapshot, getPrecomputedAggregate, getSnapshot, resolveRange } from "./_fegsys-bigquery.mjs";
import { enrichFegsysCards } from "./_fegsys-drive.mjs";
import { authenticate, isAdmin, json, rateLimit } from "./_security.mjs";

const configured = () => !!((process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64)
  && process.env.GOOGLE_SERVICE_ACCOUNT_EXPECTED_KEY_ID);

export default async req => {
  if (req.method !== "GET") return json(req, 405, { ok: false, error: "método inválido" }, "GET");
  const user = await authenticate(req);
  if (!user) return json(req, 401, { ok: false, error: "sessão não reconhecida; saia e entre novamente" }, "GET");
  if (!isAdmin(user)) return json(req, 403, { ok: false, error: "acesso restrito ao administrador" }, "GET");
  const quota = await rateLimit("fegsys-megabrain", user.id, { limit: 30, windowMs: 5 * 60_000 });
  if (!quota.allowed) return json(req, 429, { ok: false, error: "consultas demais; aguarde um instante", retryAfter: quota.retryAfter }, "GET");

  const url = new URL(req.url);
  const range = resolveRange(url.searchParams);
  let snapshot, result, syncedAt, coverage, sourceStatus;
  try {
    const precomputed = await getPrecomputedAggregate(range);
    if (precomputed) {
      result = { cards: precomputed.cards || [], totals: precomputed.totals || {} };
      syncedAt = precomputed.syncedAt;
      coverage = { from: precomputed.oldestDate, to: precomputed.newestDate };
      sourceStatus = precomputed.sourceStatus || {};
    } else {
      /* Personalizados usam o snapshot diário; os períodos comuns chegam
         pré-calculados pela sincronização horária. */
      snapshot = await getSnapshot({ refresh: false, allowStale: true });
      if (!snapshot) snapshot = await getSnapshot({ refresh: true, allowStale: false });
      if (snapshot) {
        result = aggregateSnapshot(snapshot, range);
        syncedAt = snapshot.syncedAt;
        coverage = { from: snapshot.oldestDate, to: snapshot.newestDate };
        sourceStatus = snapshot.sourceStatus || {};
      }
    }
  }
  catch { return json(req, 502, { ok: false, error: "falha temporária na leitura do FEGSYS", configured: configured() }, "GET"); }
  if (!result) return json(req, 503, { ok: false, error: "integração aguardando credencial", configured: configured() }, "GET");
  let driveStatus;
  try {
    const drive = await enrichFegsysCards(result.cards, { refresh: false, allowStale: true });
    result.cards = drive.cards;
    driveStatus = drive.status;
  } catch (error) {
    driveStatus = { available: false, error: String(error && error.message || "Drive indisponível") };
  }
  return json(req, 200, {
    ok: true,
    configured: configured(),
    range,
    syncedAt,
    coverage,
    sourceStatus: { ...sourceStatus, drive: driveStatus },
    ...result,
  }, "GET");
};
