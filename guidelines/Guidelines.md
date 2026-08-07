# Obulus Layer — frontend specification

## 1. Product goal

Obulus Layer is a settlement interface for autonomous AI agents. The frontend must let users publish and fund offers, lock funds and bonds in escrow, track a delivery, verify a proof, open or follow a dispute, and finally settle the payment. The interface makes an on-chain process legible without adopting the speculative visual language of web3.

**Core principle:** the settlement contract is the source of truth. The frontend presents its state, prepares signatures and clearly explains the consequences of an action; it must never present local state as definitively settled before on-chain confirmation.

## 2. Current functional scope

| View | Route | Role |
| --- | --- | --- |
| Board | `/` | Control dashboard: metrics, active deals, settlement flow, activity and open offers. |
| Offers | `/offers` | Marketplace of off-chain signed offers and the entry point for creating one. |
| Create offer | modal | Publication form with price, bonds, delivery conditions and verification method. |
| Deals | `/deals` | Full list of relayed deals. |
| Deal detail | `/deals/:id` | Settlement file: participants, escrow, timeline, proof of delivery and state-dependent actions. |
| Disputes | `/disputes` | List of deals whose settlement is suspended pending verification or arbitration. |
| Docs | `/docs` | Concise explanation of the settlement model. |
| Wallet / transactions | global | Connection, network state, account menu and pending / confirmed / failed visual feedback. |

Data and transactions are currently demo mocks: `data.ts` holds the displayed records and `wallet.tsx` simulates connection and confirmation.

## 3. Flows and business rules to preserve

1. A seller creates an offer and signs it off-chain.
2. A buyer funds an offer: the price and the required bonds are locked in escrow.
3. The deal moves to **Funded**, then **Delivered** once the proof is submitted.
4. A verification method approves the delivery or leads to **Disputed**.
5. After resolution, the contract releases or redistributes the funds and the deal becomes **Resolved**.

Supported deal states: `Funded`, `Delivered`, `Disputed`, `Resolved`. Any extension must preserve an explicit source of truth and permitted transitions on the smart contract/indexer side.

## 4. Visual direction

- **Positioning:** premium fintech — clear, calm and utilitarian; Robinhood as the reference for intent, with no dark mode and no clichéd crypto imagery.
- **Background:** `#FAFAF8`.
- **Primary text:** `#212930`.
- **Primary accent:** lime `#CDFF00`, reserved for priority actions, confirmations and progress markers.
- **Surfaces:** white cards, thin `#E8ECE7` borders, near-imperceptible shadows.
- **Typeface:** Poppins (`400` to `800`), with addresses/identifiers in monospace.
- **Logo:** the official asset is `src/imports/logo_2.png`. It must be imported as a module (never via a literal URL) and kept `object-contain`.

Theme tokens stay centralized in `src/styles/theme.css`. Do not modify the token contract or the `@theme inline` mappings: the `bg-background`, `text-foreground` and `border-border` classes must keep compiling.

## 5. Interface system

- Desktop content width: `1240px` maximum; gutters `20px`, then `32px` from `sm` upward.
- Cards: generous radius (`rounded-2xl`), thin border, white background.
- Primary button: lime pill with dark text. At most one primary action per functional zone.
- Secondary button: bordered white pill.
- States: `StatePill` and transaction feedback must keep text + color + icon; never convey a state through color alone.
- Every screen must stay usable from ~320px up. Tables become condensed grids on mobile; navigation moves into the mobile menu.

## 6. Current architecture

- `src/app/App.tsx`: global providers and routes.
- `src/app/components/obulus/board.tsx`: dashboard and tables reused by the other pages.
- `src/app/components/obulus/deal-detail.tsx`: a deal's detail screen.
- `src/app/components/obulus/create-offer-modal.tsx`: offer form and preview.
- `src/app/components/obulus/wallet.tsx`: wallet context contract, buttons and transaction dialog.
- `src/app/components/obulus/data.ts`: types and demo fixtures.
- `src/app/components/obulus/pills.tsx`: states and address tags.
- `src/app/components/obulus/logo.tsx`: official logo and wordmark.

## 7. Moving to real data and wallets

1. Keep the `useWallet` API or evolve it atomically; wire up wagmi/viem for connection, network switching and signatures.
2. Replace the `runTx` timer with: transaction preparation → wallet signature → hash → receipt wait → error decoding → refresh of indexed data.
3. Replace the fixtures with an adapter layer (indexer/Supabase/API), typed against the contract structures and responsible for formatting amounts/addresses.
4. Hydrate `/deals/:id` from the URL parameter, with loading, not-found and network-error states.
5. Validate the form before signing; block negative values, inconsistent bonds and actions not permitted for the connected role.
6. Never store a private key, API secret or sensitive arbitration decision in the frontend bundle.

## 8. Quality bar for future changes

- Reuse the existing tokens and components before adding new styles.
- Preserve keyboard interactions, visible focus and accessible labels.
- Prefer Grid for page/table structures and Flex for internal alignment.
- Keep comments for meaningful product/technical boundaries; avoid commenting obvious JSX details.
- At minimum, test the wallet states, pending/failed/confirmed, mobile navigation, narrow screens and non-existent detail routes.
