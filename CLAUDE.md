# CLAUDE.md

Wedin — a wedding gift-list / registry web app (Next.js App Router).

## Product overview

Wedin lets a couple (or organizer, for non-wedding events) set up a public
event site where guests browse a gift catalog and "buy" gifts — but every
purchase is really a cash contribution: money accumulates in the couple's
wallet and gets withdrawn to their bank account, regardless of whether the
gift was a physical item, a honeymoon fund, or open-ended cash. It's a
cash-gifting/crowdfunding platform wrapped in a registry UI, targeting
Paraguay (prices shown in Gs./guaraníes).

Two sides of the app:

- **Organizer dashboard** (`(dashboard)` routes) — the couple runs onboarding
  (event type, couple profile, location, date →
  `actions/common/onboarding.ts`), edits the public site's "Presentación"
  (photos + welcome message), manages the "Mi lista" gift registry, sets
  general/bank details, and reviews a "Regalos recibidos" ledger with wallet
  withdrawal.
- **Guest-facing site** (`(default)` routes) — public per-event page where
  guests browse gifts by category (Casa / Luna de miel / Dinero), add to
  cart, and check out.

Gift types (domain concept, modeled on `WishlistGift` in `prisma/schema.prisma`):

- **Regalo individual** — one guest fully covers the price.
- **Regalo grupal** — multiple guests crowdfund toward the price
  (`groupGiftParts`, `isFullyPaid`).
- **Monto libre** — open-ended cash gift, no fixed price.

### Payments & transactions

- `Transaction.paymentMethod: PaymentMethod` — `CARD` (Pagopar hosted
  checkout, `lib/pagopar.ts`) or `BANK_TRANSFER` (manual: guest sees Wedin's
  own bank account + a WhatsApp link to send proof, staff confirm by hand).
  There's no per-gateway processor field — only Pagopar is implemented
  today, re-add one if/when a second card gateway actually exists (don't
  build it ahead of need). See `app/checkout/pagopar/result/[hash]/page.tsx` for why a
  hash-keyed landing route exists instead of reusing a slug-scoped one.
  `BANK_TRANSFER` never leaves the app either, but lands on
  `app/e/[slug]/checkout/transfer/page.tsx` (bank details + WhatsApp proof
  link), not a separate success page — an earlier `checkout/success/page.tsx`
  was dead code (never linked to) and was deleted.
- `Transaction.status` lifecycle: `OPEN` (card, pre-session) / `PENDING`
  (card, session created; or a submitted bank transfer awaiting proof) →
  `COMPLETED` or `FAILED`. All status changes go through
  `applyTransactionStatusChange` (`actions/data/transaction.ts`) — it's the
  single place that writes `TransactionStatusLog` and recomputes
  `WishlistGift.isFullyPaid`/`groupGiftParts`; never update
  `Transaction.status` directly.
- **`CARD` transactions should only ever be completed by the Pagopar
  webhook** (`app/api/webhooks/pagopar/route.ts`), never by a human — a
  `COMPLETED` status is what makes a gift look funded and counts toward the
  couple's withdrawable wallet balance (Phase 8's `getEventBalance`), and
  nothing reconciles that against what Pagopar actually processed. This is
  currently a convention, not an enforced guard — `/admin`'s status editor
  doesn't yet block it (see `app/admin/CLAUDE.md`). `BANK_TRANSFER`
  transactions have no automated path to `COMPLETED` at all; that's the one
  case staff are expected to set by hand.
- **Stock is held from the moment a checkout starts, not when it's paid.**
  `createTransactionsForCart` claims `WishlistGift.reservedAmount` /
  `reservedQuantity` up front, and `applyTransactionStatusChange` releases
  the claim only on `FAILED`/`REFUNDED`. An abandoned checkout would
  therefore hold the gift forever, so `releaseExpiredHolds`
  (`actions/data/reservation.ts`) expires stale holds by moving them to
  `FAILED`: card checkouts that never reached Pagopar after 3 min, card
  checkouts sitting at Pagopar after 30 min, bank transfers awaiting proof
  after 48 h. It's a lazy sweep — there is no cron in this project — so call
  it from every path that reads or claims those counters, not just from
  checkout. A guest who pays at Pagopar more than 30 min in lands on the
  already-released transaction and the webhook logs it for manual
  reconciliation instead of completing. Reviving a released transaction from
  `/admin` re-takes the slot under the same conditional claim the checkout
  uses, and is refused when the unit was resold in the meantime — otherwise
  one unit would end up with two `COMPLETED` transactions, both counting
  toward the withdrawable balance.

### Terminology (Spanish UI ↔ code/domain)

- regalo(s) → gift(s)
- lista de regalos / "Mi lista" → wishlist/registry
- billetera / retiro → wallet / withdrawal (cash-out to bank)
- transferencia → bank transfer/payout
- datos bancarios → bank details (payout account)
- evento → the wedding/event
- listas predefinidas / `Giftlist` → pre-built gift bundles/categories

Staff-only access (`/admin`) is documented in `app/admin/CLAUDE.md`.

## Conventions

- Formatting/linting: lint-staged runs Prettier then Biome (`biome.json`) on commit.
- New server-side logic goes in `actions/<domain>/`; matching validation in `schemas/`.
- MongoDB/Prisma gotchas (sparse `@unique` indexes, enum value migrations) are
  documented in `prisma/CLAUDE.md` — read it before touching `prisma/schema.prisma`.
- **Legal documents are PDFs in S3**, not code. `lib/terms/documents.ts` is the
  registry (object key + slug + titles) that drives the single
  `/bases-y-condiciones/[slug]` route, so replacing a document is an upload to
  `s3://somos-wedin/terms/` with no deploy, and adding one is a registry entry.
  Only `lib/server/terms-storage.ts` knows the bucket lives at AWS.
- One-off ops script conventions are documented in `scripts/CLAUDE.md`.
- **Testing an authenticated flow live**: there's no password/credentials
  provider — auth is Google, Facebook, or Resend magic-link email only (see
  `auth.ts`/`auth.config.ts`). Don't mint a raw session JWT to impersonate a
  user; that's a forged credential and gets (correctly) blocked. To log in
  as a real test account, either use an email address you can actually
  receive mail at and click the real magic link, or ask the user to log in
  and hand off.
