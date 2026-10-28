import { IntelError } from "./offer-intel-core.mjs";
/** PostgreSQL owns UTC day, idempotency and the atomic daily ceiling; no local/Blobs fallback. */
export function createDailyBudget({storage}) {
  return {async reserve(reservation) {
    try {
      const result=await storage.budgetReserve({reservation});
      if(!result||typeof result.day!=="string"||!Number.isSafeInteger(result.daily_used)||result.daily_used<1||
        !Number.isSafeInteger(result.daily_max_runs)||result.daily_used>result.daily_max_runs||typeof result.reused!=="boolean")
        throw Error("invalid budget response");
      return result;
    }catch(error){if(error instanceof IntelError)throw error;}
    throw new IntelError(503,"capability_unavailable","Não foi possível reservar a coleta.",true);
  }};
}
