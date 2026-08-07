// Cloudflare Pages Function — same-origin JSON-RPC proxy so a KEYED RPC URL (QuickNode/Alchemy…)
// NEVER ships in the browser bundle. The browser only ever calls https://app.<domain>/rpc; the real
// keyed endpoint lives in an ENCRYPTED Cloudflare variable and is added server-side. Nothing to sniff.
//
// Why the proxy (not QuickNode's referrer allowlist): an allowlist leaves the token VISIBLE in the
// browser (it only makes a stolen token unusable elsewhere) and does not cover WSS. The proxy hides
// the token entirely, so neither limitation applies. The app uses HTTP RPC only (viem http()), so no
// WSS is needed in the browser.
//
// Setup (Cloudflare Pages → obulus-app → Settings):
//   1. Environment variables → add RPC_UPSTREAM (check "Encrypt") = the full keyed HTTP endpoint,
//      e.g. https://orbital-misty-pool.robinhood-testnet.quiknode.pro/<token>/
//   2. Build var VITE_RPC_URL = https://app.obuluslayer.xyz/rpc  → redeploy.
// Without RPC_UPSTREAM the route answers 503 and the app's baked public-RPC default keeps working.
//
// Do NOT also set a QuickNode referrer allowlist: this proxy calls QuickNode server-to-server with
// no browser Referer, so an allowlist would block it. The hidden token + the origin check below are
// the protection.

const ALLOWED_ORIGIN = "https://app.obuluslayer.xyz";
const ALLOWED_PREVIEW_SUFFIX = ".obulus-app.pages.dev"; // Cloudflare Pages preview deploys

const json = (body, status) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

export async function onRequestPost({ request, env }) {
  // Origin allowlist (defense-in-depth so nobody drives traffic through your /rpc from another site).
  // A cross-origin browser request always carries Origin; same-origin fetches may omit it → allowed.
  const origin = request.headers.get("Origin");
  if (origin) {
    let host = "";
    try {
      host = new URL(origin).host;
    } catch {
      host = "";
    }
    const allowed = origin === ALLOWED_ORIGIN || host.endsWith(ALLOWED_PREVIEW_SUFFIX);
    if (!allowed) return json({ error: "forbidden origin" }, 403);
  }

  if (!env.RPC_UPSTREAM) return json({ error: "RPC_UPSTREAM not configured" }, 503);

  const upstream = await fetch(env.RPC_UPSTREAM, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: request.body,
  });
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { "content-type": "application/json" },
  });
}
