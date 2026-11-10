import test from 'node:test';
import assert from 'node:assert/strict';
import { repairMedia, mediaComplete, WEEKLY_MEDIA_LIMITS } from '../lib/offer-intel-weekly-recovery.mjs';
const row = {offer_id:'offer',ad_archive_id:'123',display_format:'video',media:{archived:true,thumb_url:'https://stored.example/thumb.jpg',video_error:true,source_video_urls:['https://video.fbcdn.net/fresh-video.mp4'],observed_at:'2026-10-28T12:00:00Z'}};
const args = {date:'2026-10-28',generation:'repair1',now:'2026-11-10T12:00:00Z'};
test('a previously failed video is retried without downloading its successful thumbnail again',async()=>{
  const calls=[];const archive=async input=>{calls.push(input);return{url:'https://stored.example/video.mp4'};};archive.verify=async()=>true;
  const media=await repairMedia({...args,row,archive});
  assert.deepEqual(calls.map(x=>x.kind),['video']);assert.equal(media.thumb_url,row.media.thumb_url);
  assert.equal(media.observed_at,row.media.observed_at);assert.equal(mediaComplete({...row,media}),true);
});
test('reuses a verified stored video from the other report without re-uploading it',async()=>{
  const archive=async()=>{throw new Error('no download expected');};archive.verify=async()=>true;
  const media=await repairMedia({...args,row,archive,reusable:[{...row,media:{archived:true,video_url:'https://stored.example/other.mp4'}}]});
  assert.equal(media.video_url,'https://stored.example/other.mp4');assert.equal(media.video_error,false);
});
test('missing stored objects and expired URLs fall back to fresh candidates of the same ad',async()=>{
  const archive=async({url})=>{if(url.includes('expired'))throw new Error('403');return{url:'https://stored.example/fixed.jpg'};};archive.verify=async()=>false;
  const input={...row,display_format:'image',media:{archived:true,thumb_url:'https://stored.example/deleted.jpg',source_thumb_url:'https://scontent.fbcdn.net/expired-image.jpg'}};
  const media=await repairMedia({...args,row:input,archive,reusable:[{...input,media:{source_thumb_url:'https://scontent.fbcdn.net/fresh-image.jpg'}}]});
  assert.equal(media.thumb_url,'https://stored.example/fixed.jpg');assert.equal(media.error,false);
});
test('same copy with a different media asset cannot donate a video',async()=>{
  const archive=async()=>{throw new Error('unavailable');};archive.verify=async()=>true;
  const media=await repairMedia({...args,row,archive,reusable:[{...row,ad_archive_id:'999',match_keys:['t:same'],media:{archived:true,video_url:'https://stored.example/wrong.mp4'}}]});
  assert.equal(media.video_url,null);assert.equal(media.video_error,true);assert.equal(mediaComplete({...row,media}),false);
});
test('a row with no media remains incomplete, rather than becoming archived with null assets',async()=>{
  const input={...row,display_format:null,media:{}};
  const media=await repairMedia({...args,row:input,archive:async()=>{throw new Error('no source');}});
  assert.equal(media.archived,false);assert.equal(mediaComplete({...input,media}),false);
});
test('archive accepts realistic HD creatives within a bounded memory limit',()=>{
  assert.ok(WEEKLY_MEDIA_LIMITS.video >= 45*1024*1024);assert.ok(WEEKLY_MEDIA_LIMITS.video <= 150*1024*1024);
});
test('a temporary storage probe failure preserves the existing file reference and remains explicitly incomplete',async()=>{
  const archive=async()=>{throw new Error('should keep stored file');};archive.verify=async()=>{throw new Error('timeout');};
  const input={...row,display_format:'image',media:{archived:true,thumb_url:'https://stored.example/keep.jpg'}};
  const media=await repairMedia({...args,row:input,archive});
  assert.equal(media.thumb_url,input.media.thumb_url);assert.equal(media.verification_error,true);assert.equal(mediaComplete({...input,media}),false);
});
