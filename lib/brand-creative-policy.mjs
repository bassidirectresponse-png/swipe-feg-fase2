// Geração antiga arquivada de forma lógica: não apagar registros, mídia ou
// referências de top ads nas ofertas. Só originais revisados entram no novo acervo.
export const BRAND_CREATIVE_GENERATION = "offer-topads-2026-10-07";
export function brandCreativeArchived(data = {}) {
  return data.kind === "criativo" && data.division === "fegbrands"
    && data.brandCreativeGeneration !== BRAND_CREATIVE_GENERATION;
}
