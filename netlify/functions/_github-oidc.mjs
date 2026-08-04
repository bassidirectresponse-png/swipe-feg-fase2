import { createPublicKey, verify as verifySignature } from "node:crypto";

const ISSUER = "https://token.actions.githubusercontent.com";
const AUDIENCE = "swipe-feg-netlify-automation";
const REPOSITORY = "bassidirectresponse-png/swipe-feg-fase2";
const ALLOWED_WORKFLOWS = new Set([
  "transcrever-videos.yml",
  "ads-ativos.yml",
]);

let cachedJwks = null;
let cachedJwksAt = 0;

function decodePart(value) {
  return JSON.parse(Buffer.from(String(value || ""), "base64url").toString("utf8"));
}

async function githubJwks() {
  if (cachedJwks && Date.now() - cachedJwksAt < 60 * 60_000) return cachedJwks;
  const response = await fetch(`${ISSUER}/.well-known/jwks`, {
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`chaves OIDC indisponíveis (HTTP ${response.status})`);
  const payload = await response.json();
  cachedJwks = Array.isArray(payload?.keys) ? payload.keys : [];
  cachedJwksAt = Date.now();
  return cachedJwks;
}

function includesAudience(audience) {
  return Array.isArray(audience) ? audience.includes(AUDIENCE) : audience === AUDIENCE;
}

export async function verifyGithubAutomationToken(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) throw new Error("token OIDC inválido");
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodePart(encodedHeader);
  const claims = decodePart(encodedPayload);
  if (header.alg !== "RS256" || !header.kid) throw new Error("algoritmo OIDC não permitido");

  const key = (await githubJwks()).find(item => item.kid === header.kid);
  if (!key) throw new Error("chave OIDC não reconhecida");
  const valid = verifySignature(
    "RSA-SHA256",
    Buffer.from(`${encodedHeader}.${encodedPayload}`),
    createPublicKey({ key, format: "jwk" }),
    Buffer.from(encodedSignature, "base64url"),
  );
  if (!valid) throw new Error("assinatura OIDC inválida");

  const now = Math.floor(Date.now() / 1000);
  if (claims.iss !== ISSUER || !includesAudience(claims.aud)) throw new Error("origem OIDC não permitida");
  if (!claims.exp || claims.exp < now - 30 || Number(claims.nbf || 0) > now + 30) throw new Error("token OIDC expirado");
  if (claims.repository !== REPOSITORY || claims.ref !== "refs/heads/main") throw new Error("repositório OIDC não permitido");

  const workflowRef = String(claims.workflow_ref || "");
  const match = workflowRef.match(/\.github\/workflows\/([^@/]+)@refs\/heads\/main$/);
  if (!workflowRef.startsWith(`${REPOSITORY}/`) || !match || !ALLOWED_WORKFLOWS.has(match[1])) {
    throw new Error("workflow OIDC não permitido");
  }
  return claims;
}

export function githubOidcAudience() {
  return AUDIENCE;
}
