import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";
import http from "node:http";
import https from "node:https";
import { IntelError, normalizeUrl, LIMITS } from "./offer-intel-core.mjs";

const blocked = () => new IntelError(422, "blocked_url", "Destino remoto não permitido.");
function ipv4Number(ip) { return ip.split(".").reduce((n, octet) => n * 256 + Number(octet), 0); }
function inV4(ip, base, bits) {
  const size = 2 ** (32 - bits);
  return Math.floor(ipv4Number(ip) / size) === Math.floor(ipv4Number(base) / size);
}
export function isGlobalAddress(value) {
  const ip = String(value).replace(/^\[|\]$/g, "").toLowerCase();
  if (isIP(ip) === 4) {
    return ![
      ["0.0.0.0",8],["10.0.0.0",8],["100.64.0.0",10],["127.0.0.0",8],
      ["169.254.0.0",16],["172.16.0.0",12],["192.0.0.0",24],["192.0.2.0",24],
      ["192.88.99.0",24],["192.168.0.0",16],["198.18.0.0",15],
      ["198.51.100.0",24],["203.0.113.0",24],["224.0.0.0",3],
    ].some(([base,bits]) => inV4(ip,base,bits));
  }
  if (isIP(ip) !== 6) return false;
  let expanded = ip;
  if (ip.includes(".")) {
    const tail = ip.slice(ip.lastIndexOf(":") + 1), n = ipv4Number(tail);
    expanded = ip.slice(0, ip.lastIndexOf(":") + 1) + Math.floor(n / 65536).toString(16) + ":" + (n % 65536).toString(16);
  }
  const [left, right = ""] = expanded.split("::");
  const a = left ? left.split(":") : [], b = right ? right.split(":") : [];
  const words = expanded.includes("::") ? [...a, ...Array(8-a.length-b.length).fill("0"), ...b] : a;
  const w = words.map(x => parseInt(x,16));
  if (w.length !== 8) return false;
  if (w.slice(0,5).every(x=>x===0) && w[5]===0xffff) {
    return isGlobalAddress([w[6]>>8,w[6]&255,w[7]>>8,w[7]&255].join("."));
  }
  // Conservative global-unicast allowlist (2000::/3), excluding special-use ranges.
  if ((w[0] & 0xe000) !== 0x2000) return false;
  if (w[0]===0x2001 && (w[1] <= 0x1ff || w[1]===0xdb8)) return false;
  if (w[0]===0x2002 || (w[0]===0x3fff && w[1]<0x1000)) return false;
  return true;
}
export async function resolvePublicUrl(value, { lookup = dnsLookup } = {}) {
  const normalized = normalizeUrl(value), url = new URL(normalized.url);
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.includes("%")) throw blocked();
  const addresses = isIP(host) ? [{ address: host, family: isIP(host) }] : await lookup(host, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(x => !isGlobalAddress(x.address))) throw blocked();
  return { url, addresses };
}
/** Node http(s).request with a custom lookup pins vetted IPs while retaining Host and TLS SNI.
 * agent:false forbids connection-pool reuse; no global fetch, proxy, cookies or caller headers.
 * This transport is server Node only, not browser/Edge runtime.
 */
export function pinnedRequest(url, addresses, { signal, maxBytes }) {
  return new Promise((resolve, reject) => {
    const ip = addresses[0];
    const lookup = (_host, options, callback) => {
      if (typeof options === "function") { callback = options; options = {}; }
      if (options?.all) callback(null, [{ address: ip.address, family: ip.family }]);
      else callback(null, ip.address, ip.family);
    };
    const req = (url.protocol === "https:" ? https : http).request(url, {
      method: "GET", agent: false, lookup, signal,
      headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": "SwipeFEG-OfferIntel/1" },
    }, res => {
      const status = res.statusCode || 0;
      if ([301,302,303,307,308].includes(status)) {
        res.destroy(); resolve({ status, headers: res.headers, body: Buffer.alloc(0) }); return;
      }
      let size = 0; const chunks = [];
      if (+res.headers["content-length"] > maxBytes) { res.destroy(); reject(new IntelError(422,"response_too_large","Página excede o limite.")); return; }
      res.on("data", chunk => {
        size += chunk.length;
        if (size > maxBytes) { res.destroy(); reject(new IntelError(422,"response_too_large","Página excede o limite.")); }
        else chunks.push(chunk);
      });
      res.on("error", reject);
      res.on("end", () => resolve({ status, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on("error", reject); req.end();
  });
}
export async function fetchPublicPage(value, { lookup = dnsLookup, transport = pinnedRequest, timeoutMs = LIMITS.page_timeout_ms, maxBytes = LIMITS.html_bytes, maxRedirects = LIMITS.max_redirects } = {}) {
  const signal = AbortSignal.timeout(timeoutMs), redirects = [];
  let current = normalizeUrl(value).url;
  // Race also bounds a stalled DNS lookup; the request uses the same global signal.
  const aborted = new Promise((_, reject) => signal.addEventListener("abort", () => reject(new IntelError(502,"provider_error","Tempo limite da página.",true)), { once:true }));
  const run = async () => {
    for (let hop=0; hop<=maxRedirects; hop++) {
      signal.throwIfAborted();
      const resolved = await resolvePublicUrl(current, { lookup });
      signal.throwIfAborted();
      const res = await transport(resolved.url, resolved.addresses, { signal, maxBytes });
      if (![301,302,303,307,308].includes(res.status)) return { original_url:value, final_url:current, redirects, ...res };
      if (hop===maxRedirects || !res.headers.location) throw new IntelError(422,"invalid_url","Redirecionamentos inválidos ou excessivos.");
      const next = new URL(res.headers.location, current).href;
      redirects.push({ from:current, to:next, status:res.status }); current = next;
    }
  };
  return Promise.race([run(), aborted]);
}
