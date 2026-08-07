import type { DealView, OfferView, OnchainState } from "./types";
import { formatUsdcAmount, truncHash } from "./format";

/** UI state = the four visible on-chain states ("None" rows are filtered out upstream). */
export type UiDealState = "Funded" | "Delivered" | "Disputed" | "Resolved";

export interface UiDeal {
  id: string;
  title: string;
  buyer: string;
  seller: string;
  price: string;
  state: UiDealState;
  raw: DealView;
}

export interface UiOffer {
  id: string;
  title: string;
  seller: string;
  price: string;
  bonds: string;
  raw: OfferView;
}

// ---------------------------------------------------------------------------------------------
// Local spec registry. The protocol only carries keccak(spec) on-chain, and the Hub stores no
// human-readable title — so remember the spec text for offers authored in THIS browser and fall
// back to a derived label everywhere else.
// ---------------------------------------------------------------------------------------------

export interface OfferSpec {
  title: string;
  description: string;
  conditions: string;
}

const SPECS_KEY = "obulus.specs.v1";

function readSpecs(): Record<string, OfferSpec> {
  try {
    return JSON.parse(localStorage.getItem(SPECS_KEY) ?? "{}") as Record<string, OfferSpec>;
  } catch {
    return {};
  }
}

export function saveSpec(specHash: string, spec: OfferSpec): void {
  try {
    const all = readSpecs();
    all[specHash.toLowerCase()] = spec;
    localStorage.setItem(SPECS_KEY, JSON.stringify(all));
  } catch {
    // Storage unavailable (private mode) — labels simply stay derived.
  }
}

export function getSpec(specHash: string | undefined): OfferSpec | null {
  if (!specHash) return null;
  return readSpecs()[specHash.toLowerCase()] ?? null;
}

// ---------------------------------------------------------------------------------------------

export function isUiState(state: DealView["onchainState"]): state is UiDealState {
  return state === "Funded" || state === "Delivered" || state === "Disputed" || state === "Resolved";
}

function dealTitle(deal: DealView): string {
  const spec = getSpec(deal.specHash);
  if (spec?.title) return spec.title;
  return `Escrow ${truncHash(deal.dealId)}`;
}

function offerTitle(offer: OfferView): string {
  const spec = getSpec(offer.offer.specHash);
  if (spec?.title) return spec.title;
  return `Offer ${truncHash(offer.offerHash)}`;
}

export function toUiDeal(deal: DealView): UiDeal | null {
  if (!isUiState(deal.onchainState)) return null;
  return {
    id: deal.dealId,
    title: dealTitle(deal),
    buyer: deal.buyer,
    seller: deal.seller,
    price: formatUsdcAmount(deal.price),
    state: deal.onchainState,
    raw: deal,
  };
}

export function toUiDeals(deals: DealView[]): UiDeal[] {
  return deals
    .map(toUiDeal)
    .filter((d): d is UiDeal => d !== null)
    .sort((a, b) => (b.raw.updatedAt ?? "").localeCompare(a.raw.updatedAt ?? ""));
}

const MAX_UINT64 = 2n ** 64n - 1n;

/** An offer is fundable when unaccepted, unexpired, and open (or reserved for `viewer`). */
export function isOpenOffer(offer: OfferView, viewer?: string | null): boolean {
  if (offer.accepted) return false;
  const sigDeadline = BigInt(offer.offer.sigDeadline);
  // sigDeadline == 0 or absurd future values both mean "no practical expiry" to the contract check.
  if (sigDeadline !== 0n && sigDeadline <= MAX_UINT64 && Number(sigDeadline) <= Math.floor(Date.now() / 1000)) {
    return false;
  }
  const designated = offer.offer.buyer;
  if (designated !== "0x0000000000000000000000000000000000000000") {
    return Boolean(viewer && designated.toLowerCase() === viewer.toLowerCase());
  }
  return true;
}

export function toUiOffer(offer: OfferView): UiOffer {
  return {
    id: offer.offerHash,
    title: offerTitle(offer),
    seller: offer.offer.seller,
    price: formatUsdcAmount(offer.offer.price),
    bonds: `S ${formatUsdcAmount(offer.offer.sellerBond)} · B ${formatUsdcAmount(offer.offer.buyerBond)}`,
    raw: offer,
  };
}

export type { OnchainState };
