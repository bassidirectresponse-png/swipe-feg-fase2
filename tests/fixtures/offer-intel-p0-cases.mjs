// FAKE QA corpus; never resolve these hosts or call a provider.
// Consumed later by backend adapters. URL/DNS cases are consumed by offer-intel-qa-b2.test.mjs; remaining transport expectations are not proof of real sockets.
export const INVALID_ID_CASES = Object.freeze([
  { name: "missing", value: undefined }, { name: "null", value: null },
  { name: "empty", value: "" }, { name: "slug", value: "joymode" },
  { name: "number", value: 123 }, { name: "object", value: { id: "x" } },
  { name: "array", value: ["11111111-1111-4111-8111-111111111111"] },
  { name: "path traversal", value: "../offers" }, { name: "prototype name", value: "constructor" },
  { name: "malformed UUID", value: "11111111-1111-4111-8111-11111111111z" },
  { name: "SQL punctuation", value: "' OR 1=1--" }, { name: "oversize", value: "a".repeat(4096) }
].map(c => ({ ...c, expectation: "reject before storage/provider", providerCalls: 0 })));

export const OFFER_REF_CASES = Object.freeze([
  { name: "real offer UUID missing from storage", kind: "offer", exists: false, expectedStatus: 422, expectedCode: "offer_not_found" },
  { name: "browser-only draft", kind: "admin_draft", exists: false, expectedStatus: 422, expectedCode: "offer_not_found" },
  { name: "TikTok row is not an offer", kind: "offer", exists: true, dataKind: "tiktok", expectation: "reject disallowed kind" },
  { name: "two homonyms retain distinct UUIDs", expectation: "jobs and discoveries use the selected UUID, never label/slug" },
  { name: "same UUID in offer and draft", expectation: "scope_key includes ref kind; no scope cross-read" },
  { name: "draft resolved from Blob", expectation: "snapshot + hash from server Blob, never browser payload" }
]);

const urls = [
  ["scheme file", "file:///etc/passwd", "blocked_url"],
  ["scheme javascript", "javascript:alert(1)", "blocked_url"],
  ["scheme ftp", "ftp://example.com/a", "blocked_url"],
  ["malformed", "https://", "invalid_url"],
  ["loopback", "http://127.0.0.1/", "blocked_url"],
  ["loopback shorthand", "http://127.1/", "blocked_url"],
  ["loopback decimal", "http://2130706433/", "blocked_url"],
  ["loopback hex", "http://0x7f000001/", "blocked_url"],
  ["unspecified", "http://0.0.0.0/", "blocked_url"],
  ["private 10", "http://10.0.0.1/", "blocked_url"],
  ["private 172", "http://172.16.0.1/", "blocked_url"],
  ["private 192", "http://192.168.0.1/", "blocked_url"],
  ["metadata link local", "http://169.254.169.254/latest/meta-data/", "blocked_url"],
  ["carrier NAT", "http://100.64.0.1/", "blocked_url"],
  ["multicast", "http://224.0.0.1/", "blocked_url"],
  ["reserved", "http://240.0.0.1/", "blocked_url"],
  ["IPv6 loopback", "http://[::1]/", "blocked_url"],
  ["IPv6 unspecified", "http://[::]/", "blocked_url"],
  ["IPv6 unique local", "http://[fc00::1]/", "blocked_url"],
  ["IPv6 link local", "http://[fe80::1]/", "blocked_url"],
  ["IPv6 multicast", "http://[ff02::1]/", "blocked_url"],
  ["IPv4 mapped decimal", "http://[::ffff:127.0.0.1]/", "blocked_url"],
  ["IPv4 mapped hex", "http://[::ffff:7f00:1]/", "blocked_url"],
  ["port forbidden", "https://example.com:8443/", "blocked_url"]
];
export const SSRF_URL_CASES = Object.freeze(urls.map(([name, url, code]) => ({
  name, url, expectedStatus: 422, expectedCode: code, forbiddenConnections: 0
})));
export const SSRF_TRANSPORT_CASES = Object.freeze([
  { name: "DNS private A", host: "private.example", answers: ["10.1.2.3"], expectation: "reject before connect" },
  { name: "DNS private AAAA", host: "private6.example", answers: ["::ffff:127.0.0.1"], expectation: "reject before connect" },
  { name: "mixed DNS answers", host: "mixed.example", answers: ["8.8.8.8", "10.1.2.3"], expectation: "never connect to private answer" },
  { name: "DNS rebinding", answers: [["8.8.8.8"], ["127.0.0.1"]], expectation: "connection pinned to validated address, no unvalidated second lookup" },
  { name: "redirect to private", redirects: ["https://public.example/", "http://169.254.169.254/"], expectation: "revalidate and reject before second connect" },
  { name: "redirect to private DNS", redirects: ["https://public.example/", "https://private.example/"], answers: ["10.1.2.3"], expectation: "resolve and reject new host" },
  { name: "redirect changes port", redirects: ["https://public.example/", "https://public.example:8443/"], expectation: "reject new port" },
  { name: "redirect limit", redirectCount: 6, expectation: "follow no more than 5 redirects" },
  { name: "credential forwarding", headers: { Cookie: "FAKE", Authorization: "Bearer FAKE" }, expectation: "neither Cookie nor Authorization sent to any target" },
  { name: "bounded body", bytes: 2 * 1024 * 1024 + 1, expectation: "stop above 2 MiB, including decoded streaming response" },
  { name: "timeout", milliseconds: 20001, expectation: "abort page request at 20 seconds" },
  { name: "allowed public control", answers: ["8.8.8.8"], expectation: "allow FAKE connection on http:80 or https:443 without external network" }
]);

export const PERSISTENCE_CASES = Object.freeze([
  { name: "idempotent repeat", expectation: "same job_id for same key/payload; no extra provider run" },
  { name: "key conflict", expectation: "409 for same key and different payload" },
  { name: "active scope", expectation: "reuse active job before quota/cooldown checks" },
  { name: "concurrent creation", expectation: "one active job/provider reservation per scope" },
  { name: "reprocessing discoveries", expectation: "stable discovery identity per scope; snapshots preserve investigation history" },
  { name: "review CAS", expectation: "stale expected_version => 409; no lost update" },
  { name: "legacy preservation", expectation: "deep equality of offers.data and legacy Blobs before/after success, partial failure and review" },
  { name: "review does not create offers", expectation: "confirm/ignore/review writes only offer_intel_* tables" },
  { name: "admin gate", expectation: "anonymous 401; ordinary user 403; no storage/provider call" }
]);
