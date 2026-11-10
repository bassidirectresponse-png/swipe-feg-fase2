// Reports derived locally from collected evidence. No external model or new scraping request.
import { snapshotWindows } from './offer-intel-weekly.mjs';

const text = (value, max = 300) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
const sentences = value => String(value || '').split(/(?<=[.!?])\s+|\n+/).map(s => text(s)).filter(Boolean);
const quote = value => value ? 'Na copy: “' + text(value, 260) + '”' : 'Não identificado no texto coletado.';
const date = value => /^\d{4}-\d{2}-\d{2}/.test(value || '') ? value.slice(0, 10).split('-').reverse().join('/') : 'data não informada';
const formats = { video: 'Vídeo', image: 'Imagem', carousel: 'Carrossel', dco: 'Criativo dinâmico' };
const themes = [
  [/\b(doctor|dr\.|physician|veterinarian|veterinary|médic|veterinár)/i, 'autoridade profissional'],
  [/\b(my (wife|husband|dog|cat)|i (tried|was|used)|minha? |meu )/i, 'relato pessoal'],
  [/\b(root cause|underlying|cause raiz|causa raiz)/i, 'causa do problema'],
  [/\b(before|after|antes|depois|week|seman|days|dias)/i, 'evolução ou prazo de resultados'],
  [/\b(discount|sale|off|save|desconto|oferta)/i, 'oferta comercial'],
  [/\b(ingredient|formula|extract|ingrediente|fórmula|extrato)/i, 'composição do produto'],
];
export function observedAdAnalysis(ad) {
  const copy = String(ad.ad_text || ''), parts = sentences(copy);
  const foundThemes = themes.filter(([pattern]) => pattern.test(copy)).map(([, label]) => label);
  const promise = parts.find(s => /\b(help|support|relief|improv|restore|reduce|boost|benefit|ajuda|alívio|reduz|melhora|restaura)/i.test(s));
  const mechanism = parts.find(s => /\b(because|contains|ingredient|extract|formula|works by|por que|porque|contém|ingrediente|extrato|fórmula|age)/i.test(s));
  const audiences = [
    [/\b(dog|dogs|cat|cats|pet|pets|cão|cães|gato|gatos)\b/i, 'Tutores de cães ou gatos mencionados na copy'],
    [/\b(women|woman|female|mulher|mulheres)\b/i, 'Mulheres mencionadas na copy'],
    [/\b(men|man|male|homem|homens)\b/i, 'Homens mencionados na copy'],
  ].filter(([pattern]) => pattern.test(copy)).map(([, label]) => label);
  return {
    gancho: quote(parts[0]),
    angulo: foundThemes.length ? 'Temas presentes no texto: ' + foundThemes.join('; ') + '.' : 'O trecho coletado não permite classificar o ângulo com segurança.',
    promessa: quote(promise), mecanismo: quote(mechanism),
    formato: (formats[ad.display_format] || 'Formato não informado pela fonte') + '. Leitura baseada na copy e nos metadados coletados; o vídeo não foi transcrito.',
    cta: text(ad.cta_text) || quote(parts.find(s => /\b(shop now|learn more|click|order|buy|compre|saiba mais|clique)\b/i.test(s))),
    publico: audiences.length ? audiences.join('; ') + '.' : 'Público não explicitado no texto coletado.',
    por_que_funciona: text(`${ad.days_active || 0} dias desde o início informado e ${ad.repetitions || 1} repetições na coleta. Observado até ${date(ad.media?.observed_at)}. Esses sinais indicam permanência e repetição; não comprovam vendas ou rentabilidade.`),
    method: 'observed_data',
  };
}
function leaders(rows) {
  return [...rows].sort((a, b) => b.repetitions - a.repetitions || b.days_active - a.days_active);
}
export function observedProductSummary(product, rows) {
  const top = leaders(rows).slice(0, 2), name = a => `#${a.rank}: ${a.days_active} dias e ${a.repetitions} repetições`;
  const windows = [7, 14, 30].map(days => {
    const ranked = rows.map(ad => ({ad, window: snapshotWindows(ad)[days + 'd']})).filter(x => x.window?.active_days != null)
      .sort((a, b) => b.window.active_days - a.window.active_days || b.ad.repetitions - a.ad.repetitions);
    return ranked[0] ? `${days}d: #${ranked[0].ad.rank}, ${ranked[0].window.active_days} dias na janela e ${ranked[0].ad.repetitions} repetições na coleta` : `${days}d: sem observação suficiente`;
  });
  const counts = {}; for (const ad of rows) { const label = formats[ad.display_format] || 'Formato não informado'; counts[label] = (counts[label] || 0) + 1; }
  const pages = new Set(rows.map(a => a.page_id).filter(Boolean)).size;
  return { method: 'observed_data', bullets: [
    text(`Sinais de permanência e repetição: ${top.map(name).join('; ')}. ${product.ads_collected || 0} anúncios relacionados à oferta; ${rows.length} criativos no ranking.`, 400),
    text(`Janelas anteriores à observação: ${windows.join('; ')}. A repetição se refere à coleta, não a impressões ou vendas.`, 400),
    text(`Formatos do ranking: ${Object.entries(counts).map(([key, count]) => `${count} ${key.toLowerCase()}`).join(', ')}; ${pages} páginas anunciantes. Consulte a copy, o destino e a mídia de cada criativo para comparar as abordagens.`, 400),
  ] };
}
export function observedExecutiveSummary(products, ads) {
  const names = new Map(products.map(p => [p.offer_id, p.offer_name]));
  const top = leaders(ads).slice(0, 3), oldest = [...ads].sort((a, b) => b.days_active - a.days_active).slice(0, 2);
  const formatsCount = {}; for (const ad of ads) { const label = formats[ad.display_format] || 'Sem formato'; formatsCount[label] = (formatsCount[label] || 0) + 1; }
  const uniquePages = new Set(ads.map(a => a.page_id).filter(Boolean)).size;
  const discoveries = new Set(products.flatMap(p => (p.pages || []).filter(s => s.discovered && s.confirmed).map(s => s.key))).size;
  return { method: 'observed_data', bullets: [
    text(`Cobertura: ${products.length} ofertas, ${products.reduce((sum, p) => sum + (p.ads_collected || 0), 0)} anúncios relacionados e ${ads.length} criativos selecionados. ${uniquePages} páginas aparecem no ranking; ${discoveries} bibliotecas encontradas foram vinculadas às ofertas.`, 400),
    text(`Maiores repetições na coleta: ${top.map(a => `${names.get(a.offer_id)} #${a.rank} (${a.repetitions} repetições; ${a.days_active} dias)`).join('; ')}.`, 400),
    text(`Maior permanência observada: ${oldest.map(a => `${names.get(a.offer_id)} #${a.rank}, ${a.days_active} dias`).join('; ')}. As datas de observação permanecem indicadas em cada anúncio.`, 400),
    text(`Formatos: ${Object.entries(formatsCount).map(([label, count]) => `${count} ${label.toLowerCase()}`).join(', ')}. A leitura textual usa a copy coletada e preserva as análises válidas existentes; não substitui assistir ao vídeo.`, 400),
    'Use os filtros de 7, 14 e 30 dias para comparar permanência e repetições nas janelas anteriores à observação. Revise primeiro os criativos que combinam ambos os sinais. Esses dados não comprovam faturamento, rentabilidade nem atividade após a coleta.',
  ] };
}
