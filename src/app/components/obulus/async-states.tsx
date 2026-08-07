import { RefreshCw, WifiOff } from "lucide-react";
import { Skeleton } from "../ui/skeleton";

/** Table-ish skeleton shown while a list query loads. */
export function LoadingRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="divide-y divide-obulus-border">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48 bg-secondary" />
            <Skeleton className="h-3 w-32 bg-secondary" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full bg-secondary" />
        </div>
      ))}
    </div>
  );
}

/** Uniform failure surface with a retry — shown when the Hub is unreachable or errored. */
export function ErrorCard({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <span className="grid size-11 place-items-center rounded-full bg-secondary">
        <WifiOff className="size-5 text-obulus-muted" />
      </span>
      <div>
        <div className="text-[15px] font-medium text-obulus-ink">Hub unreachable</div>
        <div className="mt-1 max-w-md text-[13px] text-obulus-muted">
          {message ?? "The coordination Hub did not answer. It may be restarting."}
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-obulus-border bg-white px-4 py-1.5 text-[13px] font-medium text-obulus-ink hover:bg-secondary"
        >
          <RefreshCw className="size-3.5" /> Retry
        </button>
      )}
    </div>
  );
}
