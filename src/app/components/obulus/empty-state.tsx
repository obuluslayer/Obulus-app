import type { ReactNode } from "react";
import { ObulusMark } from "./logo";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-obulus-border bg-white px-6 py-14 text-center">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "radial-gradient(circle at center, #CDFF00 0 2.5px, transparent 3px)",
          backgroundSize: "34px 34px",
        }}
      />
      <div className="relative mx-auto flex max-w-sm flex-col items-center gap-3">
        <div className="grid size-14 place-items-center rounded-2xl bg-secondary">
          <ObulusMark size={28} />
        </div>
        <h3 className="text-obulus-ink">{title}</h3>
        <p className="text-[14px] text-obulus-muted">{description}</p>
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}
