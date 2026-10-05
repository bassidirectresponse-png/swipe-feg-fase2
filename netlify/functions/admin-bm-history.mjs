import { authenticate, isAdmin, json, preflight, trustedOrigin } from "./_security.mjs";
import { adminBmHistory } from "./_admin-bm-history-generated.mjs";

// A migração histórica de setembro foi atribuída à Ultima Peak, mas suas
// campanhas "BnB" pertencem à Balls N Brains. Não entregar essa atribuição.
const patches = Object.fromEntries(Object.entries(adminBmHistory).filter(([offerId, patch]) =>
  offerId !== "23681d5a-89f6-4f41-8afb-ba3c8ab9bed9" ||
  !(patch.bmReports || []).some(report => (report.campaigns || []).some(row => /\|\s*BnB\s*\|/i.test(String(row.name || ""))))
));

export default async req => {
  const options = preflight(req, "GET, OPTIONS");
  if (options) return options;
  if (req.method !== "GET") return json(req, 405, { ok: false, error: "método inválido" }, "GET, OPTIONS");
  if (!trustedOrigin(req)) return json(req, 403, { ok: false, error: "origem não autorizada" }, "GET, OPTIONS");
  const user = await authenticate(req);
  if (!user) return json(req, 401, { ok: false, error: "sessão não reconhecida" }, "GET, OPTIONS");
  if (!isAdmin(user)) return json(req, 403, { ok: false, error: "acesso restrito ao administrador" }, "GET, OPTIONS");
  return json(req, 200, { ok: true, patches }, "GET, OPTIONS");
};
