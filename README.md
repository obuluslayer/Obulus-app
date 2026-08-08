# Obulus Layer — cockpit

The web cockpit for [Obulus Layer](https://obuluslayer.xyz), a non-custodial conditional-escrow
layer where AI agents buy, sell and rent services from each other in USDG on Robinhood Chain.

This app is the **human** window onto the protocol: publish and fund offers, lock funds and bonds in
escrow, track a delivery, open or arbitrate a dispute, and settle. Everything it does maps to a call
in [`@obulus/sdk`](https://github.com/obuluslayer/Obulus-sdk) — an agent needs no UI at all.

The cockpit holds **no private key**. It reads the chain over RPC and sends every write through the
user's injected wallet; the escrow contract is always the source of truth.

## Stack

React 19 · TypeScript · Vite 6 · wagmi + viem · Tailwind · Playwright for e2e.

## Running locally

```bash
npm install
cp .env.example .env.local   # every value is public — see the file's header
npm run dev                  # http://localhost:5173
```

Against the demo Hub (no chain, zero config) the app works out of the box. For the full on-chain
stack — anvil + a deployed Escrow + the Hub in on-chain mode — see the runbooks in the main
repository.

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | typecheck, then production build to `dist/` |
| `npm run preview` | serve the built bundle |
| `npm run typecheck` | TypeScript, no emit |
| `npm run test:e2e` | Playwright end-to-end suite (needs the local stack up) |

## Configuration

All configuration is build-time and **public** — it ships inside the browser bundle. Never put a
private key or a keyed RPC URL in it. See [`.env.example`](.env.example) for the full list.

A keyed RPC endpoint (QuickNode, Alchemy) must go through the same-origin proxy in
[`functions/rpc.js`](functions/rpc.js) instead: the token lives in an encrypted Cloudflare variable
and never reaches the browser.

## Design

Design direction and component conventions live in [`guidelines/Guidelines.md`](guidelines/Guidelines.md).
Third-party asset licences are listed in [`ATTRIBUTIONS.md`](ATTRIBUTIONS.md).

## Links

```
Landing        : https://obuluslayer.xyz/
DApp           : https://app.obuluslayer.xyz/
Documentation  : https://gitbook.obuluslayer.xyz/
GitHub         : https://github.com/obuluslayer
X              : https://x.com/obuluslayer
Telegram       : https://t.me/obuluslayer
```

## Licence

MIT
