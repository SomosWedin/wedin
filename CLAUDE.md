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

### Editing a gift after money has moved

`name`, `price` and the image live on the shared `Gift` catalog row, **not**
on `WishlistGift` (`Gift.eventId` is null for catalog gifts). So "editing a
gift" from the dashboard is never a plain field write: `editGiftWithWishlistGift`
(`actions/data/wishlist-gift.ts`) forks a private per-event `Gift` when the row
is `isDefault` or shared by more than one wishlist, then repoints
`WishlistGift.giftId` at the fork.

- `getWishlistGiftEditLockReason` (`lib/wishlist-gift-edit-lock.ts`) is the
  single source of truth for whether a gift is locked, and returns
  `received` (`isFullyPaid`, `groupGiftParts > 0`, or any `COMPLETED`
  transaction) → `reservation` (`reservedQuantity`/`reservedAmount` claimed by
  a live checkout, self-healing once `releaseExpiredHolds` expires the hold) →
  `manual` (organizer flipped "Recibido" by hand; reversible). Both the row UI
  and the server action call it — don't re-derive the condition anywhere else.
- **A lock never blocks the whole edit.** Name and image stay editable in every
  lock state; only price, quantity, gift type and category are frozen. A locked
  edit that changes nothing else short-circuits without a write.
- The lock is **not** enforced by rejecting the request. The form only
  _disables_ the money inputs, so the action pins `price`, `categoryId`,
  `isFavoriteGift`, `isGroupGift` and `quantity` to the stored row and ignores
  whatever the client sent. That pinning is the security boundary — a submitted
  price change on a locked gift is silently dropped, not honoured and not
  errored. Keep it that way if you add a field.
- A locked edit must also skip the `groupGiftParts`/`isFullyPaid` recompute;
  those belong to `applyTransactionStatusChange`. `updateWishlistGiftRecord`
  has a `locked` mode that writes only `giftId` for exactly this reason, and
  drops the conditional-`updateMany` guard along with it — that guard exists to
  protect the money fields, which the locked path never writes.
- **Renames are retroactive by design.** `Transaction` carries no gift-name
  snapshot and the "Regalos recibidos" ledger renders `wishlistGift.gift.name`
  live, so renaming a paid gift relabels money already collected. This was
  weighed and accepted (the motivating case is fixing typos and bad photos
  after guests start paying); don't add a snapshot column without asking.
- `deleteWishlistGift` bypasses the lock entirely — a couple can archive a gift
  with completed contributions (`isReceived: true`) even while it's locked for
  editing. Known, not a bug to fix in passing.

### Onboarding steps

The stepper can go backwards, so `User.onboardingStep` records the **furthest**
step reached, not the step being shown. The step currently rendered is
`viewStep`, `useState` in `components/onboarding/step-manager.tsx`, seeded from
the stored value once and never re-seeded (an effect syncing it forward would
yank a user out of a step they navigated back to).

- Step writes are monotonic. `actions/common/onboarding.ts` advances with a
  conditional `prismaClient.user.updateMany({ where: { onboardingStep: { lt: n } } })`
  — a plain `update` would rewind the record when someone re-submits an earlier
  step. Each action also refuses a step the user hasn't reached yet; the client
  clamp in `goToStep` is cosmetic and can't be the guard.
- **Step one never recreates the event.** Coming back to it updates
  `Event.eventTypeId` in place, so the wishlist and everything steps 2-4
  collected survive. `wishlist.create` + `event.create` run only when the user
  has no event at all. Switching a wedding to another type deletes the partner
  row, matched on `isPrimary: false` **and `email: null`** — Mongo has no
  cascade, and a partner who was later given an email may own
  `Account`/`Session`/`Payout` rows.
- Every step re-saves on "Continuar", so the writes have to be idempotent:
  step two updates an existing partner rather than creating a second one.
- The "Aún estamos decidiendo" checkboxes are **not persisted**.
  `lib/onboarding-defaults.ts` infers them from "past that step with nothing
  stored", and the actions write explicit `null`s so re-visiting a step can
  clear a location/date that was already saved. If that inference ever needs to
  be exact, the fix is two booleans on `Event`, not a cleverer guess.

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
  `/terminos-y-condiciones/[slug]` route, so replacing a document is an upload to
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
- Use as less comments as possible unless it is doing something not normal
