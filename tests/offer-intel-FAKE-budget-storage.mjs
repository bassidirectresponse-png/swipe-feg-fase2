import { IntelError } from "../lib/offer-intel-core.mjs";
// Models the RPC contract, not a proof of PostgreSQL locking or RLS.
export function createFAKEBudgetStorage() {
  const reservations=new Set();
  return {reservations,
    async budgetReserve({reservation}) {
      const reused=reservations.has(reservation);
      if(!reused&&reservations.size>=15)throw new IntelError(429,"daily_limit","Limite diário.",true,43200);
      reservations.add(reservation);
      return {day:"2026-10-28",daily_used:reservations.size,daily_max_runs:15,reused};
    },
    async budgetUsage(){return {day:"2026-10-28",daily_used:reservations.size,daily_max_runs:15};},
  };
}
