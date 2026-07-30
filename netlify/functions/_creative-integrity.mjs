const FACEBOOK_HOSTS = ["facebook.com", "fb.com", "fb.me", "fb.watch"];
const STORAGE_VIDEO_MARK = "/storage/v1/object/public/criativos/";
const VIDEO_EXTENSIONS = /\.(?:mp4|webm|mov|m4v|ogg)(?:\?|$)/i;

export const MEDIA_STALE_MS = 20 * 60_000;
export const TRANSCRIPTION_STALE_MS = 3 * 60 * 60_000;

export function isFacebookUrl(value) {
  try {
    const url = new URL(String(value || ""));
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    return url.protocol === "https:" && !url.username && !url.password
      && FACEBOOK_HOSTS.some(suffix => host === suffix || host.endsWith(`.${suffix}`));
  } catch {
    return false;
  }
}

export function hasStoredVideo(data = {}) {
  return Boolean(String(data.video || "").trim());
}

export function hasStoredMedia(data = {}) {
  return hasStoredVideo(data)
    || Boolean(String(data.print || data.img || "").trim());
}

export function isStorageVideo(value) {
  const text = String(value || "").trim();
  return text.includes(STORAGE_VIDEO_MARK) && VIDEO_EXTENSIONS.test(text);
}

export function hasTranscript(data = {}) {
  return Boolean(String(data.transcricao || "").trim());
}

function timestamp(value) {
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function isFreshWork(data, fields, now, staleMs) {
  const started = fields.map(field => timestamp(data[field])).find(Boolean);
  return Boolean(started && now - started < staleMs);
}

export function mediaArchiveDue(data = {}, now = Date.now()) {
  if (data.kind !== "criativo" || !data.sourceOfferId || !isFacebookUrl(data.linkAnuncio) || hasStoredMedia(data)) return false;
  const retryAt = timestamp(data.mediaArchiveNextRetryAt);
  if (retryAt && retryAt > now) return false;
  const status = String(data.mediaArchiveStatus || data.fbIngestStatus || "").toLowerCase();
  if (["queued", "working", "processing"].includes(status)) {
    return !isFreshWork(data, ["mediaArchiveQueuedAt", "mediaArchiveStartedAt", "fbIngestAt"], now, MEDIA_STALE_MS);
  }
  return true;
}

export function transcriptionDue(data = {}, now = Date.now()) {
  if (!["criativo", "megabrain"].includes(data.kind) || !isStorageVideo(data.video) || hasTranscript(data)) return false;
  if (String(data.transcriptionProvider || "").toLowerCase() === "faster-whisper") return false;
  const retryAt = timestamp(data.transcriptionNextRetryAt);
  if (retryAt && retryAt > now) return false;
  const status = String(data.transcriptionStatus || data.transcricaoStatus || "").toLowerCase();
  if (["queued", "processing", "working"].includes(status)) {
    return !isFreshWork(data, ["transcriptionQueuedAt", "transcriptionStartedAt", "transcricaoUltimaTentativa"], now, TRANSCRIPTION_STALE_MS);
  }
  // "completed"/"done" sem texto é um estado inconsistente e deve voltar à fila.
  return true;
}

export function queueMediaArchive(data = {}, now = new Date().toISOString()) {
  return {
    ...data,
    fbIngestStatus: "working",
    fbIngestError: "",
    mediaArchiveRequired: true,
    mediaArchiveStatus: "queued",
    mediaArchiveQueuedAt: now,
    mediaArchiveAttempts: Math.max(0, Number(data.mediaArchiveAttempts) || 0) + 1,
  };
}

export function queueTranscription(data = {}, now = new Date().toISOString()) {
  return {
    ...data,
    transcriptionRequired: true,
    transcriptionStatus: "queued",
    transcricaoStatus: "processing",
    transcriptionQueuedAt: now,
    transcriptionStartedAt: now,
    transcriptionCompletedAt: "",
    transcriptionLastError: "",
    transcriptionNextRetryAt: "",
    transcriptionAttempts: Math.max(0, Number(data.transcriptionAttempts || data.transcricaoTentativas) || 0) + 1,
    transcriptionProvider: "groq",
    transcriptionVersion: String(data.transcriptionVersion || "1"),
  };
}

export function applyArchivedMedia(data = {}, media, {
  source = "facebook",
  now = new Date().toISOString(),
} = {}) {
  const next = {
    ...data,
    fbIngestStatus: "done",
    fbIngestError: "",
    fbIngestAt: now,
    mediaArchiveRequired: true,
    mediaArchiveStatus: "done",
    mediaAttached: true,
    mediaType: media.type,
    mediaArchivedAt: now,
    mediaArchiveNextRetryAt: "",
    mediaArchiveError: "",
    mediaArchiveSource: source,
  };
  if (media.type === "video") {
    next.video = media.url;
    next.videoPoster ||= "";
    if (hasTranscript(next)) {
      next.transcriptionRequired = true;
      next.transcriptionStatus = "completed";
      next.transcricaoStatus = "done";
    } else {
      next.transcriptionRequired = true;
      next.transcriptionStatus = "pending";
      next.transcricaoStatus = "pending";
      next.transcriptionAttempts = Math.max(0, Number(next.transcriptionAttempts || next.transcricaoTentativas) || 0);
      next.transcriptionStartedAt = "";
      next.transcriptionCompletedAt = "";
      next.transcriptionLastError = "";
      next.transcriptionNextRetryAt = "";
      next.transcriptionProvider = "groq";
      next.transcriptionVersion = String(next.transcriptionVersion || "1");
    }
  } else {
    next.img = media.url;
    next.print = media.url;
    next.transcriptionRequired = false;
    next.transcriptionStatus = "not_applicable";
    next.transcricaoStatus = "not_applicable";
  }
  return next;
}
