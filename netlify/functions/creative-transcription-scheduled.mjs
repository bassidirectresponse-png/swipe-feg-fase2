import runCreativeTranscriptionDispatch from "./_creative-transcription-dispatch.mjs";

// Invocação manual/de contingência. O agendamento automático pertence
// exclusivamente ao workflow horário do faster-whisper, evitando dois workers
// reservarem ou sobrescreverem o mesmo card.
export default async () => runCreativeTranscriptionDispatch();
