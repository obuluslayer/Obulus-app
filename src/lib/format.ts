import { formatUnits, parseUnits } from "viem";
import { appConfig } from "./config";

/** The settlement asset has 6 decimals; amounts stay BigInt/string end to end — never float math. */
export const TOKEN_DECIMALS = 6;

/**
 * Ticker of the settlement asset, for DISPLAY only — never for identity (the address in appConfig is).
 *
 * Robinhood Chain has no canonical USDC: the official contract list publishes WETH and USDG, and the
 * explorer is full of impostor "USDC" tokens. Mainnet therefore settles in USDG (Global Dollar, also
 * 6 decimals, so nothing in the math changes); testnet keeps MockUSDC. Showing a hardcoded "USDC" on
 * mainnet would misname what the user is actually depositing.
 */
export const ASSET_SYMBOL: string =
  (import.meta.env.VITE_ASSET_SYMBOL as string | undefined)?.trim() ||
  (appConfig.chainId === 4663 ? "USDG" : "USDC");

export function formatUsdc(baseSix: string | bigint): string {
  const value = typeof baseSix === "bigint" ? baseSix : BigInt(baseSix);
  const asText = formatUnits(value, TOKEN_DECIMALS);
  const [whole, frac] = asText.split(".");
  const withThousands = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return frac ? `${withThousands}.${frac.slice(0, 2)}` : withThousands;
}

export function formatUsdcAmount(baseSix: string | bigint): string {
  return `${formatUsdc(baseSix)} ${ASSET_SYMBOL}`;
}

/** Parse a human "123.45" into base-6 bigint. Throws on malformed input. */
export function parseUsdc(input: string): bigint {
  const trimmed = input.trim();
  if (!/^\d+(\.\d{1,6})?$/.test(trimmed)) {
    throw new Error(`Enter a positive ${ASSET_SYMBOL} amount (max 6 decimals)`);
  }
  return parseUnits(trimmed, TOKEN_DECIMALS);
}

export function truncHash(hex: string): string {
  return hex.length > 14 ? `${hex.slice(0, 8)}…${hex.slice(-6)}` : hex;
}

export function truncAddr(addr: string): string {
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

export function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

/** "2 min ago" from an ISO string or epoch seconds. */
export function timeAgo(when: string | number | undefined): string {
  if (when === undefined) return "—";
  const thenMs = typeof when === "number" ? when * 1000 : Date.parse(when);
  if (Number.isNaN(thenMs)) return "—";
  const diffSec = Math.max(0, Math.floor((Date.now() - thenMs) / 1000));
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hr ago`;
  return `${Math.floor(diffSec / 86400)} d ago`;
}

/** Human duration for a positive number of seconds, e.g. "2 d 4 h" / "3 h 12 m" / "45 s". */
export function humanDuration(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec));
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return h > 0 ? `${d} d ${h} h` : `${d} d`;
  if (h > 0) return m > 0 ? `${h} h ${m} m` : `${h} h`;
  if (m > 0) return `${m} m`;
  return `${sec} s`;
}

/** "in 3 h 12 m" | "expired" for an epoch-seconds deadline. */
export function untilDeadline(deadlineSec: number): { expired: boolean; text: string } {
  const left = deadlineSec - nowSec();
  if (left <= 0) return { expired: true, text: "expired" };
  return { expired: false, text: `in ${humanDuration(left)}` };
}
