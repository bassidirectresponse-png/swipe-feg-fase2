import { refreshSnapshot } from "./_fegsys-bigquery.mjs";

export const config = { schedule: "13 * * * *" };

function safeSyncError(error) {
  const raw = String(error && error.message || "").toLowerCase();
  if (raw.includes("ainda não configurada")) return "credencial do BigQuery ainda não configurada";
  if (raw.includes("credencial") || raw.includes("autenticação google")) return "credencial do BigQuery inválida ou expirada";
  if (raw.includes("(403)") || raw.includes("permiss")) return "a conta de serviço não possui acesso suficiente à view";
  if (raw.includes("colunas de data") || raw.includes("estrutura da view")) return "a estrutura da view não contém os campos obrigatórios";
  return "sincronização do FEGSYS indisponível";
}

export default async () => {
  try {
    const snapshot = await refreshSnapshot();
    return Response.json({ ok: true, syncedAt: snapshot.syncedAt, rows: snapshot.rows.length });
  } catch (error) {
    console.error("FEGSYS sync failed", String(error && error.message || error));
    return Response.json({ ok: false, error: safeSyncError(error) }, { status: 500, headers: { "cache-control": "no-store" } });
  }
};
