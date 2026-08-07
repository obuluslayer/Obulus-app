import { useMemo, useState } from "react";
import { AlertTriangle, Clock, PackageCheck, Scale, Send, ThumbsUp } from "lucide-react";
import { useReadContract } from "wagmi";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../ui/dialog";
import { useWallet } from "./wallet";
import { useEscrowActions, type DeliverInput } from "@/hooks/useEscrowActions";
import { appConfig } from "@/lib/config";
import { escrowAbi } from "@/lib/protocol";
import { nowSec, untilDeadline } from "@/lib/format";
import type { DealView } from "@/lib/types";

type Role = "buyer" | "seller" | "arbiter" | "observer";

function roleOf(deal: DealView, viewer: string | null): Role {
  if (!viewer) return "observer";
  const me = viewer.toLowerCase();
  if (deal.buyer.toLowerCase() === me) return "buyer";
  if (deal.seller.toLowerCase() === me) return "seller";
  if (deal.arbiter.toLowerCase() === me) return "arbiter";
  return "observer";
}

const primaryBtn =
  "rounded-full bg-obulus-lime px-4 py-2 text-[14px] font-semibold text-obulus-ink transition-transform hover:scale-[1.02] active:scale-100 disabled:opacity-60";
const inkBtn =
  "rounded-full bg-obulus-ink px-4 py-2 text-[14px] font-medium text-white hover:bg-obulus-ink/90 disabled:opacity-60";
const ghostBtn =
  "rounded-full border border-obulus-border bg-white px-4 py-2 text-[14px] font-medium text-obulus-ink hover:bg-secondary disabled:opacity-60";
const inputCls =
  "w-full rounded-xl border border-obulus-border bg-white px-3.5 py-2.5 text-[14px] text-obulus-ink outline-none transition-shadow placeholder:text-obulus-muted/70 focus:border-obulus-ink/30 focus:ring-4 focus:ring-obulus-lime/25";

/** Contextual lifecycle actions for the connected role and the deal's on-chain state. */
export function DealActions({ deal }: { deal: DealView }) {
  const { connected, connect, fullAddress } = useWallet();
  const actions = useEscrowActions();
  const [deliverOpen, setDeliverOpen] = useState(false);
  const [resendOpen, setResendOpen] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);

  const role = roleOf(deal, fullAddress);
  const now = nowSec();
  const state = deal.onchainState;

  // resolveTimeout is an immutable the DealView doesn't carry — one cached on-chain read arms "Resolve expired".
  const { data: resolveTimeout } = useReadContract({
    abi: escrowAbi,
    address: appConfig.escrowAddress ?? undefined,
    functionName: "resolveTimeout",
    query: { enabled: Boolean(appConfig.escrowAddress && state === "Disputed"), staleTime: Infinity },
  });

  const items = useMemo(() => {
    const list: React.ReactNode[] = [];
    const deliverBy = untilDeadline(deal.deliverDeadline);
    const confirmBy =
      deal.deliveredAt !== undefined ? untilDeadline(deal.deliveredAt + deal.confirmWindow) : null;

    if (state === "Funded") {
      if (role === "seller" && !deliverBy.expired) {
        list.push(
          <button key="deliver" onClick={() => setDeliverOpen(true)} className={primaryBtn}>
            <span className="inline-flex items-center gap-1.5">
              <PackageCheck className="size-4" /> Mark delivered
            </span>
          </button>,
        );
        list.push(
          <Hint key="deliver-hint" icon={Clock} text={`Delivery due ${deliverBy.text}`} />,
        );
      }
      if (deliverBy.expired) {
        list.push(
          <button key="refund" onClick={() => actions.refundExpired(deal)} className={inkBtn}>
            Refund expired deal
          </button>,
          <Hint
            key="refund-hint"
            icon={Clock}
            text="The delivery deadline passed — anyone can trigger the buyer's refund."
          />,
        );
      } else if (role !== "seller") {
        list.push(<Hint key="wait-hint" icon={Clock} text={`Waiting for delivery, due ${deliverBy.text}`} />);
      }
    }

    if (state === "Delivered" && confirmBy) {
      if (!confirmBy.expired) {
        if (role === "buyer") {
          list.push(
            <button key="confirm" onClick={() => actions.confirmDeal(deal)} className={primaryBtn}>
              <span className="inline-flex items-center gap-1.5">
                <ThumbsUp className="size-4" /> Confirm & release
              </span>
            </button>,
            <button key="dispute" onClick={() => setDisputeOpen(true)} className={ghostBtn}>
              <span className="inline-flex items-center gap-1.5">
                <AlertTriangle className="size-4" /> Dispute
              </span>
            </button>,
          );
        }
        list.push(
          <Hint key="confirm-hint" icon={Clock} text={`Confirmation window closes ${confirmBy.text}`} />,
        );
      } else {
        list.push(
          <button key="timeout" onClick={() => actions.claimTimeout(deal)} className={inkBtn}>
            Claim timeout release
          </button>,
          <Hint
            key="timeout-hint"
            icon={Clock}
            text="The confirmation window elapsed — anyone can release the funds to the seller."
          />,
        );
      }
      if (role === "seller" && deal.deliveryHash && !deal.delivery) {
        list.push(
          <button key="resend" onClick={() => setResendOpen(true)} className={ghostBtn}>
            <span className="inline-flex items-center gap-1.5">
              <Send className="size-4" /> Resend content
            </span>
          </button>,
        );
      }
    }

    if (state === "Disputed") {
      if (role === "arbiter") {
        list.push(
          <button key="resolve" onClick={() => setResolveOpen(true)} className={primaryBtn}>
            <span className="inline-flex items-center gap-1.5">
              <Scale className="size-4" /> Resolve dispute
            </span>
          </button>,
        );
      }
      if (role === "buyer" && !deal.dispute) {
        list.push(
          <button key="send-details" onClick={() => setDisputeOpen(true)} className={inkBtn}>
            <span className="inline-flex items-center gap-1.5">
              <Send className="size-4" /> Send dispute details
            </span>
          </button>,
          <Hint
            key="details-hint"
            icon={AlertTriangle}
            text="The on-chain dispute has no relayed reason yet — the arbiter needs your details."
          />,
        );
      }
      if (role === "seller" && deal.deliveryHash && !deal.delivery) {
        list.push(
          <button key="resend-d" onClick={() => setResendOpen(true)} className={inkBtn}>
            <span className="inline-flex items-center gap-1.5">
              <Send className="size-4" /> Resend delivery content
            </span>
          </button>,
        );
      }
      if (deal.disputedAt !== undefined && typeof resolveTimeout === "bigint") {
        const fallbackAt = deal.disputedAt + Number(resolveTimeout);
        const fallback = untilDeadline(fallbackAt);
        if (fallback.expired) {
          list.push(
            <button key="resolve-expired" onClick={() => actions.resolveExpired(deal)} className={inkBtn}>
              Resolve expired dispute
            </button>,
            <Hint
              key="re-hint"
              icon={Clock}
              text="The arbiter sat out the resolve timeout — anyone can trigger the fallback split."
            />,
          );
        } else {
          list.push(
            <Hint key="rt-hint" icon={Clock} text={`Arbiter fallback unlocks ${fallback.text}`} />,
          );
        }
      }
    }

    return list;
  }, [deal, role, state, now, resolveTimeout, actions]);

  if (state === "Resolved" || items.length === 0) return null;

  return (
    <section className="mt-6 rounded-2xl border border-obulus-border bg-white p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-obulus-ink" style={{ fontWeight: 600 }}>
            Actions
          </h2>
          <p className="mt-1 text-[13px] text-obulus-muted">
            {connected
              ? `You are viewing this deal as ${role}.`
              : "Connect your wallet to act on this deal."}
          </p>
        </div>
        {!connected && (
          <button onClick={connect} className={inkBtn}>
            Connect wallet
          </button>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2.5">{items}</div>

      <DeliverModal
        open={deliverOpen}
        onOpenChange={setDeliverOpen}
        onSubmit={async (input) => {
          const ok = await actions.markDelivered(deal, input);
          if (ok) setDeliverOpen(false);
        }}
      />
      <DeliverModal
        open={resendOpen}
        onOpenChange={setResendOpen}
        resend
        onSubmit={async (input) => {
          const ok = await actions.resendDelivery(deal, input);
          if (ok) setResendOpen(false);
        }}
      />
      <DisputeModal
        open={disputeOpen}
        onOpenChange={setDisputeOpen}
        relayOnly={state === "Disputed"}
        onSubmit={async (reason, evidenceRef) => {
          const ok =
            state === "Disputed"
              ? await actions.resendDispute(deal, reason, evidenceRef)
              : await actions.disputeDeal(deal, reason, evidenceRef);
          if (ok) setDisputeOpen(false);
        }}
      />
      <ResolveModal
        open={resolveOpen}
        onOpenChange={setResolveOpen}
        deal={deal}
        onSubmit={async (sellerBps) => {
          const ok = await actions.resolveDeal(deal, sellerBps);
          if (ok) setResolveOpen(false);
        }}
        onTriage={() => actions.runTriage(deal.dealId)}
      />
    </section>
  );
}

function Hint({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string }>; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-obulus-muted">
      <Icon className="size-3.5" /> {text}
    </span>
  );
}

function DeliverModal({
  open,
  onOpenChange,
  onSubmit,
  resend = false,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (input: DeliverInput) => Promise<void>;
  resend?: boolean;
}) {
  const [content, setContent] = useState("");
  const [payloadRef, setPayloadRef] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-lg gap-0 overflow-y-auto rounded-3xl border-obulus-border p-7">
        <DialogTitle className="text-obulus-ink" style={{ fontWeight: 700, fontSize: 20 }}>
          {resend ? "Resend delivery content" : "Mark delivered"}
        </DialogTitle>
        <DialogDescription className="mt-1 text-[14px] text-obulus-muted">
          {resend
            ? "Re-push the exact same deliverable to the Hub — its hash must match the on-chain commitment."
            : "The deliverable is hashed on-chain as a commitment, and the content is relayed to the Hub so a dispute stays arbitrable."}
        </DialogDescription>
        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[14px] font-medium text-obulus-ink">Deliverable content</span>
            <textarea
              className={`${inputCls} min-h-[140px] font-mono text-[13px]`}
              placeholder="Paste the deliverable (text, JSON, markdown…)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[14px] font-medium text-obulus-ink">Reference (optional)</span>
            <input
              className={inputCls}
              placeholder="e.g. report-final.pdf, ipfs://…"
              value={payloadRef}
              onChange={(e) => setPayloadRef(e.target.value)}
            />
          </label>
          <button
            disabled={busy || !content.trim()}
            onClick={async () => {
              setBusy(true);
              try {
                await onSubmit({ content, payloadRef });
              } finally {
                setBusy(false);
              }
            }}
            className={`${primaryBtn} w-full py-2.5`}
          >
            {busy ? "Working…" : resend ? "Relay content" : "Commit & deliver"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DisputeModal({
  open,
  onOpenChange,
  onSubmit,
  relayOnly,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (reason: string, evidenceRef?: string) => Promise<void>;
  relayOnly: boolean;
}) {
  const [reason, setReason] = useState("");
  const [evidenceRef, setEvidenceRef] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-lg gap-0 overflow-y-auto rounded-3xl border-obulus-border p-7">
        <DialogTitle className="text-obulus-ink" style={{ fontWeight: 700, fontSize: 20 }}>
          {relayOnly ? "Send dispute details" : "Open a dispute"}
        </DialogTitle>
        <DialogDescription className="mt-1 text-[14px] text-obulus-muted">
          {relayOnly
            ? "The dispute already exists on-chain — this relays your reasoning to the arbiter."
            : "Pauses settlement on-chain and sends your reasoning to the arbiter. The arbiter can only split this deal's funds between you and the seller."}
        </DialogDescription>
        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[14px] font-medium text-obulus-ink">Reason</span>
            <textarea
              className={`${inputCls} min-h-[120px]`}
              placeholder="What is wrong with the delivery? (1–4096 characters)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={4096}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[14px] font-medium text-obulus-ink">Evidence reference (optional)</span>
            <input
              className={inputCls}
              placeholder="Link or identifier supporting your claim"
              value={evidenceRef}
              onChange={(e) => setEvidenceRef(e.target.value)}
            />
          </label>
          <button
            disabled={busy || !reason.trim()}
            onClick={async () => {
              setBusy(true);
              try {
                await onSubmit(reason, evidenceRef || undefined);
              } finally {
                setBusy(false);
              }
            }}
            className={`${inkBtn} w-full py-2.5`}
          >
            {busy ? "Working…" : relayOnly ? "Relay details" : "Dispute on-chain"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ResolveModal({
  open,
  onOpenChange,
  deal,
  onSubmit,
  onTriage,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  deal: DealView;
  onSubmit: (sellerBps: number) => Promise<void>;
  onTriage: () => Promise<boolean>;
}) {
  const ai = deal.dispute?.aiAssessment;
  const [sellerBps, setSellerBps] = useState<number>(ai?.recommendedSellerBps ?? 5_000);
  const [busy, setBusy] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-lg gap-0 overflow-y-auto rounded-3xl border-obulus-border p-7">
        <DialogTitle className="text-obulus-ink" style={{ fontWeight: 700, fontSize: 20 }}>
          Resolve dispute
        </DialogTitle>
        <DialogDescription className="mt-1 text-[14px] text-obulus-muted">
          Split the escrowed funds between seller and buyer. This is final and settles the deal.
        </DialogDescription>

        {ai?.available && (
          <div className="mt-4 rounded-2xl bg-secondary px-4 py-3">
            <div className="text-[12px] font-medium uppercase tracking-wide text-obulus-muted">
              AI triage (advisory)
            </div>
            <p className="mt-1 text-[13px] text-obulus-ink">{ai.summary}</p>
            <p className="mt-1 text-[12px] text-obulus-muted">
              Recommends {ai.recommendedSellerBps / 100}% to the seller · confidence {ai.confidence}
            </p>
          </div>
        )}

        <div className="mt-5">
          <div className="flex items-center justify-between text-[13px] text-obulus-muted">
            <span>Buyer {(10_000 - sellerBps) / 100}%</span>
            <span>Seller {sellerBps / 100}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={10_000}
            step={100}
            value={sellerBps}
            onChange={(e) => setSellerBps(Number(e.target.value))}
            className="mt-2 w-full accent-obulus-ink"
          />
        </div>

        <div className="mt-5 flex gap-2.5">
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onSubmit(sellerBps);
              } finally {
                setBusy(false);
              }
            }}
            className={`${primaryBtn} flex-1 py-2.5`}
          >
            {busy ? "Working…" : `Resolve at ${sellerBps / 100}% seller`}
          </button>
          <button disabled={busy} onClick={() => void onTriage()} className={ghostBtn}>
            Re-run triage
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
