// Vendored protocol surface (mirror of sdk/src/types.ts + sdk/src/abi.ts + contracts/src/interfaces/IEscrow.sol).
// The agent SDK itself is Node-only (private-key constructor, Buffer) and must never enter this bundle;
// these ~150 lines are the browser-safe subset, with the contract's custom errors added so viem can
// decode reverts into named errors.

import { hashTypedData, type TypedDataDomain } from "viem";
import type { Address, Hex, OfferJson } from "./types";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;
export const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex;

/// EIP-712 domain — MUST match the contract: EIP712("Obulus", "1").
export function escrowDomain(chainId: number, escrow: Address): TypedDataDomain {
  return { name: "Obulus", version: "1", chainId, verifyingContract: escrow };
}

/// The on-chain Offer struct — field order and types MUST match Escrow.OFFER_TYPEHASH (13 fields).
export const OFFER_TYPE = {
  Offer: [
    { name: "seller", type: "address" },
    { name: "buyer", type: "address" },
    { name: "arbiter", type: "address" },
    { name: "token", type: "address" },
    { name: "price", type: "uint256" },
    { name: "buyerBond", type: "uint256" },
    { name: "sellerBond", type: "uint256" },
    { name: "deliverDeadline", type: "uint64" },
    { name: "confirmWindow", type: "uint64" },
    { name: "feeBps", type: "uint16" },
    { name: "specHash", type: "bytes32" },
    { name: "nonce", type: "uint256" },
    { name: "sigDeadline", type: "uint64" },
  ],
} as const;

/// Canonical tuple for EIP-712 hashing/signing AND fund() calldata (decimal strings → bigint).
export function offerToTuple(o: OfferJson) {
  return {
    seller: o.seller,
    buyer: o.buyer,
    arbiter: o.arbiter,
    token: o.token,
    price: BigInt(o.price),
    buyerBond: BigInt(o.buyerBond),
    sellerBond: BigInt(o.sellerBond),
    deliverDeadline: BigInt(o.deliverDeadline),
    confirmWindow: BigInt(o.confirmWindow),
    feeBps: o.feeBps,
    specHash: o.specHash,
    nonce: BigInt(o.nonce),
    sigDeadline: BigInt(o.sigDeadline),
  };
}

/// The EIP-712 hash of an Offer under the escrow domain — by construction this IS the on-chain dealId.
export function computeOfferHash(offer: OfferJson, chainId: number, escrow: Address): Hex {
  return hashTypedData({
    domain: escrowDomain(chainId, escrow),
    types: OFFER_TYPE,
    primaryType: "Offer",
    message: offerToTuple(offer),
  });
}

const offerComponents = [
  { name: "seller", type: "address" },
  { name: "buyer", type: "address" },
  { name: "arbiter", type: "address" },
  { name: "token", type: "address" },
  { name: "price", type: "uint256" },
  { name: "buyerBond", type: "uint256" },
  { name: "sellerBond", type: "uint256" },
  { name: "deliverDeadline", type: "uint64" },
  { name: "confirmWindow", type: "uint64" },
  { name: "feeBps", type: "uint16" },
  { name: "specHash", type: "bytes32" },
  { name: "nonce", type: "uint256" },
  { name: "sigDeadline", type: "uint64" },
] as const;

/// IEscrow.sol's custom errors — REQUIRED for viem to populate errorName on reverts.
const escrowErrors = [
  {
    type: "error",
    name: "WrongState",
    inputs: [
      { name: "dealId", type: "bytes32" },
      { name: "expected", type: "uint8" },
      { name: "actual", type: "uint8" },
    ],
  },
  { type: "error", name: "NotBuyer", inputs: [] },
  { type: "error", name: "NotSeller", inputs: [] },
  { type: "error", name: "NotArbiter", inputs: [] },
  { type: "error", name: "NotDesignatedBuyer", inputs: [] },
  { type: "error", name: "DealExists", inputs: [{ name: "dealId", type: "bytes32" }] },
  { type: "error", name: "BadSignature", inputs: [] },
  { type: "error", name: "OfferExpired", inputs: [] },
  { type: "error", name: "InvalidDeadline", inputs: [] },
  { type: "error", name: "DeadlinePassed", inputs: [] },
  { type: "error", name: "DeadlineNotReached", inputs: [] },
  { type: "error", name: "WindowNotElapsed", inputs: [] },
  { type: "error", name: "WindowElapsed", inputs: [] },
  { type: "error", name: "InvalidBps", inputs: [] },
  { type: "error", name: "FeeTooHigh", inputs: [] },
  { type: "error", name: "ArbFeeTooHigh", inputs: [] },
  { type: "error", name: "TokenMismatch", inputs: [] },
  { type: "error", name: "NonceCancelled", inputs: [] },
  { type: "error", name: "ZeroAddress", inputs: [] },
  { type: "error", name: "NothingToWithdraw", inputs: [] },
] as const;

export const escrowAbi = [
  ...escrowErrors,
  {
    type: "function",
    name: "fund",
    stateMutability: "nonpayable",
    inputs: [
      { name: "offer", type: "tuple", components: offerComponents },
      { name: "sellerSig", type: "bytes" },
    ],
    outputs: [{ name: "dealId", type: "bytes32" }],
  },
  {
    type: "function",
    name: "markDelivered",
    stateMutability: "nonpayable",
    inputs: [
      { name: "dealId", type: "bytes32" },
      { name: "deliveryHash", type: "bytes32" },
    ],
    outputs: [],
  },
  { type: "function", name: "confirm", stateMutability: "nonpayable", inputs: [{ name: "dealId", type: "bytes32" }], outputs: [] },
  { type: "function", name: "claimTimeout", stateMutability: "nonpayable", inputs: [{ name: "dealId", type: "bytes32" }], outputs: [] },
  { type: "function", name: "refundExpired", stateMutability: "nonpayable", inputs: [{ name: "dealId", type: "bytes32" }], outputs: [] },
  { type: "function", name: "resolveExpired", stateMutability: "nonpayable", inputs: [{ name: "dealId", type: "bytes32" }], outputs: [] },
  { type: "function", name: "dispute", stateMutability: "nonpayable", inputs: [{ name: "dealId", type: "bytes32" }], outputs: [] },
  {
    type: "function",
    name: "resolve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "dealId", type: "bytes32" },
      { name: "sellerBps", type: "uint16" },
    ],
    outputs: [],
  },
  { type: "function", name: "withdraw", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "cancelOffer", stateMutability: "nonpayable", inputs: [{ name: "nonce", type: "uint256" }], outputs: [] },
  { type: "function", name: "credits", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "feeBps", stateMutability: "view", inputs: [], outputs: [{ type: "uint16" }] },
  { type: "function", name: "resolveTimeout", stateMutability: "view", inputs: [], outputs: [{ type: "uint64" }] },
  {
    type: "function",
    name: "hashOffer",
    stateMutability: "view",
    inputs: [{ name: "offer", type: "tuple", components: offerComponents }],
    outputs: [{ type: "bytes32" }],
  },
] as const;
