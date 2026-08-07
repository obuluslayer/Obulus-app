import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  Check,
  Clock,
  Lock,
  Shield,
  FileText,
  BadgeCheck,
  AlertTriangle,
} from "lucide-react";
import { StatePill, AddressTag } from "./pills";
import { EmptyState } from "./empty-state";
import { ErrorCard } from "./async-states";
import { DealActions } from "./deal-actions";
import { Skeleton } from "../ui/skeleton";
import { useDeal } from "@/hooks/queries";
import { ApiError } from "@/lib/api";
import { toUiDeal } from "@/lib/adapters";
import { activeChain } from "@/lib/chains";
import { formatUsdcAmount, timeAgo, truncHash, untilDeadline, ASSET_SYMBOL } from "@/lib/format";
import type { DealView } from "@/lib/types";

type StepStatus = "done" | "current" | "pending";

// Timeline reflects the settlement state machine; a later step never shows complete until the chain confirms it.
function timelineFor(deal: DealView) {
  const steps: { key: string; label: string; desc: string }[] = [
    { key: "created", label: "Offer created", desc: "Seller signed the offer off-chain." },
    { key: "funded", label: "Escrow funded", desc: "Buyer locked the price and bonds." },
    { key: "delivered", label: "Work delivered", desc: "Seller committed the deliverable hash." },
    { key: "verified", label: "Verification", desc: "Buyer confirms, disputes, or the window lapses." },
    { key: "settled", label: "Settlement released", desc: "The contract credited the payout." },
  ];
  const state = deal.onchainState;
  const reached = state === "Funded" ? 1 : state === "Delivered" ? 2 : state === "Disputed" ? 3 : 4;
  return steps.map((s, i) => ({
    ...s,
    status: (i <= reached ? "done" : i === reached + 1 ? "current" : "pending") as StepStatus,
    warn: state === "Disputed" && i === 3,
  }));
}

// Canonical settlement record, hydrated from the Hub by the :id URL parameter.
export function DealDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isPending, isError, error, refetch } = useDeal(id);

  const back = (
    <button
      onClick={() => navigate(-1)}
      className="mb-6 inline-flex items-center gap-1.5 text-[14px] text-obulus-muted hover:text-obulus-ink"
    >
      <ArrowLeft className="size-4" /> Back
    </button>
  );

  if (isPending) {
    return (
      <div className="mx-auto max-w-[1080px] px-5 py-8 sm:px-8">
        {back}
        <div className="rounded-2xl border border-obulus-border bg-white p-6">
          <Skeleton className="h-8 w-72 bg-secondary" />
          <Skeleton className="mt-3 h-4 w-48 bg-secondary" />
          <div className="mt-6 flex gap-8 border-t border-obulus-border pt-5">
            <Skeleton className="h-10 w-44 bg-secondary" />
            <Skeleton className="h-10 w-44 bg-secondary" />
          </div>
        </div>
        <p className="mt-4 text-center text-[13px] text-obulus-muted">
          Loading deal — a just-funded deal can take a few seconds to be indexed.
        </p>
      </div>
    );
  }

  if (isError) {
    const notFound = error instanceof ApiError && error.statusCode === 404;
    return (
      <div className="mx-auto max-w-[900px] px-5 py-10 sm:px-8">
        {back}
        {notFound ? (
          <EmptyState
            title="Deal not found"
            description="No deal exists for this id on the current chain — it may still be indexing."
          />
        ) : (
          <div className="rounded-2xl border border-obulus-border bg-white">
            <ErrorCard message={error.message} onRetry={() => refetch()} />
          </div>
        )}
      </div>
    );
  }

  const ui = toUiDeal(data);
  if (!ui) {
    return (
      <div className="mx-auto max-w-[900px] px-5 py-10 sm:px-8">
        {back}
        <EmptyState title="Deal not settled yet" description="This deal has no on-chain state." />
      </div>
    );
  }
  const deal = ui.raw;
  const steps = timelineFor(deal);
  const deliverBy = untilDeadline(deal.deliverDeadline);
  const confirmBy =
    deal.deliveredAt !== undefined ? untilDeadline(deal.deliveredAt + deal.confirmWindow) : null;

  return (
    <div className="mx-auto max-w-[1080px] px-5 py-8 sm:px-8">
      {back}

      {/* Header */}
      <div className="rounded-2xl border border-obulus-border bg-white p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-obulus-ink" style={{ fontWeight: 700, fontSize: 26 }}>
                {ui.title}
              </h1>
              <StatePill state={ui.state} />
            </div>
            <div className="mt-1 font-mono text-[13px] text-obulus-muted">{truncHash(deal.dealId)}</div>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-[13px] text-obulus-muted">Deal value</div>
            <div className="text-obulus-ink" style={{ fontWeight: 700, fontSize: 24 }}>
              {ui.price}
            </div>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-8 border-t border-obulus-border pt-5">
          <div>
            <div className="mb-2 text-[12px] uppercase tracking-wide text-obulus-muted">Buyer</div>
            <AddressTag address={deal.buyer} />
          </div>
          <div>
            <div className="mb-2 text-[12px] uppercase tracking-wide text-obulus-muted">Seller</div>
            <AddressTag address={deal.seller} />
          </div>
          <div>
            <div className="mb-2 text-[12px] uppercase tracking-wide text-obulus-muted">Arbiter</div>
            <AddressTag address={deal.arbiter} />
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* Timeline */}
        <section className="rounded-2xl border border-obulus-border bg-white p-6">
          <h2 className="text-obulus-ink" style={{ fontWeight: 600 }}>
            Timeline
          </h2>
          <ol className="mt-5">
            {steps.map((s, i) => (
              <li key={s.key} className="relative flex gap-4 pb-6 last:pb-0">
                {i < steps.length - 1 && (
                  <span className="absolute left-[15px] top-9 h-full w-px bg-obulus-border" />
                )}
                <span
                  className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-full ${
                    s.warn
                      ? "bg-obulus-amber-soft"
                      : s.status === "done"
                        ? "bg-obulus-lime"
                        : s.status === "current"
                          ? "border border-obulus-ink/20 bg-white"
                          : "border border-obulus-border bg-white"
                  }`}
                >
                  {s.warn ? (
                    <AlertTriangle className="size-4 text-obulus-amber" />
                  ) : s.status === "done" ? (
                    <Check className="size-4 text-obulus-ink" strokeWidth={2.6} />
                  ) : s.status === "current" ? (
                    <Clock className="size-4 text-obulus-ink" />
                  ) : (
                    <span className="size-2 rounded-full bg-obulus-border" />
                  )}
                </span>
                <div className="pt-1">
                  <div className="text-[14px] font-medium text-obulus-ink">
                    {s.warn ? "Verification paused" : s.label}
                  </div>
                  <div className="text-[13px] text-obulus-muted">
                    {s.warn ? "A dispute is open on this deal." : s.desc}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Right column cards */}
        <div className="space-y-6">
          <InfoCard icon={Lock} title="Escrow details">
            <Row k="Locked amount" v={ui.price} />
            <Row k="Token" v={ASSET_SYMBOL} />
            <Row k="Network" v={activeChain.name} />
            <Row k="Protocol fee" v={`${deal.feeBps / 100}%`} />
          </InfoCard>

          <InfoCard icon={Shield} title="Bonds">
            <Row k="Seller bond" v={formatUsdcAmount(deal.sellerBond)} />
            <Row k="Buyer bond" v={formatUsdcAmount(deal.buyerBond)} />
            <Row
              k="Status"
              v={deal.onchainState === "Resolved" ? "Released" : "Locked"}
            />
          </InfoCard>

          <InfoCard icon={Clock} title="Deadlines">
            <Row
              k="Deliver by"
              v={deal.deliveredAt !== undefined ? "Delivered" : deliverBy.text}
            />
            {deal.deliveredAt !== undefined && (
              <Row k="Delivered" v={timeAgo(deal.deliveredAt)} />
            )}
            {confirmBy && deal.onchainState === "Delivered" && (
              <Row k="Confirm window" v={confirmBy.expired ? "elapsed" : `closes ${confirmBy.text}`} />
            )}
            {deal.disputedAt !== undefined && <Row k="Disputed" v={timeAgo(deal.disputedAt)} />}
          </InfoCard>

          {(deal.delivery || deal.deliveryHash) && (
            <InfoCard icon={FileText} title="Evidence / delivery">
              {deal.delivery ? (
                <>
                  <Row k="Reference" v={deal.delivery.payloadRef || "inline"} />
                  <Row k="Payload hash" v={truncHash(deal.delivery.payloadHash)} />
                  <Row k="Blob stored" v={deal.delivery.blobStored ? "yes" : "no"} />
                </>
              ) : (
                <>
                  <Row k="Commitment" v={truncHash(deal.deliveryHash!)} />
                  <Row k="Content" v="not relayed yet" />
                </>
              )}
            </InfoCard>
          )}

          <InfoCard icon={BadgeCheck} title="Verification result">
            {deal.onchainState === "Resolved" ? (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-[14px] text-obulus-ink">
                  <Check className="size-4 text-obulus-ink" /> Settled.
                </div>
                {deal.sellerBps !== undefined && (
                  <Row
                    k="Final split"
                    v={`${deal.sellerBps / 100}% seller / ${(10_000 - deal.sellerBps) / 100}% buyer`}
                  />
                )}
              </div>
            ) : deal.onchainState === "Disputed" ? (
              <div className="flex items-center gap-2 text-[14px] text-obulus-amber">
                <AlertTriangle className="size-4" /> Under review by the arbiter.
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[14px] text-obulus-muted">
                <Clock className="size-4" /> Pending buyer confirmation.
              </div>
            )}
          </InfoCard>
        </div>
      </div>

      {deal.onchainState === "Disputed" && <DisputeSummary deal={deal} />}

      <DealActions deal={deal} />
    </div>
  );
}

function DisputeSummary({ deal }: { deal: DealView }) {
  const dispute = deal.dispute;
  const ai = dispute?.aiAssessment;
  return (
    <section className="mt-6 rounded-2xl border border-obulus-amber/30 bg-obulus-amber-soft/50 p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-9 place-items-center rounded-full bg-white">
          <AlertTriangle className="size-4 text-obulus-amber" />
        </span>
        <div className="min-w-0">
          <h2 className="text-obulus-ink" style={{ fontWeight: 600 }}>
            Dispute opened
          </h2>
          {dispute ? (
            <>
              <p className="mt-1 max-w-xl text-[14px] text-obulus-ink">“{dispute.reason}”</p>
              {dispute.evidenceRef && (
                <p className="mt-1 text-[13px] text-obulus-muted">Evidence: {dispute.evidenceRef}</p>
              )}
            </>
          ) : (
            <p className="mt-1 max-w-xl text-[14px] text-obulus-muted">
              Disputed on-chain — the buyer has not relayed the reason to the Hub yet.
            </p>
          )}
          {ai?.available && (
            <div className="mt-3 rounded-xl bg-white/70 px-4 py-3">
              <div className="text-[12px] font-medium uppercase tracking-wide text-obulus-muted">
                AI triage (advisory — the human arbiter decides)
              </div>
              <p className="mt-1 text-[13px] text-obulus-ink">{ai.summary}</p>
              <p className="mt-1 text-[12px] text-obulus-muted">
                Recommends {ai.recommendedSellerBps / 100}% seller · confidence {ai.confidence}
                {ai.flags.length > 0 && ` · flags: ${ai.flags.join(", ")}`}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function InfoCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-obulus-border bg-white p-5">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="size-4 text-obulus-ink" />
        <h3 className="text-obulus-ink" style={{ fontWeight: 600 }}>
          {title}
        </h3>
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] text-obulus-muted">{k}</span>
      <span className="truncate text-[14px] font-medium text-obulus-ink">{v}</span>
    </div>
  );
}
