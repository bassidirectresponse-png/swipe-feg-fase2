import {safePublicUrl} from './offer-intel-public.mjs';
import {landingUrl,displayText} from './offer-intel-display.mjs';
const url=v=>safePublicUrl(landingUrl(v)),text=v=>displayText(v,500),number=v=>Number.isFinite(v)&&v>=0?v:null;
const rows=(v,max=400)=>Array.isArray(v)?v.slice(0,max):[];
export function publicDomainScan(row,summary=false) {
 const d=row.data||{},base={id:row.id,host:text(row.host),registrable:text(row.registrable),status:row.status,created_at:row.created_at};
 const pages=rows(d.pages).filter(p=>url(p.url)).map(p=>({url:url(p.url),title:text(p.title),kind:['landing','presell','quiz','vsl','sales','checkout','upsell','unknown'].includes(p.kind)?p.kind:'unknown',http_status:Number.isInteger(p.http_status)?p.http_status:null,verified:p.verified===true,sources:rows(p.sources,12).filter(s=>['link','sitemap','wp','wayback','urlscan','otx','probe'].includes(s))}));
 const checkout=rows(d.checkout).filter(r=>url(r.url)).map(r=>({platform:text(r.platform),url:url(r.url),page_url:url(r.page_url)}));
 const pixels=rows(d.pixels,500).filter(r=>['meta','tiktok','ga4','gtm','google_ads','taboola','outbrain','pinterest','snap','bing','hotjar','clarity'].includes(r.type)).map(r=>({type:r.type,id:text(r.id),page_url:url(r.page_url)}));
 const tech=rows(d.tech).filter(r=>['page_builder','cms','ecommerce','vsl_player','email','cdn','analytics'].includes(r.category)).map(r=>({category:r.category,name:text(r.name),page_url:url(r.page_url)}));
 const vsl=rows(d.vsl).filter(r=>['vturb','vidalytics','panda','wistia','vimeo','youtube','mp4','hls'].includes(r.provider)).map(r=>({provider:r.provider,page_url:url(r.page_url),player_id:text(r.player_id),media_url:url(r.media_url),duration_s:number(r.duration_s),height:number(r.height),pitch_s:number(r.pitch_s)}));
 const ctas=rows(d.ctas).map(r=>({page_url:url(r.page_url),text:text(r.text),href:url(r.href),hidden:r.hidden===true,show_on_s:number(r.show_on_s)}));
 if(summary)return {...base,counts:{pages:pages.length,checkout:checkout.length,pixels:pixels.length,tech:tech.length,vsl:vsl.length,ctas:ctas.length}};
 return {...base,sources:rows(row.sources,20).map(s=>({name:text(s.name),status:['succeeded','failed','running','skipped'].includes(s.status)?s.status:'failed',count:number(s.count),...(s.error?{error:{code:text(s.error.code),message:text(s.error.message)}}:{})})),pages,
 subdomains:rows(d.subdomains).filter(v=>typeof v==='string'&&/^[a-z0-9.-]{1,253}$/.test(v)),checkout,pixels,tech,vsl,ctas,
 assets:Object.fromEntries(['images','videos'].map(k=>[k,rows(d.assets?.[k],60).filter(a=>url(a.url)).map(a=>({url:url(a.url),page_url:url(a.page_url)}))])),ads_library:{domain_search_url:url(d.ads_library?.domain_search_url)}};
}
