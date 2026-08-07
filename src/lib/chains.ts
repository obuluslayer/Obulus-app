import { defineChain, type Chain } from "viem";
import { robinhood, robinhoodTestnet } from "viem/chains";
import { appConfig } from "./config";

function localAnvil(id: number, rpc: string): Chain {
  return defineChain({
    id,
    name: "Local Anvil",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [rpc] } },
    testnet: true,
  });
}

/** The single chain this deployment targets, selected by VITE_CHAIN_ID. */
export const activeChain: Chain =
  appConfig.chainId === robinhood.id
    ? robinhood
    : appConfig.chainId === robinhoodTestnet.id
      ? robinhoodTestnet
      : // prod guard for this localhost fallback lives in config.ts (configErrors)
        localAnvil(appConfig.chainId, appConfig.rpcUrl ?? "http://127.0.0.1:8545");

/// Default public endpoint for the testnet (overridable via VITE_RPC_URL); other chains keep viem's default.
const TESTNET_PUBLIC_RPC = "https://rpc.testnet.chain.robinhood.com";

export const rpcUrl: string =
  appConfig.rpcUrl ?? (activeChain.id === robinhoodTestnet.id ? TESTNET_PUBLIC_RPC : activeChain.rpcUrls.default.http[0]);

export const explorerUrl: string | null = activeChain.blockExplorers?.default?.url ?? null;

export function explorerTxUrl(hash: string): string | null {
  return explorerUrl ? `${explorerUrl}/tx/${hash}` : null;
}

export function explorerAddressUrl(address: string): string | null {
  return explorerUrl ? `${explorerUrl}/address/${address}` : null;
}
