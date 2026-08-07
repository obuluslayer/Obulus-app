import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../ui/dialog";
import { useWallet } from "./wallet";
import { useEscrowActions } from "@/hooks/useEscrowActions";
import { appConfig } from "@/lib/config";
import { nowSec, ASSET_SYMBOL } from "@/lib/format";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[14px] font-medium text-obulus-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[12px] text-obulus-muted">{hint}</span>}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border border-obulus-border bg-white px-3.5 py-2.5 text-[14px] text-obulus-ink outline-none transition-shadow placeholder:text-obulus-muted/70 focus:border-obulus-ink/30 focus:ring-4 focus:ring-obulus-lime/25";

function defaultExpiry(): string {
  const d = new Date(Date.now() + 7 * 86_400_000);
  return d.toISOString().slice(0, 10);
}

export function CreateOfferModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { connected, connect } = useWallet();
  const { createOffer } = useEscrowActions();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [conditions, setConditions] = useState("");
  const [price, setPrice] = useState("300");
  const [sellerBond, setSellerBond] = useState("150");
  const [buyerBond, setBuyerBond] = useState("60");
  const [expiry, setExpiry] = useState(defaultExpiry);
  const [deliverDays, setDeliverDays] = useState("3");
  const [confirmDays, setConfirmDays] = useState("2");
  const [arbiter, setArbiter] = useState(appConfig.defaultArbiter ?? "");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!connected) return connect();
    setFormError(null);

    if (!title.trim()) return setFormError("Give the service a title.");
    const deliverWithinSec = Math.round(Number(deliverDays) * 86_400);
    const confirmWindowSec = Math.round(Number(confirmDays) * 86_400);
    if (!Number.isFinite(deliverWithinSec) || deliverWithinSec <= 0)
      return setFormError("Delivery time must be a positive number of days.");
    if (!Number.isFinite(confirmWindowSec) || confirmWindowSec <= 0)
      return setFormError("Confirmation window must be a positive number of days.");
    const sigDeadline = Math.floor(new Date(`${expiry}T23:59:59Z`).getTime() / 1000);
    if (!Number.isFinite(sigDeadline) || sigDeadline <= nowSec())
      return setFormError("Expiry must be a future date.");

    setSubmitting(true);
    try {
      const offerHash = await createOffer({
        title,
        description,
        conditions,
        price,
        sellerBond,
        buyerBond,
        arbiter,
        deliverWithinSec,
        confirmWindowSec,
        sigDeadline,
      });
      if (offerHash) onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(80vw,56rem)] gap-0 overflow-hidden rounded-3xl border-obulus-border p-0">
        <div className="grid max-h-[80vh] overflow-y-auto md:grid-cols-[1.4fr_1fr]">
          {/* Form */}
          <div className="p-7 md:max-h-[80vh] md:overflow-y-auto">
            <DialogTitle className="text-obulus-ink" style={{ fontWeight: 700, fontSize: 22 }}>
              Create offer
            </DialogTitle>
            <DialogDescription className="mt-1 text-[14px] text-obulus-muted">
              Sign an offer any agent can fund. The contract holds the funds until delivery is
              verified. Signing costs no gas.
            </DialogDescription>

            <div className="mt-6 space-y-4">
              <Field label="Service title">
                <input
                  className={inputCls}
                  placeholder="e.g. Autonomous research report"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </Field>
              <Field label="Description">
                <textarea
                  className={`${inputCls} min-h-[80px] resize-none`}
                  placeholder="What the buyer receives, in plain language."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label={`Price (${ASSET_SYMBOL})`}>
                  <input
                    className={inputCls}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    inputMode="decimal"
                  />
                </Field>
                <Field label="Offer expiry" hint="Last day the offer can be funded.">
                  <input
                    className={inputCls}
                    type="date"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label={`Seller bond (${ASSET_SYMBOL})`} hint="Locked by you as a guarantee.">
                  <input
                    className={inputCls}
                    value={sellerBond}
                    onChange={(e) => setSellerBond(e.target.value)}
                    inputMode="decimal"
                  />
                </Field>
                <Field label={`Buyer bond (${ASSET_SYMBOL})`} hint="Locked by whoever funds the deal.">
                  <input
                    className={inputCls}
                    value={buyerBond}
                    onChange={(e) => setBuyerBond(e.target.value)}
                    inputMode="decimal"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Deliver within (days)" hint="Countdown starts when funded.">
                  <input
                    className={inputCls}
                    value={deliverDays}
                    onChange={(e) => setDeliverDays(e.target.value)}
                    inputMode="decimal"
                  />
                </Field>
                <Field label="Confirm window (days)" hint="Buyer's time to confirm or dispute.">
                  <input
                    className={inputCls}
                    value={confirmDays}
                    onChange={(e) => setConfirmDays(e.target.value)}
                    inputMode="decimal"
                  />
                </Field>
              </div>
              <Field label="Delivery conditions">
                <input
                  className={inputCls}
                  placeholder="e.g. PDF delivered through the Hub relay"
                  value={conditions}
                  onChange={(e) => setConditions(e.target.value)}
                />
              </Field>
              <Field
                label="Arbiter address"
                hint="Third party who can split the funds if a dispute opens. Never able to divert them elsewhere."
              >
                <input
                  className={`${inputCls} font-mono`}
                  placeholder="0x…"
                  value={arbiter}
                  onChange={(e) => setArbiter(e.target.value)}
                />
              </Field>
            </div>
          </div>

          {/* Live preview deliberately mirrors the settlement terms the seller is about to publish. */}
          <div className="relative border-t border-obulus-border bg-secondary/60 p-7 md:max-h-[80vh] md:overflow-y-auto md:border-l md:border-t-0">
            <div className="text-[12px] font-medium uppercase tracking-wide text-obulus-muted">
              Offer preview
            </div>
            <div className="mt-4 rounded-2xl border border-obulus-border bg-white p-5">
              <div className="text-[15px] font-semibold text-obulus-ink">
                {title || "Untitled service"}
              </div>
              <div className="mt-4 space-y-3">
                <Row k="Price" v={`${price || "0"} ${ASSET_SYMBOL}`} strong />
                <Row k="Seller bond" v={`${sellerBond || "0"} ${ASSET_SYMBOL}`} />
                <Row k="Buyer bond" v={`${buyerBond || "0"} ${ASSET_SYMBOL}`} />
                <Row k="Deliver within" v={`${deliverDays || "0"} d`} />
                <Row k="Confirm window" v={`${confirmDays || "0"} d`} />
              </div>
            </div>

            <div className="mt-5">
              <div className="text-[12px] font-medium text-obulus-muted">Expected flow</div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {["Signed", "Funded", "Delivered", "Confirmed", "Settled"].map((s, i) => (
                  <span key={s} className="inline-flex items-center gap-1.5">
                    <span className="rounded-full bg-white px-2.5 py-1 text-[12px] font-medium text-obulus-ink ring-1 ring-obulus-border">
                      {s}
                    </span>
                    {i < 4 && <ArrowRight className="size-3 text-obulus-muted" />}
                  </span>
                ))}
              </div>
            </div>

            {formError && (
              <p className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] text-obulus-red">
                {formError}
              </p>
            )}

            <button
              onClick={submit}
              disabled={submitting}
              className="mt-6 w-full rounded-full bg-obulus-lime py-3 text-[15px] font-semibold text-obulus-ink transition-transform hover:scale-[1.01] active:scale-100 disabled:opacity-60"
            >
              {connected ? (submitting ? "Waiting for signature…" : "Sign & publish offer") : "Connect wallet to publish"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-obulus-muted">{k}</span>
      <span className={`text-[14px] text-obulus-ink ${strong ? "font-semibold" : "font-medium"}`}>
        {v}
      </span>
    </div>
  );
}
