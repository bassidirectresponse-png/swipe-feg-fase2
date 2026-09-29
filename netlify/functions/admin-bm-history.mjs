import { authenticate, isAdmin, json, preflight, trustedOrigin } from "./_security.mjs";
import { adminBmHistory } from "./_admin-bm-history-generated.mjs";

export default async req => {
  const options = preflight(req, "GET, OPTIONS");
  if (options) return options;
  if (req.method !== "GET") return json(req, 405, { ok: false, error: "método inválido" }, "GET, OPTIONS");
  if (!trustedOrigin(req)) return json(req, 403, { ok: false, error: "origem não autorizada" }, "GET, OPTIONS");
  const user = await authenticate(req);
  if (!user) return json(req, 401, { ok: false, error: "sessão não reconhecida" }, "GET, OPTIONS");
  if (!isAdmin(user)) return json(req, 403, { ok: false, error: "acesso restrito ao administrador" }, "GET, OPTIONS");
  return json(req, 200, { ok: true, patches: adminBmHistory }, "GET, OPTIONS");
};
