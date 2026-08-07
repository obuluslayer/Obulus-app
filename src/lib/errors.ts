import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError } from "viem";
import { ApiError } from "./api";
import { ASSET_SYMBOL } from "./format";

/** Human message for each IEscrow custom error name. */
const CONTRACT_ERRORS: Record<string, string> = {
  WrongState: "The deal is no longer in the required state — it may have just advanced.",
  NotBuyer: "Only the deal's buyer can do this.",
  NotSeller: "Only the deal's seller can do this.",
  NotArbiter: "Only the designated arbiter can resolve this deal.",
  NotDesignatedBuyer: "This offer is reserved for a specific buyer.",
  DealExists: "This offer has already been funded.",
  BadSignature: "The offer signature is invalid for this chain and contract.",
  OfferExpired: "The offer's signature deadline has passed.",
  InvalidDeadline: "The delivery deadline must be in the future.",
  DeadlinePassed: "The delivery deadline has passed.",
  DeadlineNotReached: "That deadline has not been reached yet.",
  WindowNotElapsed: "The confirmation window is still open.",
  WindowElapsed: "The confirmation window has already closed.",
  InvalidBps: "The split must be between 0 and 10 000 bps.",
  FeeTooHigh: "The protocol fee exceeds the allowed maximum.",
  ArbFeeTooHigh: "The arbitration fee exceeds the allowed maximum.",
  TokenMismatch: `The offer's token is not this escrow's ${ASSET_SYMBOL}.`,
  NonceCancelled: "The seller cancelled this offer.",
  ZeroAddress: "An address parameter is empty.",
  NothingToWithdraw: "You have no withdrawable balance.",
};

/** Flatten any wallet / RPC / contract / Hub error into one readable sentence. */
export function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.statusCode === 501) {
      return "The Hub is in on-chain mode: this action is signed by your wallet, not the Hub.";
    }
    return error.message;
  }
  if (error instanceof BaseError) {
    if (error.walk((e) => e instanceof UserRejectedRequestError)) {
      return "Signature rejected in the wallet.";
    }
    const revert = error.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) {
      const name = revert.data?.errorName ?? revert.reason;
      if (name && CONTRACT_ERRORS[name]) return CONTRACT_ERRORS[name];
      if (name) return `Contract rejected the call: ${name}`;
      // ERC-20 reverts (insufficient balance/allowance) usually surface as plain reasons.
      return `The token transfer failed — check your ${ASSET_SYMBOL} balance and allowance.`;
    }
    return error.shortMessage;
  }
  if (error instanceof Error) return error.message;
  return "Unexpected error.";
}
