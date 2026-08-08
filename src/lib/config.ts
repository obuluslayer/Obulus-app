const env = import.meta.env as Record<string, string | undefined>;

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

/// Chain ids that resolve to a public viem chain (with a default RPC) — keep in sync with
/// activeChain in chains.ts (robinhood, robinhoodTestnet).
const KNOWN_CHAIN_IDS = [4663, 46630];

/// Env problems collected at module eval instead of thrown: main.tsx renders them as a full-page
/// configuration screen, so a bad deployment never white-screens the cockpit.
export const configErrors: string[] = [];

function readAddress(name: string): `0x${string}` | null {
  const value = env[name];
  if (!value) return null;
  if (!ADDRESS_RE.test(value)) {
    configErrors.push(`${name} must be a 0x-prefixed 20-byte address, got "${value}"`);
    return null;
  }
  return value as `0x${string}`;
}

function readChainId(): number {
  const raw = env.VITE_CHAIN_ID;
  // Default to PRODUCTION (Robinhood Chain mainnet). Point a preview build at testnet with
  // VITE_CHAIN_ID=46630, or at a local anvil with 31337.
  if (!raw) return 4663;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    configErrors.push(`VITE_CHAIN_ID must be a positive integer, got "${raw}"`);
    return 4663; // inert — the config screen renders instead of the app
  }
  return id;
}

function readApiUrl(): string {
  const raw = env.VITE_API_URL;
  if (!raw) {
    // Dev keeps the local Hub default; a production build falls back to the canonical Hub origin
    // (override via VITE_API_URL for a different deployment).
    return import.meta.env.PROD ? "https://api.obuluslayer.xyz" : "http://localhost:8787";
  }
  return raw.replace(/\/+$/, "");
}

/// Baked deployed addresses (chainId → contracts) so a Cloudflare build needs no env for them.
/// Filled from contracts/deployments/<chainId>.json after the matching forge script.
/// `token` is the settlement token: USDG on mainnet, MockUSDC on testnet.
const BAKED_ADDRESSES: Record<number, { escrow: `0x${string}`; token: `0x${string}` }> = {
  // PRODUCTION — Robinhood Chain mainnet. Settles in USDG; the escrow exposes it as usdg().
  4663: {
    escrow: "0x4B488fFbCAafC1aA6BdC389f8f6f36179619E6E1",
    token: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
  },
  46630: {
    escrow: "0xb48F2906A63af20CEf186071593C629112A45649",
    token: "0x64d19B5603C8435892494a1aD61Aa9e9F8FBef38",
  },
};

const chainId = readChainId();

export const appConfig = {
  /** Hub base URL, no trailing slash. */
  apiUrl: readApiUrl(),
  chainId,
  escrowAddress: readAddress("VITE_ESCROW_ADDRESS") ?? BAKED_ADDRESSES[chainId]?.escrow ?? null,
  /// Settlement token. VITE_USDG_ADDRESS is the current name; VITE_USDC_ADDRESS stays accepted so an
  /// existing Cloudflare/testnet configuration keeps working through the rename.
  usdgAddress:
    readAddress("VITE_USDG_ADDRESS") ??
    readAddress("VITE_USDC_ADDRESS") ??
    BAKED_ADDRESSES[chainId]?.token ??
    null,
  rpcUrl: env.VITE_RPC_URL || undefined,
  walletConnectProjectId: env.VITE_WALLETCONNECT_PROJECT_ID || undefined,
  defaultArbiter: readAddress("VITE_DEFAULT_ARBITER"),
  /** Public source: the Obulus repositories (contracts, SDK, cockpit, docs). */
  githubUrl: env.VITE_GITHUB_URL || "https://github.com/obuluslayer?tab=repositories",
  /** Marketing site. */
  landingUrl: env.VITE_LANDING_URL || "https://obuluslayer.xyz",
  /** Documentation site (VitePress). */
  docsUrl: env.VITE_DOCS_URL || "https://gitbook.obuluslayer.xyz",
  /** Project account on X. */
  xUrl: env.VITE_X_URL || "https://x.com/obuluslayer",
  /** Community channel on Telegram. */
  telegramUrl: env.VITE_TELEGRAM_URL || "https://t.me/obuluslayer",
} as const;

// A production bundle must never silently point at localhost: for an unknown chain id with no
// explicit RPC, chains.ts would fall back to the 127.0.0.1 anvil endpoint.
if (import.meta.env.PROD && !KNOWN_CHAIN_IDS.includes(appConfig.chainId) && !appConfig.rpcUrl) {
  configErrors.push(`VITE_RPC_URL must be set: chain id ${appConfig.chainId} has no public default RPC.`);
}

/** True once the contract addresses are wired in — on-chain actions stay disabled until then. */
export const onchainConfigured = appConfig.escrowAddress !== null && appConfig.usdgAddress !== null;
