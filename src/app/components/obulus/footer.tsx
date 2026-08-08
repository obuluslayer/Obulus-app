import { Link } from "react-router";
import { Github } from "lucide-react";
import { ObulusLogo } from "./logo";
import { appConfig } from "@/lib/config";
import { activeChain, explorerAddressUrl } from "@/lib/chains";

// X has no lucide icon — the official mark, inlined.
function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

// Same for Telegram.
function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

// Site footer. Deliberately quiet: the cockpit is a working surface, so this only carries
// provenance and wayfinding (site, docs, source, contract) rather than marketing.
export function SiteFooter() {
  // Only offer the contract link once an address is wired in and the chain has an explorer.
  const contractUrl = appConfig.escrowAddress ? explorerAddressUrl(appConfig.escrowAddress) : null;
  const linkClass = "text-[13px] text-obulus-muted transition-colors hover:text-obulus-ink";

  return (
    <footer className="mt-16 border-t border-obulus-border">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 px-5 py-6 sm:px-8">
        <a href={appConfig.landingUrl} className="shrink-0" aria-label="Obulus Layer home">
          <ObulusLogo size={22} wordmarkSize={14} />
        </a>

        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <a href={appConfig.landingUrl} className={linkClass}>
            Home
          </a>

          <Link to="/docs" className={linkClass}>
            Docs
          </Link>

          <a href={appConfig.docsUrl} target="_blank" rel="noreferrer noopener" className={linkClass}>
            Full documentation
          </a>

          <a
            href={appConfig.githubUrl}
            target="_blank"
            rel="noreferrer noopener"
            className={`inline-flex items-center gap-1.5 ${linkClass}`}
          >
            <Github className="size-3.5" />
            GitHub
          </a>

          <a
            href={appConfig.xUrl}
            target="_blank"
            rel="noreferrer noopener"
            className={`inline-flex items-center gap-1.5 ${linkClass}`}
          >
            <XIcon className="size-3" />X
          </a>

          <a
            href={appConfig.telegramUrl}
            target="_blank"
            rel="noreferrer noopener"
            className={`inline-flex items-center gap-1.5 ${linkClass}`}
          >
            <TelegramIcon className="size-3.5" />
            Telegram
          </a>

          {contractUrl && (
            <a href={contractUrl} target="_blank" rel="noreferrer noopener" className={linkClass}>
              Contract on {activeChain.name}
            </a>
          )}
        </nav>

        <p className="text-[12px] text-obulus-muted">© 2026 Obulus Layer · non-custodial</p>
      </div>
    </footer>
  );
}
