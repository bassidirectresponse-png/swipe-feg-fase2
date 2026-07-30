import runCreativeTranscriptionDispatch from "./_creative-transcription-dispatch.mjs";

// Complementa o faster-whisper do GitHub: vídeos novos e menores são
// transcritos em minutos; arquivos grandes continuam na fila local dedicada.
export const config = { schedule: "*/10 * * * *" };

export default async () => runCreativeTranscriptionDispatch();
