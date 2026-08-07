// End-to-end lifecycle against the real local stack: anvil (31337) + Hub in on-chain mode +
// the vite dev server. Three isolated wallet contexts play seller / buyer / arbiter.
// Stack prerequisites are in playwright.config.ts.
import { test, expect } from "@playwright/test";
import { newWalletPage, connectWallet, type WalletPage } from "./wallet";

const SELLER_KEY = "0x0000000000000000000000000000000000000000000000000000000000000002" as const;
const BUYER_KEY = "0x0000000000000000000000000000000000000000000000000000000000000003" as const;
const ARBITER_KEY = "0x0000000000000000000000000000000000000000000000000000000000000004" as const;
// dev-chain.mts funds these demo accounts; the Hub runs with ARBITER_ADDRESS = arbiter's address.
const ARBITER_ADDRESS = "0x1efF47bc3a10a45D4B230B5d10E37751FE6AA718";

const API = process.env.E2E_API_URL ?? "http://localhost:8787";

test.describe.configure({ mode: "serial" });

let seller: WalletPage;
let buyer: WalletPage;
let arbiter: WalletPage;

test.beforeAll(async ({ browser }) => {
  const health = (await (await fetch(`${API}/health`)).json()) as { mode: string };
  expect(health.mode, "the Hub must run in on-chain mode (see playwright.config.ts header)").toBe(
    "onchain",
  );
  seller = await newWalletPage(browser, SELLER_KEY, "Seller Wallet");
  buyer = await newWalletPage(browser, BUYER_KEY, "Buyer Wallet");
  arbiter = await newWalletPage(browser, ARBITER_KEY, "Arbiter Wallet");
});

test.afterAll(async () => {
  await seller?.close();
  await buyer?.close();
  await arbiter?.close();
});

async function closeTxDialog(p: WalletPage): Promise<void> {
  await p.page.getByRole("button", { name: "Done" }).click();
}

async function createOffer(title: string, price: string): Promise<void> {
  await seller.page.goto("/");
  await seller.page.getByRole("button", { name: "Create offer" }).first().click();
  await seller.page.getByLabel("Service title").fill(title);
  await seller.page.getByLabel("Description").fill("End-to-end verification job.");
  await seller.page.getByLabel("Price (USDC)").fill(price);
  await seller.page.getByLabel("Seller bond (USDC)").fill("10");
  await seller.page.getByLabel("Buyer bond (USDC)").fill("5");
  await seller.page.getByLabel("Arbiter address").fill(ARBITER_ADDRESS);
  await seller.page.getByRole("button", { name: "Sign & publish offer" }).click();
  await expect(seller.page.getByText("Offer published — it can now be funded")).toBeVisible();
}

/**
 * Buyer funds the offer priced `priceLabel` and lands on its deal page; returns the deal URL.
 * NOTE: offers are matched by price, not title — spec titles live in the AUTHOR's localStorage
 * only (the chain carries just keccak(spec)), so the buyer sees a derived "Offer 0x…" label.
 */
async function fundOffer(priceLabel: string): Promise<string> {
  await buyer.page.goto("/offers");
  const row = buyer.page
    .locator("div.divide-y > div")
    .filter({ has: buyer.page.getByText(priceLabel, { exact: true }) })
    .first();
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Fund" }).click();
  await buyer.page.waitForURL(/\/deals\/0x[0-9a-fA-F]{64}/);
  await closeTxDialog(buyer);
  await expect(buyer.page.getByText("Funded", { exact: true }).first()).toBeVisible();
  return new URL(buyer.page.url()).pathname;
}

async function deliverOn(dealPath: string, content: string): Promise<void> {
  await seller.page.goto(dealPath);
  await seller.page.getByRole("button", { name: "Mark delivered" }).click();
  await seller.page.getByLabel("Deliverable content").fill(content);
  await seller.page.getByLabel("Reference (optional)").fill("e2e-report.md");
  await seller.page.getByRole("button", { name: "Commit & deliver" }).click();
  await closeTxDialog(seller);
  await expect(seller.page.getByText("Delivered", { exact: true }).first()).toBeVisible();
}

test("board starts empty and the wallet connects with a live USDC balance", async () => {
  await buyer.page.goto("/");
  await expect(
    buyer.page.getByText("No deals yet").or(buyer.page.getByText("Deals in play")).first(),
  ).toBeVisible();

  await connectWallet(buyer.page);
  // Open the wallet menu: the balance is a real balanceOf read against MockUSDC.
  await buyer.page.locator("header").getByText(/^0x[0-9a-fA-F]{4}…/).click();
  await expect(buyer.page.getByText("Available balance")).toBeVisible();
  await expect(buyer.page.getByText("100,000 USDC")).toBeVisible();
  await buyer.page.keyboard.press("Escape");

  await connectWallet(seller.page);
  await connectWallet(arbiter.page);
});

test("happy path: sign → fund → deliver → confirm → withdraw", async () => {
  await createOffer("E2E research report", "120");

  const dealPath = await fundOffer("120 USDC");

  await deliverOn(dealPath, "# E2E deliverable\nAll conditions met.");
  await expect(
    seller.page.getByText("Delivery content relayed to the Hub for arbitration."),
  ).toBeVisible();

  // Buyer confirms — funds release to seller credits.
  await buyer.page.goto(dealPath);
  await buyer.page.getByRole("button", { name: "Confirm & release" }).click();
  await closeTxDialog(buyer);
  await expect(buyer.page.getByText("Resolved", { exact: true }).first()).toBeVisible();
  await expect(buyer.page.getByText("Settled.")).toBeVisible();

  // Seller withdraws the pull-payment credits.
  await seller.page.goto("/");
  await seller.page.locator("header").getByText(/^0x[0-9a-fA-F]{4}…/).click();
  await expect(seller.page.getByText("Withdrawable")).toBeVisible();
  await seller.page.getByRole("button", { name: "Withdraw" }).click();
  await closeTxDialog(seller);
});

test("dispute path: deliver → dispute with reason → arbiter resolves a split", async () => {
  await createOffer("E2E disputed job", "80");
  const dealPath = await fundOffer("80 USDC");
  await deliverOn(dealPath, "Half-finished work.");

  // Buyer disputes on-chain, the reason is relayed to the Hub.
  await buyer.page.goto(dealPath);
  await buyer.page.getByRole("button", { name: "Dispute", exact: true }).click();
  await buyer.page.getByLabel("Reason").fill("Deliverable does not match the agreed spec.");
  await buyer.page.getByRole("button", { name: "Dispute on-chain" }).click();
  await closeTxDialog(buyer);
  await expect(buyer.page.getByText("Disputed", { exact: true }).first()).toBeVisible();
  await expect(
    buyer.page.getByText("“Deliverable does not match the agreed spec.”"),
  ).toBeVisible();

  // The arbiter splits 50/50.
  await arbiter.page.goto(dealPath);
  await arbiter.page.getByRole("button", { name: "Resolve dispute" }).click();
  await arbiter.page.getByRole("button", { name: /^Resolve at 50% seller$/ }).click();
  await closeTxDialog(arbiter);
  await expect(arbiter.page.getByText("Resolved", { exact: true }).first()).toBeVisible();
  await expect(arbiter.page.getByText("50% seller / 50% buyer")).toBeVisible();
});
