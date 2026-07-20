import { refreshSnapshot } from "./_fegsys-bigquery.mjs";

export const config = { schedule: "13 * * * *" };

export default async () => {
  try {
    const snapshot = await refreshSnapshot();
    return Response.json({ ok: true, syncedAt: snapshot.syncedAt, rows: snapshot.rows.length });
  } catch (error) {
    console.error("FEGSYS sync failed", String(error && error.message || error));
    return Response.json({ ok: false, error: "sincronização indisponível" }, { status: 500 });
  }
};

