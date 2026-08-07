import { Link, useLocation } from "react-router";
import { Menu } from "lucide-react";
import { useState } from "react";
import { ObulusLogo } from "./logo";
import { WalletButton } from "./wallet";
import { activeChain } from "@/lib/chains";

// Keep route labels centralized so desktop and mobile navigation cannot drift apart.
const links = [
  { to: "/", label: "Board" },
  { to: "/offers", label: "Offers" },
  { to: "/deals", label: "Deals" },
  { to: "/disputes", label: "Disputes" },
  { to: "/docs", label: "Docs" },
];

export function TopNav() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  function isActive(to: string) {
    return to === "/" ? pathname === "/" : pathname.startsWith(to);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-obulus-border bg-obulus-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-4 px-5 sm:px-8">
        <Link to="/" className="shrink-0">
          <ObulusLogo size={30} wordmarkSize={19} />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`rounded-full px-3.5 py-1.5 text-[14px] transition-colors ${
                isActive(l.to)
                  ? "bg-obulus-ink text-white"
                  : "text-obulus-muted hover:bg-secondary hover:text-obulus-ink"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <span className="hidden items-center gap-1.5 rounded-full border border-obulus-border bg-white px-3 py-1.5 text-[13px] text-obulus-ink sm:inline-flex">
            <span className="size-1.5 rounded-full bg-obulus-lime" />
            {activeChain.name}
          </span>
          <WalletButton />
          <button
            onClick={() => setOpen((v) => !v)}
            className="grid size-9 place-items-center rounded-full border border-obulus-border bg-white text-obulus-ink md:hidden"
            aria-label="Menu"
          >
            <Menu className="size-4" />
          </button>
        </div>
      </div>

      {/* Mobile navigation is intentionally rendered beneath the fixed desktop bar. */}
      {open && (
        <nav className="border-t border-obulus-border bg-obulus-bg px-5 py-3 md:hidden">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className={`block rounded-xl px-3 py-2.5 text-[15px] ${
                isActive(l.to) ? "bg-obulus-ink text-white" : "text-obulus-ink hover:bg-secondary"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
