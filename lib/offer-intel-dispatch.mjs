import { createHmac, timingSafeEqual } from "node:crypto";
import { IntelError, UUID } from "./offer-intel-core.mjs";
export function signedDispatch(jobId, nonce, secret, now = Date.now()) {
  if (!secret) throw new IntelError(503,"credentials_missing","Assinatura interna não configurada.");
  const body = JSON.stringify({job_id:jobId}), timestamp = String(Math.floor(now/1000));
  const signature = createHmac("sha256",secret).update(timestamp+"\n"+nonce+"\n"+body).digest("hex");
  return {body,headers:{"Content-Type":"application/json","x-intel-timestamp":timestamp,"x-intel-nonce":nonce,"x-intel-signature":signature}};
}
export function verifyDispatch(raw, headers, secret, now = Date.now()) {
  const timestamp=headers.get("x-intel-timestamp")||"",nonce=headers.get("x-intel-nonce")||"",signature=headers.get("x-intel-signature")||"";
  if(!secret||!/^\d{10,12}$/.test(timestamp)||Math.abs(now/1000-Number(timestamp))>300||!UUID.test(nonce)||!/^[a-f0-9]{64}$/.test(signature)) return null;
  const expected=createHmac("sha256",secret).update(timestamp+"\n"+nonce+"\n"+raw).digest();
  if(!timingSafeEqual(expected,Buffer.from(signature,"hex"))) return null;
  try {
    const body=JSON.parse(raw);
    if(Object.keys(body).length!==1||typeof body.job_id!=="string"||!UUID.test(body.job_id)) return null;
    return {job_id:body.job_id.toLowerCase(),nonce};
  } catch {return null;}
}
