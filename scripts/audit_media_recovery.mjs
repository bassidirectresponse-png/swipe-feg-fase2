import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(new URL("../", import.meta.url).pathname);
const html = await fs.readFile(path.join(root, "index.html"), "utf8");
const supabaseUrl = process.env.SUPABASE_URL || html.match(/const DEFAULT_URL="([^"]+)"/)?.[1];
const anonKey = process.env.SUPABASE_ANON_KEY || html.match(/const DEFAULT_KEY="([^"]+)"/)?.[1];
const email = process.env.SUPABASE_BOT_EMAIL;
const password = process.env.SUPABASE_BOT_PASSWORD;

if (!supabaseUrl || !anonKey) throw new Error("Configuração do Supabase não encontrada");
if (!email || !password) throw new Error("Defina SUPABASE_BOT_EMAIL e SUPABASE_BOT_PASSWORD");

const login = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: anonKey, "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
if (!login.ok) throw new Error(`Login falhou: HTTP ${login.status}`);
const accessToken = (await login.json()).access_token;
const headers = { apikey: anonKey, Authorization: `Bearer ${accessToken}` };

const rows = [];
for (let offset = 0; ; offset += 500) {
  const response = await fetch(`${supabaseUrl}/rest/v1/offers?select=id,created_at,data&order=created_at.asc&offset=${offset}&limit=500`, { headers });
  if (!response.ok) throw new Error(`Leitura falhou: HTTP ${response.status} ${(await response.text()).slice(0, 180)}`);
  const page = await response.json();
  rows.push(...page);
  if (page.length < 500) break;
}

async function collectFiles(directory, output = []) {
  let entries = [];
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch {
    return output;
  }
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) await collectFiles(absolute, output);
    else output.push(absolute);
  }
  return output;
}

const localFiles = [
  ...(await collectFiles(path.join(root, "assets"))),
  ...(await collectFiles(path.join(root, ".tmp"))),
];
const byBasename = new Map();
for (const file of localFiles) {
  const key = path.basename(file).toLowerCase();
  const list = byBasename.get(key) || [];
  list.push(path.relative(root, file));
  byBasename.set(key, list);
}

const storagePattern = /^https:\/\/([a-z0-9-]+)\.supabase\.co\/storage\/v1\/object\/public\/criativos\/(.+)$/i;
const mediaExtension = /\.(?:avif|gif|jpe?g|m4a|mov|mp3|mp4|mpeg|png|svg|webm|webp|wav)(?:\?|#|$)/i;
const references = [];

function walk(value, row, jsonPath = "data") {
  if (typeof value === "string") {
    const match = value.match(storagePattern);
    if (match) {
      const objectPath = decodeURIComponent(match[2].split(/[?#]/)[0]);
      const basename = path.basename(objectPath).toLowerCase();
      references.push({
        rowId: row.id,
        kind: row.data?.kind || "oferta",
        name: row.data?.nomeOferta || row.data?.nome || row.data?.titulo || "",
        jsonPath,
        url: value,
        projectRef: match[1],
        objectPath,
        localCandidates: byBasename.get(basename) || [],
        source: {
          nomeOriginal: row.data?.nomeOriginal || row.data?.nomeArquivo || "",
          sourceFile: row.data?.sourceFile || "",
          linkAnuncio: row.data?.linkAnuncio || row.data?.url || "",
          sourceOfferId: row.data?.sourceOfferId || "",
          sourceOfferName: row.data?.sourceOfferName || row.data?.oferta || "",
          nicho: row.data?.nicho || "",
          plataforma: row.data?.plataforma || "",
          duracao: row.data?.duracao || row.data?.duration || row.data?.durationSeconds || "",
          tamanho: row.data?.tamanho || row.data?.fileSize || row.data?.size || "",
          importBatch: row.data?.importBatch || row.data?.importacao || "",
          dataKeys: Object.keys(row.data || {}).sort(),
        },
      });
    } else if ((value.startsWith("/assets/") || value.startsWith("assets/")) && mediaExtension.test(value)) {
      references.push({
        rowId: row.id,
        kind: row.data?.kind || "oferta",
        name: row.data?.nomeOferta || row.data?.nome || row.data?.titulo || "",
        jsonPath,
        url: value,
        projectRef: "local-assets",
        objectPath: value.replace(/^\//, ""),
        localCandidates: [value.replace(/^\//, "")],
      });
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, row, `${jsonPath}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) walk(child, row, `${jsonPath}.${key}`);
  }
}

for (const row of rows) walk(row.data, row);

const storageReferences = references.filter(item => item.projectRef !== "local-assets");
const localReferences = references.filter(item => item.projectRef === "local-assets");
const uniqueStorageObjects = new Map();
for (const item of storageReferences) {
  const key = `${item.projectRef}/${item.objectPath}`;
  const current = uniqueStorageObjects.get(key) || { ...item, occurrences: 0 };
  current.occurrences += 1;
  uniqueStorageObjects.set(key, current);
}

const unique = [...uniqueStorageObjects.values()];
const summary = {
  auditedAt: new Date().toISOString(),
  rows: rows.length,
  references: references.length,
  storageReferences: storageReferences.length,
  localAssetReferences: localReferences.length,
  uniqueStorageObjects: unique.length,
  uniqueStorageObjectsWithLocalCandidate: unique.filter(item => item.localCandidates.length > 0).length,
  uniqueStorageObjectsWithoutLocalCandidate: unique.filter(item => item.localCandidates.length === 0).length,
  projectRefs: Object.fromEntries([...new Set(storageReferences.map(item => item.projectRef))].sort().map(ref => [ref, storageReferences.filter(item => item.projectRef === ref).length])),
  kinds: Object.fromEntries([...new Set(references.map(item => item.kind))].sort().map(kind => [kind, references.filter(item => item.kind === kind).length])),
};

const report = { summary, uniqueStorageObjects: unique, references };
await fs.mkdir(path.join(root, ".tmp"), { recursive: true });
await fs.writeFile(path.join(root, ".tmp", "media-recovery-audit.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(summary, null, 2));
