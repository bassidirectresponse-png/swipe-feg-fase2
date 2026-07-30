import runArchiveDispatch from "./_offer-creative-archive-dispatch.mjs";

// O n8n continua podendo disparar a mesma fila, mas o agendamento da Netlify é
// a rede de segurança. Ambos usam reserva idempotente e não duplicam mídia.
export const config = { schedule: "*/10 * * * *" };

export default async () => runArchiveDispatch();
