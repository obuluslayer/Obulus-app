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
  if (!raw) return 46630;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    configErrors.push(`VITE_CHAIN_ID must be a positive integer, got "${raw}"`);
    return 46630; // inert — the config screen renders instead of the app
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

/// Baked TESTNET fallbacks (chainId → deployed addresses) so a Cloudflare build needs no env for
/// them. Fill from contracts/deployments/46630.json after `forge script DeployRobinhoodTestnet`.
/// TESTNET ONLY — never bake mainnet addresses without a boot guard (audit finding HIGH-2).
const BAKED_ADDRESSES: Record<number, { escrow: `0x${string}`; usdc: `0x${string}` }> = {
  46630: {
    escrow: "0xb48F2906A63af20CEf186071593C629112A45649",
    usdc: "0x64d19B5603C8435892494a1aD61Aa9e9F8FBef38",
  },
};

const chainId = readChainId();

export const appConfig = {
  /** Hub base URL, no trailing slash. */
  apiUrl: readApiUrl(),
  chainId,
  escrowAddress: readAddress("VITE_ESCROW_ADDRESS") ?? BAKED_ADDRESSES[chainId]?.escrow ?? null,
  usdcAddress: readAddress("VITE_USDC_ADDRESS") ?? BAKED_ADDRESSES[chainId]?.usdc ?? null,
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
} as const;

// A production bundle must never silently point at localhost: for an unknown chain id with no
// explicit RPC, chains.ts would fall back to the 127.0.0.1 anvil endpoint.
if (import.meta.env.PROD && !KNOWN_CHAIN_IDS.includes(appConfig.chainId) && !appConfig.rpcUrl) {
  configErrors.push(`VITE_RPC_URL must be set: chain id ${appConfig.chainId} has no public default RPC.`);
}

/** True once the contract addresses are wired in — on-chain actions stay disabled until then. */
export const onchainConfigured = appConfig.escrowAddress !== null && appConfig.usdcAddress !== null;
