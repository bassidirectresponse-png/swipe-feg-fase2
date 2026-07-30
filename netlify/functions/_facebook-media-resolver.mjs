import { extractFacebookPublicMedia } from "./_facebook-public-media.mjs";

/**
 * Resolve somente mídias que o próprio Facebook disponibiliza publicamente.
 * O arquivo continua sendo copiado para o Storage do Swipe, portanto um post
 * removido depois do arquivamento não apaga o criativo já salvo.
 */
export async function resolveFacebookMedia(adUrl) {
  try {
    return await extractFacebookPublicMedia(adUrl);
  } catch (publicError) {
    const error = new Error(
      "o Facebook não disponibilizou a mídia publicamente; o link foi preservado e uma nova tentativa será feita",
    );
    error.code = "FACEBOOK_MEDIA_UNAVAILABLE";
    error.details = Array.isArray(publicError?.details)
      ? publicError.details.slice(0, 3)
      : [String(publicError?.message || publicError)];
    throw error;
  }
}
