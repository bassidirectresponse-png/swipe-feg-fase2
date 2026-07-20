import { refreshSnapshot } from "./_fegsys-bigquery.mjs";

export const config = { schedule: "13 * * * *" };

export default async () => {
  try {
    const snapshot = await refreshSnapshot();
    return Response.json({ ok: true, syncedAt: snapshot.syncedAt, rows: snapshot.rows.length });
  } catch (error) {
    const message = String(error && error.message || "sincronização indisponível");
    console.error("FEGSYS sync failed", message);
    return Response.json({ ok: false, error: message }, { status: 500, headers: { "cache-control": "no-store" } });
  }
};
