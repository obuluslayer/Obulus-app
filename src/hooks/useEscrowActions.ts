import { useMemo } from "react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { keccak256, toHex, erc20Abi } from "viem";
import { useConfig } from "wagmi";
import {
  getAccount,
  readContract,
  signTypedData,
  simulateContract,
  waitForTransactionReceipt,
  writeContract,
} from "wagmi/actions";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { appConfig } from "@/lib/config";
import { activeChain } from "@/lib/chains";
import { describeError } from "@/lib/errors";
import { formatUsdcAmount, nowSec, parseUsdc, ASSET_SYMBOL } from "@/lib/format";
import {
  OFFER_TYPE,
  ZERO_ADDRESS,
  computeOfferHash,
  escrowAbi,
  escrowDomain,
  offerToTuple,
} from "@/lib/protocol";
import { saveSpec, type OfferSpec } from "@/lib/adapters";
import type { Address, DealView, Hex, OfferJson, OfferView } from "@/lib/types";
import { useWallet } from "@/app/components/obulus/wallet";

export interface CreateOfferInput {
  title: string;
  description: string;
  conditions: string;
  /** Human USDC amounts, e.g. "300" or "12.50". */
  price: string;
  sellerBond: string;
  buyerBond: string;
  arbiter: string;
  /** Seconds from now until the seller must deliver once funded. */
  deliverWithinSec: number;
  /** Seconds the buyer has to confirm/dispute after delivery. */
  confirmWindowSec: number;
  /** Unix seconds after which the unsigned offer can no longer be funded. */
  sigDeadline: number;
}

export interface DeliverInput {
  /** The deliverable itself (text). Hashed with keccak256 as the on-chain commitment. */
  content: string;
  /** Optional pointer (URL, CID…) stored off-chain next to the blob. */
  payloadRef: string;
}

/**
 * Every on-chain mutation of the escrow lifecycle: simulate → sign → wait receipt →
 * refresh queries → best-effort Hub relay, all reporting into the wallet TxController.
 */
export function useEscrowActions() {
  const wagmiConfig = useConfig();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { connected, connect, wrongNetwork, switchNetwork, txController, closeTx } = useWallet();

  return useMemo(() => {
    const escrow = appConfig.escrowAddress;
    const usdc = appConfig.usdcAddress;

    function invalidate(...keys: string[]) {
      for (const key of keys) void queryClient.invalidateQueries({ queryKey: [key] });
    }

    /** Common gate: wallet connected, right network, contracts configured. */
    function gate(): Address | null {
      if (!connected) {
        connect();
        return null;
      }
      if (wrongNetwork) {
        switchNetwork();
        toast.info(`Switch your wallet to ${activeChain.name} first.`);
        return null;
      }
      if (!escrow || !usdc) {
        toast.error("Contract addresses are not configured for this deployment yet.");
        return null;
      }
      return (getAccount(wagmiConfig).address as Address | undefined) ?? null;
    }

    /** Ensure `spender` may pull `amount` of USDC; runs an exact-scope approve when short. */
    async function ensureAllowance(owner: Address, amount: bigint, stepLabel: string) {
      if (amount === 0n) return;
      const current = await readContract(wagmiConfig, {
        abi: erc20Abi,
        address: usdc!,
        functionName: "allowance",
        args: [owner, escrow!],
      });
      if (current >= amount) return;
      txController.step(1, stepLabel);
      const sim = await simulateContract(wagmiConfig, {
        abi: erc20Abi,
        address: usdc!,
        functionName: "approve",
        args: [escrow!, amount],
        account: owner,
      });
      const hash = await writeContract(wagmiConfig, sim.request);
      txController.pending(hash);
      const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });
      if (receipt.status !== "success") throw new Error(`${ASSET_SYMBOL} approval reverted.`);
    }

    type EscrowWrite = "markDelivered" | "confirm" | "dispute" | "claimTimeout" | "refundExpired" | "resolveExpired" | "resolve" | "withdraw";

    async function escrowWrite(
      owner: Address,
      functionName: EscrowWrite,
      args: readonly unknown[],
      opts: { step?: [number, string] } = {},
    ): Promise<Hex> {
      if (opts.step) txController.step(...opts.step);
      else txController.signing();
      const sim = await simulateContract(wagmiConfig, {
        abi: escrowAbi,
        address: escrow!,
        functionName,
        args: args as never,
        account: owner,
      });
      const hash = await writeContract(wagmiConfig, sim.request);
      txController.pending(hash);
      const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });
      if (receipt.status !== "success") throw new Error("Transaction reverted.");
      return hash;
    }

    return {
      /** Seller signs an offer (zero gas) and relays it to the Hub. */
      async createOffer(input: CreateOfferInput): Promise<Hex | null> {
        const account = gate();
        if (!account) return null;
        try {
          const price = parseUsdc(input.price);
          const sellerBond = input.sellerBond ? parseUsdc(input.sellerBond) : 0n;
          const buyerBond = input.buyerBond ? parseUsdc(input.buyerBond) : 0n;
          if (price <= 0n) throw new Error("Price must be greater than zero.");
          if (!/^0x[0-9a-fA-F]{40}$/.test(input.arbiter)) {
            throw new Error("Arbiter must be a valid address.");
          }
          if (input.arbiter.toLowerCase() === account.toLowerCase()) {
            throw new Error("The arbiter must be a third party, not the seller.");
          }
          if (input.deliverWithinSec <= 0) throw new Error("Delivery time must be positive.");
          if (input.confirmWindowSec <= 0) throw new Error("Confirmation window must be positive.");
          if (input.sigDeadline <= nowSec()) throw new Error("Offer expiry must be in the future.");

          const spec: OfferSpec = {
            title: input.title.trim(),
            description: input.description.trim(),
            conditions: input.conditions.trim(),
          };
          const specHash = keccak256(toHex(JSON.stringify(spec)));

          const offer: OfferJson = {
            seller: account,
            buyer: ZERO_ADDRESS,
            arbiter: input.arbiter as Address,
            token: appConfig.usdcAddress!,
            price: price.toString(),
            buyerBond: buyerBond.toString(),
            sellerBond: sellerBond.toString(),
            deliverDeadline: String(nowSec() + input.deliverWithinSec),
            confirmWindow: String(input.confirmWindowSec),
            feeBps: 100,
            specHash,
            nonce: String(Date.now()),
            sigDeadline: String(input.sigDeadline),
          };

          txController.start("Publishing offer");
          const signature = await signTypedData(wagmiConfig, {
            domain: escrowDomain(activeChain.id, escrow!),
            types: OFFER_TYPE,
            primaryType: "Offer",
            message: offerToTuple(offer),
          });
          const { offerHash } = await api.postOffer({ offer, signature });
          saveSpec(offer.specHash, spec);
          invalidate("offers");
          closeTx();
          toast.success("Offer published — it can now be funded by any agent.");
          return offerHash;
        } catch (error) {
          txController.failed(describeError(error));
          return null;
        }
      },

      /** Buyer funds a signed offer: exact-scope approve (if needed) then Escrow.fund. */
      async fundOffer(offerView: OfferView): Promise<Hex | null> {
        const account = gate();
        if (!account) return null;
        const { offer, signature } = offerView;
        try {
          const total = BigInt(offer.price) + BigInt(offer.buyerBond);
          const sigDeadline = Number(offer.sigDeadline);
          if (sigDeadline > 0 && sigDeadline <= nowSec()) {
            throw new Error("The offer's signature deadline has passed.");
          }
          if (
            offer.buyer !== ZERO_ADDRESS &&
            offer.buyer.toLowerCase() !== account.toLowerCase()
          ) {
            throw new Error("This offer is reserved for a specific buyer.");
          }
          const balance = await readContract(wagmiConfig, {
            abi: erc20Abi,
            address: usdc!,
            functionName: "balanceOf",
            args: [account],
          });
          if (balance < total) {
            throw new Error(
              `You need ${formatUsdcAmount(total)} (price + buyer bond) but hold ${formatUsdcAmount(balance)}.`,
            );
          }

          txController.start("Funding the deal", 2);
          await ensureAllowance(account, total, `Approve ${formatUsdcAmount(total)}`);

          txController.step(2, "Fund the escrow");
          const sim = await simulateContract(wagmiConfig, {
            abi: escrowAbi,
            address: escrow!,
            functionName: "fund",
            args: [offerToTuple(offer), signature],
            account,
          });
          const hash = await writeContract(wagmiConfig, sim.request);
          txController.pending(hash);
          const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });
          if (receipt.status !== "success") throw new Error("Funding transaction reverted.");

          const dealId = computeOfferHash(offer, activeChain.id, escrow!);
          invalidate("deals", "offers", "credits");
          txController.confirmed();
          navigate(`/deals/${dealId}`);
          return dealId;
        } catch (error) {
          txController.failed(describeError(error));
          return null;
        }
      },

      /** Seller commits the delivery hash on-chain, then relays the content to the Hub. */
      async markDelivered(deal: DealView, input: DeliverInput): Promise<boolean> {
        const account = gate();
        if (!account) return false;
        try {
          const content = input.content.trim();
          if (!content) throw new Error("Provide the deliverable content.");
          const payloadHash = keccak256(toHex(content));
          const bond = BigInt(deal.sellerBond);
          const steps = bond > 0n ? 2 : 1;

          txController.start("Submitting delivery", steps);
          if (bond > 0n) {
            await ensureAllowance(account, bond, `Approve seller bond ${formatUsdcAmount(bond)}`);
          }
          await escrowWrite(account, "markDelivered", [deal.dealId, payloadHash], {
            step: steps === 2 ? [2, "Commit the delivery"] : undefined,
          });
          invalidate("deals");
          txController.confirmed();

          try {
            await api.relayDelivery({
              dealId: deal.dealId,
              payloadHash,
              payloadRef: input.payloadRef.trim() || "inline",
              blobBase64: btoa(unescape(encodeURIComponent(content))),
            });
            toast.success("Delivery content relayed to the Hub for arbitration.");
          } catch (relayError) {
            toast.warning(
              `Delivered on-chain, but the content relay failed (${describeError(relayError)}). Use “Resend content” to retry.`,
            );
          }
          return true;
        } catch (error) {
          txController.failed(describeError(error));
          return false;
        }
      },

      /** Re-push the delivery content after an earlier relay failure (idempotent, first-write-wins). */
      async resendDelivery(deal: DealView, input: DeliverInput): Promise<boolean> {
        try {
          const content = input.content.trim();
          if (!content) throw new Error("Provide the deliverable content.");
          await api.relayDelivery({
            dealId: deal.dealId,
            payloadHash: keccak256(toHex(content)),
            payloadRef: input.payloadRef.trim() || "inline",
            blobBase64: btoa(unescape(encodeURIComponent(content))),
          });
          invalidate("deals");
          toast.success("Delivery content relayed to the Hub.");
          return true;
        } catch (error) {
          toast.error(describeError(error));
          return false;
        }
      },

      /** Buyer releases the escrow. */
      async confirmDeal(deal: DealView): Promise<boolean> {
        const account = gate();
        if (!account) return false;
        try {
          txController.start("Confirming delivery");
          await escrowWrite(account, "confirm", [deal.dealId]);
          invalidate("deals", "credits");
          txController.confirmed();
          return true;
        } catch (error) {
          txController.failed(describeError(error));
          return false;
        }
      },

      /** Buyer opens a dispute on-chain, then relays the reason to the Hub. */
      async disputeDeal(deal: DealView, reason: string, evidenceRef?: string): Promise<boolean> {
        const account = gate();
        if (!account) return false;
        try {
          const trimmed = reason.trim();
          if (trimmed.length < 1 || trimmed.length > 4096) {
            throw new Error("Give a dispute reason (1–4096 characters).");
          }
          txController.start("Opening dispute");
          await escrowWrite(account, "dispute", [deal.dealId]);
          invalidate("deals", "disputes");
          txController.confirmed();

          try {
            await api.relayDispute({
              dealId: deal.dealId,
              reason: trimmed,
              evidenceRef: evidenceRef?.trim() || undefined,
            });
            toast.success("Dispute details relayed to the arbiter.");
          } catch (relayError) {
            toast.warning(
              `Disputed on-chain, but the reason relay failed (${describeError(relayError)}). Use “Send details” to retry.`,
            );
          }
          return true;
        } catch (error) {
          txController.failed(describeError(error));
          return false;
        }
      },

      /** Re-push the dispute reason after an earlier relay failure. */
      async resendDispute(deal: DealView, reason: string, evidenceRef?: string): Promise<boolean> {
        try {
          const trimmed = reason.trim();
          if (trimmed.length < 1) throw new Error("Give a dispute reason.");
          await api.relayDispute({
            dealId: deal.dealId,
            reason: trimmed,
            evidenceRef: evidenceRef?.trim() || undefined,
          });
          invalidate("deals", "disputes");
          toast.success("Dispute details relayed to the arbiter.");
          return true;
        } catch (error) {
          toast.error(describeError(error));
          return false;
        }
      },

      /** Anyone, after deliveredAt + confirmWindow: release to the seller. */
      async claimTimeout(deal: DealView): Promise<boolean> {
        const account = gate();
        if (!account) return false;
        try {
          txController.start("Claiming timeout release");
          await escrowWrite(account, "claimTimeout", [deal.dealId]);
          invalidate("deals", "credits");
          txController.confirmed();
          return true;
        } catch (error) {
          txController.failed(describeError(error));
          return false;
        }
      },

      /** Anyone, after the deliver deadline with no delivery: refund the buyer. */
      async refundExpired(deal: DealView): Promise<boolean> {
        const account = gate();
        if (!account) return false;
        try {
          txController.start("Refunding expired deal");
          await escrowWrite(account, "refundExpired", [deal.dealId]);
          invalidate("deals", "credits");
          txController.confirmed();
          return true;
        } catch (error) {
          txController.failed(describeError(error));
          return false;
        }
      },

      /** Anyone, once the arbiter sat out the resolve timeout: fallback split. */
      async resolveExpired(deal: DealView): Promise<boolean> {
        const account = gate();
        if (!account) return false;
        try {
          txController.start("Resolving expired dispute");
          await escrowWrite(account, "resolveExpired", [deal.dealId]);
          invalidate("deals", "disputes", "credits");
          txController.confirmed();
          return true;
        } catch (error) {
          txController.failed(describeError(error));
          return false;
        }
      },

      /** Arbiter splits the disputed funds: sellerBps to the seller, the rest back to the buyer. */
      async resolveDeal(deal: DealView, sellerBps: number): Promise<boolean> {
        const account = gate();
        if (!account) return false;
        try {
          if (!Number.isInteger(sellerBps) || sellerBps < 0 || sellerBps > 10_000) {
            throw new Error("The split must be between 0 and 10 000 bps.");
          }
          txController.start("Resolving dispute");
          await escrowWrite(account, "resolve", [deal.dealId, sellerBps]);
          invalidate("deals", "disputes", "credits");
          txController.confirmed();
          return true;
        } catch (error) {
          txController.failed(describeError(error));
          return false;
        }
      },

      /** Pull-payment: move the caller's credited balance back to their wallet. */
      async withdrawCredits(): Promise<boolean> {
        const account = gate();
        if (!account) return false;
        try {
          txController.start("Withdrawing credits");
          await escrowWrite(account, "withdraw", []);
          invalidate("credits");
          txController.confirmed();
          return true;
        } catch (error) {
          txController.failed(describeError(error));
          return false;
        }
      },

      /** Advisory AI triage refresh (arbiter view). */
      async runTriage(dealId: Hex): Promise<boolean> {
        try {
          await api.triage(dealId);
          invalidate("deals", "disputes");
          toast.success("AI triage updated (advisory only).");
          return true;
        } catch (error) {
          toast.error(describeError(error));
          return false;
        }
      },
    };
  }, [wagmiConfig, queryClient, navigate, connected, connect, wrongNetwork, switchNetwork, txController, closeTx]);
}
