// Headless EIP-6963 wallet for Playwright: an in-page EIP-1193 provider announced like a real
// extension. Reads proxy straight to anvil; account-bound calls (typed-data signing, transaction
// sending) are executed in Node with a viem local account — the private key NEVER enters the page
// as signing capability beyond these exposed callbacks, and never enters the app bundle at all.
import type { Browser, Page } from "@playwright/test";
import {
  createPublicClient,
  createWalletClient,
  http,
  type Hex,
  type TypedDataDomain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

export const RPC_URL = process.env.E2E_RPC_URL ?? "http://127.0.0.1:8545";
export const CHAIN_ID = Number(process.env.E2E_CHAIN_ID ?? 31337);

const chain = {
  id: CHAIN_ID,
  name: "anvil-e2e",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
} as const;

type TypedDataPayload = {
  domain: TypedDataDomain;
  types: Record<string, { name: string; type: string }[]>;
  primaryType: string;
  message: Record<string, unknown>;
};

/** eth_signTypedData_v4 serializes uints as strings — revive them to bigint for viem. */
function reviveTypedData(td: TypedDataPayload): TypedDataPayload {
  const fields = td.types[td.primaryType] ?? [];
  const message: Record<string, unknown> = { ...td.message };
  for (const f of fields) {
    if (/^u?int/.test(f.type) && typeof message[f.name] === "string") {
      message[f.name] = BigInt(message[f.name] as string);
    }
  }
  return { ...td, message };
}

async function rawRpc(method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const body = (await res.json()) as { result?: unknown; error?: { code: number; message: string } };
  if (body.error) throw new Error(`${body.error.message} (rpc ${method})`);
  return body.result ?? null;
}

export interface WalletPage {
  page: Page;
  address: Hex;
  close: () => Promise<void>;
}

/** New browser context with the named wallet injected, landed on `path`. */
export async function newWalletPage(
  browser: Browser,
  privateKey: Hex,
  walletName: string,
  path = "/",
): Promise<WalletPage> {
  const account = privateKeyToAccount(privateKey);
  const walletClient = createWalletClient({ account, chain, transport: http(RPC_URL) });
  const publicClient = createPublicClient({ chain, transport: http(RPC_URL) });

  const context = await browser.newContext();
  const page = await context.newPage();

  await page.exposeFunction("__e2eRpc", async (method: string, paramsJson: string) => {
    return await rawRpc(method, JSON.parse(paramsJson) as unknown[]);
  });

  await page.exposeFunction("__e2eSignTypedData", async (typedDataJson: string) => {
    const td = reviveTypedData(JSON.parse(typedDataJson) as TypedDataPayload);
    return await account.signTypedData(td as never);
  });

  await page.exposeFunction("__e2eSendTransaction", async (txJson: string) => {
    const tx = JSON.parse(txJson) as { to?: Hex; data?: Hex; value?: Hex };
    const hash = await walletClient.sendTransaction({
      to: tx.to,
      data: tx.data,
      value: tx.value ? BigInt(tx.value) : undefined,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    return hash;
  });

  await page.addInitScript(
    ({ address, chainIdHex, name }) => {
      type Listener = (...args: unknown[]) => void;
      const listeners: Record<string, Listener[]> = {};
      const w = window as unknown as {
        __e2eRpc: (m: string, p: string) => Promise<unknown>;
        __e2eSignTypedData: (t: string) => Promise<string>;
        __e2eSendTransaction: (t: string) => Promise<string>;
      };

      const provider = {
        isE2EWallet: true,
        request: async ({ method, params }: { method: string; params?: unknown[] }) => {
          switch (method) {
            case "eth_requestAccounts":
            case "eth_accounts":
              return [address];
            case "eth_chainId":
              return chainIdHex;
            case "wallet_switchEthereumChain":
            case "wallet_addEthereumChain":
              return null;
            case "eth_signTypedData_v4":
              return await w.__e2eSignTypedData(String((params as unknown[])[1]));
            case "eth_sendTransaction":
              return await w.__e2eSendTransaction(JSON.stringify((params as unknown[])[0]));
            default:
              return await w.__e2eRpc(method, JSON.stringify(params ?? []));
          }
        },
        on: (event: string, fn: Listener) => {
          (listeners[event] ??= []).push(fn);
        },
        removeListener: (event: string, fn: Listener) => {
          listeners[event] = (listeners[event] ?? []).filter((f) => f !== fn);
        },
      };

      const info = Object.freeze({
        uuid: crypto.randomUUID(),
        name,
        icon:
          "data:image/svg+xml;base64," +
          btoa('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" rx="8" fill="#CDFF00"/></svg>'),
        rdns: "dev.obulus.e2e",
      });
      const announce = () =>
        window.dispatchEvent(
          new CustomEvent("eip6963:announceProvider", {
            detail: Object.freeze({ info, provider }),
          }),
        );
      window.addEventListener("eip6963:requestProvider", announce);
      announce();
    },
    { address: account.address, chainIdHex: `0x${CHAIN_ID.toString(16)}`, name: walletName },
  );

  await page.goto(path);
  return {
    page,
    address: account.address,
    close: () => context.close(),
  };
}

/**
 * Wait for the wallet to be connected. The injected provider answers eth_accounts with the
 * account, so wagmi auto-connects on load (the deliberate, proven behaviour of this harness) —
 * the header shows the truncated address chip without going through the connector dialog.
 */
export async function connectWallet(page: Page): Promise<void> {
  await page.locator("header").getByText(/^0x[0-9a-fA-F]{4}…/).waitFor();
}
