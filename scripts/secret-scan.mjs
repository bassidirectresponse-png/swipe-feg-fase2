#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { lstatSync, readFileSync, readdirSync } from "node:fs";

const ROOT = new URL("../", import.meta.url);
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const RULES = [
  ["private-key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ["google-api-key", /\bAIza[0-9A-Za-z_-]{30,}\b/g],
  ["github-token", /\b(?:ghp|gho|ghu|ghs|github_pat)_[0-9A-Za-z_]{20,}\b/g],
  ["aws-access-key", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ["slack-token", /\bxox[baprs]-[0-9A-Za-z-]{20,}\b/g],
  ["stripe-secret", /\bsk_(?:live|test)_[0-9A-Za-z]{20,}\b/g],
  ["service-role-jwt", /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/g],
  ["credential-assignment", /\b(?:api[_-]?key|secret|password|passwd|private[_-]?key|access[_-]?token)\b\s*[:=]\s*["']([^"'\n]{12,})["']/gi],
];

const ignoredPaths = path => /^(?:node_modules|\.netlify|\.git)\//.test(path) || /\.(?:png|jpe?g|gif|webp|mp4|mov|zip|pdf)$/i.test(path);
const fingerprint = value => createHash("sha256").update(value).digest("hex").slice(0, 16);
const git = args => execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 128 * 1024 * 1024 });

function isPublicSupabaseAnon(value) {
  if (!value.startsWith("eyJ")) return false;
  try {
    const payload = JSON.parse(Buffer.from(value.split(".")[1], "base64url").toString("utf8"));
    return payload && payload.role === "anon" && typeof payload.ref === "string";
  } catch { return false; }
}

function scan(text, location, scope, findings) {
  if (!text || text.includes("\0")) return;
  for (const [type, pattern] of RULES) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      const value = type === "credential-assignment" ? match[1] : match[0];
      if (!value || /^\$\{\{|^process\.env\b|^secrets\./i.test(value) || isPublicSupabaseAnon(value)) continue;
      const line = text.slice(0, match.index).split("\n").length;
      findings.push({ type, location: `${location}:${line}`, scope, fingerprint: fingerprint(value) });
    }
  }
}

function scanBuffer(value, path, scope, findings) {
  scan(value.toString("utf8"), path, scope, findings);
  if (!/\.b64$/i.test(path)) return;
  try {
    const encoded = value.toString("ascii").replace(/^data:[^,]+,/, "").replace(/\s+/g, "");
    if (!encoded || encoded.length % 4 === 1 || !/^[A-Za-z0-9+/=_-]+$/.test(encoded)) return;
    const decoded = Buffer.from(encoded, "base64");
    const printable = [...decoded].filter(byte => byte === 9 || byte === 10 || byte === 13 || (byte >= 32 && byte <= 126)).length;
    if (decoded.length && printable / decoded.length > 0.75) scan(decoded.toString("utf8"), `${path} (decoded)`, scope, findings);
  } catch {}
}

const findings = [];
function walk(directory = "") {
  const result = [];
  const base = new URL(directory ? `${directory}/` : "./", ROOT);
  for (const name of readdirSync(base)) {
    const path = directory ? `${directory}/${name}` : name;
    if (ignoredPaths(path)) continue;
    const stat = lstatSync(new URL(path, ROOT));
    if (stat.isSymbolicLink()) continue;
    if (stat.isDirectory()) result.push(...walk(path));
    else if (stat.isFile()) result.push(path);
  }
  return result;
}

const currentFiles = walk();
for (const path of currentFiles) {
  try {
    const value = readFileSync(new URL(path, ROOT));
    if (value.length <= MAX_FILE_BYTES) scanBuffer(value, path, "current", findings);
  } catch {}
}

const seenBlobs = new Set();
const commits = git(["rev-list", "--all"]).split("\n").filter(Boolean);
for (const commit of commits) {
  const entries = git(["ls-tree", "-r", commit]).split("\n").filter(Boolean);
  for (const entry of entries) {
    const parsed = entry.match(/^\d+\s+blob\s+([a-f0-9]+)\t(.+)$/);
    if (!parsed) continue;
    const [, blob, path] = parsed;
    if (seenBlobs.has(blob) || ignoredPaths(path)) continue;
    seenBlobs.add(blob);
    try {
      const size = Number(git(["cat-file", "-s", blob]).trim());
      if (!size || size > MAX_FILE_BYTES) continue;
      const value = execFileSync("git", ["cat-file", "blob", blob], { cwd: ROOT, maxBuffer: MAX_FILE_BYTES + 1024 });
      scanBuffer(value, path, `history:${commit.slice(0, 12)}`, findings);
    } catch {}
  }
}

const unique = [...new Map(findings.map(item => [`${item.type}|${item.location}|${item.scope}|${item.fingerprint}`, item])).values()];
const summary = unique.reduce((acc, item) => { acc[item.type] = (acc[item.type] || 0) + 1; return acc; }, {});
process.stdout.write(`${JSON.stringify({ ok: unique.length === 0, scanned: { currentFiles: currentFiles.length, commits: commits.length, historicalBlobs: seenBlobs.size }, summary, findings: unique }, null, 2)}\n`);
process.exitCode = unique.length ? 2 : 0;
