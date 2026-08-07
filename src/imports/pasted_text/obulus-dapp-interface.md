Create a complete web dapp interface for Obulus Layer.

Context:
Obulus is a settlement layer for autonomous AI agents. The dapp lets users create offers, fund deals, lock escrow, track delivery, verify outcomes, resolve disputes, and settle payments. The current app is a dark dashboard with tables for “Deals in play” and “Open & recent offers”, but we need a full redesign using the new Obulus brand direction.

Brand direction:
Robinhood-inspired fintech, clean, bright, premium, confident.
Do NOT make it generic SaaS.
Do NOT use dark mode as the main theme.
Do NOT use blue, purple, crypto gradients, neon cyberpunk, robots, coins, or web3 cliché visuals.

Colors:
- Background: off-white / soft white, around #FAFAF8
- Main text: #212930
- Primary accent: #CDFF00
- Cards: white with very subtle borders #E8ECE7
- Muted text: rgba(33,41,48,0.62)
- Success: use #CDFF00 with dark text
- Warning/dispute: use soft amber, but keep it minimal
- Error: use restrained red only for critical states

Typography:
Use Poppins or a very close geometric sans-serif.
Large headings should be bold, rounded, and fintech-like.
Body text should be clean, readable, and not too small.
Avoid tiny uppercase SaaS labels everywhere.

Logo:
Use the Obulus mark and wordmark.
Logo color should be #212930.
Use the Obulus symbol as a subtle abstract background pattern in #CDFF00 when needed.

Overall layout:
Build a desktop-first dapp dashboard, but make it responsive for tablet/mobile.
The dapp should feel like Robinhood meets a payment operations dashboard.
Clean, bright, spacious, but still functional and serious.

Main navigation:
Create a top horizontal navigation bar:
- Left: Obulus logo + wordmark
- Center nav: Board, Offers, Deals, Disputes, Docs
- Right: Network pill “Robinhood Chain”, wallet connect button, small user/account menu

Primary screen: Board / Dashboard
This is the main screen.

Hero/status area:
- Big heading: “Settlement board”
- Subline: “Track offers, escrowed deals, disputes, and settlements in real time.”
- Right side: primary button “Create offer”
- Secondary button “View docs”

Top metrics cards:
Create 4 premium stat cards:
1. Active volume: “$1,870 USDC”
2. Active deals: “4”
3. Disputed: “1”
4. Resolved: “4”

The cards should be clean white cards with subtle shadows/borders.
Use #CDFF00 as small status dots, progress lines, or pill backgrounds.
Do not overuse icons.

Main content split:
Left/main column:
Section title: “Deals in play”
Subtitle: “Every deal relayed by the Hub. The contract is the source of truth.”

Create a premium table with these columns:
- Deal
- Buyer
- Seller
- Price
- State
- Action

Rows:
- 0x48b1…2c8d / 0x6813…BA69 / 0x1efF…A718 / 100 USDC / Funded
- 0x48b1…046a / 0xE57b…1141 / 0xe1AB…b276 / 60 USDC / Delivered
- 0x48b1…99bc / 0x2B5A…D6cF / 0xd41c…6FBb / 420 USDC / Delivered
- 0x48b1…4c6a / 0x6813…BA69 / 0xd41c…6FBb / 420 USDC / Disputed
- 0x48b1…8cf5 / 0xd41c…6FBb / 0x6813…BA69 / 150 USDC / Resolved

Table design:
- White surface
- Rounded corners
- Clean row separators
- State pills:
  - Funded: lime pill
  - Delivered: white pill with lime dot
  - Disputed: amber pill
  - Resolved: dark text with subtle green/lime check
- Action button: “Open”
- Addresses should look like clean fintech account IDs, not developer raw data.

Right sidebar:
Create a “Settlement flow” card:
Steps:
1. Negotiate
2. Escrow
3. Verify
4. Settle

Use thin #212930 line icons and #CDFF00 check accents.
This should visually explain the Obulus mechanism.

Below it, create an “Activity” card:
- Offer funded
- Delivery submitted
- Escrow verified
- Settlement released
Use timestamps and small status dots.

Second section: Open & recent offers
Create a card/table titled “Open offers”
Subtitle: “Signed off-chain by sellers. Anyone can fund an open offer.”

Columns:
- Offer
- Seller
- Price
- Bonds
- Action

Rows:
- 0x7cf6…3d34 / 0xd41c…6FBb / 300 USDC / 30 / 150 USDC / Fund
- 0x5e5f…1fcb / 0x2B5A…D6cF / 120 USDC / 12 / 60 USDC / Fund
- 0x0262…a45a / 0xE57b…1141 / 80 USDC / 8 / 40 USDC / Fund

The “Fund” button should be a #CDFF00 pill with #212930 text.

Create offer flow:
Design a modal or dedicated panel titled “Create offer”.
Fields:
- Service title
- Description
- Price in USDC
- Seller bond
- Buyer bond
- Expiry
- Delivery conditions
- Verification method

Add a preview card on the right showing:
- Price
- Bonds
- Settlement path
- Expected flow: Created → Funded → Delivered → Verified → Settled

Deal detail screen:
Create a detailed deal page.
Header:
- Deal ID
- State pill
- Price
- Buyer
- Seller

Main timeline:
- Offer created
- Escrow funded
- Work delivered
- Verification pending / complete
- Settlement released

Cards:
- Escrow details
- Bonds
- Evidence / delivery
- Verification result
- Dispute panel if state is disputed

Dispute state:
Create a clean dispute card, not scary or red-heavy.
Title: “Dispute opened”
Text: “The settlement is paused until verification is complete.”
Buttons:
- Submit evidence
- View arbitration
- Resolve dispute

Wallet states:
Design the following states:
- Wallet not connected
- Connected wallet dropdown
- Wrong network
- Transaction pending
- Transaction confirmed
- Transaction failed

Empty states:
Create premium empty states for:
- No active deals
- No open offers
- No disputes
Use subtle Obulus symbol background and #CDFF00 accent.

Visual details:
- Use generous whitespace
- Use rounded cards, but avoid nested card overload
- Use subtle shadows only
- Use lime accent as functional status, not decoration everywhere
- Keep the UI sharp and credible
- Make tables feel modern and premium, not default HTML tables
- Add small microcopy that makes the dapp understandable to non-technical users

Important:
The dapp must feel like a real fintech product ready to launch, not a crypto dashboard.
It should be bright, accessible, clean, premium, and trustworthy.
The visual direction should match Obulus’ new Robinhood-inspired brand:
white background, #CDFF00 accent, #212930 text, Poppins typography, clean financial interface.

Deliver screens:
1. Main Board dashboard
2. Open offers view
3. Create offer modal
4. Deal detail page
5. Dispute detail state
6. Wallet connect / transaction states
7. Mobile responsive version of the main board

Make the final result polished enough to use as the basis for a production dapp.