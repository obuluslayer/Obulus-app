import { defineConfig } from "@playwright/test";

// Prerequisite stack (see PRODUCTION.md §local verification / TESTNET.md):
//   anvil --port 8545 --chain-id 31337
//   npx tsx scripts/dev-chain.mts                     (repo root — deploys + writes env)
//   ARBITER_ADDRESS=0x1efF47bc3a10a45D4B230B5d10E37751FE6AA718 \
//   TREASURY_ADDRESS=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 npm run dev -w backend
// The vite dev server is started by Playwright itself (webServer below).
export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.PW_BASE_URL ?? "http://localhost:5173",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
