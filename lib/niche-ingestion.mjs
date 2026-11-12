import {taxonomy} from './niche-taxonomy.mjs';
export function sourceKey(data){
 if(data.kind==='tiktok')return 'tiktok:'+data.videoId;
 try{const u=new URL(data.link);for(const k of [...u.searchParams.keys()])if(/^utm_|^(fbclid|gclid)$/i.test(k))u.searchParams.delete(k);u.hash='';u.hostname=u.hostname.toLowerCase().replace(/^www\./,'');return 'news:'+u.toString().replace(/\/$/,'');}catch{return '';}
}
export function validateContent(data){return taxonomy.eligible(data);}
// Read all pages; never silently skip dedup when storage is unavailable.
export async function unseenRows(rows,url,headers,fetcher=fetch){
 const known=new Set();const kind=rows[0]?.data?.kind;if(!kind)return [];
 for(let offset=0;;offset+=1000){
  const r=await fetcher(`${url}/rest/v1/offers?select=id,data&data->>kind=eq.${kind}&order=id&limit=1000&offset=${offset}`,{headers,signal:AbortSignal.timeout(20000)});
  if(!r.ok)throw Error('dedup lookup failed');const list=await r.json();list.forEach(row=>known.add(sourceKey(row.data)));if(list.length<1000)break;
 }
 return rows.filter(row=>{const key=sourceKey(row.data);if(!key||known.has(key))return false;known.add(key);return true;});
}
