import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowUpRight, TrendingUp, Layers, AlertTriangle, CheckCircle2, Check } from "lucide-react";
import { StatePill, AddressTag } from "./pills";
import { CreateOfferModal } from "./create-offer-modal";
import { EmptyState } from "./empty-state";
import { LoadingRows, ErrorCard } from "./async-states";
import { useWallet } from "./wallet";
import { useDeals, useOffers } from "@/hooks/queries";
import { toUiDeals, toUiOffer, isOpenOffer, type UiDeal } from "@/lib/adapters";
import { formatUsdc, timeAgo, truncHash, ASSET_SYMBOL } from "@/lib/format";
import { useEscrowActions } from "@/hooks/useEscrowActions";

// Board is the operational landing view: high-level metrics, active settlements, and the primary offer-creation entry point.
export function Board() {
  const [offerOpen, setOfferOpen] = useState(false);

  return (
    <div className="mx-auto max-w-[1240px] px-5 py-8 sm:px-8">
      <Hero onCreate={() => setOfferOpen(true)} />
      <Metrics />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.7fr_1fr]">
        <DealsInPlay />
        <div className="space-y-6">
          <SettlementFlow />
          <ActivityCard />
        </div>
      </div>

      <OpenOffers onCreate={() => setOfferOpen(true)} />

      <CreateOfferModal open={offerOpen} onOpenChange={setOfferOpen} />
    </div>
  );
}

function Hero({ onCreate }: { onCreate: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
      <div>
        <h1 className="text-obulus-ink" style={{ fontWeight: 700, fontSize: 40, lineHeight: 1.05 }}>
          Settlement board
        </h1>
        <p className="mt-3 max-w-lg text-[16px] text-obulus-muted">
          Track offers, escrowed deals, disputes, and settlements in real time.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        <button
          onClick={() => navigate("/docs")}
          className="rounded-full border border-obulus-border bg-white px-5 py-2.5 text-[14px] font-medium text-obulus-ink transition-colors hover:bg-secondary"
        >
          View docs
        </button>
        <button
          onClick={onCreate}
          className="rounded-full bg-obulus-lime px-5 py-2.5 text-[14px] font-semibold text-obulus-ink transition-transform hover:scale-[1.02] active:scale-100"
        >
          Create offer
        </button>
      </div>
    </div>
  );
}

function Metrics() {
  const { data } = useDeals();

  const { volume, active, disputed, resolved } = useMemo(() => {
    const deals = toUiDeals(data ?? []);
    const inEscrow = deals.filter((d) => d.state !== "Resolved");
    const volumeBase = inEscrow.reduce((sum, d) => sum + BigInt(d.raw.price), 0n);
    return {
      volume: formatUsdc(volumeBase),
      active: deals.filter((d) => d.state === "Funded" || d.state === "Delivered").length,
      disputed: deals.filter((d) => d.state === "Disputed").length,
      resolved: deals.filter((d) => d.state === "Resolved").length,
    };
  }, [data]);

  const cards = [
    { label: "Active volume", value: `$${volume}`, unit: ASSET_SYMBOL, icon: TrendingUp, accent: true },
    { label: "Active deals", value: String(active), unit: "in escrow", icon: Layers },
    { label: "Disputed", value: String(disputed), unit: "in review", icon: AlertTriangle },
    { label: "Resolved", value: String(resolved), unit: "settled", icon: CheckCircle2 },
  ];
  return (
    <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-2xl border border-obulus-border bg-white p-5 shadow-[0_1px_2px_rgba(33,41,48,0.04)]"
        >
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-obulus-muted">{c.label}</span>
            <span
              className={`grid size-7 place-items-center rounded-full ${
                c.accent ? "bg-obulus-lime" : "bg-secondary"
              }`}
            >
              <c.icon className="size-3.5 text-obulus-ink" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-obulus-ink" style={{ fontWeight: 700, fontSize: 28 }}>
              {c.value}
            </span>
            <span className="text-[13px] text-obulus-muted">{c.unit}</span>
          </div>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-obulus-lime"
              style={{ width: c.accent ? "72%" : "40%" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// Exported for reuse on the dedicated Deals page; keep navigation to canonical deal-detail routes here.
export function DealsInPlay() {
  const navigate = useNavigate();
  const { data, isPending, isError, error, refetch } = useDeals();
  const deals = useMemo(() => toUiDeals(data ?? []), [data]);

  return (
    <section className="rounded-2xl border border-obulus-border bg-white shadow-[0_1px_2px_rgba(33,41,48,0.04)]">
      <div className="border-b border-obulus-border px-6 py-5">
        <h2 className="text-obulus-ink" style={{ fontWeight: 600 }}>
          Deals in play
        </h2>
        <p className="mt-1 text-[14px] text-obulus-muted">
          Every deal relayed by the Hub. The contract is the source of truth.
        </p>
      </div>

      {/* Header row (desktop) */}
      <div className="hidden grid-cols-[1.4fr_1fr_1fr_0.8fr_0.9fr_auto] gap-4 px-6 py-3 text-[12px] font-medium uppercase tracking-wide text-obulus-muted md:grid">
        <span>Deal</span>
        <span>Buyer</span>
        <span>Seller</span>
        <span>Price</span>
        <span>State</span>
        <span className="text-right">Action</span>
      </div>

      {isPending ? (
        <LoadingRows rows={4} />
      ) : isError ? (
        <ErrorCard message={error.message} onRetry={() => refetch()} />
      ) : deals.length === 0 ? (
        <EmptyState
          title="No deals yet"
          description="Fund an open offer to start the first escrow deal."
        />
      ) : (
        <div className="divide-y divide-obulus-border">
          {deals.map((d) => (
            <DealRow key={d.id} deal={d} onOpen={() => navigate(`/deals/${d.id}`)} />
          ))}
        </div>
      )}
    </section>
  );
}

function DealRow({ deal, onOpen }: { deal: UiDeal; onOpen: () => void }) {
  return (
    <div className="grid grid-cols-2 items-center gap-4 px-6 py-4 transition-colors hover:bg-secondary/50 md:grid-cols-[1.4fr_1fr_1fr_0.8fr_0.9fr_auto]">
      <div className="col-span-2 md:col-span-1">
        <div className="text-[14px] font-medium text-obulus-ink">{deal.title}</div>
        <div className="font-mono text-[12px] text-obulus-muted">{truncHash(deal.id)}</div>
      </div>
      <div className="hidden md:block">
        <AddressTag address={deal.buyer} />
      </div>
      <div className="hidden md:block">
        <AddressTag address={deal.seller} />
      </div>
      <div className="text-[14px] font-semibold text-obulus-ink">{deal.price}</div>
      <div>
        <StatePill state={deal.state} />
      </div>
      <div className="flex justify-end">
        <button
          onClick={onOpen}
          className="inline-flex items-center gap-1 rounded-full border border-obulus-border px-3.5 py-1.5 text-[13px] font-medium text-obulus-ink transition-colors hover:bg-secondary"
        >
          Open <ArrowUpRight className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

const settlementSteps = [
  { n: 1, title: "Negotiate", desc: "Seller signs an offer off-chain." },
  { n: 2, title: "Escrow", desc: "Buyer funds the deal and bonds lock." },
  { n: 3, title: "Verify", desc: "Delivery is checked against conditions." },
  { n: 4, title: "Settle", desc: "The contract releases the payment." },
];

function SettlementFlow() {
  return (
    <section className="rounded-2xl border border-obulus-border bg-white p-6 shadow-[0_1px_2px_rgba(33,41,48,0.04)]">
      <h2 className="text-obulus-ink" style={{ fontWeight: 600 }}>
        Settlement flow
      </h2>
      <p className="mt-1 text-[13px] text-obulus-muted">How Obulus moves money safely.</p>
      <ol className="mt-5 space-y-1">
        {settlementSteps.map((s, i) => (
          <li key={s.n} className="relative flex gap-4 pb-5 last:pb-0">
            {i < settlementSteps.length - 1 && (
              <span className="absolute left-[15px] top-8 h-full w-px bg-obulus-border" />
            )}
            <span className="relative z-10 grid size-8 shrink-0 place-items-center rounded-full border border-obulus-ink/15 bg-white">
              <Check className="size-4 text-obulus-ink" strokeWidth={2.4} />
              <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-obulus-lime" />
            </span>
            <div>
              <div className="text-[14px] font-medium text-obulus-ink">{s.title}</div>
              <div className="text-[13px] text-obulus-muted">{s.desc}</div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ActivityCard() {
  const { data } = useDeals();
  const recent = useMemo(() => toUiDeals(data ?? []).slice(0, 4), [data]);

  const tone: Record<UiDeal["state"], string> = {
    Funded: "bg-obulus-lime",
    Delivered: "bg-obulus-ink",
    Disputed: "bg-obulus-amber",
    Resolved: "bg-obulus-lime",
  };

  return (
    <section className="rounded-2xl border border-obulus-border bg-white p-6 shadow-[0_1px_2px_rgba(33,41,48,0.04)]">
      <h2 className="text-obulus-ink" style={{ fontWeight: 600 }}>
        Activity
      </h2>
      {recent.length === 0 ? (
        <p className="mt-4 text-[13px] text-obulus-muted">
          Deal state changes will appear here.
        </p>
      ) : (
        <ul className="mt-4 space-y-3.5">
          {recent.map((d) => (
            <li key={d.id} className="flex items-center gap-3">
              <span className={`size-2 rounded-full ${tone[d.state]}`} />
              <span className="truncate text-[14px] text-obulus-ink">
                {d.title} — {d.state.toLowerCase()}
              </span>
              <span className="ml-auto shrink-0 text-[12px] text-obulus-muted">
                {timeAgo(d.raw.updatedAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Offers remain reusable because both Board and OffersPage need the same marketplace table and funding action.
export function OpenOffers({ onCreate }: { onCreate?: () => void }) {
  const { connected, connect, fullAddress } = useWallet();
  const { fundOffer } = useEscrowActions();
  const { data, isPending, isError, error, refetch } = useOffers();

  const offers = useMemo(
    () => (data ?? []).filter((o) => isOpenOffer(o, fullAddress)).map(toUiOffer),
    [data, fullAddress],
  );

  return (
    <section className="mt-8 rounded-2xl border border-obulus-border bg-white shadow-[0_1px_2px_rgba(33,41,48,0.04)]">
      <div className="flex items-center justify-between border-b border-obulus-border px-6 py-5">
        <div>
          <h2 className="text-obulus-ink" style={{ fontWeight: 600 }}>
            Open offers
          </h2>
          <p className="mt-1 text-[14px] text-obulus-muted">
            Signed off-chain by sellers. Anyone can fund an open offer.
          </p>
        </div>
        {onCreate && (
          <button
            onClick={onCreate}
            className="hidden rounded-full border border-obulus-border px-4 py-2 text-[14px] font-medium text-obulus-ink hover:bg-secondary sm:block"
          >
            New offer
          </button>
        )}
      </div>

      <div className="hidden grid-cols-[1.4fr_1.2fr_0.8fr_1fr_auto] gap-4 px-6 py-3 text-[12px] font-medium uppercase tracking-wide text-obulus-muted md:grid">
        <span>Offer</span>
        <span>Seller</span>
        <span>Price</span>
        <span>Bonds</span>
        <span className="text-right">Action</span>
      </div>

      {isPending ? (
        <LoadingRows rows={3} />
      ) : isError ? (
        <ErrorCard message={error.message} onRetry={() => refetch()} />
      ) : offers.length === 0 ? (
        <EmptyState
          title="No open offers"
          description="Create and sign an offer — it costs no gas until someone funds it."
        />
      ) : (
        <div className="divide-y divide-obulus-border">
          {offers.map((o) => (
            <div
              key={o.id}
              className="grid grid-cols-2 items-center gap-4 px-6 py-4 transition-colors hover:bg-secondary/50 md:grid-cols-[1.4fr_1.2fr_0.8fr_1fr_auto]"
            >
              <div className="col-span-2 md:col-span-1">
                <div className="text-[14px] font-medium text-obulus-ink">{o.title}</div>
                <div className="font-mono text-[12px] text-obulus-muted">{truncHash(o.id)}</div>
              </div>
              <div className="hidden md:block">
                <AddressTag address={o.seller} />
              </div>
              <div className="text-[14px] font-semibold text-obulus-ink">{o.price}</div>
              <div className="text-[13px] text-obulus-muted">{o.bonds}</div>
              <div className="flex justify-end">
                <button
                  onClick={() => (connected ? fundOffer(o.raw) : connect())}
                  className="rounded-full bg-obulus-lime px-5 py-1.5 text-[13px] font-semibold text-obulus-ink transition-transform hover:scale-[1.03] active:scale-100"
                >
                  Fund
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
