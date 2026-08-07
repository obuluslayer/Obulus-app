import { Check } from "lucide-react";
import type { UiDealState } from "@/lib/adapters";
import { truncAddr } from "@/lib/format";

// Settlement status is encoded by text and color so it remains understandable for every user.
export function StatePill({ state }: { state: UiDealState }) {
  const base =
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium whitespace-nowrap";

  switch (state) {
    case "Funded":
      return (
        <span className={`${base} bg-obulus-lime text-obulus-ink`}>
          <span className="size-1.5 rounded-full bg-obulus-ink/70" />
          Funded
        </span>
      );
    case "Delivered":
      return (
        <span className={`${base} bg-white text-obulus-ink border border-obulus-border`}>
          <span className="size-1.5 rounded-full bg-obulus-lime ring-2 ring-obulus-lime/30" />
          Delivered
        </span>
      );
    case "Disputed":
      return (
        <span className={`${base} bg-obulus-amber-soft text-obulus-amber`}>
          <span className="size-1.5 rounded-full bg-obulus-amber" />
          Disputed
        </span>
      );
    case "Resolved":
      return (
        <span className={`${base} bg-secondary text-obulus-ink`}>
          <Check className="size-3.5 text-obulus-ink" strokeWidth={2.6} />
          Resolved
        </span>
      );
  }
}

/** Address chip. `label` defaults to the truncated address; `address` may be a full 0x string. */
export function AddressTag({ label, address }: { label?: string; address: string }) {
  const main = label ?? truncAddr(address);
  return (
    <div className="flex items-center gap-2.5" title={address}>
      <div className="grid size-8 place-items-center rounded-full bg-secondary text-obulus-ink text-[13px] font-semibold">
        {address.startsWith("0x") ? address.slice(2, 3).toUpperCase() : main.slice(0, 1)}
      </div>
      <div className="leading-tight">
        <div className="text-[14px] text-obulus-ink font-medium font-mono">{main}</div>
      </div>
    </div>
  );
}
