// Mirrors of the Hub's public view shapes (backend/src/protocol/views.ts + messages.ts).
// Amounts are USDC base-6 decimal strings; timestamps are epoch seconds unless suffixed `At` ISO strings.

export type Address = `0x${string}`;
export type Hex = `0x${string}`;

/** The 13-field EIP-712 Offer as it travels over JSON (numbers as decimal strings). */
export interface OfferJson {
  seller: Address;
  buyer: Address;
  arbiter: Address;
  token: Address;
  price: string;
  buyerBond: string;
  sellerBond: string;
  deliverDeadline: string;
  confirmWindow: string;
  feeBps: number;
  specHash: Hex;
  nonce: string;
  sigDeadline: string;
}

export type OnchainState = "None" | "Funded" | "Delivered" | "Disputed" | "Resolved";

export interface DeliveryView {
  payloadHash: Hex;
  payloadRef: string;
  blobStored: boolean;
}

export interface AiAssessment {
  summary: string;
  buyerClaimStrength: "weak" | "mixed" | "strong";
  deliveryOnTime: boolean;
  hashMatches: boolean;
  hashMatchesState?: "match" | "mismatch" | "unknown";
  recommendedSellerBps: number;
  rationale: string;
  confidence: "low" | "medium" | "high";
  flags: string[];
  available: boolean;
}

export interface DisputeView {
  reason: string;
  evidenceRef: string;
  status: "open" | "triaged" | "resolved";
  aiAssessment?: AiAssessment;
  resolvedSellerBps?: number;
  resolveTxHash?: Hex;
  hasArbiterKey: boolean;
  attestationUid?: Hex;
}

export interface DealView {
  dealId: Hex;
  offerHash?: Hex;
  buyer: Address;
  seller: Address;
  arbiter: Address;
  price: string;
  buyerBond: string;
  sellerBond: string;
  feeBps: number;
  deliverDeadline: number;
  confirmWindow: number;
  deliveredAt?: number;
  disputedAt?: number;
  deliveryHash?: Hex;
  specHash?: Hex;
  onchainState: OnchainState | string;
  sellerBps?: number;
  buyerEncPubKey?: Hex;
  attestationUid?: Hex;
  delivery?: DeliveryView;
  dispute?: DisputeView;
  createdAt?: string;
  updatedAt?: string;
}

export interface OfferView {
  offerHash: Hex;
  offer: OfferJson;
  signature: Hex;
  createdAt: string;
  dealId?: Hex;
  accepted?: boolean;
}

export interface ChainStatus {
  chainId: number;
  escrow: Address;
  usdc: Address;
  head: number;
  lastIndexedBlock: number;
  lagBlocks: number;
  simulated: boolean;
}

export interface HealthStatus {
  ok: boolean;
  ai: boolean;
  mode: "onchain" | "simulated";
  simulated: boolean;
}
