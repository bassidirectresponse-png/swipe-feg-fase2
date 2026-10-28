import {observedUrl,hostMatches} from './offer-intel-scan-extract.mjs';
// Metadata only: no media download, eval or playback. Every URL is revalidated by request.
export async function resolveVsl(vsl,request) {
  let media=vsl.media_url,player=vsl.player_url;
  if(vsl.provider==='vturb'&&player) {
    if(!/\.js(?:\?|$)/i.test(player))player=player.replace(/\/$/,'')+'/player.js';
    let text=(await request(player,{maxBytes:512*1024})).text;
    const acc=new URL(player).pathname.split('/').filter(Boolean)[0];
    for(let hop=0;hop<2&&!media;hop++){
      const absolute=text.match(/https?:\/\/[^\s"'<>\\]+\.m3u8(?:\?[^\s"'<>\\]*)?/i)?.[0];
      const relative=text.match(/([a-f0-9-]{36})\/([a-f0-9]{24})\/main\.m3u8/i);
      media=absolute?observedUrl(absolute):relative?observedUrl('https://cdn.converteai.net/'+relative[1]+'/'+relative[2]+'/main.m3u8'):null;
      if(!media){const mid=text.match(/(?:videoId|video_id)\s*["']?\s*[:=]\s*["']([a-f0-9]{24})/i)?.[1];if(mid)media=observedUrl('https://cdn.converteai.net/'+acc+'/'+mid+'/main.m3u8');}
      if(!media){const next=text.match(/https:\/\/scripts\.converteai\.net\/[^\s"'<>\\]+\/player\.js/i)?.[0];if(!next||next===player)break;player=next;text=(await request(next,{maxBytes:512*1024})).text;}
    }
  }
  if(!media)return vsl;
  const result={...vsl,media_url:media};
  if(/\.mp4(?:\?|$)/i.test(media)) {
    const response=await request(media,{maxBytes:512*1024}),buffer=response.body;
    // Only a readable mvhd in the bounded prefix proves duration; never download the rest.
    if(Buffer.isBuffer(buffer)){
      const at=buffer.indexOf(Buffer.from('mvhd'));
      if(at>=4&&at+36<=buffer.length){const version=buffer[at+4],scale=buffer.readUInt32BE(at+(version===1?24:16));
        const duration=version===1?Number(buffer.readBigUInt64BE(at+28)):buffer.readUInt32BE(at+20);
        if([0,1].includes(version)&&scale>0&&Number.isSafeInteger(duration))result.duration_s=duration/scale;
      }
    }
    return result;
  }
  if(!/\.m3u8(?:\?|$)/i.test(media))return result;
  let body=(await request(media,{maxBytes:512*1024})).text;
  const variants=[];const lines=body.split(/\r?\n/);
  for(let i=0;i<lines.length;i++)if(lines[i].startsWith('#EXT-X-STREAM-INF:')){
    const url=observedUrl(lines[i+1]?.trim(),media);if(url)variants.push({url,bandwidth:Number(lines[i].match(/BANDWIDTH=(\d+)/)?.[1]||0),height:Number(lines[i].match(/RESOLUTION=\d+x(\d+)/)?.[1]||0)||null});
  }
  if(variants.length){const best=variants.sort((a,b)=>b.bandwidth-a.bandwidth)[0];body=(await request(best.url,{maxBytes:512*1024})).text;result.height=best.height;result.media_url=best.url;}
  const segments=[...body.matchAll(/^#EXTINF:([\d.]+)/gm)].map(m=>Number(m[1]));
  if(body.includes('#EXT-X-ENDLIST')&&segments.length&&segments.every(Number.isFinite))result.duration_s=Math.round(segments.reduce((a,b)=>a+b,0)*1000)/1000;
  return result;
}
