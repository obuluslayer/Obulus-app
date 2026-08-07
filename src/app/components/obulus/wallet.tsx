import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Wallet,
  ChevronDown,
  Copy,
  LogOut,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  PenLine,
} from "lucide-react";
import { erc20Abi, formatUnits } from "viem";
import {
  useAccount,
  useConfig,
  useConnect,
  useDisconnect,
  useReadContract,
  useSwitchChain,
} from "wagmi";
import {
  simulateContract,
  waitForTransactionReceipt,
  writeContract,
} from "wagmi/actions";
import { escrowAbi } from "@/lib/protocol";
import { describeError } from "@/lib/errors";
import { formatUsdcAmount, ASSET_SYMBOL } from "@/lib/format";
import { useCredits } from "@/hooks/queries";
import { useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../ui/dialog";
import { appConfig } from "@/lib/config";
import { activeChain, explorerAddressUrl, explorerTxUrl } from "@/lib/chains";

export type TxStatus = "idle" | "signing" | "pending" | "confirmed" | "failed";

export type TxState = {
  status: TxStatus;
  label: string;
  /** 1-based step within stepCount, for multi-transaction sequences (approve → fund). */
  step: number;
  stepCount: number;
  stepLabel: string | null;
  hash: `0x${string}` | null;
  error: string | null;
};

const TX_IDLE: TxState = {
  status: "idle",
  label: "",
  step: 1,
  stepCount: 1,
  stepLabel: null,
  hash: null,
  error: null,
};

/** Imperative surface driven by useEscrowActions to feed the global transaction dialog. */
export type TxController = {
  start: (label: string, stepCount?: number) => void;
  step: (step: number, stepLabel: string) => void;
  signing: () => void;
  pending: (hash?: `0x${string}`) => void;
  confirmed: () => void;
  failed: (error: string) => void;
};

type WalletState = {
  connected: boolean;
  wrongNetwork: boolean;
  /** Truncated display form, e.g. "0x6813…BA69". */
  address: string;
  /** Full checksummed account address, null when disconnected. */
  fullAddress: `0x${string}` | null;
  balance: string;
  connect: () => void;
  disconnect: () => void;
  switchNetwork: () => void;
  txStatus: TxStatus;
  txLabel: string;
  tx: TxState;
  txController: TxController;
  closeTx: () => void;
};

const WalletCtx = createContext<WalletState | null>(null);

export function useWallet() {
  const ctx = useContext(WalletCtx);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}

export function truncAddress(addr: string): string {
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const { address: account, chainId, isConnected } = useAccount();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const [tx, setTx] = useState<TxState>(TX_IDLE);
  const [chooserOpen, setChooserOpen] = useState(false);

  const wrongNetwork = isConnected && chainId !== activeChain.id;

  const { data: rawBalance } = useReadContract({
    abi: erc20Abi,
    address: appConfig.usdcAddress ?? undefined,
    functionName: "balanceOf",
    args: account ? [account] : undefined,
    query: {
      enabled: Boolean(account && appConfig.usdcAddress && !wrongNetwork),
      refetchInterval: 8_000,
    },
  });

  const balance =
    rawBalance === undefined
      ? "—"
      : `${Number(formatUnits(rawBalance, 6)).toLocaleString("en-US", {
          maximumFractionDigits: 2,
        })} ${ASSET_SYMBOL}`;

  // Stable controller identity: actions capture it once and drive the dialog imperatively.
  const txControllerRef = useRef<TxController>({
    start: (label, stepCount = 1) =>
      setTx({ ...TX_IDLE, status: "signing", label, stepCount }),
    step: (step, stepLabel) => setTx((t) => ({ ...t, step, stepLabel, status: "signing" })),
    signing: () => setTx((t) => ({ ...t, status: "signing" })),
    pending: (hash) => setTx((t) => ({ ...t, status: "pending", hash: hash ?? t.hash })),
    confirmed: () => setTx((t) => ({ ...t, status: "confirmed", error: null })),
    failed: (error) => setTx((t) => ({ ...t, status: "failed", error })),
  });

  const value = useMemo<WalletState>(
    () => ({
      connected: isConnected,
      wrongNetwork,
      address: account ? truncAddress(account) : "",
      fullAddress: account ?? null,
      balance,
      connect: () => setChooserOpen(true),
      disconnect: () => wagmiDisconnect(),
      switchNetwork: () => switchChain({ chainId: activeChain.id }),
      txStatus: tx.status,
      txLabel: tx.label,
      tx,
      txController: txControllerRef.current,
      closeTx: () => setTx(TX_IDLE),
    }),
    [isConnected, wrongNetwork, account, balance, tx, wagmiDisconnect, switchChain],
  );

  return (
    <WalletCtx.Provider value={value}>
      {children}
      <ConnectorDialog open={chooserOpen && !isConnected} onClose={() => setChooserOpen(false)} />
      <TransactionDialog />
    </WalletCtx.Provider>
  );
}

function ConnectorDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { connectors, connect, isPending, error } = useConnect();

  // EIP-6963 discovered wallets carry an icon; the bare "Injected" fallback only matters when nothing was discovered.
  const discovered = connectors.filter((c) => c.id !== "injected");
  const list = discovered.length > 0 ? discovered : connectors;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm gap-0 rounded-3xl border-obulus-border p-6">
        <DialogTitle className="text-obulus-ink">Connect a wallet</DialogTitle>
        <DialogDescription className="mt-1 text-[13px] text-obulus-muted">
          Connect on {activeChain.name} to fund, deliver and settle escrow deals.
        </DialogDescription>
        <div className="mt-5 flex flex-col gap-2">
          {list.map((connector) => (
            <button
              key={connector.uid}
              disabled={isPending}
              onClick={() => connect({ connector }, { onSuccess: onClose })}
              className="flex items-center gap-3 rounded-2xl border border-obulus-border bg-white px-4 py-3 text-left text-[14px] font-medium text-obulus-ink transition-colors hover:bg-secondary disabled:opacity-60"
            >
              {connector.icon ? (
                <img src={connector.icon} alt="" className="size-6 rounded-md" />
              ) : (
                <Wallet className="size-5 text-obulus-muted" />
              )}
              {connector.name}
            </button>
          ))}
          {list.length === 0 && (
            <p className="rounded-2xl bg-secondary px-4 py-3 text-[13px] text-obulus-muted">
              No wallet extension detected. Install MetaMask, Rabby or Coinbase Wallet, then
              reload this page.
            </p>
          )}
          {error && (
            <p className="rounded-2xl bg-red-50 px-4 py-3 text-[13px] text-obulus-red">
              {error.message.split("\n")[0]}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function WalletButton() {
  const { connected, wrongNetwork, address, fullAddress, balance, connect, disconnect, switchNetwork } =
    useWallet();
  const { connector } = useAccount();

  if (!connected) {
    return (
      <button
        onClick={connect}
        className="inline-flex items-center gap-2 rounded-full bg-obulus-ink px-4 py-2 text-[14px] font-medium text-white transition-colors hover:bg-obulus-ink/90"
      >
        <Wallet className="size-4" />
        Connect wallet
      </button>
    );
  }

  if (wrongNetwork) {
    return (
      <button
        onClick={switchNetwork}
        className="inline-flex items-center gap-2 rounded-full bg-obulus-amber-soft px-4 py-2 text-[14px] font-medium text-obulus-amber transition-colors hover:bg-obulus-amber-soft/70"
      >
        <AlertTriangle className="size-4" />
        Switch to {activeChain.name}
      </button>
    );
  }

  const explorer = fullAddress ? explorerAddressUrl(fullAddress) : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex items-center gap-2 rounded-full border border-obulus-border bg-white px-3 py-1.5 text-[14px] font-medium text-obulus-ink transition-colors hover:bg-secondary">
          <span className="grid size-6 place-items-center rounded-full bg-obulus-lime text-[11px] font-bold text-obulus-ink">
            {fullAddress ? fullAddress.slice(2, 3).toUpperCase() : "?"}
          </span>
          <span className="font-mono text-[13px]">{address}</span>
          <ChevronDown className="size-4 text-obulus-muted" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 rounded-2xl">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="text-[13px] text-obulus-muted font-normal">
            {connector?.name ?? "Wallet"} · {activeChain.name}
          </span>
          <span className="font-mono text-[14px] text-obulus-ink">{address}</span>
        </DropdownMenuLabel>
        <div className="mx-2 mb-1 rounded-xl bg-secondary px-3 py-2">
          <div className="text-[12px] text-obulus-muted">Available balance</div>
          <div className="text-[16px] font-semibold text-obulus-ink">{balance}</div>
        </div>
        <CreditsRow />
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2"
          onClick={() => fullAddress && navigator.clipboard.writeText(fullAddress)}
        >
          <Copy className="size-4" /> Copy address
        </DropdownMenuItem>
        {explorer && (
          <DropdownMenuItem asChild className="gap-2">
            <a href={explorer} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" /> View on explorer
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={disconnect} className="gap-2 text-obulus-red focus:text-obulus-red">
          <LogOut className="size-4" /> Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Withdrawable pull-payment balance (Escrow.credits) with an inline withdraw action. */
function CreditsRow() {
  const wagmiConfig = useConfig();
  const queryClient = useQueryClient();
  const { fullAddress, txController } = useWallet();
  const { data } = useCredits(fullAddress);
  const credits = data ? BigInt(data.amount) : 0n;

  if (!appConfig.escrowAddress || credits === 0n) return null;

  async function withdraw() {
    try {
      txController.start("Withdrawing credits");
      const sim = await simulateContract(wagmiConfig, {
        abi: escrowAbi,
        address: appConfig.escrowAddress!,
        functionName: "withdraw",
        account: fullAddress ?? undefined,
      });
      const hash = await writeContract(wagmiConfig, sim.request);
      txController.pending(hash);
      const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });
      if (receipt.status !== "success") throw new Error("Withdraw reverted.");
      void queryClient.invalidateQueries({ queryKey: ["credits"] });
      txController.confirmed();
    } catch (error) {
      txController.failed(describeError(error));
    }
  }

  return (
    <div className="mx-2 mb-1 flex items-center justify-between rounded-xl bg-obulus-lime/25 px-3 py-2">
      <div>
        <div className="text-[12px] text-obulus-muted">Withdrawable</div>
        <div className="text-[14px] font-semibold text-obulus-ink">{formatUsdcAmount(credits)}</div>
      </div>
      <button
        onClick={withdraw}
        className="rounded-full bg-obulus-ink px-3 py-1 text-[12px] font-medium text-white hover:bg-obulus-ink/90"
      >
        Withdraw
      </button>
    </div>
  );
}

// One global transaction feedback surface keeps all contract actions visually and behaviorally consistent.
function TransactionDialog() {
  const { tx, closeTx } = useWallet();
  const open = tx.status !== "idle";
  const showSteps = tx.stepCount > 1;
  const txLink = tx.hash ? explorerTxUrl(tx.hash) : null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && tx.status !== "signing" && tx.status !== "pending" && closeTx()}>
      <DialogContent className="max-w-sm rounded-3xl border-obulus-border p-8 text-center" aria-describedby={undefined}>
        <DialogTitle className="sr-only">Transaction status</DialogTitle>
        {tx.status === "signing" && (
          <div className="flex flex-col items-center gap-4">
            <div className="grid size-16 place-items-center rounded-full bg-secondary">
              <PenLine className="size-7 text-obulus-ink" />
            </div>
            <div>
              <h3 className="text-obulus-ink">Waiting for your signature</h3>
              <p className="mt-1 text-[14px] text-obulus-muted">
                {showSteps && tx.stepLabel
                  ? `Step ${tx.step}/${tx.stepCount} — ${tx.stepLabel}. `
                  : null}
                {tx.label} — confirm in your wallet.
              </p>
            </div>
          </div>
        )}
        {tx.status === "pending" && (
          <div className="flex flex-col items-center gap-4">
            <div className="grid size-16 place-items-center rounded-full bg-secondary">
              <Loader2 className="size-7 animate-spin text-obulus-ink" />
            </div>
            <div>
              <h3 className="text-obulus-ink">Transaction pending</h3>
              <p className="mt-1 text-[14px] text-obulus-muted">
                {showSteps && tx.stepLabel
                  ? `Step ${tx.step}/${tx.stepCount} — ${tx.stepLabel}. `
                  : null}
                {tx.label} — waiting for {activeChain.name} to confirm.
              </p>
              {txLink && (
                <a
                  href={txLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-[13px] text-obulus-muted underline hover:text-obulus-ink"
                >
                  View transaction <ExternalLink className="size-3.5" />
                </a>
              )}
            </div>
          </div>
        )}
        {tx.status === "confirmed" && (
          <div className="flex flex-col items-center gap-4">
            <div className="grid size-16 place-items-center rounded-full bg-obulus-lime">
              <CheckCircle2 className="size-8 text-obulus-ink" />
            </div>
            <div>
              <h3 className="text-obulus-ink">Transaction confirmed</h3>
              <p className="mt-1 text-[14px] text-obulus-muted">
                {tx.label} settled on {activeChain.name}.
              </p>
              {txLink && (
                <a
                  href={txLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-[13px] text-obulus-muted underline hover:text-obulus-ink"
                >
                  View transaction <ExternalLink className="size-3.5" />
                </a>
              )}
            </div>
            <button
              onClick={closeTx}
              className="mt-1 w-full rounded-full bg-obulus-ink py-2.5 text-[14px] font-medium text-white hover:bg-obulus-ink/90"
            >
              Done
            </button>
          </div>
        )}
        {tx.status === "failed" && (
          <div className="flex flex-col items-center gap-4">
            <div className="grid size-16 place-items-center rounded-full bg-red-50">
              <XCircle className="size-8 text-obulus-red" />
            </div>
            <div>
              <h3 className="text-obulus-ink">Transaction failed</h3>
              <p className="mt-1 text-[14px] text-obulus-muted">
                {tx.error ?? `${tx.label} could not be completed.`}
              </p>
            </div>
            <button
              onClick={closeTx}
              className="mt-1 w-full rounded-full border border-obulus-border py-2.5 text-[14px] font-medium text-obulus-ink hover:bg-secondary"
            >
              Close
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
