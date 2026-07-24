import { aggregateSnapshot, refreshSnapshot, resolveRange } from "./_fegsys-bigquery.mjs";
import { getDriveIndex } from "./_fegsys-drive.mjs";

export const config = { schedule: "13 * * * *" };

function safeSyncError(error) {
  const raw = String(error && error.message || "").toLowerCase();
  if (raw.includes("ainda não configurada")) return "credencial do BigQuery ainda não configurada";
  if (raw.includes("credencial") || raw.includes("autenticação google")) return "credencial do BigQuery inválida ou expirada";
  if (raw.includes("(403)") || raw.includes("permiss")) return "a conta de serviço não possui acesso suficiente às fontes do FEGSYS";
  if (raw.includes("colunas de data") || raw.includes("estrutura da view")) return "as fontes do FEGSYS não contêm os campos obrigatórios";
  return "sincronização do FEGSYS indisponível";
}

export default async request => {
  try {
    const snapshot = await refreshSnapshot();
    let drive;
    try {
      /* A janela principal do painel cabe no tempo da rotina horária. O índice
         global acumula os arquivos encontrados nas execuções seguintes. */
      const range = resolveRange(new URLSearchParams({ period: "7d" }));
      const cards = aggregateSnapshot(snapshot, range).cards || [];
      const index = await getDriveIndex({ refresh: true, creativeNames: cards.map(card => card.nome) });
      drive = { available: true, files: index.files.length, creatives: cards.length };
    }
    catch { drive = { available: false, files: 0 }; }
    return Response.json({
      ok: true,
      syncedAt: snapshot.syncedAt,
      rows: snapshot.rows.length,
      sources: {
        sales: snapshot.sourceStatus?.sales?.available !== false,
        salesFallback: snapshot.sourceStatus?.sales?.fallbackAvailable === true,
        salesSource: snapshot.sourceStatus?.sales?.available !== false
          ? (snapshot.sourceStatus?.sales?.source || "marts_feg.mart_criativos_diario")
          : (snapshot.sourceStatus?.sales?.fallbackAvailable === true ? "gold_feg.vw_ads_criativo_diario" : ""),
        salesError: snapshot.sourceStatus?.sales?.available === false ? safeSyncError(new Error(snapshot.sourceStatus?.sales?.error || "")) : "",
        meta: snapshot.sourceStatus?.meta?.available !== false,
        drive
      }
    }, { headers: { "cache-control": "no-store", "content-security-policy": "default-src 'none'; frame-ancestors 'none'", "x-content-type-options": "nosniff" } });
  } catch (error) {
    const message = safeSyncError(error);
    console.error("FEGSYS sync failed:", message);
    return Response.json({ ok: false, error: message }, { status: 500, headers: { "cache-control": "no-store", "content-security-policy": "default-src 'none'; frame-ancestors 'none'", "x-content-type-options": "nosniff" } });
  }
};
