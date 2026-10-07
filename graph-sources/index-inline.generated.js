// Gerado de index.html por npm run graph:sync. Não é carregado pelo site.
// Destino exclusivo: indexação das funções inline pelo Code Review Graph.
/* ===== CONFIG ===== */
const LS={url:"feg_sb_url",key:"feg_sb_key",cache:"feg_cache_v2"};
const DEFAULT_URL="https://pkvzwtstidtobpdngxnd.supabase.co";
const DEFAULT_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrdnp3dHN0aWR0b2JwZG5neG5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4MTM1MTUsImV4cCI6MjEwMTM4OTUxNX0.UvV333OkHrp5Yvxn3vyxnkF_KXMBTu-82qFx-Jocc-0";
const LEGACY_SUPABASE_REFS=["ppaajtzbhjixhyfidojd"];
const HIGH_VOLUME=1000;
const NICHOS=["Emagrecimento","Disfunção Erétil","Memória","Próstata","Diabetes / Glicose","Neuropatia","Visão","Audição","Articulações / Dores","Cabelo / Unhas","Sono / Ansiedade","Energia / Testosterona","Detox / Intestino","Menopausa","Imunidade","Outro"];
const BRAND_NICHE_ORDER=["Saúde masculina","Saúde feminina","Saúde Cardiovascular","Saúde íntima / libido","Sono/ Beleza","Saúde Geral/Nutrição"];
const RADAR_TOPICS={"Saúde masculina":["Testosterona","Libido","Próstata","Geral"],"Saúde feminina":["Menopausa","Hormônios","Geral"],"Saúde Cardiovascular":["Coração","Pressão arterial","Colesterol","Geral"],"Saúde íntima / libido":["Libido","Saúde sexual","Saúde íntima","Geral"],"Sono/ Beleza":["Sono","Pele","Beleza","Geral"],"Saúde Geral/Nutrição":["Nutrição","Intestino","Imunidade","Articulações","Geral"],"Pet":["Articulações","Pele e pelagem","Nutrição","Colágeno","Geral"]};
const RADAR_NICHES=[...BRAND_NICHE_ORDER,"Pet"];
const BRAND_NICHE_REVIEW="Pendente de revisão";
const SECTIONS=[
  {key:"oferta",label:"Swipe de Ofertas",icon:"cart",newLabel:"Nova oferta",statLabel:"Ofertas",emptyTitle:"Nenhuma oferta ainda",searchPlaceholder:"Buscar oferta, marca ou nicho...",subHtml:'Bibliotecas, domínios, checkouts, criativos e sinais de tráfego reunidos em uma única visão.'},
  {key:"criativo",label:"Swipe de Criativos",icon:"play",newLabel:"Novo criativo",statLabel:"Criativos",emptyTitle:"Nenhum criativo ainda",searchPlaceholder:"Buscar criativo, marca ou nicho...",subHtml:'Vídeos, transcrições e anúncios vencedores organizados por nicho e plataforma.'},
  {key:"organic",label:"Swipe Organic",icon:"sparkles",newLabel:"Novo orgânico",statLabel:"Criativos orgânicos",emptyTitle:"Nenhum criativo orgânico ainda",searchPlaceholder:"Buscar criativo orgânico ou hook...",subHtml:'Banco de criativos orgânicos para pesquisa de referências, formatos e ideias de hooks — sem separação por nicho.'},
  {key:"presell",label:"Presell / Advertorial",icon:"newspaper",newLabel:"Novo presell",statLabel:"Presells",emptyTitle:"Nenhum presell ainda",searchPlaceholder:"Buscar presell, marca ou nicho...",subHtml:'Swipe de <b>presells e advertoriais</b> — print, link e comentários por nicho.'},
  {key:"megabrain",label:"Mega Brain — Copy Validadas",icon:"brain",newLabel:"Nova copy validada",statLabel:"Validados",emptyTitle:"Nada validado ainda",searchPlaceholder:"Buscar copy, criativo ou nicho...",subHtml:'<b>Mega Brain — Copy Validadas</b>: banco interno da empresa com copy e criativos validados, separados por nicho.'},
  {key:"megabrainfegsys",label:"Fegsys",icon:"pulse",newLabel:"",statLabel:"Criativos encontrados",emptyTitle:"Nenhum criativo sincronizado",searchPlaceholder:"Buscar criativo no Fegsys...",subHtml:'<b>Fegsys</b>: resultados de vendas e mídia sincronizados automaticamente.'},
  {key:"noticia",label:"Notícias 24 Horas",icon:"clock",newLabel:"Nova notícia",statLabel:"Notícias",emptyTitle:"Nenhuma notícia ainda",searchPlaceholder:"Buscar notícia ou nicho...",subHtml:'<b>Notícias 24 Horas</b> — principais notícias por nicho, buscadas automaticamente e salvas aqui.'},
  {key:"tiktok",label:"Radar TikTok",icon:"play",newLabel:"Novo TikTok",statLabel:"Vídeos",emptyTitle:"Nenhum vídeo minerado ainda",searchPlaceholder:"Buscar vídeo, autor, hashtag ou nicho...",subHtml:'<b>Radar TikTok</b> — vídeos orgânicos minerados por nicho e ordenados por views e engajamento, atualizados diariamente.'},
  {key:"brandsgeneral",label:"Ofertas de Brands no Geral",icon:"search",newLabel:"Nova oferta de Brands",statLabel:"Ofertas em spy",emptyTitle:"Nenhuma oferta de Brands mapeada",searchPlaceholder:"Buscar produto, marca, concorrente ou nicho...",subHtml:'<b>FEG Brands · Ofertas no Geral</b> — monitoramento de produtos DTC, concorrentes, páginas, anúncios e sinais de mercado.'},
  {key:"brandsvalidated",label:"Ofertas Brands",icon:"trending",newLabel:"Nova oferta Brands",statLabel:"Ofertas Brands",emptyTitle:"Nenhuma oferta Brands",searchPlaceholder:"Buscar produto Brands, marca ou categoria...",subHtml:'<b>FEG Brands · Ofertas Brands</b> — produtos organizados por categoria, com histórico de anúncios e métricas da BM quando disponíveis.'},
  {key:"brandcreative",label:"Swipe de Criativos",icon:"play",newLabel:"",statLabel:"Criativos",emptyTitle:"Nenhum criativo de Brands",searchPlaceholder:"Buscar criativo ou marca...",subHtml:'<b>FEG Brands · Swipe de Criativos</b> — acervo de anúncios organizado por marca.'},
  {key:"updates",label:"Atualizações",icon:"clipboard",newLabel:"",statLabel:"Materiais adicionados",emptyTitle:"Nenhuma atualização registrada",searchPlaceholder:"Buscar atualização, material ou nicho...",subHtml:'Registro objetivo dos novos materiais adicionados ao Swipe, com acesso direto aos respectivos cards.'},
  {key:"vsldissector",label:"Dissecador de VSL",icon:"scissors",newLabel:"",statLabel:"",emptyTitle:"",searchPlaceholder:"",subHtml:'<b>Dissecador de VSL</b> · envie a VSL e receba a transcrição completa organizada + uma dissecação estratégica por blocos, com leitura visual do vídeo.'},
  {key:"transcritor",label:"Transcritor",icon:"mic",newLabel:"",statLabel:"",emptyTitle:"",searchPlaceholder:"",subHtml:'<b>Transcritor</b> · envie um vídeo e receba o texto completo, escolhendo o idioma.'}
];
function isToolSection(k){return k==="transcritor"||k==="vsldissector";}
function isChatSection(){return false;}
function sectionCfg(key){return SECTIONS.find(s=>s.key===key)||SECTIONS[0];}
const RADAR_GENERATION="offers-topics-2026-10-05";
function syncRadarGeneration(rows){return rows.some(row=>row?.data?.kind==="tiktok"&&row.data.radarGeneration===RADAR_GENERATION);}
function sectionOf(o){const d=(o&&o.data)||{};if(d.kind==="tiktok"&&d.radarGeneration!==RADAR_GENERATION)return"tiktok-archive";if(d.kind==="megabrain"&&d.source==="fegsys")return"megabrainfegsys";if(d.kind==="criativo"&&d.division==="fegbrands")return"brandcreative";if(d.kind==="criativo"&&d.division==="organic")return"organic";const k=d.kind||"oferta";if(k==="brandsgeneral")return"brandsvalidated";return SECTIONS.some(s=>s.key===k)?k:"oferta";}
const BRAND_SECTIONS=new Set(["brandsgeneral","brandsvalidated","brandcreative"]);
const OFFER_TAGS={insider:{label:"Insider",className:"insider",icon:"trending"},new:{label:"Nova",className:"new",icon:"sparkles"},potential:{label:"Potencial",className:"potential",icon:"pulse"},scale:{label:"Escala",className:"scale",icon:"trending"}};
const BRAND_TAGS_PUBLISHED=true;
function offerTagsOf(d){const list=Array.isArray(d&&d.offerTags)?d.offerTags:[];const tags=[...new Set([...(d&&d.kind==="brandsvalidated"&&d.bmAccess!==false?["insider"]:[]),...list.map(x=>String(x).toLowerCase())].filter(x=>OFFER_TAGS[x]))];return tags.includes("scale")?tags.filter(x=>x!=="potential"):tags;}
function offerTagsHtml(d){return offerTagsOf(d).map(key=>{const t=OFFER_TAGS[key];return `<span class="offer-tag offer-tag--${t.className}">${ic(t.icon)}${t.label}</span>`;}).join("");}
function normalizeTagSelection(tags){const unique=[...new Set(tags.filter(key=>OFFER_TAGS[key]))];return unique.includes("scale")?unique.filter(key=>key!=="potential"):unique;}
async function persistOfferTags(offer,tags){
  const previous=adminOfferDrafts[offer.id]||{},isInsider=sectionOf(offer)==="brandsvalidated"&&offer.data?.bmAccess!==false,patch={...(previous.data_patch||{}),offerTags:normalizeTagSelection([...(isInsider?["insider"]:[]),...tags])};
  const draft=await saveAdminOfferDraft({target_offer_id:offer.id,label:previous.label||String(offer.data?.nomeOferta||offer.data?.nomeMarca||"Oferta Brands"),new_offer:!!offer.adminPrivate,data_patch:patch});
  adminOfferDrafts[offer.id]=draft;if(offer.adminPrivate)offer.data=patch;renderGrid(true);toast("Tags salvas no painel admin");
}
function openTagEditor(id){
  if(!isAdmin||!sb)return;
  const offer=offers.find(item=>item.id===id);if(!offer||!BRAND_OFFER_SECTIONS.has(sectionOf(offer)))return;
  editingTagOfferId=id;tagDraft=offerTagsOf(brandHubAdminData(offer));
  const descriptions={insider:"Entramos na BM para coletar dados",new:"Nova oferta adicionada",potential:"Potencial para acompanhar · mínimo 200 ads ativos",scale:"Marca com mais de US$ 100 mil investidos na semana"};
  $("#tagEditorOptions").innerHTML=Object.entries(OFFER_TAGS).filter(([key])=>key!=="insider"||sectionOf(offer)==="brandsvalidated").map(([key,t])=>`<button type="button" class="offer-tag offer-tag--${t.className}" data-tag-choice="${key}" aria-pressed="${tagDraft.includes(key)}" title="${esc(descriptions[key])}"${key==="insider"?" disabled":""}>${ic(t.icon)}${t.label}</button>`).join("");
  openOverlay("#tagOverlay");
}
async function saveTagEditor(){
  if(!isAdmin||!sb||!editingTagOfferId)return;
  const offer=offers.find(item=>item.id===editingTagOfferId);if(!offer)return;
  const button=$("#tagEditorSave");button.disabled=true;
  try{
    await persistOfferTags(offer,tagDraft);closeOverlay("#tagOverlay");
    $$('[data-edit-tags]').find(trigger=>trigger.dataset.editTags===offer.id)?.focus({preventScroll:true});
  }catch(error){console.warn("Não foi possível salvar tags",error);toast("Falha ao salvar tags; nada foi alterado",true);}finally{button.disabled=false;}
}
/* Agrupamento visual da navegação. A classificação dos dados continua separada. */
const BRANDS_NAV_SECTIONS=new Set(["brandsgeneral","brandsvalidated","brandcreative","organic","megabrainfegsys","noticia","tiktok"]);
const BRANDS_NAV_ORDER=["brandsvalidated","brandcreative","organic","megabrainfegsys","noticia","tiktok"];
const BRAND_OFFER_SECTIONS=new Set(["brandsgeneral","brandsvalidated"]);
const ADMIN_SECTIONS=new Set(["updates"]);

let sb=null, currentSbUrl="", currentSbKey="", offers=[], adminOfferDrafts={}, adminBmHistoryPatches={}, activeBmPeriodByOffer={}, searchTerm="", activeNiche="", activeBrand="", editingId=null;
let fProductImg="", fDominios=[], fCriativos=[], fBibliotecas=[], fTaboola=[], fSemrushOriginal="", fSemrushThumb="", fTipo="meta", semrushUploading=false,brandMediaUploading=0,offerVslUploading=0;
let fBrandStage="brandsgeneral",fBmPrints=[],fBrandTopAds=[],fBrandSemrush1m="",fBrandSemrush3m="";
let editingTagOfferId=null,tagDraft=[];
let activeZone=null;
let formDirty=false, saving=false;
let activeSection="oferta", critPlatform="all", tiktokSort="views", tiktokSubniche="", tiktokAuthor="", newsSubniche="", brainSort="metrica", brainAuthor="", offerSort="active_ads", offerDirection="desc", offerTagFilter="";
let updates=[],updatesTotal=0;
let brainPeriod="7d",brainDateFrom="",brainDateTo="",fegsysSalesMin="",fegsysSalesMax="",fegsysCards=[],fegsysTotals=null,fegsysSyncedAt="",fegsysCoverage=null,fegsysSourceStatus=null,fegsysLoading=false,fegsysLoadedKey="",fegsysError="",fegsysMatches=0;
let sKind=null, sEditingId=null, sItem={}, sFormDirty=false, sSaving=false, pendingCloseForm="offer";

/* ===== HELPERS ===== */
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function applyTheme(theme,persist){
  const next=theme==="light"?"light":"dark";document.documentElement.dataset.theme=next;
  const themeColor=document.getElementById("themeColor");if(themeColor)themeColor.content=next==="light"?"#f4f5f0":"#000000";
  $$('[data-theme-choice]').forEach(button=>{const active=button.dataset.themeChoice===next;button.classList.toggle("active",active);button.setAttribute("aria-pressed",String(active));});
  if(persist){try{localStorage.setItem("feg_theme",next);}catch(_){}}
}
document.addEventListener("click",event=>{const button=event.target.closest("[data-theme-choice]");if(button)applyTheme(button.dataset.themeChoice,true);});
document.addEventListener("DOMContentLoaded",()=>applyTheme(document.documentElement.dataset.theme||"dark",false),{once:true});
/* ===== ÍCONES (Lucide) ===== */
const ICONS={
  search:'<circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path>',
  eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle>',
  heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"></path>',
  flame:'<path d="M12 2s5 4 5 9a5 5 0 0 1-10 0c0-1.5.5-2.5 1-3 .5 2 2 2.5 2 2.5C9 8 12 6 12 2Z"></path>',
  share:'<circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"></line><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"></line>',
  library:'<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>',
  play:'<polygon points="6 3 20 12 6 21 6 3"></polygon>',
  newspaper:'<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path><path d="M18 14h-8"></path><path d="M15 18h-5"></path><path d="M10 6h8v4h-8V6Z"></path>',
  globe:'<circle cx="12" cy="12" r="10"></circle><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path><path d="M2 12h20"></path>',
  cart:'<circle cx="8" cy="21" r="1"></circle><circle cx="19" cy="21" r="1"></circle><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path>',
  back:'<polyline points="9 14 4 9 9 4"></polyline><path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>',
  zap:'<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>',
  alert:'<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>',
  layers:'<polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline>',
  trending:'<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline>',
  file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line>',
  folder:'<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"></path>',
  maximize:'<path d="M15 3h6v6"></path><path d="M9 21H3v-6"></path><path d="M21 3l-7 7"></path><path d="M3 21l7-7"></path>',
  info:'<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>',
  pulse:'<path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>',
  link:'<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>',
  external:'<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line>',
  plus:'<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>',
  edit:'<path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path>',
  brain:'<path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"></path><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"></path><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"></path>',
  image:'<rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>',
  film:'<rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M7 3v18"></path><path d="M3 7.5h4"></path><path d="M3 12h18"></path><path d="M3 16.5h4"></path><path d="M17 3v18"></path><path d="M17 7.5h4"></path><path d="M17 16.5h4"></path>',
  type:'<polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" x2="15" y1="20" y2="20"></line><line x1="12" x2="12" y1="4" y2="20"></line>',
  message:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>',
  clock:'<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>',
  user:'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>',
  dollar:'<line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>',
  sparkles:'<path d="M12 3l1.9 4.8L18.7 9l-4.8 1.9L12 15.7 10.1 10.9 5.3 9l4.8-1.2L12 3Z"></path><path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z"></path><path d="M5 14l.7 1.8L7.5 16.5l-1.8.7L5 19l-.7-1.8L2.5 16.5l1.8-.7L5 14Z"></path>',
  wand:'<path d="M15 4V2"></path><path d="M15 10V8"></path><path d="M12.5 6.5H10.5"></path><path d="M19.5 6.5H17.5"></path><path d="M3 21l12-12"></path><path d="M12.5 9.5l2 2"></path>',
  scissors:'<circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line>',
  clipboard:'<rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>',
  download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line>',
  mic:'<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line>',
  upload:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line>',
  x:'<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>',
  send:'<line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline>'
};
function ic(name,cls){return `<svg class="ico${cls?" "+cls:""}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]||""}</svg>`;}
function validUrl(u){return u&&/^https?:\/\//i.test(u.trim());}
function fixUrl(u){u=(u||"").trim();if(!u)return"";if(u.startsWith("/"))return location.origin+u;if(!/^https?:\/\//i.test(u))u="https://"+u;return u;}
function getAds(d){const n=parseInt(String(d.numAdsAtivos||"").replace(/\D/g,""),10);return isNaN(n)?null:n;}
function val(id){const e=document.getElementById(id);return e?e.value.trim():"";}
let toastTimer;
function toast(msg,err=false){const t=$("#toast");t.setAttribute("role",err?"alert":"status");t.setAttribute("aria-live",err?"assertive":"polite");t.textContent=msg;t.classList.toggle("err",err);t.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("show"),2600);}
function setSync(st,txt){$("#syncPill").className="sync "+st;$("#syncTxt").textContent=txt;}
function setSaveState(s){const e=$("#saveState");if(!e)return;const map={saved:["","Salvo"],unsaved:["warn","Não salvo"],saving:["saving","Salvando…"],error:["err","Erro ao salvar"],new:["","Novo"]};const m=map[s]||map.new;e.className="save-state"+(m[0]?" "+m[0]:"");e.innerHTML='<span class="ssdot"></span>'+m[1];}

const KNOWN_OFFER_MEDIA=[
  {names:["Vital BP"],root:"/assets/offers-july22/vital-bp",pv:"https://bloodflowsecret.com/pages/vbp-pdpfb/",ck:"https://pdp.bloodflowsecret.com/products/vitalbp-6-pack-vbp-pdpfb"},
  {names:["Score Blue"],root:"/assets/offers-july22/score-blue",pv:"https://scoreblue.com/",ck:"https://scoreblue.com/login"},
  {names:["Jubilance PMS","Jubilance"],root:"/assets/offers-july22/jubilance-pms",pv:"https://jubilance.com/",ck:"https://jubilance.com/cart/"},
  {names:["ProtaFlo"],root:"/assets/offers-july22/protaflo",pv:"https://prostatediscovery.com/pages/ptf-pdpfb/",ck:"https://pdp.prostatediscovery.com/products/protaflo-6-pack-sub-ptf-pdpfb"},
  {names:["Neuro Naturals","Neuro Naturals · Migraine MD"],root:"/assets/offers-july22/neuro-naturals",pv:"https://myneuronaturals.com/",ck:"https://myneuronaturals.com/checkouts/"},
  {names:["GLPro"],root:"/assets/offers-july22/glpro",pv:"https://tryglpro.com/glp1",ck:"https://buygoods.com/secure/checkout.html?account_id=11606&product_codename=GLP6V1"},
  {names:["Steel Power / Horse Fil","Steel Power / Horsefil"],root:"/assets/offers-july22/steel-power-horse-fil",product:"product-fixed.jpg",pv:"https://www.healthnewsletters.life/hfmia",ck:"https://horsefil.mycartpanda.com/checkout"},
  {names:["Jelly Fill","Jellyfill"],root:"/assets/offers-july22/jellyfill",pv:"https://www.purehealthnest.site/ml24inst",ck:"https://buygoods.com/secure/checkout.html?account_id=12796&product_codename=PP_JFL6UNITS_AFF"},
  {names:["Power Up"],root:"/assets/offers-july22/power-up",pv:"https://powerupmax.app/vsl-01-lead-12",ck:"https://buygoods.com/secure/checkout.html?account_id=12486&product_codename=PUP6V1"},
  {names:["Optivell"],root:"/assets/offers-july22/optivell",product:"product-fixed.jpg",pv:"https://www.balanceyourlevels.com/hwrtl3ml2",ck:"https://cc.useoptivell.com/v2/checkout.php"},
  {names:["Steel Power"],root:"/assets/offers-july29/steel-power",pv:"https://healthfactsdaily.store/vsl-steelpower/",ck:"https://buygoods.com/secure/checkout.html?account_id=12348&product_codename=ste6dtc"},
  {names:["Honeyfil Male","Honey Fil Male"],root:"/assets/offers-july29/honeyfil-male",pv:"https://healthylivepro.online/hf-ed-offer01-cbclive01-cp-meta/",ck:"https://honeyfil.mycartpanda.com/checkout"},
  {names:["Zensulin"],root:"/assets/offers-july29/zensulin",pv:"https://nationlifenews.com/zs/vsl22/l02/ml63/",ck:"https://buygoods.com/secure/checkout.html?account_id=11227&product_codename=zen6"},
  {names:["Glyco Reset","GlycoReset"],root:"/assets/offers-july29/glyco-reset",pv:"https://usainsurance.live/glycoreset-vsl06-lead2-ml156",ck:"https://buygoods.com/secure/checkout.html?account_id=12805&product_codename=gly6"},
  {names:["Brain Mary"],root:"/assets/offers-july29/brain-mary",pv:"https://olivehealthco.com/mg/bm-bg/vsl01-ld03/",ck:"https://buygoods.com/secure/checkout.html?account_id=12937&product_codename=bmy6"},
  {names:["Neuro Apex"],root:"/assets/offers-july29/neuro-apex",pv:"https://healthnessdailylife.shop/rxxnomlc",ck:"https://buygoods.com/secure/checkout.html?account_id=12676&product_codename=neu2"},
  {names:["Synaptigen"],root:"/assets/offers-july29/synaptigen",pv:"https://a1.elitehealthreviews.store/memopvsl/",ck:"https://buygoods.com/secure/checkout.html?account_id=10898&product_codename=3"},
  {names:["Cogni Honey","Cognihoney"],root:"/assets/offers-july29/cogni-honey",pv:"https://healthy-dailytips.com/cognihoney_bg/vsl08_l5_ml182/",ck:"https://buygoods.com/secure/checkout.html?account_id=12596&product_codename=cog6"},
  {names:["Memopryl"],root:"/assets/offers-july29/memopryl",pv:"https://healthdailyjournal.online/vsl1/",ck:"https://cc.memopryl.com/checkout.php"},
  {names:["Alka Slim","Aka Slim"],root:"/assets/offers-july29/alka-slim",pv:"https://healthplusinsights.com/alkaslim_bg/vsl01_l9/",ck:"https://buygoods.com/secure/checkout.html?account_id=13043&product_codename=aks6"},
  {names:["Mounjamelt"],root:"/assets/offers-july29/mounjamelt",pv:"https://twr.onlysmiles.site/",ck:"https://buygoods.com/secure/checkout.html?account_id=12888&product_codename=mouj6fnn2"},
  {names:["Blood Pril","BloodPril"],root:"/assets/offers-july29/blood-pril",pv:"https://bloodpril.com/bdp-pv-buy-aff-gpt/",ck:"https://buygoods.com/secure/checkout.html?account_id=12425&product_codename=PP_BDP6UNITS_AFF"},
  {names:["Soda Slim"],root:"/assets/offers-july29/soda-slim",pv:"https://www.bs-ani-ta.com/lr/bg/ml/7",ck:"https://cc.useslimsoda.com/checkout.php"},
  {names:["IQ Honey","Iq Honey"],root:"/assets/offers-july29/iq-honey",pv:"https://visiiq.site/bg/ih/vsl/07/ld07/",ck:"https://buygoods.com/secure/checkout.html?account_id=12857&product_codename=iqh6"}
];
const KNOWN_BRAND_COVERS={
  "balls n brains":"/assets/balls-n-brains/product-cover.png",
  "joymode":"/assets/joymode/product-cover.png",
  "joymode hard":"/assets/joymode/product-cover.png",
  "kittysupps":"/assets/brands/kittysupps/taurine.png",
  "kittysupps taurine":"/assets/brands/kittysupps/taurine.png",
  "everwell":"/assets/brands/everwell/fermented-garlic.png",
  "everwell fermented garlic":"/assets/brands/everwell/fermented-garlic.png",
  "amla":"/assets/auniva/amla.png",
  "pomegranate":"/assets/auniva/pomegranate.png",
  "primal viking":"/assets/primal-viking/product.jpg",
  "ancestral supplements":"/assets/ancestral-supplements/product.png",
  "mars men":"/assets/mars-men/product.png",
  "ultima peak":"/assets/ultima-peak/product.png"
};
function mediaNameKey(value){return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/gi," ").trim().toLowerCase();}
function mediaIsMissing(value){const v=String(value==null?"":value).trim();return !v||/^(?:·|-|—|n\/a|nao informado|não informado)$/i.test(v);}
function isLegacyBrandCover(name,value){
  const url=String(value||"").trim();
  if(name==="balls n brains")return /^https:\/\/[^/]+\/storage\/v1\/object\/public\/criativos\/brands\/balls-n-brains\/product-cover\.png(?:\?.*)?$/i.test(url);
  if(name==="joymode"||name==="joymode hard")return url==="https://assets.replocdn.com/projects/0e54a4ce-4105-4700-aab7-d46d0874071b/ec1bac99-e229-4b05-a664-e1d2f1c82259";
  return false;
}
function mediaUrlKey(value){try{const u=new URL(fixUrl(value)),host=u.hostname.replace(/^www\./,"").toLowerCase(),base=(host+u.pathname.replace(/\/+$/,"")).toLowerCase();if(host==="buygoods.com"){const account=(u.searchParams.get("account_id")||"").toLowerCase(),product=(u.searchParams.get("product_codename")||"").toLowerCase();return account&&product?base+"?account_id="+account+"&product_codename="+product:"";}return base;}catch(_){return"";}}
function mediaUrlMatches(value,target){const current=mediaUrlKey(value),expected=mediaUrlKey(target);return !!(current&&expected&&(current===expected||current.startsWith(expected+"/")||expected.startsWith(current+"/")));}
function applyKnownMediaFallbacks(d){
  const name=mediaNameKey(d.nomeOferta||d.nomeMarca||d.nome),known=KNOWN_OFFER_MEDIA.find(item=>item.names.some(alias=>mediaNameKey(alias)===name));
  if(known){
    if(mediaIsMissing(d.imagemProduto))d.imagemProduto=known.root+"/"+(known.product||"product.jpg");
    d.dominios.forEach(domain=>{
      if(mediaIsMissing(domain.printPV)&&mediaUrlMatches(domain.linkDominio,known.pv))domain.printPV=known.root+"/pv.jpg";
      if(mediaIsMissing(domain.printCheckout)&&mediaUrlMatches(domain.linkCheckout,known.ck))domain.printCheckout=known.root+"/checkout.jpg";
    });
  }else if(KNOWN_BRAND_COVERS[name]&&(mediaIsMissing(d.imagemProduto)||isLegacyBrandCover(name,d.imagemProduto)))d.imagemProduto=KNOWN_BRAND_COVERS[name];
  return d;
}
function normalize(raw){
  const d=Object.assign({},raw||{});
  if(typeof d.nicho!=="string")d.nicho="";
  if(!Array.isArray(d.dominios)){
    d.dominios=[];
    if(d.linkOferta||d.linkCheckout||d.printPV||d.printCheckout)d.dominios.push({nome:"",linkDominio:d.linkOferta||"",linkCheckout:d.linkCheckout||"",printPV:d.printPV||"",printCheckout:d.printCheckout||""});
  }
  if(!Array.isArray(d.criativos)){d.criativos=[];if(d.linkCriativos)d.criativos.push({nome:"",link:d.linkCriativos,transcricao:""});}
  if(!Array.isArray(d.bibliotecas)){d.bibliotecas=[];if(d.linkBiblioteca)d.bibliotecas.push({nome:"",link:d.linkBiblioteca});}
  if(d.tipoTrafego!=="native"&&d.tipoTrafego!=="meta")d.tipoTrafego="meta";
  d.dominios.forEach(x=>{if(typeof x.backRedirect!=="string")x.backRedirect="";if(typeof x.views!=="string")x.views="";if(typeof x.viewsPeriod!=="string")x.viewsPeriod="";if(typeof x.vslLink!=="string")x.vslLink="";if(typeof x.vslVideo!=="string")x.vslVideo="";});
  if(!Array.isArray(d.taboolaAds))d.taboolaAds=[];
  if(typeof d.trafego28d!=="string")d.trafego28d="";
  if(typeof d.trafego3m!=="string")d.trafego3m="";
  if(typeof d.printSemrush!=="string")d.printSemrush="";
  if(typeof d.printSemrushOriginal!=="string")d.printSemrushOriginal=d.printSemrush||"";
  if(typeof d.printSemrushThumb!=="string")d.printSemrushThumb=d.printSemrush||"";
  if(!Array.isArray(d.bmPrints))d.bmPrints=d.bmPrint?[{nome:"Business Manager",img:d.bmPrint}]:[];
  if(!Array.isArray(d.brandTopAds))d.brandTopAds=[];
  if(!Array.isArray(d.brandArchivedAds))d.brandArchivedAds=[];
  if(!Array.isArray(d.bmReports))d.bmReports=[];
  [["7d","bmSpend7d"],["14d","bmSpend14d"],["30d","bmSpend30d"]].forEach(([period,key])=>{if(!String(d[key]||"").trim()){const report=d.bmReports.find(item=>String((item&&item.key)||"").toLowerCase()===period);if(report&&report.totals&&report.totals.spend)d[key]=report.totals.spend;}});
  if(typeof d.brandSemrush1m!=="string")d.brandSemrush1m="";
  if(typeof d.brandSemrush3m!=="string")d.brandSemrush3m="";
  if(typeof d.adsLibraryCheckedAt!=="string")d.adsLibraryCheckedAt="";
  return applyKnownMediaFallbacks(d);
}

/* ===== AUTH (Supabase Auth) ===== */
/* Somente o admin pode criar/editar/excluir. Qualquer outro login só visualiza.
   Fonte da verdade real é o RLS no Supabase (abaixo é só a camada de UI). */
const ADMIN_EMAILS=["adminswipefeg@swipefeg.app"];
let isAdmin=false;
function applyRole(user){
  isAdmin=!!user&&ADMIN_EMAILS.includes(String(user.email||"").trim().toLowerCase());
  document.body.classList.toggle("readonly",!isAdmin);
  const rp=$("#roPill");if(rp)rp.hidden=isAdmin;
}
function requireAdmin(){if(isAdmin)return true;toast("Somente leitura — apenas o admin pode alterar.",true);return false;}
function showLogin(ssoFailed=false){$("#loginScreen").classList.add("show");$("#app").classList.add("hidden");$("#setupScreen").classList.add("hidden");$("#loginErr").classList.toggle("show",ssoFailed);setTimeout(()=>{const i=$("#fegsysLoginLink");if(i)i.focus();},50);}
function hideLogin(){$("#loginScreen").classList.remove("show");}
function showWho(user){const el=$("#whoami");if(el)el.textContent=user?(user.email||"").split("@")[0]:"";applyRole(user);}

async function startAuth(){
  // O fragmento não deve permanecer na URL nem no histórico durante as chamadas assíncronas.
  const ssoPath=location.pathname.replace(/\/+$/,'')==='/sso';
  const ssoToken=ssoPath?new URLSearchParams(location.hash.slice(1)).get('t'):null;
  if(ssoPath)history.replaceState(null,'','/');
  try{
    const savedUrl=localStorage.getItem(LS.url)||"";
    if(LEGACY_SUPABASE_REFS.some(ref=>savedUrl.includes(ref))){
      localStorage.removeItem(LS.url);
      localStorage.removeItem(LS.key);
      localStorage.removeItem(LS.cache);
    }
    for(let i=localStorage.length-1;i>=0;i--){
      const storageKey=localStorage.key(i)||"";
      if(LEGACY_SUPABASE_REFS.some(ref=>storageKey.includes(ref)))localStorage.removeItem(storageKey);
    }
  }catch(e){}
  const url=localStorage.getItem(LS.url)||DEFAULT_URL, key=localStorage.getItem(LS.key)||DEFAULT_KEY;
  if(!initSupabase(url,key)){showSetup();return;}
  // Nunca reutilize a sessão anterior se o handoff corporativo falhar.
  if(ssoPath){try{await sb.auth.signOut({scope:'local'});}catch(_){}}
  let ssoFailed=!!ssoPath;
  if(ssoToken){
    try{
      const response=await fetch('/.netlify/functions/sso',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:ssoToken}),cache:'no-store'});
      if(response.ok){
        const data=await response.json();
        if(data&&data.tokenHash){const result=await sb.auth.verifyOtp({token_hash:data.tokenHash,type:'email'});if(!result.error)ssoFailed=false;}
      }
    }catch(_){} // Sem vínculo ou passe inválido: mantém o login por senha.
  }
  let session=null;
  try{const r=await sb.auth.getSession();session=r.data&&r.data.session;}catch(e){}
  if(session){hideLogin();showWho(session.user);boot();}else showLogin(ssoFailed);
}
async function logout(){try{await sb.auth.signOut();}catch(e){}try{localStorage.removeItem(LS.cache);}catch(e){}location.reload();}
document.addEventListener("click",e=>{if(e.target.closest("#logoutBtn")){if(confirm("Sair do painel?"))logout();}});

/* ===== SUPABASE ===== */
function showSetup(){$("#setupScreen").classList.remove("hidden");$("#app").classList.add("hidden");}
function showApp(){$("#setupScreen").classList.add("hidden");$("#app").classList.remove("hidden");}
function initSupabase(u,k){try{currentSbUrl=String(u||"").replace(/\/+$/,"");currentSbKey=k;sb=window.supabase.createClient(currentSbUrl,k);return true;}catch(e){console.error(e);return false;}}

function readCache(){try{const r=localStorage.getItem(LS.cache);return r?JSON.parse(r):null;}catch(e){return null;}}
let cacheWriteVersion=0;
function persistLiteCache(version){
  if(version!==cacheWriteVersion)return;
  try{const lite=offers.filter(o=>!o.adminPrivate).map(o=>{const d=Object.assign({},o.data);d.printSemrush="";d.printSemrushOriginal="";d.printSemrushThumb="";d.brandSemrush1m="";d.brandSemrush3m="";d.transcricao="";d.copy="";d.transcricaoPt="";d.copyVsl="";d.copyCriativo="";d.transcricaoWords=[];return{id:o.id,created_at:o.created_at,data:d};});localStorage.setItem(LS.cache,JSON.stringify(lite));}catch(e){}
}
function writeCache(){
  const version=++cacheWriteVersion,run=()=>persistLiteCache(version);
  setTimeout(()=>{if(version!==cacheWriteVersion)return;if("requestIdleCallback" in window)requestIdleCallback(run,{timeout:1800});else setTimeout(run,0);},350);
}

const UPDATE_SEEN_KEY="feg_updates_seen_at";
async function loadUpdates(){
  if(!isAdmin||!sb)return;
  try{
    const result=await sb.from("swipe_updates").select("*",{count:"exact"}).order("created_at",{ascending:false}).limit(300);
    if(result.error)throw result.error;
    updates=Array.isArray(result.data)?result.data:[];updatesTotal=Number(result.count)||updates.length;
  }catch(error){
    updates=[];updatesTotal=0;
    if(String(error&&error.code||"")!=="42P01")console.warn("Não foi possível carregar o registro de atualizações",error);
  }
}
async function loadAdminOfferDrafts(){
  if(!isAdmin||!sb)return;
  try{
    const token=await adminBmToken(),response=await fetch("/.netlify/functions/admin-offer-drafts",{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
    const result=await response.json();if(!response.ok||!result.ok)throw new Error(result.error||"Rascunhos indisponíveis");
    const drafts={};for(const draft of result.drafts||[])if(draft&&draft.target_offer_id&&!(draft.published_at&&draft.published_update_at===draft.updated_at))drafts[draft.target_offer_id]=draft;
    adminOfferDrafts=drafts;
    offers=offers.filter(row=>!row.adminPrivate);
    for(const draft of Object.values(drafts)){
      if(!draft.new_offer||draft.data_patch?.kind!=="brandsvalidated"||!draft.data_patch?.nomeOferta||offers.some(row=>row.id===draft.target_offer_id))continue;
      offers.push({id:draft.target_offer_id,created_at:draft.updated_at,data:draft.data_patch,adminPrivate:true});
    }
    if(routeReady)renderSideNav();
  }catch(error){
    console.warn("Não foi possível carregar os rascunhos administrativos",error);
  }
}
async function saveAdminOfferDraft(draft){
  const token=await adminBmToken(),response=await fetch("/.netlify/functions/admin-offer-drafts",{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify(draft),cache:"no-store"});
  const result=await response.json();if(!response.ok||!result.ok||!result.draft)throw new Error(result.error||"Falha ao salvar rascunho");
  return result.draft;
}
async function loadAdminBmHistory(){
  if(!isAdmin||!sb)return;
  try{
    const session=await sb.auth.getSession(),token=session?.data?.session?.access_token;
    if(!token)throw new Error("Sessão administrativa ausente");
    const response=await fetch("/.netlify/functions/admin-bm-history",{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
    if(!response.ok)throw new Error(`Histórico administrativo indisponível (${response.status})`);
    const payload=await response.json();
    if(!payload.ok||!payload.patches||typeof payload.patches!=="object")throw new Error("Histórico administrativo inválido");
    adminBmHistoryPatches=payload.patches;
  }catch(error){console.warn("Não foi possível carregar o histórico administrativo da BM",error);}
}
function adminOfferPatch(id){
  if(!isAdmin)return null;
  const versioned=adminBmHistoryPatches[id],draft=adminOfferDrafts[id]?.data_patch;
  const patch=versioned&&draft?mergeAdminOfferDraftData(versioned,draft):draft||versioned||null;
  if(!patch||id!=="23681d5a-89f6-4f41-8afb-ba3c8ab9bed9")return patch;
  const wrongBrand=(patch.bmReports||[]).some(report=>(report.campaigns||[]).some(row=>/\|\s*BnB\s*\|/i.test(String(row.name||""))));
  if(!wrongBrand)return patch;
  const safe={...patch};
  for(const key of ["bmReports","bmSpend7d","bmSpend14d","bmSpend30d","bmAvgConversion","bmCpc","bmCpcLink","bmCpm","bmCtr","bmCostUnique","bmCostIc","bmRoas","bmUpdatedAt","adsLibraryCheckedAt","bmNotes"])delete safe[key];
  if(Array.isArray(safe.bmPrints)&&!safe.bmPrints.length)delete safe.bmPrints;
  return safe;
}
function updateSeenAt(){try{return localStorage.getItem(UPDATE_SEEN_KEY)||"";}catch(_){return"";}}
function unreadUpdates(){const seen=updateSeenAt();return updates.filter(item=>!seen||String(item.created_at||"")>seen).length;}
function markUpdatesSeen(){
  const newest=updates[0]&&updates[0].created_at;if(!newest)return;
  try{localStorage.setItem(UPDATE_SEEN_KEY,newest);}catch(_){}
}

async function boot(){
  if(!sb){showSetup();return;}
  showApp();
  const cached=readCache();
  let displayedCached=false;
  if(cached&&cached.length){
    try{offers=cached;syncRadarGeneration(offers);routeReady=true;applyRoute();displayedCached=true;setSync("load","Atualizando");}
    catch(error){console.warn("Cache local indisponível",error);routeReady=false;}
  }
  if(!displayedCached)$("#gridArea").innerHTML='<div class="grid">'+Array(4).fill('<article class="card card--skeleton" aria-hidden="true"><div class="sk sk--head"></div><div class="sk sk--media"></div><div class="sk sk--title"></div><div class="sk sk--meta"></div><div class="sk sk--actions"></div></article>').join("")+'</div>';
  try{
    const ok=await loadOffers();
    if(ok!==false&&isAdmin)ensureJoymodeInsider();
    if(ok!==false&&activeSection==="megabrainfegsys")loadFegsysBrain();
    if(ok===false&&!displayedCached)showOffersLoadError();
  }catch(error){console.error("Falha ao carregar ofertas",error);setSync("err","Erro ao carregar");if(!displayedCached)showOffersLoadError();else toast("Não foi possível atualizar as ofertas; mostrando dados salvos neste navegador.",true);}
}
function showOffersLoadError(){
  $("#gridArea").innerHTML='<div class="empty" role="alert"><h2>Não foi possível carregar as ofertas</h2><p>Os dados não foram apagados. Verifique a conexão e tente novamente.</p><button type="button" class="btn btn--outline" id="retryOffers">Tentar novamente</button></div>';
  $("#retryOffers").addEventListener("click",()=>boot(),{once:true});
}
async function loadAdminEnhancements(){
  const tasks=[loadUpdates,loadAdminOfferDrafts];
  await Promise.allSettled(tasks.map(async load=>{
    await load();
    if(routeReady)try{renderGrid(true);}catch(error){console.error("Falha ao atualizar painel admin",error);}
  }));
  // A rota de detalhe pode ter sido aberta antes dos rascunhos privados chegarem.
  // Atualizar também a leitura e a galeria, não apenas o card ao fundo.
  const detail=parseLocation();
  if(routeReady&&detail.id&&detail.section==="brandsvalidated"&&itemById(detail.id)){
    setDocTitle();
    delete activeBmPeriodByOffer[detail.id];
    maybeOpenView(detail.id);
  }
  setSync("ok","Sincronizado");
}
async function loadOffers(){
  setSync("load","Carregando");
  // O PostgREST devolve no máx. 1000 linhas por requisição. Com o Radar TikTok
  // o banco passou de 1000, então precisamos PAGINAR — senão os itens mais
  // novos (ex.: Mega Brain recém-criados) ficam de fora e "somem" da tela.
  const PAGE=1000; let all=[], from=0;
  for(;;){
    let timer;
    const query=sb.from("offers").select("*").order("created_at",{ascending:true}).range(from,from+PAGE-1);
    const {data,error}=await Promise.race([query,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error("Tempo esgotado ao buscar ofertas")),45000);})]).finally(()=>clearTimeout(timer));
    if(error){setSync("err","Erro");console.warn(error);return false;}
    all=all.concat(data||[]);
    if(!data||data.length<PAGE)break;
    from+=PAGE;
  }
  offers=all;syncRadarGeneration(offers);
  if(!isAdmin){updates=[];updatesTotal=0;adminOfferDrafts={};adminBmHistoryPatches={};}
  setSync("ok",isAdmin?"Ofertas carregadas":"Sincronizado");routeReady=true;applyRoute();writeCache();
  if(isAdmin){
    void loadAdminEnhancements();
    setTimeout(()=>scheduleCreativeTranslations(),1200);
    setTimeout(()=>resumeOfferCreativeArchives(),2200);
  }
  return true;
}
let joymodeSeedWorking=false;
async function ensureJoymodeInsider(){
  if(!isAdmin||joymodeSeedWorking)return;
  const current=offers.find(o=>sectionOf(o)==="brandsvalidated"&&String((o.data||{}).nomeOferta||"").trim().toLowerCase()==="joymode");
  if(current){
    try{localStorage.setItem("feg_joymode_seed_v1","done");}catch(e){}
    return;
  }
  let lock="";try{lock=localStorage.getItem("feg_joymode_seed_v1")||"";}catch(e){}
  if(lock==="working")return;
  joymodeSeedWorking=true;try{localStorage.setItem("feg_joymode_seed_v1","working");}catch(e){}
  try{
    const seedRes=await fetch("/assets/joymode/seed.json",{cache:"no-store"});if(!seedRes.ok)throw new Error("seed indisponível");
    const data=await seedRes.json();
    data.brandTopAds=(data.brandTopAds||[]).map(ad=>Object.assign({},ad,{ingestStatus:ad.video||ad.img?"done":"link_only",ingestError:"",active:null,daysActive:null,startDate:"",startDateUnix:null,endDateUnix:null}));
    data.bmNotes="";data.comentario="";
    data.bmPrints=await Promise.all((data.bmPrints||[]).map(async p=>{const b64=await fetch(p.asset,{cache:"force-cache"}).then(r=>{if(!r.ok)throw new Error("print indisponível");return r.text();});return{nome:p.nome,img:"data:image/jpeg;base64,"+b64.trim()};}));
    const {data:rows,error}=await sb.from("offers").insert({data}).select();if(error)throw error;
    const row=rows&&rows[0];if(row){offers.push(row);renderGrid();renderSubfilter();writeCache();try{localStorage.setItem("feg_joymode_seed_v1","done");}catch(e){}toast("Joymode adicionada em Ofertas Insider ✓");}
  }catch(e){console.error("seed Joymode falhou",e);try{localStorage.removeItem("feg_joymode_seed_v1");}catch(_){}toast("Não foi possível adicionar a Joymode automaticamente.",true);}
  finally{joymodeSeedWorking=false;}
}
async function deleteOffer(id){
  if(!requireAdmin())return;
  setSync("load","Excluindo");
  const {error}=await sb.from("offers").delete().eq("id",id);
  if(error){setSync("err","Erro");toast("Erro ao excluir",true);return;}
  offers=offers.filter(o=>o.id!==id);setSync("ok","Sincronizado");renderGrid();writeCache();toast("Oferta excluída");
}

$("#connectBtn").addEventListener("click",async()=>{
  const url=$("#supUrl").value.trim(),key=$("#supKey").value.trim();
  if(!validUrl(url)){toast("URL inválida",true);return;}
  if(key.length<20){toast("Anon key inválida",true);return;}
  if(!initSupabase(url,key)){toast("Falha ao iniciar",true);return;}
  localStorage.setItem(LS.url,url);localStorage.setItem(LS.key,key);
  $("#setupScreen").classList.add("hidden");toast("Conectado!");startAuth();
});
$("#copySql").addEventListener("click",e=>{e.stopPropagation();navigator.clipboard.writeText($("#sqlBox").childNodes[0].textContent).then(()=>toast("SQL copiado"));});

/* ===== GRID ===== */
const NO_NICHE="__none__";
const INSIDER_NICHES=BRAND_NICHE_ORDER;
const BRAND_CATEGORIES=["SUPPLEMENTS","PET","SKIN CARE"];
const INSIDER_PRODUCT_OVERRIDES={"ultima-peak":{name:"Ultima Peak",niche:"Saúde masculina"},"primal-viking":{name:"Primal Viking",niche:"Saúde masculina"},"mars-men":{name:"Mars Men Boost",niche:"Saúde masculina"},"mars-men-boost":{name:"Mars Men Boost",niche:"Saúde masculina"},"joymode":{name:"JOYMODE HARD+",niche:"Saúde masculina"},"joymode-hard":{name:"JOYMODE HARD+",niche:"Saúde masculina"},"ancestral-supplements":{name:"Ancestral Supplements",niche:"Saúde Geral/Nutrição"}};
const BRAND_CREATIVE_NICHE_OVERRIDES={"balls-n-brains":"Saúde masculina"};
function insiderOverride(o){if(!o||sectionOf(o)!=="brandsvalidated")return null;const d=o.data||{},names=[d.nomeOferta,d.nomeMarca].map(routeSlug);return names.map(name=>INSIDER_PRODUCT_OVERRIDES[name]).find(Boolean)||null;}
function insiderProductName(o){return (insiderOverride(o)||{}).name||String(((o||{}).data||{}).nomeOferta||"Produto sem nome").trim();}
function insiderProductKey(o){return routeSlug(insiderProductName(o));}
function insiderNicheOf(o){const raw=(insiderOverride(o)||{}).niche||nicheOf(o);return INSIDER_NICHES.find(n=>sameNiche(n,raw))||brandNicheCanonical(raw);}
function insiderCategoryOf(o){
  const d=isAdmin&&o?brandHubAdminData(o):o&&o.data||{},explicit=String(d.brandCategory||"").trim().toUpperCase();
  if(BRAND_CATEGORIES.includes(explicit))return explicit;
  const text=[d.nicho,d.subnicho,d.nomeMarca,d.nomeOferta].join(" ").toLocaleLowerCase("pt-BR");
  return /\b(pet|pets|gato|gatos|cachorro|cachorros|cães|caes|felino|felina|kittysupps|healthy petz)\b/.test(text)?"PET":"SUPPLEMENTS";
}
/* A estrutura por nicho/produto é pública; somente edição e manutenção exigem admin. */
function isInsiderAdminArea(){return activeSection==="brandsvalidated";}
function nicheOf(o){return ((o.data||{}).nicho||"").trim();}
function newsNicheOf(o){return RADAR_NICHES.find(n=>sameNiche(n,nicheOf(o)))||"";}
function newsTopicOf(o){const niche=newsNicheOf(o);return (RADAR_TOPICS[niche]||[]).find(t=>sameNiche(t,(o.data||{}).subnicho||"Geral"))||"Geral";}
function newsItems(){return offers.filter(o=>sectionOf(o)==="noticia"&&newsNicheOf(o));}
function catalogNiches(){const names=new Map(BRAND_NICHE_ORDER.map(n=>[nicheRouteKey(n),n]));offers.filter(o=>BRAND_OFFER_SECTIONS.has(sectionOf(o))).forEach(o=>{const raw=sectionOf(o)==="brandsvalidated"?insiderNicheOf(o):nicheOf(o),name=brandNicheCanonical(raw);if(raw&&name!==BRAND_NICHE_REVIEW)names.set(nicheRouteKey(name),name);});return [...names.values()];}
function brandNicheCanonical(raw){
  const value=String(raw||"").trim(),key=value.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ");
  if(!key)return BRAND_NICHE_REVIEW;
  if(key.includes("disfuncao eretil")||key==="saude masculina")return BRAND_NICHE_ORDER[0];
  if(key==="saude feminina")return BRAND_NICHE_ORDER[1];
  const known=BRAND_NICHE_ORDER.find(n=>nicheRouteKey(n)===nicheRouteKey(value));
  if(known)return known;
  return NICHOS.some(n=>sameNiche(n,value))?BRAND_NICHE_REVIEW:value;
}
function brandNameOf(o){const d=o&&o.data||{};return String(BRAND_OFFER_SECTIONS.has(sectionOf(o))?(d.nomeOferta||d.nomeMarca):(d.nomeProduto||d.produto||d.marca||d.nomeMarca||"Produto sem nome")||"Produto sem nome").trim();}
function brandKeyOf(o){return nicheRouteKey(brandNameOf(o));}
function brandHubItems(){return offers.filter(o=>sectionOf(o)==="brandcreative");}
function brandHubAdminData(o){if(o?.adminPrivate)return o.data||{};const patch=o&&adminOfferPatch(o.id);return patch?mergeAdminOfferDraftData(o.data,patch):o&&o.data||{};}
function brandHubNicheOf(o){
  if(sectionOf(o)==="brandsvalidated")return insiderNicheOf(o);
  const forced=BRAND_CREATIVE_NICHE_OVERRIDES[brandKeyOf(o)];if(forced)return forced;
  const draftNiche=isAdmin&&o&&adminOfferDrafts[o.id]&&adminOfferDrafts[o.id].data_patch&&adminOfferDrafts[o.id].data_patch.nicho;
  const explicit=String(draftNiche||nicheOf(o)).trim();if(explicit)return brandNicheCanonical(explicit);
  if(sectionOf(o)!=="brandcreative")return "";
  const match=offers.find(item=>BRAND_OFFER_SECTIONS.has(sectionOf(item))&&brandKeyOf(item)===brandKeyOf(o)&&(sectionOf(item)==="brandsvalidated"?insiderNicheOf(item):nicheOf(item)));
  return match?brandNicheCanonical(sectionOf(match)==="brandsvalidated"?insiderNicheOf(match):nicheOf(match)):BRAND_NICHE_REVIEW;
}
function filtered(){
  let list=activeSection==="megabrainfegsys"?[...fegsysCards]:activeSection==="brandcreative"?brandHubItems():activeSection==="noticia"?newsItems():offers.filter(o=>sectionOf(o)===activeSection);
  if(activeSection==="criativo"||activeSection==="brandcreative")list=list.filter(o=>((o.data||{}).plataforma||"meta")==="meta");
  if(activeSection==="megabrainfegsys"){
    const min=fegsysSalesMin===""?null:Number(fegsysSalesMin),max=fegsysSalesMax===""?null:Number(fegsysSalesMax);
    list=list.filter(o=>{const metrics=(o.data||{}).fegsysMetrics||{},sales=Number(metrics.conversions||metrics.orders||0);return(min==null||sales>=min)&&(max==null||sales<=max);});
  }
  if(activeSection==="megabrain"){
    if(brainAuthor)list=list.filter(o=>String((o.data||{}).autor||"")===brainAuthor);
  }
  if(activeNiche){list=list.filter(o=>{const n=activeSection==="brandcreative"?brandHubNicheOf(o):isInsiderAdminArea()?insiderCategoryOf(o):activeSection==="brandsgeneral"?brandNicheCanonical(nicheOf(o)):activeSection==="noticia"?newsNicheOf(o):nicheOf(o);return activeNiche===NO_NICHE?!n||n===BRAND_NICHE_REVIEW:sameNiche(n,activeNiche);});}
  if(activeSection==="tiktok"){if(tiktokSubniche)list=list.filter(o=>sameNiche((o.data||{}).subnicho||"Geral",tiktokSubniche));if(tiktokAuthor)list=list.filter(o=>String((o.data||{}).autor||"")===tiktokAuthor);}
  if(activeSection==="noticia"&&newsSubniche)list=list.filter(o=>sameNiche(newsTopicOf(o),newsSubniche));
  if((activeSection==="brandcreative"||activeSection==="brandsgeneral")&&activeBrand)list=list.filter(o=>brandKeyOf(o)===activeBrand);
  if(isInsiderAdminArea()&&activeBrand)list=list.filter(o=>insiderProductKey(o)===activeBrand);
  if(activeSection==="brandsvalidated"&&offerTagFilter&&(isAdmin||BRAND_TAGS_PUBLISHED))list=list.filter(o=>offerTagsOf(isAdmin?brandHubAdminData(o):o.data).includes(offerTagFilter));
  if(searchTerm){
    const t=searchTerm.toLowerCase();
    list=list.filter(o=>{const d=o.data||{},topAds=Array.isArray(d.brandTopAds)?d.brandTopAds.flatMap(x=>[x&&x.nome,x&&x.link]):[];return [d.nomeOferta,d.nome,d.nomeMarca,d.marca,d.autor,d.formato,d.nicho,activeSection==="noticia"?d.subnicho:"",activeSection==="noticia"?d.resumo:"",isInsiderAdminArea()?insiderProductName(o):"",isInsiderAdminArea()?insiderNicheOf(o):"",...topAds].some(v=>(v||"").toLowerCase().includes(t));});
  }
  return list;
}
function offerSortMetric(o){
  const d=isAdmin&&sectionOf(o)==="brandsvalidated"?brandHubAdminData(o):(o&&o.data)||{};
  if((offerSort==="spend_7d"||offerSort==="sales_7d")&&Array.isArray(d.bmReports)){
    const group=bmReportGroups(d).find(item=>item.reports.some(report=>bmReportWindowKey(report)==="7d"));
    const report=group&&group.reports.find(item=>bmReportWindowKey(item)==="7d");
    if(report){
      const direct=offerSort==="spend_7d"?bmNumeric(report.totals?.spend):bmNumeric(bmReportDisplayTotals(report).results);
      const spendRows=offerSort==="spend_7d"&&direct==null?(report.campaigns||[]).map(row=>bmNumeric(row.spend)).filter(value=>value!=null):[];
      const value=direct!=null?direct:spendRows.length?spendRows.reduce((sum,item)=>sum+item,0):null;
      if(value!=null)return {value,referenceDate:group.date,source:direct!=null?"bm_latest_7d":"bm_campaigns_partial"};
    }
  }
  if(offerSort==="sales_7d"){
    const value=window.SwipeMetrics.metricNumber(d.sales7d??d.vendas7d??d.bmResults7d);
    return {value,referenceDate:d.bmUpdatedAt||"",source:"aggregate"};
  }
  return window.SwipeMetrics.offerMetric(d,offerSort);
}
function offerSortFn(a,b){
  if(activeSection==="brandsvalidated"&&(offerSort==="spend_7d"||offerSort==="sales_7d")){
    const hasBm=o=>{const d=isAdmin?brandHubAdminData(o):o?.data||{};return d.bmAccess!==false&&(Array.isArray(d.bmReports)&&d.bmReports.length>0||bmNumeric(d.bmSpend7d)!=null);};
    const ab=hasBm(a),bb=hasBm(b);if(ab!==bb)return ab?-1:1;
  }
  const av=offerSortMetric(a).value,bv=offerSortMetric(b).value;
  if(av==null&&bv!=null)return 1;if(bv==null&&av!=null)return -1;
  if(av!=null&&bv!=null&&av!==bv)return offerDirection==="asc"?av-bv:bv-av;
  const ad=String((a&&a.created_at)||""),bd=String((b&&b.created_at)||"");if(ad!==bd)return bd.localeCompare(ad);
  return String(((a&&a.data)||{}).nomeOferta||"").localeCompare(String(((b&&b.data)||{}).nomeOferta||""),"pt-BR");
}
const RECENT_FIRST_SECTIONS=new Set(["criativo","organic"]);
function recentFirstFn(a,b){
  const at=Date.parse((a&&a.created_at)||"")||0,bt=Date.parse((b&&b.created_at)||"")||0;
  if(at!==bt)return bt-at;
  return String((b&&b.id)||"").localeCompare(String((a&&a.id)||""));
}
function offerSortReference(items){
  const refs=(items||[]).map(offerSortMetric).map(x=>x.referenceDate).filter(Boolean).sort();return refs.length?refs[refs.length-1]:"";
}
function automationCounts(section){
  const rows=offers.filter(o=>sectionOf(o)===section),count=(field,values)=>rows.filter(o=>values.includes(String(((o.data||{})[field])||""))).length;
  return {pending:count("analysisStatus",["pending","processing","retry_scheduled"]),failed:count("analysisStatus",["failed"]),transcribing:count("transcriptionStatus",["pending","processing","retry_scheduled"])+count("transcricaoStatus",["pending","working","processing"])};
}
/* ===== Sidebar de navegação (seções + nichos aninhados) ===== */
const SEC_SHORT={oferta:"Swipe de Ofertas",presell:"Presell",criativo:"Swipe de Criativos",organic:"Swipe Organic",megabrain:"Mega Brain",megabrainfegsys:"Fegsys",noticia:"Notícias 24h",tiktok:"Radar TikTok",brandsgeneral:"Ofertas no Geral",brandsvalidated:"Ofertas Brands",brandcreative:"Swipe de Criativos",updates:"Atualizações",transcritor:"Transcritor",vsldissector:"Dissecador de VSL"};

/* ============================================================
   ITEM 5 — ROTEAMENTO REAL (History API, path-based)
   Camada ADITIVA: a URL é a fonte da verdade de seção/nicho/filtros/modal.
   Não reescreve o pipeline — deriva o estado global e chama renderGrid().
   ============================================================ */
const SEC2PATH={oferta:"ofertas",presell:"presell",criativo:"criativos",organic:"swipe-organic",megabrain:"mega-brain",megabrainfegsys:"fegsys",noticia:"noticias",tiktok:"radar-tiktok",brandsgeneral:"feg-brands-geral",brandsvalidated:"feg-brands-insider",brandcreative:"feg-brands-criativos",updates:"atualizacoes",transcritor:"transcritor",vsldissector:"dissecador-vsl"};
const PATH2SEC=Object.fromEntries(Object.entries(SEC2PATH).map(([k,v])=>[v,k]));
PATH2SEC["mega-brain-fegsys"]="megabrainfegsys"; // compatibilidade com links antigos
PATH2SEC["feg-brands-validadas"]="brandsvalidated"; // compatibilidade com links antigos
const NICHE_SECTIONS=new Set(["oferta","presell","criativo","megabrain","megabrainfegsys","noticia","tiktok","brandsgeneral","brandsvalidated","brandcreative"]);
const FLAT_DETAIL_SECTIONS=new Set(["organic","transcritor"]);
let routeReady=false;
function routeSlug(s){return String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");}
function nicheRouteKey(niche){return niche===NO_NICHE?NO_NICHE:routeSlug(niche);}
function sameNiche(a,b){return nicheRouteKey(a)===nicheRouteKey(b);}
function canonicalNiche(niche){
  const raw=String(niche||"").trim();if(!raw||raw===NO_NICHE)return raw;
  const key=nicheRouteKey(raw),known=NICHOS.find(n=>nicheRouteKey(n)===key);
  return known||raw;
}
function catSlug(niche){return niche===NO_NICHE?"sem-nicho":(niche?routeSlug(niche):"todos");}
function nicheFromSlug(section,slug){
  if(!slug||slug==="todos")return "";
  if(section==="noticia")return RADAR_NICHES.find(n=>nicheRouteKey(n)===slug)||null;
  if(section==="brandsvalidated"){
    const category=BRAND_CATEGORIES.find(n=>nicheRouteKey(n)===slug);if(category)return category;
    const legacy=offers.find(o=>sectionOf(o)==="brandsvalidated"&&nicheRouteKey(nicheOf(o))===slug);
    return legacy?insiderCategoryOf(legacy):null;
  }
  if(slug==="sem-nicho")return NO_NICHE;
  const source=section==="brandcreative"?brandHubItems():offers.filter(o=>sectionOf(o)===section);
  const present=new Set(source.map(o=>section==="brandcreative"?brandHubNicheOf(o):section==="brandsvalidated"?insiderNicheOf(o):section==="brandsgeneral"?brandNicheCanonical(nicheOf(o)):nicheOf(o)).filter(Boolean));
  if((BRAND_OFFER_SECTIONS.has(section)||section==="brandcreative")){const configured=catalogNiches().find(n=>nicheRouteKey(n)===slug);if(configured)return configured;}
  if(section==="tiktok"){const configured=RADAR_NICHES.find(n=>nicheRouteKey(n)===slug);if(configured)return configured;}
  const hit=[...present].find(n=>nicheRouteKey(n)===slug);
  if(hit)return canonicalNiche(hit);
  if((BRAND_OFFER_SECTIONS.has(section)||section==="brandcreative")){const legacy=source.find(o=>nicheRouteKey(nicheOf(o))===slug);if(legacy){const mapped=section==="brandcreative"?brandHubNicheOf(legacy):section==="brandsvalidated"?insiderNicheOf(legacy):brandNicheCanonical(nicheOf(legacy));return mapped===BRAND_NICHE_REVIEW?NO_NICHE:mapped;}}
  if(section==="tiktok"&&isAdmin){const legacy=source.find(o=>nicheRouteKey(nicheOf(o))===slug);if(legacy)return nicheOf(legacy);}
  if(section==="brandsvalidated"){const legacy=source.find(o=>nicheRouteKey(nicheOf(o))===slug);if(legacy)return nicheOf(legacy);}
  return null;   // null => categoria inexistente (404)
}
function qsFromState(){
  const p=new URLSearchParams();
  if(searchTerm)p.set("q",searchTerm);
  if((BRAND_OFFER_SECTIONS.has(activeSection)||activeSection==="brandcreative")&&activeBrand)p.set("marca",activeBrand);
  if(activeSection==="tiktok"){if(tiktokSort&&tiktokSort!=="views")p.set("ordem",tiktokSort);if(tiktokSubniche)p.set("tema",tiktokSubniche);if(tiktokAuthor)p.set("perfil",tiktokAuthor);}
  if(activeSection==="noticia"&&newsSubniche)p.set("tema",newsSubniche);
  if((activeSection==="megabrain"||activeSection==="megabrainfegsys")&&brainSort&&brainSort!=="metrica")p.set("ordem",brainSort);
  if(activeSection==="megabrain"&&brainAuthor)p.set("autor",brainAuthor);
  if(activeSection==="megabrainfegsys"){if(brainPeriod!=="7d")p.set("periodo",brainPeriod);if(brainPeriod==="custom"&&brainDateFrom)p.set("de",brainDateFrom);if(brainPeriod==="custom"&&brainDateTo)p.set("ate",brainDateTo);if(fegsysSalesMin!=="")p.set("vendas_min",fegsysSalesMin);if(fegsysSalesMax!=="")p.set("vendas_max",fegsysSalesMax);}
  if(activeSection==="oferta"||BRAND_OFFER_SECTIONS.has(activeSection)){p.set("sort",offerSort);p.set("direction",offerDirection);if(activeSection==="brandsvalidated"&&offerTagFilter)p.set("tag",offerTagFilter);}
  const s=p.toString();return s?"?"+s:"";
}
function listPath(section,niche){
  const base="/"+(SEC2PATH[section]||"ofertas");
  return NICHE_SECTIONS.has(section)?base+"/"+catSlug(niche):base;
}
function currentPath(){return listPath(activeSection,activeNiche)+qsFromState();}
function itemSection(o){return o&&(o.data||{}).source==="fegsys"?"megabrainfegsys":sectionOf(o);}
function itemById(id){return fegsysCards.find(x=>x.id===id)||offers.find(x=>x.id===id)||null;}
function offerPath(o){
  const sec=itemSection(o),base="/"+(SEC2PATH[sec]||"ofertas");
  const niche=sec==="brandsvalidated"?insiderCategoryOf(o):sec==="brandcreative"?brandHubNicheOf(o):sec==="brandsgeneral"?brandNicheCanonical(nicheOf(o)):sec==="noticia"?newsNicheOf(o):nicheOf(o);
  const path=NICHE_SECTIONS.has(sec)?base+"/"+catSlug(niche)+"/"+o.id:base+"/"+o.id;
  return sec==="brandsvalidated"&&activeBrand===insiderProductKey(o)?path+"?marca="+encodeURIComponent(activeBrand):path;
}
function setDocTitle(){
  const cfg=sectionCfg(activeSection);
  const parts=[SEC_SHORT[activeSection]||cfg.label];
  if(activeNiche===NO_NICHE)parts.unshift(BRAND_SECTIONS.has(activeSection)&&isAdmin?BRAND_NICHE_REVIEW:"Sem nicho");
  else if(activeNiche)parts.unshift(activeNiche);
  if(activeSection==="brandcreative"&&activeBrand){const match=brandHubItems().find(o=>brandKeyOf(o)===activeBrand);if(match)parts.unshift(brandNameOf(match));}
  if(isInsiderAdminArea()&&activeBrand){const match=offers.find(o=>sectionOf(o)==="brandsvalidated"&&insiderProductKey(o)===activeBrand);if(match)parts.unshift(insiderProductName(match));}
  document.title=parts.join(" · ")+" — Benchmarking FEG";
}
function parseLocation(){
  const path=decodeURIComponent(location.pathname).replace(/\/+$/,"")||"/";
  const seg=path.split("/").filter(Boolean);
  const q=new URLSearchParams(location.search);
  if(!seg.length)return {section:"brandsvalidated",niche:"",id:null,notFound:false,q};
  const section=PATH2SEC[seg[0]];
  if(!section)return {notFound:true,q};
  let niche="",id=null,notFound=false;
  if(NICHE_SECTIONS.has(section)){
    if(seg.length>3)return {section,niche:"",id:null,notFound:true,q};
    if(seg[1]!=null){niche=nicheFromSlug(section,seg[1]);if(niche===null){niche="";notFound=true;}}
    if(seg[2]!=null)id=seg[2];
  }else{
    const legacyOrganicDetail=section==="organic"&&seg.length===3&&seg[1]==="todos";
    if(legacyOrganicDetail)id=seg[2];
    else{
      if(seg.length>2||!FLAT_DETAIL_SECTIONS.has(section)&&seg[1]!=null)return {section,niche:"",id:null,notFound:true,q};
      if(seg[1]!=null)id=seg[1];
    }
    if(legacyOrganicDetail)return {section,niche,id,notFound:false,q,legacyOrganicDetail:true};
  }
  return {section,niche,id,notFound,q};
}
function renderNotFound(msg){
  document.body.classList.remove("route-detail-full");
  document.title="Não encontrado — Benchmarking FEG";
  document.body.classList.remove("chatmode","toolmode");
  const area=$("#gridArea");if(area)area.innerHTML=`<div class="empty"><h2>404 — página não encontrada</h2><p>${esc(msg||"Essa rota não existe.")}</p><a class="btn btn--accent" data-nav href="/feg-brands-insider/todos" style="margin-top:18px">Voltar para Ofertas Brands</a></div>`;
}
function maybeOpenView(id){
  const o=itemById(id);
  const nicheOk=!!o&&(activeSection!=="noticia"||!!newsNicheOf(o))&&(!activeNiche||(activeNiche===NO_NICHE?(!nicheOf(o)||BRAND_SECTIONS.has(activeSection)&&((activeSection==="brandsvalidated"?insiderCategoryOf(o):activeSection==="brandcreative"?brandHubNicheOf(o):brandNicheCanonical(nicheOf(o)))===BRAND_NICHE_REVIEW)):sameNiche(nicheOf(o),activeNiche)||isInsiderAdminArea()&&sameNiche(insiderCategoryOf(o),activeNiche)||(activeSection==="brandsgeneral"&&sameNiche(brandNicheCanonical(nicheOf(o)),activeNiche))||(activeSection==="brandcreative"&&sameNiche(brandHubNicheOf(o),activeNiche))||(activeSection==="tiktok"&&isAdmin&&sameNiche(nicheOf(o),activeNiche))));
  if(!o||itemSection(o)!==activeSection||!nicheOk){if(routeReady)renderNotFound("Item não encontrado nesta seção ou categoria.");return;}
  openView(id);
}
function applyRoute(){
  if(!routeReady)return;
  if(/^\/feg-brands-geral(?:\/|$)/.test(location.pathname))try{history.replaceState(history.state,"",location.pathname.replace(/^\/feg-brands-geral(?=\/|$)/,"/feg-brands-insider")+location.search+location.hash);}catch(_){}
  const r=parseLocation();
  if(r.notFound){renderNotFound();return;}
  if(ADMIN_SECTIONS.has(r.section)&&!isAdmin){renderNotFound("Esta área está disponível somente no painel administrativo.");return;}
  activeSection=r.section;
  if(r.legacyOrganicDetail){try{history.replaceState(history.state,"",offerPath(itemById(r.id)||{id:r.id,data:{kind:"criativo",division:"organic"}})+location.search);}catch(_){}}
  if(activeSection==="updates")markUpdatesSeen();
  activeNiche=r.niche||"";
  if(activeSection==="brandsvalidated"&&r.id){const item=itemById(r.id);if(item&&sectionOf(item)==="brandsvalidated"&&!sameNiche(activeNiche,insiderCategoryOf(item))){activeNiche=insiderCategoryOf(item);try{history.replaceState(history.state,"",listPath(activeSection,activeNiche)+"/"+r.id+location.search);}catch(_){}}}
  activeBrand=(BRAND_OFFER_SECTIONS.has(activeSection)||activeSection==="brandcreative")?(r.q.get("marca")||""):"";
  searchTerm=r.q.get("q")||"";
  if(location.pathname==="/"){try{history.replaceState(history.state,"",listPath(activeSection,activeNiche)+location.search);}catch(_){}}
  critPlatform=(activeSection==="criativo"||activeSection==="brandcreative")?"meta":"all";
  if(activeSection==="oferta"||BRAND_OFFER_SECTIONS.has(activeSection)){
    const requested=r.q.get("sort")||(activeSection==="brandsvalidated"?"spend_7d":"active_ads");offerSort=["active_ads","active_days","spend_7d","sales_7d"].includes(requested)?requested:"active_ads";
    offerDirection=r.q.get("direction")==="asc"?"asc":"desc";
    offerTagFilter=activeSection==="brandsvalidated"&&OFFER_TAGS[r.q.get("tag")]?r.q.get("tag"):"";
  }
  if(activeSection==="tiktok"){tiktokSort=r.q.get("ordem")||"views";tiktokSubniche=(RADAR_TOPICS[activeNiche]||[]).find(topic=>sameNiche(topic,r.q.get("tema")))||"";tiktokAuthor=r.q.get("perfil")||"";}else{tiktokSubniche="";tiktokAuthor="";}
  newsSubniche=activeSection==="noticia"?(RADAR_TOPICS[activeNiche]||[]).find(topic=>sameNiche(topic,r.q.get("tema")))||"":"";
  if(activeSection==="megabrain"||activeSection==="megabrainfegsys"){
    brainSort=r.q.get("ordem")||"metrica";brainAuthor=activeSection==="megabrain"?(r.q.get("autor")||""):"";
    if(activeSection==="megabrainfegsys"){brainPeriod=["today","yesterday","7d","14d","30d","90d","custom"].includes(r.q.get("periodo"))?r.q.get("periodo"):"7d";brainDateFrom=r.q.get("de")||"";brainDateTo=r.q.get("ate")||"";fegsysSalesMin=r.q.get("vendas_min")||"";fegsysSalesMax=r.q.get("vendas_max")||"";}
  }else brainAuthor="";
  // canoniza URL "nua" de seção com nicho -> /base/todos (ex.: /ofertas -> /ofertas/todos)
  if(NICHE_SECTIONS.has(activeSection)&&!r.id&&location.pathname!=="/"){
    const segN=decodeURIComponent(location.pathname).replace(/\/+$/,"").split("/").filter(Boolean).length;
    if(segN<2){try{history.replaceState(history.state,"",listPath(activeSection,activeNiche)+location.search);}catch(_){}}
  }
  const si=$("#searchInput");if(si&&si.value!==searchTerm)si.value=searchTerm;
  setDocTitle();
  document.body.classList.toggle("route-detail-full",!!r.id&&!isToolSection(activeSection)&&!(history.state&&history.state.modal));
  renderGrid();
  if(activeSection==="megabrainfegsys")setTimeout(()=>loadFegsysBrain(),0);
  if(isMobileNav())closeSideNav();
  if(r.id&&activeSection==="transcritor")loadTrRoute(r.id);
  else if(r.id)maybeOpenView(r.id);
  else if($("#viewOverlay")&&$("#viewOverlay").classList.contains("open"))closeOverlay("#viewOverlay");
}
function navigate(path,opts){opts=opts||{};try{history[opts.replace?"replaceState":"pushState"](opts.state||null,"",path);}catch(e){}applyRoute();}
function closeView(){if(history.state&&history.state.modal){history.back();return;}navigate(listPath(activeSection,activeNiche)+qsFromState(),{replace:true});}
/* interceptor: clique simples em link interno navega; Ctrl/⌘/Shift/meio-clique = comportamento nativo (nova aba) */
document.addEventListener("click",e=>{
  const a=e.target.closest("a[data-nav]");
  if(!a||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
  const href=a.getAttribute("href");
  if(!href||href[0]!=="/")return;
  e.preventDefault();
  if(href===location.pathname+location.search)return;
  const parsed=href.split("?")[0].split("/").filter(Boolean),sec=PATH2SEC[parsed[0]],isDetail=!!sec&&((NICHE_SECTIONS.has(sec)&&parsed.length>=3)||(!NICHE_SECTIONS.has(sec)&&parsed.length>=2));
  navigate(href,{state:isDetail?{modal:true}:null});
});
window.addEventListener("popstate",applyRoute);
const AI_SECTIONS=new Set(["transcritor","vsldissector"]);
let navPrevSection=null;
function isMobileNav(){return window.matchMedia("(max-width:980px)").matches;}
function openSideNav(){const n=$("#sideNav"),b=$("#sideNavBackdrop");if(n)n.classList.add("open");if(b)b.classList.add("open");}
function closeSideNav(){const n=$("#sideNav"),b=$("#sideNavBackdrop");if(n)n.classList.remove("open");if(b)b.classList.remove("open");}
function renderSideNav(){
  const nav=$("#sideNav");if(!nav)return;
  const counts={};SECTIONS.forEach(s=>counts[s.key]=0);
  offers.forEach(o=>{const k=sectionOf(o);if(k==="noticia"&&!newsNicheOf(o))return;counts[k]=(counts[k]||0)+1;});
  counts.megabrainfegsys=fegsysCards.length;
  counts.updates=updatesTotal;

  /* nichos somente nas seções que realmente usam essa taxonomia */
  let nicheHtml="";
  if(NICHE_SECTIONS.has(activeSection)&&activeSection!=="megabrainfegsys"){
    const secOffers=activeSection==="brandcreative"?brandHubItems():activeSection==="noticia"?newsItems():offers.filter(o=>sectionOf(o)===activeSection);
    const ncByKey=new Map();let none=0;
    secOffers.forEach(o=>{const n=activeSection==="brandcreative"?brandHubNicheOf(o):isInsiderAdminArea()?insiderCategoryOf(o):activeSection==="brandsgeneral"?brandNicheCanonical(nicheOf(o)):activeSection==="noticia"?newsNicheOf(o):nicheOf(o);if(!n||n===BRAND_NICHE_REVIEW){none++;return;}const key=nicheRouteKey(n),entry=ncByKey.get(key);if(entry)entry.count++;else ncByKey.set(key,{name:canonicalNiche(n),count:1});});
    const nc=new Map([...ncByKey.values()].map(entry=>[entry.name,entry.count]));
    if(BRAND_OFFER_SECTIONS.has(activeSection)||activeSection==="brandcreative"){(activeSection==="brandsvalidated"?BRAND_CATEGORIES:catalogNiches()).forEach(name=>{const key=nicheRouteKey(name);if(!ncByKey.has(key))ncByKey.set(key,{name,count:0});});}
    if(activeSection==="tiktok"||activeSection==="noticia")RADAR_NICHES.forEach(name=>{const key=nicheRouteKey(name);if(!ncByKey.has(key))ncByKey.set(key,{name,count:0});});
    if(activeNiche&&activeNiche!==NO_NICHE&&!ncByKey.has(nicheRouteKey(activeNiche)))activeNiche="";
    if(activeNiche===NO_NICHE&&!none)activeNiche="";
    const present=[...nc.keys()];
    const ordered=activeSection==="brandsvalidated"?BRAND_CATEGORIES:(activeSection==="tiktok"||activeSection==="noticia")?RADAR_NICHES:(BRAND_OFFER_SECTIONS.has(activeSection)||activeSection==="brandcreative")
      ?[...catalogNiches(),...present.filter(n=>!catalogNiches().some(c=>sameNiche(c,n))).sort((a,b)=>a.localeCompare(b,"pt-BR"))]
      :[...NICHOS.filter(n=>nc.has(n)),...present.filter(n=>!NICHOS.includes(n)).sort((a,b)=>a.localeCompare(b,"pt-BR"))];
    const nitem=(key,label,count,active)=>`<a class="snav__niche${active?" active":""}" data-nav href="${esc(listPath(activeSection,key))}" data-niche="${esc(key)}"><span class="nl"><span class="ndot"></span><span>${esc(label)}</span></span><span class="cnt">${count}</span></a>`;
    const productMenu=niche=>{
      if(!BRAND_OFFER_SECTIONS.has(activeSection)&&activeSection!=="brandcreative")return"";
      const selectedNiche=niche===NO_NICHE?BRAND_NICHE_REVIEW:niche,groups=new Map();
      secOffers.filter(o=>{const productNiche=activeSection==="brandcreative"?brandHubNicheOf(o):activeSection==="brandsvalidated"?insiderCategoryOf(o):brandNicheCanonical(nicheOf(o));return sameNiche(productNiche,selectedNiche);}).forEach(o=>{
        const key=activeSection==="brandsvalidated"?insiderProductKey(o):brandKeyOf(o),name=activeSection==="brandsvalidated"?insiderProductName(o):brandNameOf(o),entry=groups.get(key)||{name,count:0,item:o};entry.count++;if(activeSection==="brandsvalidated"&&offerSortFn(o,entry.item)<0)entry.item=o;groups.set(key,entry);
      });
      if(!groups.size)return"";
      const base=listPath(activeSection,niche),brandLink=(key,label,count,active)=>'<a class="snav__brand'+(active?" active":"")+'" data-nav href="'+esc(key?base+"?marca="+encodeURIComponent(key):base)+'"><span>'+esc(label)+'</span><span class="cnt">'+count+'</span></a>';
      return '<div class="snav__brands">'+brandLink("","Todos os produtos",[...groups.values()].reduce((total,entry)=>total+entry.count,0),!activeBrand)+[...groups.entries()].sort((a,b)=>activeSection==="brandsvalidated"?offerSortFn(a[1].item,b[1].item):a[1].name.localeCompare(b[1].name,"pt-BR")).map(([key,entry])=>brandLink(key,entry.name,entry.count,activeBrand===key)).join("")+'</div>';
    };
    nicheHtml+='<span class="snav__niches-title">'+((activeSection==="noticia"||activeSection==="tiktok")?"Temas e nichos":activeSection==="brandsvalidated"?"Categorias e produtos":"Nichos e produtos")+'</span>';
    nicheHtml+=nitem("","Todos",secOffers.length,activeNiche==="");
    ordered.forEach(n=>{const selected=sameNiche(activeNiche,n);nicheHtml+=nitem(n,n,ncByKey.get(nicheRouteKey(n))?.count||0,selected);if(selected){nicheHtml+=productMenu(n);if(activeSection==="tiktok"||activeSection==="noticia")nicheHtml+='<div class="snav__brands">'+(RADAR_TOPICS[n]||[]).map(topic=>{const count=secOffers.filter(o=>sameNiche(nicheOf(o),n)&&sameNiche(activeSection==="noticia"?newsTopicOf(o):((o.data||{}).subnicho||"Geral"),topic)).length;return '<a class="snav__brand'+(sameNiche(activeSection==="noticia"?newsSubniche:tiktokSubniche,topic)?' active':'')+'" data-nav href="'+esc(listPath(activeSection,n)+'?tema='+encodeURIComponent(topic))+'"><span>'+esc(topic)+'</span><span class="cnt">'+count+'</span></a>';}).join('')+'</div>';}});
    if(none&&activeSection!=="noticia"){const pendingActive=activeNiche===NO_NICHE;nicheHtml+=nitem(NO_NICHE,BRAND_SECTIONS.has(activeSection)?"Pendente de revisão":"Sem nicho",none,pendingActive);if(pendingActive)nicheHtml+=productMenu(NO_NICHE);}
  }

  /* anima o slide dos nichos só quando a SEÇÃO muda (não a cada clique de nicho) */
  const sectionChanged=navPrevSection!==activeSection;
  navPrevSection=activeSection;

  let html=`<div class="sidenav__head"><img class="logo-mark" src="/assets/feg-mark-3d.svg" alt="Grupo FEG" width="200" height="200"><span class="sidenav__brand">Grupo <span class="lime">FEG</span></span><button class="sidenav__x" id="sideNavClose" aria-label="Fechar menu">${ic("x")}</button></div>`;
  const navItem=s=>{
    const active=activeSection===s.key;
    const updateCount=s.key==="updates"?unreadUpdates():0;
    const chip=s.key==="vsldissector"?`<span class="snav__badge">Beta</span>`:s.key==="transcritor"?"":`<span class="snav__cnt${s.key==="updates"&&updateCount?" snav__cnt--alert":""}">${s.key==="updates"?updateCount:(counts[s.key]||0)}</span>`;
    const aiHi=s.key==="vsldissector"?" snav__sec--ai":"";
    const label=SEC_SHORT[s.key]||s.label;
    let out=`<a class="snav__sec${active?" active":""}${aiHi}" data-nav href="${esc(listPath(s.key,""))}" data-section="${s.key}">${ic(s.icon)}<span class="snav__lbl">${esc(label)}</span>${chip}</a>`;
    if(active&&nicheHtml)out+=`<div class="snav__niches${sectionChanged?" snav__niches--in":""}">${nicheHtml}</div>`;
    return out;
  };
  /* As seções ocultas e seus registros permanecem no armazenamento. */
  html+=`<div class="snav__group snav__group--brands">${ic("trending")}FEG Brands</div>`;
  BRANDS_NAV_ORDER.forEach(key=>{const section=SECTIONS.find(s=>s.key===key);if(section)html+=navItem(section);});
  nav.innerHTML=html;
  /* seções e nichos agora são <a data-nav href> — a navegação é tratada pelo
     interceptor central (preserva Ctrl/⌘/meio-clique = nova aba nativa). */
  const xb=$("#sideNavClose");if(xb)xb.addEventListener("click",closeSideNav);
}
function qbtn(label,url,icon){if(!url)return"";return `<button class="qbtn" data-href="${esc(fixUrl(url))}" title="${esc(label)}">${ic(icon)}${esc(label)}</button>`;}

/* ===== ADS: número + histórico (gráfico SVG puro) ===== */
function fmtNum(n){n=Number(n);return isNaN(n)?"–":n.toLocaleString("pt-BR");}
function kfmt(n){n=Number(n)||0;const a=Math.abs(n);if(a>=1e6)return (n/1e6).toFixed(a%1e6?1:0)+"M";if(a>=1000)return (n/1000).toFixed(a%1000&&a<1e4?1:0)+"k";return String(Math.round(n));}
function fmtDateShort(s){const p=String(s||"").split("-");return p.length===3?p[2]+"/"+p[1]:esc(s||"");}
function relTime(iso){const t=Date.parse(iso);if(isNaN(t))return"";let s=Math.floor((Date.now()-t)/1000);if(s<0)s=0;if(s<60)return"agora";if(s<3600)return"há "+Math.floor(s/60)+" min";if(s<86400)return"há "+Math.floor(s/3600)+"h";const d=Math.floor(s/86400);if(d<30)return"há "+d+(d===1?" dia":" dias");return new Date(t).toLocaleDateString("pt-BR");}
function adsHistOf(d){const h=d&&d.adsHistory;return Array.isArray(h)?h.filter(x=>x&&x.d&&x.n!=null&&!isNaN(+x.n)).map(x=>({d:x.d,n:+x.n,at:x.at||""})).sort((a,b)=>String(a.at||a.d).localeCompare(String(b.at||b.d))):[];}
function sparkSvg(hist){
  const pts=hist.slice(-14);if(pts.length<2)return"";
  const w=140,h=36,pad=3,ns=pts.map(p=>p.n),mn=Math.min(...ns),mx=Math.max(...ns),rng=(mx-mn)||1,li=pts.length-1;
  const X=i=>pad+i*(w-2*pad)/li,Y=n=>h-pad-((n-mn)/rng)*(h-2*pad);
  const line=pts.map((p,i)=>(i?"L":"M")+X(i).toFixed(1)+" "+Y(p.n).toFixed(1)).join(" ");
  const area=`M${X(0).toFixed(1)} ${h-pad} `+pts.map((p,i)=>"L"+X(i).toFixed(1)+" "+Y(p.n).toFixed(1)).join(" ")+` L${X(li).toFixed(1)} ${h-pad} Z`;
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path d="${area}" fill="var(--accent-soft)"/><path d="${line}" fill="none" stroke="var(--accent)" stroke-width="1.6" vector-effect="non-scaling-stroke"/><circle cx="${X(li).toFixed(1)}" cy="${Y(pts[li].n).toFixed(1)}" r="2.4" fill="var(--accent)" vector-effect="non-scaling-stroke"/></svg>`;
}
function adsRollingAverage(hist,windowSize=7){
  return hist.map((_,i)=>{const start=Math.max(0,i-windowSize+1),slice=hist.slice(start,i+1);return slice.reduce((sum,point)=>sum+point.n,0)/slice.length;});
}
function adsChartPointLabel(point){
  const date=fmtDateShort(point.d),time=Date.parse(point.at||"");
  return Number.isFinite(time)?`${date} · ${new Intl.DateTimeFormat("pt-BR",{hour:"2-digit",minute:"2-digit",timeZone:"America/Sao_Paulo"}).format(time)}`:date;
}
function adsChartSvg(hist){
  const pts=hist;
  if(!pts.length)return`<div class="muted-empty">Sem histórico ainda — será preenchido automaticamente a cada atualização do robô.</div>`;
  if(pts.length<2)return`<div class="muted-empty">Apenas 1 leitura até agora (${fmtNum(pts[0].n)} anúncios em ${fmtDateShort(pts[0].d)}). O gráfico aparece a partir da 2ª leitura.</div>`;
  const w=1080,h=380,padL=64,padR=24,padT=28,padB=46,iw=w-padL-padR,ih=h-padT-padB,li=pts.length-1;
  const averages=adsRollingAverage(pts),values=pts.map(p=>p.n),smallest=Math.min(...values,...averages),largest=Math.max(...values,...averages),spread=Math.max(1,largest-smallest);
  const mn=Math.max(0,smallest-spread*.16),mx=largest+spread*.16;
  const X=i=>padL+i*iw/li,Y=n=>padT+ih-((n-mn)/(mx-mn))*ih;
  const curve=series=>series.map((value,i)=>{
    const x=X(i),y=Y(value);if(!i)return`M${x.toFixed(1)} ${y.toFixed(1)}`;
    const px=X(i-1),py=Y(series[i-1]),bend=(x-px)*.34;
    return`C${(px+bend).toFixed(1)} ${py.toFixed(1)} ${(x-bend).toFixed(1)} ${y.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
  const line=curve(values),average=curve(averages),base=padT+ih;
  const area=`${line} L${X(li).toFixed(1)} ${base.toFixed(1)} L${X(0).toFixed(1)} ${base.toFixed(1)} Z`;
  let grid="";for(let g=0;g<=4;g++){const v=mn+(mx-mn)*g/4,y=Y(v);grid+=`<line class="${g?"grid-line":"axis-line"}" x1="${padL}" y1="${y.toFixed(1)}" x2="${w-padR}" y2="${y.toFixed(1)}"/><text class="axl" x="${padL-11}" y="${(y+4).toFixed(1)}" text-anchor="end">${kfmt(v)}</text>`;}
  const tickIndexes=[...new Set(Array.from({length:7},(_,i)=>Math.round(i*li/6)))];
  const xlabels=tickIndexes.map(i=>`<text class="axl" x="${X(i).toFixed(1)}" y="${h-13}" text-anchor="${i===0?"start":i===li?"end":"middle"}">${fmtDateShort(pts[i].d)}</text>`).join("");
  const latest=pts[li],difference=latest.n-pts[0].n,delta=`${difference>=0?"+":"−"}${fmtNum(Math.abs(difference))} ads desde a 1ª leitura`;
  const coords=pts.map((point,i)=>({x:+X(i).toFixed(1),y:+Y(point.n).toFixed(1),n:point.n,label:adsChartPointLabel(point)}));
  const chart=`<svg class="adschart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Evolução de anúncios ativos de ${fmtDateShort(pts[0].d)} a ${fmtDateShort(latest.d)} em ${pts.length} leituras. A linha rosa é a média móvel de sete leituras."><defs><linearGradient id="adsFill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="var(--chart-line)" stop-opacity=".25"/><stop offset="1" stop-color="var(--chart-line)" stop-opacity="0"/></linearGradient><filter id="adsGlow" x="-25%" y="-45%" width="150%" height="190%"><feGaussianBlur stdDeviation="5"/></filter></defs>${grid}<path d="${area}" fill="url(#adsFill)"/><path d="${average}" fill="none" stroke="var(--chart-average)" stroke-width="2.5" stroke-dasharray="8 7" opacity=".86"/><path d="${line}" fill="none" stroke="var(--chart-line)" stroke-width="9" opacity=".5" filter="url(#adsGlow)"/><path d="${line}" fill="none" stroke="var(--chart-line)" stroke-width="3.4" stroke-linejoin="round" stroke-linecap="round"/><line class="adschart-crosshair" data-ads-cursor x1="${X(li).toFixed(1)}" y1="${padT}" x2="${X(li).toFixed(1)}" y2="${base.toFixed(1)}"/><circle class="adschart-focus" data-ads-focus cx="${X(li).toFixed(1)}" cy="${Y(latest.n).toFixed(1)}" r="7"/>${xlabels}</svg>`;
  return `<div class="adschart-panel" data-ads-chart data-ads-points="${esc(JSON.stringify(coords))}" tabindex="0" role="group" aria-label="Gráfico de anúncios ativos. Use as setas esquerda e direita para consultar cada leitura."><div class="adschart-panel__head"><div><span class="adschart-panel__eyebrow">Monitoramento da biblioteca</span><h3 class="adschart-panel__title">Anúncios ativos ao longo do tempo</h3><p class="adschart-panel__range">${fmtDateShort(pts[0].d)} a ${fmtDateShort(latest.d)} · ${pts.length} leituras registradas</p></div><span class="adschart-panel__delta${difference<0?" is-down":""}">${delta}</span></div><div class="adschart-legend"><span><i aria-hidden="true"></i>Anúncios ativos</span><span class="is-average"><i aria-hidden="true"></i>Média móvel · 7 leituras</span></div><div class="adschart-scroll" role="region" aria-label="Gráfico completo de anúncios ativos; role horizontalmente em telas pequenas">${chart}</div><div class="adschart-panel__foot"><span>Cada ponto representa uma leitura real da biblioteca.</span><span class="adschart-panel__readout" data-ads-readout aria-live="polite">${esc(adsChartPointLabel(latest))} · ${fmtNum(latest.n)} anúncios</span></div></div>`;
}
function wireAdsChart(root){
  $$("[data-ads-chart]",root).forEach(panel=>{
    const points=JSON.parse(panel.dataset.adsPoints||"[]"),svg=$("svg",panel),cursor=$("[data-ads-cursor]",panel),focus=$("[data-ads-focus]",panel),readout=$("[data-ads-readout]",panel);
    if(!points.length||!svg||!cursor||!focus||!readout)return;
    let current=points.length-1;
    const select=index=>{const next=Math.max(0,Math.min(points.length-1,index));if(next===current)return;current=next;const point=points[current];cursor.setAttribute("x1",point.x);cursor.setAttribute("x2",point.x);focus.setAttribute("cx",point.x);focus.setAttribute("cy",point.y);readout.textContent=`${point.label} · ${fmtNum(point.n)} anúncios`;};
    svg.addEventListener("pointermove",event=>{const bounds=svg.getBoundingClientRect(),x=(event.clientX-bounds.left)*1080/bounds.width;select(Math.round((x-64)/(1080-64-24)*(points.length-1)));});
    panel.addEventListener("keydown",event=>{if(!["ArrowLeft","ArrowRight","Home","End"].includes(event.key))return;event.preventDefault();select(event.key==="Home"?0:event.key==="End"?points.length-1:current+(event.key==="ArrowRight"?1:-1));});
  });
}

function cardHtml(o){
  const d=normalize(o.data);
  const native=d.tipoTrafego==="native";
  const domLinks=d.dominios.filter(x=>x.linkDominio);
  const coLinks=d.dominios.filter(x=>x.linkCheckout);
  const crvs=d.criativos.filter(x=>x.link);
  const bibs=d.bibliotecas.filter(x=>x.link);
  const tabs=d.taboolaAds.filter(x=>x.img);
  const brLink=(d.dominios.find(x=>x.backRedirect)||{}).backRedirect||"";
  const presell=d.advertorialLink||"";
  const multi=domLinks.length>1||coLinks.length>1;

  const ads=getAds(d);const high=!native&&ads!=null&&ads>=HIGH_VOLUME;

  const tbadge=native
    ?`<span class="tbadge tbadge--native"><span class="tdot"></span>Native · Taboola</span>`
    :`<span class="tbadge tbadge--fb"><span class="tdot"></span>Facebook Ads</span>`;
  const hot=high?`<span class="hotbadge">${ic("zap")}Alto volume</span>`:"";

  const chips=[];
  if(d.nicho)chips.push(`<span class="chip niche">${esc(d.nicho)}</span>`);
  if(d.formato)chips.push(`<span class="chip">${esc(d.formato)}</span>`);
  if(domLinks.length>1)chips.push(`<span class="chip accent">${domLinks.length} domínios</span>`);
  if(native){if(tabs.length)chips.push(`<span class="chip accent">${tabs.length} ${tabs.length>1?"ads":"ad"} Taboola</span>`);}
  else if(bibs.length>1)chips.push(`<span class="chip accent">${bibs.length} bibliotecas</span>`);

  let stats="";
  if(!native){
    const adsDisp=ads!=null?ads.toLocaleString("pt-BR"):"–";
    const daysMetric=window.SwipeMetrics.activeDays(d);
    stats=`<div class="card__stats"><div class="kpi${high?" kpi--hot":""}"><div class="kpi__l">${ic(high?"zap":"play")}Anúncios ativos</div><div class="kpi__v">${adsDisp}</div></div><div class="kpi"><div class="kpi__l">${ic("clock")}Dias ativos</div><div class="kpi__v">${daysMetric.value==null?"–":`${esc(daysMetric.value)} dias`}</div></div></div>`;
  }

  const note=multi?`<div class="cnote cnote--danger">${ic("alert")}Mais de uma oferta/checkout — abra para ver todas.</div>`:"";

  const adsHist=adsHistOf(d);
  const adsExtra=native?"":`${adsHist.length>=2?sparkSvg(adsHist):""}${d.adsUpdatedAt?`<div class="adsmeta"><span class="adsauto">${ic("zap")}auto</span><span class="adsupd">${ic("clock")}${esc(relTime(d.adsUpdatedAt))}</span></div>`:""}`;

  const quick=(native?[
    qbtn("Presell",presell,"newspaper"),
    qbtn("Domínio",(domLinks[0]||{}).linkDominio,"globe"),
    qbtn("Checkout",(coLinks[0]||{}).linkCheckout,"cart"),
    qbtn("Back redirect",brLink,"back")
  ]:[
    qbtn("Biblioteca",(bibs[0]||{}).link,"library"),
    qbtn("Anúncios",(crvs[0]||{}).link,"play"),
    qbtn("Presell",presell,"newspaper"),
    qbtn("Domínio",(domLinks[0]||{}).linkDominio,"globe"),
    qbtn("Checkout",(coLinks[0]||{}).linkCheckout,"cart"),
    qbtn("Back redirect",brLink,"back")
  ]).filter(Boolean).join("");

  return card({
    id:o.id,
    variant:high?"card--hot":"",
    head:`${tbadge}${hot}`,
    media:offerCardPreview(d,d.nomeOferta||"Oferta"),
    body:`<div class="card__body">${cardIdentity(d.nomeMarca||"Sem marca",d.nomeOferta||"Oferta sem nome")}</div>`,
    chips:chips.length?`<div class="card__chips">${chips.join("")}</div>`:"",
    extra:`${stats}${adsExtra}${note}`,
    actions:quick
  });
}
const BRAND_BM_METRICS=[
  ["Gasto · 7 dias","bmSpend7d"],["Gasto · 14 dias","bmSpend14d"],["Gasto · 30 dias","bmSpend30d"],["Valor médio conversão","bmAvgConversion"],["CTR","bmCtr"],
  ["CPA","bmCpa"],
  ["CPC · todos","bmCpc"],["CPC · link","bmCpcLink"],["CPM","bmCpm"],["Clique único","bmCostUnique"],
  ["Custo por IC","bmCostIc"],["ROAS","bmRoas"],["Atualização","bmUpdatedAt"]
];
function brandBmHasData(d){return BRAND_BM_METRICS.some(([,key])=>String((d&&d[key])||"").trim())||(d&&d.bmPrints||[]).some(x=>x&&x.img)||(d&&d.brandTopAds||[]).some(x=>x&&(x.img||x.link));}
function brandMetricGrid(d,detail){return `<div class="brand-metrics${detail?" brand-metrics--detail":""}">${BRAND_BM_METRICS.map(([label,key])=>{const value=String((d&&d[key])||"").trim();return `<div class="brand-metric"><span class="brand-metric__label">${esc(label)}</span><span class="brand-metric__value${value?"":" is-empty"}">${esc(value||"—")}</span></div>`;}).join("")}</div>`;}
const BM_REPORT_METRICS=[["Gasto","spend"],["ROAS","roas"],["Valor médio","avgConversion"],["Custo por resultado","costResult"],["Resultados","results"],["CTR","ctr"],["CPC","cpc"],["CPM","cpm"],["CPC link","cpcLink"],["Clique único","costUnique"]];
function bmReportDateKey(report){
  const captured=String(report&&report.capturedAt||"").slice(0,10);
  if(/^\d{4}-\d{2}-\d{2}$/.test(captured))return captured;
  const dates=String(report&&report.range||"").match(/\d{2}\/\d{2}\/\d{4}/g)||[];
  if(!dates.length)return"sem-data";
  const [day,month,year]=dates[dates.length-1].split("/");return`${year}-${month}-${day}`;
}
function bmReportDateLabel(key){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(key))return"Sem data";
  return new Date(`${key}T12:00:00Z`).toLocaleDateString("pt-BR",{day:"2-digit",month:"short",year:"numeric",timeZone:"UTC"});
}
function bmReportWindowKey(report){
  const text=`${report&&report.key||""} ${report&&report.label||""}`.toLowerCase();
  if(/30\s*dias|30d/.test(text))return"30d";
  if(/14\s*dias|14d/.test(text))return"14d";
  if(/7\s*dias|7d/.test(text))return"7d";
  if(/ontem|1d|1 dia/.test(text))return"1d";
  return"outro";
}
function bmReportGroups(d){
  const byDate=new Map(),order={"1d":0,"7d":1,"14d":2,"30d":3,outro:4};
  for(const report of Array.isArray(d&&d.bmReports)?d.bmReports:[]){
    if(!report||!report.key)continue;
    const date=bmReportDateKey(report);if(!byDate.has(date))byDate.set(date,[]);byDate.get(date).push(report);
  }
  return [...byDate.entries()].sort(([a],[b])=>a==="sem-data"?1:b==="sem-data"?-1:b.localeCompare(a)).map(([date,reports])=>({date,reports:reports.sort((a,b)=>order[bmReportWindowKey(a)]-order[bmReportWindowKey(b)])}));
}
function bmReportTabLabel(report){
  const windowKey=bmReportWindowKey(report);
  if(windowKey==="30d")return"30 dias";
  if(windowKey==="14d")return"14 dias";
  if(windowKey==="7d")return"7 dias";
  if(windowKey==="1d")return/ontem/i.test(String(report&&report.label||""))?"Ontem":"1 dia";
  return String(report&&report.label||"Período").replace(/^.*?·\s*/,"" )||"Período";
}
function bmHasValue(value){return value!=null&&String(value).trim()!==""&&String(value).trim()!=="—";}
function bmNumeric(value){
  if(typeof value==="number")return Number.isFinite(value)?value:null;
  const match=String(value??"").match(/-?\d[\d.,]*/);if(!match)return null;
  const raw=match[0],normalized=raw.includes(",")?raw.replaceAll(".","").replace(",","."):raw.replaceAll(".","");
  const number=Number(normalized);return Number.isFinite(number)?number:null;
}
function bmReportDisplayTotals(report){
  const totals=report?.totals||{},rows=Array.isArray(report?.campaigns)?report.campaigns:[];
  const spend=bmNumeric(totals.spend),lines=rows.map(row=>({spend:bmNumeric(row.spend),roas:bmNumeric(row.roas),purchases:/visitas|não compras/i.test(String(row.results||""))?null:bmNumeric(row.results),nonPurchase:/visitas|não compras/i.test(String(row.results||""))}));
  const recordedSpend=lines.reduce((sum,row)=>sum+(row.spend||0),0),complete=spend!=null&&lines.length>0&&Math.abs(recordedSpend-spend)<0.1;
  const purchaseRows=lines.filter(row=>row.purchases!=null),salesKnown=purchaseRows.length>0,sales=purchaseRows.reduce((sum,row)=>sum+row.purchases,0);
  const roasRows=lines.filter(row=>row.spend!=null&&row.roas!=null),trackedSpend=roasRows.reduce((sum,row)=>sum+row.spend,0);
  const calculatedRoas=trackedSpend>0?roasRows.reduce((sum,row)=>sum+row.spend*row.roas,0)/trackedSpend:null;
  const directSales=bmHasValue(totals.results)&&bmNumeric(totals.results)!=null,directRoas=bmHasValue(totals.roas)&&bmNumeric(totals.roas)!=null;
  const salesPartial=!complete||purchaseRows.length!==lines.length,roasPartial=!complete||Math.abs(trackedSpend-recordedSpend)>=0.1;
  const partial=!directSales&&salesKnown&&salesPartial||!directRoas&&calculatedRoas!=null&&roasPartial;
  return {results:directSales?String(totals.results):salesKnown?`${sales.toLocaleString("pt-BR")} compras${salesPartial?" · parcial":""}`:"Não informado",resultsLabel:directSales?/compras|vendas/i.test(String(totals.results))?"Vendas":"Resultados":salesKnown?salesPartial?"Vendas parciais":"Vendas":"Resultados",roas:directRoas?String(totals.roas):calculatedRoas!=null?`≈ ${calculatedRoas.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}${roasPartial?" · parcial":""}`:"Não informado",roasLabel:directRoas?"ROAS":calculatedRoas!=null&&roasPartial?"ROAS parcial":"ROAS",derivedSales:!directSales&&salesKnown,derivedRoas:!directRoas&&calculatedRoas!=null,partial,sourceCount:rows.length};
}
const BM_CARD_FIELDS=[["Gasto","spend"],["ROAS","roas"],["CPA","costResult"],["AOV","avgConversion"],["CPM","cpm"],["CTR link","ctr"],["CPC link","cpcLink"]];
function bmSummaryMetric(report,key){
  const totals=report?.totals||{},rows=Array.isArray(report?.campaigns)?report.campaigns:[],currency=report?.currency==="USD"?"US$":report?.currency||"US$";
  // Older reports store link CPC as cpc; newer reports separate it with cpcLink.
  const metricValue=source=>key==="cpcLink"&&!bmHasValue(source.cpcLink)?source.cpc:source[key];
  const totalValue=metricValue(totals);
  if(bmNumeric(totalValue)!=null)return {value:String(totalValue),source:/parcial|amostra|campanhas/i.test(String(totalValue))?"Indicador parcial registrado na BM":"Total da BM"};
  if(key==="spend"){
    const values=rows.map(row=>bmNumeric(row.spend)).filter(value=>value!=null);
    return values.length?{value:`≈ ${currency} ${values.reduce((sum,value)=>sum+value,0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}`,source:"Subtotal das campanhas registradas; total da BM indisponível"}:{value:"—",source:"Não informado na BM"};
  }
  if(key==="costResult"){
    const purchases=text=>/\b(compras?|vendas?|purchases?)\b/i.test(String(text||""))&&!/visitas|não compras|parcial|amostra/i.test(String(text||""));
    const totalSpend=bmNumeric(totals.spend),totalSales=purchases(totals.results)?bmNumeric(totals.results):null;
    if(totalSpend!=null&&totalSales>0)return {value:`≈ ${currency} ${(totalSpend/totalSales).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}`,source:"CPA calculado pelo gasto e compras totais da BM"};
    const known=rows.filter(row=>purchases(row.results)&&bmNumeric(row.spend)!=null&&bmNumeric(row.results)>0);
    if(known.length){const spend=known.reduce((sum,row)=>sum+bmNumeric(row.spend),0),sales=known.reduce((sum,row)=>sum+bmNumeric(row.results),0);return {value:`≈ ${currency} ${(spend/sales).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}`,source:`CPA calculado das ${known.length} campanhas com compras legíveis; pode ser parcial`};}
  }
  const candidates=rows.map(row=>({row,spend:bmNumeric(row.spend),value:bmNumeric(metricValue(row))})).filter(item=>item.spend!=null&&item.spend>0&&item.value!=null);
  if(candidates.length>1){
    const spend=candidates.reduce((sum,item)=>sum+item.spend,0);
    let average=candidates.reduce((sum,item)=>sum+item.value,0)/candidates.length,source=`Média simples de ${candidates.length} campanhas; estimativa, não total da BM`;
    if(key==="roas"){average=candidates.reduce((sum,item)=>sum+item.value*item.spend,0)/spend;source=`Média ponderada pelo gasto de ${candidates.length} campanhas; pode ser parcial`;}
    if(["costResult","cpm","cpcLink"].includes(key)&&candidates.every(item=>item.value>0)){
      average=spend/candidates.reduce((sum,item)=>sum+item.spend/item.value,0);source=`Média agregada de ${candidates.length} campanhas pelo denominador do indicador; pode ser parcial`;
    }
    const formatted=average.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
    const sample=String(metricValue(candidates[0].row)||"");
    return {value:`≈ ${sample.includes("%")?formatted+"%":(sample.match(/^(US\$|R\$|\$)/)||[])[0]?`${(sample.match(/^(US\$|R\$|\$)/)||[])[0]} ${formatted}`:formatted}`,source};
  }
  if(candidates.length===1)return {value:String(metricValue(candidates[0].row)),source:"Campanha de maior gasto com dado disponível"};
  return {value:"—",source:"Não informado na BM"};
}
function bmReportMetric(label,value,compact=false,source=""){
  const ready=bmHasValue(value),tag=compact?"bm-campaign__metric":"bm-report__metric";
  return `<div class="${tag}"${source?` title="${esc(source)}"`:""}><span>${esc(label)}</span><strong${ready?"":' class="is-empty"'}>${esc(ready?String(value):"Não informado")}</strong></div>`;
}
function bmReportSecondaryMetrics(source){
  const separateLink=bmHasValue(source.cpcLink);
  return [["Valor médio por compra",source.avgConversion],["Custo por resultado",source.costResult],["CTR",source.ctr],[separateLink?"CPC geral":"CPC no link",source.cpc],...(separateLink?[["CPC no link",source.cpcLink]]:[]),["CPM",source.cpm],["Clique único",source.costUnique]].filter(([,value])=>bmHasValue(value));
}
function brandReportPane(report){
  if(!report)return`<div class="muted-empty">Nenhum relatório por campanha cadastrado.</div>`;
  const rows=Array.isArray(report.campaigns)?report.campaigns:[],totals=report.totals||{},display=bmReportDisplayTotals(report);
  const primary=BM_CARD_FIELDS.map(([label,key])=>{const metric=bmSummaryMetric(report,key);return bmReportMetric(label,metric.value,false,metric.source);}).join("");
  const secondary=bmReportMetric(display.resultsLabel,display.results);
  const campaigns=rows.length?`<div class="bm-campaigns__list">${rows.map(row=>{
    const campaignPurchase=/compras|vendas/i.test(String(row.results||"")),core=[["Gasto",row.spend],[campaignPurchase?"Vendas":"Resultados",row.results],["ROAS",row.roas]];
    const metrics=[...core,...bmReportSecondaryMetrics(row)].filter(([label,value])=>label==="Gasto"||bmHasValue(value));
    return `<article class="bm-campaign"><div class="bm-campaign__name">${esc(row.name||"Campanha")}</div><div class="bm-campaign__metrics">${metrics.map(([label,value])=>bmReportMetric(label,value,true)).join("")}</div></article>`;
  }).join("")}</div>`:`<div class="muted-empty">Nenhuma campanha informada neste período.</div>`;
  const derivation=display.derivedSales||display.derivedRoas?`<div class="bm-report__other">${display.partial?`Subtotal das campanhas com métricas legíveis neste recorte. Algumas campanhas ou métricas não aparecem no print; não é o total da BM.`:`Cálculo das ${display.sourceCount} campanhas; o ROAS é aproximado porque os índices por campanha aparecem arredondados.`}</div>`:"";
  return `<article class="bm-report"><div class="bm-report__head"><div><div class="bm-report__title">${esc(bmReportTabLabel(report))} · leitura de ${esc(bmReportDateLabel(bmReportDateKey(report)))}</div><div class="bm-report__range">${esc(report.range||"")} · ${esc(report.currency||"USD")}</div></div><span class="bm-report__level">${esc(report.level||"Campanhas")}</span></div><div class="bm-report__summary bm-report__summary--primary">${primary}</div>${secondary?`<div class="bm-report__summary bm-report__summary--secondary">${secondary}</div>`:""}${derivation}${totals.otherResults?`<div class="bm-report__other">Outros resultados: ${esc(totals.otherResults)}</div>`:""}<div class="bm-campaigns"><div class="bm-campaigns__head"><h4>Campanhas</h4><span>${rows.length} ${rows.length===1?"campanha":"campanhas"}</span></div>${campaigns}</div></article>`;
}
function brandReportsHtml(d,id){
  const groups=bmReportGroups(d),all=groups.flatMap(group=>group.reports);
  if(!all.length)return`<div class="muted-empty">Nenhum relatório por campanha cadastrado.</div>`;
  const active=all.find(report=>report.key===activeBmPeriodByOffer[id])||groups[0].reports.find(report=>bmReportWindowKey(report)==="7d")||groups[0].reports[0];
  activeBmPeriodByOffer[id]=active.key;
  const activeDate=bmReportDateKey(active),current=groups.find(group=>group.date===activeDate),activeIndex=current.reports.indexOf(active);
  const dates=groups.map(group=>{
    const seven=group.reports.find(report=>bmReportWindowKey(report)==="7d")||group.reports[0];
    return `<button type="button" class="bm-date-card" data-bm-date="${esc(group.date)}" aria-pressed="${group.date===activeDate}"><span>Leitura da BM</span><strong>${esc(bmReportDateLabel(group.date))}</strong><small>${group.reports.length} ${group.reports.length===1?"período":"períodos"} · ${esc(bmReportTabLabel(seven))}: ${esc((seven.totals||{}).spend||"—")}</small></button>`;
  }).join("");
  return `<div class="bm-history" id="bmHistory"><div class="bm-history__intro"><h3>Histórico de desempenho</h3><p>${groups.length} ${groups.length===1?"leitura":"leituras"} · ${all.length} ${all.length===1?"período":"períodos"} salvos</p></div><div class="bm-date-carousel"><button type="button" class="bm-date-arrow" data-bm-date-step="-1" aria-label="Leitura mais recente" ${groups[0].date===activeDate?"disabled":""}>‹</button><div class="bm-date-rail" id="bmDateRail" role="group" aria-label="Datas das leituras da Business Manager">${dates}</div><button type="button" class="bm-date-arrow" data-bm-date-step="1" aria-label="Leitura mais antiga" ${groups[groups.length-1].date===activeDate?"disabled":""}>›</button></div><div class="bm-period-tabs" id="bmPeriodTabs" role="tablist" aria-label="Períodos da leitura selecionada" data-bm-date="${esc(activeDate)}">${bmPeriodTabsHtml(current.reports,active.key)}</div><div class="bm-report-pane" id="bmReportPane" role="tabpanel" aria-labelledby="bm-period-tab-${activeIndex}">${brandReportPane(active)}</div><span class="sr-only" id="bmReportStatus" aria-live="polite"></span></div>`;
}
function bmPeriodTabsHtml(reports,selectedKey){return reports.map((report,index)=>`<button type="button" class="bm-period-tab" role="tab" id="bm-period-tab-${index}" aria-controls="bmReportPane" aria-selected="${report.key===selectedKey}" tabindex="${report.key===selectedKey?0:-1}" data-bm-period-key="${esc(report.key)}" title="${esc(report.label||"")} · ${esc(report.range||"")}">${esc(bmReportTabLabel(report))}</button>`).join("");}
function brandReportsStaticHtml(d){
  const reports=Array.isArray(d&&d.bmReports)?d.bmReports:[];
  if(!reports.length)return`<div class="muted-empty">Nenhum relatório por campanha cadastrado.</div>`;
  return `<div class="bm-reports">${reports.map(report=>{
    const rows=Array.isArray(report.campaigns)?report.campaigns:[],totals=report.totals||{};
    const summary=BM_REPORT_METRICS.map(([label,key])=>`<div class="bm-report__metric"><span>${esc(label)}</span><strong>${esc(totals[key]||"—")}</strong></div>`).join("");
    const table=rows.length?`<div class="bm-table-wrap"><table class="bm-table"><thead><tr><th>Campanha</th>${BM_REPORT_METRICS.map(([label])=>`<th>${esc(label)}</th>`).join("")}</tr></thead><tbody>${rows.map(row=>`<tr><td>${esc(row.name||"Campanha")}</td>${BM_REPORT_METRICS.map(([,key])=>`<td>${esc(row[key]||"—")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`:`<div class="muted-empty" style="padding:16px 18px">Sem linhas por campanha neste período.</div>`;
    return `<article class="bm-report"><div class="bm-report__head"><div><div class="bm-report__title">${esc(report.label||"Período")}</div><div class="bm-report__range">${esc(report.range||"")}</div></div><span class="bm-report__level">${esc(report.level||"Campanhas")}</span></div><div class="bm-report__summary">${summary}</div>${table}</article>`;
  }).join("")}</div>`;
}
function bmPrintPeriod(print){
  const name=String(print&&print.nome||""),key=String(print&&print.periodKey||"").toLowerCase();
  if(/\b7\s*dias\b|\b7d\b/.test(`${name.toLowerCase()} ${key}`))return["7d","Últimos 7 dias"];
  if(/\b14\s*dias\b|\b14d\b/.test(`${name.toLowerCase()} ${key}`))return["14d","Últimos 14 dias"];
  if(/\b30\s*dias\b|\b30d\b/.test(`${name.toLowerCase()} ${key}`))return["30d","Últimos 30 dias"];
  if(/\bontem\b|\b1d\b/.test(`${name.toLowerCase()} ${key}`))return["1d","Ontem"];
  const date=name.match(/\b\d{2}\/\d{2}\/\d{4}\b/);
  if(date)return[`date-${date[0]}`,`Leitura de ${date[0]}`];
  if(key==="settings"||/configura[çc][ãa]o/i.test(name))return["settings","Configuração da BM"];
  return["other","Período não identificado"];
}
function bmEvidenceRef(img){
  const value=String(img||"");
  if(value.startsWith("admin-bm:blob:"))return value.slice(9);
  const match=value.match(/^\/assets\/(ultima-peak|primal-viking|ancestral-supplements|mars-men|joymode)\/(print-(?:0[1-9]|10)\.(?:jpeg|b64))$/);
  return match?`legacy:${match[1]}/${match[2]}`:"";
}
const bmEvidenceObjectUrls=new Map();
async function adminBmToken(){
  const session=sb&&await sb.auth.getSession(),token=session?.data?.session?.access_token;
  if(!isAdmin||!token)throw new Error("Sessão administrativa necessária");
  return token;
}
async function bmEvidenceReadToken(){
  const session=sb&&await sb.auth.getSession(),token=session?.data?.session?.access_token;
  if(!token)throw new Error("Sessão necessária para ler o print");
  return token;
}
async function hydrateBmEvidence(root){
  const links=$$("a[data-bm-ref]",root);if(!links.length)return;
  let token;try{token=await bmEvidenceReadToken();}catch(_){return;}
  for(const link of links){
    if(!link.isConnected)return;
    const ref=link.dataset.bmRef;
    try{
      let url=bmEvidenceObjectUrls.get(ref);
      if(!url){
        const response=await fetch(`/.netlify/functions/admin-bm-evidence?ref=${encodeURIComponent(ref)}`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
        if(!response.ok)throw new Error(`Print indisponível (${response.status})`);
        url=URL.createObjectURL(await response.blob());bmEvidenceObjectUrls.set(ref,url);
      }
      link.href=url;link.dataset.lightbox=url;link.dataset.bmReady="1";
      const img=$("img",link);if(img)img.src=url;
      link.classList.remove("is-loading");
    }catch(error){console.warn("Falha ao carregar print da BM",error);link.classList.remove("is-loading");link.classList.add("is-unavailable");link.removeAttribute("data-lightbox");const label=$("span",link);if(label)label.textContent="Print indisponível";}
  }
}
function bmImportPeriod(file){
  const name=String(file.webkitRelativePath||file.name).toLowerCase();
  if(/(?:^|[\s_\/.-])(?:ontem|1d)(?:[\s_\/.-]|$)/.test(name))return"1d";
  for(const days of [7,14,30])if(new RegExp(`(?:^|[\\s_\\/.-])${days}(?:d|\\s*dias)(?:[\\s_\\/.-]|$)`).test(name))return`${days}d`;
  return"other";
}
async function importBmEvidence(offerId,button){
  const offer=itemById(offerId);if(!isAdmin||!offer||!sb)return;
  // A pasta inclui bm-data.json; restringir o seletor a imagens impede a escolha
  // do diretório no Brave/macOS e omite o manifesto em alguns navegadores.
  const input=document.createElement("input");input.type="file";input.multiple=true;input.webkitdirectory=true;
  input.addEventListener("change",async()=>{
    const files=[...input.files].filter(file=>/\.(jpe?g|png|webp)$/i.test(file.name)),manifestFile=[...input.files].find(file=>file.name==="bm-data.json");if(!files.length)return;
    const expected=String(offer.data?.nomeMarca||offer.data?.nomeOferta||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"");
    const folder=String(files[0].webkitRelativePath||"").split("/")[0].normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"");
    if(!folder||!expected||!folder.includes(expected)&&!expected.includes(folder)){toast("A pasta escolhida não corresponde à marca deste produto; importação cancelada.",true);return;}
    if(files.some(file=>String(file.webkitRelativePath||"").split("/")[0].normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"")!==folder)){toast("Selecione apenas uma pasta de marca.",true);return;}
    button.disabled=true;const status=$(".bm-evidence__status",button.closest(".bm-evidence"));if(status){status.classList.remove("sr-only");status.textContent=`Importando 0 de ${files.length} prints…`;}
    try{
      const token=await adminBmToken(),previous=adminOfferDrafts[offerId]||{},patch={...(previous.data_patch||{})},prints=[...(Array.isArray(patch.bmPrints)?patch.bmPrints:[])];
      let manifest=null;
      if(manifestFile){
        manifest=JSON.parse(await manifestFile.text());
        if(manifest.offerId!==offerId||!manifest.patch||typeof manifest.patch!=="object"||Array.isArray(manifest.patch))throw new Error("Manifesto da marca não corresponde a este produto");
        for(const key of ["bmReports","bmReportsReplace","bmReportsRemoveKeys","bmNotes","bmNotesReplace","bmSpend7d","bmSpend14d","bmSpend30d","bmRoas","bmUpdatedAt","adsLibraryCheckedAt"]){if(Object.prototype.hasOwnProperty.call(manifest.patch,key))patch[key]=manifest.patch[key];}
      }
      for(const [index,file] of files.entries()){
        if(file.size>4*1024*1024)throw new Error(`${file.name}: imagem acima de 4 MB`);
        const response=await fetch("/.netlify/functions/admin-bm-evidence",{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":file.type||"application/octet-stream","x-offer-id":offerId},body:file});
        const payload=await response.json();if(!response.ok||!payload.ok)throw new Error(`${file.name}: ${payload.error||"falha no envio"}`);
        const img=`admin-bm:${payload.ref}`;
        const relativePath=String(file.webkitRelativePath||file.name).split("/").slice(1).join("/");
        const periodKey=manifest?.periods?.[relativePath]||bmImportPeriod(file);
        if(!prints.some(print=>print.img===img))prints.push({nome:file.name,periodKey,img});
        if(status)status.textContent=`Importando ${index+1} de ${files.length} prints…`;
      }
      patch.bmPrints=prints;
      const draft=await saveAdminOfferDraft({target_offer_id:offerId,label:previous.label||String(offer.data?.nomeOferta||offer.data?.nomeMarca||"Oferta Brands"),new_offer:!!offer.adminPrivate,data_patch:patch});
      adminOfferDrafts[offerId]=draft;if(offer.adminPrivate)offer.data=patch;openView(offerId,true);renderGrid(true);toast(`${files.length} prints salvos apenas no painel admin.`);
    }catch(error){console.warn("Falha ao importar prints",error);toast(`Importação incompleta: ${error.message||"tente novamente"}`,true);if(status)status.textContent="Importação incompleta; repita a operação para concluir.";}
    finally{button.disabled=false;}
  },{once:true});input.click();
}
function bmEvidenceHtml(d,id){
  const prints=(Array.isArray(d&&d.bmPrints)?d.bmPrints:[]).filter(print=>print&&print.img);
  const importButton=isAdmin?`<button class="bm-evidence__import" type="button" data-bm-import="${esc(id)}">Importar pasta de prints</button>`:"";
  if(!prints.length)return`<div class="bm-evidence"><div class="bm-evidence__heading"><h3>Prints da BM</h3>${importButton}</div><p class="bm-evidence__note">Nenhum print salvo para este produto.</p><p class="bm-evidence__status sr-only" aria-live="polite"></p></div>`;
  const groups=new Map();for(const print of prints){const [key,label]=bmPrintPeriod(print);if(!groups.has(key))groups.set(key,{label,prints:[]});groups.get(key).prints.push(print);}
  const order={"1d":0,"7d":1,"14d":2,"30d":3,"settings":8,"other":9};
  const html=[...groups.entries()].sort(([a],[b])=>(order[a]??5)-(order[b]??5)).map(([key,group])=>{
    const shots=group.prints.map((print,index)=>{const ref=bmEvidenceRef(print.img),source=ref?"":`src="${esc(print.img)}"`;
      return `<a class="bm-evidence__shot${ref?" is-loading":""}" href="${ref?"#":esc(print.img)}" data-lightbox="${ref?"":esc(print.img)}" data-lightbox-group="bm-${esc(id)}" ${ref?`data-bm-ref="${esc(ref)}"`:""} aria-label="Ampliar ${esc(print.nome||`Print ${index+1}`)}"><img loading="lazy" decoding="async" ${source} alt="${esc(print.nome||`Print da BM ${index+1}`)}"><span>${esc(print.nome||`Print ${index+1}`)}</span></a>`;
    }).join("");
    return `<div class="bm-evidence__group"><div class="bm-evidence__group-head">${esc(group.label)} <small>· ${group.prints.length} ${group.prints.length===1?"print":"prints"}</small></div><div class="bm-evidence__carousel"><button class="bm-evidence__arrow" type="button" data-bm-evidence-step="-1" aria-label="Print anterior de ${esc(group.label)}">‹</button><div class="bm-evidence__rail" aria-label="Prints: ${esc(group.label)}">${shots}</div><button class="bm-evidence__arrow" type="button" data-bm-evidence-step="1" aria-label="Próximo print de ${esc(group.label)}">›</button></div></div>`;
  }).join("");
  return `<div class="bm-evidence"><div class="bm-evidence__heading"><h3>Prints da BM</h3><span>${prints.length} ${prints.length===1?"evidência":"evidências"}</span>${importButton}</div><p class="bm-evidence__note">Organizados pelo período indicado no arquivo. Toque em um print para ampliar e navegar com as setas.</p>${html}<p class="bm-evidence__status sr-only" aria-live="polite"></p></div>`;
}
function brandDraftCardSnapshot(d){
  const latest=bmReportGroups(d)[0];
  if(!latest){
    const legacy=[["Gasto",d.bmSpend7d],["ROAS",d.bmRoas],["CPA",d.bmCpa],["AOV",d.bmAvgConversion],["CPM",d.bmCpm],["CTR link",d.bmCtr],["CPC link",d.bmCpcLink||d.bmCpc]];
    if(!legacy.some(([,value])=>bmHasValue(value)))return"";
    return `<div class="brand-bm-state is-ready">${ic("trending")}Métricas da BM · ${esc(d.bmUpdatedAt||"data não informada")} · fonte legada</div><div class="brand-metrics brand-metrics--snapshot">${legacy.map(([label,value])=>`<div class="brand-metric"><span class="brand-metric__label">${esc(label)}</span><strong class="brand-metric__value">${esc(bmHasValue(value)?value:"—")}</strong></div>`).join("")}</div>`;
  }
  const report=latest.reports.find(item=>bmReportWindowKey(item)==="7d")||latest.reports[0];
  const metrics=BM_CARD_FIELDS.map(([label,key])=>{const metric=bmSummaryMetric(report,key);return `<div class="brand-metric" title="${esc(metric.source)}"><span class="brand-metric__label">${esc(label)}</span><strong class="brand-metric__value">${esc(metric.value)}</strong></div>`;}).join("");
  return `<div class="brand-bm-state is-ready">${ic("trending")}Última leitura da BM · ${esc(bmReportDateLabel(latest.date))} · ${esc(bmReportTabLabel(report))}</div><div class="brand-metrics brand-metrics--snapshot">${metrics}</div>`;
}
function brandAdsCardSnapshot(d){
  const hist=adsHistOf(d),ads=getAds(d),latest=hist.at(-1),count=ads??latest?.n;
  if(count==null)return `<div class="brand-ads-snapshot"><span class="brand-ads-snapshot__label">Anúncios ativos</span><span class="brand-ads-snapshot__meta">Aguardando primeira leitura da biblioteca</span></div>`;
  const approximate=d.adsLibraryApprox?"≈ ":"",chart=hist.length>=2?sparkSvg(hist):`<div class="brand-ads-snapshot__single" aria-hidden="true"></div>`;
  const reading=hist.length>=2?`${hist.length} leituras · última em ${fmtDateShort(latest.d)}`:hist.length===1?`1 leitura em ${fmtDateShort(latest.d)}`:d.adsLibraryCheckedAt?`Conferido em ${esc(d.adsLibraryCheckedAt)} · histórico em formação`:"Histórico em formação";
  return `<div class="brand-ads-snapshot" role="img" aria-label="${approximate?"Aproximadamente ":""}${fmtNum(count)} anúncios ativos. ${esc(reading)}"><div class="brand-ads-snapshot__head"><span class="brand-ads-snapshot__label">Anúncios ativos</span><strong class="brand-ads-snapshot__value">${approximate}${fmtNum(count)}</strong></div>${chart}<span class="brand-ads-snapshot__meta">${reading}</span></div>`;
}
function brandCard(o){
  const d=normalize(isAdmin?brandHubAdminData(o):o.data),validated=sectionOf(o)==="brandsvalidated",clean=validated;
  if(clean){d.nicho=insiderCategoryOf(o);d.nomeOferta=insiderProductName(o);}
  const bmPrints=d.bmPrints.filter(x=>x&&x.img),topAds=d.brandTopAds.filter(x=>x&&(x.img||x.link)),archivedAds=d.brandArchivedAds.filter(x=>x&&Array.isArray(x.media)&&x.media.some(media=>media.url));
  const ads=getAds(d),adsPrefix=d.adsLibraryApprox?"≈ ":"";
  const chips=[d.nicho?`<span class="chip niche">${esc(d.nicho)}</span>`:"",!clean&&ads!=null?`<span class="chip accent">${adsPrefix}${ads.toLocaleString("pt-BR")} ads ativos</span>`:"",!clean&&validated&&bmPrints.length?`<span class="chip">${bmPrints.length} print${bmPrints.length===1?"":"s"} da BM</span>`:"",!clean&&validated&&topAds.length?`<span class="chip accent">${topAds.length} top ad${topAds.length===1?"":"s"}</span>`:"",validated&&archivedAds.length?`<span class="chip accent">${archivedAds.length} anúncio${archivedAds.length===1?"":"s"} arquivado${archivedAds.length===1?"":"s"}</span>`:""].filter(Boolean).join("");
  const firstDomain=(d.dominios.find(x=>x.linkDominio)||{}).linkDominio||"",firstLibrary=(d.bibliotecas.find(x=>x.link)||{}).link||"",firstAd=validated?((topAds.find(x=>x.link)||{}).link||""):((d.criativos.find(x=>x.link)||{}).link||""),fallbackVideo=(topAds.find(x=>x.video)||{}).video||"";
  return card({
    id:o.id,variant:clean?"brand-card brand-card--clean":"brand-card",
    top:(isAdmin||BRAND_TAGS_PUBLISHED)?`<div class="offer-tags">${offerTagsHtml(d)}${isAdmin?`<button class="offer-tag__edit" type="button" data-edit-tags="${esc(o.id)}" aria-label="Editar tags de ${esc(d.nomeOferta||"oferta")}">${ic("edit")}Editar tags</button>`:""}</div>`:"",
    head:`<span class="tbadge tbadge--brands"><span class="tdot"></span>FEG Brands</span><span class="ktag">${ic(validated?"trending":"search")}${validated?"Brands":"Spy"}</span>`,
    media:clean&&d.imagemProduto?`<div class="cmedia"><img loading="lazy" decoding="async" width="640" height="400" src="${esc(d.imagemProduto)}"${KNOWN_BRAND_COVERS[mediaNameKey(d.nomeOferta)]?` data-local-cover="${esc(KNOWN_BRAND_COVERS[mediaNameKey(d.nomeOferta)])}"`:""} alt="Imagem de ${esc(d.nomeOferta||"Produto DTC")}"></div>`:clean?mediaThumb("",d.nomeOferta||"Produto DTC",!!fallbackVideo,fallbackVideo):mediaThumb(d.imagemProduto,d.nomeOferta||"Produto DTC"),
    body:`<div class="card__body">${cardIdentity(d.nomeMarca||"Marca não informada",d.nomeOferta||"Produto sem nome")}</div>`,
    chips:chips?`<div class="card__chips">${chips}</div>`:"",
    extra:validated?(brandDraftCardSnapshot(d)||brandAdsCardSnapshot(d)):brandAdsCardSnapshot(d),
    actions:[qbtn("Biblioteca",firstLibrary,"library"),qbtn("Oferta",firstDomain,"globe"),qbtn(validated?"Top ad":"Anúncio",firstAd,"play")].filter(Boolean).join("")
  });
}
function cardFor(o){
  switch(sectionOf(o)){
    case "brandsgeneral":case "brandsvalidated":return brandCard(o);
    case "brandcreative":return brandCreativeCard(o);
    case "presell":return presellCard(o);
    case "criativo":return criativoCard(o);
    case "organic":return criativoCard(o);
    case "megabrain":case "megabrainfegsys":return megabrainCard(o);
    case "noticia":return noticiaCard(o);
    case "tiktok":return tiktokCard(o);
    default:return cardHtml(o);
  }
}
const GRID_PAGE_OPTIONS=[20,50,100];
let gridPage=1,gridPageSize=20,gridPageKey="",gridSearchTimer=0;
try{const saved=+localStorage.getItem("feg_grid_page_size");if(GRID_PAGE_OPTIONS.includes(saved))gridPageSize=saved;}catch(e){}
function currentGridKey(){return [activeSection,activeNiche,activeBrand,searchTerm,critPlatform,tiktokSort,tiktokSubniche,newsSubniche,brainSort,brainAuthor,offerSort,offerDirection,offerTagFilter,brainPeriod,brainDateFrom,brainDateTo,fegsysSalesMin,fegsysSalesMax,fegsysLoadedKey,gridPageSize].join("\u0001");}
function pagedItems(items){
  const size=gridPageSize,key=currentGridKey();
  if(key!==gridPageKey){gridPageKey=key;gridPage=1;}
  const pages=Math.max(1,Math.ceil(items.length/size));gridPage=Math.min(Math.max(1,gridPage),pages);
  const from=(gridPage-1)*size;
  return {items:items.slice(from,from+size),size,pages,page:gridPage,from,total:items.length};
}
function gridPager(page){
  if(!page||!page.total)return"";
  const start=page.from+1,end=Math.min(page.total,page.from+page.size);
  const options=GRID_PAGE_OPTIONS.map(size=>`<option value="${size}"${size===page.size?" selected":""}>${size}</option>`).join("");
  return `<nav class="gridpager" aria-label="Paginação dos resultados"><label class="gridpager__size">Itens por página <select data-grid-size aria-label="Itens por página">${options}</select></label><button class="btn btn--outline btn--sm" data-grid-page="${page.page-1}"${page.page<=1?" disabled":""}>${ic("back")}Anterior</button><span class="gridpager__meta">${start}–${end} de ${page.total} · página ${page.page} de ${page.pages}</span><button class="btn btn--outline btn--sm" data-grid-page="${page.page+1}"${page.page>=page.pages?" disabled":""}>Próxima →</button></nav>`;
}
function wireGridPager(area){
  $$('[data-grid-page]',area).forEach(button=>button.addEventListener("click",()=>{const next=+button.dataset.gridPage||1;if(next===gridPage)return;gridPage=next;renderGrid(true);const top=Math.max(0,(area.getBoundingClientRect().top+window.scrollY)-110);window.scrollTo({top,behavior:"auto"});}));
  $$('[data-grid-size]',area).forEach(select=>select.addEventListener("change",()=>{const next=+select.value;if(!GRID_PAGE_OPTIONS.includes(next)||next===gridPageSize)return;gridPageSize=next;gridPage=1;try{localStorage.setItem("feg_grid_page_size",String(next));}catch(e){}renderGrid(true);}));
}
function updateKindLabel(kind){return {oferta:"Swipe de ofertas",brandsgeneral:"Ofertas de Brands",brandsvalidated:"Ofertas Brands",presell:"Presell",criativo:"Swipe de criativos"}[kind]||"Materiais";}
function updateItemPath(item){
  const target=offers.find(offer=>String(offer.id)===String(item.entity_id));
  if(target)return offerPath(target);
  const section=String(item.entity_kind||"oferta");
  return listPath(SEC2PATH[section]?section:"oferta","");
}
function renderUpdates(){
  const area=$("#gridArea");if(!area)return;
  const term=searchTerm.trim().toLowerCase();
  const visible=updates.filter(item=>!term||[item.entity_name,item.niche,updateKindLabel(item.entity_kind)].some(value=>String(value||"").toLowerCase().includes(term)));
  $("#statTotal").textContent=updatesTotal;
  const pageResult=$("#pageResult");if(pageResult)pageResult.textContent=`${visible.length.toLocaleString("pt-BR")} ${visible.length===1?"registro":"registros"}`;
  const shownWrap=$("#statShownWrap");if(shownWrap)shownWrap.style.display="none";
  if(!visible.length){area.innerHTML=`<div class="empty"><h2>${term?"Nada encontrado":"Nenhuma atualização registrada"}</h2><p>${term?"Nenhum material corresponde à busca.":"As novas ofertas, presells e peças criativas aparecerão aqui automaticamente."}</p></div>`;return;}
  const groups=new Map();
  visible.forEach(item=>{const date=new Date(item.created_at),key=Number.isFinite(date.getTime())?date.toLocaleDateString("pt-BR",{timeZone:"America/Sao_Paulo"}):"Sem data";if(!groups.has(key))groups.set(key,[]);groups.get(key).push(item);});
  const grouped=[...groups.entries()];
  area.innerHTML=`<div class="updates-feed">${grouped.map(([date,items],index)=>`<section class="updates-day"><header class="updates-day__head"><span class="updates-day__index">${String(grouped.length-index).padStart(2,"0")}</span><div><h2>Atualização [${esc(date)}]</h2><p>${items.length} ${items.length===1?"material adicionado":"materiais adicionados"}</p></div></header><div class="updates-day__items">${items.map(item=>`<a class="update-row" data-nav href="${esc(updateItemPath(item))}"><span class="update-row__icon">${ic(item.entity_kind==="criativo"?"play":item.entity_kind==="presell"?"newspaper":"layers")}</span><span class="update-row__copy"><strong>${esc(item.entity_name||"Material sem título")}</strong><span>${esc(updateKindLabel(item.entity_kind))}${item.niche?` · ${esc(item.niche)}`:""}</span></span><span class="update-row__open">Abrir card ${ic("external")}</span></a>`).join("")}</div></section>`).join("")}</div>`;
}
function renderAdminBrandHub(items){
  const page=pagedItems([...items].sort(recentFirstFn)),groups=new Map();
  page.items.forEach(o=>{
    const niche=brandHubNicheOf(o)||"Sem nicho",brand=brandNameOf(o),key=brandKeyOf(o);
    if(!groups.has(niche))groups.set(niche,new Map());
    const brands=groups.get(niche);
    if(!brands.has(key))brands.set(key,{name:brand,items:[]});
    brands.get(key).items.push(o);
  });
  const niches=[...catalogNiches().filter(n=>groups.has(n)),...groups.keys()].filter((n,i,a)=>a.indexOf(n)===i);
  const nicheCounts=new Map();items.forEach(o=>{const key=brandHubNicheOf(o)||"Sem nicho";nicheCounts.set(key,(nicheCounts.get(key)||0)+1);});
  let html='<div class="brandhub brandhub--creative">';
  for(const niche of niches){
    const brands=[...groups.get(niche).entries()].sort((a,b)=>{
      const latest=group=>Math.max(...group.items.map(item=>Date.parse(item.created_at||"")||0));
      return latest(b[1])-latest(a[1])||a[1].name.localeCompare(b[1].name,"pt-BR");
    });
    html+='<section class="brandhub-niche"><header class="brandhub-niche__head"><h2>'+esc(niche)+'</h2><span class="brandhub-niche__count">'+(nicheCounts.get(niche)||0)+' materiais</span></header>';
    html+='<div class="brandhub-products">';
    for(const [key,group] of brands){
      const brandCreatives=group.items.sort(recentFirstFn);
      const href=listPath("brandcreative",niche==="Sem nicho"||niche===BRAND_NICHE_REVIEW?NO_NICHE:niche)+"?marca="+encodeURIComponent(key);
      html+='<section class="brandhub-brand"><header class="brandhub-brand__head"><h3><a data-nav href="'+esc(href)+'">'+esc(group.name)+'</a></h3><span class="brandhub-brand__count">'+brandCreatives.length+' '+(brandCreatives.length===1?'criativo':'criativos')+'</span></header><div class="grid">'+brandCreatives.map(cardFor).join("")+'</div>';
      html+='</section>';
    }
    html+='</div>';
    html+='</section>';
  }
  html+='</div>'+gridPager(page);
  return html;
}
function renderAdminInsider(items){
  const sorted=[...items].sort(offerSortFn),page=pagedItems(sorted),groups=new Map();
  page.items.forEach(o=>{const niche=insiderCategoryOf(o),product=insiderProductName(o),key=insiderProductKey(o);if(!groups.has(niche))groups.set(niche,new Map());const products=groups.get(niche);if(!products.has(key))products.set(key,{name:product,items:[]});products.get(key).items.push(o);});
  const sections=activeNiche?[activeNiche]:BRAND_CATEGORIES;
  let html='<div class="brandhub brandhub--insider">';
  for(const niche of sections){
    const products=groups.get(niche)||new Map(),count=items.filter(o=>sameNiche(insiderCategoryOf(o),niche)).length;
    if(activeBrand&&!products.size)continue;
    html+='<section class="brandhub-niche"><header class="brandhub-niche__head"><h2><a data-nav href="'+esc(listPath("brandsvalidated",niche))+'">'+esc(niche)+'</a></h2><span class="brandhub-niche__count">'+count+' '+(count===1?'produto':'produtos')+'</span></header>';
    if(!products.size)html+='<p class="brandhub-empty">Nenhum produto cadastrado nesta categoria.</p>';
    html+='<div class="brandhub-products">';
    for(const [key,group] of products.entries()){
      const href=listPath("brandsvalidated",niche)+"?marca="+encodeURIComponent(key);
      html+='<section class="brandhub-brand"><header class="brandhub-brand__head"><h3><a data-nav href="'+esc(href)+'">'+esc(group.name)+'</a></h3><span class="brandhub-brand__count">'+group.items.length+' '+(group.items.length===1?'card':'cards')+'</span></header><div class="grid">'+group.items.map(cardFor).join('')+'</div></section>';
    }
    html+='</div>';
    html+='</section>';
  }
  return html+'</div>'+gridPager(page);
}
function renderAdminGeneral(items){
  const page=pagedItems([...items].sort(offerSortFn)),groups=new Map();
  page.items.forEach(o=>{const niche=brandNicheCanonical(nicheOf(o)),key=brandKeyOf(o);if(!groups.has(niche))groups.set(niche,new Map());const products=groups.get(niche);if(!products.has(key))products.set(key,{name:brandNameOf(o),items:[]});products.get(key).items.push(o);});
  const sections=activeNiche?[activeNiche===NO_NICHE?BRAND_NICHE_REVIEW:activeNiche]:[...catalogNiches().filter(n=>groups.has(n)),...groups.keys()].filter((n,i,a)=>a.indexOf(n)===i);
  let html='<div class="brandhub brandhub--general">';
  for(const niche of sections){const products=groups.get(niche)||new Map(),count=items.filter(o=>sameNiche(brandNicheCanonical(nicheOf(o)),niche)).length;if(!products.size)continue;
    html+='<section class="brandhub-niche"><header class="brandhub-niche__head"><h2>'+esc(niche)+'</h2><span class="brandhub-niche__count">'+count+' '+(count===1?'oferta':'ofertas')+'</span></header>';
    html+='<div class="brandhub-products">';
    for(const [key,group] of [...products.entries()].sort((a,b)=>a[1].name.localeCompare(b[1].name,'pt-BR'))){const href=listPath('brandsgeneral',niche===BRAND_NICHE_REVIEW?NO_NICHE:niche)+'?marca='+encodeURIComponent(key);html+='<section class="brandhub-brand"><header class="brandhub-brand__head"><h3><a data-nav href="'+esc(href)+'">'+esc(group.name)+'</a></h3><span class="brandhub-brand__count">'+group.items.length+' '+(group.items.length===1?'card':'cards')+'</span></header><div class="grid">'+group.items.map(cardFor).join('')+'</div></section>';}
    html+='</div>';
    html+='</section>';
  }
  return html+'</div>'+gridPager(page);
}
function renderGrid(skipNav){
  if(!skipNav)renderSideNav();
  renderSubFilter();
  setSectionHeader();
  if(activeSection==="transcritor"){renderTranscritor();return;}
  if(activeSection==="vsldissector"){renderVslDissector();return;}
  if(activeSection==="updates"){renderUpdates();return;}
  const cfg=sectionCfg(activeSection);
  const manualSecCount=activeSection==="brandcreative"?brandHubItems().length:activeSection==="noticia"?newsItems().length:offers.filter(o=>sectionOf(o)===activeSection).length;
  const list=filtered();
  const secCount=activeSection==="megabrainfegsys"?fegsysCards.length:manualSecCount;
  $("#statTotal").textContent=secCount;
  const pageResult=$("#pageResult");if(pageResult)pageResult.textContent=`${list.length.toLocaleString("pt-BR")} ${list.length===1?"resultado":"resultados"}`;
  const filtering=!!(activeNiche||activeBrand||searchTerm||(activeSection==="tiktok"&&(tiktokSubniche||tiktokAuthor))||(activeSection==="noticia"&&newsSubniche)||((activeSection==="criativo"||activeSection==="brandcreative")&&critPlatform!=="all")||(activeSection==="megabrain"&&brainAuthor)||(activeSection==="megabrainfegsys"&&(fegsysSalesMin!==""||fegsysSalesMax!=="")));
  const shownWrap=$("#statShownWrap");
  if(shownWrap){shownWrap.style.display=filtering?"":"none";const sn=$("#statShown");if(sn)sn.textContent=list.length;}
  const area=$("#gridArea");
  if(secCount===0){
    const help=activeSection==="tiktok"?"O Radar foi reiniciado. Novos vídeos orgânicos aparecerão após a próxima mineração por nicho.":activeSection==="megabrainfegsys"?(fegsysLoading?"A primeira sincronização está em andamento.":fegsysError?"Use Atualizar agora depois de corrigir o acesso indicado acima.":"Use Atualizar agora para buscar os dados do período selecionado."):(isAdmin?`Clique em <b style="color:var(--accent)">${esc(cfg.newLabel)}</b> para começar.`:"Somente leitura — aguarde o admin adicionar itens.");
    area.innerHTML=`<div class="empty"><h2>${esc(cfg.emptyTitle)}</h2><p>${help}</p></div>`;return;
  }
  if(list.length===0){
    area.innerHTML=`<div class="empty"><h2>Nada encontrado</h2><p>Nenhum item corresponde a este filtro.</p><button class="btn btn--outline" id="clearFilters" style="margin-top:18px">Limpar filtros</button></div>`;
    const cf=$("#clearFilters");if(cf)cf.addEventListener("click",()=>{const si=$("#searchInput");if(si)si.value="";critPlatform="all";brainAuthor="";fegsysSalesMin="";fegsysSalesMax="";searchTerm="";navigate(listPath(activeSection,""));});
    return;
  }
  if(activeSection==="tiktok"){
    const sorted=[...list].sort(ttSortFn);
    const TIERS=[["viral","★ VIRAL — 1M+ views"],["high","🔥 HIGH — 100k–1M views"],["mid","📊 MID — 10k–100k views"],["low","🌱 LOW — <10k views"]];
    const tierMap=new Map(TIERS.map(([key])=>[key,[]]));sorted.forEach(o=>{const key=(o.data||{}).faixa||faixaOf((o.data||{}).views);if(tierMap.has(key))tierMap.get(key).push(o);});
    const tiered=TIERS.flatMap(([key])=>tierMap.get(key)),page=pagedItems(tiered),totals=new Map(TIERS.map(([key])=>[key,tierMap.get(key).length]));
    let gh="";
    TIERS.forEach(([key,lbl])=>{
      const arr=page.items.filter(o=>((o.data||{}).faixa||faixaOf((o.data||{}).views))===key);
      if(!arr.length)return;
      gh+=`<div class="ttgroup ttgroup--${key}"><div class="ttgroup__head"><span class="ttgroup__lbl">${esc(lbl)}</span><span class="ttgroup__cnt">${totals.get(key)}</span></div><div class="grid grid--tt">${arr.map(cardFor).join("")}</div></div>`;
    });
    area.innerHTML=gh?gh+gridPager(page):`<div class="empty"><h2>Nenhum vídeo neste filtro</h2></div>`;
  }else if(activeSection==="brandcreative"){
    area.innerHTML=renderAdminBrandHub(list);
  }else if(isInsiderAdminArea()){
    area.innerHTML=renderAdminInsider(list);
  }else if(activeSection==="brandsgeneral"){
    area.innerHTML=renderAdminGeneral(list);
  }else if(activeSection==="noticia"&&!activeNiche){
    const page=pagedItems(list),groups=new Map(),totals=new Map();
    list.forEach(o=>{const n=newsNicheOf(o);totals.set(n,(totals.get(n)||0)+1);});
    page.items.forEach(o=>{const n=newsNicheOf(o);if(!groups.has(n))groups.set(n,[]);groups.get(n).push(o);});
    const order=RADAR_NICHES.filter(n=>groups.has(n));
    let gh="";
    order.forEach(n=>{const arr=groups.get(n);gh+=`<div class="newsgroup"><div class="newsgroup__head">${ic("layers")}<span>${esc(n)}</span><span class="newsgroup__cnt">${totals.get(n)||arr.length}</span><span class="newsgroup__line"></span></div><div class="grid">${arr.map(cardFor).join("")}</div></div>`;});
    if(isAdmin)gh+=`<div style="margin-top:6px"><button class="btn btn--outline btn--sm" id="addCard">${ic("plus")}${esc(cfg.newLabel)}</button></div>`;
    area.innerHTML=gh+gridPager(page);
  }else{
    const items=(activeSection==="megabrain"||activeSection==="megabrainfegsys")?[...list].sort(brainSortFn):(activeSection==="oferta"||BRAND_OFFER_SECTIONS.has(activeSection))?[...list].sort(offerSortFn):RECENT_FIRST_SECTIONS.has(activeSection)?[...list].sort(recentFirstFn):list;
    const page=pagedItems(items),visible=page.items;
    let html=visible.map(cardFor).join("");
    if(isAdmin&&cfg.newLabel)html+=`<div class="card card--new" id="addCard"><div class="plus">${ic("plus")}</div><div class="t">${esc(cfg.newLabel)}</div></div>`;
    area.innerHTML=`<div class="grid">${html}</div>${gridPager(page)}`;
  }
  /* card = link real (stretched link): clique simples abre o detalhe (modal por URL),
     Ctrl/⌘/meio-clique abre a página do item em nova aba nativamente. */
  $$(".card[data-id]",area).forEach(c=>{
    c.removeAttribute("role");c.removeAttribute("tabindex");
    const o=itemById(c.dataset.id);
    if(o&&!c.querySelector(".card__navlink")){
      const a=document.createElement("a");
      a.className="card__navlink";a.setAttribute("data-nav","");a.href=offerPath(o);
      a.setAttribute("aria-label","Abrir "+esc((o.data||{}).nomeOferta||(o.data||{}).nome||"item"));
      c.appendChild(a);
    }
  });
  $$('[data-edit-tags]',area).forEach(button=>button.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();openTagEditor(button.dataset.editTags);}));
  $$(".qbtn",area).forEach(b=>b.addEventListener("click",async e=>{e.stopPropagation();
    if(b.dataset.copyTranscript!=null){const o=itemById(b.dataset.copyTranscript),text=String(((o||{}).data||{}).transcricao||"").trim();if(!text)return;try{b.disabled=true;await navigator.clipboard.writeText(text);const old=b.innerHTML,oldLabel=b.getAttribute("aria-label")||"";b.innerHTML=ic("clipboard")+"Copiado";b.setAttribute("aria-label","Transcrição copiada");toast("Transcrição copiada");setTimeout(()=>{if(b.isConnected){b.innerHTML=old;b.disabled=false;b.setAttribute("aria-label",oldLabel);}},1600);}catch(_){b.disabled=false;toast("Não foi possível copiar a transcrição.",true);}return;}
    if(b.dataset.transcribeCard!=null){const o=itemById(b.dataset.transcribeCard),video=o&&videoOfCrv(o.data||{});if(o&&video)requestInstantTranscription(o.id,video);return;}
    if(b.dataset.copy!=null){openCopyPop(b.dataset.copy);return;}if(b.dataset.href)window.open(b.dataset.href,"_blank","noopener");}));
  wireLightboxLinks(area);
  wireCardPreviews(area);
  wireGridPager(area);
  const add=$("#addCard");
  if(add){
    add.addEventListener("click",openNewForActiveSection);
    if(add.classList.contains("card--new")){
      add.tabIndex=0;add.setAttribute("role","button");add.setAttribute("aria-label",sectionCfg(activeSection).newLabel);
      add.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();openNewForActiveSection();}});
    }
  }
}
$("#searchInput").addEventListener("input",e=>{searchTerm=e.target.value;try{history.replaceState(null,"",currentPath());}catch(_){}clearTimeout(gridSearchTimer);gridSearchTimer=setTimeout(()=>renderGrid(true),140);});
$("#newBtn").addEventListener("click",openNewForActiveSection);
function openNewForActiveSection(){if(!requireAdmin()||ADMIN_SECTIONS.has(activeSection))return;if(activeSection==="oferta"||BRAND_OFFER_SECTIONS.has(activeSection))openForm(null);else openSimpleForm(activeSection,null);}
$("#nicheToggle").addEventListener("click",()=>{const n=$("#sideNav");if(n&&n.classList.contains("open"))closeSideNav();else openSideNav();});
$("#sideNavBackdrop").addEventListener("click",closeSideNav);

/* ===== VIEW ===== */
function linkbtn(label,url,accent,icon){if(!url)return"";return `<a class="linkbtn${accent?' accent':''}" href="${esc(fixUrl(url))}" target="_blank" rel="noopener">${icon?ic(icon):""}<span class="lbtxt">${esc(label)}</span><span class="arr">${ic("external")}</span></a>`;}
function mergeAdminOfferDraftData(base,patch){
  const merged=Object.assign({},base||{},patch||{});
  if(patch&&patch.bmNotesReplace===true)merged.bmNotes=String(patch.bmNotes||"");
  else if(patch&&patch.bmNotes)merged.bmNotes=[base&&base.bmNotes,patch.bmNotes].filter(Boolean).join("\n\n");
  for(const key of ["bmReports","brandTopAds","bmPrints","bibliotecas","dominios"]){
    const removed=new Set(key==="bmReports"&&Array.isArray(patch?.bmReportsRemoveKeys)?patch.bmReportsRemoveKeys:[]);
    const before=(Array.isArray(base&&base[key])?base[key]:[]).filter(item=>key!=="bmReports"||!removed.has(String(item&&item.key||""))),after=Array.isArray(patch&&patch[key])?patch[key]:[];
    if(key==="bmPrints"&&Array.isArray(patch&&patch[key])&&!after.length){merged[key]=[];continue;}
    if(!after.length)continue;
    if(patch&&patch[`${key}Replace`]===true){merged[key]=after;continue;}
    const identity=item=>key==="bmReports"?String(item&&item.key||""):key==="bibliotecas"?String(item&&item.link||""):key==="dominios"?String(item&&(item.linkDominio||item.nome)||""):key==="brandTopAds"?String(item&&item.link||item&&item.nome||""):String(item&&item.img||item&&item.nome||"");
    const updatedFirst=key==="bmReports"||key==="brandTopAds",updatedIds=new Set(after.map(identity).filter(Boolean));
    const sequence=updatedFirst?[...after,...before.filter(item=>!updatedIds.has(identity(item)))]:[...before,...after];
    const map=new Map();for(const item of sequence){const id=identity(item);map.set(id||`${key}-${map.size}`,item);}
    merged[key]=[...map.values()];
  }
  return merged;
}
function shotView(label,img,thumb){
  if(!img)return`<div class="shot"><div class="shot__lbl">${label}</div><div class="none">Sem print</div></div>`;
  return`<a class="shot" href="${esc(img)}" data-lightbox="${esc(img)}"><div class="shot__lbl">${label}<span class="zoom">${ic("maximize")}ampliar</span></div><span class="shot__media"><img loading="lazy" decoding="async" width="640" height="400" src="${esc(thumb||img)}" alt="${esc(label)}"></span></a>`;
}
function topAdDisplayName(ad,index){
  const raw=String(ad&&((ad.period||ad.sourceDate||ad.downloadedAt||ad.startDate))||"").trim();
  const parts=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw),iso=/^(\d{4})-(\d{2})/.exec(raw);
  const year=parts?+parts[3]:iso?+iso[1]:null,month=parts?+parts[2]:iso?+iso[2]:null;
  const monthText=year&&month>=1&&month<=12?new Intl.DateTimeFormat("pt-BR",{month:"long",timeZone:"UTC"}).format(new Date(Date.UTC(year,month-1,1))):"",monthLabel=monthText?monthText.charAt(0).toLocaleUpperCase("pt-BR")+monthText.slice(1)+" "+year:"Período não informado";
  const range=String(ad&&((ad.bmRange||ad.analysisRange||ad.dataRange))||"").trim();
  const observed=String(ad&&((ad.sourceDate||ad.downloadedAt))||"").trim();
  return `Anúncio ${index+1} — ${monthLabel}${range?" — "+range:observed?" — registrado em "+observed:" — datas a confirmar"}`;
}
function openView(id,useAdminDraft=true){
  const o=itemById(id);if(!o)return;
  const section=itemSection(o),isBrand=BRAND_OFFER_SECTIONS.has(section);
  if(section!=="oferta"&&!isBrand){openSimpleView(o);return;}
  const adminDraft=o.adminPrivate?null:adminOfferPatch(id),showingDraft=!!(o.adminPrivate||useAdminDraft&&adminDraft);
  const d=normalize(o.adminPrivate?o.data:showingDraft?mergeAdminOfferDraftData(o.data,adminDraft):o.data);
  if(section==="brandsvalidated"){d.brandCategory=insiderCategoryOf({data:d,adminPrivate:true});d.nomeOferta=insiderProductName(o);}
  const native=d.tipoTrafego==="native";
  const ads=getAds(d);const high=!native&&ads!=null&&ads>=HIGH_VOLUME;
  const domLinks=d.dominios.filter(x=>x.linkDominio);const coLinks=d.dominios.filter(x=>x.linkCheckout);
  const multi=domLinks.length>1||coLinks.length>1;
  $("#viewTag").textContent=(isBrand?`FEG Brands · ${section==="brandsvalidated"?"Ofertas Brands":"Spy"}`:((d.nomeMarca?d.nomeMarca+" · ":"")+(native?"Native · Taboola":"Oferta")))+(showingDraft?" · RASCUNHO ADMIN":"");
  const draftToggle=$("#viewDraftToggleBtn");if(draftToggle){draftToggle.hidden=!adminDraft||!!o.adminPrivate;draftToggle.textContent=showingDraft?"Ver dados publicados":"Ver prévia administrativa";draftToggle.onclick=()=>openView(id,!showingDraft);}
  $("#viewEditBtn").hidden=showingDraft&&!o.adminPrivate;
  $("#viewDeleteBtn").hidden=showingDraft||!!o.adminPrivate;
  $("#viewEditBtn").onclick=()=>{closeOverlay("#viewOverlay");openForm(id);};
  $("#viewDeleteBtn").onclick=()=>{if(confirm("Excluir esta oferta? Não dá para desfazer.")){deleteOffer(id);closeOverlay("#viewOverlay");}};

  const domsAll=d.dominios.filter(x=>x.linkDominio||x.linkCheckout||x.backRedirect||x.vslLink||x.vslVideo||x.nome||x.views);
  const domsHtml=domsAll.length?domsAll.map((dm,i)=>`
    <div class="dom">
      <div class="dom__top"><span class="dom__badge">${String(i+1).padStart(2,"0")}</span><span class="dom__name">${esc(dm.nome||"Domínio "+(i+1))}</span>${dm.views?`<span class="chip accent">${esc(dm.views)} views${dm.viewsPeriod?` · ${esc(dm.viewsPeriod)}`:""}</span>`:""}</div>
      <div class="linkbtns">${linkbtn("Abrir domínio",dm.linkDominio,true,"globe")}${linkbtn("Abrir checkout",dm.linkCheckout,false,"cart")}${linkbtn("Back redirect",dm.backRedirect,false,"back")}${linkbtn("Abrir VSL",dm.vslVideo||dm.vslLink,false,"play")}</div>
      ${offerVslDetailPreview(dm,d)}
    </div>`).join(""):`<div class="muted-empty">Nenhum domínio cadastrado.</div>`;

  let adsTitle,adsInner;
  if(native){
    adsTitle="Anúncios encontrados (Taboola)";
    const tabsAll=d.taboolaAds.filter(x=>x.img||x.nome);
    adsInner=tabsAll.length?`<div class="taboola-grid">${tabsAll.map((a,i)=>shotView(esc(a.nome||"Anúncio "+(i+1)),a.img)).join("")}</div>`:`<div class="muted-empty">Nenhum anúncio do Taboola cadastrado.</div>`;
  }else{
    adsTitle="Criativos";
    const crvsAll=d.criativos.filter(x=>x.link||x.transcricao||x.nome);
    adsInner=crvsAll.length?crvsAll.map((c,i)=>`
      <div class="crv"><div class="crv__name"><span class="si">Criativo ${String(i+1).padStart(2,"0")}</span>${esc(c.nome||"Sem título")}</div>
      <div class="linkbtns">${linkbtn("Ver criativo",c.link,true,"play")}${c.transcricao?linkbtn("Ver transcrição do ad",c.transcricao,false,"file"):""}</div></div>`).join(""):`<div class="muted-empty">Nenhum criativo cadastrado.</div>`;
  }

  const drive=(d.driveLinks||"").split(/\n+/).map(s=>s.trim()).filter(Boolean);

  let kvs=`${section==="brandsvalidated"?`<div class="kv"><div class="k">Categoria</div><div class="v" style="color:var(--accent)">${esc(d.brandCategory)}</div></div>`:d.nicho?`<div class="kv"><div class="k">Nicho</div><div class="v" style="color:var(--accent)">${esc(d.nicho)}</div></div>`:""}<div class="kv"><div class="k">Formato</div><div class="v">${esc(d.formato||"—")}</div></div>`;
  if(isBrand)kvs+=`<div class="kv"><div class="k">Status FEG Brands</div><div class="v" style="color:#8fd8ff">${section==="brandsvalidated"?"Oferta Brands":"Em monitoramento"}</div></div>`;
  if(native)kvs+=`<div class="kv"><div class="k">Origem</div><div class="v" style="color:#a78bff">Native · Taboola</div></div><div class="kv"><div class="k">Tráfego · últimos 28 dias</div><div class="v">${d.trafego28d?esc(d.trafego28d):"—"}</div></div>`;
  else kvs+=`<div class="kv"><div class="k">${isBrand?"Ads ativos na biblioteca":"Ads ativos"}</div><div class="v">${ads!=null?(d.adsLibraryApprox?"≈ ":"")+ads.toLocaleString("pt-BR"):"—"}</div></div>${isBrand?`<div class="kv"><div class="k">Biblioteca conferida em</div><div class="v">${esc(d.adsLibraryCheckedAt||"—")}</div></div>`:""}`;

  let headLinks="";
  if(!native){
    const bibs=d.bibliotecas.filter(x=>x.link);
    const bs=bibs.map((b,i)=>linkbtn(b.nome||"Biblioteca "+(i+1),b.link,true,"library")).join("");
    if(bs||d.advertorialLink)headLinks=`<div class="linkbtns" style="margin-top:18px">${bs}${linkbtn("Presell",d.advertorialLink,false,"newspaper")}</div>`;
  }else if(d.advertorialLink){
    headLinks=`<div class="linkbtns" style="margin-top:18px">${linkbtn("Presell",d.advertorialLink,false,"newspaper")}</div>`;
  }

  let sn=0;const num=()=>String(++sn).padStart(2,"0");

  let adsSection="";
  if(!native){
    if(isBrand){
      const library=(d.bibliotecas.find(x=>x.link)||{}).link||"";
      const ah=adsHistOf(d);
      const upd=o.adminPrivate
        ?`<div class="muted-empty" style="margin-top:10px;font-size:.85rem">Rascunho privado: o monitoramento automático começa após a publicação.</div>`
        :d.adsUpdatedAt
        ?`<div class="adsmeta" style="margin-top:12px"><span class="adsauto">${ic("zap")}atualização automática</span><span class="adsupd">${ic("clock")}última leitura: ${esc(relTime(d.adsUpdatedAt))}</span></div>`
        :`<div class="muted-empty" style="margin-top:10px;font-size:.85rem">O histórico começa na próxima leitura automática.</div>`;
      adsSection=`<section class="sec brand-ads-history"><div class="sec__head"><span class="sec__num">${num()}</span><span class="sec__title">Ads ativos · evolução diária</span><span class="sec__line"></span></div><div class="ta-grid"><div class="ta-metric"><div class="k">Total ativo</div><div class="v">${ads!=null?(d.adsLibraryApprox?"≈ ":"")+ads.toLocaleString("pt-BR"):"—"}</div></div><div class="ta-metric"><div class="k">Conferido em</div><div class="v">${esc(d.adsLibraryCheckedAt||"—")}</div></div></div><div style="margin-top:18px">${o.adminPrivate?'<div class="muted-empty">Sem leituras automáticas neste rascunho.</div>':adsChartSvg(ah)}</div>${upd}${library?`<div class="linkbtns" style="margin-top:14px">${linkbtn("Conferir na biblioteca",library,true,"library")}</div>`:""}</section>`;
    }else{
      const ah=adsHistOf(d);
      const upd=d.adsUpdatedAt
        ?`<div class="adsmeta" style="margin-top:12px"><span class="adsauto">${ic("zap")}atualização automática</span><span class="adsupd">${ic("clock")}última leitura: ${esc(relTime(d.adsUpdatedAt))}</span></div>`
        :`<div class="muted-empty" style="margin-top:10px;font-size:.85rem">Ainda não atualizado pelo robô — será preenchido na próxima rodada automática.</div>`;
      adsSection=`<section class="sec"><div class="sec__head"><span class="sec__num">${num()}</span><span class="sec__title">Anúncios ativos · histórico</span><span class="sec__line"></span></div>${adsChartSvg(ah)}${upd}</section>`;
    }
  }
  let bmSection="";
  if(section==="brandsvalidated"){
    const interactiveInsider=true, bmPrints=interactiveInsider?[]:d.bmPrints.filter(x=>x&&x.img),topAds=d.brandTopAds.filter(x=>x&&(x.img||x.link)),archivedAds=d.brandArchivedAds.filter(x=>x&&Array.isArray(x.media)&&x.media.some(media=>media.url));
    const reportsHtml=interactiveInsider?brandReportsHtml(d,id):brandReportsStaticHtml(d);
    const topAdName=(ad,index)=>interactiveInsider?topAdDisplayName(ad,index):(ad.nome||`Top ad ${index+1}`);
    const printsHtml=bmPrints.length?`<div class="dom__shots">${bmPrints.map((x,i)=>shotView(x.nome||`Print da BM ${i+1}`,x.img)).join("")}</div>`:`<div class="muted-empty">Nenhum print da BM anexado.</div>`;
    const topAdsHtml=topAds.length?`<div class="taboola-grid">${topAds.map((x,i)=>`<div class="dom"><div class="dom__top"><span class="dom__badge">${String(i+1).padStart(2,"0")}</span><span class="dom__name">${esc(topAdName(x,i))}</span></div>${x.video?`<div class="brand-ad-media"><video controls preload="none" playsinline src="${esc(x.video)}"></video></div>`:(x.img?shotView(topAdName(x,i),x.img):"")}<div class="brand-ad-meta"><span class="chip${x.video||x.img?" accent":""}">${x.video||x.img?"Mídia salva no Swipe":"Link do Facebook"}</span></div><div class="linkbtns" style="margin-top:12px">${x.link?linkbtn("Abrir anúncio",x.link,true,"play"):""}${x.video||x.img?linkbtn("Abrir mídia salva",x.video||x.img,false,"file"):""}</div></div>`).join("")}</div>`:`<div class="muted-empty">Nenhum top ad anexado.</div>`;
    const archivedHtml=archivedAds.length?`<div class="taboola-grid">${archivedAds.map((ad,i)=>`<div class="dom"><div class="dom__top"><span class="dom__badge">${String(i+1).padStart(2,"0")}</span><span class="dom__name">${esc(ad.title||`Anúncio ${ad.adArchiveId}`)}</span></div><div class="brand-ad-meta"><span class="chip accent">${ad.media.length} arquivo${ad.media.length===1?"":"s"} salvo${ad.media.length===1?"":"s"}</span><span class="chip">Meta ID ${esc(ad.adArchiveId)}</span></div>${ad.media.map((media,index)=>`<div style="margin-top:12px">${media.type==="video"?`<div class="brand-ad-media"><video controls preload="none" playsinline src="${esc(media.url)}"></video></div>`:shotView(`Arquivo ${index+1}`,media.url)}<div class="linkbtns" style="margin-top:8px">${linkbtn(`Baixar ${media.quality==="hd"||media.quality==="original"?"original":"cópia disponível"}`,media.url,false,"file")}</div></div>`).join("")}<div class="linkbtns" style="margin-top:12px">${linkbtn("Ver anúncio na Meta",ad.link,true,"play")}</div></div>`).join("")}</div>`:"";
    const bmCore=interactiveInsider
      ?`${reportsHtml}${bmEvidenceHtml(d,id)}${d.bmNotes?`<details class="bm-history-notes"><summary>Notas dos relatórios</summary><div class="resumo">${esc(d.bmNotes)}</div></details>`:""}`
      :`${brandMetricGrid(d,true)}${d.bmNotes?`<div class="resumo" style="margin-top:16px">${esc(d.bmNotes)}</div>`:""}<div class="sec__head" style="margin-top:26px"><span class="sec__title">Métricas por campanha e período</span><span class="sec__line"></span></div>${reportsHtml}<div class="sec__head" style="margin-top:26px"><span class="sec__title">Prints da BM</span><span class="sec__line"></span></div>${printsHtml}`;
    bmSection=`<section class="sec"><div class="sec__head"><span class="sec__num">${num()}</span><span class="sec__title">Resumo da Business Manager</span><span class="sec__line"></span></div>
      ${bmCore}
      <div class="sec__head" style="margin-top:26px"><span class="sec__title">Top ads</span><span class="sec__line"></span></div>${topAdsHtml}
      ${archivedAds.length?`<div class="sec__head" style="margin-top:26px"><span class="sec__title">Anúncios arquivados · ${archivedAds.length}</span><span class="sec__line"></span></div><p class="muted-empty">Arquivos salvos no Swipe; continuam disponíveis mesmo se o anúncio sair do ar.</p>${archivedHtml}`:""}
    </section>`;
  }

  $("#viewBody").innerHTML=`
  ${showingDraft?`<div class="banner banner--warn" style="margin:0 0 18px">${o.adminPrivate?"Oferta privada em revisão · visível somente no painel admin. Ainda não publicada.":"Histórico da BM em validação · visível somente no painel admin. Use “Ver dados publicados” para comparar com a versão atual."}</div>`:""}
  <div class="view-grid${drive.length?"":" view-grid--full"}">
    <div>
      <section class="sec">
        <div class="prod-head">
          ${d.imagemProduto?`<img class="img" loading="lazy" decoding="async" width="160" height="160" src="${esc(d.imagemProduto)}"${KNOWN_BRAND_COVERS[mediaNameKey(d.nomeOferta)]?` data-local-cover="${esc(KNOWN_BRAND_COVERS[mediaNameKey(d.nomeOferta)])}"`:""} alt="Imagem de ${esc(d.nomeOferta||d.produto||"produto")}">`:""}
          <div class="info">
            <div class="brand">${esc(d.nomeMarca||"Sem marca")}</div>
            <h2>${esc(d.nomeOferta||"Oferta sem nome")}</h2>
            <div class="kvs">${kvs}</div>
            ${high?`<div class="banner banner--warn" style="margin-top:18px">${ic("zap")}Oferta com alto volume de anúncios.</div>`:""}
            ${multi?`<div class="banner banner--danger" style="margin-top:12px">${ic("alert")}Este produto possui mais de uma oferta e checkout.</div>`:""}
            ${headLinks}
          </div>
        </div>
      </section>
      ${adsSection}
      ${bmSection}
      <section class="sec"><div class="sec__head"><span class="sec__num">${num()}</span><span class="sec__title">Domínios & Checkouts</span><span class="sec__line"></span></div>${domsHtml}</section>
      <section class="sec"><div class="sec__head"><span class="sec__num">${num()}</span><span class="sec__title">${adsTitle}</span><span class="sec__line"></span></div>${adsInner}</section>
      <section class="sec"><div class="sec__head"><span class="sec__num">${num()}</span><span class="sec__title">Funil de vendas</span><span class="sec__line"></span></div>
        <div style="font-size:1.1rem;line-height:1.5;white-space:pre-wrap">${esc(d.funil)||'<span class="muted-empty">Não descrito.</span>'}</div>
        ${d.advertorialLink?`<div class="linkbtns" style="margin-top:14px">${linkbtn("Abrir presell",d.advertorialLink,false,"newspaper")}</div>`:""}
      </section>
    </div>
    ${drive.length?`<aside class="sidebar"><div class="sidecard"><div class="sk">Drive / Docs</div><div class="linkbtns">${drive.map((l,i)=>linkbtn("Doc "+(i+1),l,false,"folder")).join("")}</div></div></aside>`:""}
  </div>`;
  const bmHistory=$("#bmHistory");
  if(bmHistory){
    const groups=bmReportGroups(d),all=groups.flatMap(group=>group.reports),periodTabs=$("#bmPeriodTabs"),reportPane=$("#bmReportPane"),status=$("#bmReportStatus");
    const selectReport=(report,scrollDate=false)=>{
      if(!report)return;
      const date=bmReportDateKey(report),group=groups.find(item=>item.date===date),groupIndex=groups.indexOf(group);if(!group)return;
      activeBmPeriodByOffer[id]=report.key;
      const dateButtons=[...bmHistory.querySelectorAll(".bm-date-card")];
      dateButtons.forEach(button=>button.setAttribute("aria-pressed",String(button.dataset.bmDate===date)));
      bmHistory.querySelector('[data-bm-date-step="-1"]').disabled=groupIndex===0;
      bmHistory.querySelector('[data-bm-date-step="1"]').disabled=groupIndex===groups.length-1;
      if(periodTabs.dataset.bmDate!==date){periodTabs.innerHTML=bmPeriodTabsHtml(group.reports,report.key);periodTabs.dataset.bmDate=date;}
      const tabs=[...periodTabs.querySelectorAll('[role="tab"]')];
      tabs.forEach(button=>{const selected=button.dataset.bmPeriodKey===report.key;button.setAttribute("aria-selected",String(selected));button.tabIndex=selected?0:-1;});
      reportPane.setAttribute("aria-labelledby",tabs[group.reports.indexOf(report)].id);
      reportPane.innerHTML=brandReportPane(report);
      status.textContent=`Leitura de ${bmReportDateLabel(date)}, ${bmReportTabLabel(report)} selecionado`;
      if(scrollDate)dateButtons[groupIndex].scrollIntoView({block:"nearest",inline:"nearest"});
    };
    bmHistory.addEventListener("click",event=>{
      const dateButton=event.target.closest(".bm-date-card");
      if(dateButton){
        const group=groups.find(item=>item.date===dateButton.dataset.bmDate),current=all.find(item=>item.key===activeBmPeriodByOffer[id]),sameWindow=bmReportWindowKey(current);
        selectReport(group&&group.reports.find(item=>bmReportWindowKey(item)===sameWindow)||group&&group.reports.find(item=>bmReportWindowKey(item)==="7d")||group&&group.reports[0],true);return;
      }
      const stepButton=event.target.closest("[data-bm-date-step]");
      if(stepButton){
        const current=all.find(item=>item.key===activeBmPeriodByOffer[id]),index=groups.findIndex(item=>item.date===bmReportDateKey(current)),target=groups[index+Number(stepButton.dataset.bmDateStep)];
        if(target){const sameWindow=bmReportWindowKey(current);selectReport(target.reports.find(item=>bmReportWindowKey(item)===sameWindow)||target.reports.find(item=>bmReportWindowKey(item)==="7d")||target.reports[0],true);}return;
      }
      const periodButton=event.target.closest("[data-bm-period-key]");
      if(periodButton)selectReport(all.find(item=>item.key===periodButton.dataset.bmPeriodKey));
    });
    bmHistory.addEventListener("keydown",event=>{
      if(!["ArrowLeft","ArrowRight","Home","End"].includes(event.key))return;
      const dateButton=event.target.closest(".bm-date-card"),periodButton=event.target.closest('[role="tab"]');
      const buttons=dateButton?[...bmHistory.querySelectorAll(".bm-date-card")]:periodButton?[...periodTabs.querySelectorAll('[role="tab"]')]:[];
      if(!buttons.length)return;
      event.preventDefault();const current=buttons.indexOf(dateButton||periodButton),next=event.key==="Home"?0:event.key==="End"?buttons.length-1:(current+(event.key==="ArrowRight"?1:buttons.length-1))%buttons.length;
      buttons[next].focus();buttons[next].click();
    });
  }
  const bmEvidence=$("#viewBody .bm-evidence");if(bmEvidence)bmEvidence.addEventListener("click",event=>{
    const importButton=event.target.closest("[data-bm-import]");if(importButton){importBmEvidence(importButton.dataset.bmImport,importButton);return;}
    const arrow=event.target.closest("[data-bm-evidence-step]");if(!arrow)return;
    const rail=arrow.parentElement.querySelector(".bm-evidence__rail"),shot=rail&&rail.querySelector(".bm-evidence__shot");if(!rail||!shot)return;
    rail.scrollBy({left:Number(arrow.dataset.bmEvidenceStep)*(shot.getBoundingClientRect().width+10),behavior:"smooth"});
  });
  wireLightboxLinks($("#viewBody"));
  wireAdsChart($("#viewBody"));
  if(bmEvidence)hydrateBmEvidence(bmEvidence);
  wireCardPreviews($("#viewBody"));
  openOverlay("#viewOverlay");
}
$("#viewClose").addEventListener("click",()=>closeView());

/* ===== FORM ===== */
function openForm(id){
  if(!requireAdmin())return;
  editingId=id;formDirty=false;saving=false;
  const d=id?normalize(offers.find(x=>x.id===id)?.data):normalize({});
  $("#formTag").textContent=id?"Editar oferta":"Nova oferta";
  setSaveState(id?"saved":"new");
  fProductImg=d.imagemProduto||"";
  fTipo="meta";
  fSemrushOriginal=d.printSemrushOriginal||d.printSemrush||"";
  fSemrushThumb=d.printSemrushThumb||fSemrushOriginal;
  fDominios=d.dominios.length?JSON.parse(JSON.stringify(d.dominios)):[{nome:"",linkDominio:"",linkCheckout:"",backRedirect:"",views:"",viewsPeriod:"",vslLink:"",vslVideo:""}];
  fCriativos=d.criativos.length?JSON.parse(JSON.stringify(d.criativos)):[{nome:"",link:"",transcricao:""}];
  fBibliotecas=d.bibliotecas.length?JSON.parse(JSON.stringify(d.bibliotecas)):[{nome:"",link:""}];
  fTaboola=[];
  const sourceSection=id?sectionOf(offers.find(x=>x.id===id)):activeSection,isBrand=BRAND_OFFER_SECTIONS.has(sourceSection);
  $("#formTag").textContent=isBrand?(id?"Editar oferta · FEG Brands":"Nova oferta · FEG Brands"):(id?"Editar oferta":"Nova oferta");
  fBrandStage=isBrand?"brandsvalidated":"oferta";
  fBmPrints=d.bmPrints.length?JSON.parse(JSON.stringify(d.bmPrints)):[{nome:"Business Manager",img:""}];
  fBrandTopAds=d.brandTopAds.length?JSON.parse(JSON.stringify(d.brandTopAds)):[{nome:"",link:"",img:""}];
  fBrandSemrush1m=d.brandSemrush1m||"";
  fBrandSemrush3m=d.brandSemrush3m||"";

  const brandForm=isBrand?`
    <div class="fsec">
      <div class="fsec__title"><span class="num">B</span> FEG Brands · classificação</div>
      <div class="fsec__hint">Todas as ofertas FEG Brands ficam nesta seção, inclusive as que ainda não têm métricas da BM.</div>
      <div class="field"><label class="lbl" for="f_brandCategory">Categoria principal</label><select id="f_brandCategory">${BRAND_CATEGORIES.map(category=>`<option value="${esc(category)}"${category===(id?insiderCategoryOf(offers.find(o=>o.id===id)):(/\b(pet|gato|cachorro)\b/i.test(d.nicho)?"PET":"SUPPLEMENTS"))?" selected":""}>${esc(category)}</option>`).join("")}</select></div>
      <div id="brandBmFields">
      <div class="row3">
        <div class="field"><label class="lbl">Gasto nos últimos 7 dias</label><input type="text" id="f_bmSpend7d" placeholder="Ex: R$ 48.200" value="${esc(d.bmSpend7d||"")}"></div>
        <div class="field"><label class="lbl">Gasto nos últimos 14 dias</label><input type="text" id="f_bmSpend14d" placeholder="Ex: R$ 91.600" value="${esc(d.bmSpend14d||"")}"></div>
        <div class="field"><label class="lbl">Gasto nos últimos 30 dias</label><input type="text" id="f_bmSpend30d" placeholder="Ex: R$ 184.300" value="${esc(d.bmSpend30d||"")}"></div>
      </div>
      <div class="row3">
        <div class="field"><label class="lbl">CPC</label><input type="text" id="f_bmCpc" placeholder="Ex: R$ 1,42" value="${esc(d.bmCpc||"")}"></div>
        <div class="field"><label class="lbl">CPM</label><input type="text" id="f_bmCpm" placeholder="Ex: R$ 37,80" value="${esc(d.bmCpm||"")}"></div>
        <div class="field"><label class="lbl">CTR</label><input type="text" id="f_bmCtr" placeholder="Ex: 2,66%" value="${esc(d.bmCtr||"")}"></div>
      </div>
      <div class="row3">
        <div class="field"><label class="lbl">CPA · 7 dias</label><input type="text" id="f_bmCpa" placeholder="Ex: US$ 45,20" value="${esc(d.bmCpa||"")}"></div>
        <div class="field"><label class="lbl">Valor médio de conversão</label><input type="text" id="f_bmAvgConversion" placeholder="Ex: US$ 79,12" value="${esc(d.bmAvgConversion||"")}"></div>
        <div class="field"><label class="lbl">CPC de link</label><input type="text" id="f_bmCpcLink" placeholder="Ex: US$ 1,74" value="${esc(d.bmCpcLink||"")}"></div>
        <div class="field"><label class="lbl">Custo por clique único</label><input type="text" id="f_bmCostUnique" placeholder="Ex: US$ 1,43" value="${esc(d.bmCostUnique||"")}"></div>
      </div>
      <div class="row3">
        <div class="field"><label class="lbl">Custo por IC</label><input type="text" id="f_bmCostIc" placeholder="Ex: R$ 18,40" value="${esc(d.bmCostIc||"")}"></div>
        <div class="field"><label class="lbl">ROAS</label><input type="text" id="f_bmRoas" placeholder="Ex: 2,84" value="${esc(d.bmRoas||"")}"></div>
        <div class="field"><label class="lbl">Data da atualização</label><input type="text" id="f_bmUpdatedAt" placeholder="Ex: 17/07/2026" value="${esc(d.bmUpdatedAt||"")}"></div>
      </div>
      <div class="field"><label class="lbl">Resumo / contexto da BM</label><textarea id="f_bmNotes" placeholder="Período analisado, observações de escala, mudanças recentes e contexto das métricas.">${esc(d.bmNotes||"")}</textarea></div>
      <label class="lbl">Prints da Business Manager</label><div id="bmPrintsWrap"></div><button type="button" class="add-block" data-action="add-bm-print">+ Adicionar print da BM</button>
      <div style="height:22px"></div>
      <label class="lbl">Top ads</label><div id="brandTopAdsWrap"></div><button type="button" class="add-block" data-action="add-brand-ad">+ Adicionar top ad</button>
      </div>
    </div>`:"";

  $("#formBody").innerHTML=`
    <div class="fsec">
      <div class="fsec__title"><span class="num">01</span> Tipo & Produto</div>
      <div class="field">
        <label class="lbl">Origem do tráfego</label>
        <div class="seg" id="tipoSeg">
          <span class="seg-btn active"><span class="sdot" style="background:var(--fb)"></span>Meta Ads (Facebook)</span>
        </div>
      </div>
      <div class="field big"><label class="lbl">Nome da oferta *</label><input type="text" id="f_nomeOferta" placeholder="Ex: Performance Masculina XYZ" value="${esc(d.nomeOferta)}"></div>
      <div class="row">
        <div class="field"><label class="lbl">Nome da marca</label><input type="text" id="f_nomeMarca" placeholder="Marca" value="${esc(d.nomeMarca)}"></div>
        <div class="field"><label class="lbl">${isBrand?"Nicho observado (opcional)":"Nicho"}</label><input list="nichos" id="f_nicho" placeholder="Emagrecimento, Disfunção Erétil, Memória..." value="${esc(d.nicho)}"><datalist id="nichos">${NICHOS.map(n=>`<option value="${esc(n)}">`).join("")}</datalist></div>
      </div>
      <div class="${isBrand?"row3":"row"}">
        <div class="field"><label class="lbl">Formato do produto</label><input type="text" id="f_formato" placeholder="cápsula, sachê, gummy, líquido..." value="${esc(d.formato)}"></div>
        <div class="field only-meta"><label class="lbl">${isBrand?"Ads ativos na biblioteca":"Nº de ads ativos"}</label><input type="number" id="f_numAdsAtivos" placeholder="Ex: 160" value="${esc(d.numAdsAtivos)}">${isBrand?`<div class="fsec__hint">Use o total exibido na biblioteca com o filtro Ativos.</div>`:""}</div>
        ${isBrand?`<div class="field only-meta"><label class="lbl">Biblioteca conferida em</label><input type="text" id="f_adsLibraryCheckedAt" placeholder="Ex: 17/07/2026" value="${esc(d.adsLibraryCheckedAt)}"></div>`:""}
      </div>
      <div class="only-meta">
        <label class="lbl">Bibliotecas de anúncios (Meta Ads Library)</label>
        <div id="bibWrap"></div>
        <button type="button" class="add-block" data-action="add-bib" style="margin-bottom:6px">+ Adicionar biblioteca</button>
      </div>
      <div class="field"><label class="lbl">Imagem do produto (cole, arraste ou clique)</label><div class="dz" data-zone="produto" tabindex="0"></div></div>
    </div>

    ${brandForm}

    <div class="fsec">
      <div class="fsec__title"><span class="num">02</span> Domínios, Checkouts & VSL</div>
      <div class="fsec__hint">Adicione quantas ofertas/domínios quiser. Em cada uma, vincule a VSL por um arquivo MP4 ou por um link do Google Drive.</div>
      <div id="domWrap"></div>
      <button type="button" class="add-block" data-action="add-dom">+ Adicionar oferta / domínio</button>
    </div>

    <div class="fsec only-meta">
      <div class="fsec__title"><span class="num">03</span> Criativos</div>
      <div class="fsec__hint">Link do criativo (Drive ou anúncio). Transcrição (.doc) opcional vira o botão "Ver transcrição do ad".</div>
      <div id="crvWrap"></div>
      <button type="button" class="add-block" data-action="add-crv">+ Adicionar criativo</button>
    </div>

    <div class="fsec">
      <div class="fsec__title"><span class="num">04</span> Funil de vendas</div>
      <div class="field"><label class="lbl">Caminho do usuário após o clique</label><textarea id="f_funil" placeholder="Ex: Anúncio → Advertorial → Página de Vendas → Checkout">${esc(d.funil)}</textarea></div>
      <div class="field"><label class="lbl">Link da presell / advertorial (se houver)</label><input type="url" id="f_advertorialLink" placeholder="https://... — página de pré-venda exibida antes da PV" value="${esc(d.advertorialLink)}"></div>
    </div>

    <div class="fsec">
      <div class="fsec__title"><span class="num">05</span> Materiais</div>
      <div class="field"><label class="lbl">Links de Drive / Docs (um por linha)</label><textarea id="f_driveLinks" placeholder="https://docs.google.com/...&#10;https://drive.google.com/...">${esc(d.driveLinks)}</textarea></div>
    </div>
  `;
  $("#formBody").dataset.tipo=fTipo;
  wireZones($("#formBody"));
  renderDominios();renderCriativos();renderBibliotecas();renderTaboola();if(isBrand){renderBmPrints();renderBrandTopAds();}
  openOverlay("#formOverlay");
  $("#f_nomeOferta").focus();
}

function renderDominios(){
  $("#domWrap").innerHTML=fDominios.map((dm,i)=>`
    <div class="block-edit">
      <div class="behead"><span class="t"><span class="badge">${i+1}</span> Domínio ${i+1}</span>${fDominios.length>1?`<button type="button" class="rm-block" data-action="rm-dom" data-i="${i}">✕ Remover</button>`:""}</div>
      <div class="field"><label class="lbl">Nome / identificação (opcional)</label><input type="text" data-dom="${i}" data-k="nome" placeholder="Ex: Domínio principal / Variação BR" value="${esc(dm.nome)}"></div>
      <div class="row">
        <div class="field" style="margin-bottom:0"><label class="lbl">Link do domínio / oferta</label><input type="url" data-dom="${i}" data-k="linkDominio" placeholder="https://..." value="${esc(dm.linkDominio)}"></div>
        <div class="field" style="margin-bottom:0"><label class="lbl">Link do checkout (vinculado)</label><input type="url" data-dom="${i}" data-k="linkCheckout" placeholder="https://..." value="${esc(dm.linkCheckout)}"></div>
      </div>
      <div class="row" style="margin-top:18px">
        <div class="field" style="margin-bottom:0"><label class="lbl">Views do domínio</label><input type="text" data-dom="${i}" data-k="views" placeholder="Ex: 31.5K" value="${esc(dm.views||"")}"></div>
        <div class="field" style="margin-bottom:0"><label class="lbl">Período das views</label><input type="text" data-dom="${i}" data-k="viewsPeriod" placeholder="Ex: 3 meses" value="${esc(dm.viewsPeriod||"")}"></div>
      </div>
      <div class="field" style="margin-top:18px;margin-bottom:0"><label class="lbl">Link de back redirect (se houver)</label><input type="url" data-dom="${i}" data-k="backRedirect" placeholder="https://... — página exibida ao tentar sair" value="${esc(dm.backRedirect)}"></div>
      <div class="field" style="margin-top:18px"><label class="lbl">Link da VSL (Google Drive ou URL do vídeo)</label><input type="url" data-dom="${i}" data-k="vslLink" placeholder="https://drive.google.com/..." value="${esc(dm.vslLink||"")}"><div class="fsec__hint">Use um link com permissão de visualização para qualquer pessoa que tenha o link.</div></div>
      <div class="field" style="margin-bottom:0"><label class="lbl">Ou envie o arquivo MP4 da VSL</label><div class="dz" data-zone="dom|${i}|vsl" tabindex="0" aria-label="Enviar arquivo MP4 da VSL"></div></div>
    </div>`).join("");
  wireZones($("#domWrap"));
}
function renderCriativos(){
  $("#crvWrap").innerHTML=fCriativos.map((c,i)=>`
    <div class="block-edit">
      <div class="behead"><span class="t"><span class="badge">${i+1}</span> Criativo ${i+1}</span>${fCriativos.length>1?`<button type="button" class="rm-block" data-action="rm-crv" data-i="${i}">✕ Remover</button>`:""}</div>
      <div class="field"><label class="lbl">Nome / identificação (opcional)</label><input type="text" data-crv="${i}" data-k="nome" placeholder="Ex: VSL feminino dor" value="${esc(c.nome)}"></div>
      <div class="row">
        <div class="field" style="margin-bottom:0"><label class="lbl">Link do criativo (Drive ou anúncio nativo)</label><input type="url" data-crv="${i}" data-k="link" placeholder="https://..." value="${esc(c.link)}"></div>
        <div class="field" style="margin-bottom:0"><label class="lbl">Link da transcrição (.doc) — opcional</label><input type="url" data-crv="${i}" data-k="transcricao" placeholder="https://docs.google.com/..." value="${esc(c.transcricao)}"></div>
      </div>
    </div>`).join("");
}
function renderBibliotecas(){
  $("#bibWrap").innerHTML=fBibliotecas.map((b,i)=>`
    <div class="block-edit">
      <div class="behead"><span class="t"><span class="badge">${i+1}</span> Biblioteca ${i+1}</span>${fBibliotecas.length>1?`<button type="button" class="rm-block" data-action="rm-bib" data-i="${i}">✕ Remover</button>`:""}</div>
      <div class="row">
        <div class="field" style="margin-bottom:0"><label class="lbl">Nome / identificação (opcional)</label><input type="text" data-bib="${i}" data-k="nome" placeholder="Ex: Marca / Conta secundária" value="${esc(b.nome)}"></div>
        <div class="field" style="margin-bottom:0"><label class="lbl">Link (Meta Ads Library)</label><input type="url" data-bib="${i}" data-k="link" placeholder="https://facebook.com/ads/library..." value="${esc(b.link)}"></div>
      </div>
    </div>`).join("");
}
function renderTaboola(){
  const wrap=$("#tabWrap");
  if(!wrap)return;
  wrap.innerHTML=fTaboola.map((a,i)=>`
    <div class="block-edit">
      <div class="behead"><span class="t"><span class="badge">${i+1}</span> Anúncio ${i+1}</span>${fTaboola.length>1?`<button type="button" class="rm-block" data-action="rm-tab" data-i="${i}">✕ Remover</button>`:""}</div>
      <div class="field"><label class="lbl">Nome / identificação (opcional)</label><input type="text" data-tab="${i}" data-k="nome" placeholder="Ex: Headline / variação encontrada" value="${esc(a.nome)}"></div>
      <div class="field" style="margin-bottom:0"><label class="lbl">Print do anúncio (cole, arraste ou clique)</label><div class="dz" data-zone="taboola|${i}" tabindex="0"></div></div>
    </div>`).join("");
  wireZones(wrap);
}
function renderBmPrints(){
  const wrap=$("#bmPrintsWrap");if(!wrap)return;
  wrap.innerHTML=fBmPrints.map((p,i)=>`<div class="block-edit"><div class="behead"><span class="t"><span class="badge">${i+1}</span> Print da BM</span>${fBmPrints.length>1?`<button type="button" class="rm-block" data-action="rm-bm-print" data-i="${i}">✕ Remover</button>`:""}</div><div class="field"><label class="lbl">Identificação</label><input type="text" data-bm="${i}" data-k="nome" placeholder="Ex: Conta principal · últimos 14 dias" value="${esc(p.nome||"")}"></div><div class="field" style="margin-bottom:0"><label class="lbl">Imagem</label><div class="dz" data-zone="bm|${i}" tabindex="0"></div></div></div>`).join("");
  wireZones(wrap);
}
function renderBrandTopAds(){
  const wrap=$("#brandTopAdsWrap");if(!wrap)return;
  wrap.innerHTML=fBrandTopAds.map((a,i)=>`<div class="block-edit"><div class="behead"><span class="t"><span class="badge">${i+1}</span> Top ad ${i+1}</span>${fBrandTopAds.length>1?`<button type="button" class="rm-block" data-action="rm-brand-ad" data-i="${i}">✕ Remover</button>`:""}</div><div class="row"><div class="field"><label class="lbl">Nome / identificação</label><input type="text" data-brandad="${i}" data-k="nome" placeholder="Ex: UGC · Hook 02" value="${esc(a.nome||"")}"></div><div class="field"><label class="lbl">Link do anúncio</label><input type="url" data-brandad="${i}" data-k="link" placeholder="https://..." value="${esc(a.link||"")}"></div></div><div class="field" style="margin-bottom:0"><label class="lbl">Vídeo ou imagem do top ad</label><div class="fsec__hint" style="margin-bottom:10px">O arquivo é salvo no Storage do Swipe e permanece disponível mesmo se o anúncio sair da biblioteca.</div><div class="dz" data-zone="brandad|${i}" tabindex="0"></div></div></div>`).join("");
  wireZones(wrap);
}

/* live binding + autosave */
function onFieldChange(t){
  if(t.dataset.dom!=null){fDominios[+t.dataset.dom][t.dataset.k]=t.value;return true;}
  if(t.dataset.crv!=null){fCriativos[+t.dataset.crv][t.dataset.k]=t.value;return true;}
  if(t.dataset.bib!=null){fBibliotecas[+t.dataset.bib][t.dataset.k]=t.value;return true;}
  if(t.dataset.tab!=null){fTaboola[+t.dataset.tab][t.dataset.k]=t.value;return true;}
  if(t.dataset.bm!=null){fBmPrints[+t.dataset.bm][t.dataset.k]=t.value;return true;}
  if(t.dataset.brandad!=null){fBrandTopAds[+t.dataset.brandad][t.dataset.k]=t.value;return true;}
  return false;
}
$("#formBody").addEventListener("input",e=>{onFieldChange(e.target);markDirty();});
$("#formBody").addEventListener("change",e=>{onFieldChange(e.target);markDirty();});
$("#formBody").addEventListener("click",e=>{
  const b=e.target.closest("[data-action]");if(!b)return;
  const a=b.dataset.action;
  if(a==="add-dom"){fDominios.push({nome:"",linkDominio:"",linkCheckout:"",backRedirect:"",views:"",viewsPeriod:"",vslLink:"",vslVideo:""});renderDominios();}
  else if(a==="rm-dom"){fDominios.splice(+b.dataset.i,1);renderDominios();}
  else if(a==="add-crv"){fCriativos.push({nome:"",link:"",transcricao:""});renderCriativos();}
  else if(a==="rm-crv"){fCriativos.splice(+b.dataset.i,1);renderCriativos();}
  else if(a==="add-bib"){fBibliotecas.push({nome:"",link:""});renderBibliotecas();}
  else if(a==="rm-bib"){fBibliotecas.splice(+b.dataset.i,1);renderBibliotecas();}
  else if(a==="add-tab"){fTaboola.push({nome:"",img:""});renderTaboola();}
  else if(a==="rm-tab"){fTaboola.splice(+b.dataset.i,1);renderTaboola();}
  else if(a==="add-bm-print"){fBmPrints.push({nome:"Business Manager",img:""});renderBmPrints();}
  else if(a==="rm-bm-print"){fBmPrints.splice(+b.dataset.i,1);renderBmPrints();}
  else if(a==="add-brand-ad"){fBrandTopAds.push({nome:"",link:"",img:""});renderBrandTopAds();}
  else if(a==="rm-brand-ad"){fBrandTopAds.splice(+b.dataset.i,1);renderBrandTopAds();}
  else if(a==="set-tipo"){if(fTipo===b.dataset.tipo)return;fTipo=b.dataset.tipo;$("#formBody").dataset.tipo=fTipo;$$("#tipoSeg .seg-btn").forEach(x=>x.classList.toggle("active",x.dataset.tipo===fTipo));}
  else return;
  markDirty();
});

/* ===== SAVE (explícito) ===== */
function buildPayload(){
  const sourceOffer=editingId?offers.find(x=>x.id===editingId):null;
  const legacy=sourceOffer?Object.assign({},sourceOffer.data||{}):{};
  if(sourceOffer&&sourceOffer.data?.kind==="brandsgeneral"){
    legacy.offerTags=offerTagsOf(brandHubAdminData(sourceOffer)).filter(tag=>tag!=="insider");
    legacy.bmAccess=false;
  }
  const payload=Object.assign(legacy,{
    tipoTrafego:"meta",
    nomeOferta:val("f_nomeOferta"),nomeMarca:val("f_nomeMarca"),nicho:val("f_nicho"),
    formato:val("f_formato"),numAdsAtivos:val("f_numAdsAtivos"),
    bibliotecas:fBibliotecas.filter(x=>x.nome||x.link),
    imagemProduto:fProductImg||"",
    dominios:fDominios.filter(x=>x.nome||x.linkDominio||x.linkCheckout||x.backRedirect||x.views||x.vslLink||x.vslVideo),
    criativos:fCriativos.filter(x=>x.nome||x.link||x.transcricao),
    taboolaAds:[],
    funil:val("f_funil"),advertorialLink:val("f_advertorialLink"),
    driveLinks:val("f_driveLinks")
  });
  if(fBrandStage==="brandsvalidated")Object.assign(payload,{
    kind:"brandsvalidated",
    brandCategory:val("f_brandCategory")||"SUPPLEMENTS",
    adsLibraryCheckedAt:val("f_adsLibraryCheckedAt"),
    bmSpend7d:val("f_bmSpend7d"),bmSpend14d:val("f_bmSpend14d"),bmSpend30d:val("f_bmSpend30d"),bmCpa:val("f_bmCpa"),bmAvgConversion:val("f_bmAvgConversion"),bmCpc:val("f_bmCpc"),bmCpcLink:val("f_bmCpcLink"),bmCpm:val("f_bmCpm"),bmCtr:val("f_bmCtr"),bmCostUnique:val("f_bmCostUnique"),bmCostIc:val("f_bmCostIc"),bmRoas:val("f_bmRoas"),bmUpdatedAt:val("f_bmUpdatedAt"),bmNotes:val("f_bmNotes"),
    bmPrints:fBmPrints.filter(x=>x.nome||x.img),brandTopAds:fBrandTopAds.filter(x=>x.nome||x.link||x.img||x.video),brandSemrush1m:fBrandSemrush1m||"",brandSemrush3m:fBrandSemrush3m||""
  });
  else if(fBrandStage==="brandsgeneral"){
    payload.kind="brandsgeneral";
    for(const key of BRAND_BM_METRICS.map(([,key])=>key).concat(["bmNotes","bmPrints","bmReports","brandTopAds"]))delete payload[key];
  }
  else if(payload.kind==="oferta")delete payload.kind;
  const old=editingId?((offers.find(x=>x.id===editingId)||{}).data||{}):{},libraryKey=value=>JSON.stringify((value||[]).map(item=>String(item&&item.link||"").trim()).filter(Boolean).sort());
  if(payload.tipoTrafego==="meta"&&payload.bibliotecas.some(item=>item.link)&&(!editingId||libraryKey(payload.bibliotecas)!==libraryKey(old.bibliotecas)||!["pending","processing","completed","retry_scheduled"].includes(String(payload.analysisStatus||"")))){
    payload.analysisStatus="pending";payload.analysisAttempts=0;payload.analysisStartedAt="";payload.analysisCompletedAt="";payload.analysisLastError="";payload.analysisNextRetryAt="";payload.analysisVersion="1";
  }
  return payload;
}
function hasContent(p){return !!(p.nomeOferta||p.nomeMarca||p.nicho||p.formato||p.numAdsAtivos||p.imagemProduto||p.funil||p.advertorialLink||p.driveLinks||p.comentario||p.dominios.length||p.criativos.length||p.bibliotecas.length||p.taboolaAds.length||p.trafego28d||p.trafego3m||p.printSemrushOriginal);}
function markDirty(){formDirty=true;setSaveState("unsaved");}

function canonicalCreativeUrl(value){
  try{
    const u=new URL(String(value||"").trim());u.hash="";
    [...u.searchParams.keys()].forEach(k=>{if(/^(utm_|fbclid$|subid|sid|rtk|twrclid|hcid|tid$)/i.test(k))u.searchParams.delete(k);});
    return `${u.hostname.toLowerCase()}${u.pathname.replace(/\/+$/,"")}${u.search}`;
  }catch(e){return String(value||"").trim().toLowerCase();}
}
function creativeNicheCode(niche){
  const key=String(niche||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  if(key.includes("emagrec"))return"WL";
  if(key.includes("disfunc")||/\bed\b/.test(key))return"ED";
  if(key.includes("memor"))return"MEMO";
  if(key.includes("diabet")||key.includes("glic"))return"DB";
  if(key.includes("press"))return"BP";
  if(key.includes("vis"))return"VIS";
  return (key.replace(/[^a-z0-9]+/g," ").trim().split(/\s+/).map(x=>x[0]).join("").slice(0,4)||"OT").toUpperCase();
}
function nextCreativeName(niche){
  const code=creativeNicheCode(niche),rx=new RegExp(`^\\[ADS ${code}\\]\\[(\\d+)\\]$`,"i");
  const max=offers.reduce((n,o)=>{if((o.data||{}).kind!=="criativo")return n;const m=String(o.data.nome||"").match(rx);return m?Math.max(n,+m[1]):n;},0);
  return `[ADS ${code}][${String(max+1).padStart(2,"0")}]`;
}
function nextOrganicNames(total){
  const rx=/^\[ORG ED\]\[(\d+)\]$/i;
  const max=offers.reduce((n,o)=>{const d=(o&&o.data)||{};if(d.kind!=="criativo"||d.division!=="organic")return n;const m=String(d.nome||"").match(rx);return m?Math.max(n,+m[1]):n;},0);
  return Array.from({length:total},(_,index)=>`[ORG ED][${String(max+index+1).padStart(2,"0")}]`);
}
async function syncOfferCreatives(offerRow){
  const d=offerRow&&offerRow.data||{};
  const items=[
    ...(Array.isArray(d.criativos)?d.criativos:[]).map(item=>({
      nome:item&&item.nome,link:item&&item.link,copyLink:item&&item.transcricao,print:""
    })),
    ...(Array.isArray(d.taboolaAds)?d.taboolaAds:[]).map(item=>({
      nome:item&&item.nome,link:item&&item.link||item&&item.img,copyLink:"",print:item&&item.img
    }))
  ];
  for(const source of items){
    const link=String(source&&source.link||"").trim(),key=canonicalCreativeUrl(link);
    if(!key||offers.some(o=>(o.data||{}).kind==="criativo"&&canonicalCreativeUrl(o.data.linkAnuncio||o.data.video||o.data.print)===key))continue;
    const facebook=isFbUrl(link);
    const data={kind:"criativo",nome:nextCreativeName(d.nicho),nomeOriginal:String(source.nome||"").trim(),nicho:d.nicho||"Outro",marca:d.nomeOferta||d.nomeMarca||"",plataforma:d.tipoTrafego==="native"?"taboola":"meta",linkAnuncio:link,video:"",print:String(source.print||"").trim(),copyLink:String(source.copyLink||"").trim(),transcricao:"",transcricaoPt:"",transcriptionRequired:facebook,transcriptionStatus:facebook?"waiting_for_media":"",transcricaoStatus:facebook?"waiting_for_media":"",transcriptionAttempts:0,transcriptionProvider:"groq",transcriptionVersion:"1",fbIngestStatus:facebook?"pending":"",mediaArchiveRequired:facebook,mediaArchiveStatus:facebook?"pending":"",sourceOfferId:offerRow.id,sourceOfferName:d.nomeOferta||""};
    const result=await sb.from("offers").insert({data}).select();
    const created=result.data&&result.data[0];if(!created)continue;
    offers.push(created);
    if(facebook)setTimeout(()=>triggerFbIngest(created.id,link),0);
  }
}

async function runAdminOfferBatch(mode="audit"){
  if(!requireAdmin())throw new Error("acesso administrativo necessário");
  const sessionResult=await sb.auth.getSession(),token=sessionResult?.data?.session?.access_token||"";
  if(!token)throw new Error("sessão expirada");
  const response=await fetch("/.netlify/functions/admin-offer-batch",{
    method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},
    body:JSON.stringify({mode})
  });
  const result=await response.json().catch(()=>({}));
  if(!response.ok||!result.ok)throw new Error(result.error||"falha ao executar lote");
  if(mode==="apply"){
    for(const creative of result.createdCreatives||[]){
      if(!creative?.id||!isFbUrl(creative.link))continue;
      fetch(FB_INGEST_FN,{
        method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},
        body:JSON.stringify({id:creative.id,adUrl:creative.link})
      }).catch(()=>{});
      await new Promise(resolve=>setTimeout(resolve,500));
    }
    await loadOffers();renderAll();
  }
  return result;
}
window.runAdminOfferBatch=runAdminOfferBatch;

async function saveForm(){
  if(!requireAdmin())return false;
  if(semrushUploading){toast("Aguarde o upload do SEMrush terminar.",true);return false;}
  if(brandMediaUploading){toast("Aguarde o arquivo do top ad terminar de salvar.",true);return false;}
  if(offerVslUploading){toast("Aguarde a VSL terminar de salvar.",true);return false;}
  if(saving)return false;
  saving=true;setSaveState("saving");setSync("load","Salvando");
  await compressStateImages();
  $$(".dz",$("#formBody")).forEach(paintZone);
  const p=buildPayload();
  if(!hasContent(p)){saving=false;setSaveState(formDirty?"unsaved":"new");toast("Preencha algo antes de salvar",true);return false;}
  const size=JSON.stringify(p).length;
  if(size>6000000){saving=false;setSaveState("error");toast("Imagens muito grandes ("+Math.round(size/1048576)+"MB). Remova/reduza um print.",true);return false;}
  let res;
  try{
    if(editingId&&offers.find(row=>row.id===editingId)?.adminPrivate){
      const previous=adminOfferDrafts[editingId]||{},draft=await saveAdminOfferDraft({target_offer_id:editingId,label:previous.label||p.nomeOferta,new_offer:true,data_patch:p});
      adminOfferDrafts[editingId]=draft;res={data:[{id:editingId,created_at:previous.updated_at||draft.updated_at,data:p,adminPrivate:true}]};
    }
    else if(editingId)res=await sb.from("offers").update({data:p}).eq("id",editingId).select();
    else res=await sb.from("offers").insert({data:p}).select();
  }catch(err){res={error:err};}
  saving=false;
  if(res.error){setSaveState("error");setSync("err","Erro");toast("Erro ao salvar: "+(res.error.message||res.error),true);return false;}
  const row=res.data&&res.data[0];
  if(row){
    if(!editingId){editingId=row.id;offers.push(row);}
    else{const i=offers.findIndex(o=>o.id===editingId);if(i>=0)offers[i]=row;else offers.push(row);}
  }
  if(row&&!row.adminPrivate)await syncOfferCreatives(row);
  formDirty=false;setSaveState("saved");setSync("ok","Salvo");renderGrid();writeCache();
  return true;
}

function attemptCloseForm(){
  if(!formDirty){closeOverlay("#formOverlay");return;}
  pendingCloseForm="offer";openOverlay("#confirmOverlay");
}

$("#formSave").addEventListener("click",async()=>{if(await saveForm())toast("Oferta salva");});
$("#formClose").addEventListener("click",attemptCloseForm);

$("#cfCancel").addEventListener("click",()=>closeOverlay("#confirmOverlay"));
$("#cfDiscard").addEventListener("click",()=>{if(pendingCloseForm==="simple"){sFormDirty=false;closeOverlay("#confirmOverlay");closeOverlay("#simpleFormOverlay");}else{formDirty=false;closeOverlay("#confirmOverlay");closeOverlay("#formOverlay");}toast("Alterações descartadas");});
$("#cfSave").addEventListener("click",async()=>{if(pendingCloseForm==="simple"){const ok=await saveSimpleForm();if(ok){closeOverlay("#confirmOverlay");closeOverlay("#simpleFormOverlay");toast("Salvo");}}else{const ok=await saveForm();if(ok){closeOverlay("#confirmOverlay");closeOverlay("#formOverlay");toast("Oferta salva");}}});

/* ===== IMAGE ZONES ===== */
const SAFE_UPLOADS={
  jpg:{kind:"image",contentType:"image/jpeg"},jpeg:{kind:"image",contentType:"image/jpeg"},
  png:{kind:"image",contentType:"image/png"},webp:{kind:"image",contentType:"image/webp"},
  mp4:{kind:"video",contentType:"video/mp4"},mov:{kind:"video",contentType:"video/quicktime"},webm:{kind:"video",contentType:"video/webm"}
};
async function inspectUploadFile(file,kinds=["image","video"],maxBytes=160*1024*1024){
  if(!file||!file.size||file.size>maxBytes)throw new Error(`arquivo deve ter até ${Math.round(maxBytes/1048576)} MB`);
  const bytes=new Uint8Array(await file.slice(0,16).arrayBuffer());let ext="";
  if(bytes.length>=8&&bytes[0]===0x89&&bytes[1]===0x50&&bytes[2]===0x4e&&bytes[3]===0x47&&bytes[4]===0x0d&&bytes[5]===0x0a&&bytes[6]===0x1a&&bytes[7]===0x0a)ext="png";
  else if(bytes.length>=3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)ext="jpg";
  else if(bytes.length>=12&&String.fromCharCode(...bytes.slice(0,4))==="RIFF"&&String.fromCharCode(...bytes.slice(8,12))==="WEBP")ext="webp";
  else if(bytes.length>=12&&String.fromCharCode(...bytes.slice(4,8))==="ftyp")ext=/\.mov$/i.test(file.name||"")?"mov":"mp4";
  else if(bytes.length>=4&&bytes[0]===0x1a&&bytes[1]===0x45&&bytes[2]===0xdf&&bytes[3]===0xa3)ext="webm";
  const info=SAFE_UPLOADS[ext];if(!info||!kinds.includes(info.kind))throw new Error("formato de arquivo não permitido");
  const declared=String(file.type||"").toLowerCase();if(declared&&declared!==info.contentType&&!(ext==="jpg"&&declared==="image/jpg"))throw new Error("tipo do arquivo não corresponde ao conteúdo");
  return{...info,ext};
}
function getZone(key){
  if(key==="produto")return fProductImg;
  if(key==="semrush")return fSemrushThumb||fSemrushOriginal;
  if(key==="brandsemrush1m")return fBrandSemrush1m;
  if(key==="brandsemrush3m")return fBrandSemrush3m;
  if(key.slice(0,2)==="s|")return sItem[key.slice(2)]||"";
  const p=key.split("|");
  if(p[0]==="dom"){const i=+p[1];return p[2]==="vsl"?((fDominios[i]||{}).vslVideo||""):"";}
  if(p[0]==="taboola"){const i=+p[1];return (fTaboola[i]||{}).img||"";}
  if(p[0]==="bm"){const i=+p[1];return (fBmPrints[i]||{}).img||"";}
  if(p[0]==="brandad"){const i=+p[1];return (fBrandTopAds[i]||{}).img||"";}
  return "";
}
function setZone(key,v){
  if(key==="produto"){fProductImg=v;return;}
  if(key==="semrush"){fSemrushOriginal=v;fSemrushThumb=v;return;}
  if(key==="brandsemrush1m"){fBrandSemrush1m=v;return;}
  if(key==="brandsemrush3m"){fBrandSemrush3m=v;return;}
  if(key.slice(0,2)==="s|"){sItem[key.slice(2)]=v;return;}
  const p=key.split("|");
  if(p[0]==="dom"){const i=+p[1];if(fDominios[i]&&p[2]==="vsl"){fDominios[i].vslVideo=v;if(!v)fDominios[i].vslStoragePath="";}return;}
  if(p[0]==="taboola"){const i=+p[1];if(fTaboola[i])fTaboola[i].img=v;return;}
  if(p[0]==="bm"){const i=+p[1];if(fBmPrints[i])fBmPrints[i].img=v;return;}
  if(p[0]==="brandad"){const i=+p[1];if(fBrandTopAds[i]){fBrandTopAds[i].img=v;if(!v){fBrandTopAds[i].video="";fBrandTopAds[i].storagePath="";fBrandTopAds[i].ingestStatus="link_only";}}return;}
}
function paintZone(dz){
  const key=dz.dataset.zone,p=key.split("|"),brandAd=p[0]==="brandad"?(fBrandTopAds[+p[1]]||null):null,isOfferVsl=p[0]==="dom"&&p[2]==="vsl",media=brandAd?(brandAd.video||brandAd.img||""):getZone(key),isVideo=isOfferVsl||!!(brandAd&&brandAd.video);
  if(media){dz.classList.add("has");dz.innerHTML=`<button type="button" class="rm">✕ Remover</button>${isVideo?`<video src="${esc(media)}" controls preload="metadata" playsinline></video>`:`<img src="${esc(media)}" alt="">`}`;$(".rm",dz).addEventListener("click",ev=>{ev.stopPropagation();setZone(key,"");paintZone(dz);markDirty();});}
  else{dz.classList.remove("has");dz.innerHTML=`<div class="hint">${isOfferVsl?"Clique ou arraste a <b>VSL em MP4</b><br>Arquivo de até 500 MB":brandAd?"Clique ou arraste um <b>vídeo ou imagem</b><br>Vídeos de até 50 MB":"Clique e <b>cole (Ctrl/⌘+V)</b><br>ou arraste / selecione"}</div>`;}
}
function wireZones(scope){
  $$(".dz",scope).forEach(dz=>{
    paintZone(dz);
    dz.addEventListener("click",e=>{if(e.target.classList.contains("rm")||e.target.closest("video")||semrushUploading||dz.dataset.busy)return;setActiveZone(dz);const inp=document.createElement("input"),brand=dz.dataset.zone.startsWith("brandad|"),offerVsl=/^dom\|\d+\|vsl$/.test(dz.dataset.zone);inp.type="file";inp.accept=offerVsl?"video/mp4,.mp4":brand?"video/mp4,video/webm,video/quicktime,video/*,image/jpeg,image/png,image/webp":"image/jpeg,image/png,image/webp";inp.onchange=()=>{if(inp.files[0])handleZoneFile(inp.files[0],dz);};inp.click();});
    dz.addEventListener("focus",()=>setActiveZone(dz));
    dz.addEventListener("dragover",e=>{e.preventDefault();dz.classList.add("active");});
    dz.addEventListener("dragleave",()=>dz.classList.remove("active"));
    dz.addEventListener("drop",e=>{e.preventDefault();dz.classList.remove("active");const brand=dz.dataset.zone.startsWith("brandad|"),offerVsl=/^dom\|\d+\|vsl$/.test(dz.dataset.zone),f=[...e.dataTransfer.files].find(f=>offerVsl?f.type==="video/mp4":f.type.startsWith("image/")||(brand&&f.type.startsWith("video/")));if(f)handleZoneFile(f,dz);else if(offerVsl)toast("Use um arquivo MP4.",true);else if(brand)toast("Use um arquivo de vídeo ou imagem.",true);});
  });
}
function setActiveZone(dz){$$(".dz").forEach(z=>z.classList.remove("active"));dz.classList.add("active");activeZone=dz.dataset.zone;}
/* compressão de imagem: reduz dimensões e qualidade p/ caber no banco */
function compressImage(srcDataUrl,maxW=1280,maxH=4000,quality=0.72){
  return new Promise(resolve=>{
    const img=new Image();
    img.onload=()=>{
      let w=img.naturalWidth||img.width, h=img.naturalHeight||img.height;
      const scale=Math.min(1,maxW/w,maxH/h);
      const nw=Math.max(1,Math.round(w*scale)), nh=Math.max(1,Math.round(h*scale));
      try{
        const c=document.createElement("canvas");c.width=nw;c.height=nh;
        const ctx=c.getContext("2d");
        ctx.fillStyle="#fff";ctx.fillRect(0,0,nw,nh);
        ctx.drawImage(img,0,0,nw,nh);
        resolve(c.toDataURL("image/jpeg",quality));
      }catch(e){resolve(srcDataUrl);}
    };
    img.onerror=()=>resolve(srcDataUrl);
    img.src=srcDataUrl;
  });
}
async function maybeCompress(d){
  if(typeof d!=="string"||!d.startsWith("data:image"))return d;
  if(d.length<300000)return d;            // já está leve (~<225KB)
  return await compressImage(d);
}
async function compressStateImages(){
  fProductImg=await maybeCompress(fProductImg);
  for(const dm of fDominios){dm.printPV=await maybeCompress(dm.printPV);dm.printCheckout=await maybeCompress(dm.printCheckout);}
  for(const a of fTaboola){a.img=await maybeCompress(a.img);}
  for(const p of fBmPrints){p.img=await maybeCompress(p.img);}
  for(const a of fBrandTopAds){a.img=await maybeCompress(a.img);}
  fBrandSemrush1m=await maybeCompress(fBrandSemrush1m);
  fBrandSemrush3m=await maybeCompress(fBrandSemrush3m);
}
function fileToImage(file,dz){
  const r=new FileReader();
  r.onload=async()=>{
    const compressed=await compressImage(r.result);
    setZone(dz.dataset.zone,compressed);paintZone(dz);markDirty();
  };
  r.readAsDataURL(file);
}
const SEMRUSH_MAX_BYTES=12*1024*1024;
async function handleZoneFile(file,dz){
  const brand=dz.dataset.zone.startsWith("brandad|"),offerVsl=/^dom\|\d+\|vsl$/.test(dz.dataset.zone),max=offerVsl?500*1024*1024:brand?(file.type.startsWith("video/")?50:15)*1024*1024:15*1024*1024;
  let info;try{info=await inspectUploadFile(file,offerVsl?["video"]:brand?["image","video"]:["image"],max);if(offerVsl&&info.ext!=="mp4")throw new Error("a VSL deve estar em formato MP4");}catch(e){toast((e&&e.message)||"Arquivo inválido.",true);return;}
  return offerVsl?uploadOfferVslFile(file,dz,info):brand?uploadBrandTopAdFile(file,dz,info):dz.dataset.zone==="semrush"?uploadSemrushFile(file,dz,info):fileToImage(file,dz);
}
function imageFileToWebp(file,maxW=1280,maxH=1800,quality=.78){
  return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),img=new Image();
    img.onload=()=>{try{const scale=Math.min(1,maxW/img.naturalWidth,maxH/img.naturalHeight),w=Math.max(1,Math.round(img.naturalWidth*scale)),h=Math.max(1,Math.round(img.naturalHeight*scale));const c=document.createElement("canvas");c.width=w;c.height=h;const x=c.getContext("2d");x.drawImage(img,0,0,w,h);c.toBlob(b=>b?resolve(b):reject(new Error("não foi possível gerar a miniatura")),"image/webp",quality);}catch(e){reject(e);}finally{URL.revokeObjectURL(url);}};
    img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("imagem inválida"));};img.src=url;
  });
}
async function storageUploadWithProgress(file,path,onProgress,contentType=file.type){
  const session=await sb.auth.getSession(),token=(session.data&&session.data.session&&session.data.session.access_token)||currentSbKey;
  const safePath=path.split("/").map(encodeURIComponent).join("/");
  return new Promise((resolve,reject)=>{const xhr=new XMLHttpRequest();xhr.open("POST",`${currentSbUrl}/storage/v1/object/criativos/${safePath}`);xhr.timeout=240000;xhr.setRequestHeader("apikey",currentSbKey);xhr.setRequestHeader("Authorization","Bearer "+token);xhr.setRequestHeader("Content-Type",contentType);xhr.setRequestHeader("x-upsert","false");xhr.upload.onprogress=e=>{if(e.lengthComputable)onProgress(Math.round(e.loaded/e.total*100));};xhr.onerror=()=>reject(new Error("falha de rede no upload"));xhr.ontimeout=()=>reject(new Error("o envio excedeu o tempo seguro"));xhr.onload=()=>{if(xhr.status>=200&&xhr.status<300)resolve();else{let msg="HTTP "+xhr.status;try{msg=JSON.parse(xhr.responseText).message||msg;}catch(_){}reject(new Error(msg));}};xhr.send(file);});
}
function utf8Base64(value){
  const bytes=new TextEncoder().encode(String(value)),step=0x8000;
  let binary="";for(let index=0;index<bytes.length;index+=step)binary+=String.fromCharCode(...bytes.subarray(index,index+step));
  return btoa(binary);
}
async function storageTusUploadWithProgress(file,path,onProgress,contentType=file.type){
  const session=await sb.auth.getSession(),token=(session.data&&session.data.session&&session.data.session.access_token)||currentSbKey;
  const projectUrl=new URL(currentSbUrl),directHost=projectUrl.hostname.replace(/\.supabase\.co$/,".storage.supabase.co");
  const endpoint=`${projectUrl.protocol}//${directHost}/storage/v1/upload/resumable`;
  const baseHeaders={apikey:currentSbKey,Authorization:"Bearer "+token,"Tus-Resumable":"1.0.0"};
  const created=await fetch(endpoint,{method:"POST",headers:{...baseHeaders,"Upload-Length":String(file.size),"Upload-Metadata":[
    `bucketName ${utf8Base64(VIDEO_BUCKET)}`,
    `objectName ${utf8Base64(path)}`,
    `contentType ${utf8Base64(contentType||"application/octet-stream")}`,
    `cacheControl ${utf8Base64("3600")}`
  ].join(","),"x-upsert":"false"}});
  if(!created.ok){let message=`HTTP ${created.status}`;try{message=(await created.json()).message||message;}catch(_){}throw new Error(message);}
  const location=created.headers.get("location");if(!location)throw new Error("o armazenamento não retornou o destino do envio");
  const uploadUrl=new URL(location,endpoint).toString(),chunkSize=6*1024*1024;
  async function remoteOffset(){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
    try{
      const response=await fetch(uploadUrl,{method:"HEAD",headers:baseHeaders,signal:controller.signal});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      return Number(response.headers.get("Upload-Offset"))||0;
    }finally{clearTimeout(timer);}
  }
  let offset=0;
  while(offset<file.size){
    const start=offset,end=Math.min(file.size,start+chunkSize),chunk=file.slice(start,end);
    offset=await new Promise((resolve,reject)=>{
      const xhr=new XMLHttpRequest();let settled=false,recovering=false,confirmationTimer=null,hardTimer=null;
      const finish=(fn,value)=>{if(settled)return;settled=true;clearTimeout(confirmationTimer);clearTimeout(hardTimer);fn(value);};
      const recover=async(reason)=>{
        if(settled||recovering)return;recovering=true;
        try{xhr.abort();}catch(_){}
        try{
          const confirmed=await remoteOffset();
          if(confirmed>start){finish(resolve,confirmed);return;}
        }catch(_){}
        finish(reject,new Error(reason));
      };
      xhr.open("PATCH",uploadUrl);xhr.timeout=45000;
      xhr.setRequestHeader("apikey",currentSbKey);xhr.setRequestHeader("Authorization","Bearer "+token);
      xhr.setRequestHeader("Tus-Resumable","1.0.0");xhr.setRequestHeader("Upload-Offset",String(start));
      xhr.setRequestHeader("Content-Type","application/offset+octet-stream");
      xhr.upload.onprogress=event=>{
        if(event.lengthComputable)onProgress(Math.min(99,Math.round((start+event.loaded)/file.size*100)));
        if(event.lengthComputable&&event.loaded>=event.total&&!confirmationTimer)confirmationTimer=setTimeout(()=>recover("o armazenamento não confirmou a parte enviada"),12000);
      };
      xhr.upload.onload=()=>{confirmationTimer=setTimeout(()=>recover("o armazenamento não confirmou a parte enviada"),12000);};
      xhr.onerror=()=>recover("falha de rede no envio em partes");
      xhr.ontimeout=()=>recover("uma parte do envio excedeu o tempo seguro");
      xhr.onload=()=>{
        if(xhr.status>=200&&xhr.status<300)finish(resolve,Number(xhr.getResponseHeader("Upload-Offset"))||end);
        else{let message=`HTTP ${xhr.status}`;try{message=JSON.parse(xhr.responseText).message||message;}catch(_){}finish(reject,new Error(message));}
      };
      xhr.send(chunk);hardTimer=setTimeout(()=>recover("o armazenamento não respondeu ao envio"),45000);
    });
  }
  onProgress(100);
}
async function storageSignedUploadWithProgress(file,path,onProgress,contentType=file.type){
  const session=await sb.auth.getSession(),token=session.data&&session.data.session&&session.data.session.access_token;
  if(!token)throw new Error("sua sessão expirou; entre novamente");
  const ticketResponse=await fetch("/.netlify/functions/admin-media-ticket",{
    method:"POST",
    headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},
    body:JSON.stringify({path}),
    signal:AbortSignal.timeout(25000)
  });
  const ticket=await ticketResponse.json().catch(()=>({}));
  if(!ticketResponse.ok||!ticket.ok)throw new Error(ticket.error||`HTTP ${ticketResponse.status}`);
  if(ticket.token&&sb.storage.from(VIDEO_BUCKET).uploadToSignedUrl){
    onProgress(15);
    const upload=await sb.storage.from(VIDEO_BUCKET).uploadToSignedUrl(path,ticket.token,file,{
      contentType:contentType||"application/octet-stream",upsert:false,cacheControl:"3600"
    });
    if(upload.error)throw upload.error;
    onProgress(100);
    return token;
  }
  const safePath=path.split("/").map(encodeURIComponent).join("/");
  let signedUrl=ticket.token
    ?`${currentSbUrl}/storage/v1/object/upload/sign/${VIDEO_BUCKET}/${safePath}?token=${encodeURIComponent(ticket.token)}`
    :String(ticket.signedUrl||"");
  if(!signedUrl)throw new Error("o armazenamento não retornou o destino do envio");
  if(!/^https?:\/\//i.test(signedUrl)){
    signedUrl=`${currentSbUrl}/storage/v1${signedUrl.startsWith("/")?"":"/"}${signedUrl}`;
  }
  await new Promise((resolve,reject)=>{
    const xhr=new XMLHttpRequest();let settled=false,watchdog=null;
    const finish=(fn,value)=>{if(settled)return;settled=true;clearTimeout(watchdog);fn(value);};
    xhr.open("PUT",signedUrl);xhr.timeout=180000;
    xhr.setRequestHeader("x-upsert","false");
    xhr.upload.onprogress=event=>{if(event.lengthComputable)onProgress(Math.min(99,Math.round(event.loaded/event.total*100)));};
    xhr.onerror=()=>finish(reject,new Error("falha de rede no envio"));
    xhr.ontimeout=()=>finish(reject,new Error("o armazenamento demorou para confirmar o envio"));
    xhr.onload=()=>{
      if(xhr.status>=200&&xhr.status<300){onProgress(100);finish(resolve);}
      else{let message=`HTTP ${xhr.status}`;try{const body=JSON.parse(xhr.responseText);message=body.message||body.error||message;}catch(_){}finish(reject,new Error(message));}
    };
    const body=new FormData();body.append("cacheControl","3600");body.append("",file,file.name);
    xhr.send(body);
    watchdog=setTimeout(()=>{try{xhr.abort();}catch(_){}finish(reject,new Error("o envio não foi confirmado no tempo esperado"));},190000);
  });
  return token;
}
async function insertCreativeImport(data,token){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
  try{
    const request=fetch("/.netlify/functions/admin-creative-import",{
      method:"POST",
      headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},
      body:JSON.stringify(data),
      signal:controller.signal
    });
    const response=await Promise.race([
      request,
      new Promise((_,reject)=>setTimeout(()=>reject(new Error("o banco não confirmou o card no tempo esperado")),32000))
    ]);
    const payload=await response.json().catch(()=>({}));
    if(!response.ok||!payload.ok)throw new Error(payload.error||`Banco HTTP ${response.status}`);
    if(!payload.row||!payload.row.id)throw new Error("o banco não retornou o card criado");
    return payload.row;
  }catch(error){
    if(error&&error.name==="AbortError")throw new Error("o banco não confirmou o card no tempo esperado");
    throw error;
  }finally{clearTimeout(timer);}
}
const BRAND_VIDEO_MAX_BYTES=50*1024*1024,BRAND_IMAGE_MAX_BYTES=15*1024*1024;
const OFFER_VSL_MAX_BYTES=500*1024*1024;
async function uploadOfferVslFile(file,dz,info){
  const index=+(dz.dataset.zone.split("|")[1]),domain=fDominios[index];
  if(!domain||!info||info.kind!=="video"||info.ext!=="mp4"){toast("Use uma VSL em formato MP4.",true);return;}
  if(file.size>OFFER_VSL_MAX_BYTES){toast("A VSL deve ter no máximo 500 MB.",true);return;}
  if(!sb||!currentSbUrl){toast("Conexão com o Storage indisponível.",true);return;}
  if(dz.dataset.busy)return;
  dz.dataset.busy="1";offerVslUploading++;
  const uid=(crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random().toString(16).slice(2));
  const path=`offers/vsl/${new Date().toISOString().slice(0,10)}/${uid}.mp4`;
  dz.classList.remove("has");
  dz.innerHTML=`<div class="dz__upload"><strong>${esc(file.name||"VSL.mp4")}</strong><div class="dz__progress"><span></span></div><div class="dz__status">Salvando VSL no Swipe… 0%</div></div>`;
  const bar=$(".dz__progress span",dz),status=$(".dz__status",dz);
  try{
    await storageTusUploadWithProgress(file,path,percent=>{if(bar)bar.style.width=percent+"%";if(status)status.textContent=`Salvando VSL no Swipe… ${percent}%`;},info.contentType);
    domain.vslVideo=sb.storage.from(VIDEO_BUCKET).getPublicUrl(path).data.publicUrl;
    domain.vslStoragePath=path;domain.vslStoredAt=new Date().toISOString();
    markDirty();if(status)status.textContent="VSL salva no Swipe";setTimeout(()=>paintZone(dz),300);toast("VSL salva ✓");
  }catch(error){paintZone(dz);toast("Falha ao salvar a VSL: "+((error&&error.message)||error),true);}
  finally{delete dz.dataset.busy;offerVslUploading=Math.max(0,offerVslUploading-1);}
}
async function uploadBrandTopAdFile(file,dz,info){
  const index=+(dz.dataset.zone.split("|")[1]),ad=fBrandTopAds[index],isVideo=info&&info.kind==="video",isImage=info&&info.kind==="image";
  if(!ad||(!isVideo&&!isImage)){toast("Use um arquivo de vídeo ou imagem.",true);return;}
  const max=isVideo?BRAND_VIDEO_MAX_BYTES:BRAND_IMAGE_MAX_BYTES;
  if(file.size>max){toast(`${isVideo?"O vídeo":"A imagem"} deve ter no máximo ${Math.round(max/1048576)} MB.`,true);return;}
  if(!sb||!currentSbUrl){toast("Conexão com o Storage indisponível.",true);return;}
  if(dz.dataset.busy)return;dz.dataset.busy="1";brandMediaUploading++;
  const ext=info.ext,uid=(crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random().toString(16).slice(2)),path=`brands/top-ads/${new Date().toISOString().slice(0,10)}/${uid}.${ext}`;
  dz.classList.remove("has");dz.innerHTML=`<div class="dz__upload"><strong>${esc(file.name||"Arquivo do top ad")}</strong><div class="dz__progress"><span></span></div><div class="dz__status">Salvando no Swipe… 0%</div></div>`;
  const bar=$(".dz__progress span",dz),status=$(".dz__status",dz);
  try{
    await storageUploadWithProgress(file,path,p=>{if(bar)bar.style.width=p+"%";if(status)status.textContent=`Salvando no Swipe… ${p}%`;},info.contentType);
    const url=sb.storage.from("criativos").getPublicUrl(path).data.publicUrl;
    if(isVideo){ad.video=url;ad.img="";}else{ad.img=url;ad.video="";}
    ad.storagePath=path;ad.storedAt=new Date().toISOString();ad.ingestStatus="done";ad.ingestError="";
    markDirty();if(status)status.textContent="Arquivo salvo no Swipe";setTimeout(()=>paintZone(dz),300);toast(`${isVideo?"Vídeo":"Imagem"} do top ad salvo ✓`);
  }catch(e){paintZone(dz);toast("Falha ao salvar o top ad: "+((e&&e.message)||e),true);}
  finally{delete dz.dataset.busy;brandMediaUploading=Math.max(0,brandMediaUploading-1);}
}
async function uploadSemrushFile(file,dz,info){
  if(semrushUploading)return;
  if(!file||!["image/jpeg","image/png","image/webp"].includes(file.type)){toast("Use JPG, PNG ou WebP no print do SEMrush.",true);return;}
  if(file.size>SEMRUSH_MAX_BYTES){toast("O print do SEMrush deve ter no máximo 12 MB.",true);return;}
  if(!sb||!currentSbUrl){toast("Conexão com o Storage indisponível.",true);return;}
  semrushUploading=true;const clean=(file.name||"semrush").replace(/[^a-z0-9._-]+/gi,"-").toLowerCase(),id=(crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random().toString(16).slice(2)),base=`semrush/${new Date().toISOString().slice(0,10)}/${id}`;
  dz.classList.remove("has");dz.innerHTML=`<div class="dz__upload"><strong>${esc(file.name)}</strong><div class="dz__progress"><span></span></div><div class="dz__status">Preparando upload…</div></div>`;
  const bar=$(".dz__progress span",dz),status=$(".dz__status",dz);
  try{const thumb=await imageFileToWebp(file),originalPath=base+"."+info.ext,thumbPath=base+"-thumb.webp";
    status.textContent="Enviando original… 0%";await storageUploadWithProgress(file,originalPath,p=>{bar.style.width=(p*.82)+"%";status.textContent=`Enviando original… ${p}%`;},info.contentType);
    status.textContent="Enviando miniatura otimizada…";await storageUploadWithProgress(thumb,thumbPath,p=>{bar.style.width=(82+p*.18)+"%";});
    const bucket=sb.storage.from("criativos");fSemrushOriginal=bucket.getPublicUrl(originalPath).data.publicUrl;fSemrushThumb=bucket.getPublicUrl(thumbPath).data.publicUrl;bar.style.width="100%";status.textContent="Upload concluído";markDirty();setTimeout(()=>paintZone(dz),350);toast("Print SEMrush enviado ✓");
  }catch(e){paintZone(dz);toast("Falha no upload: "+((e&&e.message)||e),true);}finally{semrushUploading=false;}
}
document.addEventListener("paste",e=>{
  if((!$("#formOverlay").classList.contains("open")&&!$("#simpleFormOverlay").classList.contains("open"))||!activeZone)return;
  const item=[...(e.clipboardData?.items||[])].find(i=>i.type.startsWith("image/"));if(!item)return;
  const file=item.getAsFile();const dz=$(`.dz[data-zone="${activeZone}"]`);
  if(file&&dz){handleZoneFile(file,dz);if(dz.dataset.zone!=="semrush")toast("Print colado");}
});
document.addEventListener("error",e=>{
  if(!(e.target instanceof HTMLImageElement))return;
  const img=e.target,frame=img.closest(".cmedia,.shot__media");
  const local=img.dataset.localCover;
  if(local&&!img.dataset.localCoverTried&&new URL(img.src,location.href).pathname!==local){img.dataset.localCoverTried="1";frame?.classList.remove("image-error");img.src=local;return;}
  if(!frame)return;
  const videoId=img.dataset.tiktokId;
  const repair=videoId?`/.netlify/functions/tiktok-cover?id=${encodeURIComponent(videoId)}`:"";
  if(repair&&!img.dataset.tiktokRepairTried&&img.src!==new URL(repair,location.href).href){img.dataset.tiktokRepairTried="1";frame.classList.remove("image-error");img.src=repair;return;}
  if(videoId){const dur=frame.querySelector(".ttdur");frame.classList.add("cmedia--empty");frame.innerHTML=`${ic("play")}<span>Prévia indisponível</span>${dur?dur.outerHTML:""}`;return;}
  frame.classList.add("image-error");
},true);
document.addEventListener("load",e=>{if(e.target instanceof HTMLImageElement)e.target.closest(".cmedia,.shot__media")?.classList.remove("image-error");},true);

/* ===== LIGHTBOX acessível: âncoras continuam nativas em Ctrl/⌘/meio-clique ===== */
let lbItems=[],lbIndex=0,lbTrigger=null,lbScale=1,lbX=0,lbY=0,lbDrag=null;
function lbPaint(){const img=$("#lightboxImg");img.style.transform=`translate(${lbX}px,${lbY}px) scale(${lbScale})`;}
function lbReset(){lbScale=1;lbX=0;lbY=0;lbPaint();}
function lbShow(index){if(!lbItems.length)return;lbIndex=(index+lbItems.length)%lbItems.length;const it=lbItems[lbIndex],src=it.src;$("#lightboxImg").src=src;$("#lightboxImg").alt=it.alt||"Print ampliado";$("#lightboxOpen").href=src;$("#lightboxCount").textContent=lbItems.length>1?`${lbIndex+1} / ${lbItems.length}`:"";$("#lightboxPrev").hidden=lbItems.length<2;$("#lightboxNext").hidden=lbItems.length<2;lbReset();}
function openLightbox(srcOrItems,index=0,trigger=null){lbItems=Array.isArray(srcOrItems)?srcOrItems:[{src:String(srcOrItems||""),alt:""}];lbTrigger=trigger||document.activeElement;lbShow(index);const box=$("#lightbox");box.classList.add("open");box.setAttribute("aria-hidden","false");document.body.style.overflow="hidden";$("#lightboxClose").focus();}
function closeLightbox(){const box=$("#lightbox");if(!box.classList.contains("open"))return;box.classList.remove("open");box.setAttribute("aria-hidden","true");$("#lightboxImg").src="";document.body.style.overflow="";if(lbTrigger&&lbTrigger.focus)lbTrigger.focus();}
function wireLightboxLinks(root){const links=$$("a[data-lightbox]",root);links.forEach(a=>a.addEventListener("click",e=>{e.stopPropagation();if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();if(a.dataset.bmRef&&!a.dataset.bmReady)return;const group=a.dataset.lightboxGroup||"",siblings=links.filter(link=>(link.dataset.lightboxGroup||"")===group&&(!link.dataset.bmRef||link.dataset.bmReady)),items=siblings.map(link=>({src:link.getAttribute("href")||link.dataset.lightbox,alt:($("img",link)||{}).alt||""}));openLightbox(items,siblings.indexOf(a),a);}));}
$("#lightboxClose").addEventListener("click",closeLightbox);
$("#lightboxPrev").addEventListener("click",()=>lbShow(lbIndex-1));
$("#lightboxNext").addEventListener("click",()=>lbShow(lbIndex+1));
$("#lightboxStage").addEventListener("wheel",e=>{e.preventDefault();lbScale=Math.max(1,Math.min(6,lbScale*(e.deltaY<0?1.18:.84)));if(lbScale===1){lbX=0;lbY=0;}lbPaint();},{passive:false});
$("#lightboxStage").addEventListener("dblclick",e=>{if(e.target.closest("button"))return;lbScale=lbScale>1?1:2.25;lbX=lbY=0;lbPaint();});
$("#lightboxImg").addEventListener("pointerdown",e=>{if(lbScale<=1)return;lbDrag={id:e.pointerId,x:e.clientX,y:e.clientY,ox:lbX,oy:lbY};e.currentTarget.setPointerCapture(e.pointerId);$("#lightboxStage").classList.add("dragging");});
$("#lightboxImg").addEventListener("pointermove",e=>{if(!lbDrag||lbDrag.id!==e.pointerId)return;lbX=lbDrag.ox+e.clientX-lbDrag.x;lbY=lbDrag.oy+e.clientY-lbDrag.y;lbPaint();});
$("#lightboxImg").addEventListener("pointerup",()=>{lbDrag=null;$("#lightboxStage").classList.remove("dragging");});

/* ===== POPUP DA COPY (ver copy direto do card) ===== */
function openCopyPop(id){
  const o=itemById(id);if(!o)return;
  const d=o.data||{};
  const copy=brainCopyText(d);
  const translation=String(d.transcricaoPt||"").trim();
  const copyIsTranscript=brainCopyIsTranscript(d);
  const copyLink=(d.copyLink||d.copyVslLink||d.copyCriativoLink||"").trim();
  const video=videoOfBrain(d);
  $("#copyPopTitle").textContent=(d.nome||"Copy do criativo")+(copyIsTranscript?" · transcrita":"");
  const sub=[d.autor?"por "+d.autor:"",d.nicho||""].filter(Boolean).join(" · ");
  $("#copyPopSub").textContent=sub;
  const body=$("#copyPopText");
  if(copy&&translation)body.innerHTML=`<div class="vtrans__tabs" role="tablist" aria-label="Idioma da copy"><button type="button" class="vtrans__tab active" data-copy-lang="original" aria-selected="true">Original</button><button type="button" class="vtrans__tab" data-copy-lang="pt" aria-selected="false">Português ✓</button></div><div data-copy-pane="original">${esc(copy)}</div><div data-copy-pane="pt" hidden>${esc(translation)}</div>`;
  else body.textContent=translation||copy||"Sem copy disponível neste card.";
  body.classList.toggle("empty",!copy);
  const btns=[];
  if(copy||translation)btns.push(`<button class="btn btn--outline btn--sm" id="copyPopCopy">${ic("type")}Copiar texto exibido</button>`);
  if(video)btns.push(`<a class="btn btn--outline btn--sm" href="${esc(fixUrl(video))}" target="_blank" rel="noopener">${ic("play")}Ver vídeo</a>`);
  if(copyLink)btns.push(`<a class="btn btn--outline btn--sm" href="${esc(fixUrl(copyLink))}" target="_blank" rel="noopener">${ic("file")}Abrir copy em português</a>`);
  $("#copyPopFoot").innerHTML=btns.join("");
  $$("[data-copy-lang]",body).forEach(tab=>tab.addEventListener("click",()=>{const lang=tab.dataset.copyLang;$$("[data-copy-lang]",body).forEach(x=>{const active=x===tab;x.classList.toggle("active",active);x.setAttribute("aria-selected",String(active));});$$("[data-copy-pane]",body).forEach(p=>p.hidden=p.dataset.copyPane!==lang);}));
  const cc=$("#copyPopCopy");if(cc)cc.addEventListener("click",()=>{const shown=$("[data-copy-pane]:not([hidden])",body);navigator.clipboard.writeText(shown?shown.textContent:(translation||copy)).then(()=>toast("Copy copiada ✓")).catch(()=>toast("Não deu para copiar",true));});
  openOverlay("#copyPop");
}
$("#copyPopClose").addEventListener("click",()=>closeOverlay("#copyPop"));

/* ===== OVERLAY (com foco acessível) ===== */
let lastFocused=null;
const FOCUSABLE='a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]';
function openOverlay(s){
  const el=$(s);if(!el)return;
  lastFocused=document.activeElement;
  el.classList.add("open");document.body.style.overflow="hidden";el.scrollTop=0;
  const f=$$(FOCUSABLE,el).filter(x=>x.offsetParent!==null);
  if(f.length)setTimeout(()=>{try{f[0].focus({preventScroll:true});}catch(e){}},30);
}
function closeOverlay(s){
  const el=$(s);if(!el)return;
  el.classList.remove("open");document.body.style.overflow="";activeZone=null;
  if(!$(".overlay.open")&&lastFocused&&lastFocused.focus){try{lastFocused.focus({preventScroll:true});}catch(e){}lastFocused=null;}
}
$("#tagEditorOptions").addEventListener("click",event=>{const button=event.target.closest("[data-tag-choice]");if(!button)return;const key=button.dataset.tagChoice;if(!OFFER_TAGS[key])return;tagDraft=tagDraft.includes(key)?tagDraft.filter(tag=>tag!==key):[...tagDraft,key];if(key==="scale"&&tagDraft.includes("scale"))tagDraft=tagDraft.filter(tag=>tag!=="potential");if(key==="potential"&&tagDraft.includes("potential"))tagDraft=tagDraft.filter(tag=>tag!=="scale");$$("[data-tag-choice]",$("#tagEditorOptions")).forEach(choice=>choice.setAttribute("aria-pressed",String(tagDraft.includes(choice.dataset.tagChoice))));});
$("#tagEditorClose").addEventListener("click",()=>closeOverlay("#tagOverlay"));
$("#tagEditorSave").addEventListener("click",saveTagEditor);
/* prende o Tab dentro do modal aberto no topo */
document.addEventListener("keydown",e=>{
  if(e.key!=="Tab")return;
  const ov=$$(".overlay.open").filter(o=>o.id!=="lightbox").pop();
  if(!ov)return;
  const f=$$(FOCUSABLE,ov).filter(x=>x.offsetParent!==null);
  if(!f.length)return;
  const first=f[0],last=f[f.length-1];
  if(!ov.contains(document.activeElement)){e.preventDefault();first.focus({preventScroll:true});}
  else if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus({preventScroll:true});}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus({preventScroll:true});}
},true);
$$(".overlay").forEach(ov=>ov.addEventListener("mousedown",e=>{if(e.target!==ov)return;if(ov.id==="confirmOverlay"){closeOverlay("#confirmOverlay");return;}if(ov.id==="formOverlay"){attemptCloseForm();return;}if(ov.id==="simpleFormOverlay"){attemptCloseSimpleForm();return;}closeOverlay("#"+ov.id);}));
document.addEventListener("keydown",e=>{
  if($("#lightbox").classList.contains("open")){
    if(e.key==="Escape"){e.preventDefault();closeLightbox();return;}
    if(e.key==="ArrowLeft"){e.preventDefault();lbShow(lbIndex-1);return;}
    if(e.key==="ArrowRight"){e.preventDefault();lbShow(lbIndex+1);return;}
    if(e.key==="Tab"){const f=$$('a[href],button:not([hidden]):not([disabled])',$("#lightbox"));if(f.length){const first=f[0],last=f[f.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}return;}
  }
  if(e.key!=="Escape")return;if($("#confirmOverlay").classList.contains("open")){closeOverlay("#confirmOverlay");return;}if($("#formOverlay").classList.contains("open")){attemptCloseForm();return;}if($("#simpleFormOverlay").classList.contains("open")){attemptCloseSimpleForm();return;}if($("#viewOverlay").classList.contains("open")){closeView();return;}$$(".overlay.open").forEach(ov=>closeOverlay("#"+ov.id));
});

/* ===== SEÇÕES (swipes) ===== */
function switchSection(key){
  if(activeSection===key){if(isMobileNav())closeSideNav();return;}
  activeSection=key;activeNiche="";activeBrand="";critPlatform="all";
  if(isMobileNav())closeSideNav();
  renderGrid();
  window.scrollTo({top:0,behavior:"smooth"});
}
function setSectionHeader(){
  const cfg=sectionCfg(activeSection);
  const cc=isToolSection(activeSection);
  document.body.classList.add("admin-preview");
  document.body.classList.toggle("chatmode",isChatSection(activeSection));
  document.body.classList.toggle("toolmode",cc);
  const mr=$(".page .meta-row");if(mr)mr.style.display=cc?"none":"";
  const identity=$("#pageIdentity");if(identity)identity.style.display=cc?"none":"";
  const nbt=$("#newBtn");if(nbt)nbt.style.display=cc||!cfg.newLabel?"none":"";
  const nt=$("#nicheToggle");if(nt)nt.style.display="";   /* menu sempre disponível no mobile */
  const sw=$(".topbar .search");if(sw)sw.style.display=cc?"none":"";
  if(cc)return;
  const division=$("#divisionPill"),brands=BRANDS_NAV_SECTIONS.has(activeSection),history=activeSection==="updates";
  if(division){
    division.classList.toggle("division-pill--brands",brands);
    division.classList.toggle("division-pill--history",history);
    division.innerHTML=history
      ?`<span class="division-pill__mark">UP</span><span class="division-pill__copy"><span class="division-pill__name">Atualizações</span><span class="division-pill__desc">Registro de materiais</span></span>`
      :brands
        ?`<span class="division-pill__mark">BR</span><span class="division-pill__copy"><span class="division-pill__name">FEG Brands</span><span class="division-pill__desc">DTC Intelligence</span></span>`
        :`<span class="division-pill__mark">DR</span><span class="division-pill__copy"><span class="division-pill__name">FEG DR</span><span class="division-pill__desc">Direct Response</span></span>`;
  }
  const brandHub=activeSection==="brandcreative";
  const selectedInsiderItem=isInsiderAdminArea()&&activeBrand?offers.find(o=>sectionOf(o)==="brandsvalidated"&&insiderProductKey(o)===activeBrand):null;
  const selectedHubItem=brandHub&&activeBrand?brandHubItems().find(o=>brandKeyOf(o)===activeBrand):null;
  const lbl=$("#statLabel");if(lbl)lbl.textContent=brandHub?"Materiais":cfg.statLabel;
  const nb=$(".newBtn-txt");if(nb)nb.textContent=cfg.newLabel;
  const si=$("#searchInput");if(si)si.placeholder=brandHub?"Buscar nicho, marca, oferta ou criativo...":cfg.searchPlaceholder;
  const title=$("#pageTitle"),description=$("#pageDescription");
  const adminBrands=activeSection==="brandsvalidated";
  if(title)title.textContent=selectedInsiderItem?insiderProductName(selectedInsiderItem):brandHub?(selectedHubItem?brandNameOf(selectedHubItem):"Swipe por nicho e marca"):adminBrands?"Ofertas Brands":cfg.label;
  if(description)description.innerHTML=selectedInsiderItem?esc(insiderCategoryOf(selectedInsiderItem))+" · produto do acervo Brands":brandHub?(selectedHubItem?esc(brandHubNicheOf(selectedHubItem)||"Sem nicho")+" · Criativos desta marca":"Criativos organizados por nicho e marca."):adminBrands?"<b>Ofertas Brands</b> — produtos por categoria, bibliotecas, histórico de anúncios e métricas da BM quando disponíveis.":cfg.subHtml||"";
}
function brainNameKey(value){return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();}
function fegsysPeriodLabel(){const labels={today:"Hoje",yesterday:"Ontem","7d":"Últimos 7 dias","14d":"Últimos 14 dias","30d":"Últimos 30 dias","90d":"Últimos 90 dias",custom:"Período personalizado"};return labels[brainPeriod]||labels["7d"];}
function fegsysLoadKey(){return [brainPeriod,brainDateFrom,brainDateTo].join("|");}
async function loadFegsysBrain(force=false){
  if(activeSection!=="megabrainfegsys"||fegsysLoading)return;
  const key=fegsysLoadKey();if(!force&&fegsysLoadedKey===key)return;
  fegsysLoading=true;fegsysError="";renderSubFilter();
  try{
    const session=await sb.auth.getSession(),token=session.data&&session.data.session&&session.data.session.access_token;
    if(!token)throw new Error("sessão expirada");
    const p=new URLSearchParams({period:brainPeriod});if(brainPeriod==="custom"){if(brainDateFrom)p.set("from",brainDateFrom);if(brainDateTo)p.set("to",brainDateTo);}if(force&&isAdmin)p.set("refresh","1");
    const request=accessToken=>fetch("/.netlify/functions/fegsys-megabrain?"+p.toString(),{headers:{Authorization:"Bearer "+accessToken,"X-Feg-Auth":"Bearer "+accessToken},cache:"no-store"});
    let response=await request(token);
    if(response.status===401){const refreshed=await sb.auth.refreshSession();const fresh=refreshed.data&&refreshed.data.session&&refreshed.data.session.access_token;if(fresh)response=await request(fresh);}
    const result=await response.json().catch(()=>({}));if(!response.ok||!result.ok)throw new Error(result.error||"não foi possível consultar o FEGSYS");
    const manual=new Map(offers.filter(o=>sectionOf(o)==="megabrain").map(o=>[brainNameKey((o.data||{}).nome),o]).filter(([key])=>key));
    const incoming=(result.cards||[]).filter(card=>card&&card.nome);
    fegsysMatches=incoming.filter(card=>manual.has(brainNameKey(card.nome))).length;
    if(brainPeriod==="custom"){if(!brainDateFrom)brainDateFrom=result.range&&result.range.from||"";if(!brainDateTo)brainDateTo=result.range&&result.range.to||"";}
    fegsysCards=incoming.map(card=>{
      const manualItem=manual.get(brainNameKey(card.nome)),existing=manualItem&&manualItem.data||{};
      const video=card.video_url||existing.video||"",print=card.thumbnail_url||existing.print||"",copy=card.copy_text||existing.copy||existing.transcricao||"",copyLink=card.copy_url||existing.copyLink||existing.copyVslLink||existing.copyCriativoLink||"";
      return{id:card.id,created_at:result.syncedAt,data:{kind:"megabrain",source:"fegsys",nome:card.nome,autor:existing.autor||"FEGSYS",nicho:existing.nicho||"",platforms:card.platforms||[],channels:card.channels||[],shops:card.shops||[],salesPlatforms:card.sales_platforms||[],fegsysRange:result.range,fegsysSources:result.sourceStatus||null,fegsysMetrics:card,metricaTipo:"vendas",metricaValor:String(Math.round(+card.conversions||0)),metricaPendente:false,video,linkDrive:card.drive_video_view_url||existing.linkDrive||"",print,copy,copyLink,driveStatus:card.drive_status||"",driveVideoName:card.drive_video_name||"",driveCopyName:card.drive_copy_name||"",matchedManual:!!manualItem,videoMissing:!video,copyMissing:!(copy||copyLink)}};
    });
    fegsysTotals=result.totals||null;fegsysSyncedAt=result.syncedAt||"";fegsysCoverage=result.coverage||null;fegsysSourceStatus=result.sourceStatus||null;fegsysLoadedKey=key;
  }catch(error){fegsysCards=[];fegsysTotals=null;fegsysSourceStatus=null;fegsysError=String(error&&error.message||error);fegsysLoadedKey=key;}
  finally{fegsysLoading=false;renderGrid();}
}
function fegsysPanelHtml(){
  const unavailable=[];if(!fegsysSalesReady(fegsysSourceStatus))unavailable.push("vendas aguardando acesso a marts_feg.mart_criativos_diario");if(fegsysSourceStatus&&fegsysSourceStatus.drive&&fegsysSourceStatus.drive.available===false)unavailable.push("arquivos do Drive aguardando acesso");if(fegsysSourceStatus&&fegsysSourceStatus.drive&&fegsysSourceStatus.drive.available&&fegsysSourceStatus.drive.files===0)unavailable.push("nenhum arquivo acessível no Drive");
  const driveRoots=fegsysSourceStatus&&fegsysSourceStatus.drive&&Array.isArray(fegsysSourceStatus.drive.roots)?fegsysSourceStatus.drive.roots:[];
  const inaccessibleRoots=driveRoots.filter(root=>!root.available).length;if(inaccessibleRoots)unavailable.push(`${inaccessibleRoots} pasta${inaccessibleRoots>1?"s":""} do Drive aguardando compartilhamento`);
  const driveReady=fegsysSourceStatus&&fegsysSourceStatus.drive&&fegsysSourceStatus.drive.available&&fegsysSourceStatus.drive.files>0?` · ${fegsysSourceStatus.drive.matchedVideos||0} vídeos e ${fegsysSourceStatus.drive.matchedCopies||0} copies encontrados`:"";
  const status=fegsysLoading?"Atualizando dados…":fegsysError?fegsysError:(fegsysSyncedAt?`Sincronizado ${relTime(fegsysSyncedAt)} · ${fegsysCards.length} criativos${fegsysMatches?` · ${fegsysMatches} cruzados com o acervo manual`:""}${driveReady}${unavailable.length?` · ${unavailable.join(" · ")}`:""}`:"Preparando a primeira sincronização");
  const periods=[["today","Hoje"],["yesterday","Ontem"],["7d","7 dias"],["14d","14 dias"],["30d","30 dias"],["90d","90 dias"],["custom","Personalizado"]];
  const totals=fegsysTotals||{},salesReady=fegsysSalesReady(fegsysSourceStatus),sales=salesReady?fmtNum(totals.conversions||0):"—";
  return `<section class="fegsys-panel" aria-label="Vendas sincronizadas do Fegsys"><div class="fegsys-panel__top"><div class="fegsys-panel__identity"><span class="fegsys-panel__mark">${ic("pulse")}</span><div><div class="fegsys-panel__title">Fegsys <span class="live-state"><span class="live-dot" aria-hidden="true"></span>Ao vivo</span></div><div class="fegsys-panel__status${fegsysError||unavailable.length?" is-error":""}">${esc(status)}</div></div></div><div class="fegsys-periods" aria-label="Período dos dados">${periods.map(([value,label])=>`<button type="button" class="fegsys-period${brainPeriod===value?" active":""}" data-fegsys-period="${value}">${label}</button>`).join("")}</div></div><div class="fegsys-panel__body"><div class="fegsys-controls"><label class="fegsys-filter fegsys-filter--name">Nome do criativo<input type="search" id="brainFegsysName" value="${esc(searchTerm)}" placeholder="Buscar por nome"></label><label class="fegsys-filter">Vendas mínimas<input type="number" min="0" step="1" id="brainSalesMin" value="${esc(fegsysSalesMin)}" placeholder="0"></label><label class="fegsys-filter">Vendas máximas<input type="number" min="0" step="1" id="brainSalesMax" value="${esc(fegsysSalesMax)}" placeholder="Sem limite"></label>${brainPeriod==="custom"?`<div class="fegsys-custom"><label class="fegsys-date">De<input type="date" id="brainDateFrom" value="${esc(brainDateFrom)}"></label><label class="fegsys-date">Até<input type="date" id="brainDateTo" value="${esc(brainDateTo)}"></label><button type="button" class="btn btn--outline btn--sm" id="brainApplyDates">Aplicar</button></div>`:""}${isAdmin?`<button type="button" class="btn btn--outline btn--sm" id="brainFegsysRefresh"${fegsysLoading?" disabled":""}>${ic("pulse")}${fegsysLoading?"Atualizando…":"Atualizar agora"}</button>`:""}</div><div class="fegsys-summary"><span class="fegsys-summary__item"><span>Vendas</span><strong class="accent">${sales}</strong></span></div></div></section>`;
}
function wireFegsysPanel(el){
  $$('[data-fegsys-period]',el).forEach(button=>button.addEventListener("click",()=>{brainPeriod=button.dataset.fegsysPeriod;if(brainPeriod!=="custom"){brainDateFrom="";brainDateTo="";}fegsysLoadedKey="";navigate(currentPath(),{replace:true});}));
  const apply=$("#brainApplyDates");if(apply)apply.addEventListener("click",()=>{brainDateFrom=$("#brainDateFrom").value;brainDateTo=$("#brainDateTo").value;fegsysLoadedKey="";navigate(currentPath(),{replace:true});});
  const refresh=$("#brainFegsysRefresh");if(refresh)refresh.addEventListener("click",()=>{fegsysLoadedKey="";loadFegsysBrain(true);});
  const name=$("#brainFegsysName");if(name)name.addEventListener("input",()=>{searchTerm=name.value;const top=$("#searchInput");if(top)top.value=searchTerm;try{history.replaceState(null,"",currentPath());}catch(_){}clearTimeout(gridSearchTimer);gridSearchTimer=setTimeout(()=>renderGrid(true),140);});
  const applySales=()=>{fegsysSalesMin=$("#brainSalesMin")?.value||"";fegsysSalesMax=$("#brainSalesMax")?.value||"";navigate(currentPath(),{replace:true});};
  [$("#brainSalesMin"),$("#brainSalesMax")].filter(Boolean).forEach(input=>input.addEventListener("change",applySales));
}
function brandNavHtml(){
  if(!BRAND_SECTIONS.has(activeSection))return"";
  if(activeSection==="brandcreative")return"";
  const entries=[["brandsvalidated","Ofertas Brands"]];
  return `<div class="seg" aria-label="Áreas da FEG Brands">${entries.map(([section,label])=>{const count=offers.filter(o=>sectionOf(o)===section).length;return `<a class="seg-btn${activeSection===section?" active":""}" data-nav href="${esc(listPath(section,""))}">${esc(label)} · ${count}</a>`;}).join("")}</div>`;
}
function renderSubFilter(){
  const el=$("#subFilter");if(!el)return;
  if(isToolSection(activeSection)){el.innerHTML="";el.style.display="none";return;}
  if(activeSection==="oferta"||BRAND_OFFER_SECTIONS.has(activeSection)){
    el.style.display="";
    const options=[["active_ads","Anúncios ativos"],["active_days","Dias ativos"],["spend_7d","Maior gasto · 7 dias"],["sales_7d","Mais vendas · 7 dias"]];
    const sectionItems=offers.filter(o=>sectionOf(o)===activeSection),reference=offerSortReference(sectionItems),health=automationCounts(activeSection);
    const brandNav=brandNavHtml();
    const healthHtml=isAdmin?`<div class="automation-health" aria-label="Situação das automações"><span class="automation-health__item">Análises na fila <strong>${health.pending}</strong></span><span class="automation-health__item">Falhas <strong>${health.failed}</strong></span></div>`:"";
    const migrationButton=isAdmin&&activeSection==="oferta"&&new URLSearchParams(location.search).get("migration")==="offer-batch-july29"
      ?`<button type="button" class="btn btn--outline btn--sm" id="offerBatchApply">${ic("pulse")}Aplicar lote consolidado</button>`:"";
    const tagControl=activeSection==="brandsvalidated"&&(isAdmin||BRAND_TAGS_PUBLISHED)?`<label class="sort-control sort-control--tag"><span>Filtrar por tag</span><select id="offerTagFilter" aria-label="Filtrar ofertas por tag"><option value="">Todas as tags</option>${Object.entries(OFFER_TAGS).map(([key,tag])=>`<option value="${key}"${offerTagFilter===key?" selected":""}>${tag.label}</option>`).join("")}</select></label>`:"";
    el.innerHTML=`<div class="subfilter__row sort-panel">${brandNav}<label class="sort-control"><span>Ordenar por</span><select id="offerSort" aria-label="Ordenar ofertas">${options.map(([value,label])=>`<option value="${value}"${offerSort===value?" selected":""}>${label}</option>`).join("")}</select></label><label class="sort-control" style="min-width:150px"><span>Direção</span><select id="offerDirection" aria-label="Direção da ordenação"><option value="desc"${offerDirection==="desc"?" selected":""}>Maior primeiro</option><option value="asc"${offerDirection==="asc"?" selected":""}>Menor primeiro</option></select></label>${tagControl}<div class="sort-reference" role="status" aria-live="polite">${reference?`Referência mais recente: ${esc(fmtDateShort(reference))}`:"Sem dados deste indicador"}</div>${healthHtml}${migrationButton}</div>`;
    const changeSort=(key,value)=>{const panel=$(".sort-panel",el),message=$(".sort-reference",el);panel.setAttribute("aria-busy","true");if(message)message.textContent="Atualizando ordenação…";setTimeout(()=>{if(key==="sort")offerSort=value;else if(key==="tag")offerTagFilter=value;else offerDirection=value;navigate(currentPath(),{replace:true});},0);};
    $("#offerSort").addEventListener("change",event=>changeSort("sort",event.target.value));
    $("#offerDirection").addEventListener("change",event=>changeSort("direction",event.target.value));
    $("#offerTagFilter")?.addEventListener("change",event=>changeSort("tag",event.target.value));
    const batchApply=$("#offerBatchApply");
    if(batchApply)batchApply.addEventListener("click",async()=>{
      batchApply.disabled=true;batchApply.innerHTML=ic("pulse")+"Consolidando…";
      try{
        const result=await runAdminOfferBatch("apply");
        toast(`${result.summary?.offersCreated||0} ofertas criadas · ${result.summary?.offersUpdated||0} atualizadas · ${result.summary?.duplicateOffersRemoved||0} duplicadas removidas`);
      }catch(error){toast(String(error&&error.message||error),true);}
      finally{batchApply.disabled=false;batchApply.innerHTML=ic("pulse")+"Lote consolidado aplicado";}
    });
    return;
  }
  if(activeSection==="tiktok"){
    el.style.display="";
    const opts=[["views","Mais views"],["engajamento","Engajamento"],["likes","Likes"],["comentarios","Comentários"],["recente","Recentes"]];
    const scoped=offers.filter(o=>sectionOf(o)==="tiktok"&&(!activeNiche||sameNiche(nicheOf(o),activeNiche))&&(!tiktokSubniche||sameNiche((o.data||{}).subnicho||"Geral",tiktokSubniche)));
    const authors=[...new Set(scoped.map(o=>String((o.data||{}).autor||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"pt-BR"));
    el.innerHTML=`<div class="subfilter__row"><label class="brainfilter"><span>Perfil orgânico</span><select id="tiktokAuthorFilter" aria-label="Filtrar perfil orgânico"><option value="">Todos os perfis</option>${authors.map(author=>`<option value="${esc(author)}"${tiktokAuthor===author?" selected":""}>@${esc(author)}</option>`).join("")}</select></label><div class="seg">${opts.map(([v,l])=>`<button type="button" class="seg-btn${tiktokSort===v?" active":""}" data-ttsort="${v}">${l}</button>`).join("")}</div></div>`;
    $("#tiktokAuthorFilter",el).addEventListener("change",e=>{tiktokAuthor=e.target.value;try{history.replaceState(null,"",currentPath());}catch(_){}renderGrid(true);});
    $$(".seg-btn",el).forEach(b=>b.addEventListener("click",()=>{tiktokSort=b.dataset.ttsort;try{history.replaceState(null,"",currentPath());}catch(_){}renderGrid(true);}));
    return;
  }
  if(activeSection==="megabrain"){
    el.style.display="";
    const opts=[["metrica","Mais vendas / faturamento"],["recente","Recentes"],["az","A–Z"]];
    const authors=[...new Set(offers.filter(o=>sectionOf(o)==="megabrain").map(o=>String((o.data||{}).autor||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"pt-BR"));
    const niches=[...new Set(offers.filter(o=>sectionOf(o)==="megabrain").map(nicheOf).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"pt-BR"));
    const need=isAdmin?offers.filter(brainNeedsImport).length:0;
    const importBtn=need?`<button type="button" class="btn btn--outline btn--sm" id="brainImportAll" title="Baixa os criativos do Drive e salva no Storage (permanente)">${ic("download")}Importar do Drive (${need})</button>`:"";
    const batchBtn=isAdmin?`<button type="button" class="btn btn--outline btn--sm" id="brainBatchImport" title="Importa uma pasta com megabrain-import.json e os vídeos correspondentes">${ic("upload")}Importar lote</button>`:"";
    const authorOptions=`<option value="">Todos os copywriters</option>${authors.map(a=>`<option value="${esc(a)}"${brainAuthor===a?" selected":""}>${esc(a)}</option>`).join("")}`;
    const nicheOptions=`<option value="">Todos os nichos</option>${niches.map(n=>`<option value="${esc(n)}"${activeNiche===n?" selected":""}>${esc(n)}</option>`).join("")}`;
    el.innerHTML=`<div class="subfilter__row"><div class="brainfilters"><label class="brainfilter"><span>Copywriter</span><select id="brainAuthorFilter" aria-label="Filtrar por copywriter">${authorOptions}</select></label><label class="brainfilter"><span>Nicho</span><select id="brainNicheFilter" aria-label="Filtrar por nicho">${nicheOptions}</select></label></div><div class="seg">${opts.map(([v,l])=>`<button type="button" class="seg-btn${brainSort===v?" active":""}" data-brainsort="${v}">${l}</button>`).join("")}</div>${importBtn}${batchBtn}</div>`;
    $$(".seg-btn",el).forEach(b=>b.addEventListener("click",()=>{brainSort=b.dataset.brainsort;try{history.replaceState(null,"",currentPath());}catch(_){}renderGrid(true);}));
    const af=$("#brainAuthorFilter");if(af)af.addEventListener("change",()=>{brainAuthor=af.value;navigate(currentPath());});
    const nf=$("#brainNicheFilter");if(nf)nf.addEventListener("change",()=>{activeNiche=nf.value;navigate(currentPath());});
    const ib=$("#brainImportAll");if(ib)ib.addEventListener("click",importAllBrainDrive);
    const bb=$("#brainBatchImport");if(bb)bb.addEventListener("click",pickBrainBatchImport);
    return;
  }
  if(activeSection==="megabrainfegsys"){
    el.style.display="";
    const opts=[["metrica","Mais vendas"],["recente","Recentes"],["az","A–Z"]];
    el.innerHTML=`${fegsysPanelHtml()}<div class="subfilter__row" style="margin-top:12px"><div class="seg">${opts.map(([v,l])=>`<button type="button" class="seg-btn${brainSort===v?" active":""}" data-brainsort="${v}">${l}</button>`).join("")}</div></div>`;
    $$(".seg-btn",el).forEach(b=>b.addEventListener("click",()=>{brainSort=b.dataset.brainsort;try{history.replaceState(null,"",currentPath());}catch(_){}renderGrid(true);}));
    wireFegsysPanel(el);
    return;
  }
  if(activeSection!=="criativo"&&activeSection!=="brandcreative"&&activeSection!=="organic"){el.innerHTML="";el.style.display="none";return;}
  el.style.display="";
  if(activeSection==="organic"){
    const bulk=isAdmin?`<button type="button" class="btn btn--outline btn--sm" id="creativeBatchImport">${ic("upload")}Importar pasta de orgânicos</button><input id="creativeBatchFiles" type="file" accept="video/mp4,video/webm,video/quicktime,video/*" multiple webkitdirectory directory hidden>`:"";
    el.innerHTML=`<div class="subfilter__row"><div class="sort-reference" role="status">Acervo único, sem separação por nichos.</div>${bulk}</div>`;
    const batchButton=$("#creativeBatchImport"),batchFiles=$("#creativeBatchFiles");
    if(batchButton&&batchFiles){batchButton.addEventListener("click",()=>batchFiles.click());batchFiles.addEventListener("change",()=>{const files=[...(batchFiles.files||[])];if(files.length)importCreativeBatch(files,"",false,true);});}
    return;
  }
  const opts=[["meta","Meta Ads"]];
  const bulk=isAdmin?`<button type="button" class="btn btn--outline btn--sm" id="creativeBatchImport">${ic("upload")}${activeSection==="brandcreative"?"Subir Balls n Brains":"Importar pasta"}</button><input id="creativeBatchFiles" type="file" accept="${activeSection==="brandcreative"?"video/*,image/*":"video/mp4,video/webm,video/quicktime,video/*,application/json,.json"}" multiple${activeSection==="brandcreative"?"":" webkitdirectory directory"} hidden>`:"";
  el.innerHTML=`<div class="subfilter__row">${brandNavHtml()}<div class="seg">${opts.map(([v,l])=>`<span class="seg-btn active"><span class="sdot" style="background:var(--fb)"></span>${l}</span>`).join("")}</div>${bulk}</div>`;
  const batchButton=$("#creativeBatchImport"),batchFiles=$("#creativeBatchFiles");
  if(batchButton&&batchFiles){
    batchButton.addEventListener("click",()=>batchFiles.click());
    batchFiles.addEventListener("change",()=>{const files=[...(batchFiles.files||[])];if(files.length)importCreativeBatch(files,activeNiche||"Emagrecimento",activeSection==="brandcreative");});
  }
}

/* ===== FEGUINHO COPY CHIEF (Beta) ===== */
const FEGUINHO_FN="/.netlify/functions/feguinho";
const CC_TIMEOUT_MS=210000;
let ccTool="gerar", ccFmt="anuncio", ccBusy=false, ccAbort=null, ccHistory=[];
const CC_ORDER=["gerar","dissecar","modelar"];
const CC_TOOLS={
  gerar:{icon:"wand",label:"Gerar Ad / VSL",
    desc:"Dê um mecanismo, ângulo ou ideia e receba hooks + corpo (ou estrutura de VSL) clonados dos criativos com mais vendas do vault e do Mega Brain.",
    ph:"Descreva a ideia, o mecanismo ou o ângulo. Ex: “sal amargo japonês tomado antes do café que destrava o metabolismo lento depois dos 40”.",
    hint:"Extrai os padrões dos campeões e entrega hooks + corpo (ou estrutura de VSL) no mesmo DNA.",cta:"Gerar com o Feguinho"},
  dissecar:{icon:"scissors",label:"Dissecar",
    desc:"Cole um anúncio ou VSL e o Feguinho quebra em blocos (Lead · História · Mecanismo · Oferta · Fechamento) pelo método Atlas, nomeando cada técnica.",
    ph:"Cole aqui a copy do anúncio (ou o roteiro da VSL) que você quer dissecar bloco a bloco.",
    hint:"Quebra a copy em blocos (Lead, História/Descoberta, Mecanismo do problema/solução, Oferta, Fechamento) pelo método Atlas.",cta:"Dissecar copy"},
  modelar:{icon:"layers",label:"Modelar",
    desc:"Cole um criativo campeão e receba variações mantendo o esqueleto vencedor — cada uma com um ângulo novo e dizendo de qual campeão veio.",
    ph:"Cole o criativo campeão (ou descreva-o) que você quer usar de molde para gerar variações.",
    hint:"Gera variações mantendo o esqueleto vencedor — indicando de qual campeão veio cada estrutura.",cta:"Modelar variações"}
};

/* ===== helpers de chat (compartilhados Feguinho + Furtado) ===== */
function chatThreadEl(id){const t=document.getElementById(id);if(t){const w=t.querySelector(".chat__welcome");if(w)w.remove();}return t;}
function chatPushUser(thread,chips,text){
  if(!thread)return null;
  const el=document.createElement("div");el.className="chat__msg chat__msg--user";
  el.innerHTML=`<div class="chat__bubble">${(chips&&chips.length)?`<div class="chat__utag">${chips.map(c=>`<span class="chat__chip">${c}</span>`).join("")}</div>`:""}<div class="chat__utext">${esc(text||"")}</div></div>`;
  thread.appendChild(el);return el;
}
function chatPushAI(thread,avIcon){
  const el=document.createElement("div");el.className="chat__msg chat__msg--ai";
  el.innerHTML=`<div class="chat__av">${ic(avIcon||"sparkles")}</div><div class="chat__bubble"><div class="chat__status"><span class="ccdot ccdot--on"></span>Conectando…</div><div class="chat__md"></div><div class="chat__aibar" hidden></div></div>`;
  thread.appendChild(el);
  return {el,status:el.querySelector(".chat__status"),md:el.querySelector(".chat__md"),bar:el.querySelector(".chat__aibar")};
}
const chatFollow=new WeakMap();
function chatWireFollow(thread){if(!thread||chatFollow.has(thread))return;const root=thread.closest(".chat"),button=document.createElement("button");button.type="button";button.className="chat__follow";button.textContent="Novas mensagens ↓";button.setAttribute("aria-label","Ir para as novas mensagens");root.appendChild(button);const state={follow:true,button};chatFollow.set(thread,state);thread.addEventListener("scroll",()=>{const near=thread.scrollHeight-thread.scrollTop-thread.clientHeight<72;state.follow=near;if(near)button.classList.remove("show");},{passive:true});button.addEventListener("click",()=>{state.follow=true;button.classList.remove("show");chatScroll(thread,true);});}
function chatScroll(thread,force=false){if(!thread)return;chatWireFollow(thread);const state=chatFollow.get(thread);if(force||state.follow){thread.scrollTop=thread.scrollHeight;state.button.classList.remove("show");}else state.button.classList.add("show");}
function chatAutosize(ta){if(!ta)return;ta.style.height="auto";const chat=ta.closest(".chat"),limit=Math.max(120,Math.floor((chat?chat.clientHeight:525)*.4));ta.style.height=Math.min(limit,ta.scrollHeight)+"px";ta.style.overflowY=ta.scrollHeight>limit?"auto":"hidden";}
function chatBufferedMarkdown(md,renderer,thread,getText){let timer=0;const flush=()=>{if(timer){clearTimeout(timer);timer=0;}md.innerHTML=renderer(getText());chatScroll(thread);};return{queue(){if(!timer)timer=setTimeout(flush,80);},flush};}
function ccNorm(s){return String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"");}
function ccMega(nicho){const nz=ccNorm(nicho);
  return offers.filter(o=>(o.data||{}).kind==="megabrain"&&ccNorm(o.data.nicho)===nz)
    .sort((a,b)=>(Number((b.data||{}).metricaValor)||0)-(Number((a.data||{}).metricaValor)||0)).slice(0,6)
    .map(o=>{const d=o.data||{};return{nome:d.nome||"",autor:d.autor||"",tipo:d.metricaTipo||"vendas",valor:d.metricaValor||"",copy:(d.copy||d.transcricao||"").slice(0,600)};});}
function ccTiktok(nicho){const nz=ccNorm(nicho);
  return offers.filter(o=>(o.data||{}).kind==="tiktok"&&ccNorm(o.data.nicho)===nz)
    .sort((a,b)=>(Number((b.data||{}).views)||0)-(Number((a.data||{}).views)||0)).slice(0,6)
    .map(o=>{const d=o.data||{};return{cap:(d.caption||d.nome||"").slice(0,140),views:Number(d.views)||0,eng:Number(d.engajamento)||0,url:d.url||""};});}

function ccInline(s){s=esc(s);s=s.replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>");s=s.replace(/`([^`]+)`/g,"<code>$1</code>");return s;}
function ccMarkdown(src){
  const lines=String(src||"").replace(/\r/g,"").split("\n");let html="",i=0;
  const isTbl=l=>/^\s*\|.*\|\s*$/.test(l),isSep=l=>l.includes("-")&&/^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(l);
  while(i<lines.length){let l=lines[i];
    if(!l.trim()){i++;continue;}
    let m=l.match(/^(#{1,6})\s+(.*)$/);
    if(m){const lv=Math.min(m[1].length+2,6);html+=`<h${lv}>${ccInline(m[2])}</h${lv}>`;i++;continue;}
    if(/^\s*([-*_])\1\1[\s-*_]*$/.test(l)){html+="<hr>";i++;continue;}
    if(isTbl(l)&&i+1<lines.length&&isSep(lines[i+1])){
      const head=l.split("|").slice(1,-1).map(c=>c.trim());i+=2;const rows=[];
      while(i<lines.length&&isTbl(lines[i])){rows.push(lines[i].split("|").slice(1,-1).map(c=>c.trim()));i++;}
      html+=`<div class="ccmd-tblwrap"><table class="ccmd-tbl"><thead><tr>${head.map(c=>`<th>${ccInline(c)}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${ccInline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;continue;}
    if(/^\s*>\s?/.test(l)){const q=[];while(i<lines.length&&/^\s*>\s?/.test(lines[i])){q.push(lines[i].replace(/^\s*>\s?/,""));i++;}html+=`<blockquote>${ccInline(q.join(" "))}</blockquote>`;continue;}
    if(/^\s*[-*+]\s+/.test(l)){const it=[];while(i<lines.length&&/^\s*[-*+]\s+/.test(lines[i])){it.push(lines[i].replace(/^\s*[-*+]\s+/,""));i++;}html+=`<ul>${it.map(t=>`<li>${ccInline(t)}</li>`).join("")}</ul>`;continue;}
    if(/^\s*\d+[.)]\s+/.test(l)){const it=[];while(i<lines.length&&/^\s*\d+[.)]\s+/.test(lines[i])){it.push(lines[i].replace(/^\s*\d+[.)]\s+/,""));i++;}html+=`<ol>${it.map(t=>`<li>${ccInline(t)}</li>`).join("")}</ol>`;continue;}
    const para=[l];i++;
    while(i<lines.length&&lines[i].trim()&&!/^(#{1,6}\s|\s*[-*+]\s|\s*\d+[.)]\s|\s*>\s|\s*\|)/.test(lines[i])){para.push(lines[i]);i++;}
    html+=`<p>${ccInline(para.join(" "))}</p>`;
  }
  return html;
}
function ccApplyTool(){
  const t=CC_TOOLS[ccTool]||CC_TOOLS.gerar;
  const inp=$("#ccInput");if(inp)inp.placeholder=t.ph;
  const hint=$("#ccModeHint span");if(hint)hint.textContent=t.hint;
  const run=$("#ccRun");if(run)run.title=t.cta+" — Enter envia · Shift+Enter quebra a linha";
  $$("#ccModes .chat__mode").forEach(b=>b.classList.toggle("active",b.dataset.tool===ccTool));
}
function renderCopyChief(){
  const area=$("#gridArea");if(!area)return;
  if($("#cchief"))return; // já montado — não destrói a conversa em andamento
  const icard=k=>{const t=CC_TOOLS[k];return `<button type="button" class="chat__icard" data-setmode="${k}"><div class="chat__icard__t">${ic(t.icon)}${esc(t.label)}</div><p>${esc(t.desc)}</p><span class="chat__icard__go">${ic("wand")}Usar este modo</span></button>`;};
  area.innerHTML=`<div class="chat chat--feguinho chat--animated" id="cchief">
    <div class="chat__top"><strong>Feguinho — Copy Chief IA</strong><span class="chat__beta">Beta</span></div>
    <div class="chat__thread" id="ccThread">
      <div class="chat__welcome">
        <div class="chat__mark">${ic("sparkles")}</div>
        <div class="chat__wtitle">Feguinho — Copy Chief IA <span class="chat__beta">Beta</span></div>
        <p class="chat__wsub">Seu chefe de copy que <b>modela o que já vendeu</b> (vault + Mega Brain) e sugere hooks do Radar TikTok. Escolha um <b>modo</b> abaixo, ajuste <b>nicho</b> e <b>formato</b> e mande sua ideia — a resposta vem aqui, como uma conversa.</p>
        <div class="chat__intro">${CC_ORDER.map(icard).join("")}</div>
      </div>
    </div>
    <div class="chat__composer">
      <div class="chat__modes" id="ccModes">${CC_ORDER.map(k=>`<button type="button" class="chat__mode${k===ccTool?" active":""}" data-tool="${k}">${ic(CC_TOOLS[k].icon)}${esc(CC_TOOLS[k].label)}</button>`).join("")}</div>
      <div class="chat__modehint" id="ccModeHint">${ic("info")}<span></span></div>
      <div class="chat__box">
        <textarea id="ccInput" class="chat__input" rows="1" placeholder=""></textarea>
        <div class="chat__boxfoot">
          <div class="chat__inline">
            <select id="ccNicho" class="chat__sel" title="Nicho">${NICHOS.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join("")}</select>
            <div class="chat__seg" id="ccFormato"><button type="button" class="active" data-fmt="anuncio">Anúncio</button><button type="button" data-fmt="vsl">VSL</button></div>
          </div>
          <button type="button" class="btn btn--outline btn--sm" id="ccCancel" hidden>Cancelar</button>
          <button class="chat__send" id="ccRun" aria-label="Enviar">${ic("send")}<span>Enviar</span></button>
        </div>
      </div>
    </div>
  </div>`;
  chatWireFollow($("#ccThread"));
  ccApplyTool();
  $$("#ccModes .chat__mode").forEach(b=>b.addEventListener("click",()=>{if(ccBusy)return;ccTool=b.dataset.tool;ccApplyTool();const t=$("#ccInput");if(t)t.focus();}));
  $$(".chat__icard",area).forEach(b=>b.addEventListener("click",()=>{if(ccBusy)return;ccTool=b.dataset.setmode;ccApplyTool();const t=$("#ccInput");if(t)t.focus();}));
  $$("#ccFormato button").forEach(b=>b.addEventListener("click",()=>{if(ccBusy)return;ccFmt=b.dataset.fmt;$$("#ccFormato button").forEach(x=>x.classList.toggle("active",x===b));}));
  $("#ccRun").addEventListener("click",ccRun);
  $("#ccCancel").addEventListener("click",()=>{if(ccAbort)ccAbort.abort();});
  const ta=$("#ccInput");
  ta.addEventListener("input",()=>chatAutosize(ta));
  ta.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.isComposing){e.preventDefault();ccRun();}});
}
async function ccRun(){
  if(ccBusy)return;
  const ta=$("#ccInput");const input=(ta.value||"").trim();
  if(!input){toast("Escreva algo para o Feguinho trabalhar",true);ta.focus();return;}
  const nicho=$("#ccNicho").value;
  const thread=chatThreadEl("ccThread");
  chatPushUser(thread,[esc(CC_TOOLS[ccTool].label),esc(nicho),ccFmt==="vsl"?"VSL":"Anúncio"],input);
  ta.value="";chatAutosize(ta);
  const ai=chatPushAI(thread,"sparkles");const md=ai.md,status=ai.status;
  chatScroll(thread);
  ccBusy=true;const btn=$("#ccRun"),cancel=$("#ccCancel");btn.disabled=true;btn.classList.add("is-busy");cancel.hidden=false;
  $$("#ccModes .chat__mode").forEach(x=>x.classList.add("is-locked"));
  let token="";try{const r=await sb.auth.getSession();token=(r.data&&r.data.session&&r.data.session.access_token)||"";}catch(e){}
  let acc="",gotAny=false,errMsg="",completed=false;const stream=chatBufferedMarkdown(md,ccMarkdown,thread,()=>acc);
  ccAbort=new AbortController();const timeout=setTimeout(()=>ccAbort&&ccAbort.abort(),CC_TIMEOUT_MS);
  try{
    const res=await fetch(FEGUINHO_FN,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},
      signal:ccAbort.signal,body:JSON.stringify({tool:ccTool,nicho,formato:ccFmt,input,history:ccHistory.slice(-6),mega:ccMega(nicho),tiktok:ccTiktok(nicho)})});
    if(!res.ok||!res.body){let j={};try{j=await res.json();}catch(e){}throw new Error(j.error||("HTTP "+res.status));}
    const reader=res.body.getReader(),dec=new TextDecoder();let buf="";
    for(;;){const {done,value}=await reader.read();if(done)break;
      buf+=dec.decode(value,{stream:true});let nl;
      while((nl=buf.indexOf("\n"))>=0){const line=buf.slice(0,nl);buf=buf.slice(nl+1);
        if(!line.trim())continue;let ev;try{ev=JSON.parse(line);}catch(e){continue;}
        if(ev.t==="text"){acc+=ev.v;if(!gotAny)status.innerHTML=`<span class="ccdot ccdot--on"></span>Escrevendo…`;gotAny=true;stream.queue();}
        else if(ev.t==="meta"){if(!gotAny)status.innerHTML=`<span class="ccdot ccdot--on"></span>Analisando os campeões${ev.sources?` · ${(ev.sources.ads||0)} ads · ${(ev.sources.mega||0)} do brain · ${(ev.sources.tiktok||0)} TikTok`:""}…`;}
        else if(ev.t==="status"){if(!gotAny)status.innerHTML=`<span class="ccdot ccdot--on"></span>Feguinho está pensando…`;}
        else if(ev.t==="error"){errMsg=ev.v||"erro";}
        else if(ev.t==="done"){completed=ev.ok===true;}
      }
    }
  }catch(e){errMsg=errMsg||(e&&e.name==="AbortError"?"operação cancelada ou tempo seguro excedido":(e.message||"falha na conexão"));}
  clearTimeout(timeout);ccAbort=null;stream.flush();ccBusy=false;btn.disabled=false;btn.classList.remove("is-busy");cancel.hidden=true;
  $$("#ccModes .chat__mode").forEach(x=>x.classList.remove("is-locked"));
  if(!gotAny){md.innerHTML=`<div class="ccerr">⚠ ${esc(errMsg||"o Feguinho não respondeu — tente de novo")}</div>`;status.innerHTML="";}
  else if(completed&&!errMsg){ccHistory.push({role:"user",content:input},{role:"assistant",content:acc});ccHistory=ccHistory.slice(-6);status.innerHTML=`<span class="ccdot ccdot--done"></span>Pronto`;
    ai.bar.hidden=false;ai.bar.innerHTML=`<button class="btn btn--outline btn--sm" data-cccopy>${ic("clipboard")}Copiar</button>`;
    const cb=ai.bar.querySelector("[data-cccopy]");if(cb)cb.addEventListener("click",()=>{navigator.clipboard.writeText(md.innerText||"").then(()=>toast("Copiado ✓"));});
  }else{status.innerHTML=`<span class="ccdot"></span>Resposta interrompida · não foi adicionada à conversa${errMsg?` · <span class="muted">${esc(errMsg)}</span>`:""}`;}
  if(completed&&!errMsg&&gotAny&&ccTool==="gerar"){const hooks=ccTiktok(nicho);
    if(hooks.length){const tt=document.createElement("div");tt.className="cchief__tt";
      tt.innerHTML=`<div class="cchief__tthead">${ic("play")}Vídeos do Radar sugeridos como hook — ${esc(nicho)}</div><div class="cchief__ttgrid">`+
        hooks.map(h=>`<a class="ccttcard" href="${esc(fixUrl(h.url))}" target="_blank" rel="noopener"><div class="ccttv">${kfmt(h.views)} views · ${(h.eng*100).toFixed(1)}% eng</div><div class="ccttc">${esc(h.cap||"—")}</div><div class="cctto">${ic("external")}Abrir no TikTok</div></a>`).join("")+`</div>`;
      ai.bar.parentNode.insertBefore(tt,ai.bar);
    }
  }
  chatScroll(thread);
}

/* ===== FURTADO - Copy Chief ADS IA (Beta) ===== */
const FURTADO_FN="/.netlify/functions/furtado";
const FUR_TIMEOUT_MS=270000,FUR_STORE="feg_furtado_session_v2";
const FUR_PHASES=[
  {key:"biblia",icon:"brain",label:"Bíblia do Nicho",cta:"Gerar Bíblia do Nicho",
    desc:"Cole 2 a 4 anúncios que já venderam (separe com -----) e a IA extrai o DNA do nicho — avatar, linguagem, mecanismo, promessa, provas e ângulos, enriquecido com o Mega Brain + vault.",
    hint:"Cole 2 a 4 anúncios validados — a IA extrai os padrões (enriquecidos com o Mega Brain + vault).",
    ph:"Cole aqui de 2 a 4 anúncios que JÁ VENDERAM, separando cada um com uma linha só com -----\n\nAnúncio 1…\n-----\nAnúncio 2…"},
  {key:"voc",icon:"message",label:"Voz do Prospect",cta:"Pesquisar VOC na web",
    desc:"Busca REAL na web em INGLÊS (mercado dos EUA) — Reddit, YouTube, TikTok, fóruns e reviews — as falas cruas do público (últimos ~30 dias), com a fonte. Vira munição de linguagem.",
    hint:"Busca em inglês (EUA) no Reddit/YouTube/TikTok/reviews a linguagem crua do público — últimos ~30 dias, com a fonte.",ph:""},
  {key:"remessa",icon:"layers",label:"Arquitetura da Remessa",cta:"Montar briefing",
    desc:"Informe a oferta e quantos corpos/hooks. A IA propõe o briefing de cada anúncio — promessa, ângulo, avatar, formato e hipótese de teste, para você aprovar antes de escrever.",
    hint:"Informe a oferta e quantos corpos/hooks — a IA propõe o briefing de cada anúncio.",
    ph:"Dados da oferta:\nExpert: …\nMecanismo do problema: …\nMecanismo da solução / nome chiclete: …\nPromessa principal: …"},
  {key:"escrita",icon:"wand",label:"Escrita dos Anúncios",cta:"Escrever remessa",
    desc:"Escolha quantos corpos e hooks por corpo serão escritos na remessa, prontos pra gravar e com lastro na Bíblia + VOC + briefing.",
    hint:"Escolha a quantidade de corpos e de hooks por corpo para escrever a remessa completa.",ph:""},
];
// Estado da conversa persistido localmente por usuário; respostas parciais nunca são salvas.
let furPhase="biblia", furBusy=false, furAbort=null, furRestoredKey="";
let furState={nicho:"",biblia:"",voc:"",briefing:"",nCorpos:3,nHooks:3,anuncios:[]};
function furStorageKey(){return FUR_STORE+":"+String(($("#whoami")&&$("#whoami").textContent)||"usuario").trim().toLowerCase();}
function furPersist(){try{localStorage.setItem(furStorageKey(),JSON.stringify({version:2,phase:furPhase,state:furState,updatedAt:new Date().toISOString()}));}catch(_){}}
function furRestore(){const key=furStorageKey();if(furRestoredKey===key)return;furRestoredKey=key;try{const saved=JSON.parse(localStorage.getItem(key)||"null");if(!saved||saved.version!==2||!saved.state)return;const s=saved.state;furPhase=FUR_PHASES.some(p=>p.key===saved.phase)?saved.phase:"biblia";furState={nicho:String(s.nicho||""),biblia:String(s.biblia||""),voc:String(s.voc||""),briefing:String(s.briefing||""),nCorpos:Math.max(1,Math.min(8,parseInt(s.nCorpos,10)||3)),nHooks:Math.max(1,Math.min(6,parseInt(s.nHooks,10)||3)),anuncios:Array.isArray(s.anuncios)?s.anuncios:[]};}catch(_){}}
function furMarkdown(src){return ccMarkdown(src);}   // reaproveita o renderer do Feguinho
function furHasDoc(k){if(k==="anuncios")return furState.anuncios.length>0;return !!String(furState[k]||"").trim();}
function furReset(){
  const nicho=furState.nicho||"";
  furState={nicho,biblia:"",voc:"",briefing:"",nCorpos:3,nHooks:3,anuncios:[]};
  furPhase="biblia";
  furPersist();
  const f=$("#furtado");if(f){f.remove();renderFurtado();}
  toast("Nova conversa ✓");
}

function renderFurtado(){
  const area=$("#gridArea");if(!area)return;
  if($("#furtado"))return;
  furRestore();
  if(!furState.nicho)furState.nicho=NICHOS[0];
  const pcard=(p,i)=>`<button type="button" class="chat__icard" data-setphase="${p.key}"><div class="chat__icard__t">${ic(p.icon)}${i+1} · ${esc(p.label)}</div><p>${esc(p.desc)}</p><span class="chat__icard__go">${ic("wand")}Ir para a fase ${i+1}</span></button>`;
  area.innerHTML=`<div class="chat furtado chat--animated" id="furtado">
    <div class="chat__top">
      <div class="fur__docs" id="furDocs" title="Documentos desta conversa (encadeados em memória)"></div>
      <button class="fur__reset" id="furReset" title="Começar uma conversa nova (limpa Bíblia, VOC e Briefing desta sessão)">${ic("plus")}Nova conversa</button>
    </div>
    <div class="chat__thread" id="furThread">
      <div class="chat__welcome">
        <div class="chat__mark">${ic("wand")}</div>
        <div class="chat__wtitle">Furtado - Copy Chief ADS IA <span class="chat__beta">Beta</span></div>
        <p class="chat__wsub">Uma skill de criação de ads em <b>4 fases encadeadas</b> — é só ir mandando: cada fase segue a lógica da skill e <b>alimenta a próxima automaticamente</b>. O progresso fica salvo neste navegador para o seu usuário. Escolha o nicho, cole seus anúncios campeões e siga <b>1 → 2 → 3 → 4</b>.</p>
        <div class="chat__intro is-4">${FUR_PHASES.map(pcard).join("")}</div>
      </div>
    </div>
    <div class="chat__composer">
      <div class="chat__modes" id="furModes">${FUR_PHASES.map((p,i)=>`<button type="button" class="chat__mode${p.key===furPhase?" active":""}" data-phase="${p.key}">${ic(p.icon)}${i+1} · ${esc(p.label)}</button>`).join("")}</div>
      <div class="chat__modehint" id="furModeHint">${ic("info")}<span></span></div>
      <div class="fur__prereq" id="furPrereq" hidden></div>
      <div class="chat__box">
        <textarea id="furInput" class="chat__input" rows="1"></textarea>
        <div class="chat__boxfoot">
          <div class="chat__inline" id="furControls"></div>
          <button type="button" class="btn btn--outline btn--sm" id="furCancel" hidden>Cancelar</button>
          <button class="chat__send" id="furRun" aria-label="Enviar">${ic("send")}<span>Enviar</span></button>
        </div>
      </div>
    </div>
  </div>`;

  chatWireFollow($("#furThread"));
  $("#furReset").addEventListener("click",furReset);
  const furSetPhase=(k)=>{if(furBusy||!k)return;furPhase=k;furPersist();$$("#furModes .chat__mode").forEach(x=>x.classList.toggle("active",x.dataset.phase===k));furApplyPhase();const t=$("#furInput");if(t&&t.style.display!=="none")t.focus();};
  $$("#furModes .chat__mode").forEach(b=>b.addEventListener("click",()=>furSetPhase(b.dataset.phase)));
  $$(".chat__icard",area).forEach(b=>b.addEventListener("click",()=>furSetPhase(b.dataset.setphase)));
  $("#furRun").addEventListener("click",furRun);
  $("#furCancel").addEventListener("click",()=>{if(furAbort)furAbort.abort();});
  const fta=$("#furInput");
  fta.addEventListener("input",()=>chatAutosize(fta));
  fta.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.isComposing){e.preventDefault();furRun();}});
  furRenderDocs();furApplyPhase();
}
function furRenderDocs(){
  const el=$("#furDocs");if(!el)return;
  const chip=(ok,label)=>`<span class="fur__doc${ok?" ok":""}">${ic(ok?"info":"file")}${label}${ok?" ✓":""}</span>`;
  const nAds=furState.anuncios.reduce((total,item)=>total+(Number(item.quantidade)||1),0);
  el.innerHTML=chip(furHasDoc("biblia"),"Bíblia")+chip(furHasDoc("voc"),"VOC")+chip(furHasDoc("briefing"),"Briefing")+`<span class="fur__doc${nAds?" ok":""}">${ic("wand")}${nAds} anúncio${nAds===1?"":"s"}</span>`;
}
function furApplyPhase(){
  const cfg=FUR_PHASES.find(p=>p.key===furPhase)||FUR_PHASES[0];
  const hint=$("#furModeHint span");if(hint)hint.textContent=cfg.hint;
  const run=$("#furRun");if(run)run.title=cfg.cta+" — Enter envia · Shift+Enter quebra a linha";
  const ta=$("#furInput"),controls=$("#furControls"),prereq=$("#furPrereq");
  if(!ta||!controls||!prereq)return;
  prereq.hidden=true;prereq.innerHTML="";
  const nsel=`<label class="fur__nicho">${ic("folder")}<select id="furNicho" class="chat__sel" title="Nicho">${NICHOS.map(n=>`<option value="${esc(n)}"${n===furState.nicho?" selected":""}>${esc(n)}</option>`).join("")}</select></label>`;
  let extra="";
  if(furPhase==="biblia"){
    ta.style.display="";ta.placeholder=cfg.ph;
  }else if(furPhase==="voc"){
    ta.style.display="none";
    if(!furHasDoc("biblia")){prereq.hidden=false;prereq.innerHTML=`${ic("alert")}Gere a <b>Bíblia do Nicho</b> (fase 1) antes — o VOC usa o avatar e a linguagem dela para pesquisar.`;}
  }else if(furPhase==="remessa"){
    ta.style.display="";ta.placeholder=cfg.ph;
    const nc=furState.nCorpos||3,nh=furState.nHooks||3;
    extra=`<label class="fur__num">Corpos <input type="number" id="furNCorpos" min="1" max="8" value="${nc}"></label><label class="fur__num">Hooks/corpo <input type="number" id="furNHooks" min="1" max="6" value="${nh}"></label>`;
    if(!furHasDoc("biblia")){prereq.hidden=false;prereq.innerHTML=`${ic("alert")}Sem a Bíblia o briefing fica genérico — gere a fase 1 antes.`;}
  }else{ // escrita
    ta.style.display="none";
    const nc=furState.nCorpos||3,nh=furState.nHooks||3;
    extra=`<label class="fur__num">Corpos <input type="number" id="furNCorpos" min="1" max="8" value="${nc}" aria-label="Quantidade de corpos"></label><label class="fur__num">Hooks/corpo <input type="number" id="furNHooks" min="1" max="6" value="${nh}" aria-label="Quantidade de hooks por corpo"></label>`;
    const faltam=[!furHasDoc("biblia")&&"Bíblia",!furHasDoc("voc")&&"VOC",!furHasDoc("briefing")&&"Briefing"].filter(Boolean);
    if(faltam.length){prereq.hidden=false;prereq.innerHTML=`${ic("alert")}Falta gerar: <b>${faltam.join(" · ")}</b>. Escrever sem esses documentos produz anúncio genérico.`;}
  }
  controls.innerHTML=nsel+extra;
  const nn=$("#furNicho");if(nn)nn.addEventListener("change",()=>{furState.nicho=nn.value;furPersist();});
  const ncInput=$("#furNCorpos"),nhInput=$("#furNHooks");
  if(ncInput)ncInput.addEventListener("change",()=>{furState.nCorpos=Math.max(1,Math.min(8,parseInt(ncInput.value,10)||3));ncInput.value=furState.nCorpos;furPersist();});
  if(nhInput)nhInput.addEventListener("change",()=>{furState.nHooks=Math.max(1,Math.min(6,parseInt(nhInput.value,10)||3));nhInput.value=furState.nHooks;furPersist();});
  chatAutosize(ta);
}
async function furRun(){
  if(furBusy)return;
  const nn=$("#furNicho");if(nn)furState.nicho=nn.value;
  const nicho=furState.nicho||"";
  const cfg=FUR_PHASES.find(x=>x.key===furPhase)||FUR_PHASES[0];
  const phaseAtRun=furPhase;
  const phaseNum={biblia:"1",voc:"2",remessa:"3",escrita:"4"}[furPhase]||"";
  let input="",nCorpos=furState.nCorpos||3,nHooks=furState.nHooks||3,userMsg="";
  if(furPhase==="biblia"){input=($("#furInput").value||"").trim();if(!input){toast("Cole 2 a 4 anúncios validados",true);$("#furInput").focus();return;}userMsg=input;}
  else if(furPhase==="voc"){
    if(!furHasDoc("biblia")){toast("Gere a Bíblia (fase 1) antes do VOC",true);return;}
    userMsg="Pesquisar a Voz do Prospect na web com base na Bíblia.";}
  else if(furPhase==="remessa"){input=($("#furInput").value||"").trim();if(!input){toast("Informe os dados da oferta",true);$("#furInput").focus();return;}
    nCorpos=Math.max(1,Math.min(8,parseInt(($("#furNCorpos")||{}).value,10)||3));nHooks=Math.max(1,Math.min(6,parseInt(($("#furNHooks")||{}).value,10)||3));
    furState.nCorpos=nCorpos;furState.nHooks=nHooks;
    userMsg=`${input}\n\n(${nCorpos} corpos · ${nHooks} hooks por corpo)`;}
  else{ // escrita
    if(!furHasDoc("briefing")){toast("Gere o Briefing (fase 3) antes de escrever",true);return;}
    nCorpos=Math.max(1,Math.min(8,parseInt((($("#furNCorpos")||{}).value),10)||3));nHooks=Math.max(1,Math.min(6,parseInt((($("#furNHooks")||{}).value),10)||3));
    furState.nCorpos=nCorpos;furState.nHooks=nHooks;input=`Corpos 1 a ${nCorpos}`;userMsg=`Escrever a remessa completa: ${nCorpos} corpo${nCorpos===1?"":"s"} · ${nHooks} hooks por corpo.`;}

  const thread=chatThreadEl("furThread");
  chatPushUser(thread,[esc(phaseNum+" · "+cfg.label),esc(nicho)],userMsg);
  if(furPhase==="biblia"||furPhase==="remessa"){const t=$("#furInput");if(t){t.value="";chatAutosize(t);}}
  const ai=chatPushAI(thread,"wand");const md=ai.md,status=ai.status;
  chatScroll(thread);
  furBusy=true;const btn=$("#furRun"),cancel=$("#furCancel");btn.disabled=true;btn.classList.add("is-busy");cancel.hidden=false;
  $$("#furModes .chat__mode").forEach(x=>x.classList.add("is-locked"));
  let token="";try{const r=await sb.auth.getSession();token=(r.data&&r.data.session&&r.data.session.access_token)||"";}catch(e){}
  let acc="",gotAny=false,errMsg="",completed=false;const stream=chatBufferedMarkdown(md,furMarkdown,thread,()=>acc);
  furAbort=new AbortController();const timeout=setTimeout(()=>furAbort&&furAbort.abort(),FUR_TIMEOUT_MS);
  try{
    const res=await fetch(FURTADO_FN,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},
      signal:furAbort.signal,body:JSON.stringify({phase:furPhase,nicho,input,biblia:furState.biblia||"",voc:furState.voc||"",briefing:furState.briefing||"",nCorpos,nHooks})});
    if(!res.ok||!res.body){let j={};try{j=await res.json();}catch(e){}throw new Error(j.error||("HTTP "+res.status));}
    const reader=res.body.getReader(),dec=new TextDecoder();let buf="";
    for(;;){const {done,value}=await reader.read();if(done)break;
      buf+=dec.decode(value,{stream:true});let nl;
      while((nl=buf.indexOf("\n"))>=0){const line=buf.slice(0,nl);buf=buf.slice(nl+1);
        if(!line.trim())continue;let ev;try{ev=JSON.parse(line);}catch(e){continue;}
        if(ev.t==="text"){acc+=ev.v;if(!gotAny)status.innerHTML=`<span class="ccdot ccdot--on"></span>Escrevendo…`;gotAny=true;stream.queue();}
        else if(ev.t==="status"){if(!gotAny)status.innerHTML=`<span class="ccdot ccdot--on"></span>${esc(ev.v||"processando…")}`;}
        else if(ev.t==="meta2"){if(!gotAny)status.innerHTML=`<span class="ccdot ccdot--on"></span>Compilando as falas${ev.searches?` · ${ev.searches} buscas`:""}…`;}
        else if(ev.t==="error"){errMsg=ev.v||"erro";}
        else if(ev.t==="done"){completed=ev.ok===true;}
      }
    }
  }catch(e){errMsg=errMsg||(e&&e.name==="AbortError"?"operação cancelada ou tempo seguro excedido":(e.message||"falha na conexão"));}
  clearTimeout(timeout);furAbort=null;stream.flush();furBusy=false;btn.disabled=false;btn.classList.remove("is-busy");cancel.hidden=true;
  $$("#furModes .chat__mode").forEach(x=>x.classList.remove("is-locked"));
  if(!gotAny){md.innerHTML=`<div class="ccerr">⚠ ${esc(errMsg||"não respondeu — tente de novo")}</div>`;status.innerHTML="";}
  else if(completed&&!errMsg){
    // Encadeia e persiste somente quando o backend confirmou conclusão real.
    if(phaseAtRun==="biblia")furState.biblia=acc;
    else if(phaseAtRun==="voc")furState.voc=acc;
    else if(phaseAtRun==="remessa")furState.briefing=acc;
    else furState.anuncios=[{corpo:`1–${nCorpos}`,quantidade:nCorpos,texto:acc}];
    furPersist();
    furRenderDocs();
    const nextName={biblia:"a Voz do Prospect (fase 2)",voc:"a Arquitetura da Remessa (fase 3)",remessa:"a Escrita dos Anúncios (fase 4)"}[phaseAtRun];
    status.innerHTML=`<span class="ccdot ccdot--done"></span>Pronto${nextName?` · pode seguir para <b>${nextName}</b>`:` · ${nCorpos} anúncio${nCorpos===1?"":"s"} pronto${nCorpos===1?"":"s"}`}`;
    ai.bar.hidden=false;ai.bar.innerHTML=`<button class="btn btn--outline btn--sm" data-furcopy>${ic("clipboard")}Copiar</button>`;
    const cp=ai.bar.querySelector("[data-furcopy]");if(cp)cp.addEventListener("click",()=>{navigator.clipboard.writeText(md.innerText||"").then(()=>toast("Copiado ✓"));});
    // avança a fase ativa automaticamente (o usuário pode voltar clicando no chip)
    const next={biblia:"voc",voc:"remessa",remessa:"escrita"}[phaseAtRun];
    if(next&&furPhase===phaseAtRun){furPhase=next;furPersist();$$("#furModes .chat__mode").forEach(x=>x.classList.toggle("active",x.dataset.phase===next));furApplyPhase();}
  }else{status.innerHTML=`<span class="ccdot"></span>Resposta interrompida · esta fase não foi salva nem avançada${errMsg?` · <span class="muted">${esc(errMsg)}</span>`:""}`;}
  chatScroll(thread);
}

/* ===== TRANSCRITOR (Whisper via Groq) ===== */
const TR_FN="/.netlify/functions/transcribe-file",TR_TRANSLATE_FN="/.netlify/functions/translate-transcript",TR_AD_ANALYSIS_FN="/.netlify/functions/ad-analysis-job";
const TR_AD_MAX_SEC=600,TR_AD_PROMPT_VERSION="2026-08-04.2";
const TR_CHUNK_SEC=120;   // ~3,8MB por pedaço (WAV 16kHz mono) — abaixo do limite da função
const TR_MIN_CHUNK_SEC=15,TR_TRANSIENT_RETRIES=3,TR_PROGRESS_KEY="feg_transcricao_em_andamento_v2";
const TR_MEMORY_MAX_BYTES=192*1024*1024,TR_MEMORY_MAX_SEC=30*60,TR_CHUNK_OVERLAP_SEC=2,TR_WHISPER_LEAD_SEC=.8,TR_RECORDER_WARMUP_MS=250,TR_STREAM_STALL_MS=30000;
const TR_PIPELINE_DEPTH=2;
const TR_LANGS=[["auto","Detectar automaticamente"],["pt","Português"],["en","Inglês"],["es","Espanhol"],["fr","Francês"],["de","Alemão"],["it","Italiano"],["nl","Holandês"],["ja","Japonês"],["zh","Chinês"],["ru","Russo"],["ar","Árabe"],["hi","Hindi"],["ko","Coreano"]];
let trBusy=false, trLang="auto", trText="", trSegs=[], trWords=[], trDetLang="", trDur=0, trShowTimes=false, trFileName="", trAudioUrl="", trAudio=null, trRaf=0, trActive=-1,trFollow=true,trLastFile=null,trTranslation="",trTranslationStatus="idle",trTranslationError="",trAdAnalysis="",trAdAnalysisStatus="idle",trAdAnalysisError="",trAdAnalysisJobId="";
const TR_STORE="feg_transcricoes_v1";
const TR_SAVE_FN="/.netlify/functions/transcript";
function trStoreRead(){try{return JSON.parse(localStorage.getItem(TR_STORE)||"{}");}catch(_){return{};}}
function trCache(entry){const all=trStoreRead();all[entry.id]=entry;const ordered=Object.values(all).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,20),next={};ordered.forEach(x=>next[x.id]=x);try{localStorage.setItem(TR_STORE,JSON.stringify(next));}catch(_){} }
function trLoadEntry(x){trText=x.text||"";trSegs=Array.isArray(x.segments)?x.segments:[];trWords=Array.isArray(x.words)?x.words:[];trDetLang=x.language||"";trTranslation=x.translation||"";trTranslationStatus=trTranslation?"done":"idle";trTranslationError="";trAdAnalysis=x.adVisualAnalysis||"";trAdAnalysisStatus=trAdAnalysis?"complete":(x.adAnalysisStatus||"idle");trAdAnalysisError=x.adAnalysisError||"";trAdAnalysisJobId=x.adAnalysisJobId||"";trDur=+x.duration||0;trFileName=x.fileName||"transcricao";trAudioUrl="";trAudio=null;trFollow=true;renderTrOutput();const link=$("#trCopyLink");if(link)link.hidden=false;document.title=(trFileName||"Transcrição")+" — Benchmarking FEG";}
async function trToken(){try{const r=await sb.auth.getSession();return(r.data&&r.data.session&&r.data.session.access_token)||"";}catch(_){return"";}}
async function trPersist(){const entry={text:trText,segments:trSegs,words:trWords,language:trDetLang,translation:trTranslation,translationLanguage:trTranslation?"pt-BR":"",duration:trDur,fileName:trFileName,adVisualAnalysis:trAdAnalysis,adAnalysisStatus:trAdAnalysisStatus,adAnalysisError:trAdAnalysisError,adAnalysisJobId:trAdAnalysisJobId,adAnalysisPromptVersion:trAdAnalysis?TR_AD_PROMPT_VERSION:"",createdAt:new Date().toISOString()};let id="";try{const response=await fetch(TR_SAVE_FN,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+await trToken()},body:JSON.stringify(entry)}),result=await response.json();if(!response.ok||!result.ok)throw new Error(result.error||"falha ao salvar");id=result.id;}catch(e){id=(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36));toast("Transcrição pronta, mas o link ficou salvo apenas neste navegador.",true);}entry.id=id;trCache(entry);try{history.replaceState(history.state,"","/transcritor/"+id);}catch(_){}const link=$("#trCopyLink");if(link)link.hidden=false;return id;}
async function loadTrRoute(id){let x=trStoreRead()[id];if(!x){trSetStatus(`<span class="vidup__spin"></span>Carregando transcrição…`);try{const response=await fetch(TR_SAVE_FN+"?id="+encodeURIComponent(id),{headers:{"Authorization":"Bearer "+await trToken()}}),result=await response.json();if(!response.ok||!result.ok)throw new Error(result.error||"não encontrada");x=result.transcript;trCache(x);}catch(_){if(parseLocation().id!==id)return;trSetStatus("");renderNotFound("Transcrição não encontrada.");return;}}if(parseLocation().id!==id)return;trSetStatus("");trLoadEntry(x);}
function trTime(s){s=Math.max(0,Math.round(+s||0));const m=Math.floor(s/60),ss=s%60;return `${m}:${String(ss).padStart(2,"0")}`;}
function trSetStatus(html){const el=$("#trStatus");if(!el)return;el.hidden=!html;el.innerHTML=html||"";}
function renderTrOutput(){
  const out=$("#trOut");if(!out)return;
  if(!trText&&!trSegs.length&&!trAudioUrl){out.hidden=true;return;}
  out.hidden=false;
  const words=trText?trText.trim().split(/\s+/).filter(Boolean).length:0;
  const meta=$("#trOutMeta");if(meta)meta.innerHTML=`<span class="ccdot ccdot--done"></span>${trDetLang?esc(trDetLang)+" · ":""}${words} palavras${trDur?` · ${trTime(trDur)}`:""}`;
  const body=$("#trText");if(!body)return;
  if(trShowTimes&&trSegs.length){
    body.innerHTML=trSegs.map(s=>`<div class="trseg"><span class="trseg__t">${trTime(s.start)}</span><span class="trseg__x">${esc(s.text)}</span></div>`).join("");
  }else if(trWords.length){
    body.innerHTML=trWords.map((w,i)=>`<button type="button" class="trword" data-trword="${i}" data-start="${w.start}" aria-label="Ir para ${trTime(w.start)}">${esc(w.word)}</button>`).join(" ");
  }else{
    body.textContent=trText||trSegs.map(s=>s.text).join(" ");
  }
  const translated=$("#trTranslation"),state=$("#trTranslationState"),retry=$("#trRetryTranslation"),copyPt=$("#trCopyPt"),downloadPt=$("#trDownloadPt");
  if(translated){
    if(trTranslation)translated.textContent=trTranslation;
    else translated.innerHTML=`<div class="trtranslation-empty">${trTranslationStatus==="translating"?"A tradução está sendo preparada…":trTranslationStatus==="error"?esc(trTranslationError||"Não foi possível traduzir agora."):"A tradução em português aparecerá aqui ao concluir a transcrição."}</div>`;
  }
  if(state)state.innerHTML=trTranslationStatus==="translating"?`<span class="vidup__spin"></span>Traduzindo…`:trTranslationStatus==="done"?`<span class="ccdot ccdot--done"></span>Português (Brasil)`:trTranslationStatus==="error"?`<span class="trerr">Tradução interrompida</span>`:"";
  if(retry){retry.hidden=!(trText&&!trTranslation&&trTranslationStatus!=="translating");retry.textContent=trTranslationStatus==="error"?"Tentar tradução novamente":"Traduzir para português";}
  if(copyPt)copyPt.disabled=!trTranslation;
  if(downloadPt)downloadPt.disabled=!trTranslation;
  const analysisDoc=$("#trAdAnalysisDoc"),analysisState=$("#trAdAnalysisState"),copyAnalysis=$("#trCopyAnalysis"),downloadAnalysis=$("#trDownloadAnalysis"),retryAnalysis=$("#trRetryAnalysis");
  if(analysisDoc){
    if(trAdAnalysis)analysisDoc.innerHTML=ccMarkdown(trAdAnalysis);
    else if(trDur>TR_AD_MAX_SEC)analysisDoc.innerHTML=`<div class="tranalysis-empty">Vídeos acima de 10 minutos permanecem somente como transcrição. Para VSLs longas, use o Dissecador de VSL.</div>`;
    else analysisDoc.innerHTML=`<div class="tranalysis-empty">${trAdAnalysisStatus==="working"||trAdAnalysisStatus==="queued"?"Lendo as cenas, textos e cortes do anúncio…":trAdAnalysisStatus==="error"?esc(trAdAnalysisError||"A leitura visual será tentada novamente."):"A engenharia reversa visual será criada automaticamente para vídeos de até 10 minutos."}</div>`;
  }
  if(analysisState)analysisState.innerHTML=trAdAnalysisStatus==="complete"?`<span class="ccdot ccdot--done"></span>Concluída`:trAdAnalysisStatus==="working"||trAdAnalysisStatus==="queued"?`<span class="vidup__spin"></span>Processando…`:trDur>TR_AD_MAX_SEC?"Não aplicável":trAdAnalysisStatus==="error"?`<span class="trerr">Interrompida</span>`:"Aguardando transcrição";
  if(copyAnalysis)copyAnalysis.disabled=!trAdAnalysis;
  if(downloadAnalysis)downloadAnalysis.disabled=!trAdAnalysis;
  if(retryAnalysis)retryAnalysis.hidden=!(trAdAnalysisStatus==="error"&&trLastFile&&trText&&trDur>0&&trDur<=TR_AD_MAX_SEC);
  body.onwheel=()=>{trFollow=false;};body.ontouchstart=()=>{trFollow=false;};body.onpointerdown=()=>{trFollow=false;};
  trActive=-1;if(trAudio&&!trAudio.paused)trSyncWord(trAudio.currentTime||0);
  const tb=$("#trTimes");if(tb)tb.textContent=trShowTimes?"Ocultar tempos":"Mostrar tempos";
}
function trWordAt(time){let lo=0,hi=trWords.length-1,ans=-1;while(lo<=hi){const m=(lo+hi)>>1;if(trWords[m].start<=time){ans=m;lo=m+1;}else hi=m-1;}return ans;}
function trSyncWord(time){if(!trWords.length)return;const next=trWordAt(time);if(next===trActive)return;const body=$("#trText");if(!body)return;if(trActive>=0){const old=$(`[data-trword="${trActive}"]`,body);if(old)old.classList.remove("is-active");}if(next>trActive){for(let i=Math.max(0,trActive);i<next;i++){const w=$(`[data-trword="${i}"]`,body);if(w)w.classList.add("is-past");}}else{for(let i=Math.max(0,next);i<=trActive;i++){const w=$(`[data-trword="${i}"]`,body);if(w)w.classList.remove("is-past");}}trActive=next;if(next>=0){const cur=$(`[data-trword="${next}"]`,body);if(cur){cur.classList.add("is-active");if(trFollow&&!cur.matches(":hover")&&document.activeElement!==cur){const target=Math.max(0,cur.offsetTop-body.clientHeight*.42);body.scrollTo({top:target,behavior:"auto"});}}}}
function trFrame(){if(!trAudio)return;const duration=trAudio.duration||trDur||1,ratio=Math.min(1,trAudio.currentTime/duration),range=$("#trRange"),fill=$("#trFill"),time=$("#trPlayerTime");if(range)range.value=String(Math.round(ratio*1000));if(fill)fill.style.width=(ratio*100)+"%";if(time)time.textContent=`${trTime(trAudio.currentTime)} / ${trTime(duration)}`;trSyncWord(trAudio.currentTime);if(!trAudio.paused)trRaf=requestAnimationFrame(trFrame);}
function trRenderPlayer(){const host=$("#trPlayer");if(!host||!trAudioUrl)return;cancelAnimationFrame(trRaf);host.innerHTML=`<div class="trplayer"><audio id="trAudio" src="${esc(trAudioUrl)}" preload="metadata"></audio><div class="trplayer__row"><button type="button" class="trplayer__play" id="trPlay" aria-label="Reproduzir">${ic("play")}</button><label class="trplayer__track" aria-label="Posição do áudio"><span class="trplayer__rail"><span class="trplayer__fill" id="trFill"></span></span><input class="trplayer__range" id="trRange" type="range" min="0" max="1000" value="0"></label><span class="trplayer__time" id="trPlayerTime">0:00 / ${trTime(trDur)}</span><select class="trplayer__speed" id="trSpeed" aria-label="Velocidade"><option value="0.75">0,75×</option><option value="1" selected>1×</option><option value="1.25">1,25×</option><option value="1.5">1,5×</option><option value="2">2×</option></select></div></div>`;
  trAudio=$("#trAudio");const play=$("#trPlay");play.addEventListener("click",()=>trAudio.paused?trAudio.play():trAudio.pause());trAudio.addEventListener("play",()=>{play.textContent="❚❚";play.setAttribute("aria-label","Pausar");cancelAnimationFrame(trRaf);trRaf=requestAnimationFrame(trFrame);});trAudio.addEventListener("pause",()=>{play.innerHTML=ic("play");play.setAttribute("aria-label","Reproduzir");cancelAnimationFrame(trRaf);});trAudio.addEventListener("loadedmetadata",()=>{if(!trDur)trDur=trAudio.duration||0;trFrame();});$("#trRange").addEventListener("input",e=>{trAudio.currentTime=(trAudio.duration||trDur||0)*(+e.target.value/1000);trSyncWord(trAudio.currentTime);trFrame();});$("#trSpeed").addEventListener("change",e=>trAudio.playbackRate=+e.target.value||1);
}
// Arquivos normais são decodificados de uma vez. Arquivos grandes usam o
// caminho progressivo abaixo e nunca são copiados inteiros para a memória.
async function trDecodeArrayMono16k(arr){
  const AC=window.AudioContext||window.webkitAudioContext;
  let ctx; try{ctx=new AC({sampleRate:16000});}catch(e){ctx=new AC();}
  let buf;
  try{buf=await ctx.decodeAudioData(arr);}catch(e){try{ctx.close();}catch(_){}throw new Error("não consegui ler o áudio desse arquivo");}
  const ch=buf.numberOfChannels,len=buf.length,rate=buf.sampleRate;
  let mono;
  if(ch===1)mono=buf.getChannelData(0).slice();
  else{mono=new Float32Array(len);for(let c=0;c<ch;c++){const d=buf.getChannelData(c);for(let i=0;i<len;i++)mono[i]+=d[i]/ch;}}
  try{ctx.close();}catch(e){}
  if(rate!==16000)mono=await trResample(mono,rate,16000);
  return mono;
}
async function trDecodeMono16k(file){
  let arr;
  try{arr=await file.arrayBuffer();}catch(error){const e=new Error("não foi possível ler o arquivo completo na memória");e.cause=error;throw e;}
  return trDecodeArrayMono16k(arr);
}
async function trResample(data,from,to){
  const OAC=window.OfflineAudioContext||window.webkitOfflineAudioContext;
  const off=new OAC(1,Math.max(1,Math.ceil(data.length*to/from)),to);
  const b=off.createBuffer(1,data.length,from);b.copyToChannel(data,0);
  const s=off.createBufferSource();s.buffer=b;s.connect(off.destination);s.start();
  const r=await off.startRendering();return r.getChannelData(0);
}
function trAbortError(){try{return new DOMException("Processamento cancelado","AbortError");}catch(_){const e=new Error("Processamento cancelado");e.name="AbortError";return e;}}
function trWaitMedia(el,event,timeout=20000,signal){
  return new Promise((resolve,reject)=>{
    let timer;
    const clean=()=>{clearTimeout(timer);el.removeEventListener(event,ok);el.removeEventListener("error",bad);if(signal)signal.removeEventListener("abort",cancel);};
    const ok=()=>{clean();resolve();};
    const bad=()=>{clean();reject(new Error("não consegui abrir o áudio ou vídeo"));};
    const cancel=()=>{clean();reject(trAbortError());};
    if(signal&&signal.aborted)return cancel();
    el.addEventListener(event,ok,{once:true});el.addEventListener("error",bad,{once:true});
    if(signal)signal.addEventListener("abort",cancel,{once:true});
    timer=setTimeout(bad,timeout);
  });
}
async function trProbeMedia(file,signal){
  const url=URL.createObjectURL(file),media=document.createElement(file.type.startsWith("video/")?"video":"audio");
  media.preload="metadata";media.src=url;
  try{await trWaitMedia(media,"loadedmetadata",20000,signal);return{duration:isFinite(media.duration)?media.duration:0};}
  finally{media.removeAttribute("src");try{media.load();}catch(_){}URL.revokeObjectURL(url);}
}
function trRecorderMime(){
  if(typeof MediaRecorder==="undefined")return"";
  return["audio/webm;codecs=opus","audio/webm","audio/ogg;codecs=opus"].find(type=>!MediaRecorder.isTypeSupported||MediaRecorder.isTypeSupported(type))||"";
}
async function trStopRecorder(recorder,chunks){
  if(recorder.state==="inactive")return new Blob(chunks,{type:recorder.mimeType||"audio/webm"});
  return new Promise((resolve,reject)=>{
    const done=()=>resolve(new Blob(chunks,{type:recorder.mimeType||"audio/webm"}));
    recorder.addEventListener("stop",done,{once:true});
    recorder.addEventListener("error",()=>reject(new Error("falha ao preparar uma parte do áudio")),{once:true});
    try{recorder.stop();}catch(error){reject(error);}
  });
}
async function trSeekMedia(media,time,signal){
  const target=Math.max(0,Math.min(Math.max(0,(media.duration||0)-.05),time));
  if(Math.abs((media.currentTime||0)-target)<.08&&media.readyState>=2)return;
  const waiting=trWaitMedia(media,"seeked",20000,signal);media.currentTime=target;await waiting;
}
async function trCaptureLargeFile(file,chunkSec,options){
  const {startChunk=0,signal,onPlan,onChunk,onStatus}=options||{},mime=trRecorderMime();
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!mime||!AC)throw new Error("este navegador não oferece o processamento progressivo necessário para este arquivo");
  const url=URL.createObjectURL(file),media=document.createElement(file.type.startsWith("video/")?"video":"audio");
  media.preload="auto";media.playsInline=true;media.src=url;media.style.cssText="position:fixed;width:1px;height:1px;opacity:.001;pointer-events:none;left:-10px;bottom:0";document.body.appendChild(media);
  let ctx=null,source=null,destination=null,silent=null,wakeLock=null,recorder=null;
  try{
    await trWaitMedia(media,"loadedmetadata",30000,signal);
    const duration=isFinite(media.duration)?media.duration:0;if(!duration)throw new Error("não consegui identificar a duração do arquivo");
    /* Capturar em 1× preserva fonemas e pausas. A aceleração anterior (até 3,5×)
       encurtava a fala antes de ela chegar ao Whisper e podia omitir palavras. */
    const streamRate=1;
    const totalChunks=Math.max(1,Math.ceil(duration/chunkSec));if(onPlan)await onPlan({duration,totalChunks,mode:"stream"});
    if(onStatus)onStatus({preparing:true,message:"Preparação em velocidade original para preservar cada palavra. O progresso é salvo a cada parte…"});
    try{if(navigator.wakeLock)wakeLock=await navigator.wakeLock.request("screen");}catch(_){}
    try{ctx=new AC({sampleRate:48000});}catch(_){ctx=new AC();}
    if(ctx.state==="suspended")await ctx.resume();
    source=ctx.createMediaElementSource(media);destination=ctx.createMediaStreamDestination();silent=ctx.createGain();silent.gain.value=0;
    source.connect(destination);source.connect(silent);silent.connect(ctx.destination);
    media.preservesPitch=true;media.playbackRate=streamRate;
    for(let index=Math.max(0,startChunk);index<totalChunks;index++){
      if(signal&&signal.aborted)throw trAbortError();
      const expectedStart=index*chunkSec,expectedEnd=Math.min(duration,(index+1)*chunkSec),captureStart=Math.max(0,expectedStart-TR_CHUNK_OVERLAP_SEC),captureEnd=Math.min(duration,expectedEnd+TR_CHUNK_OVERLAP_SEC);await trSeekMedia(media,captureStart,signal);
      const actualStart=media.currentTime||captureStart,chunks=[];
      recorder=new MediaRecorder(destination.stream,{mimeType:mime,audioBitsPerSecond:64000});
      recorder.addEventListener("dataavailable",event=>{if(event.data&&event.data.size)chunks.push(event.data);});
      recorder.start(1000);
      /* Dá tempo para o encoder do MediaRecorder ficar pronto antes do primeiro
         fonema. Sem isso, a frase inicial podia começar durante o aquecimento. */
      await trDelay(TR_RECORDER_WARMUP_MS);
      try{await media.play();}catch(_){throw new Error("o navegador bloqueou a leitura progressiva; clique novamente em iniciar");}
      let lastTime=media.currentTime,lastAdvance=Date.now();
      while(!media.ended&&media.currentTime<captureEnd-.04){
        if(signal&&signal.aborted)throw trAbortError();
        await trDelay(250);
        if(media.currentTime>lastTime+.01){lastTime=media.currentTime;lastAdvance=Date.now();}
        else if(Date.now()-lastAdvance>TR_STREAM_STALL_MS)throw new Error("a leitura do arquivo ficou parada; mantenha a aba aberta e tente continuar");
        if(onStatus)onStatus({index,totalChunks,current:media.currentTime,end:expectedEnd});
      }
      media.pause();const blob=await trStopRecorder(recorder,chunks);recorder=null;
      if(!blob.size)throw new Error("não consegui extrair o áudio desta parte");
      const samples=await trDecodeArrayMono16k(await blob.arrayBuffer()),captured=Math.max(.1,(media.currentTime||captureEnd)-actualStart),pcmDuration=Math.max(.1,samples.length/16000);
      if(onChunk)await onChunk({samples,rate:16000,offset:actualStart,timeScale:captured/pcmDuration,retainStart:expectedStart,retainEnd:expectedEnd,index,totalChunks,duration});
    }
  }finally{
    try{media.pause();}catch(_){}
    if(recorder&&recorder.state!=="inactive")try{recorder.stop();}catch(_){}
    try{source&&source.disconnect();silent&&silent.disconnect();destination&&destination.stream.getTracks().forEach(track=>track.stop());}catch(_){}
    try{ctx&&await ctx.close();}catch(_){}
    try{wakeLock&&await wakeLock.release();}catch(_){}
    media.removeAttribute("src");try{media.load();}catch(_){}media.remove();URL.revokeObjectURL(url);
  }
}
async function trForEachAudioChunk(file,chunkSec,options={}){
  let probe={duration:0};try{probe=await trProbeMedia(file,options.signal);}catch(error){if(error&&error.name==="AbortError")throw error;}
  const useStream=file.size>TR_MEMORY_MAX_BYTES||(probe.duration&&probe.duration>TR_MEMORY_MAX_SEC);
  if(useStream){
    if(options.onStatus)options.onStatus({preparing:true,message:"Arquivo grande: leitura segura por partes. Mantenha esta aba aberta durante a transcrição…"});
    return trCaptureLargeFile(file,chunkSec,options);
  }
  let mono;
  try{mono=await trDecodeMono16k(file);}
  catch(error){
    if(options.onStatus)options.onStatus({preparing:true,message:"Mudando para o modo progressivo para preservar a memória…"});
    return trCaptureLargeFile(file,chunkSec,options);
  }
  const rate=16000,duration=mono.length/rate,totalChunks=Math.max(1,Math.ceil(duration/chunkSec)),chunkLen=chunkSec*rate,overlapLen=Math.round(TR_CHUNK_OVERLAP_SEC*rate);
  if(options.onPlan)await options.onPlan({duration,totalChunks,mode:"memory"});
  for(let index=Math.max(0,options.startChunk||0);index<totalChunks;index++){
    if(options.signal&&options.signal.aborted)throw trAbortError();
    const retainStart=index*chunkSec,retainEnd=Math.min(duration,(index+1)*chunkSec),sampleStart=Math.max(0,index*chunkLen-overlapLen),sampleEnd=Math.min(mono.length,(index+1)*chunkLen+overlapLen),samples=mono.subarray(sampleStart,sampleEnd);
    if(options.onChunk)await options.onChunk({samples,rate,offset:sampleStart/rate,timeScale:1,retainStart,retainEnd,index,totalChunks,duration});
  }
}
function trWav(samples,rate){
  const n=samples.length,ab=new ArrayBuffer(44+n*2),v=new DataView(ab);
  const w=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
  w(0,"RIFF");v.setUint32(4,36+n*2,true);w(8,"WAVE");w(12,"fmt ");v.setUint32(16,16,true);
  v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);
  v.setUint16(32,2,true);v.setUint16(34,16,true);w(36,"data");v.setUint32(40,n*2,true);
  let o=44;for(let i=0;i<n;i++){let s=samples[i];s=s<-1?-1:s>1?1:s;v.setInt16(o,s<0?s*0x8000:s*0x7FFF,true);o+=2;}
  return new Blob([ab],{type:"audio/wav"});
}
function trDelay(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
function trOrderedPipeline(process,commit,depth=TR_PIPELINE_DEPTH){
  const pending=[];
  const settle=promise=>promise.then(value=>({ok:true,value}),error=>({ok:false,error}));
  const consume=async()=>{
    const result=await pending.shift();
    if(!result.ok)throw result.error;
    await commit(result.value);
  };
  return{
    async push(value){
      pending.push(settle(process(value)));
      if(pending.length>=depth)await consume();
    },
    async drain(){while(pending.length)await consume();}
  };
}
async function trMapConcurrentOrdered(values,mapper,depth=TR_PIPELINE_DEPTH){
  const output=new Array(values.length),workers=[];
  let cursor=0;
  const worker=async()=>{for(;;){const index=cursor++;if(index>=values.length)return;output[index]=await mapper(values[index],index);}};
  for(let i=0;i<Math.min(depth,values.length);i++)workers.push(worker());
  await Promise.all(workers);return output;
}
function trFileKey(file){return [file.name,file.size,file.lastModified||0,trLang].join(":");}
function trReadProgress(file){try{const p=JSON.parse(localStorage.getItem(TR_PROGRESS_KEY)||"null");return p&&p.key===trFileKey(file)?p:null;}catch(_){return null;}}
function trSaveProgress(file,nextChunk,totalChunks){
  const p={key:trFileKey(file),nextChunk,totalChunks,text:trText,segments:trSegs,words:trWords,language:trDetLang,duration:trDur,savedAt:new Date().toISOString()};
  try{localStorage.setItem(TR_PROGRESS_KEY,JSON.stringify(p));}catch(_){}
}
function trTranslationChunks(value,max=6000){
  const text=String(value||"").trim(),parts=[];let cursor=0;
  while(cursor<text.length){let end=Math.min(text.length,cursor+max);if(end<text.length){const floor=cursor+Math.floor(max*.58),slice=text.slice(floor,end),marks=[slice.lastIndexOf("\n\n"),slice.lastIndexOf(". "),slice.lastIndexOf("! "),slice.lastIndexOf("? ")],best=Math.max(...marks);if(best>=0)end=floor+best+2;}const part=text.slice(cursor,end).trim();if(part)parts.push(part);cursor=end;}
  return parts;
}
async function trTranslatePart(textPart,part,total,token,language){
  let lastError;
  for(let attempt=0;attempt<2;attempt++){
    try{const response=await fetch(TR_TRANSLATE_FN,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},body:JSON.stringify({text:textPart,language:language||trDetLang||trLang,part,total})}),result=await response.json().catch(()=>({}));if(!response.ok||!result.ok){const error=new Error(result.error||("HTTP "+response.status));error.retryable=result.retryable===true||response.status===429||response.status>=500;throw error;}return String(result.translation||"").trim();}
    catch(error){lastError=error;if(!error.retryable||attempt===1)throw error;await trDelay(1200*(attempt+1));}
  }
  throw lastError||new Error("não foi possível traduzir");
}
async function trTranslateCurrent({save=false}={}){
  if(!trText||trTranslationStatus==="translating")return false;
  trTranslation="";trTranslationError="";trTranslationStatus="translating";renderTrOutput();
  try{
    if(/^(pt|portugu)/i.test(String(trDetLang||trLang))){trTranslation=trText;}
    else{
      const chunks=trTranslationChunks(trText),token=await trToken();let completed=0;
      const translated=await trMapConcurrentOrdered(chunks,async(chunk,i)=>{
        trSetStatus(`<span class="vidup__spin"></span>Traduzindo para português${chunks.length>1?` · ${completed}/${chunks.length} partes concluídas`:""}…`);
        const value=await trTranslatePart(chunk,i+1,chunks.length,token,trDetLang||trLang);completed++;
        trSetStatus(`<span class="vidup__spin"></span>Traduzindo para português · ${completed}/${chunks.length} partes concluídas…`);
        return value;
      });
      trTranslation=translated.filter(Boolean).join("\n\n");
    }
    trTranslationStatus="done";renderTrOutput();if(save)await trPersist();return true;
  }catch(error){trTranslationStatus="error";trTranslationError=(error&&error.message)||"Não foi possível traduzir agora.";renderTrOutput();return false;}
}

/* Engenharia reversa visual exclusiva para anúncios curtos.
   A duração é verificada antes de qualquer chamada: VSLs acima de 10 minutos
   nunca entram neste fluxo e continuam reservadas ao Dissecador de VSL. */
async function trBuildAdContactSheets(file,duration,onProgress){
  if(!file||!file.type.startsWith("video/")||!(duration>0&&duration<=TR_AD_MAX_SEC))return[];
  const objectUrl=URL.createObjectURL(file),video=document.createElement("video");video.preload="auto";video.muted=true;video.playsInline=true;video.src=objectUrl;
  const ranges=[[0,duration/3],[duration/3,duration*2/3],[duration*2/3,duration]],result=[];
  try{
    await vslWait(video,"loadedmetadata",15000);
    let captured=0;
    for(let r=0;r<ranges.length;r++){
      const [start,end]=ranges[r],times=Array.from({length:12},(_,i)=>Math.max(.05,Math.min(duration-.08,start+(Math.max(.1,end-start)*i/11))));
      const cols=4,fw=240,fh=135,labelH=23,canvas=document.createElement("canvas");canvas.width=cols*fw;canvas.height=3*(fh+labelH);const ctx=canvas.getContext("2d");ctx.fillStyle="#080808";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.font="600 12px system-ui";ctx.textBaseline="middle";
      for(let i=0;i<times.length;i++){
        await vslSeek(video,times[i]);const x=(i%cols)*fw,y=Math.floor(i/cols)*(fh+labelH);vslDrawCover(ctx,video,x,y,fw,fh);ctx.fillStyle="#111";ctx.fillRect(x,y+fh,fw,labelH);ctx.fillStyle="#e5ff2d";ctx.fillText(trTime(times[i]),x+8,y+fh+labelH/2);captured++;if(onProgress)onProgress(captured,36);
      }
      const encoded=canvas.toDataURL("image/jpeg",.72).split(",")[1];result.push({mediaType:"image/jpeg",data:encoded,label:`Linha do tempo visual ${r+1}/3`});
    }
  }finally{video.removeAttribute("src");try{video.load();}catch(_){}URL.revokeObjectURL(objectUrl);}
  return result;
}
async function trPollAdAnalysis(token,id){
  for(let attempt=0;attempt<600;attempt++){
    const response=await fetch(TR_AD_ANALYSIS_FN+"?id="+encodeURIComponent(id),{headers:{"Authorization":"Bearer "+token},cache:"no-store"}),result=await response.json().catch(()=>({}));
    if(!response.ok||!result.ok)throw new Error(result.error||("HTTP "+response.status));
    const job=result.job||{};trAdAnalysisStatus=job.status||"working";trAdAnalysisError=job.error||"";if(job.report)trAdAnalysis=job.report;renderTrOutput();
    if(job.status==="complete")return job;
    if(job.status==="error")throw new Error(job.error||job.message||"a leitura visual foi interrompida");
    await trDelay(2500);
  }
  throw new Error("a leitura visual continua em segundo plano; abra esta transcrição novamente em alguns minutos");
}
async function trRunAdAnalysis(file,token){
  if(!file||!file.type.startsWith("video/")||!trText||!(trDur>0&&trDur<=TR_AD_MAX_SEC))return false;
  trAdAnalysis="";trAdAnalysisError="";trAdAnalysisStatus="working";renderTrOutput();
  trSetStatus(`<span class="vidup__spin"></span>Preparando a leitura visual do anúncio…`);
  try{
    const sheets=await trBuildAdContactSheets(file,trDur,(done,total)=>trSetStatus(`<span class="vidup__spin"></span>Lendo cenas do anúncio · ${done}/${total} quadros…`));
    if(!sheets.length)throw new Error("não foi possível extrair os quadros do anúncio");
    const response=await fetch(TR_AD_ANALYSIS_FN,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},body:JSON.stringify({name:trFileName||"NÃO INFORMADO",niche:"NÃO INFORMADO",country:"NÃO INFORMADO",language:trDetLang||trLang||"NÃO INFORMADO",platform:"NÃO INFORMADO",duration:trDur,transcript:trText,segments:trSegs,contactSheets:sheets})}),result=await response.json().catch(()=>({}));
    if(response.status!==202||!result.ok||!result.id)throw new Error(result.error||("HTTP "+response.status));
    trAdAnalysisJobId=result.id;trAdAnalysisStatus="queued";renderTrOutput();trSetStatus(`<span class="vidup__spin"></span>Catalogando cenas, textos, cortes e personagens…`);
    const job=await trPollAdAnalysis(token,result.id);trAdAnalysis=job.report||trAdAnalysis;trAdAnalysisStatus="complete";trAdAnalysisError="";renderTrOutput();return true;
  }catch(error){trAdAnalysisStatus="error";trAdAnalysisError=(error&&error.message)||"Não foi possível concluir a leitura visual.";renderTrOutput();return false;}
}

/* Tradução bilíngue do Swipe de Criativos.
   O original permanece intocado; a versão PT-BR é persistida em campo próprio.
   A fila usa duas tarefas por vez para não pesar o navegador nem sobrecarregar
   o serviço, e retoma automaticamente os itens restantes no próximo acesso. */
const creativeTranslations=new Set();
let creativeTranslationQueue=[],creativeTranslationActive=0;
function creativeNeedsTranslation(o){
  const d=(o&&o.data)||{},status=String(d.transcricaoPtStatus||"").toLowerCase();
  const retryAt=Date.parse(d.transcricaoPtProximaTentativa||"");
  return d.kind==="criativo"&&String(d.transcricao||"").trim()&&!String(d.transcricaoPt||"").trim()&&!["working","processing"].includes(status)&&(!Number.isFinite(retryAt)||retryAt<=Date.now());
}
async function persistCreativeTranslation(o,patch){
  const {data:row,error}=await sb.from("offers").select("data").eq("id",o.id).single();if(error)throw error;
  const data=Object.assign({},(row&&row.data)||o.data||{},patch);
  const {error:saveError}=await sb.from("offers").update({data}).eq("id",o.id);if(saveError)throw saveError;
  o.data=data;
}
async function translateCreativeCard(o){
  if(!creativeNeedsTranslation(o)||creativeTranslations.has(o.id))return;
  creativeTranslations.add(o.id);o.data.transcricaoPtStatus="working";renderGrid();
  try{
    const original=String(o.data.transcricao||"").trim(),lang=String(o.data.transcricaoLang||"");
    let translated=original;
    if(!/^(pt|portugu)/i.test(lang)){
      const chunks=trTranslationChunks(original),token=await trToken(),parts=[];
      for(let i=0;i<chunks.length;i++)parts.push(await trTranslatePart(chunks[i],i+1,chunks.length,token,lang));
      translated=parts.filter(Boolean).join("\n\n").trim();
    }
    if(!translated)throw new Error("tradução vazia");
    await persistCreativeTranslation(o,{transcricaoPt:translated,transcricaoPtLang:"pt-BR",transcricaoPtStatus:"done",transcricaoPtError:"",transcricaoPtConcluidaEm:new Date().toISOString(),transcricaoPtVersion:"1"});
  }catch(error){
    try{await persistCreativeTranslation(o,{transcricaoPtStatus:"retry_scheduled",transcricaoPtError:"Falha temporária; uma nova tentativa será feita automaticamente.",transcricaoPtProximaTentativa:new Date(Date.now()+30*60*1000).toISOString()});}catch(_){}
  }finally{
    creativeTranslations.delete(o.id);renderGrid();writeCache();
    if(currentSimpleId===o.id&&$("#viewOverlay").classList.contains("open"))openSimpleView(o,true);
  }
}
function pumpCreativeTranslations(){
  while(creativeTranslationActive<2&&creativeTranslationQueue.length){
    const o=creativeTranslationQueue.shift();creativeTranslationActive++;
    translateCreativeCard(o).catch(()=>{}).finally(()=>{creativeTranslationActive--;pumpCreativeTranslations();});
  }
}
function scheduleCreativeTranslations(items){
  if(!isAdmin||!sb)return;
  const source=Array.isArray(items)?items:offers;
  for(const o of source)if(creativeNeedsTranslation(o)&&!creativeTranslations.has(o.id)&&!creativeTranslationQueue.some(x=>x.id===o.id))creativeTranslationQueue.push(o);
  pumpCreativeTranslations();
}
function trClearProgress(file){try{const p=JSON.parse(localStorage.getItem(TR_PROGRESS_KEY)||"null");if(!file||!p||p.key===trFileKey(file))localStorage.removeItem(TR_PROGRESS_KEY);}catch(_){}}
function trSetBusy(busy){
  trBusy=!!busy;
  const drop=$("#trDrop"),reset=$("#trReset");
  if(drop)drop.classList.toggle("busy",trBusy);
  if(reset)reset.disabled=trBusy;
}
function trReset(){
  if(trBusy)return;
  cancelAnimationFrame(trRaf);
  if(trAudio)trAudio.pause();
  if(trAudioUrl)URL.revokeObjectURL(trAudioUrl);
  trClearProgress(trLastFile);
  trLastFile=null;trFileName="";trText="";trSegs=[];trWords=[];trTranslation="";trTranslationStatus="idle";trTranslationError="";trAdAnalysis="";trAdAnalysisStatus="idle";trAdAnalysisError="";trAdAnalysisJobId="";trShowTimes=false;trDetLang="";trDur=0;trActive=-1;trFollow=true;trAudioUrl="";trAudio=null;
  history.replaceState(history.state,"","/transcritor");
  renderTranscritor(true);
  toast("Transcritor limpo — envie outro arquivo.");
}
function trRetryStatus(message){
  trSetStatus(`<span class="trerr">⚠ ${esc(message)}</span> <button type="button" class="btn btn--outline btn--sm" id="trRetryPart" style="margin-left:10px">Continuar da última parte</button>`);
  const retry=$("#trRetryPart");if(retry)retry.addEventListener("click",()=>{if(trLastFile&&!trBusy)trHandleFile(trLastFile);});
}
async function trPostSlice(samples,rate,token,lang,offset,timeScale=1){
  /* Um pequeno silêncio antes da fala impede que o primeiro token coincida com
     a borda interna do Whisper. Os timestamps são compensados na volta. */
  const leadSamples=Math.max(0,Math.round(rate*TR_WHISPER_LEAD_SEC)),prepared=new Float32Array(leadSamples+samples.length);prepared.set(samples,leadSamples);
  let r,j={};
  try{
    r=await fetch(TR_FN+"?lang="+encodeURIComponent(lang),{method:"POST",headers:{"Content-Type":"audio/wav","Authorization":"Bearer "+token},body:trWav(prepared,rate)});
    try{j=await r.json();}catch(_){}
  }catch(error){error.status=0;throw error;}
  if(!r.ok||!j.ok){const error=new Error(j.error||("HTTP "+r.status));error.status=r.status;error.retryable=j.retryable===true||r.status===429||r.status>=500;error.retryAfterMs=Math.max(0,(+j.retryAfter||+(r.headers.get("retry-after")||0))*1000);throw error;}
  const shift=leadSamples/rate;
  return{text:String(j.text||"").trim(),language:String(j.language||""),noSpeech:j.noSpeech===true,segments:Array.isArray(j.segments)?j.segments.map(s=>({start:Math.max(offset,((+s.start||0)-shift)*timeScale+offset),end:Math.max(offset,((+s.end||0)-shift)*timeScale+offset),text:s.text})):[],words:Array.isArray(j.words)?j.words.map(w=>({word:w.word,start:Math.max(offset,((+w.start||0)-shift)*timeScale+offset),end:Math.max(offset,((+w.end||0)-shift)*timeScale+offset)})):[]};
}
function trMergeSlices(a,b){return{text:[a.text,b.text].filter(Boolean).join(" "),language:a.language||b.language||"",segments:[...(a.segments||[]),...(b.segments||[])],words:[...(a.words||[]),...(b.words||[])]};}
function trWordsText(words){return(words||[]).map(w=>String(w.word||"").trim()).filter(Boolean).join(" ").replace(/\s+([,.;:!?%)\]])/g,"$1").replace(/([(\[])\s+/g,"$1").trim();}
function trCropChunkPart(part,chunk){
  const from=Number.isFinite(+chunk.retainStart)?+chunk.retainStart:+chunk.offset||0,to=Number.isFinite(+chunk.retainEnd)?+chunk.retainEnd:Infinity,last=chunk.index===chunk.totalChunks-1;
  const keep=item=>{const start=+item.start||0,end=Math.max(start,+item.end||start),middle=(start+end)/2;return middle>=from-.025&&(last?middle<=to+.025:middle<to-.025);};
  const words=(part.words||[]).filter(keep),segments=(part.segments||[]).filter(keep),text=words.length?trWordsText(words):segments.map(s=>String(s.text||"").trim()).filter(Boolean).join(" ");
  return{...part,text,words,segments};
}
async function trTranscribeSlice(samples,rate,token,lang,offset,onAdapt,depth=0,timeScale=1){
  const seconds=samples.length/rate;let lastError,rateWaits=0;
  for(let attempt=0;attempt<TR_TRANSIENT_RETRIES;attempt++){
    try{return await trPostSlice(samples,rate,token,lang,offset,timeScale);}catch(error){
      lastError=error;const status=+error.status||0,authFailure=status===401||status===403,canSplit=seconds>TR_MIN_CHUNK_SEC*2.05;
      if(status===429&&rateWaits<8){
        const wait=Math.min(120000,Math.max(5000,+error.retryAfterMs||12000)*(1+rateWaits*.15));rateWaits++;
        if(onAdapt)onAdapt(`Limite temporário atingido; aguardando ${Math.ceil(wait/1000)}s sem perder o progresso…`);
        await trDelay(wait);attempt--;continue;
      }
      if(!authFailure&&canSplit&&(error.retryable===true||status===0||status===413||status===422||status===502||status===503||status===504)){
        if(onAdapt)onAdapt(status===422?`A fala ficou inconsistente; recalculando ${Math.round(seconds)}s em trechos menores…`:`Uma parte demorou; reduzindo ${Math.round(seconds)}s para trechos menores…`);
        const middle=Math.floor(samples.length/2),left=await trTranscribeSlice(samples.subarray(0,middle),rate,token,lang,offset,onAdapt,depth+1,timeScale),right=await trTranscribeSlice(samples.subarray(middle),rate,token,lang,offset+(middle/rate)*timeScale,onAdapt,depth+1,timeScale);
        return trMergeSlices(left,right);
      }
      const transient=error.retryable===true||status===0||status===429||status===502||status===503||status===504;
      if(!transient||attempt===TR_TRANSIENT_RETRIES-1)throw error;
      if(onAdapt)onAdapt(`Serviço ocupado; nova tentativa ${attempt+2}/${TR_TRANSIENT_RETRIES}…`);
      await trDelay(1400*(attempt+1));
    }
  }
  throw lastError||new Error("falha ao transcrever esta parte");
}
async function trHandleFile(file){
  if(!file||trBusy)return;
  if(!/^(video|audio)\//.test(file.type||"")){toast("Envie um arquivo de vídeo ou áudio.",true);return;}
  trSetBusy(true);trLastFile=file; trFileName=file.name; trText=""; trSegs=[];trWords=[];trTranslation="";trTranslationStatus="idle";trTranslationError="";trAdAnalysis="";trAdAnalysisStatus="idle";trAdAnalysisError="";trAdAnalysisJobId=""; trShowTimes=false;trDetLang="";trDur=0;trActive=-1;trFollow=true;const oldLink=$("#trCopyLink");if(oldLink)oldLink.hidden=true;
  cancelAnimationFrame(trRaf);if(trAudioUrl)URL.revokeObjectURL(trAudioUrl);trAudioUrl=URL.createObjectURL(file);trAudio=null;renderTrOutput();trRenderPlayer();
  const out=$("#trOut");if(out)out.hidden=true;
  const drop=$("#trDrop");if(drop)drop.classList.add("busy");
  trSetStatus(`<span class="vidup__spin"></span>Preparando o áudio…`);
  let token="";try{const r=await sb.auth.getSession();token=(r.data&&r.data.session&&r.data.session.access_token)||"";}catch(e){}
  const saved=trReadProgress(file);let fullText=saved?String(saved.text||""):"",allSegs=saved&&Array.isArray(saved.segments)?saved.segments:[],allWords=saved&&Array.isArray(saved.words)?saved.words:[],detLang=saved?String(saved.language||""):"",startChunk=saved?Math.max(0,+saved.nextChunk||0):0,totalDur=+saved?.duration||0,currentPart=startChunk,totalParts=+saved?.totalChunks||0;
  if(saved){trText=fullText;trSegs=allSegs;trWords=allWords;trDetLang=detLang;trDur=totalDur;renderTrOutput();}
  try{
    const pipeline=trOrderedPipeline(
      async chunk=>{
        trSetStatus(`<span class="vidup__spin"></span>Transcrevendo${chunk.totalChunks>1?` parte ${chunk.index+1}/${chunk.totalChunks}`:""} · preparando a próxima em paralelo…`);
        const rawPart=await trTranscribeSlice(chunk.samples,chunk.rate,token,trLang,chunk.offset,msg=>trSetStatus(`<span class="vidup__spin"></span>${esc(msg)} <b>Parte ${chunk.index+1}/${chunk.totalChunks}</b>`),0,chunk.timeScale),part=trCropChunkPart(rawPart,chunk);
        return{chunk,part};
      },
      async({chunk,part})=>{
        currentPart=chunk.index;
        if(part.text)fullText+=(fullText?" ":"")+part.text;
        allSegs.push(...part.segments);allWords.push(...part.words);if(part.language&&!detLang)detLang=part.language;
        trText=fullText;trSegs=allSegs;trWords=allWords;trDetLang=detLang;trDur=totalDur;renderTrOutput();trSaveProgress(file,chunk.index+1,chunk.totalChunks);
      }
    );
    await trForEachAudioChunk(file,TR_CHUNK_SEC,{
      startChunk,
      onPlan:async plan=>{totalDur=plan.duration;totalParts=plan.totalChunks;startChunk=Math.min(startChunk,totalParts);trDur=totalDur;if(saved)renderTrOutput();},
      onStatus:state=>{if(state.message)trSetStatus(`<span class="vidup__spin"></span>${esc(state.message)}`);else if(state.current!=null)trSetStatus(`<span class="vidup__spin"></span>Extraindo parte ${state.index+1}/${state.totalChunks} · ${trTime(state.current)} de ${trTime(totalDur)}…`);},
      onChunk:async chunk=>{
        currentPart=chunk.index;await pipeline.push(chunk);
      }
    });
    await pipeline.drain();
  }catch(e){trSetBusy(false);trRetryStatus(`A parte ${Math.min(currentPart+1,totalParts||currentPart+1)} foi interrompida: ${(e&&e.message)||"erro"}. O progresso anterior foi preservado.`);return;}
  trText=fullText;trSegs=allSegs;trWords=allWords;trDetLang=detLang;trDur=totalDur;
  if(!trText&&!trSegs.length)trSetStatus(`<span class="trerr">⚠ Não captei fala nesse arquivo.</span>`);
  else{
    renderTrOutput();await trTranslateCurrent();
    if(file.type.startsWith("video/")&&trDur>0&&trDur<=TR_AD_MAX_SEC)await trRunAdAnalysis(file,token);
    else if(trDur>TR_AD_MAX_SEC){trAdAnalysisStatus="not_applicable";trAdAnalysisError="";renderTrOutput();}
    trSetStatus(`<span class="vidup__spin"></span>Salvando transcrição…`);await trPersist();trClearProgress(file);trSetStatus("");
    const hasAnalysis=!!trAdAnalysis,hasTranslation=!!trTranslation;
    toast(hasAnalysis?"Transcrição, tradução e engenharia reversa prontas ✓":hasTranslation?"Transcrição e tradução prontas ✓":"Transcrição pronta; itens pendentes serão tentados novamente.",!hasTranslation);
  }
  trSetBusy(false);
}
function renderTranscritor(force){
  const area=$("#gridArea");if(!area)return;
  if($("#transcritor")&&!force)return;
  area.innerHTML=`<div class="cchief" id="transcritor">
    <div class="cchief__hero">
      <div class="cchief__mark">${ic("mic")}</div>
      <div class="cchief__heroTx">
        <div class="cchief__heroTitle">Transcritor</div>
        <p>Envie um vídeo e receba a transcrição completa. Escolha o idioma ou deixe no automático.</p>
      </div>
    </div>
    <div class="cchief__composer">
      <div class="composer__controls">
        <label class="ccfield"><span>Idioma</span><select id="trLang">${TR_LANGS.map(([v,l])=>`<option value="${v}">${esc(l)}</option>`).join("")}</select></label>
      </div>
      <div class="trdrop" id="trDrop" tabindex="0" role="button" aria-label="Enviar vídeo ou áudio">
        <div class="trdrop__in">${ic("upload")}<div><b>Clique ou arraste</b> um vídeo ou áudio aqui</div><small>MP4, MOV, MP3, WAV… <b>qualquer duração</b>. O áudio é extraído no seu navegador e transcrito em partes.</small></div>
      </div>
      <div class="trstatus" id="trStatus" hidden></div>
      <input type="file" id="trFile" accept="video/*,audio/*" hidden>
      <div class="toolactions">
        <button class="btn btn--outline" id="trReset"${trBusy?" disabled":""}>Limpar</button>
        <span class="toolactions__hint">${ic("info")}Limpe o material atual para iniciar uma nova transcrição.</span>
      </div>
    </div>
    <div class="cchief__out" id="trOut" hidden>
      <div class="cchief__outbar">
        <span class="cchief__status" id="trOutMeta"></span>
        <div class="tractions">
          <button class="btn btn--outline btn--sm" id="trTimes">Mostrar tempos</button>
          <button class="btn btn--outline btn--sm" id="trCopyLink" hidden>${ic("link")}Copiar link</button>
          <button class="btn btn--outline btn--sm" id="trCopy">${ic("clipboard")}Copiar original</button>
          <button class="btn btn--outline btn--sm" id="trDownload">${ic("download")}Original .txt</button>
          <button class="btn btn--outline btn--sm" id="trCopyPt" disabled>${ic("clipboard")}Copiar tradução</button>
          <button class="btn btn--outline btn--sm" id="trDownloadPt" disabled>${ic("download")}Tradução .txt</button>
          <button class="btn btn--outline btn--sm" id="trRetryTranslation" hidden>Traduzir novamente</button>
        </div>
      </div>
      <div id="trPlayer"></div>
      <div class="trdocs">
        <section class="trdoc"><div class="trdoc__head"><span class="trdoc__title">Transcrição original</span><span class="trdoc__state">Idioma detectado</span></div><div class="trtext" id="trText"></div></section>
        <section class="trdoc"><div class="trdoc__head"><span class="trdoc__title">Tradução em português</span><span class="trdoc__state" id="trTranslationState"></span></div><div class="trtext trtext--translation" id="trTranslation"></div></section>
        <section class="trdoc trdoc--analysis"><div class="trdoc__head"><span class="trdoc__title">Engenharia reversa visual do anúncio</span><span class="trdoc__state" id="trAdAnalysisState"></span><div class="tractions"><button class="btn btn--outline btn--sm" id="trRetryAnalysis" hidden>Tentar novamente</button><button class="btn btn--outline btn--sm" id="trCopyAnalysis" disabled>${ic("clipboard")}Copiar relatório</button><button class="btn btn--outline btn--sm" id="trDownloadAnalysis" disabled>${ic("download")}Relatório .md</button></div></div><div class="tranalysis" id="trAdAnalysisDoc"></div></section>
      </div>
    </div>
  </div>`;
  const lang=$("#trLang");if(lang){lang.value=trLang;lang.addEventListener("change",()=>trLang=lang.value);}
  const fileInput=$("#trFile"), drop=$("#trDrop");
  const pick=()=>{if(!trBusy)fileInput.click();};
  if(fileInput)fileInput.addEventListener("change",async()=>{const file=fileInput.files[0];if(!file)return;try{await trHandleFile(file);}finally{fileInput.value="";}});
  if(drop){
    drop.addEventListener("click",pick);
    drop.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();pick();}});
    drop.addEventListener("dragover",e=>{e.preventDefault();drop.classList.add("active");});
    drop.addEventListener("dragleave",()=>drop.classList.remove("active"));
    drop.addEventListener("drop",e=>{e.preventDefault();drop.classList.remove("active");const f=[...e.dataTransfer.files].find(f=>/^(video|audio)\//.test(f.type));if(f)trHandleFile(f);else toast("Arraste um arquivo de vídeo.",true);});
  }
  $("#trReset").addEventListener("click",trReset);
  $("#trTimes").addEventListener("click",()=>{trShowTimes=!trShowTimes;renderTrOutput();});
  $("#trCopyLink").addEventListener("click",()=>navigator.clipboard.writeText(location.href).then(()=>toast("Link copiado ✓")));
  $("#trText").addEventListener("click",e=>{const w=e.target.closest("[data-trword]");if(!w||!trAudio)return;trAudio.currentTime=+w.dataset.start||0;trSyncWord(trAudio.currentTime);if(trAudio.paused)trAudio.play();});
  $("#trCopy").addEventListener("click",()=>{navigator.clipboard.writeText(trText||trSegs.map(s=>s.text).join(" ")).then(()=>toast("Copiado ✓"));});
  $("#trCopyPt").addEventListener("click",()=>{if(trTranslation)navigator.clipboard.writeText(trTranslation).then(()=>toast("Tradução copiada ✓"));});
  $("#trCopyAnalysis").addEventListener("click",()=>{if(trAdAnalysis)navigator.clipboard.writeText(trAdAnalysis).then(()=>toast("Relatório copiado ✓"));});
  $("#trRetryAnalysis").addEventListener("click",async()=>{if(trBusy||!trLastFile)return;trSetBusy(true);const ok=await trRunAdAnalysis(trLastFile,await trToken());trSetStatus("");trSetBusy(false);if(ok)await trPersist();toast(ok?"Engenharia reversa concluída ✓":"Não foi possível concluir agora.",!ok);});
  $("#trRetryTranslation").addEventListener("click",async()=>{if(trBusy)return;trSetBusy(true);const ok=await trTranslateCurrent({save:true});trSetStatus("");trSetBusy(false);toast(ok?"Tradução pronta ✓":"Não foi possível traduzir agora.",!ok);});
  $("#trDownload").addEventListener("click",()=>{
    const txt=trShowTimes&&trSegs.length?trSegs.map(s=>`[${trTime(s.start)}] ${s.text}`).join("\n"):(trText||trSegs.map(s=>s.text).join(" "));
    const blob=new Blob([txt],{type:"text/plain;charset=utf-8"}),a=document.createElement("a");
    a.href=URL.createObjectURL(blob);a.download=(trFileName?trFileName.replace(/\.[^.]+$/,""):"transcricao")+".txt";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);
  });
  $("#trDownloadPt").addEventListener("click",()=>{if(!trTranslation)return;const blob=new Blob([trTranslation],{type:"text/plain;charset=utf-8"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=(trFileName?trFileName.replace(/\.[^.]+$/,"_"):"transcricao_")+"pt-BR.txt";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);});
  $("#trDownloadAnalysis").addEventListener("click",()=>{if(!trAdAnalysis)return;const blob=new Blob([trAdAnalysis],{type:"text/markdown;charset=utf-8"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=(trFileName?trFileName.replace(/\.[^.]+$/,"_"):"anuncio_")+"engenharia-reversa.md";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);});
  if(trText||trSegs.length||trAudioUrl){renderTrOutput();trRenderPlayer();}
}

/* ===== DISSECADOR DE VSL ===== */
const VSL_JOB_FN="/.netlify/functions/vsl-job",VSL_LAST_JOB_KEY="feg-vsl-last-job",VSL_PROGRESS_KEY="feg-vsl-transcricao-v3";
const VSL_CHUNK_SEC=120,VSL_MIN_CHUNK_SEC=10,VSL_TRANSIENT_RETRIES=3;
let vslFile=null,vslObjectUrl="",vslBusy=false,vslAbort=null,vslName="",vslNiche="",vslLang="auto",vslCanonical="";
let vslRaw="",vslSegments=[],vslWords=[],vslDetectedLang="",vslDuration=0,vslSheets=[],vslTranscriptDoc="",vslAnalysisDoc="",vslActiveTab="transcript";
let vslRenderTimer=0,vslChunkCache=new Map(),vslCacheKey="",vslJobId="",vslJobStatus="",vslRestoring=false;
let vslTranscriptHost=null,vslAnalysisHost=null,vslRenderedTranscript=null,vslRenderedAnalysis=null;
function vslBytes(n){n=+n||0;if(n<1024)return n+" B";if(n<1024*1024)return(n/1024).toFixed(1)+" KB";if(n<1024*1024*1024)return(n/1024/1024).toFixed(1)+" MB";return(n/1024/1024/1024).toFixed(2)+" GB";}
function vslBaseName(name){return String(name||"VSL").replace(/\.[^.]+$/," ").trim()||"VSL";}
function vslSlug(name){return String(name||"vsl").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")||"vsl";}
function vslSetStatus(step,text,pct){
  const p=$("#vslProgress");if(p)p.hidden=false;
  $$(".vslstep",p||document).forEach(el=>{const n=+el.dataset.vslstep;el.classList.toggle("done",n<step||pct>=100);el.classList.toggle("active",n===step&&pct<100);});
  const fill=$("#vslProgressFill");if(fill)fill.style.width=Math.max(0,Math.min(100,+pct||0))+"%";
  const status=$("#vslProgressStatus");if(status)status.innerHTML=`<span class="${pct>=100?"ccdot ccdot--done":"vidup__spin"}"></span><span>${esc(text||"")}</span>`;
}
function vslRenderFile(){
  const drop=$("#vslDrop");if(!drop)return;
  drop.classList.toggle("ready",!!vslFile);drop.classList.toggle("busy",vslBusy);
  drop.innerHTML=vslFile?`<div class="vsldrop__inner">${ic(vslFile.type.startsWith("video/")?"film":"mic")}<strong>${esc(vslFile.name)}</strong><div class="vslfilemeta"><span>${vslFile.type.startsWith("video/")?"Vídeo":"Áudio"}</span><span>${vslBytes(vslFile.size)}</span>${vslDuration?`<span>${trTime(vslDuration)}</span>`:""}</div><small>Clique para trocar o arquivo. Ele permanece neste navegador durante a preparação.</small></div>`:`<div class="vsldrop__inner">${ic("upload")}<strong>Clique ou arraste a VSL aqui</strong><small>Envie o vídeo ou áudio completo. A análise considera o conteúdo do início ao fechamento.</small></div>`;
  const run=$("#vslRun");if(run)run.disabled=!vslFile||vslBusy;
  const retry=$("#vslRetry");if(retry)retry.hidden=vslJobStatus!=="error";
}
function vslRenderSheets(){const host=$("#vslSheets");if(host)host.innerHTML=vslSheets.map((s,i)=>`<img src="data:${s.mediaType};base64,${s.data}" alt="Contact sheet ${i+1}: ${esc(s.label)}">`).join("");}
function vslRenderDocs(){
  const out=$("#vslOutputs");if(out)out.hidden=!(vslBusy||vslTranscriptDoc||vslAnalysisDoc);
  const tr=$("#vslTranscriptMd"),an=$("#vslAnalysisMd"),trDoc=$("#vslTranscriptDoc"),anDoc=$("#vslAnalysisDoc"),trTop=trDoc?trDoc.scrollTop:0,anTop=anDoc?anDoc.scrollTop:0;
  if(tr&&vslActiveTab==="transcript"&&(tr!==vslTranscriptHost||vslRenderedTranscript!==vslTranscriptDoc)){tr.innerHTML=vslTranscriptDoc?ccMarkdown(vslTranscriptDoc):`<div class="vslblank">${ic("file")}A transcrição organizada aparecerá aqui.</div>`;vslTranscriptHost=tr;vslRenderedTranscript=vslTranscriptDoc;}
  if(an&&vslActiveTab==="analysis"&&(an!==vslAnalysisHost||vslRenderedAnalysis!==vslAnalysisDoc)){an.innerHTML=vslAnalysisDoc?ccMarkdown(vslAnalysisDoc):`<div class="vslblank">${ic("brain")}A dissecação começa depois que a transcrição organizada fica pronta.</div>`;vslAnalysisHost=an;vslRenderedAnalysis=vslAnalysisDoc;}
  if(trDoc){trDoc.hidden=vslActiveTab!=="transcript";trDoc.scrollTop=trTop;}if(anDoc){anDoc.hidden=vslActiveTab!=="analysis";anDoc.scrollTop=anTop;}
  $$("[data-vsltab]").forEach(b=>b.classList.toggle("active",b.dataset.vsltab===vslActiveTab));
  const ts=$("#vslTranscriptState"),as=$("#vslAnalysisState");if(ts){ts.textContent=vslTranscriptDoc?"✓":"—";ts.classList.toggle("done",!!vslTranscriptDoc&&!vslBusy);}if(as){as.textContent=vslAnalysisDoc?"✓":"—";as.classList.toggle("done",!!vslAnalysisDoc&&!vslBusy);}
}
function vslQueueRender(){if(!vslRenderTimer)vslRenderTimer=setTimeout(()=>{vslRenderTimer=0;vslRenderDocs();},90);}
function vslSaveBlob(blob,name){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2500);}
function vslDownload(kind,format="md"){
  const text=kind==="analysis"?vslAnalysisDoc:vslTranscriptDoc;if(!text){toast("Esse documento ainda não está pronto.",true);return;}
  const suffix=kind==="analysis"?"dissecacao-estrategica":"transcricao-completa",base=`${vslSlug(vslName)}__${suffix}`;
  if(format==="pdf"){
    const api=window.jspdf&&window.jspdf.jsPDF;if(!api){toast("O gerador de PDF não carregou. Atualize a página e tente novamente.",true);return;}
    const pdf=new api({unit:"mm",format:"a4"}),margin=15,pageWidth=180,pageHeight=277;pdf.setFont("helvetica","normal");pdf.setFontSize(10);
    const lines=pdf.splitTextToSize(text.replace(/\t/g,"  "),pageWidth);let y=17;
    for(const line of lines){if(y>pageHeight){pdf.addPage();y=17;}pdf.text(line,margin,y);y+=5;}
    pdf.save(base+".pdf");return;
  }
  vslSaveBlob(new Blob([text],{type:"text/markdown;charset=utf-8"}),base+".md");
}
async function vslOpenGoogleDocs(kind){
  const text=kind==="analysis"?vslAnalysisDoc:vslTranscriptDoc;if(!text){toast("Esse documento ainda não está pronto.",true);return;}
  window.open("https://docs.new","_blank","noopener");
  const html=`<div style="font-family:Arial,sans-serif;line-height:1.55">${ccMarkdown(text)}</div>`;
  try{
    if(window.ClipboardItem&&navigator.clipboard.write)await navigator.clipboard.write([new ClipboardItem({"text/plain":new Blob([text],{type:"text/plain"}),"text/html":new Blob([html],{type:"text/html"})})]);
    else await navigator.clipboard.writeText(text);
    toast("Google Docs aberto. O conteúdo está copiado — cole no novo documento.");
  }catch(_){toast("Google Docs aberto. Use Copiar aqui e cole no novo documento.",true);}
}
function vslWait(el,event,timeout=12000){return new Promise((resolve,reject)=>{let timer;const ok=()=>{clearTimeout(timer);el.removeEventListener("error",bad);resolve();},bad=()=>{clearTimeout(timer);el.removeEventListener(event,ok);reject(new Error("não consegui ler o vídeo"));};el.addEventListener(event,ok,{once:true});el.addEventListener("error",bad,{once:true});timer=setTimeout(bad,timeout);});}
async function vslReadDuration(file){
  if(vslObjectUrl)URL.revokeObjectURL(vslObjectUrl);vslObjectUrl=URL.createObjectURL(file);
  const media=document.createElement(file.type.startsWith("video/")?"video":"audio");media.preload="metadata";media.src=vslObjectUrl;
  try{await vslWait(media,"loadedmetadata",8000);return isFinite(media.duration)?media.duration:0;}catch(_){return 0;}
}
async function vslChooseFile(file){
  if(!file||!/^((video|audio)\/)/.test(file.type||"")){toast("Envie um arquivo de vídeo ou áudio.",true);return;}
  if(vslBusy)return;vslFile=file;vslDuration=0;vslSheets=[];vslRenderFile();vslRenderSheets();
  if(!vslName){vslName=vslBaseName(file.name);const n=$("#vslName");if(n)n.value=vslName;}
  vslDuration=await vslReadDuration(file);vslRenderFile();
}
async function vslSeek(video,value){
  const target=Math.max(0,Math.min(Math.max(0,(video.duration||0)-.12),value));
  if(Math.abs((video.currentTime||0)-target)<.04&&video.readyState>=2)return;
  const waiting=vslWait(video,"seeked",9000);video.currentTime=target;await waiting;
}
function vslDrawCover(ctx,video,x,y,w,h){const vw=video.videoWidth||w,vh=video.videoHeight||h,scale=Math.max(w/vw,h/vh),sw=w/scale,sh=h/scale,sx=(vw-sw)/2,sy=(vh-sh)/2;ctx.drawImage(video,sx,sy,sw,sh,x,y,w,h);}
async function vslBuildContactSheets(file,duration,onProgress){
  if(!file.type.startsWith("video/")||!duration)return[];
  const video=document.createElement("video");video.preload="auto";video.muted=true;video.playsInline=true;video.src=vslObjectUrl||URL.createObjectURL(file);await vslWait(video,"loadedmetadata",12000);
  const frameCount=duration>1800?36:duration>600?24:12,full=Array.from({length:frameCount},(_,i)=>Math.max(.1,(duration-.2)*(i/Math.max(1,frameCount-1)))),sets=[];
  for(let i=0;i<full.length;i+=12)sets.push({times:full.slice(i,i+12),label:`Linha do tempo ${trTime(full[i])}–${trTime(full[Math.min(full.length-1,i+11)])}`});
  if(duration>300){const start=duration*.82;sets.push({times:Array.from({length:12},(_,i)=>start+(duration-start-.2)*(i/11)),label:`Fechamento e CTA ${trTime(start)}–${trTime(duration)}`});}
  const result=[];let captured=0,total=sets.reduce((n,s)=>n+s.times.length,0);
  try{
    for(const set of sets){
      const cols=4,fw=240,fh=135,labelH=23,rows=Math.ceil(set.times.length/cols),canvas=document.createElement("canvas");canvas.width=cols*fw;canvas.height=rows*(fh+labelH);const ctx=canvas.getContext("2d");ctx.fillStyle="#080808";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.font="600 12px system-ui";ctx.textBaseline="middle";
      for(let i=0;i<set.times.length;i++){await vslSeek(video,set.times[i]);const x=(i%cols)*fw,y=Math.floor(i/cols)*(fh+labelH);vslDrawCover(ctx,video,x,y,fw,fh);ctx.fillStyle="#111";ctx.fillRect(x,y+fh,fw,labelH);ctx.fillStyle="#e5ff2d";ctx.fillText(trTime(set.times[i]),x+8,y+fh+labelH/2);captured++;if(onProgress)onProgress(captured,total);}
      const url=canvas.toDataURL("image/jpeg",.72);result.push({mediaType:"image/jpeg",data:url.split(",")[1],label:set.label});
    }
  }finally{video.removeAttribute("src");try{video.load();}catch(_){}}
  return result;
}
const VSL_DOC_BLOCK_SEC=300;
function vslTranscriptParagraphs(segments){const out=[];let line=[];for(const s of segments){const t=String(s.text||"").trim();if(!t)continue;line.push(t);if(line.length>=3||line.join(" ").length>=520){out.push(line.join(" "));line=[];}}if(line.length)out.push(line.join(" "));return out;}
function vslBuildCompleteTranscript(){
  const language=vslDetectedLang||vslLang||"não detectado",segments=vslSegments.filter(s=>s&&String(s.text||"").trim()).sort((a,b)=>(+a.start||0)-(+b.start||0));
  let doc=`# ${vslName} — Transcrição Completa Original\n\n## Metadados\n\n- **Idioma do áudio:** ${language}\n- **Duração:** ${trTime(vslDuration)}\n- **Fonte:** texto integral do áudio na ordem original\n\n> A copy abaixo preserva o idioma original e a ordem completa da VSL. A classificação estratégica dos blocos está no documento de dissecação.\n`;
  if(segments.length){
    const groups=new Map();for(const s of segments){const key=Math.floor(Math.max(0,+s.start||0)/VSL_DOC_BLOCK_SEC);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(s);}
    for(const key of [...groups.keys()].sort((a,b)=>a-b)){const start=key*VSL_DOC_BLOCK_SEC,end=Math.min(vslDuration||((key+1)*VSL_DOC_BLOCK_SEC),(key+1)*VSL_DOC_BLOCK_SEC),label=String(key+1).padStart(2,"0");doc+=`\n# Bloco ${label} — ${trTime(start)}–${trTime(end)}\n\n## Speaker / narrador do trecho\n\n${vslTranscriptParagraphs(groups.get(key)).join("\n\n")}\n`;}
  }else doc+=`\n# Transcrição original\n\n${vslRaw.trim()}\n`;
  if(vslCanonical)doc+=`\n# Apêndice — Roteiro canônico fornecido\n\n${vslCanonical}\n`;
  return doc+`\n# Fim da transcrição — ${trTime(vslDuration)}\n`;
}
function vslRememberJob(id){vslJobId=id||"";try{if(id)localStorage.setItem(VSL_LAST_JOB_KEY,id);else localStorage.removeItem(VSL_LAST_JOB_KEY);}catch(_){}}
function vslApplyJob(job){
  if(!job)return;vslJobId=job.id||vslJobId;vslJobStatus=job.status||vslJobStatus;vslName=job.name||vslName;vslNiche=job.niche||vslNiche;vslDetectedLang=job.language||vslDetectedLang;vslDuration=+job.duration||vslDuration;
  if(job.transcriptDoc)vslTranscriptDoc=job.transcriptDoc;if(typeof job.analysisDoc==="string")vslAnalysisDoc=job.analysisDoc;
  const n=$("#vslName"),ni=$("#vslNiche");if(n)n.value=vslName;if(ni&&vslNiche)ni.value=vslNiche;
  const retry=$("#vslRetry");if(retry)retry.hidden=job.status!=="error";
  vslRenderDocs();vslSetStatus(3,job.message||(job.status==="complete"?"Dissecação concluída.":"Processando a análise…"),+job.progress||70);
}
async function vslFetchJob(token,id,signal){
  const response=await fetch(VSL_JOB_FN+"?id="+encodeURIComponent(id),{headers:{"Authorization":"Bearer "+token},cache:"no-store",signal});
  let data={};try{data=await response.json();}catch(_){}
  if(!response.ok||!data.ok)throw new Error(data.error||("Falha ao consultar a análise: HTTP "+response.status));
  return data.job;
}
async function vslPollJob(token,id,signal){
  for(;;){
    const job=await vslFetchJob(token,id,signal);vslApplyJob(job);
    if(job.status==="complete")return job;
    if(job.status==="error")throw new Error(job.error||job.message||"A dissecação falhou na etapa atual.");
    await vslDelay(3000,signal);
  }
}
async function vslCreateJob(token,payload,signal){
  const response=await fetch(VSL_JOB_FN,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},body:JSON.stringify(payload),signal});
  let data={};try{data=await response.json();}catch(_){}
  if(!response.ok||!data.ok||!data.id)throw new Error(data.error||("Não foi possível iniciar a análise: HTTP "+response.status));
  vslRememberJob(data.id);return data.id;
}
async function vslRetryLastJob(){
  if(vslBusy||!vslJobId)return;vslBusy=true;vslJobStatus="queued";vslAbort=new AbortController();const retry=$("#vslRetry"),cancel=$("#vslCancel");if(retry)retry.hidden=true;if(cancel){cancel.hidden=false;cancel.textContent="Fechar acompanhamento";}
  try{
    const token=await trToken();if(!token)throw new Error("sessão expirada — faça login novamente");
    const response=await fetch(VSL_JOB_FN,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},body:JSON.stringify({action:"retry",id:vslJobId}),signal:vslAbort.signal});let data={};try{data=await response.json();}catch(_){}if(!response.ok||!data.ok)throw new Error(data.error||"Não foi possível retomar a análise.");
    vslSetStatus(3,"Retomando do último ponto salvo…",Math.max(70,+($("#vslProgressFill")&&parseFloat($("#vslProgressFill").style.width))||70));await vslPollJob(token,vslJobId,vslAbort.signal);toast("VSL dissecada ✓");
  }catch(e){if(e&&e.name==="AbortError")vslSetStatus(3,"Acompanhamento fechado. A análise continua e reaparecerá quando você voltar.",70);else{vslJobStatus="error";vslSetStatus(3,(e&&e.message)||"Não foi possível retomar a análise.",0);if(retry)retry.hidden=false;toast((e&&e.message)||"Não foi possível retomar a análise.",true);}}
  finally{vslBusy=false;vslAbort=null;if(cancel){cancel.hidden=true;cancel.textContent="Cancelar";}vslRenderFile();vslRenderDocs();}
}
async function vslResumeLastJob(){
  if(vslBusy||vslRestoring)return;let id="";try{id=localStorage.getItem(VSL_LAST_JOB_KEY)||"";}catch(_){}if(!id)return;
  vslRestoring=true;let token="";
  try{
    token=await trToken();if(!token)return;const first=await vslFetchJob(token,id);vslApplyJob(first);
    if(first.status==="complete"){vslSetStatus(3,"Transcrição completa e dissecação concluídas.",100);return;}
    if(first.status==="error")throw new Error(first.error||first.message||"A análise anterior falhou.");
    vslBusy=true;vslAbort=new AbortController();vslRenderFile();const cancel=$("#vslCancel");if(cancel){cancel.hidden=false;cancel.textContent="Fechar acompanhamento";}
    await vslPollJob(token,id,vslAbort.signal);toast("VSL dissecada ✓");
  }catch(e){
    if(e&&e.name==="AbortError")vslSetStatus(3,"Acompanhamento fechado. A dissecação continua em segundo plano.",Math.max(70,+($("#vslProgressFill")&&parseFloat($("#vslProgressFill").style.width))||70));
    else{vslSetStatus(3,(e&&e.message)||"Falha ao recuperar a análise",0);toast((e&&e.message)||"Falha ao recuperar a análise",true);}
  }finally{
    vslBusy=false;vslAbort=null;vslRestoring=false;vslRenderFile();vslRenderDocs();const cancel=$("#vslCancel");if(cancel){cancel.hidden=true;cancel.textContent="Cancelar";}
  }
}
function vslFileCacheKey(file,lang){return [file&&file.name,file&&file.size,file&&file.lastModified,lang||"auto"].join(":");}
function vslLoadProgress(key){
  try{const saved=JSON.parse(localStorage.getItem(VSL_PROGRESS_KEY)||"null");if(saved&&saved.key===key&&Array.isArray(saved.parts)){saved.parts.forEach((part,index)=>{if(part)vslChunkCache.set(index,part);});}}catch(_){}
}
function vslSaveProgress(key){
  try{localStorage.setItem(VSL_PROGRESS_KEY,JSON.stringify({key,parts:Array.from(vslChunkCache.entries()).sort((a,b)=>a[0]-b[0]).map(entry=>entry[1]),savedAt:new Date().toISOString()}));}catch(_){}
}
function vslClearProgress(key){try{const saved=JSON.parse(localStorage.getItem(VSL_PROGRESS_KEY)||"null");if(!saved||saved.key===key)localStorage.removeItem(VSL_PROGRESS_KEY);}catch(_){}}
function vslAbortError(){try{return new DOMException("Processamento cancelado","AbortError");}catch(_){const e=new Error("Processamento cancelado");e.name="AbortError";return e;}}
function vslDelay(ms,signal){return new Promise((resolve,reject)=>{if(signal&&signal.aborted)return reject(vslAbortError());const timer=setTimeout(done,ms);function done(){if(signal)signal.removeEventListener("abort",stop);resolve();}function stop(){clearTimeout(timer);reject(vslAbortError());}if(signal)signal.addEventListener("abort",stop,{once:true});});}
function vslMergeParts(a,b){return{text:[a.text,b.text].filter(Boolean).join(" ").trim(),language:a.language||b.language||"",segments:[...(a.segments||[]),...(b.segments||[])],words:[...(a.words||[]),...(b.words||[])]};}
async function vslPostAudio(samples,rate,token,lang,offset,signal,timeScale=1){
  const leadSamples=Math.max(0,Math.round(rate*TR_WHISPER_LEAD_SEC)),prepared=new Float32Array(leadSamples+samples.length);prepared.set(samples,leadSamples);
  const r=await fetch(TR_FN+"?lang="+encodeURIComponent(lang),{method:"POST",headers:{"Content-Type":"audio/wav","Authorization":"Bearer "+token},body:trWav(prepared,rate),signal});
  let j={};try{j=await r.json();}catch(_){}
  if(!r.ok||!j.ok){const e=new Error(j.error||("Falha na transcrição: HTTP "+r.status));e.status=r.status;e.retryAfterMs=Math.max(0,(+j.retryAfter||+(r.headers.get("retry-after")||0))*1000);throw e;}
  const shift=leadSamples/rate;
  return{text:String(j.text||"").trim(),language:String(j.language||""),segments:Array.isArray(j.segments)?j.segments.map(s=>({start:Math.max(offset,((+s.start||0)-shift)*timeScale+offset),end:Math.max(offset,((+s.end||0)-shift)*timeScale+offset),text:String(s.text||"").trim()})).filter(s=>s.text):[],words:Array.isArray(j.words)?j.words.map(w=>({word:String(w.word||"").trim(),start:Math.max(offset,((+w.start||0)-shift)*timeScale+offset),end:Math.max(offset,((+w.end||0)-shift)*timeScale+offset)})).filter(w=>w.word):[]};
}
async function vslTranscribeSlice(samples,rate,token,lang,offset,signal,onAdapt,depth=0,timeScale=1){
  let lastError=null,rateWaits=0;const seconds=samples.length/rate;
  for(let attempt=0;attempt<VSL_TRANSIENT_RETRIES;attempt++){
    try{return await vslPostAudio(samples,rate,token,lang,offset,signal,timeScale);}catch(e){
      if(e&&e.name==="AbortError")throw e;lastError=e;const status=+e.status||0,authFailure=status===400||status===401||status===403,canSplit=seconds>VSL_MIN_CHUNK_SEC*2.1;
      if(status===429&&rateWaits<8){
        const wait=Math.min(120000,Math.max(5000,+e.retryAfterMs||12000)*(1+rateWaits*.15));rateWaits++;
        if(onAdapt)onAdapt(`Limite temporário atingido; aguardando ${Math.ceil(wait/1000)}s sem perder o progresso…`);
        await vslDelay(wait,signal);attempt--;continue;
      }
      if(!authFailure&&canSplit&&(status===0||status===413||status===422||status===502||status===503||status===504)){
        if(onAdapt)onAdapt(status===422?`A fala ficou inconsistente; recalculando ${Math.round(seconds)}s em trechos menores…`:`Uma parte demorou além do limite; dividindo ${Math.round(seconds)}s em trechos menores…`);
        const middle=Math.floor(samples.length/2),left=await vslTranscribeSlice(samples.subarray(0,middle),rate,token,lang,offset,signal,onAdapt,depth+1,timeScale),right=await vslTranscribeSlice(samples.subarray(middle),rate,token,lang,offset+(middle/rate)*timeScale,signal,onAdapt,depth+1,timeScale);
        return vslMergeParts(left,right);
      }
      const transient=status===0||status===429||status===502||status===503||status===504;
      if(!transient||attempt===VSL_TRANSIENT_RETRIES-1)throw e;
      if(onAdapt)onAdapt(`Serviço ocupado; tentando novamente (${attempt+2}/${VSL_TRANSIENT_RETRIES})…`);
      await vslDelay(1200*(attempt+1),signal);
    }
  }
  throw lastError||new Error("Falha ao transcrever esta parte");
}
function vslAppendPart(part){if(part.text)vslRaw+=(vslRaw?" ":"")+part.text;if(part.language&&!vslDetectedLang)vslDetectedLang=part.language;vslSegments.push(...(part.segments||[]));vslWords.push(...(part.words||[]));}
async function vslRun(){
  if(vslBusy||!vslFile)return;vslName=($("#vslName").value||vslBaseName(vslFile.name)).trim();vslNiche=$("#vslNiche").value;vslLang=$("#vslLang").value;vslCanonical=$("#vslCanonical").value.trim();
  if(!vslName){toast("Dê um nome para a VSL.",true);$("#vslName").focus();return;}
  vslBusy=true;vslAbort=new AbortController();vslRememberJob("");vslRaw="";vslSegments=[];vslWords=[];vslDetectedLang="";vslSheets=[];vslTranscriptDoc="";vslAnalysisDoc="";vslActiveTab="transcript";vslRenderFile();vslRenderSheets();vslRenderDocs();
  const run=$("#vslRun"),cancel=$("#vslCancel");if(run)run.disabled=true;if(cancel)cancel.hidden=false;
  try{
    const token=await trToken();if(!token)throw new Error("sessão expirada — faça login novamente");
    vslSetStatus(1,"Preparando o áudio…",4);
    const cacheKey=vslFileCacheKey(vslFile,vslLang);if(vslCacheKey!==cacheKey){vslChunkCache.clear();vslCacheKey=cacheKey;vslLoadProgress(cacheKey);}
    let resumeAt=0;while(vslChunkCache.has(resumeAt)){vslAppendPart(vslChunkCache.get(resumeAt));resumeAt++;}
    const pipeline=trOrderedPipeline(
      async chunk=>{
        const pct=8+Math.round((chunk.index/chunk.totalChunks)*48),cached=vslChunkCache.get(chunk.index);
        vslSetStatus(1,cached?`Retomando parte ${chunk.index+1} de ${chunk.totalChunks} já concluída…`:`Transcrevendo parte ${chunk.index+1} de ${chunk.totalChunks} · preparando a próxima em paralelo…`,pct);
        const rawPart=cached||await vslTranscribeSlice(chunk.samples,chunk.rate,token,vslLang,chunk.offset,vslAbort.signal,msg=>vslSetStatus(1,`Parte ${chunk.index+1} de ${chunk.totalChunks}: ${msg}`,pct),0,chunk.timeScale),part=cached?rawPart:trCropChunkPart(rawPart,chunk);
        return{chunk,part,cached};
      },
      async({chunk,part,cached})=>{
        if(!cached){vslChunkCache.set(chunk.index,part);vslSaveProgress(cacheKey);}
        vslAppendPart(part);
      }
    );
    await trForEachAudioChunk(vslFile,VSL_CHUNK_SEC,{
      startChunk:resumeAt,
      signal:vslAbort.signal,
      onPlan:async plan=>{vslDuration=plan.duration;vslRenderFile();},
      onStatus:state=>{if(state.message)vslSetStatus(1,state.message,5);else if(state.current!=null)vslSetStatus(1,`Extraindo parte ${state.index+1} de ${state.totalChunks} · ${trTime(state.current)} de ${trTime(vslDuration)}…`,6+Math.round((state.index/state.totalChunks)*45));},
      onChunk:chunk=>pipeline.push(chunk)
    });
    await pipeline.drain();
    if(!vslRaw.trim())throw new Error("nenhuma fala foi detectada na VSL");
    vslTranscriptDoc=vslBuildCompleteTranscript();vslRenderDocs();
    vslSetStatus(2,vslFile.type.startsWith("video/")?"Analisando as imagens do vídeo…":"Arquivo de áudio: seguindo apenas com o conteúdo falado.",58);
    try{vslSheets=await vslBuildContactSheets(vslFile,vslDuration,(done,total)=>vslSetStatus(2,`Capturando quadro ${done} de ${total}…`,58+Math.round((done/total)*9)));}catch(e){console.warn("contact sheets falharam",e);vslSheets=[];}
    vslRenderSheets();vslSetStatus(3,"Salvando o material e iniciando a dissecação…",68);
    const payload={name:vslName,niche:vslNiche,language:vslDetectedLang||vslLang,duration:vslDuration,organizedTranscript:vslTranscriptDoc,contactSheets:vslSheets};
    const id=await vslCreateJob(token,payload,vslAbort.signal);if(cancel)cancel.textContent="Fechar acompanhamento";
    vslSetStatus(3,"Material salvo. A dissecação continua mesmo se você fechar esta página…",70);await vslPollJob(token,id,vslAbort.signal);
    if(!vslAnalysisDoc.trim())throw new Error("A dissecação estratégica não retornou conteúdo.");
    vslClearProgress(cacheKey);vslSetStatus(3,"Transcrição completa e dissecação concluídas.",100);toast("VSL dissecada ✓");
  }catch(e){
    if(e&&e.name==="AbortError")vslSetStatus(vslJobId?3:1,vslJobId?"Acompanhamento fechado. A dissecação continua em segundo plano e reaparecerá quando você voltar.":"Processamento cancelado. Os resultados parciais foram preservados.",vslJobId?70:0);else{vslSetStatus(vslTranscriptDoc?3:1,(e&&e.message)||"Falha ao processar a VSL",0);toast((e&&e.message)||"Falha ao processar a VSL",true);}
  }finally{vslBusy=false;vslAbort=null;if(vslRenderTimer){clearTimeout(vslRenderTimer);vslRenderTimer=0;}vslRenderFile();vslRenderDocs();if(cancel){cancel.hidden=true;cancel.textContent="Cancelar";}if(run)run.disabled=!vslFile;}
}
function vslReset(){
  if(vslBusy)return;vslRememberJob("");vslJobStatus="";vslFile=null;if(vslObjectUrl)URL.revokeObjectURL(vslObjectUrl);vslObjectUrl="";vslName="";vslNiche="";vslLang="auto";vslCanonical="";vslRaw="";vslSegments=[];vslWords=[];vslDetectedLang="";vslDuration=0;vslSheets=[];vslTranscriptDoc="";vslAnalysisDoc="";vslActiveTab="transcript";vslChunkCache.clear();vslCacheKey="";renderVslDissector(true);
}
function renderVslDissector(force){
  const area=$("#gridArea");if(!area)return;if($("#vslDissector")&&!force)return;
  area.innerHTML=`<div class="vsltool" id="vslDissector">
    <div class="cchief__hero"><div class="cchief__mark">${ic("scissors")}</div><div class="cchief__heroTx"><div class="cchief__heroTitle">Dissecador de VSL <span class="chat__beta">Beta</span></div><p>Transforma uma VSL em dois ativos: <b>transcrição completa organizada</b> e <b>dissecação estratégica por blocos</b>. A análise considera a fala, as pessoas, as provas, a oferta e o fechamento.</p></div></div>
    <section class="vslstage" aria-label="Configurar dissecação da VSL">
      <div class="vslmeta">
        <label class="vslfield"><span>Nome da VSL</span><input id="vslName" type="text" value="${esc(vslName)}" placeholder="Ex.: Gelatin Burn — VSL principal" autocomplete="off"></label>
        <label class="vslfield"><span>Nicho</span><select id="vslNiche"><option value="">Detectar automaticamente</option>${NICHOS.map(n=>`<option value="${esc(n)}"${vslNiche===n?" selected":""}>${esc(n)}</option>`).join("")}</select></label>
        <label class="vslfield"><span>Idioma do áudio</span><select id="vslLang">${TR_LANGS.map(([v,l])=>`<option value="${v}"${vslLang===v?" selected":""}>${esc(l)}</option>`).join("")}</select></label>
      </div>
      <div class="vsldrop" id="vslDrop" tabindex="0" role="button" aria-label="Selecionar arquivo da VSL"></div>
      <input type="file" id="vslFile" accept="video/*,audio/*" hidden>
      <details class="vslextra"><summary>Adicionar roteiro original do copywriter (opcional)</summary><label class="vslfield"><span>Roteiro canônico</span><textarea id="vslCanonical" placeholder="Cole aqui a copy original aprovada. Ela será usada como fonte principal; o vídeo valida execução, ordem e diferenças.">${esc(vslCanonical)}</textarea></label></details>
      <div class="vslactions toolactions"><button class="btn btn--accent" id="vslRun" disabled>${ic("scissors")}Transcrever e dissecar</button><button class="btn btn--outline" id="vslCancel" hidden>Cancelar</button><button class="btn btn--outline" id="vslRetry" hidden>Tentar novamente</button><button class="btn btn--outline" id="vslReset">Limpar</button><span class="toolactions__hint">${ic("info")}A transcrição é salva por partes. Depois dela, a dissecação continua mesmo se você fechar esta página.</span></div>
    </section>
    <section class="vslprogress" id="vslProgress" hidden aria-live="polite">
      <div class="vslsteps"><div class="vslstep" data-vslstep="1"><span class="vslstep__n">1</span><div class="vslstep__tx"><b>Transcrição</b><span>Texto completo no idioma original</span></div></div><div class="vslstep" data-vslstep="2"><span class="vslstep__n">2</span><div class="vslstep__tx"><b>Leitura do vídeo</b><span>Pessoas, provas, produto e oferta</span></div></div><div class="vslstep" data-vslstep="3"><span class="vslstep__n">3</span><div class="vslstep__tx"><b>Dissecação</b><span>Blocos, crenças, mecanismo e fechamento</span></div></div></div>
      <div class="vslprogress__bar"><span class="vslprogress__fill" id="vslProgressFill"></span></div><div class="vslprogress__status" id="vslProgressStatus"></div><div class="vslsheets" id="vslSheets"></div>
    </section>
    <section class="vsloutputs" id="vslOutputs" hidden>
      <div class="vsloutbar"><div class="vsltabs" role="tablist"><button class="vsltab active" role="tab" data-vsltab="transcript">Transcrição completa <span class="vsltab__state" id="vslTranscriptState">—</span></button><button class="vsltab" role="tab" data-vsltab="analysis">Dissecação estratégica <span class="vsltab__state" id="vslAnalysisState">—</span></button></div><div class="vslouttools"><button class="btn btn--outline btn--sm" id="vslCopy">${ic("clipboard")}Copiar</button><button class="btn btn--outline btn--sm" data-vsldownload="md">${ic("download")}Markdown</button><button class="btn btn--outline btn--sm" data-vsldownload="pdf">${ic("file")}PDF</button><button class="btn btn--outline btn--sm" id="vslGoogleDocs">${ic("file")}Google Docs</button></div></div>
      <div class="vsldoc" id="vslTranscriptDoc" role="tabpanel"><div class="chat__md vslmd" id="vslTranscriptMd"></div></div><div class="vsldoc" id="vslAnalysisDoc" role="tabpanel" hidden><div class="chat__md vslmd" id="vslAnalysisMd"></div></div>
    </section>
  </div>`;
  const input=$("#vslFile"),drop=$("#vslDrop"),pick=()=>{if(!vslBusy)input.click();};
  input.addEventListener("change",async()=>{const file=input.files[0];if(!file)return;try{await vslChooseFile(file);}finally{input.value="";}});drop.addEventListener("click",pick);drop.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();pick();}});drop.addEventListener("dragover",e=>{e.preventDefault();drop.classList.add("active");});drop.addEventListener("dragleave",()=>drop.classList.remove("active"));drop.addEventListener("drop",e=>{e.preventDefault();drop.classList.remove("active");const f=[...e.dataTransfer.files].find(x=>/^(video|audio)\//.test(x.type));if(f)vslChooseFile(f);else toast("Arraste um vídeo ou áudio.",true);});
  $("#vslName").addEventListener("input",e=>vslName=e.target.value);$("#vslNiche").addEventListener("change",e=>vslNiche=e.target.value);$("#vslLang").addEventListener("change",e=>vslLang=e.target.value);$("#vslCanonical").addEventListener("input",e=>vslCanonical=e.target.value);
  $("#vslRun").addEventListener("click",vslRun);$("#vslCancel").addEventListener("click",()=>{if(vslAbort)vslAbort.abort();});$("#vslRetry").addEventListener("click",vslRetryLastJob);$("#vslReset").addEventListener("click",vslReset);
  $$("[data-vsltab]").forEach(b=>b.addEventListener("click",()=>{vslActiveTab=b.dataset.vsltab;vslRenderDocs();}));
  $("#vslCopy").addEventListener("click",()=>{const text=vslActiveTab==="analysis"?vslAnalysisDoc:vslTranscriptDoc;if(!text){toast("Esse documento ainda não está pronto.",true);return;}navigator.clipboard.writeText(text).then(()=>toast("Copiado ✓"));});
  $$('[data-vsldownload]').forEach(b=>b.addEventListener("click",()=>vslDownload(vslActiveTab,b.dataset.vsldownload)));$("#vslGoogleDocs").addEventListener("click",()=>vslOpenGoogleDocs(vslActiveTab));vslRenderFile();vslRenderSheets();vslRenderDocs();
  if(vslBusy)vslSetStatus(vslTranscriptDoc?3:1,"Processamento em andamento…",vslTranscriptDoc?78:20);
  else setTimeout(vslResumeLastJob,0);
}

/* ===== CARDS DOS NOVOS SWIPES ===== */
const cardPosterCache=new Map();
function staticCardPreview(src,alt,play=false,fallback=""){
  if(!src)return `<div class="cmedia cmedia--empty">${ic("image")}<span>Prévia indisponível</span></div>`;
  return `<div class="cmedia cmedia--offer${play?" cmedia--vid":""}" title="Abra o card para ver a oferta"><img loading="lazy" decoding="async" fetchpriority="low" width="640" height="400" src="${esc(src)}" alt="${esc(alt||"Prévia da oferta")}"${fallback?` data-offer-preview-fallback="${esc(fallback)}"`:""}>${play?`<span class="cmedia__play">${ic("play")}</span>`:""}</div>`;
}
function offerCardPreview(d,alt){
  const domains=Array.isArray(d&&d.dominios)?d.dominios:[],withVsl=domains.find(x=>x&&(x.vslVideo||x.vslLink))||{},pageShot=(domains.find(x=>x&&x.printPV)||{}).printPV||"",fallback=pageShot||d.imagemProduto||"",video=String(withVsl.vslVideo||withVsl.vslLink||"").trim();
  if(video){
    const emb=videoEmbedUrl(video);
    if(emb&&emb.type==="video")return mediaThumb("",alt,true,video);
    const thumb=driveThumbUrl(video,1000);
    if(thumb)return staticCardPreview(thumb,`Primeiro frame de ${alt}`,true,fallback);
  }
  return staticCardPreview(pageShot||d.imagemProduto||"",pageShot?`Página de vendas de ${alt}`:alt,false);
}
function offerVslDetailPreview(domain,offer){
  const url=String((domain&&domain.vslVideo)||(domain&&domain.vslLink)||"").trim();if(!url)return"";
  const fallback=String((domain&&domain.printPV)||(offer&&offer.imagemProduto)||"").trim(),driveThumb=driveThumbUrl(url,1400),embed=videoEmbedHtml(url);
  if(driveThumb)return `<div class="offer-vsl"><div class="offer-vsl__label">${ic("play")}Prévia da VSL</div><a class="offer-vsl__preview" href="${esc(fixUrl(url))}" target="_blank" rel="noopener"><img loading="lazy" decoding="async" width="640" height="360" src="${esc(driveThumb)}" alt="Primeiro frame da VSL"${fallback?` data-offer-preview-fallback="${esc(fallback)}"`:""}><span class="cmedia__play">${ic("play")}</span></a></div>`;
  return embed?`<div class="offer-vsl"><div class="offer-vsl__label">${ic("play")}VSL vinculada</div>${embed}</div>`:"";
}
function mediaThumb(img,alt,hasVideo,videoUrl){
  const play=hasVideo?`<span class="cmedia__play">${ic("play")}</span>`:"";
  if(img)return `<a class="cmedia" href="${esc(img)}" data-lightbox="${esc(img)}"><img loading="lazy" decoding="async" fetchpriority="low" width="640" height="400" src="${esc(img)}" alt="${esc(alt||"")}"><span class="cmedia__zoom">${ic("maximize")}</span>${play}</a>`;
  /* O card recebe somente uma imagem do primeiro take. O player completo é
     carregado apenas quando a pessoa abre o criativo. */
  const emb=videoUrl?videoEmbedUrl(videoUrl):null;
  if(emb&&emb.type==="video"){
    const cached=cardPosterCache.get(emb.src);
    return `<div class="cmedia cmedia--vid" title="Abra o card para assistir" data-card-video-poster="${esc(emb.src)}">${cached?`<img class="cmedia__poster" loading="lazy" decoding="async" width="640" height="400" src="${esc(cached)}" alt="Primeiro take de ${esc(alt||"vídeo")}">`:`<span class="cmedia__posterload">${ic("film")}</span>`}${play}</div>`;
  }
  if(hasVideo)return `<div class="cmedia cmedia--empty">${ic("film")}<span>Vídeo — abra para assistir</span></div>`;
  return `<div class="cmedia cmedia--empty">${ic("image")}<span>Sem print</span></div>`;
}
function commentPreview(c){if(!c)return"";return `<div class="kcomment">${ic("message")}<span>${esc(c)}</span></div>`;}
function emptyActions(){return `<span class="muted-empty" style="font-size:.8rem">Sem link — abra para ver</span>`;}
function nicheChip(d){return d.nicho?`<div class="card__chips"><span class="chip niche">${esc(d.nicho)}</span></div>`:"";}
function creativeUploadDate(o){
  const d=(o&&o.data)||{},raw=(o&&o.created_at)||d.uploadedAt||d.importedAt||"",date=new Date(raw);
  return Number.isFinite(date.getTime())?date.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric",timeZone:"America/Sao_Paulo"}):"";
}
function creativeUploadMeta(o){
  const date=creativeUploadDate(o);
  return date?`<div class="creative-upload-date">${ic("clock")}Adicionado em <strong>${esc(date)}</strong></div>`:"";
}
function creativeCardMedia(d,video){
  return video?mediaThumb("",d.nome,true,video):mediaThumb(d.print,d.nome,false,"");
}

/* ===== COMPONENTE CANÔNICO DE CARD =====
   Único ponto que monta o esqueleto de TODO card (ofertas, presell, criativo,
   mega brain, tiktok, notícia). As seções só preenchem os slots; a estrutura,
   o wrapper .card, o cabeçalho e o rodapé de ações são padronizados aqui.
   Slots (HTML já pronto, exceto brand/title que são texto puro):
     id, variant, head, media, body, chips, extra, actions
   Regras de uniformidade:
     • .card__head só aparece se houver conteúdo de cabeçalho;
     • se body vier vazio mas houver brand/title, monta a identidade padrão;
     • .card__actions SEMPRE aparece (fallback padrão) para manter a mesma
       altura e o mesmo alinhamento em todos os cards. */
function cardIdentity(brand,title){
  return `<div class="card__id">${brand?`<div class="card__brand">${esc(brand)}</div>`:""}${title?`<div class="card__title">${esc(title)}</div>`:""}</div>`;
}
function card({id,variant="",top="",head="",media="",body="",brand="",title="",chips="",extra="",actions=""}){
  if(!body&&(brand||title))body=cardIdentity(brand,title);
  return `<article class="card${variant?" "+variant:""}" data-id="${id}">`
    +top
    +`<div class="card__head${head?"":" card__head--empty"}">${head||"<span aria-hidden=\"true\">&nbsp;</span>"}</div>`
    +media
    +body
    +(chips||`<div class="card__chips card__chips--empty" aria-hidden="true"><span class="chip">—</span></div>`)
    +extra
    +`<div class="card__actions">${actions||emptyActions()}</div>`
    +`</article>`;
}

function presellCard(o){
  const d=o.data||{};
  const native=d.tipoTrafego==="native";
  const badge=native?`<span class="tbadge tbadge--native"><span class="tdot"></span>Native · Taboola</span>`:`<span class="tbadge tbadge--fb"><span class="tdot"></span>Meta Ads</span>`;
  const acts=qbtn("Abrir presell",d.link,"newspaper");
  return card({
    id:o.id,variant:"kcard",
    head:`${badge}<span class="ktag">${ic("newspaper")}Presell</span>`,
    media:mediaThumb(d.print,d.nome),
    brand:d.marca||"",title:d.nome||"Sem título",
    chips:nicheChip(d),
    extra:commentPreview(d.comentario),
    actions:acts
  });
}
function criativoCard(o){
  const d=o.data||{};
  const organic=sectionOf(o)==="organic";
  const collectionLabel=organic?"VIDEO ORGANICO":d.collectionLabel;
  const collection=collectionLabel?`<div class="collection-flag">${ic("user")}${esc(collectionLabel)}</div>`:"";
  const tab=d.plataforma==="taboola";
  const badge=organic?`<span class="tbadge"><span class="tdot"></span>Organic</span>`:tab?`<span class="tbadge tbadge--native"><span class="tdot"></span>Taboola</span>`:`<span class="tbadge tbadge--fb"><span class="tdot"></span>Meta Ads</span>`;
  const va=videoOfCrv(d);
  /* A plataforma descreve a origem do anúncio, não o tipo da mídia. Criativos
     nativos também podem ter MP4 e devem usar o primeiro frame como capa. */
  const hasVid=!!va;
  const copy=brainCopyText(d),transcript=String(d.transcricao||"").trim(),copyLink=(d.copyLink||"").trim();
  const canonical=String(d.transcriptionStatus||d.transcricaoStatus||"").toLowerCase(),transcriptState=transcript?"ready":canonical==="failed"||canonical==="error"?"error":["pending","processing","working","retry_scheduled"].includes(canonical)?"pending":"missing";
  const translated=!!String(d.transcricaoPt||"").trim(),translationState=String(d.transcricaoPtStatus||"").toLowerCase();
  const copyAction=transcript?`<button class="qbtn" data-copy-transcript="${o.id}" title="Copiar a transcrição" aria-label="Copiar transcrição de ${esc(d.nome||"criativo")}">${ic("clipboard")}Copiar transcrição</button>`:hasVid&&isAdmin?`<button class="qbtn" data-transcribe-card="${o.id}" title="Gerar transcrição">${ic("mic")}Transcrever</button>`:`<button class="qbtn" disabled title="Transcrição ainda não disponível">${ic("mic")}Sem transcrição</button>`;
  const acts=[qbtn("Anúncio",d.linkAnuncio,"external"),hasVid?qbtn("Vídeo",va,"play"):"",copyAction,(copy||copyLink)?`<button class="qbtn" data-copy="${o.id}" title="Ver e copiar a copy">${ic("type")}Ver copy</button>`:""].filter(Boolean).join("");
  const st=fbStatusOf(o);
  const fbchip=d.fbDaysActive!=null?`<span class="chip ${d.fbActive?"accent":""}">${ic("clock")}${esc(fbDaysText(d))}</span>`:"";
  const chips=organic?`<div class="card__chips"><span class="chip accent">Swipe Organic</span><span class="chip">Banco de hooks</span></div>`:(d.nicho||fbchip)?`<div class="card__chips">${d.nicho?`<span class="chip niche">${esc(d.nicho)}</span>`:""}${fbchip}</div>`:"";
  const fbwork=st==="working"||st==="queued"?`<div class="fbwork">${ic("download")}Anexando mídia ao card…</div>`
    :st==="retry_scheduled"?`<div class="fbwork">${ic("clock")}Nova tentativa de mídia agendada</div>`:"";
  return card({
    id:o.id,variant:"kcard",
    head:`${badge}<span class="ktag">${ic(organic?"sparkles":"play")}${organic?"Swipe Organic":"Criativo"}</span>`,
    media:creativeCardMedia(d,hasVid?va:""),
    body:`${collection}${cardIdentity(d.marca||"",d.nome||"Sem título")}${creativeUploadMeta(o)}`,
    chips:`${chips}${fbwork}<div class="transcription-state ${transcriptState==="ready"?"is-ready":transcriptState==="error"?"is-error":""}">${ic(transcriptState==="ready"?"file":transcriptState==="error"?"alert":"clock")}${transcriptState==="ready"?"Transcrição original pronta":transcriptState==="pending"?"Transcrição em andamento":transcriptState==="error"?"Transcrição precisa de nova tentativa":"Aguardando transcrição"}${transcript?`<span class="transcription-state__translation">· ${translated?"Português pronto":translationState==="working"?"traduzindo…":"tradução na fila"}</span>`:""}</div>`,
    actions:acts
  });
}
function brandCreativeCard(o){
  const d=o.data||{},va=videoOfCrv(d),hasVid=!!va,brand=d.marca||"Balls n Brains";
  const collection=d.collectionLabel||brand;
  const actions=[hasVid?qbtn("Vídeo",va,"play"):"",d.print?qbtn("Imagem",d.print,"image"):""].filter(Boolean).join("");
  return card({
    id:o.id,variant:"kcard brand-card",
    head:`<span class="tbadge tbadge--brands"><span class="tdot"></span>FEG Brands</span><span class="ktag">${ic("play")}${esc(brand)}</span>`,
    media:mediaThumb(d.print,d.nome,hasVid,hasVid?va:""),
    body:`<div class="collection-flag">${ic("trending")}${esc(collection)}</div>${cardIdentity(brand,d.nome||"Criativo sem título")}`,
    chips:`<div class="card__chips"><span class="chip accent">${esc(brand)}</span><span class="chip">Swipe de Criativos</span></div>`,
    actions
  });
}
/* Selo temporario para validar o fluxo manual do Mega Brain sem alterar o nome do criativo. */
const BRAIN_VALIDATION_TEST_IDS=new Set(["9daefe15-3078-45f4-bafa-f6ddc3c2ea91"]);
function brainIsValidationTest(o){return !!(o&&BRAIN_VALIDATION_TEST_IDS.has(o.id));}
function brainSalesPending(d){return d&&((d.metricaPendente===true)||(d.autor==="Elaine Montone"&&!brainHasMetric(d)));}
function brainCopyText(d){return String((d&&(d.transcricao||d.copy||d.copyVsl||d.copyCriativo))||"").trim();}
function brainCopyIsTranscript(d){return !!String((d&&d.transcricao)||"").trim();}
function brainCopyMarkup(d){
  const copy=brainCopyText(d);if(!copy)return"";
  const timings=Array.isArray(d.transcricaoWords)?d.transcricaoWords.filter(w=>w&&String(w.word||"").trim()&&isFinite(+w.start)):[];
  if(timings.length)return timings.map(w=>`<button type="button" class="brainword" data-brainword data-start="${Math.max(0,+w.start||0)}"${isFinite(+w.end)?` data-end="${Math.max(+w.start||0,+w.end||0)}"`:""}>${esc(String(w.word||"").trim())}</button>`).join(" ");
  if(!String((d&&d.transcricao)||"").trim())return esc(copy);
  const tokens=copy.split(/(\s+)/),words=tokens.filter(t=>t&&!/^\s+$/.test(t));
  let wi=0;
  return tokens.map(token=>{
    if(!token||/^\s+$/.test(token))return esc(token);
    const ratio=words.length>1?wi/(words.length-1):0;
    wi++;return `<button type="button" class="brainword" data-brainword data-ratio="${ratio.toFixed(6)}">${esc(token)}</button>`;
  }).join("");
}
function wireVideoTranscripts(root){
  $$('[data-video-sync]',root||document).forEach(stage=>{
    const video=$("video.vplayer",stage),pane=$("[data-transcript-pane]",stage),words=$$('[data-brainword]',stage);if(!video||!words.length||!pane)return;
    const followBtn=$("[data-brain-follow]",stage);let follow=true,active=-1,running=false,frameHandle=0,videoFrameClock=false;
    const setFollow=value=>{follow=value;if(followBtn){followBtn.classList.toggle("active",follow);followBtn.innerHTML=ic("play")+(follow?"Seguindo áudio":"Seguir áudio");followBtn.setAttribute("aria-pressed",String(follow));}};
    const activate=index=>{if(index===active||index<0||index>=words.length)return;if(active>=0){words[active].classList.remove("is-active");if(index>active){for(let i=active;i<index;i++)words[i].classList.add("is-past");}else{for(let i=index;i<=active;i++)words[i].classList.remove("is-past");}}active=index;const current=words[index];current.classList.add("is-active");if(follow){const target=Math.max(0,current.offsetTop-pane.clientHeight*.42);if(Math.abs(pane.scrollTop-target)>pane.clientHeight*.3)pane.scrollTo({top:target,behavior:"auto"});}};
    const atTime=time=>{const timed=words[0].dataset.start!==undefined;if(timed){let lo=0,hi=words.length-1,ans=-1;while(lo<=hi){const mid=(lo+hi)>>1;if((+words[mid].dataset.start||0)<=time){ans=mid;lo=mid+1;}else hi=mid-1;}return ans;}const duration=video.duration||0;if(!duration)return 0;return Math.min(words.length-1,Math.floor((time/duration)*words.length));};
    const syncNow=time=>activate(atTime(isFinite(time)?time:(video.currentTime||0)));
    const stopClock=()=>{running=false;if(!frameHandle)return;if(videoFrameClock&&typeof video.cancelVideoFrameCallback==="function")video.cancelVideoFrameCallback(frameHandle);else cancelAnimationFrame(frameHandle);frameHandle=0;};
    const scheduleClock=()=>{if(!running||frameHandle)return;if(typeof video.requestVideoFrameCallback==="function"){videoFrameClock=true;frameHandle=video.requestVideoFrameCallback((_now,metadata)=>{frameHandle=0;if(!running)return;syncNow(metadata&&isFinite(metadata.mediaTime)?metadata.mediaTime:video.currentTime);if(!video.paused&&!video.ended&&stage.isConnected)scheduleClock();else stopClock();});}else{videoFrameClock=false;frameHandle=requestAnimationFrame(()=>{frameHandle=0;if(!running)return;syncNow(video.currentTime);if(!video.paused&&!video.ended&&stage.isConnected)scheduleClock();else stopClock();});}};
    const startClock=()=>{running=true;syncNow(video.currentTime);scheduleClock();};
    video.addEventListener("play",startClock);video.addEventListener("pause",()=>{syncNow(video.currentTime);stopClock();});video.addEventListener("ended",()=>{syncNow(video.currentTime);stopClock();});
    video.addEventListener("timeupdate",()=>syncNow(video.currentTime));video.addEventListener("seeking",()=>syncNow(video.currentTime));video.addEventListener("seeked",()=>syncNow(video.currentTime));video.addEventListener("ratechange",()=>syncNow(video.currentTime));video.addEventListener("loadedmetadata",()=>syncNow(video.currentTime));
    pane.addEventListener("click",event=>{const word=event.target.closest("[data-brainword]");if(!word||!pane.contains(word))return;const index=words.indexOf(word);if(index<0)return;const start=word.dataset.start!==undefined?(+word.dataset.start||0):((+word.dataset.ratio||0)*(video.duration||0));video.currentTime=start;activate(index);if(video.paused)video.play().catch(()=>{});});
    ["wheel","touchstart","pointerdown"].forEach(type=>pane.addEventListener(type,()=>{if(follow)setFollow(false);},{passive:true}));
    if(followBtn)followBtn.addEventListener("click",()=>setFollow(!follow));setFollow(true);syncNow(video.currentTime);if(!video.paused&&!video.ended)startClock();
  });
}
function wireBrainTranscript(root){wireVideoTranscripts(root);}
function fegsysSalesReady(sources){const sales=sources&&sources.sales;return !!(sales&&sales.available===true);}
function fegsysMetricCell(label,value,accent=false){return `<div class="fegsys-detail__metric${accent?" is-accent":""}"><span>${esc(label)}</span><strong>${esc(String(value))}</strong></div>`;}
function fegsysDetailsSections(d,num){
  const m=d.fegsysMetrics||{};
  const salesReady=fegsysSalesReady(d.fegsysSources),sales=salesReady?fmtNum(m.orders||m.conversions||0):"—";
  return `<section class="sec"><div class="sec__head"><span class="sec__num">${num()}</span><span class="sec__title">Vendas do período</span><span class="sec__line"></span></div><div class="fegsys-detail"><div class="fegsys-detail__group"><div class="fegsys-detail__head"><h3>Vendas</h3><span class="fegsys-detail__source">marts_feg.mart_criativos_diario</span></div><div class="fegsys-detail__metrics">${fegsysMetricCell("Vendas",sales,true)}</div></div></div></section>`;
}
function fegsysBrainCard(o){
  const d=o.data||{},m=d.fegsysMetrics||{},range=d.fegsysRange||{};
  const salesReady=fegsysSalesReady(d.fegsysSources),sales=salesReady?fmtNum(m.conversions||m.orders||0):"—";
  const platforms=(d.platforms||[]).join(" + ")||"FEGSYS";
  const period=range.from&&range.to?`${fmtDateShort(range.from)} a ${fmtDateShort(range.to)}`:fegsysPeriodLabel();
  const media=(d.video||d.print)?mediaThumb(d.print,d.nome,!!d.video,d.video||""):`<div class="cmedia cmedia--empty">${ic("film")}<span>Mídia não vinculada</span></div>`;
  const copyPreview=d.copy?`<div class="fegsys-copy"><strong>Copy</strong><p>${esc(String(d.copy).slice(0,220))}${String(d.copy).length>220?"…":""}</p></div>`:"";
  const sourceLinks=[
    d.linkDrive?`<a class="btn btn--outline btn--sm" href="${esc(d.linkDrive)}" target="_blank" rel="noopener">${ic("folder")}Abrir no Drive</a>`:"",
    d.video?`<a class="btn btn--outline btn--sm" href="${esc(d.video)}" target="_blank" rel="noopener">${ic("play")}Abrir mídia</a>`:"",
    d.copy?`<button class="qbtn" data-copy="${o.id}" title="Ver e copiar a copy">${ic("type")}Ver copy</button>`:"",
    d.copyLink?`<a class="btn btn--outline btn--sm" href="${esc(d.copyLink)}" target="_blank" rel="noopener">${ic("file")}Abrir documento</a>`:""
  ].filter(Boolean).join("");
  const availability=[d.video?`<span class="chip fegsys-available">${ic("play")}Vídeo</span>`:"",(d.copy||d.copyLink)?`<span class="chip fegsys-available">${ic("file")}Copy</span>`:""].filter(Boolean).join("");
  return card({
    id:o.id,variant:"kcard kcard--brain fegsys-card",
    head:`<span class="tbadge tbadge--brain"><span class="tdot"></span>Sincronizado</span><span class="ktag">${ic("pulse")}${esc(platforms)}</span>`,
    media,
    body:`${cardIdentity("FEGSYS · "+period,d.nome||"Criativo sem nome")}<div class="fegsys-kpis"><div class="fegsys-kpi fegsys-kpi--accent"><span>Vendas</span><strong>${sales}</strong></div></div>`,
    chips:`<div class="card__chips"><span class="chip accent">${esc(period)}</span>${availability}${(d.shops||[]).slice(0,2).map(shop=>`<span class="chip">${esc(shop)}</span>`).join("")}${(d.channels||[]).map(channel=>`<span class="chip">${esc(channel)}</span>`).join("")}</div>`,
    extra:copyPreview||(!d.video&&!d.copyLink?`<div class="fegsys-pending">${ic("alert")}Vídeo e copy não estão disponíveis na fonte</div>`:""),
    actions:sourceLinks||`<span class="muted-empty" style="font-size:.78rem">Dados atualizados automaticamente</span>`
  });
}
function megabrainCard(o){
  const d=o.data||{};
  if(d.source==="fegsys")return fegsysBrainCard(o);
  const copy=brainCopyText(d);
  const copyLink=(d.copyLink||d.copyVslLink||d.copyCriativoLink||"").trim();
  const video=videoOfBrain(d),image=String(d.print||"").trim();
  const author=d.autor?`<div class="brain-author">${ic("user")}<span>${esc(d.autor)}</span></div>`:"";
  const metric=brainHasMetric(d)?`<div class="brain-metric"><span class="brain-metric__ic">${ic(brainIsFat(d)?"dollar":"cart")}</span><span class="brain-metric__v">${esc(brainMetricValue(d))}</span><span class="brain-metric__l">${brainMetricLabel(d)}</span></div>`:"";
  const acts=[
    video?qbtn("Abrir criativo",video,"play"):(image?qbtn("Abrir criativo",image,"image"):""),
    (copy||copyLink)?`<button class="qbtn" data-copy="${o.id}" title="Ver copy do criativo">${ic("type")}Ver copy</button>`:""
  ].filter(Boolean).join("");
  const ist=brainStatusOf(o);
  const testChip=brainIsValidationTest(o)?`<span class="chip brain-err">${ic("alert")}CRIATIVO TESTE</span>`:"";
  const salesPendingChip=brainSalesPending(d)?`<span class="chip brain-err">${ic("alert")}CRIATIVO SEM ATUALIZAÇAO DE NUMERO DE VENDAS</span>`:"";
  const ichip=ist==="working"?`<span class="chip accent brain-ing">${ic("download")}Baixando do Drive…</span>`
    :(d.videoMissing===true||ist==="error")?`<span class="chip brain-err">${ic("film")}${d.videoMissing===true?"Falta adicionar o vídeo":(brainIsValidationTest(o)?"Vídeo não encontrado":"Falha no Drive")}</span>`:"";
  const nicheSpan=d.nicho?`<span class="chip niche">${esc(d.nicho)}</span>`:"";
  const chipsRow=(testChip||salesPendingChip||nicheSpan||ichip)?`<div class="card__chips">${testChip}${salesPendingChip}${nicheSpan}${ichip}</div>`:"";
  return card({
    id:o.id,variant:"kcard kcard--brain",
    head:`<span class="tbadge tbadge--brain"><span class="tdot"></span>Validado</span><span class="ktag">${ic("brain")}Mega Brain</span>`,
    media:image?mediaThumb(image,d.nome||"Criativo",""):brainThumb(d,video),
    body:`${author}${cardIdentity("",d.nome||"Sem título")}${metric}`,
    chips:chipsRow,
    actions:acts
  });
}

/* ===== RADAR TIKTOK ===== */
function faixaOf(v){v=Number(v)||0;return v>=1e6?"viral":v>=1e5?"high":v>=1e4?"mid":"low";}
function ttDate(unix){const t=Number(unix)||0;if(!t)return"";return relDate(new Date(t*1000).toISOString());}
function ttDur(s){s=Number(s)||0;if(!s)return"";const m=Math.floor(s/60);return m+":"+String(s%60).padStart(2,"0");}
function ttStat(icon,val){return `<span class="ttstat">${ic(icon)}${kfmt(val)}</span>`;}
const TT_SORTS={views:(a,b)=>vv(b)-vv(a),engajamento:(a,b)=>ve(b)-ve(a),likes:(a,b)=>((b.data||{}).likes||0)-((a.data||{}).likes||0),comentarios:(a,b)=>((b.data||{}).comentarios||0)-((a.data||{}).comentarios||0),recente:(a,b)=>((b.data||{}).dataPub||0)-((a.data||{}).dataPub||0)};
function vv(o){return Number((o.data||{}).views)||0;}
function ve(o){return Number((o.data||{}).engajamento)||0;}
function ttSortFn(a,b){return (TT_SORTS[tiktokSort]||TT_SORTS.views)(a,b);}
function tiktokThumb(d){
  const dur=d.duracao?`<span class="ttdur">${ttDur(d.duracao)}</span>`:"";
  const videoId=String(d.videoId||""),repair=/^[0-9]{10,25}$/.test(videoId)?`/.netlify/functions/tiktok-cover?id=${encodeURIComponent(videoId)}`:"";
  if(d.thumb||repair)return `<div class="cmedia ttmedia ttmedia--click"><img class="ttthumb" loading="lazy" decoding="async" fetchpriority="low" width="360" height="520" src="${esc(d.thumb||repair)}"${repair?` data-tiktok-id="${esc(videoId)}"`:""} alt=""><span class="cmedia__play">${ic("play")}</span>${dur}</div>`;
  return `<div class="cmedia cmedia--empty ttmedia">${ic("play")}<span>Sem capa</span>${dur}</div>`;
}
function tiktokCard(o){
  const d=o.data||{};
  const eng=d.engajamento?(d.engajamento*100).toFixed(1)+"%":"–";
  return card({
    id:o.id,variant:"kcard ttcard",
    head:`<span class="tbadge tbadge--tt"><span class="tdot"></span>TikTok</span><span class="ktag tteng">${ic("flame")}${eng}</span>`,
    media:tiktokThumb(d),
    extra:`<div class="ttstats">${ttStat("eye",d.views)}${ttStat("heart",d.likes)}${ttStat("message",d.comentarios)}${ttStat("share",d.shares)}</div>`
      +`<div class="ttcaption">${esc(d.caption||d.nome||"")}</div>`
      +`<div class="ttfoot"><span class="ttauthor">@${esc(d.autor||"")}</span><span class="ttdate">${ttDate(d.dataPub)}</span></div>`
      +nicheChip(d)+(d.subnicho?`<span class="chip niche">${esc(d.subnicho)}</span>`:""),
    actions:qbtn("Abrir no TikTok",d.url,"external")
  });
}

/* ===== CARD DE NOTÍCIA ===== */
function sourceBadge(fonte){
  const f=(fonte||"").toLowerCase().replace(/\s+/g,"");
  const map={reddit:["Reddit","nsrc--reddit"],youtube:["YouTube","nsrc--yt"],hackernews:["Hacker News","nsrc--hn"],hn:["Hacker News","nsrc--hn"],web:["Web","nsrc--web"],grounding:["Web","nsrc--web"],x:["X","nsrc--x"],twitter:["X","nsrc--x"],github:["GitHub","nsrc--web"],polymarket:["Polymarket","nsrc--web"],manual:["Manual","nsrc--manual"]};
  const m=map[f]||(f==="manual"?["Manual","nsrc--manual"]:[fonte||"Fonte","nsrc--portal"]);
  return `<span class="nsrc ${m[1]}">${esc(m[0])}</span>`;
}
function relDate(s){
  const t=Date.parse(s);if(isNaN(t))return esc(s||"");
  const days=Math.floor((Date.now()-t)/86400000);
  if(days<=0)return "hoje";
  if(days===1)return "ontem";
  if(days<7)return "há "+days+" dias";
  if(days<30)return "há "+Math.floor(days/7)+" sem";
  return new Date(t).toLocaleDateString("pt-BR");
}
function noticiaCard(o){
  const d=o.data||{};
  const date=d.dataPub?`<span class="nmeta__date">${ic("clock")}${relDate(d.dataPub)}</span>`:"";
  const eng=d.engajamento?`<span class="nmeta__eng">${ic("trending")}${esc(d.engajamento)}</span>`:"";
  const meta=(date||eng)?`<div class="ncard__meta">${date}${eng}</div>`:"";
  return card({
    id:o.id,variant:"ncard",
    head:`${sourceBadge(d.fonte)}<span class="chip niche">${esc(newsNicheOf(o))}</span><span class="chip">${esc(newsTopicOf(o))}</span>`,
    title:d.nome||"(sem título)",
    extra:`${d.resumo?`<div class="ncard__snippet">${esc(d.resumo)}</div>`:""}${meta}`,
    actions:d.link?qbtn("Abrir notícia",d.link,"external"):""
  });
}

/* ===== VÍDEO: embutir player (YouTube, Drive, Vimeo, mp4) ===== */
function videoOfCrv(d){return (d.video||d.link||"").trim();}
function videoOfBrain(d){return (d.video||d.linkDrive||d.videoVsl||d.videoCriativo||"").trim();}
/* ===== MEGA BRAIN — métrica de performance (vendas OU faturamento) ===== */
function brainMetricNum(d){const raw=String((d&&d.metricaValor)||"").replace(/[^\d]/g,"");return raw?parseInt(raw,10):0;}
function brainHasMetric(d){return !!String((d&&d.metricaValor)||"").trim();}
function brainIsFat(d){return (d&&d.metricaTipo)==="faturamento";}
function brainMetricLabel(d){return brainIsFat(d)?"faturamento":"vendas";}
/* faturamento em dólar (US$); vendas = contagem exata (ex: 8 vendas) */
function brainMetricValue(d){const n=brainMetricNum(d);return brainIsFat(d)?("US$ "+n.toLocaleString("en-US")):n.toLocaleString("pt-BR");}
function brainMetricFull(d){const n=brainMetricNum(d);return brainIsFat(d)?("US$ "+n.toLocaleString("en-US")):(n.toLocaleString("pt-BR")+" vendas");}
/* thumbnail do Google Drive (frame do vídeo) p/ preview no card */
function driveId(url){url=String(url||"");const m=url.match(/drive\.google\.com\/file\/d\/([\w-]+)/i)||url.match(/[?&]id=([\w-]+)/i);return m?m[1]:"";}
function driveThumbUrl(url,w){const id=driveId(url);return id?`https://drive.google.com/thumbnail?id=${id}&sz=w${w||1000}`:"";}
/* capa do card do Mega Brain: MP4 embutido → thumbnail do Drive → print → vazio */
function brainThumb(d,video){
  const mp4=(d.video||"").trim();
  const isMp4=/\.(mp4|webm|ogg|ogv|m4v)(\?.*)?$/i.test(mp4);
  if(isMp4)return mediaThumb("",d.nome,true,mp4);
  const did=driveId(d.linkDrive)||driveId(d.video);
  const dt=did?driveThumbUrl(d.linkDrive)||driveThumbUrl(d.video):"";
  if(dt)return `<div class="cmedia cmedia--vid" title="Abra o card para assistir"><img class="cmedia__poster" loading="lazy" decoding="async" src="${esc(dt)}" data-did="${esc(did)}" alt="${esc(d.nome||"")}"><span class="cmedia__play">${ic("play")}</span></div>`;
  if(video)return mediaThumb("",d.nome,true,video);
  return `<div class="cmedia cmedia--empty">${ic("film")}<span>Sem preview — abra o card</span></div>`;
}
function brainTs(o){return Date.parse((o&&o.created_at)||"")||0;}
function brainSortMetric(o){const d=(o&&o.data)||{};return d.source==="fegsys"?Number((d.fegsysMetrics||{}).conversions||(d.fegsysMetrics||{}).orders)||0:brainMetricNum(d);}
const BRAIN_SORTS={
  metrica:(a,b)=>brainSortMetric(b)-brainSortMetric(a),
  recente:(a,b)=>brainTs(b)-brainTs(a),
  az:(a,b)=>String((a.data||{}).nome||"").localeCompare(String((b.data||{}).nome||""),"pt-BR"),
};
function brainSortFn(a,b){return (BRAIN_SORTS[brainSort]||BRAIN_SORTS.metrica)(a,b);}
function videoEmbedUrl(url){
  if(!url)return null;url=String(url).trim();
  let m=url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([\w-]{6,})/i);
  if(m)return{type:"iframe",src:"https://www.youtube.com/embed/"+m[1]};
  m=url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if(m)return{type:"iframe",src:"https://player.vimeo.com/video/"+m[1]};
  m=url.match(/drive\.google\.com\/file\/d\/([\w-]+)/i)||url.match(/drive\.google\.com\/(?:open|uc)\?(?:[^#]*&)?id=([\w-]+)/i);
  if(m)return{type:"iframe",src:"https://drive.google.com/file/d/"+m[1]+"/preview"};
  if(/\/\.netlify\/functions\/fegsys-drive-media(?:\?|$)/i.test(url))return{type:"video",src:fixUrl(url)};
  if(/\.(mp4|webm|ogg|ogv|m4v)(\?.*)?$/i.test(url))return{type:"video",src:fixUrl(url)};
  return null;
}
function videoEmbedHtml(url){
  const e=videoEmbedUrl(url);if(!e)return null;
  if(e.type==="video")return `<video class="vplayer" controls playsinline preload="metadata" src="${esc(e.src)}#t=0.1"></video>`;
  return `<iframe class="vplayer" src="${esc(e.src)}" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
}
function transBox(d,alwaysShow,status,syncable){
  const txt=String((d&&d.transcricao)||"").trim();
  const pt=String((d&&d.transcricaoPt)||"").trim(),ptStatus=String((d&&d.transcricaoPtStatus)||"").toLowerCase();
  const working=status==="working", pending=status==="pending"||working;
  if(!txt&&!alwaysShow&&!pending)return"";
  const body=txt?brainCopyMarkup(d):(working
    ?`<span class="vpending">${ic("clock")}Transcrevendo agora… deve levar só alguns segundos.</span>`
    :pending
      ?`<span class="vpending">${ic("clock")}Transcrição sendo gerada automaticamente… aparece aqui em instantes.</span>`
      :"Sem transcrição cadastrada.");
  const title=/^en\b/i.test(String(d&&d.transcricaoLang||""))?"Copy original em inglês":"Copy original do áudio";
  const follow=txt&&syncable?`<div class="brainstage__tools"><button type="button" class="brain-follow active" data-brain-follow aria-pressed="true">${ic("play")}Seguindo áudio</button></div>`:"";
  const ptBody=pt
    ?esc(pt)
    :`<span class="vtrans__status">${ic(ptStatus==="error"?"alert":"clock")}${ptStatus==="error"?"A tradução será tentada novamente automaticamente.":"A tradução em português está sendo preparada automaticamente."}</span>`;
  const tabs=txt?`<div class="vtrans__tabs" role="tablist" aria-label="Idioma da transcrição">
    <button type="button" class="vtrans__tab active" role="tab" aria-selected="true" data-transcript-lang="original">Original</button>
    <button type="button" class="vtrans__tab" role="tab" aria-selected="false" data-transcript-lang="pt">Português${pt?" ✓":""}</button>
  </div>`:"";
  return `<div class="vtrans" data-transcript-pane><div class="vk">${ic("file")}${title}</div>${follow}${tabs}<div class="vtrans__pane" data-transcript-pane-lang="original"><div class="vbody ${txt?"":"empty"}">${body}</div></div><div class="vtrans__pane" data-transcript-pane-lang="pt" hidden><div class="vbody ${pt?"":"empty"}">${ptBody}</div></div></div>`;
}
/* bloco de vídeo: embutido + transcrição ao lado + abrir em nova aba */
function videoBlock(va,data,forceTrans,status){
  const embed=videoEmbedHtml(va);
  const openBtn=va?`<div class="linkbtns" style="margin-top:12px">${linkbtn("Abrir vídeo em nova aba",va,false,"external")}</div>`:"";
  if(embed){
    const syncable=embed.includes("<video"),tb=transBox(data,forceTrans,status,syncable);
    if(tb)return `<div class="vcol" data-video-sync><div>${embed}${openBtn}</div>${tb}</div>`;
    return `<div>${embed}${openBtn}</div>`;
  }
  if(va){
    const tb=transBox(data,forceTrans,status,false);
    return `<div class="linkbtns">${linkbtn("Abrir vídeo",va,true,"play")}</div>${tb?`<div style="margin-top:14px">${tb}</div>`:""}`;
  }
  return "";
}
function adAnalysisSection(d,num){
  const report=String((d&&d.adVisualAnalysis)||"").trim(),status=String((d&&d.adAnalysisStatus)||"").toLowerCase();
  const duration=Number((d&&d.adAnalysisDuration)||(d&&d.transcriptionDurationSeconds)||0);
  if(status==="not_applicable"||duration>TR_AD_MAX_SEC)return"";
  const hasTranscript=!!String((d&&d.transcricao)||"").trim(),hasVideo=!!videoOfCrv(d)||!!videoOfBrain(d);
  const active=["queued","working","retry_scheduled","error"].includes(status);
  if(!report&&!active&&!(hasTranscript&&hasVideo))return"";
  const state=report?`<span class="ccdot ccdot--done"></span>Concluída`
    :status==="queued"||status==="working"?`<span class="vidup__spin"></span>Processando`
    :status==="error"?`<span class="trerr">Nova tentativa programada</span>`
    :`<span class="ccdot"></span>Na fila automática`;
  const body=report?ccMarkdown(report):`<div class="ad-report__empty">${status==="queued"||status==="working"?"O vídeo, a fala, os textos e os cortes estão sendo catalogados.":"A engenharia reversa será executada automaticamente na próxima varredura horária."}</div>`;
  return `<section class="sec"><div class="sec__head"><span class="sec__num">${num()}</span><span class="sec__title">Engenharia reversa visual do anúncio</span><span class="sec__line"></span></div><div class="ad-report"><div class="ad-report__bar"><span>Relatório operacional</span><span>${state}</span></div><div class="ad-report__body">${body}</div></div></section>`;
}
function wireTranscriptLanguageTabs(root){
  $$(".vtrans__tabs",root||document).forEach(tabs=>{
    tabs.addEventListener("click",event=>{
      const button=event.target.closest("[data-transcript-lang]");if(!button)return;
      const box=tabs.closest(".vtrans"),lang=button.dataset.transcriptLang;
      $$("[data-transcript-lang]",tabs).forEach(tab=>{const active=tab===button;tab.classList.toggle("active",active);tab.setAttribute("aria-selected",String(active));});
      $$("[data-transcript-pane-lang]",box).forEach(pane=>pane.hidden=pane.dataset.transcriptPaneLang!==lang);
    });
  });
}
/* garante que o 1º quadro apareça como preview (poster) e mostra fallback se falhar */
function wireVideoPreviews(root){
  (root||document).querySelectorAll("video.vplayer").forEach(v=>{
    if(v.dataset.prevWired)return; v.dataset.prevWired="1";
    let painted=false;
    const paint=()=>{
      if(painted)return;
      if(v.readyState>=1&&isFinite(v.duration)&&v.duration>0){
        painted=true;
        try{v.currentTime=Math.min(0.1,v.duration/2);}catch(e){}
      }
    };
    v.addEventListener("loadedmetadata",paint);
    v.addEventListener("loadeddata",paint);
    v.addEventListener("error",()=>{
      const box=document.createElement("div");
      box.className="vfail";
      box.innerHTML=`Não deu para embutir o vídeo aqui. <a href="${esc(v.currentSrc||v.src)}" target="_blank" rel="noopener">Abrir em nova aba ↗</a>`;
      if(v.parentNode)v.parentNode.insertBefore(box,v.nextSibling);
    });
    if(v.readyState>=1)paint(); else {try{v.load();}catch(e){}}
  });
}
/* Miniaturas dos cards: cria uma imagem leve do primeiro take somente para os
   cards visíveis. O <video> é temporário, fica fora do card e é destruído
   assim que a imagem foi capturada. */
function wireCardPreviews(root){
  (root||document).querySelectorAll("img[data-offer-preview-fallback]").forEach(img=>{
    if(img.dataset.offerPreviewWired)return;img.dataset.offerPreviewWired="1";
    const fail=()=>{
      const fallback=img.dataset.offerPreviewFallback;
      if(fallback){delete img.dataset.offerPreviewFallback;img.src=fallback;return;}
      const box=img.closest(".cmedia,.offer-vsl__preview");if(box){box.classList.add("cmedia--empty");box.innerHTML=ic("image")+"<span>Prévia indisponível</span>";}
    };
    img.addEventListener("error",fail);if(img.complete&&img.naturalWidth===0)fail();
  });
  /* thumbnails do Drive: 1º tenta drive.google.com/thumbnail; se falhar, tenta o
     espelho lh3.googleusercontent.com (mais estável p/ arquivos públicos); só então
     cai para o placeholder. Isso faz o preview voltar assim que o arquivo é
     compartilhado como "qualquer pessoa com o link". */
  (root||document).querySelectorAll("img.cmedia__poster").forEach(img=>{
    if(img.dataset.pw)return; img.dataset.pw="1";
    const fail=()=>{
      if(img.dataset.did&&!img.dataset.did2){img.dataset.did2="1";img.src="https://lh3.googleusercontent.com/d/"+img.dataset.did+"=w1000";return;}
      const box=img.closest(".cmedia");if(box){box.classList.remove("cmedia--vid");box.classList.add("cmedia--empty");box.innerHTML=ic("film")+"<span>Vídeo — abra para assistir</span>";}
    };
    img.addEventListener("error",fail);
    if(img.complete&&img.naturalWidth===0)fail();
  });
  const boxes=[...(root||document).querySelectorAll("[data-card-video-poster]")];
  let active=0;const queue=[];
  const fallback=box=>{box.dataset.posterState="fallback";const load=$(".cmedia__posterload",box);if(load)load.innerHTML=ic("film");};
  const capture=box=>new Promise(resolve=>{
    const src=box.dataset.cardVideoPoster;if(!src){fallback(box);resolve();return;}
    const cached=cardPosterCache.get(src);if(cached){box.innerHTML=`<img class="cmedia__poster" loading="lazy" decoding="async" src="${esc(cached)}" alt="Primeiro take do vídeo"><span class="cmedia__play">${ic("play")}</span>`;box.dataset.posterState="done";resolve();return;}
    const video=document.createElement("video");video.muted=true;video.playsInline=true;video.preload="metadata";video.crossOrigin="anonymous";
    let finished=false,timer=setTimeout(()=>done(false),12000);
    const done=ok=>{if(finished)return;finished=true;clearTimeout(timer);video.removeAttribute("src");try{video.load();}catch(e){}if(!ok)fallback(box);resolve();};
    const snap=()=>{try{const maxW=640,ratio=(video.videoWidth&&video.videoHeight)?video.videoHeight/video.videoWidth:.625,w=Math.min(maxW,video.videoWidth||maxW),h=Math.max(1,Math.round(w*ratio)),canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;canvas.getContext("2d",{alpha:false}).drawImage(video,0,0,w,h);const data=canvas.toDataURL("image/webp",.72);cardPosterCache.set(src,data);if(box.isConnected){box.innerHTML=`<img class="cmedia__poster" loading="lazy" decoding="async" src="${esc(data)}" alt="Primeiro take do vídeo"><span class="cmedia__play">${ic("play")}</span>`;box.dataset.posterState="done";}done(true);}catch(e){done(false);}};
    video.addEventListener("loadeddata",()=>{try{video.currentTime=Math.min(.12,Math.max(0,(video.duration||.24)/2));}catch(e){snap();}},{once:true});
    video.addEventListener("seeked",snap,{once:true});video.addEventListener("error",()=>done(false),{once:true});video.src=src;try{video.load();}catch(e){done(false);}
  });
  const next=()=>{while(active<2&&queue.length){const box=queue.shift();if(!box||!box.isConnected||box.dataset.posterState)continue;active++;box.dataset.posterState="loading";capture(box).finally(()=>{active--;next();});}};
  const enqueue=box=>{if(box.dataset.posterState)return;queue.push(box);next();};
  if("IntersectionObserver" in window){const io=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){io.unobserve(entry.target);enqueue(entry.target);}}),{rootMargin:"320px 0px"});boxes.forEach(box=>io.observe(box));}else boxes.forEach(enqueue);
}

/* ===== TRANSCRIÇÃO AUTOMÁTICA (Groq via background function) ===== */
const TRANSCRIBE_FN="/.netlify/functions/transcribe-background";
const transcribing=new Set();
let brainTranscriptionQueue=Promise.resolve();
let currentSimpleId=null;
function videoForOffer(o){const d=(o&&o.data)||{};return d.kind==="megabrain"?videoOfBrain(d):videoOfCrv(d);}
function transcribeBtn(o,va,d){
  if(!isAdmin)return"";
  const emb=va?videoEmbedUrl(va):null;
  if(!emb||emb.type!=="video")return"";                 // só MP4 direto do Storage
  if(((d.transcricao||"").trim()))return"";             // já transcrito
  const working=d.transcricaoStatus==="working"||transcribing.has(o.id);
  return `<div class="linkbtns" style="margin-top:12px"><button class="btn btn--outline btn--sm" data-transcribe="${o.id}"${working?" disabled":""}>${ic("file")}${working?"Transcrevendo…":"Transcrever agora"}</button></div>`;
}
/* lê a linha no Supabase até a transcrição aparecer (a background function grava lá) */
async function pollTranscription(offerId,tries,intervalMs){
  for(let i=0;i<tries;i++){
    await new Promise(r=>setTimeout(r,intervalMs));
    try{
      const {data,error}=await sb.from("offers").select("data").eq("id",offerId).single();
      const d=data&&data.data;
      if(!error&&d&&(d.transcricao||"").trim()){
        const o=offers.find(x=>x.id===offerId);
        if(o){o.data.transcricao=d.transcricao;o.data.transcricaoStatus="done";o.data.transcricaoLang=d.transcricaoLang||"";o.data.transcricaoWords=Array.isArray(d.transcricaoWords)?d.transcricaoWords:[];o.data.transcricaoSegments=Array.isArray(d.transcricaoSegments)?d.transcricaoSegments:[];}
        if(o)scheduleCreativeTranslations([o]);
        return true;
      }
    }catch(e){}
  }
  return false;
}
/* Vídeos maiores que o limite da API não podem ser enviados como MP4 inteiro.
   Reaproveita o Transcritor: extrai áudio mono 16 kHz no navegador, divide em
   partes pequenas e grava o texto final no card. A fila impede que vários
   vídeos pesados sejam baixados e decodificados ao mesmo tempo. */
async function transcribeBrainInChunks(offerId,videoUrl){
  const o=offers.find(x=>x.id===offerId);if(!o)throw new Error("card não encontrado");
  const res=await fetch(videoUrl);if(!res.ok)throw new Error("não consegui baixar o vídeo");
  const blob=await res.blob(),file=new File([blob],(o.data&&o.data.nome||"criativo")+".mp4",{type:blob.type||"video/mp4"});
  const token=await trToken();let fullText="",detLang="",allWords=[],allSegments=[];
  await trForEachAudioChunk(file,TR_CHUNK_SEC,{onChunk:async chunk=>{
    const rawPart=await trTranscribeSlice(chunk.samples,chunk.rate,token,"auto",chunk.offset,null,0,chunk.timeScale),part=trCropChunkPart(rawPart,chunk);
    if(part.text)fullText+=(fullText?" ":"")+part.text;if(part.language&&!detLang)detLang=part.language;
    allWords.push(...part.words.filter(w=>String(w.word||"").trim()));allSegments.push(...part.segments.filter(s=>String(s.text||"").trim()));
  }});
  if(!fullText.trim())throw new Error("nenhuma fala detectada");
  const {data:row,error:readError}=await sb.from("offers").select("data").eq("id",offerId).single();
  if(readError)throw readError;
  const data=(row&&row.data)||o.data||{};
  data.transcricao=fullText.trim();data.transcricaoStatus="done";data.transcricaoLang=detLang;data.transcricaoWords=allWords;data.transcricaoSegments=allSegments;
  const {error:saveError}=await sb.from("offers").update({data}).eq("id",offerId);if(saveError)throw saveError;
  o.data=data;scheduleCreativeTranslations([o]);return true;
}
function queueBrainChunkedTranscription(offerId,videoUrl){
  const job=brainTranscriptionQueue.catch(()=>{}).then(()=>transcribeBrainInChunks(offerId,videoUrl));
  brainTranscriptionQueue=job.catch(()=>{});return job;
}
async function requestInstantTranscription(offerId,videoUrl){
  const o=offers.find(x=>x.id===offerId); if(!o)return;
  videoUrl=videoUrl||videoForOffer(o);
  const emb=videoUrl?videoEmbedUrl(videoUrl):null;
  if(!emb||emb.type!=="video"){toast("A transcrição automática funciona só para vídeo MP4.",true);return;}
  if(transcribing.has(offerId))return;
  transcribing.add(offerId);
  o.data=o.data||{}; o.data.transcricaoStatus="working";o.data.transcriptionStatus="processing";o.data.transcriptionStartedAt=new Date().toISOString();
  const viewOpen=()=>currentSimpleId===offerId&&$("#viewOverlay").classList.contains("open");
  if(viewOpen())openSimpleView(o,true);
  let token="";
  try{const r=await sb.auth.getSession();token=(r.data&&r.data.session&&r.data.session.access_token)||"";}catch(e){}
  // MP4 acima de ~24 MB costuma exceder o limite do Whisper. Nesse caso já usa
  // o fluxo fracionado; nos menores preserva a função rápida em segundo plano.
  let chunked=false;try{const h=await fetch(videoUrl,{method:"HEAD"});chunked=+(h.headers.get("content-length")||0)>24*1024*1024;}catch(e){}
  let done=false;
  if(!chunked){
    try{await fetch(TRANSCRIBE_FN,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},body:JSON.stringify({id:offerId,videoUrl})});}catch(e){}
    done=await pollTranscription(offerId,12,4000);       // até ~48 s
  }
  if(!done){try{done=await queueBrainChunkedTranscription(offerId,videoUrl);}catch(e){console.error("transcrição fracionada falhou",e);}}
  transcribing.delete(offerId);
  const cur=offers.find(x=>x.id===offerId)||o;
  if(!done){cur.data.transcricaoStatus="pending";cur.data.transcriptionStatus="retry_scheduled";cur.data.transcriptionNextRetryAt=new Date(Date.now()+15*60*1000).toISOString();} // rede de segurança: o worker retoma
  renderGrid();writeCache();
  if(viewOpen())openSimpleView(cur,true);
  toast(done?"Transcrição pronta ✓":"Transcrevendo em segundo plano — aparece aqui em instantes.");
}

/* ===== INGESTÃO DE CRIATIVO DO FACEBOOK (player público → Storage) ===== */
const FB_INGEST_FN="/.netlify/functions/fb-ingest-background";
const fbIngesting=new Set();
const offerArchiveQueued=new Set();
let offerArchiveResumeWorking=false;
function isFbUrl(u){return /facebook\.com|fb\.com|fb\.me|fb\.watch/i.test(String(u||""));}
function fbArchiveIsStale(d){
  const t=Date.parse(d.mediaArchiveQueuedAt||d.mediaArchiveStartedAt||d.fbIngestAt||"");
  return Number.isFinite(t)&&Date.now()-t>20*60*1000;
}
function fbStatusOf(o){
  const d=(o&&o.data)||{};
  if(fbIngesting.has(o.id))return"working";
  const status=String(d.mediaArchiveStatus||d.fbIngestStatus||"");
  return ["queued","working","processing"].includes(status.toLowerCase())&&fbArchiveIsStale(d)?"retry_scheduled":status;
}
function fbDaysText(d){if(d.fbDaysActive==null)return"";const n=d.fbDaysActive;return (d.fbActive?"Ativo há ":"Ficou ativo ")+n+(n===1?" dia":" dias");}
function offerCreativeNeedsArchive(o){
  const d=(o&&o.data)||{},status=String(d.mediaArchiveStatus||d.fbIngestStatus||"").toLowerCase();
  if(d.kind!=="criativo"||!d.sourceOfferId||!isFbUrl(d.linkAnuncio))return false;
  if(String(d.video||d.print||"").trim())return false;
  if(["queued","working","processing"].includes(status))return fbArchiveIsStale(d);
  const retryAt=Date.parse(d.mediaArchiveNextRetryAt||"");
  return !Number.isFinite(retryAt)||retryAt<=Date.now();
}
async function refreshOfferArchiveRows(ids){
  if(!ids.length)return;
  try{
    const {data,error}=await sb.from("offers").select("id,data").in("id",ids);
    if(error||!Array.isArray(data))return;
    for(const row of data){
      const current=offers.find(item=>item.id===row.id);
      if(current&&row.data)current.data=row.data;
      offerArchiveQueued.delete(row.id);
    }
    renderGrid();writeCache();
  }catch(e){}
}
/* Toda mídia oriunda de Oferta precisa existir no Storage do Swipe. Ao abrir o
   painel admin, a fila retoma automaticamente os cards pendentes/que falharam.
   O bloqueio local evita disparar o mesmo lote em cada atualização de página. */
async function resumeOfferCreativeArchives(){
  if(!isAdmin||offerArchiveResumeWorking)return;
  let last=0;try{last=Number(localStorage.getItem("feg_offer_media_archive_v2")||0);}catch(e){}
  if(last&&Date.now()-last<15*60*1000)return;
  const candidates=offers.filter(offerCreativeNeedsArchive).filter(o=>!offerArchiveQueued.has(o.id)).slice(0,24);
  if(!candidates.length)return;
  offerArchiveResumeWorking=true;
  try{
    let token="";try{const r=await sb.auth.getSession();token=(r.data&&r.data.session&&r.data.session.access_token)||"";}catch(e){}
    if(!token)return;
    try{localStorage.setItem("feg_offer_media_archive_v2",String(Date.now()));}catch(e){}
    for(const item of candidates){
      offerArchiveQueued.add(item.id);
      item.data.fbIngestStatus="working";
      fetch(FB_INGEST_FN,{
        method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},
        body:JSON.stringify({id:item.id,adUrl:item.data.linkAnuncio})
      }).catch(()=>offerArchiveQueued.delete(item.id));
      await new Promise(resolve=>setTimeout(resolve,450));
    }
    renderGrid();writeCache();
    setTimeout(()=>refreshOfferArchiveRows(candidates.map(item=>item.id)),45000);
  }finally{offerArchiveResumeWorking=false;}
}
/* lê a linha no Supabase até a ingestão do FB terminar (a background function grava lá) */
async function pollFbIngest(offerId,tries,intervalMs){
  for(let i=0;i<tries;i++){
    await new Promise(r=>setTimeout(r,intervalMs));
    try{
      const {data,error}=await sb.from("offers").select("data").eq("id",offerId).single();
      const d=data&&data.data;
      if(!error&&d&&d.fbIngestStatus&&d.fbIngestStatus!=="working"){
        const o=offers.find(x=>x.id===offerId);
        if(o)Object.assign(o.data,{video:d.video||o.data.video,print:d.print||d.img||o.data.print,mediaType:d.mediaType||o.data.mediaType,mediaAttached:d.mediaAttached===true||o.data.mediaAttached,mediaArchiveStatus:d.mediaArchiveStatus||o.data.mediaArchiveStatus,fbIngestStatus:d.fbIngestStatus,fbDaysActive:d.fbDaysActive,fbActive:d.fbActive,fbStartDate:d.fbStartDate,fbEndDate:d.fbEndDate,fbPageName:d.fbPageName,fbMetrics:d.fbMetrics,fbIngestError:d.fbIngestError,transcriptionStatus:d.transcriptionStatus||o.data.transcriptionStatus,transcricaoStatus:d.transcricaoStatus||o.data.transcricaoStatus});
        return d.fbIngestStatus;
      }
    }catch(e){}
  }
  return "";
}
async function triggerFbIngest(offerId,adUrl){
  const o=offers.find(x=>x.id===offerId);if(!o)return;
  adUrl=adUrl||(o.data||{}).linkAnuncio;
  if(!isFbUrl(adUrl)){toast("Cole o link do anúncio do Facebook primeiro.",true);return;}
  if(fbIngesting.has(offerId))return;
  fbIngesting.add(offerId);
  o.data=o.data||{};o.data.fbIngestStatus="working";o.data.fbIngestError="";
  const viewOpen=()=>currentSimpleId===offerId&&$("#viewOverlay").classList.contains("open");
  if(viewOpen())openSimpleView(o,true);
  renderGrid();
  toast("Baixando o criativo do Facebook…");
  let token="";try{const r=await sb.auth.getSession();token=(r.data&&r.data.session&&r.data.session.access_token)||"";}catch(e){}
  try{await fetch(FB_INGEST_FN,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},body:JSON.stringify({id:offerId,adUrl})});}catch(e){}
  const status=await pollFbIngest(offerId,60,4000);   // até ~4min
  fbIngesting.delete(offerId);
  const cur=offers.find(x=>x.id===offerId)||o;
  if(!status)cur.data.fbIngestStatus="pending";
  renderGrid();writeCache();
  if(viewOpen())openSimpleView(cur,true);
  if(status==="done"){
    toast("Criativo do Facebook salvo ✓");
    const v=videoForOffer(cur),emb=v?videoEmbedUrl(v):null;
    if(emb&&emb.type==="video"&&!((cur.data.transcricao||"").trim()))requestInstantTranscription(offerId,v);
  }else if(status==="partial")toast("Peguei os dados do anúncio, mas não o vídeo — veja a observação no card.",true);
  else if(status==="error")toast("Falha no Facebook: "+((cur.data||{}).fbIngestError||"tente de novo"),true);
  else toast("Processando em segundo plano — aparece aqui em instantes.");
}
function fbIngestControl(o){
  const d=o.data||{};
  if(d.kind!=="criativo"||!isFbUrl(d.linkAnuncio))return"";
  const st=fbStatusOf(o),working=st==="working";
  const btn=isAdmin?`<button class="btn btn--outline btn--sm" data-fbingest="${o.id}"${working?" disabled":""}>${ic("download")}${working?"Baixando do Facebook…":(d.video?"Rebaixar do Facebook":"Baixar criativo do Facebook")}</button>`:"";
  const note=st==="partial"?`<div class="fbnote">${ic("alert")}Dados do anúncio salvos, mas o vídeo não pôde ser baixado${d.fbIngestError?` (${esc(d.fbIngestError)})`:""}.</div>`
    :st==="error"?`<div class="fbnote fbnote--err">${ic("alert")}${esc(d.fbIngestError||"falha ao baixar do Facebook")}</div>`:"";
  return btn||note?`<div class="linkbtns" style="margin-top:12px">${btn}</div>${note}`:"";
}

/* ===== MEGA BRAIN: importação em lote de pasta local ===== */
const BRAIN_BATCH_MANIFEST="megabrain-import.json";
let brainBatchWorking=false;
function setBrainBatchState(done,total,label){
  const b=$("#brainBatchImport");if(!b)return;
  b.disabled=brainBatchWorking;
  b.innerHTML=ic("upload")+(label||(brainBatchWorking?`Importando ${done}/${total}…`:"Importar lote"));
}
function pickBrainBatchImport(){
  if(!requireAdmin()||brainBatchWorking)return;
  const input=document.createElement("input");
  input.type="file";input.multiple=true;input.webkitdirectory=true;
  input.setAttribute("directory","");
  input.onchange=()=>{const files=[...(input.files||[])];if(files.length)importBrainBatch(files);};
  input.click();
}
async function importBrainBatch(files){
  if(!requireAdmin()||brainBatchWorking)return;
  const manifest=files.find(f=>f.name.toLowerCase()===BRAIN_BATCH_MANIFEST);
  if(!manifest){toast(`Inclua ${BRAIN_BATCH_MANIFEST} na pasta selecionada.`,true);return;}
  let parsed;
  try{parsed=JSON.parse(await manifest.text());}catch(e){toast("Manifesto do lote inválido.",true);return;}
  const records=Array.isArray(parsed)?parsed:(Array.isArray(parsed.records)?parsed.records:[]);
  const updateExisting=!Array.isArray(parsed)&&parsed.updateExisting===true;
  const transcribeNew=!Array.isArray(parsed)&&parsed.transcribeNew===true;
  if(!records.length){toast("O manifesto não contém criativos.",true);return;}
  const byName=new Map(files.filter(f=>/^(video|image)\//.test(f.type||"")||/\.(mp4|mov|webm|m4v|jpg|jpeg|png|webp)$/i.test(f.name)).map(f=>[f.name.toLowerCase(),f]));
  const existing=new Map(offers.filter(o=>sectionOf(o)==="megabrain").map(o=>[String((o.data||{}).nome||"").trim().toLowerCase(),o]).filter(([name])=>name));
  const valid=records.filter(r=>r&&String(r.nome||"").trim());
  const queue=valid.filter(r=>updateExisting||!existing.has(String(r.nome).trim().toLowerCase()));
  let skipped=records.length-queue.length;
  if(!queue.length){toast(skipped?"Todos os criativos desse lote já estão no Mega Brain.":"Nenhum criativo válido no manifesto.",!!skipped);return;}
  brainBatchWorking=true;setBrainBatchState(0,queue.length);
  const failures=[];let done=0,imported=0,updated=0,transcriptions=0;
  let authToken="";
  if(transcribeNew){try{const s=await sb.auth.getSession();authToken=(s.data&&s.data.session&&s.data.session.access_token)||"";}catch(e){}}
  for(const record of queue){
    const nome=String(record.nome||"").trim();
    const key=nome.toLowerCase(),current=existing.get(key);
    if(current){
      const data={...(current.data||{})};
      for(const field of ["autor","nicho","metricaTipo","linkDrive","copy","copyLink","comentario"]){
        if(Object.prototype.hasOwnProperty.call(record,field))data[field]=String(record[field]??"");
      }
      if(Object.prototype.hasOwnProperty.call(record,"videoMissing"))data.videoMissing=record.videoMissing===true;
      if(Object.prototype.hasOwnProperty.call(record,"metricaValor")||Object.prototype.hasOwnProperty.call(record,"vendas")){
        data.metricaValor=String(record.metricaValor??record.vendas??"");data.metricaPendente=false;
      }
      if(record.metricaPendente===true)data.metricaPendente=true;
      let res;try{res=await sb.from("offers").update({data}).eq("id",current.id).select();}catch(e){res={error:e};}
      if(res.error)failures.push(`${nome}: falha ao atualizar — ${res.error.message||res.error}`);
      else{current.data=data;if(res.data&&res.data[0])Object.assign(current,res.data[0]);updated++;}
      done++;setBrainBatchState(done,queue.length);continue;
    }
    const missingMedia=record.videoMissing===true||record.mediaMissing===true;
    const fileName=String(record.mediaFile||record.videoFile||record.video_name||(nome+".mp4")).split(/[\\/]/).pop();
    const file=byName.get(fileName.toLowerCase());
    if(!file&&!missingMedia){failures.push(`${nome}: mídia não encontrada na pasta`);done++;setBrainBatchState(done,queue.length);continue;}
    let mediaInfo=null;if(file){try{mediaInfo=await inspectUploadFile(file,["image","video"],VIDEO_MAX);}catch(e){failures.push(`${nome}: ${(e&&e.message)||"mídia inválida"}`);done++;setBrainBatchState(done,queue.length);continue;}}
    let storagePath="",publicMedia="",isImage=false;
    if(file){
      const ext=mediaInfo.ext;
      isImage=mediaInfo.kind==="image";
      const uid=(self.crypto&&crypto.randomUUID)?crypto.randomUUID():Date.now()+"-"+Math.random().toString(36).slice(2);
      storagePath=`megabrain/${uid}.${ext}`;
      let up;try{up=await sb.storage.from(VIDEO_BUCKET).upload(storagePath,file,{contentType:mediaInfo.contentType,upsert:false});}catch(e){up={error:e};}
      if(up.error){failures.push(`${nome}: falha na mídia — ${up.error.message||up.error}`);done++;setBrainBatchState(done,queue.length);continue;}
      publicMedia=sb.storage.from(VIDEO_BUCKET).getPublicUrl(storagePath).data.publicUrl;
    }
    const metricValue=String(record.metricaValor??record.vendas??"");
    const data={
      kind:"megabrain",nome,nicho:String(record.nicho||""),autor:String(record.autor||""),
      metricaTipo:String(record.metricaTipo||"vendas"),metricaValor:metricValue,metricaPendente:record.metricaPendente===true||!metricValue.trim(),
      linkDrive:String(record.linkDrive||record.video_url||""),video:isImage?"":publicMedia,print:isImage?publicMedia:"",videoMissing:missingMedia,
      copy:String(record.copy||""),copyLink:String(record.copyLink||""),
      transcricao:String(record.transcricao||""),transcricaoWords:Array.isArray(record.transcricaoWords)?record.transcricaoWords:[],
      transcricaoSegments:Array.isArray(record.transcricaoSegments)?record.transcricaoSegments:[],transcricaoStatus:record.transcricao?"done":"pending",
      marca:"",link:"",comentario:String(record.comentario||"")
    };
    let res;try{res=await sb.from("offers").insert({data}).select();}catch(e){res={error:e};}
    if(res.error){
      failures.push(`${nome}: falha ao salvar — ${res.error.message||res.error}`);
      try{await sb.storage.from(VIDEO_BUCKET).remove([storagePath]);}catch(e){}
    }else if(res.data&&res.data[0]){
      const saved=res.data[0];offers.push(saved);existing.set(key,saved);imported++;
      if(transcribeNew&&authToken&&publicMedia&&!isImage){
        try{await fetch(TRANSCRIBE_FN,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+authToken},body:JSON.stringify({id:saved.id,videoUrl:publicMedia})});transcriptions++;}catch(e){console.warn("Falha ao iniciar transcrição de "+nome,e);}
      }
    }
    done++;setBrainBatchState(done,queue.length);
  }
  brainBatchWorking=false;setBrainBatchState(done,queue.length,failures.length?"Importar lote":"Lote concluído");
  renderGrid();writeCache();
  toast(`${imported} novo${imported===1?"":"s"} · ${updated} atualizado${updated===1?"":"s"}${transcriptions?` · ${transcriptions} transcriç${transcriptions===1?"ão iniciada":"ões iniciadas"}`:""}${skipped?` · ${skipped} ignorado${skipped===1?"":"s"}`:""}${failures.length?` · ${failures.length} falha${failures.length===1?"":"s"}`:""}`,!!failures.length);
  if(failures.length)console.warn("Falhas no lote do Mega Brain:\n"+failures.join("\n"));
}

/* ===== MEGA BRAIN: import permanente do Drive → Storage ===== */
const BRAIN_INGEST_FN="/.netlify/functions/brain-drive-ingest-background";
const brainIngesting=new Set();
function isDriveFileLink(u){u=String(u||"");if(/drive\.google\.com\/drive\/folders/i.test(u))return false;if(/docs\.google\.com/i.test(u))return false;return /drive\.google\.com/i.test(u)&&!!driveId(u);}
function isHostedVideo(u){return /\/storage\/v1\/object\/public\//i.test(String(u||""));}
function driveSrcOf(d){for(const f of [d&&d.video,d&&d.linkDrive,d&&d.videoVsl,d&&d.videoCriativo]){if(isDriveFileLink(f))return String(f).trim();}return"";}
function brainNeedsImport(o){const d=(o&&o.data)||{};if(d.kind!=="megabrain")return false;if(isHostedVideo(d.video))return false;if(d.driveIngestStatus==="done")return false;return !!driveSrcOf(d);}
function brainStatusOf(o){const d=(o&&o.data)||{};return brainIngesting.has(o.id)?"working":(isHostedVideo(d.video)?"done":(d.driveIngestStatus||""));}
async function pollBrainIngest(offerId,tries,intervalMs){
  for(let i=0;i<tries;i++){
    await new Promise(r=>setTimeout(r,intervalMs));
    try{
      const {data,error}=await sb.from("offers").select("data").eq("id",offerId).single();
      const d=data&&data.data;
      if(!error&&d&&d.driveIngestStatus&&d.driveIngestStatus!=="working"){
        const o=offers.find(x=>x.id===offerId);
        if(o)Object.assign(o.data,{video:d.video||o.data.video,linkDrive:d.linkDrive||o.data.linkDrive,driveIngestStatus:d.driveIngestStatus,driveIngestError:d.driveIngestError,driveIngestAt:d.driveIngestAt,transcricaoStatus:d.transcricaoStatus||o.data.transcricaoStatus});
        return d.driveIngestStatus;
      }
    }catch(e){}
  }
  return "";
}
async function triggerBrainIngest(offerId,driveUrl,quiet){
  const o=offers.find(x=>x.id===offerId);if(!o)return"";
  driveUrl=driveUrl||driveSrcOf(o.data||{});
  if(!driveUrl){if(!quiet)toast("Este item não tem link de vídeo do Drive.",true);return"";}
  if(!requireAdmin())return"";
  if(brainIngesting.has(offerId))return"";
  brainIngesting.add(offerId);
  o.data=o.data||{};o.data.driveIngestStatus="working";o.data.driveIngestError="";
  const viewOpen=()=>currentSimpleId===offerId&&$("#viewOverlay").classList.contains("open");
  if(viewOpen())openSimpleView(o,true);
  if(!quiet){renderGrid();toast("Baixando o criativo do Drive…");}
  let token="";try{const r=await sb.auth.getSession();token=(r.data&&r.data.session&&r.data.session.access_token)||"";}catch(e){}
  try{await fetch(BRAIN_INGEST_FN,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},body:JSON.stringify({id:offerId,driveUrl})});}catch(e){}
  const status=await pollBrainIngest(offerId,90,4000);   // até ~6min (VSL grande demora)
  brainIngesting.delete(offerId);
  const cur=offers.find(x=>x.id===offerId)||o;
  if(!status)cur.data.driveIngestStatus="pending";
  if(!quiet){renderGrid();writeCache();if(viewOpen())openSimpleView(cur,true);}
  if(!quiet){
    if(status==="done"){toast("Criativo salvo no Storage ✓");const v=videoForOffer(cur),emb=v?videoEmbedUrl(v):null;if(emb&&emb.type==="video"&&!((cur.data.transcricao||"").trim()))requestInstantTranscription(offerId,v);}
    else if(status==="error")toast("Falha: "+((cur.data||{}).driveIngestError||"tente de novo"),true);
    else toast("Processando em segundo plano — aparece aqui em instantes.");
  }
  return status;
}
async function importAllBrainDrive(){
  if(!requireAdmin())return;
  const list=offers.filter(brainNeedsImport);
  if(!list.length){toast("Nenhum criativo do Drive pendente 🎉");return;}
  const total=list.length;
  toast(`Importando ${total} criativo(s) do Drive em segundo plano…`);
  let done=0,ok=0,bad=0,idx=0;const POOL=3;
  const setLbl=()=>{const b=$("#brainImportAll");if(b){b.disabled=true;b.innerHTML=ic("download")+`Importando ${done}/${total}…`;}};
  renderGrid();setLbl();
  async function worker(){
    while(idx<list.length){
      const o=list[idx++];
      const st=await triggerBrainIngest(o.id,driveSrcOf(o.data),true);
      done++;if(st==="done")ok++;else bad++;
      setLbl();renderGrid();
    }
  }
  await Promise.all(Array.from({length:Math.min(POOL,total)},worker));
  renderGrid();writeCache();
  toast(`Import do Drive: ${ok} ok${bad?`, ${bad} com problema`:""} (de ${total}).`,bad>0);
}
function brainIngestControl(o){
  const d=o.data||{};if(d.kind!=="megabrain")return"";
  const src=driveSrcOf(d);const hosted=isHostedVideo(d.video);
  const st=brainStatusOf(o),working=st==="working";
  if(!src&&!working&&st!=="error")return"";
  const label=working?"Baixando do Drive…":hosted?"Rebaixar do Drive":"Baixar criativo do Drive";
  const btn=isAdmin&&src?`<button class="btn btn--outline btn--sm" data-brainingest="${o.id}"${working?" disabled":""}>${ic("download")}${label}</button>`:"";
  const note=st==="error"?`<div class="fbnote fbnote--err">${ic("alert")}${brainIsValidationTest(o)?"Falta adicionar o vídeo — vídeo não encontrado.":esc(d.driveIngestError||"falha ao baixar do Drive")}</div>`
    :hosted?`<div class="fbnote" style="color:var(--accent)">${ic("info")}Vídeo salvo no Storage (permanente).</div>`:"";
  return btn||note?`<div class="linkbtns" style="margin-top:12px">${btn}</div>${note}`:"";
}

/* ===== VIEW DOS NOVOS SWIPES ===== */
function openSimpleView(o,skipOpen){
  currentSimpleId=o.id;
  const d=o.data||{}, kind=d.kind, logicalKind=sectionOf(o), cfg=sectionCfg(logicalKind);
  const isFegsys=d.source==="fegsys";
  $("#viewTag").textContent=isFegsys?"Fegsys":(d.marca?d.marca+" · ":"")+cfg.label;
  $("#viewEditBtn").style.display=isFegsys?"none":"";
  $("#viewDeleteBtn").style.display=isFegsys?"none":"";
  $("#viewEditBtn").onclick=()=>{closeOverlay("#viewOverlay");openSimpleForm(logicalKind,o.id);};
  $("#viewDeleteBtn").onclick=()=>{if(confirm("Excluir este item? Não dá para desfazer.")){deleteOffer(o.id);closeOverlay("#viewOverlay");}};

  const kvs=[];
  if(d.nicho)kvs.push(`<div class="kv"><div class="k">Nicho</div><div class="v" style="color:var(--accent)">${esc(d.nicho)}</div></div>`);
  if(kind==="presell")kvs.push(`<div class="kv"><div class="k">Origem</div><div class="v">${d.tipoTrafego==="native"?"Native · Taboola":"Meta Ads"}</div></div>`);
  if(kind==="criativo"&&logicalKind!=="organic"){
    kvs.push(`<div class="kv"><div class="k">Plataforma</div><div class="v">${d.plataforma==="taboola"?"Taboola":"Meta Ads"}</div></div>`);
    if(d.fbDaysActive!=null)kvs.push(`<div class="kv"><div class="k">No ar (Facebook)</div><div class="v" style="color:var(--accent)">${esc(fbDaysText(d))}</div></div>`);
    if(d.fbPageName)kvs.push(`<div class="kv"><div class="k">Página</div><div class="v">${esc(d.fbPageName)}</div></div>`);
    if(d.fbMetrics&&d.fbMetrics.impressions!=null)kvs.push(`<div class="kv"><div class="k">Impressões (FB)</div><div class="v">${esc(String(d.fbMetrics.impressions))}</div></div>`);
    if(d.collectionLabel||logicalKind==="organic")kvs.push(`<div class="kv"><div class="k">Coleção</div><div class="v" style="color:var(--accent);font-weight:800">${esc(logicalKind==="organic"?"VIDEO ORGANICO":d.collectionLabel)}</div></div>`);
  }
  if(kind==="criativo"){
    const uploadDate=creativeUploadDate(o);
    if(uploadDate)kvs.push(`<div class="kv"><div class="k">Adicionado em</div><div class="v">${esc(uploadDate)}</div></div>`);
  }
  if(kind==="noticia"){
    if(d.fonte)kvs.push(`<div class="kv"><div class="k">Fonte</div><div class="v">${esc(d.fonte)}</div></div>`);
    if(d.dataPub)kvs.push(`<div class="kv"><div class="k">Data</div><div class="v">${relDate(d.dataPub)}</div></div>`);
    if(d.engajamento)kvs.push(`<div class="kv"><div class="k">Engajamento</div><div class="v">${esc(d.engajamento)}</div></div>`);
  }
  if(kind==="tiktok"){
    kvs.push(`<div class="kv"><div class="k">Autor</div><div class="v">@${esc(d.autor||"")}</div></div>`);
    if(d.dataPub)kvs.push(`<div class="kv"><div class="k">Publicado</div><div class="v">${ttDate(d.dataPub)}</div></div>`);
    if(d.engajamento)kvs.push(`<div class="kv"><div class="k">Engajamento</div><div class="v" style="color:var(--accent)">${(d.engajamento*100).toFixed(1)}%</div></div>`);
  }
  if(kind==="megabrain"){
    if(d.autor)kvs.push(`<div class="kv"><div class="k">Autor do criativo</div><div class="v brain-hl-author">${esc(d.autor)}</div></div>`);
    if(brainHasMetric(d))kvs.push(`<div class="kv"><div class="k">${brainIsFat(d)?"Faturamento":"Vendas"}</div><div class="v brain-hl-metric">${esc(brainMetricFull(d))}</div></div>`);
    if(brainSalesPending(d))kvs.push(`<div class="kv"><div class="k">Vendas</div><div class="v" style="color:var(--red)">CRIATIVO SEM ATUALIZAÇAO DE NUMERO DE VENDAS</div></div>`);
    if(d.videoMissing===true)kvs.push(`<div class="kv"><div class="k">Vídeo</div><div class="v" style="color:var(--red)">Falta adicionar o vídeo — vídeo não encontrado.</div></div>`);
  }

  let mainLink="";
  if(kind==="presell"&&d.link)mainLink=`<div class="linkbtns" style="margin-top:18px">${linkbtn("Abrir presell",d.link,true,"newspaper")}</div>`;
  if(kind==="criativo"){
    const va=videoOfCrv(d);
    const copyLink=(d.copyLink||"").trim();
    const btns=[d.linkAnuncio?linkbtn("Abrir anúncio",d.linkAnuncio,true,"external"):"",va?linkbtn("Abrir vídeo",va,false,"play"):"",copyLink?linkbtn("Abrir copy no Drive",copyLink,true,"file"):"",brainCopyText(d)?`<button class="btn btn--outline btn--sm" data-copy="${o.id}">${ic("type")}Ver e copiar a copy</button>`:""].filter(Boolean).join("");
    if(btns)mainLink=`<div class="linkbtns" style="margin-top:18px">${btns}</div>`;
    mainLink+=fbIngestControl(o);
  }
  if(kind==="noticia"&&d.link)mainLink=`<div class="linkbtns" style="margin-top:18px">${linkbtn("Abrir notícia",d.link,true,"external")}</div>`;
  if(kind==="tiktok"&&d.url)mainLink=`<div class="linkbtns" style="margin-top:18px">${linkbtn("Abrir no TikTok",d.url,true,"external")}</div>`;
  if(kind==="megabrain"){
    const va=(d.video||d.videoVsl||d.videoCriativo||"").trim(),image=String(d.print||"").trim();
    const btns=[d.linkDrive?linkbtn("Abrir no Drive",d.linkDrive,true,"folder"):"",va?linkbtn("Abrir vídeo",va,false,"play"):"",image?linkbtn("Abrir imagem",image,false,"image"):""].filter(Boolean).join("");
    if(btns)mainLink=`<div class="linkbtns" style="margin-top:18px">${btns}</div>`;
    mainLink+=brainIngestControl(o);
  }

  let sn=0;const num=()=>String(++sn).padStart(2,"0");
  let sections="";

  if(kind==="megabrain"&&isFegsys)sections+=fegsysDetailsSections(d,num);

  /* presell: print */
  if(kind==="presell"&&d.print){
    sections+=`<section class="sec"><div class="sec__head"><span class="sec__num">${num()}</span><span class="sec__title">Print</span><span class="sec__line"></span></div><div class="dom__shots" style="grid-template-columns:1fr">${shotView("Presell / Advertorial",d.print)}</div></section>`;
  }

  /* criativo: vídeo embutido + transcrição ao lado; a plataforma não altera
     o tipo de mídia, portanto Taboola com MP4 segue o mesmo padrão do Meta. */
  if(kind==="criativo"){
    const va=videoOfCrv(d);
    const showVideo=!!va;
    if(showVideo){
      sections+=`<section class="sec"><div class="sec__head"><span class="sec__num">${num()}</span><span class="sec__title">Criativo</span><span class="sec__line"></span></div>${videoBlock(va,d,true,d.transcricaoStatus)}${transcribeBtn(o,va,d)}</section>`;
    }
    if(d.print){
      const lbl=d.plataforma==="taboola"?"Anúncio (Taboola)":"Imagem";
      sections+=`<section class="sec"><div class="sec__head"><span class="sec__num">${num()}</span><span class="sec__title">${lbl}</span><span class="sec__line"></span></div><div class="dom__shots" style="grid-template-columns:1fr">${shotView("Criativo",d.print)}</div></section>`;
    }
    if(!showVideo&&!d.print){
      const mediaState=fbStatusOf(o);
      sections+=mediaState==="working"||mediaState==="queued"
        ?`<div class="muted-empty">${ic("download")}A mídia está sendo anexada automaticamente a este card.</div>`
        :mediaState==="retry_scheduled"||mediaState==="pending"||d.mediaArchiveRequired===true
          ?`<div class="muted-empty">${ic("clock")}A mídia ainda não foi anexada. A recuperação automática continuará tentando até concluir.</div>`
          :`<div class="muted-empty">Nenhum criativo cadastrado. Clique em Editar para adicionar vídeo ou imagem.</div>`;
    }
  }

  /* mega brain: vídeo do criativo + copy escrita LADO A LADO + imagem */
  if(kind==="megabrain"){
    const copy=brainCopyText(d);
    const copyTitle=brainCopyIsTranscript(d)?(/^en\b/i.test(String(d.transcricaoLang||""))?"Copy original em inglês":"Copy original do áudio"):"Copy cadastrada";
    const copyLink=(d.copyLink||d.copyVslLink||d.copyCriativoLink||"").trim();
    const va=videoOfBrain(d),image=String(d.print||"").trim();
    const embed=videoEmbedHtml(va);
    const mediaPane=(isFegsys&&embed)?`<div class="brainstage__media">${embed}</div>`
      :image?`<div class="brainstage__media"><div class="dom__shots" style="grid-template-columns:1fr">${shotView("Criativo",image)}</div></div>`
      :embed?`<div class="brainstage__media">${embed}</div>`
      :(va?`<div class="brainstage__media"><div class="linkbtns">${linkbtn("Abrir vídeo",va,true,"play")}</div></div>`:"");
    const canFollow=!!(embed&&embed.includes("<video")&&String(d.transcricao||"").trim()&&copy);
    const copyTools=[copyLink?linkbtn("Abrir copy em português (doc)",copyLink,true,"file"):"",canFollow?`<button type="button" class="brain-follow active" data-brain-follow aria-pressed="true">${ic("play")}Seguindo áudio</button>`:""].filter(Boolean).join("");
    const copyPane=`<div class="brainstage__copy" data-transcript-pane><div class="vk">${ic("type")}${copyTitle}</div>${copyTools?`<div class="brainstage__tools">${copyTools}</div>`:""}<div class="brain-copy ${copy?"":"empty"}" data-brain-copy>${copy?brainCopyMarkup(d):"Sem transcrição original disponível neste card."}</div></div>`;
    if(mediaPane||copy||copyLink){
      sections+=`<section class="sec"><div class="sec__head"><span class="sec__num">${num()}</span><span class="sec__title">Criativo &amp; Copy</span><span class="sec__line"></span></div>
        <div class="brainstage${mediaPane?"":" brainstage--full"}" data-video-sync>${mediaPane}${copyPane}</div>
        ${transcribeBtn(o,va,d)}</section>`;
    }
    if(!mediaPane&&!copy&&!copyLink){
      sections+=`<div class="muted-empty">Nenhum material cadastrado ainda. Clique em Editar para adicionar copy ou criativo.</div>`;
    }
  }

  if(kind==="criativo"||kind==="megabrain")sections+=adAnalysisSection(d,num);

  /* notícia: resumo */
  if(kind==="noticia"&&d.resumo){
    sections+=`<section class="sec"><div class="sec__head"><span class="sec__num">${num()}</span><span class="sec__title">Resumo</span><span class="sec__line"></span></div><div class="resumo">${esc(d.resumo)}</div></section>`;
  }

  /* tiktok: capa + métricas + legenda + hashtags + som */
  if(kind==="tiktok"){
    const thumb=d.thumb?`<a href="${esc(d.url)}" target="_blank" rel="noopener" class="cmedia ttmedia ttmedia--view"><img src="${esc(d.thumb)}" alt="${esc(d.nome||"")}"><span class="cmedia__play">${ic("play")}</span>${d.duracao?`<span class="ttdur">${ttDur(d.duracao)}</span>`:""}</a>`:"";
    const metrics=[["eye","Views",fmtNum(d.views)],["heart","Likes",fmtNum(d.likes)],["message","Comentários",fmtNum(d.comentarios)],["share","Shares",fmtNum(d.shares)],["heart","Saves",fmtNum(d.saves)]]
      .map(([i,l,v])=>`<div class="ttmetric">${ic(i)}<div><span class="ttmetric__v">${v}</span><span class="ttmetric__l">${l}</span></div></div>`).join("");
    const tags=(d.hashtags||[]).length?`<div class="card__chips" style="margin-top:14px">${d.hashtags.map(h=>`<span class="chip">#${esc(h)}</span>`).join("")}</div>`:"";
    const som=d.som?`<div class="ttsom">${ic("play")}Som: <b>${esc(d.som)}</b>${d.somAutor?` · ${esc(d.somAutor)}`:""}</div>`:"";
    sections+=`<section class="sec"><div class="sec__head"><span class="sec__num">${num()}</span><span class="sec__title">Vídeo</span><span class="sec__line"></span></div>
      <div class="ttview">${thumb}<div class="ttview__side"><div class="ttmetrics">${metrics}</div>${d.caption?`<div class="resumo" style="margin-top:14px">${esc(d.caption)}</div>`:""}${tags}${som}</div></div></section>`;
  }

  const noAside=(kind==="criativo"||kind==="tiktok"||kind==="megabrain");
  const asideHtml=noAside?"":`<aside class="sidebar"><div class="note"><div class="nk">★ Comentário / orientação</div><div class="nbody ${d.comentario?"":"empty"}">${d.comentario?esc(d.comentario):"Sem comentários."}</div></div></aside>`;
  $("#viewBody").innerHTML=`<div class="view-grid${noAside?" view-grid--full":""}"><div>
    <section class="sec"><div class="prod-head"><div class="info">
      ${d.collectionLabel||logicalKind==="organic"?`<div class="collection-flag">${ic("user")}${esc(logicalKind==="organic"?"VIDEO ORGANICO":d.collectionLabel)}</div>`:""}
      <div class="brand">${esc(kind==="noticia"?(d.fonte||cfg.label):(d.marca||cfg.label))}</div>
      <h2>${esc(d.nome||"Sem título")}</h2>
      <div class="kvs">${kvs.join("")}</div>
      ${mainLink}
    </div></div></section>
    ${sections}
  </div>
  ${asideHtml}</div>`;
  wireLightboxLinks($("#viewBody"));
  $$("[data-transcribe]",$("#viewBody")).forEach(b=>b.addEventListener("click",()=>requestInstantTranscription(b.dataset.transcribe)));
  $$("[data-fbingest]",$("#viewBody")).forEach(b=>b.addEventListener("click",()=>triggerFbIngest(b.dataset.fbingest)));
  $$("[data-brainingest]",$("#viewBody")).forEach(b=>b.addEventListener("click",()=>triggerBrainIngest(b.dataset.brainingest)));
  $$("[data-copy]",$("#viewBody")).forEach(b=>b.addEventListener("click",()=>openCopyPop(b.dataset.copy)));
  wireVideoTranscripts($("#viewBody"));
  wireTranscriptLanguageTabs($("#viewBody"));
  wireVideoPreviews($("#viewBody"));
  if(!skipOpen)openOverlay("#viewOverlay");
}

/* ===== FORM DOS NOVOS SWIPES ===== */
function blankSimple(kind){
  const base={kind,nome:"",nicho:"",marca:"",link:"",print:"",comentario:""};
  if(kind==="presell")base.tipoTrafego="meta";
  if(kind==="criativo"||kind==="organic")Object.assign(base,{plataforma:kind==="organic"?"organic":"meta",linkAnuncio:"",video:"",transcricao:"",transcricaoPt:"",transcricaoPtStatus:"",copyLink:""});
  if(kind==="megabrain")Object.assign(base,{autor:"",metricaTipo:"vendas",metricaValor:"",linkDrive:"",copy:"",copyLink:"",video:"",transcricao:""});
  if(kind==="noticia")Object.assign(base,{subnicho:"Geral",fonte:"Manual",dataPub:"",engajamento:"",resumo:""});
  return base;
}
function placeholderFor(k){return k==="presell"?"Ex: Advertorial matéria — Próstata":k==="organic"?"Ex: Hook orgânico 01":k==="criativo"?"Ex: VSL feminina — dor emocional":k==="noticia"?"Ex: Novo estudo sobre emagrecimento com GLP-1":"Ex: VSL Emagrecimento — ângulo médico";}
function setSimpleSaveState(s){const e=$("#simpleSaveState");if(!e)return;const map={saved:["","Salvo"],unsaved:["warn","Não salvo"],saving:["saving","Salvando…"],error:["err","Erro ao salvar"],new:["","Novo"]};const m=map[s]||map.new;e.className="save-state"+(m[0]?" "+m[0]:"");e.innerHTML='<span class="ssdot"></span>'+m[1];}
function sMarkDirty(){sFormDirty=true;setSimpleSaveState("unsaved");}

/* ===== UPLOAD DE VÍDEO (Supabase Storage) ===== */
const VIDEO_BUCKET="criativos", VIDEO_MAX=52428800; // 50MB
function setVidUpState(zone,state,name){
  if(!zone)return;
  const n=esc(name||"vídeo");
  if(state==="uploading")zone.innerHTML=`<div class="vidup__hint"><span class="vidup__spin"></span>Enviando ${n}… (não feche)</div>`;
  else if(state==="done")zone.innerHTML=`<div class="vidup__hint vidup__ok">✓ ${n} enviado — toca na visualização</div>`;
  else if(state==="error")zone.innerHTML=`<div class="vidup__hint">Falha no envio. Tente de novo ou cole um link.</div>`;
  else zone.innerHTML=`<div class="vidup__hint">Clique para escolher <b>ou arraste</b> um MP4 aqui (até 50MB)</div>`;
}
async function uploadVideoFile(file){
  const zone=$("#vidUpZone");
  if(!file)return;
  if(!sb){toast("Conexão indisponível",true);return;}
  let mediaInfo;try{mediaInfo=await inspectUploadFile(file,["video"],VIDEO_MAX);}catch(e){toast((e&&e.message)||"Selecione um vídeo válido.",true);return;}
  if(zone&&zone.dataset.busy)return;
  if(zone)zone.dataset.busy="1";
  setVidUpState(zone,"uploading",file.name);
  const ext=mediaInfo.ext;
  const uid=(self.crypto&&crypto.randomUUID)?crypto.randomUUID():Date.now()+"-"+Math.random().toString(36).slice(2);
  const path=`${sKind||"criativo"}/${uid}.${ext}`;
  let res;
  try{res=await sb.storage.from(VIDEO_BUCKET).upload(path,file,{contentType:mediaInfo.contentType,upsert:false});}
  catch(err){res={error:err};}
  if(zone)delete zone.dataset.busy;
  if(res.error){
    setVidUpState(zone,"error");
    const m=(res.error.message||String(res.error));
    toast(/row-level|denied|unauthor/i.test(m)?"Falta a policy de Storage — rode o SQL enviado.":"Falha no upload: "+m,true);
    return;
  }
  const url=sb.storage.from(VIDEO_BUCKET).getPublicUrl(path).data.publicUrl;
  sItem.video=url;
  if(!((sItem.transcricao||"").trim()))sItem.transcricaoStatus="pending"; // a transcrição automática preenche depois
  const inp=$('[data-sk="video"]',$("#simpleFormBody"));if(inp)inp.value=url;
  setVidUpState(zone,"done",file.name);
  sMarkDirty();
  toast("Vídeo enviado ✓");
}

let creativeBatchWorking=false;
function organicSourceFile(file){
  const raw=String(file.webkitRelativePath||file.name||"").replace(/\\/g,"/").replace(/^\/+/,"");
  const parts=raw.split("/").filter(Boolean);if(parts.length>1)parts.shift();
  return parts.join("/")||String(file.name||"");
}
function naturalFileCompare(a,b){return String(a||"").localeCompare(String(b||""),"pt-BR",{numeric:true,sensitivity:"base"});}
async function buildOrganicManifest(files,existingSources){
  const candidates=files.filter(file=>{
    const name=String(file.name||"");
    return !name.startsWith("._")&&!/^\.DS_Store$/i.test(name)&&(/^video\//i.test(file.type||"")||/\.(mp4|mov|webm|m4v)$/i.test(name)||!name.includes("."));
  }).map(file=>({file,sourceFile:organicSourceFile(file)})).sort((a,b)=>naturalFileCompare(a.sourceFile,b.sourceFile));
  if(!candidates.length)throw new Error("nenhum vídeo válido foi encontrado na pasta");
  const keys=new Set(),duplicates=[];
  for(const item of candidates){const key=item.sourceFile.toLowerCase();if(keys.has(key))duplicates.push(item.sourceFile);keys.add(key);}
  if(duplicates.length)throw new Error(`há caminhos duplicados no lote: ${duplicates.slice(0,3).join(", ")}`);
  const pending=candidates.filter(item=>!existingSources.has(`ad feg ed|${item.sourceFile.toLowerCase()}`));
  const names=nextOrganicNames(pending.length),records=[];
  for(let index=0;index<pending.length;index++){
    const item=pending[index],mediaInfo=await inspectUploadFile(item.file,["video"],VIDEO_MAX);
    records.push({...item,mediaInfo,nome:names[index]});
  }
  return {records,skipped:candidates.length-pending.length,total:candidates.length};
}
const SPY_BATCH_MANIFEST="swipe-import.json";
function nextCreativeNamesFor(records){
  const maxByCode=new Map();
  for(const row of offers){
    const data=(row&&row.data)||{};if(data.kind!=="criativo"||data.division==="organic"||data.division==="fegbrands")continue;
    const match=String(data.nome||"").match(/^\[ADS ([A-Z0-9]+)\]\[(\d+)\]$/i);if(!match)continue;
    const code=match[1].toUpperCase();maxByCode.set(code,Math.max(maxByCode.get(code)||0,Number(match[2])||0));
  }
  return records.map(record=>{
    const code=creativeNicheCode(record.nicho),next=(maxByCode.get(code)||0)+1;maxByCode.set(code,next);
    return `[ADS ${code}][${String(next).padStart(2,"0")}]`;
  });
}
async function buildSpyCreativeManifest(files,existingSources,existingHashes,existingLinks){
  const manifestFile=files.find(file=>String(file.name||"").toLowerCase()===SPY_BATCH_MANIFEST);
  if(!manifestFile)return null;
  let parsed;try{parsed=JSON.parse(await manifestFile.text());}catch(_){throw new Error(`o arquivo ${SPY_BATCH_MANIFEST} não contém JSON válido`);}
  const sourceRecords=Array.isArray(parsed)?parsed:(Array.isArray(parsed.records)?parsed.records:[]);
  if(!sourceRecords.length)throw new Error("o manifesto não contém criativos");
  if(sourceRecords.length>150)throw new Error("o lote excede o limite seguro de 150 criativos");
  const mediaFiles=files.filter(file=>!String(file.name||"").startsWith("._")&&(/^video\//i.test(file.type||"")||/\.(mp4|mov|webm|m4v)$/i.test(file.name||"")));
  const byPath=new Map(),byName=new Map();
  for(const file of mediaFiles){byPath.set(organicSourceFile(file).toLowerCase(),file);byName.set(String(file.name||"").toLowerCase(),file);}
  const manifestHashes=new Set(),manifestSources=new Set(),prepared=[],skippedRecords=[];
  const allowedNiches=new Set(["Emagrecimento","Disfunção Erétil","Memória","Diabetes/Glicose","Pressão Alta","Visão"]);
  for(const source of sourceRecords){
    const mediaFile=String(source&&source.mediaFile||"").replace(/\\/g,"/").replace(/^\/+/,"");
    const file=byPath.get(mediaFile.toLowerCase())||byName.get(mediaFile.split("/").pop().toLowerCase());
    const nicho=String(source&&source.nicho||"").trim(),plataforma=String(source&&source.plataforma||source&&source.platform||"").trim().toLowerCase();
    const importBatch=String(source&&source.importBatch||source&&source.batch||"").trim(),sourceFile=String(source&&source.sourceFile||"").replace(/\\/g,"/").replace(/^\/+/,"");
    const sourceHash=String(source&&source.sourceHash||"").trim().toLowerCase(),linkAnuncio=String(source&&source.linkAnuncio||source&&source.adUrl||"").trim();
    const sourceKey=String(source&&source.sourceKey||`${importBatch}/${sourceFile}`).trim().toLowerCase();
    if(!file||!allowedNiches.has(nicho)||plataforma!=="meta"||!importBatch||!sourceFile||!sourceKey||!/^[a-f0-9]{64}$/.test(sourceHash)||linkAnuncio&&!/^https:\/\//i.test(linkAnuncio))throw new Error(`registro inválido no manifesto: ${sourceFile||mediaFile||"sem arquivo"}`);
    const dedupeKey=`${importBatch.toLowerCase()}|${sourceFile.toLowerCase()}`,linkKey=linkAnuncio?canonicalCreativeUrl(linkAnuncio):"";
    if(manifestHashes.has(sourceHash)||manifestSources.has(dedupeKey))throw new Error(`o manifesto repete o criativo ${sourceFile}`);
    manifestHashes.add(sourceHash);manifestSources.add(dedupeKey);
    if(existingHashes.has(sourceHash)||existingSources.has(dedupeKey)||linkKey&&existingLinks.has(linkKey)){skippedRecords.push(sourceFile);continue;}
    const mediaInfo=await inspectUploadFile(file,["video"],VIDEO_MAX);
    prepared.push({file,mediaInfo,nicho,plataforma,importBatch,sourceFile,sourceHash,sourceKey,linkAnuncio,originalName:String(source&&source.originalName||sourceFile.replace(/\.[^.]+$/,"")).trim()});
  }
  const names=nextCreativeNamesFor(prepared);prepared.forEach((record,index)=>record.nome=names[index]);
  return {records:prepared,skipped:skippedRecords.length,total:sourceRecords.length,duplicatesRemoved:Number(parsed&&parsed.duplicatesRemoved||0)};
}
async function importCreativeBatch(files,niche="Emagrecimento",brandMode=false,organicMode=false){
  if(!requireAdmin()||creativeBatchWorking)return;
  const brandNiche=activeNiche&&activeNiche!==NO_NICHE?activeNiche:"";
  let videos=files.filter(file=>brandMode?/^(video|image)\//i.test(file.type||"")||/\.(mp4|mov|webm|m4v|jpe?g|png|webp)$/i.test(file.name||""):/^video\//i.test(file.type||"")||/\.(mp4|mov|webm|m4v)$/i.test(file.name||""));
  if(!videos.length){toast(brandMode?"Selecione vídeos ou imagens da Balls n Brains.":"Selecione pelo menos um arquivo de vídeo.",true);return;}
  const defaultBatchName=organicMode?"AD FEG ED":brandMode?"Balls n Brains":"WL FEG";
  const button=$("#creativeBatchImport"),existingSources=new Set(
    offers.filter(row=>(row.data||{}).kind==="criativo")
      .map(row=>`${String((row.data||{}).importBatch||"").toLowerCase()}|${String((row.data||{}).sourceFile||"").toLowerCase()}`)
  ),existingHashes=new Set(
    offers.filter(row=>(row.data||{}).kind==="criativo").map(row=>String((row.data||{}).sourceHash||"").toLowerCase()).filter(Boolean)
  ),existingLinks=new Set(
    offers.filter(row=>(row.data||{}).kind==="criativo").map(row=>canonicalCreativeUrl((row.data||{}).linkAnuncio||"")).filter(Boolean)
  );
  let organicManifest=null,spyManifest=null;
  if(organicMode){
    try{if(button){button.disabled=true;button.innerHTML=ic("pulse")+"Validando 0/…";}organicManifest=await buildOrganicManifest(files,existingSources);videos=organicManifest.records;}
    catch(error){if(button){button.disabled=false;button.innerHTML=ic("upload")+"Importar pasta de orgânicos";}toast(`Lote não aplicado: ${String(error&&error.message||error)}`,true);return;}
    if(!videos.length){if(button){button.disabled=false;button.innerHTML=ic("upload")+"Importar pasta de orgânicos";}toast(`Lote validado: os ${organicManifest.total} vídeos já estão no Swipe Organic.`);return;}
    toast(`Lote validado: ${organicManifest.total} vídeos · ${videos.length} para importar${organicManifest.skipped?` · ${organicManifest.skipped} já existentes`:""}.`);
  }else if(!brandMode&&files.some(file=>String(file.name||"").toLowerCase()===SPY_BATCH_MANIFEST)){
    try{
      if(button){button.disabled=true;button.innerHTML=ic("pulse")+"Validando manifesto…";}
      spyManifest=await buildSpyCreativeManifest(files,existingSources,existingHashes,existingLinks);videos=spyManifest.records;
    }catch(error){if(button){button.disabled=false;button.innerHTML=ic("upload")+"Importar pasta";}toast(`Lote não aplicado: ${String(error&&error.message||error)}`,true);return;}
    if(!videos.length){if(button){button.disabled=false;button.innerHTML=ic("upload")+"Importar pasta";}toast(`Lote validado: os ${spyManifest.total} criativos já estão no Swipe.`);return;}
    toast(`Lote validado: ${spyManifest.total} únicos · ${videos.length} para importar${spyManifest.skipped?` · ${spyManifest.skipped} já existentes`:""}${spyManifest.duplicatesRemoved?` · ${spyManifest.duplicatesRemoved} duplicados removidos na origem`:""}.`);
  }
  creativeBatchWorking=true;if(button)button.disabled=true;
  let imported=0,skipped=(organicManifest?.skipped||0)+(spyManifest?.skipped||0),failed=0,firstFailure="";
  for(let index=0;index<videos.length;index++){
    const record=(organicMode||spyManifest)?videos[index]:null,file=record?record.file:videos[index],sourceFile=record?record.sourceFile:String(file.name||`criativo-${index+1}.mp4`),batchName=record?.importBatch||defaultBatchName,dedupeKey=`${batchName.toLowerCase()}|${sourceFile.toLowerCase()}`;
    if(existingSources.has(dedupeKey)){skipped++;continue;}
    if(button)button.innerHTML=ic("upload")+`Importando ${index+1}/${videos.length}…`;
    let mediaInfo;try{mediaInfo=(record&&record.mediaInfo)||await inspectUploadFile(file,brandMode?["video","image"]:["video"],VIDEO_MAX);}catch(error){failed++;firstFailure||=(error&&error.message)||"arquivo inválido";continue;}
    const uid=(self.crypto&&crypto.randomUUID)?crypto.randomUUID():Date.now()+"-"+Math.random().toString(36).slice(2);
    const storagePath=organicMode?`organic/ad-feg-ed/${uid}.${mediaInfo.ext}`:brandMode?`brands/balls-n-brains/creatives/${uid}.${mediaInfo.ext}`:`criativo/wl-feg/${uid}.${mediaInfo.ext}`;
    let uploadError=null,uploadToken="";
    try{
      uploadToken=await storageSignedUploadWithProgress(file,storagePath,percent=>{
        if(button)button.innerHTML=ic("upload")+`Importando ${index+1}/${videos.length} · ${percent}%`;
      },mediaInfo.contentType);
    }catch(error){uploadError=error;}
    if(uploadError){failed++;firstFailure||=uploadError.message||"falha no envio";continue;}
    let data=null;
    try{
      const publicResult=sb.storage.from(VIDEO_BUCKET).getPublicUrl(storagePath);
      const publicUrl=publicResult&&publicResult.data&&publicResult.data.publicUrl;
      if(!publicUrl)throw new Error("o armazenamento não retornou o link público");
      const originalName=record?.originalName||sourceFile.replace(/\.[^.]+$/,"");
      const isVideo=mediaInfo.kind==="video";
      data=organicMode?{
        kind:"criativo",division:"organic",collectionLabel:"VIDEO ORGANICO",nome:record.nome,nomeOriginal:originalName,nicho:"",marca:"FEG Organic",
        plataforma:"organic",linkAnuncio:"",video:publicUrl,print:"",copyLink:"",transcricao:"",transcricaoPt:"",transcricaoPtStatus:"pending",
        transcriptionRequired:true,transcriptionStatus:"pending",transcricaoStatus:"pending",transcriptionAttempts:0,transcriptionProvider:"faster-whisper",transcriptionVersion:"1",
        importBatch:batchName,sourceKey:`organic/ad-feg-ed/${sourceFile.toLowerCase()}`,sourceFile
      }:brandMode?{
        kind:"criativo",division:"fegbrands",brandSlug:"balls-n-brains",collectionLabel:"Balls n Brains",nome:nextCreativeName("Balls n Brains"),nomeOriginal:originalName,nicho:brandNiche,marca:"Balls n Brains",
        plataforma:"meta",linkAnuncio:"",video:isVideo?publicUrl:"",print:isVideo?"":publicUrl,copyLink:"",transcricao:"",transcricaoPt:"",
        transcriptionStatus:isVideo?"pending":"",transcricaoStatus:isVideo?"pending":"",transcriptionAttempts:0,transcriptionProvider:isVideo?"faster-whisper":"",transcriptionVersion:isVideo?"1":"",
        importBatch:batchName,sourceKey:`balls-n-brains/${sourceFile.toLowerCase()}`,sourceFile
      }:{
        kind:"criativo",nome:record?.nome||nextCreativeName(niche),nomeOriginal:originalName,nicho:record?.nicho||niche,marca:"WL FEG",
        plataforma:"meta",linkAnuncio:record?.linkAnuncio||"",video:publicUrl,print:"",copyLink:"",
        transcricao:"",transcricaoPt:"",transcriptionStatus:"pending",transcricaoStatus:"pending",
        transcriptionAttempts:0,transcriptionProvider:"faster-whisper",transcriptionVersion:"1",
        importBatch:batchName,sourceKey:record?.sourceKey||`${batchName.toLowerCase()}/${sourceFile.toLowerCase()}`,sourceHash:record?.sourceHash||"",sourceFile
      };
    }catch(error){
      failed++;firstFailure||=String(error&&error.message||"falha ao preparar o card");
      continue;
    }
    let savedRow=null,saveError=null;
    try{
      if(!uploadToken)throw new Error("sua sessão expirou; entre novamente");
      if(button)button.innerHTML=ic("upload")+`Salvando card ${index+1}/${videos.length}…`;
      savedRow=await insertCreativeImport(data,uploadToken);
    }catch(error){saveError=error;}
    if(saveError||!savedRow){
      firstFailure||=String(saveError?.message||"o banco não confirmou o novo criativo");
      failed++;
      /* A limpeza é apenas compensatória. Nunca deixe uma falha/latência do
         Storage prender o importador depois que o banco recusou o card. */
      Promise.race([
        sb.storage.from(VIDEO_BUCKET).remove([storagePath]),
        new Promise(resolve=>setTimeout(resolve,5000))
      ]).catch(()=>{});
      continue;
    }
    offers.push(savedRow);existingSources.add(dedupeKey);if(record?.sourceHash)existingHashes.add(record.sourceHash);if(record?.linkAnuncio)existingLinks.add(canonicalCreativeUrl(record.linkAnuncio));imported++;
  }
  creativeBatchWorking=false;
  if(button){button.disabled=false;button.innerHTML=ic("upload")+(organicMode?"Importar pasta de orgânicos":brandMode?"Subir Balls n Brains":"Importar pasta");}
  renderGrid();writeCache();
  toast(`${imported} vídeo${imported===1?"":"s"} importado${imported===1?"":"s"}${skipped?` · ${skipped} já existia${skipped===1?"":"m"}`:""}${failed?` · ${failed} falha${failed===1?"":"s"}${firstFailure?`: ${firstFailure}`:""}`:""}`,!!failed);
}

function wireVideoUpload(){
  const zone=$("#vidUpZone");if(!zone)return;
  const pick=()=>{const i=document.createElement("input");i.type="file";i.accept="video/mp4,video/webm,video/quicktime,video/*";i.onchange=()=>{if(i.files[0])uploadVideoFile(i.files[0]);};i.click();};
  zone.addEventListener("click",pick);
  zone.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();pick();}});
  zone.addEventListener("dragover",e=>{e.preventDefault();zone.classList.add("active");});
  zone.addEventListener("dragleave",()=>zone.classList.remove("active"));
  zone.addEventListener("drop",e=>{e.preventDefault();zone.classList.remove("active");const f=[...e.dataTransfer.files].find(f=>f.type.startsWith("video/"));if(f)uploadVideoFile(f);else toast("Arraste um arquivo de vídeo.",true);});
}

function openSimpleForm(kind,id){
  if(!requireAdmin())return;
  sKind=kind;sEditingId=id;sFormDirty=false;sSaving=false;
  const cfg=sectionCfg(kind);
  const src=id?(offers.find(o=>o.id===id)||{}).data:null;
  sItem=src?Object.assign(blankSimple(kind),JSON.parse(JSON.stringify(src))):blankSimple(kind);
  sItem.kind=kind;
  $("#simpleFormTag").textContent=(id?"Editar — ":"Novo — ")+cfg.label;
  setSimpleSaveState(id?"saved":"new");
  renderSimpleForm();
  openOverlay("#simpleFormOverlay");
  const f=$("#s_nome");if(f)f.focus();
}
function renderSimpleForm(){
  const k=sKind, it=sItem;
  const nomeField=`<div class="field big"><label class="lbl">Nome / identificação *</label><input type="text" id="s_nome" data-sk="nome" placeholder="${esc(placeholderFor(k))}" value="${esc(it.nome)}"></div>`;
  const nichoField=k==="noticia"?`<div class="field"><label class="lbl">Nicho de Ofertas *</label><select data-sk="nicho"><option value="">Selecione o nicho</option>${RADAR_NICHES.map(n=>`<option value="${esc(n)}"${sameNiche(n,it.nicho)?" selected":""}>${esc(n)}</option>`).join("")}</select></div>`:`<div class="field"><label class="lbl">Nicho</label><input list="nichosGlobal" data-sk="nicho" placeholder="Emagrecimento, Disfunção Erétil, Memória..." value="${esc(it.nicho)}"></div>`;
  const marcaField=`<div class="field"><label class="lbl">Marca / fonte (opcional)</label><input type="text" data-sk="marca" placeholder="Marca ou conta de origem" value="${esc(it.marca)}"></div>`;
  const comentField=`<div class="field"><label class="lbl">★ Comentário / orientação</label><textarea data-sk="comentario" placeholder="Observações, por que salvou, insights...">${esc(it.comentario)}</textarea></div>`;
  const printField=`<div class="field"><label class="lbl">Print / screenshot (cole, arraste ou clique)</label><div class="dz" data-zone="s|print" tabindex="0"></div></div>`;
  const videoUpField=`<div class="field" style="margin-bottom:0"><label class="lbl">${ic("film")} …ou envie o arquivo (MP4/WebM, até 50MB)</label><div class="vidup" id="vidUpZone" tabindex="0" role="button" aria-label="Enviar arquivo de vídeo"><div class="vidup__hint">Clique para escolher <b>ou arraste</b> um MP4 aqui (até 50MB)</div></div></div>`;
  let html="";
  if(k==="presell"){
    html=`
    <div class="fsec">
      <div class="fsec__title"><span class="num">01</span> Identificação</div>
      <div class="field"><label class="lbl">Origem do tráfego</label>
        <div class="seg" id="sTipoSeg"><span class="seg-btn active"><span class="sdot" style="background:var(--fb)"></span>Meta Ads</span></div>
      </div>
      ${nomeField}
      <div class="row">${nichoField}${marcaField}</div>
    </div>
    <div class="fsec">
      <div class="fsec__title"><span class="num">02</span> Presell / Advertorial</div>
      <div class="field"><label class="lbl">Link da presell / advertorial</label><input type="url" data-sk="link" placeholder="https://... — página exibida antes da PV" value="${esc(it.link)}"></div>
      ${printField}
    </div>
    <div class="fsec">
      <div class="fsec__title"><span class="num">03</span> Comentário</div>
      ${comentField}
    </div>`;
  }else if(k==="criativo"||k==="organic"){
    const organic=k==="organic";
    html=`
    <div class="fsec">
      <div class="fsec__title"><span class="num">01</span> ${organic?"Identificação":"Meta Ads & Identificação"}</div>
      ${organic?"":`<div class="field"><label class="lbl">Plataforma do criativo</label><div class="seg" id="sPlatSeg"><span class="seg-btn active"><span class="sdot" style="background:var(--fb)"></span>Meta Ads</span></div></div>`}
      ${nomeField}
      ${organic?marcaField:`<div class="row">${nichoField}${marcaField}</div>`}
      ${organic?"":`<div class="field" style="margin-bottom:0"><label class="lbl">Link do anúncio</label><input type="url" data-sk="linkAnuncio" placeholder="https://... — biblioteca, página ou anúncio original" value="${esc(it.linkAnuncio||"")}">
        <div class="fsec__hint" style="margin-top:8px">Se for um link de <b>anúncio do Facebook</b>, ao salvar o criativo é baixado automaticamente (vídeo salvo no acervo + "ativo há X dias"). Views/likes não são públicos nos anúncios do FB.</div>
      </div>`}
    </div>
    <div class="fsec only-video">
      <div class="fsec__title"><span class="num">02</span> Vídeo do criativo</div>
      <div class="fsec__hint">Envie o <b>arquivo MP4</b> (recomendado — toca embutido) ou cole um link (Drive/YouTube/Vimeo). O Drive só toca se o arquivo estiver público; o MP4 enviado sempre toca.</div>
      <div class="field"><label class="lbl">${ic("film")} Link do vídeo</label><input type="url" data-sk="video" placeholder="https://... (Drive/YouTube/Vimeo/.mp4) — ou envie abaixo" value="${esc(it.video||"")}"></div>
      ${videoUpField}
      <div class="field" style="margin-top:20px;margin-bottom:0"><label class="lbl">${ic("file")} Transcrição original do áudio</label><textarea data-sk="transcricao" placeholder="Texto no idioma original do vídeo — aparece ao lado e acompanha o player.">${esc(it.transcricao||"")}</textarea></div>
      <div class="field" style="margin-top:20px;margin-bottom:0"><label class="lbl">${ic("type")} Tradução em português</label><textarea data-sk="transcricaoPt" placeholder="Gerada automaticamente e mantida separada do texto original.">${esc(it.transcricaoPt||"")}</textarea><div class="fsec__hint" style="margin-top:8px">Se ficar em branco, o sistema traduz automaticamente após concluir a transcrição original.</div></div>
      <div class="field" style="margin-top:20px;margin-bottom:0"><label class="lbl">${ic("file")} Link da copy no Drive (opcional)</label><input type="url" data-sk="copyLink" placeholder="https://docs.google.com/... ou https://drive.google.com/..." value="${esc(it.copyLink||"")}"></div>
    </div>
    ${organic?"":`<div class="fsec">
      <div class="fsec__title"><span class="num">03</span> Imagem</div>
      <div class="fsec__hint">Print ou imagem do criativo do Meta Ads.</div>
      ${printField}
    </div>`}`;
  }else if(k==="noticia"){
    html=`
    <div class="fsec">
      <div class="fsec__title"><span class="num">01</span> Notícia</div>
      <div class="field big"><label class="lbl">Título da notícia *</label><input type="text" id="s_nome" data-sk="nome" placeholder="${esc(placeholderFor(k))}" value="${esc(it.nome)}"></div>
      <div class="field"><label class="lbl">Link da notícia</label><input type="url" data-sk="link" placeholder="https://..." value="${esc(it.link)}"></div>
      <div class="row">${nichoField}
        <div class="field"><label class="lbl">Fonte</label><input list="fontesGlobal" data-sk="fonte" placeholder="Reddit, YouTube, Web..." value="${esc(it.fonte||"")}"><datalist id="fontesGlobal"><option value="Reddit"><option value="YouTube"><option value="Hacker News"><option value="Web"><option value="X"><option value="Manual"></datalist></div>
      </div>
      <div class="field"><label class="lbl">Tema</label><select data-sk="subnicho" id="newsTopicSelect">${(RADAR_TOPICS[it.nicho]||["Geral"]).map(topic=>`<option value="${esc(topic)}"${sameNiche(topic,it.subnicho||"Geral")?" selected":""}>${esc(topic)}</option>`).join("")}</select></div>
      <div class="row">
        <div class="field"><label class="lbl">Data (AAAA-MM-DD)</label><input type="text" data-sk="dataPub" placeholder="2026-07-03" value="${esc(it.dataPub||"")}"></div>
        <div class="field"><label class="lbl">Engajamento (opcional)</label><input type="text" data-sk="engajamento" placeholder="Ex: 317 upvotes" value="${esc(it.engajamento||"")}"></div>
      </div>
      <div class="field"><label class="lbl">Resumo</label><textarea data-sk="resumo" placeholder="Resumo / snippet da notícia...">${esc(it.resumo||"")}</textarea></div>
    </div>
    <div class="fsec">
      <div class="fsec__title"><span class="num">02</span> Comentário</div>
      ${comentField}
    </div>`;
  }else{
    /* megabrain — Copy Validadas: banco de criativos validados da empresa */
    const isFat=it.metricaTipo==="faturamento";
    html=`
    <div class="fsec">
      <div class="fsec__title"><span class="num">01</span> Criativo &amp; Autor</div>
      <div class="field big"><label class="lbl">Nome do criativo *</label><input type="text" id="s_nome" data-sk="nome" placeholder="${esc(placeholderFor(k))}" value="${esc(it.nome)}"></div>
      <div class="field"><label class="lbl">${ic("user")} Autor do criativo</label><input type="text" data-sk="autor" placeholder="Ex: Bruno Bismaq" value="${esc(it.autor||"")}"></div>
      ${nichoField}
    </div>
    <div class="fsec">
      <div class="fsec__title"><span class="num">02</span> Performance validada</div>
      <div class="fsec__hint">Escolha a métrica e informe o número — os cards são <b>ordenados por aqui</b>.</div>
      <div class="field"><label class="lbl">Métrica</label>
        <div class="seg" id="sMetricaSeg">
          <button type="button" class="seg-btn${!isFat?" active":""}" data-saction="set-metrica" data-val="vendas">${ic("cart")}Vendas</button>
          <button type="button" class="seg-btn${isFat?" active":""}" data-saction="set-metrica" data-val="faturamento">${ic("dollar")}Faturamento</button>
        </div>
      </div>
      <div class="field" style="margin-bottom:0"><label class="lbl" id="sMetricaLbl">${isFat?"Faturamento (US$)":"Quantas vendas o criativo fez"}</label><input type="text" inputmode="numeric" data-sk="metricaValor" placeholder="${isFat?"Ex: 5000":"Ex: 8"}" value="${esc(it.metricaValor||"")}"></div>
    </div>
    <div class="fsec">
      <div class="fsec__title"><span class="num">03</span> Vídeo do criativo</div>
      <div class="fsec__hint">Envie o <b>arquivo MP4</b> (toca embutido) e/ou cole o <b>link do Drive</b>.</div>
      <div class="field"><label class="lbl">${ic("folder")} Link do Drive</label><input type="url" data-sk="linkDrive" placeholder="https://drive.google.com/..." value="${esc(it.linkDrive||"")}"></div>
      <div class="field"><label class="lbl">${ic("film")} Link do vídeo (MP4 / YouTube / Vimeo)</label><input type="url" data-sk="video" placeholder="https://... .mp4 — ou envie abaixo" value="${esc(it.video||"")}"></div>
      ${videoUpField}
      <div class="field" style="margin-top:20px;margin-bottom:0"><label class="lbl">${ic("file")} Transcrição original do áudio — opcional</label><textarea data-sk="transcricao" placeholder="Texto no idioma original do vídeo — usado no acompanhamento palavra por palavra.">${esc(it.transcricao||"")}</textarea></div>
    </div>
    <div class="fsec">
      <div class="fsec__title"><span class="num">04</span> Copy validada</div>
      <div class="fsec__hint">A transcrição original aparece ao lado do vídeo. A versão em português fica disponível pelo documento.</div>
      <div class="field"><label class="lbl">${ic("type")} Copy em português / referência</label><textarea data-sk="copy" placeholder="Copy traduzida ou referência interna — não substitui a transcrição original ao lado do vídeo." style="min-height:170px">${esc(it.copy||"")}</textarea></div>
      <div class="field" style="margin-bottom:0"><label class="lbl">Link da copy em português (doc) — opcional</label><input type="url" data-sk="copyLink" placeholder="https://docs.google.com/..." value="${esc(it.copyLink||"")}"></div>
    </div>`;
  }
  const body=$("#simpleFormBody");
  body.innerHTML=`<datalist id="nichosGlobal">${NICHOS.map(n=>`<option value="${esc(n)}">`).join("")}</datalist>`+html;
  body.dataset.plat="meta";
  wireZones(body);
  if(k==="criativo"||k==="organic"||k==="megabrain")wireVideoUpload();
}
$("#simpleFormBody").addEventListener("input",e=>{const t=e.target;if(t.dataset.sk!=null){sItem[t.dataset.sk]=t.value;sMarkDirty();}});
$("#simpleFormBody").addEventListener("change",e=>{const t=e.target;if(t.dataset.sk!=null){sItem[t.dataset.sk]=t.value;sMarkDirty();if(sKind==="noticia"&&t.dataset.sk==="nicho"){sItem.subnicho="Geral";const topic=$("#newsTopicSelect");if(topic)topic.innerHTML=(RADAR_TOPICS[t.value]||["Geral"]).map(value=>`<option value="${esc(value)}"${value==="Geral"?" selected":""}>${esc(value)}</option>`).join("");}}});
$("#simpleFormBody").addEventListener("click",e=>{
  const b=e.target.closest("[data-saction]");if(!b)return;
  if(b.dataset.saction==="set-tipo"){sItem.tipoTrafego="meta";sMarkDirty();}
  else if(b.dataset.saction==="set-plat"){sItem.plataforma="meta";$("#simpleFormBody").dataset.plat="meta";sMarkDirty();}
  else if(b.dataset.saction==="set-metrica"){sItem.metricaTipo=b.dataset.val;$$("#sMetricaSeg .seg-btn").forEach(x=>x.classList.toggle("active",x.dataset.val===b.dataset.val));const fat=b.dataset.val==="faturamento";const lbl=$("#sMetricaLbl");if(lbl)lbl.textContent=fat?"Faturamento (US$)":"Quantas vendas o criativo fez";const inp=$('[data-sk="metricaValor"]');if(inp)inp.placeholder=fat?"Ex: 5000":"Ex: 8";sMarkDirty();}
});

async function compressSimpleImages(){if(typeof sItem.print==="string")sItem.print=await maybeCompress(sItem.print);}
function hasSimpleContent(p){return !!(p.nome||p.link||p.linkAnuncio||p.video||p.transcricao||p.print||p.comentario||p.marca||p.autor||p.metricaValor||p.linkDrive||p.copy||p.copyLink||p.resumo||p.copyVsl||p.copyVslLink||p.videoVsl||p.copyCriativo||p.copyCriativoLink||p.videoCriativo);}
async function saveSimpleForm(){
  if(!requireAdmin())return false;
  if(sSaving)return false;
  sSaving=true;setSimpleSaveState("saving");setSync("load","Salvando");
  await compressSimpleImages();
  $$(".dz",$("#simpleFormBody")).forEach(paintZone);
  const p=Object.assign({},sItem);p.kind=sKind==="organic"?"criativo":sKind;if(sKind==="organic"){p.division="organic";p.plataforma="organic";p.nicho="";}
  if(sKind==="noticia"){const canonical=RADAR_NICHES.find(n=>sameNiche(n,p.nicho));if(!canonical){sSaving=false;setSimpleSaveState("error");toast("Selecione um nicho de Ofertas.",true);return false;}p.nicho=canonical;p.subnicho=(RADAR_TOPICS[canonical]||[]).find(topic=>sameNiche(topic,p.subnicho))||"Geral";}
  if(sKind==="presell")p.tipoTrafego="meta";
  if(sKind==="criativo")p.plataforma="meta";
  const old=sEditingId?((offers.find(x=>x.id===sEditingId)||{}).data||{}):{},videoChanged=String(p.video||"")!==String(old.video||""),transcriptChanged=String(p.transcricao||"")!==String(old.transcricao||"");
  if((sKind==="criativo"||sKind==="organic")&&(videoChanged||transcriptChanged)&&String(p.transcricaoPt||"")===String(old.transcricaoPt||"")){p.transcricaoPt="";p.transcricaoPtStatus="pending";p.transcricaoPtError="";}
  if((sKind==="criativo"||sKind==="organic"||sKind==="megabrain")&&String(p.video||"").trim()&&!String(p.transcricao||"").trim()&&(!sEditingId||videoChanged||!["pending","processing","retry_scheduled"].includes(String(p.transcriptionStatus||"")))){
    p.transcriptionStatus="pending";p.transcriptionAttempts=0;p.transcriptionStartedAt="";p.transcriptionCompletedAt="";p.transcriptionLastError="";p.transcriptionNextRetryAt="";p.transcriptionProvider="faster-whisper";p.transcriptionVersion="1";p.transcricaoStatus="pending";
  }
  /* Só os novos registros (ou os que já carregam a marca) recebem o aviso.
     Assim, cards antigos sem métrica não são alterados retroativamente. */
  if(sKind==="megabrain"&&(!sEditingId||p.metricaPendente===true))p.metricaPendente=!brainHasMetric(p);
  if(!hasSimpleContent(p)){sSaving=false;setSimpleSaveState(sFormDirty?"unsaved":"new");toast("Preencha algo antes de salvar",true);return false;}
  const size=JSON.stringify(p).length;
  if(size>6000000){sSaving=false;setSimpleSaveState("error");toast("Imagem muito grande ("+Math.round(size/1048576)+"MB). Reduza o print.",true);return false;}
  let res;
  try{
    if(sEditingId)res=await sb.from("offers").update({data:p}).eq("id",sEditingId).select();
    else res=await sb.from("offers").insert({data:p}).select();
  }catch(err){res={error:err};}
  sSaving=false;
  if(res.error){setSimpleSaveState("error");setSync("err","Erro");toast("Erro ao salvar: "+(res.error.message||res.error),true);return false;}
  const row=res.data&&res.data[0];
  if(row){
    if(!sEditingId){sEditingId=row.id;offers.push(row);}
    else{const i=offers.findIndex(o=>o.id===sEditingId);if(i>=0)offers[i]=row;else offers.push(row);}
  }
  sFormDirty=false;setSimpleSaveState("saved");setSync("ok","Salvo");renderGrid();writeCache();
  // dispara a transcrição instantânea (Groq) em segundo plano p/ vídeo MP4 sem transcrição
  const savedId=sEditingId, saved=offers.find(o=>o.id===savedId);
  if(saved){const v=videoForOffer(saved),emb=v?videoEmbedUrl(v):null;
    if(emb&&emb.type==="video"&&!((saved.data.transcricao||"").trim()))requestInstantTranscription(savedId,v);}
  if(saved&&saved.data.kind==="criativo"&&String(saved.data.transcricao||"").trim()&&!String(saved.data.transcricaoPt||"").trim())scheduleCreativeTranslations([saved]);
  // criativo com link do Facebook e sem vídeo ainda → baixa o criativo automaticamente
  if(saved&&saved.data.kind==="criativo"&&isFbUrl(saved.data.linkAnuncio)&&!((saved.data.video||"").trim())&&!saved.data.fbIngestStatus&&!fbIngesting.has(savedId))
    triggerFbIngest(savedId,saved.data.linkAnuncio);
  return true;
}
function attemptCloseSimpleForm(){if(!sFormDirty){closeOverlay("#simpleFormOverlay");return;}pendingCloseForm="simple";openOverlay("#confirmOverlay");}
$("#simpleFormSave").addEventListener("click",async()=>{if(await saveSimpleForm())toast("Salvo");});
$("#simpleFormClose").addEventListener("click",attemptCloseSimpleForm);

/* Um único listener atende inclusive cards criados depois de filtros/paginação. */
function initPointerGlow(){
  if(!window.matchMedia("(hover:hover) and (pointer:fine)").matches||window.matchMedia("(prefers-reduced-motion:reduce)").matches)return;
  const selector=".card,.chat__icard,.ccttcard";
  let active=null,lastX=0,lastY=0,raf=0;
  const paint=()=>{
    raf=0;
    const next=document.elementFromPoint(lastX,lastY)?.closest(selector)||null;
    if(next!==active){
      if(active)active.classList.remove("is-pointer-glow");
      active=next;
      if(active)active.classList.add("is-pointer-glow");
    }
    if(!active)return;
    const rect=active.getBoundingClientRect();
    active.style.setProperty("--glow-x",(lastX-rect.left)+"px");
    active.style.setProperty("--glow-y",(lastY-rect.top)+"px");
  };
  const schedule=()=>{if(!raf)raf=requestAnimationFrame(paint);};
  document.addEventListener("pointermove",e=>{lastX=e.clientX;lastY=e.clientY;schedule();},{passive:true});
  document.addEventListener("pointerleave",()=>{if(active)active.classList.remove("is-pointer-glow");active=null;});
  window.addEventListener("scroll",schedule,{passive:true});
}
initPointerGlow();

startAuth();
