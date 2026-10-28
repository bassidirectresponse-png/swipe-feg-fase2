import { createWeeklyHandlers } from "./_offer-intel-weekly.mjs";

// Quarta 01:00 UTC = terça 22:00 em Brasília, antes da reunião de quarta.
export const config = { schedule: "0 1 * * 3" };

export default async () => createWeeklyHandlers().scheduled();
