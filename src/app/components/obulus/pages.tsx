import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { StatePill, AddressTag } from "./pills";
import { OpenOffers, DealsInPlay } from "./board";
import { EmptyState } from "./empty-state";
import { LoadingRows, ErrorCard } from "./async-states";
import { CreateOfferModal } from "./create-offer-modal";
import { useDisputes } from "@/hooks/queries";
import { toUiDeals } from "@/lib/adapters";
import { activeChain } from "@/lib/chains";
import { truncHash, ASSET_SYMBOL } from "@/lib/format";

function PageHead({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <h1 className="text-obulus-ink" style={{ fontWeight: 700, fontSize: 34, lineHeight: 1.1 }}>
          {title}
        </h1>
        <p className="mt-2 max-w-lg text-[15px] text-obulus-muted">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

// Shared content width and responsive gutters for all secondary routes.
const shell = "mx-auto max-w-[1240px] px-5 py-8 sm:px-8";

export function OffersPage() {
  const [open, setOpen] = useState(false);
  return (
    <div className={shell}>
      <PageHead
        title="Offers"
        subtitle="Signed off-chain by sellers. Anyone can fund an open offer to start a deal."
        action={
          <button
            onClick={() => setOpen(true)}
            className="rounded-full bg-obulus-lime px-5 py-2.5 text-[14px] font-semibold text-obulus-ink transition-transform hover:scale-[1.02]"
          >
            Create offer
          </button>
        }
      />
      <div className="mt-2">
        <OpenOffers />
      </div>
      <CreateOfferModal open={open} onOpenChange={setOpen} />
    </div>
  );
}

export function DealsPage() {
  return (
    <div className={shell}>
      <PageHead title="Deals" subtitle="Every deal relayed by the Hub. The contract is the source of truth." />
      <div className="mt-6">
        <DealsInPlay />
      </div>
    </div>
  );
}

export function DisputesPage() {
  const navigate = useNavigate();
  const { data, isPending, isError, error, refetch } = useDisputes();
  const disputed = useMemo(
    () => toUiDeals(data ?? []).filter((d) => d.state === "Disputed"),
    [data],
  );

  return (
    <div className={shell}>
      <PageHead
        title="Disputes"
        subtitle="Deals paused for review. Settlement resumes once the arbiter decides."
      />
      <div className="mt-6 space-y-4">
        {isPending ? (
          <div className="rounded-2xl border border-obulus-border bg-white">
            <LoadingRows rows={2} />
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-obulus-border bg-white">
            <ErrorCard message={error.message} onRetry={() => refetch()} />
          </div>
        ) : disputed.length === 0 ? (
          <EmptyState
            title="No open disputes"
            description="Every deal is settling smoothly. Disputes will appear here if a delivery is contested."
          />
        ) : (
          disputed.map((d) => (
            <div
              key={d.id}
              className="flex flex-col gap-4 rounded-2xl border border-obulus-border bg-white p-6 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-4">
                <span className="grid size-11 place-items-center rounded-full bg-obulus-amber-soft text-obulus-amber font-semibold">
                  !
                </span>
                <div>
                  <div className="text-[15px] font-medium text-obulus-ink">{d.title}</div>
                  <div className="font-mono text-[12px] text-obulus-muted">
                    {truncHash(d.id)} · {d.price}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <AddressTag address={d.buyer} />
                <StatePill state={d.state} />
                <button
                  onClick={() => navigate(`/deals/${d.id}`)}
                  className="inline-flex items-center gap-1 rounded-full border border-obulus-border px-3.5 py-1.5 text-[13px] font-medium text-obulus-ink hover:bg-secondary"
                >
                  Open <ArrowUpRight className="size-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function DocsPage() {
  const sections = [
    { t: "How settlement works", d: "Offers are signed off-chain (zero gas), funded on-chain, and released only when delivery is confirmed or the windows lapse." },
    { t: "Bonds & guarantees", d: "Both sides can post a bond. Misbehaving parties forfeit their bond, keeping incentives honest." },
    { t: "Disputes & arbitration", d: "Contested deliveries pause settlement. The arbiter can only split this deal's funds between its buyer and seller — never divert them." },
    { t: `${activeChain.name}`, d: `Obulus settles in ${ASSET_SYMBOL} on ${activeChain.name} for fast, low-cost finality. Money lives in an immutable non-custodial contract.` },
  ];
  return (
    <div className={shell}>
      <PageHead
        title="Docs"
        subtitle="Everything you need to understand how Obulus settles deals between agents."
        action={
          <a
            href="https://gitbook.obuluslayer.xyz/"
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-obulus-lime px-5 py-2.5 text-[14px] font-semibold text-obulus-ink transition-transform hover:scale-[1.02]"
          >
            <BookOpen className="size-4" />
            Full documentation
            <ArrowUpRight className="size-4" />
          </a>
        }
      />
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {sections.map((s) => (
          <div key={s.t} className="rounded-2xl border border-obulus-border bg-white p-6">
            <span className="grid size-9 place-items-center rounded-full bg-secondary">
              <BookOpen className="size-4 text-obulus-ink" />
            </span>
            <h3 className="mt-4 text-obulus-ink">{s.t}</h3>
            <p className="mt-1.5 text-[14px] text-obulus-muted">{s.d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className={shell}>
      <EmptyState
        title="Page not found"
        description="Nothing lives at this address. The board lists everything currently in play."
        action={
          <Link
            to="/"
            className="inline-block rounded-full bg-obulus-lime px-5 py-2.5 text-[14px] font-semibold text-obulus-ink transition-transform hover:scale-[1.02]"
          >
            Back to the board
          </Link>
        }
      />
    </div>
  );
}
