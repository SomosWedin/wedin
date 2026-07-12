# Wedin — Build Plan: Guest Checkout, Wallet & Wishlist Linking

## Context

Wedin's organizer dashboard (auth, onboarding, event settings, bank details)
is done, but the actual product — guest lands on the couple's page, "buys" a
gift as a cash contribution, couple withdraws the money — has zero code. No
guest route, no cart, no checkout, no payment integration, and the
`WishlistGift` join model that links a `Gift` to a couple's registry is
defined in `prisma/schema.prisma` but referenced nowhere in the app. Several
dashboard screens (`Mi lista`, `Regalos recibidos`, home checklist) are
static placeholders wired to nothing.

This plan sequences the work to make the guest → payment → wallet loop real,
using **dLocal Go** as the payment gateway and **true guest checkout**
(name/email only, no account).

Every fact below was independently re-verified by reading the current code
in this session (not carried over from an earlier draft): `prisma/schema.prisma`,
`middleware.ts`, `lib/routes.ts`, `actions/data/event.ts`, `actions/data/gift.ts`,
`actions/data/giftlist.ts`, `actions/upload-to-s3.ts`, `lib/s3.ts`, `schemas/form.ts`,
`schemas/params.ts`, `hooks/use-store.ts`, `hooks/dashboard/useUpdateBankDetails.ts`,
`components/dashboard/dashboard-{bank-details,wishlist,transactions,home}.tsx`,
`app/(default)/gifts/page.tsx`, `components/dialog/reset-event-cover-form-dialog.tsx`,
`actions/common/onboarding.ts`, `package.json`.

## Verified facts that shape this plan

- `Event.url String? @unique` and `EventUrlFormSchema` (`schemas/form.ts:142`)
  already exist; nothing reads/writes either. This is the couple's public
  site slug.
- `Event.giftAmounts String[]` already exists; `GiftAmountsFormSchema`
  (`schemas/form.ts:196`) models it as four discrete fields
  (`giftAmount1..4`) — map the four fields to the array on submit, don't
  change the Prisma field.
- `WishlistGiftCreateSchema`, `WishlistGiftEditSchema`,
  `WishlistGiftDeleteSchema`, `WishlistGiftsCreateSchema` (bulk) all exist
  in `schemas/form.ts`, unused anywhere. `GetwishlistGiftsParams`
  (`schemas/params.ts:3`) exists, unused. The validation layer for
  wishlist-gift linking is already written — only action/UI is missing.
- `TransactionEditSchema` (`schemas/form.ts:94`) exists but requires
  `status` (not optional) plus optional `notes` — an action that "just"
  updates notes must still pass the transaction's current status through.
  `GetTransactionsParams` exists, unused.
- Every `Event` already has a 1:1 `Wishlist` created at onboarding
  (`actions/common/onboarding.ts` creates the `Wishlist` row before the
  `Event` row, then sets `Event.wishlistId`) — Phase 2 never needs to
  create a `Wishlist`, only `WishlistGift` rows against the existing one.
- `middleware.ts`: `isPublicRoute` (line 25) is computed and never read
  again — confirmed dead code, only `protectedRoutes` (exact-string match,
  `lib/routes.ts`) is enforced. **Correction to the earlier draft**: the
  admin gate is *also* dead — `if (!isAdmin && isAdminRoute) { console.log(...) }`
  (middleware.ts:35-37) only logs, it never redirects. Any admin-only
  surface built in this plan (Phase 8's future payout-approval route) is
  **not actually protected today** — treat `adminRoutes`/`isAdminRoute` as
  non-functional, don't rely on it as a real guard without fixing the
  `console.log` into a real redirect first, and call this out explicitly
  rather than silently inheriting broken protection.
- `lib/routes.ts`'s `publicRoutes` array contains `/events` (dead, since
  `isPublicRoute` is unread, and no `app/events` route folder exists) —
  this was the earlier draft's assumed guest-route path. **Corrected**:
  Phase 3's shipped `event-settings.tsx` field already commits the guest
  URL scheme to `wedin.com/e/{slug}` (label text: `wedin.com/e/`, confirmed
  live with the user), so Phase 4's new route is `app/e/[slug]`, not
  `app/events/[slug]`. No middleware change either way: `/e` is absent from
  `protectedRoutes` and `onboardingRoute`, so it's already reachable
  logged-out. Leave the dead `/events` entry in `publicRoutes` alone (or
  delete it as unused cleanup — not load-bearing either way).
- MongoDB gotcha, confirmed the hard way three times this session (`Image.giftId`,
  `Event.url`, `User.email`): an optional `@unique` field (`String? @unique`)
  needs its underlying index converted to `sparse: true` manually. Prisma's
  schema DSL has no `sparse` option, and `prisma db push` will not create or
  repair it — a non-sparse unique index only tolerates **one** document
  missing the field; the second throws `P2002`. Fix via raw Mongo commands
  (`$runCommandRaw` `dropIndexes` + `createIndexes` with `sparse: true`), and
  document the manual reindex commands as a comment above the field in
  `schema.prisma` (see `Image.giftId`, `Event.url`, `User.email` for the
  pattern to copy). **Apply this immediately** when Phase 1 adds
  `Transaction.dlocalPaymentId String? @unique` — it will hit the identical
  bug the moment a second `Transaction` exists without a completed payment.
- `getEvent()` in `actions/data/event.ts` is session-gated
  (`getCurrentUser()`); `getEventById(eventId)` looks up by ID only, no
  by-`url` lookup exists yet. The guest site needs new, deliberately
  unauthenticated read functions — never `getEvent()`.
- `TransactionStatusLog.changedById` is a **required** `User` FK
  (`schema.prisma:209`). A dLocal webhook has no authenticated user →
  make it optional (`String? @db.ObjectId`) rather than invent a "system"
  user row.
- No payment-gateway dependency, env var, or reference exists anywhere
  (verified via grep across the repo) — greenfield integration. `zustand`
  (^4.5.5), `resend` (^4.0.0), `nodemailer` (^6.9.15) are already installed
  but unused for this purpose.
- `app/api/` contains only `app/api/auth/[...nextauth]/route.ts` — a dLocal
  webhook route handler is this repo's second-ever API route.
- Server-side external-SDK wrapper convention, confirmed via
  `actions/upload-to-s3.ts`: a `'use server'` file instantiates the SDK
  client directly at module scope from `process.env.*` (no config
  abstraction), auth-checks via `auth()`, and returns `{ error }` /
  `{ success }`. `lib/dlocal.ts` should follow this shape exactly.
- Confirmed conventions to match everywhere below: server actions are
  `'use server'` files in `actions/<domain>/` returning `{ error }` /
  `{ success }`; Zod schemas in `schemas/`; forms use React Hook Form +
  `zodResolver` (`mode: 'all'`) wrapped in a `hooks/<domain>/` hook that
  manages `loading` manually (`useState`, no `useMutation` — see
  `hooks/dashboard/useUpdateBankDetails.ts`); reads happen in `async`
  Server Components calling actions directly (`dashboard-bank-details.tsx`
  pattern: `Suspense` + `lazy()`-loaded client form); lists are CSS-grid
  rows (`app/(default)/gifts/page.tsx`), not a table library; dialogs are
  raw shadcn `Dialog`/`AlertDialog` composed per-file
  (`components/dialog/reset-event-cover-form-dialog.tsx`), no shared
  wrapper; `WishlistGift.groupGiftParts` and `Transaction.amount` are both
  `String` in the schema — treat all money/part-count arithmetic as
  parse-then-format, matching that existing convention, don't switch to
  numeric Prisma fields.

## dLocal Go API research (verified from docs.dlocalgo.com, 2026-07-08)

Pulled directly from `docs.dlocalgo.com/integration-api` and its sub-pages
(Authentication, Payments, Create a payment, Retrieve a payment, Retrieve
currency exchange, Notifications, Paraguay country requirements). This
supersedes the "unknown ahead of time" framing in Phase 6 below — the shape
is now known; only sandbox credentials and live testing remain.

**Environments**
- Sandbox: `https://api-sbx.dlocalgo.com` (signup at `dashboard-sbx.dlocalgo.com/signup`)
- Live: `https://api.dlocalgo.com` (signup at `dashboard.dlocalgo.com/signup`)
- Sandbox test cards: success `4111 1111 1111 1111`, decline (Mastercard)
  `5555 5555 5555 4444`, any future expiry/any CVV. **Sandbox config does
  not carry over to live** — payment methods must be reconfigured on the
  live dashboard.

**Authentication**
- Every request: `Authorization: Bearer <API_KEY>:<SECRET_KEY>` (literal
  colon-joined pair as the bearer value, not two headers).
- Maps directly onto Phase 6's planned `DLOCAL_GO_API_KEY` /
  `DLOCAL_GO_SECRET_KEY` env vars and the `lib/dlocal.ts` module-scope
  client pattern.

**PYG / Paraguay specifics**
- `PYG` is a first-class supported currency — confirmed via
  `GET /v1/currency-exchanges`, which returns USD-relative rates for 17
  currencies including PYG (e.g. `source_currency: "USD", target_currency:
  "PYG", value: 8281.67550` in the docs' example — a live rate, refetch,
  don't hardcode).
- `POST /v1/payments` accepts `currency: "PYG"` directly and `country:
  "PY"` — no special-casing needed beyond passing these two fields; amounts
  are plain numbers in the given currency's minor-est display unit (PYG has
  no decimals in practice, but the payout-requirements page separately
  notes "amount decimals: 2" for the payout/payroll side, not payments —
  confirm actual PYG payment-amount rounding against a real sandbox
  response before assuming integer guaraníes).
- If `currency` doesn't match the payer's `country`, dLocal auto-converts
  at checkout — relevant if Wedin ever shows prices in a currency other
  than PYG for a PY event.
- Paraguay accepts payer `document_type` values `CI` (Cédula de Identidad)
  and `RUC`.
- The *payout* side (couple's bank withdrawal, i.e. Phase 8, though dLocal
  payouts are a distinct product from what Phase 8 currently scopes as
  "manual-admin-processed") requires: `CI` (7 numeric digits, no check
  digit) or `RUC` (8 digits, CI + check-digit algorithm), and a 16-digit
  numeric SIPAP bank account number, chosen from a fixed list of 40+
  Paraguayan bank codes (Banco Amambay=1 … Ueno Bank=48, including Itaú
  Paraguay, Banco General, Citibank N.A.). Payouts can be denominated in
  either PYG or USD. **This is a separate dLocal Go product/endpoint
  ("Payouts Integration") from the Payments API used for guest checkout —
  don't conflate the two when scoping Phase 8**; today Phase 8 stays
  manual (operator-processed), so this is reference-only unless Phase 8 is
  later upgraded to call dLocal's payout API directly.

**`POST /v1/payments` — create a payment**
- Request fields: `currency` (ISO-4217, required), `amount` (number,
  required), `country` (ISO 3166-1 alpha-2, optional — affects
  conversion), `order_id` (string ≤128 chars, auto-generated if omitted —
  good fit for `Transaction.id` or a cart batch id), `payment_type`
  (comma-separated subset of `CREDIT_CARD`/`DEBIT_CARD`/`BANK_TRANSFER`/`VOUCHER`
  to restrict methods shown), `max_installments`,
  `installments_fee_responsible` (`BUYER`|`MERCHANT`), `accepted_bins`/
  `rejected_bins`, `description` (≤100 chars), `expiration_type`/
  `expiration_value` (MINUTES/HOURS/DAYS), `success_url`/`back_url`/
  `notification_url` (each ≤2048 chars — maps to Phase 6's checkout
  page/webhook route), and a nested `payer` object (`id`, `name`, `email`,
  `phone`, `document_type`, `document`, `user_reference`, `address`).
  Payer fields become mandatory *at checkout* if omitted from the create
  call — Wedin's `GuestCheckoutSchema` (`payerName`, `payerEmail`) can stay
  minimal and let dLocal's hosted page collect the rest.
- Response (200): `id` (dLocal's payment id, e.g. `"DP-54354"`), `amount`,
  `currency`, `country`, `status: "PENDING"`, `redirect_url` (hosted
  checkout URL to send the guest to), `merchant_checkout_token`. `id` is
  the value to persist as `Transaction.dlocalPaymentId` from Phase 1.

**`GET /v1/payments/:payment_id` — retrieve a payment**
- `status` enum, confirmed exhaustive: `PENDING`, `PAID`, `REJECTED`,
  `CANCELLED`, `EXPIRED` (24-hour window). Phase 6's webhook handler should
  treat `PAID` as the "flip Transaction to COMPLETED" trigger — not
  `"completed"` as loosely assumed in the original plan text.
- Also returns `balance_amount`/`balance_fee`/`balance_currency` (net
  amount and dLocal's commission after fees — relevant for Phase 8's
  wallet-balance math if the wallet should reflect net-of-fee rather than
  gross), `payment_method_type`, `created_date`/`approved_date`,
  `redirect_url` (expires in 24h), `payer` object, `card` object
  (BIN/issuer/last4), `rejected_reason`.

**Notifications (webhook)**
- dLocal POSTs a **minimal** payload to `notification_url`:
  `{"payment_id": "DP-283"}` only — no status included. The webhook
  handler *must* call `GET /v1/payments/:payment_id` back to learn the
  real status before updating `Transaction`. This directly changes Phase
  6's webhook route: it's a fetch-then-update, not a parse-payload-and-update.
- Signature verification: header `Authorization: V2-HMAC-SHA256,
  Signature: <hex>`, computed as `HMAC-SHA256(ApiKey + JsonPayload,
  SecretKey)` (API key and raw JSON body concatenated as the message,
  secret key as the HMAC key). Since this needs the *raw* request body,
  the Next.js route handler must call `request.text()` first and verify
  against that exact string before `JSON.parse`-ing — parsing first and
  re-stringifying will break the signature match if key order/whitespace
  differs.
- Non-200 responses are retried every 10 minutes for up to 30 days — the
  webhook handler must be idempotent (already planned in Phase 6) and
  should return 200 quickly, doing any slow work after acknowledging.
- There's a second, separate notification stream for **payouts** status
  changes (`payouts-integration/notifications`) — not needed unless Phase
  8 is upgraded to call dLocal payouts directly.

**Other endpoints available (not yet scoped into any phase, noted for
completeness)**: `GET /v1/payments` (paginated list, filterable by date
range/country/email), refunds (`create`/`retrieve`/`retrieve list`),
`GET .../chargebacks`, one-click upsell, recurring payments/links,
subscriptions (plans/executions/cancel), split payments, "transparent
checkout" (presumably an embedded/non-redirect flow, not yet read in
detail).

**Errors & rate limits**: dedicated `errors.md` (with
`payment-http-errors.md` / `refunds-http-errors.md` sub-pages) and
`rate-limits.md` exist but weren't fetched in this pass — read before
writing `lib/dlocal.ts`'s error handling in Phase 6.

## Phased plan

```
Phase 1 (schema) ─┬─> Phase 2 (wishlist linking) ─┬─> Phase 4 (guest site) ─> Phase 5 (cart) ─> Phase 6 (checkout+dLocal) ─┬─> Phase 7 (ledger) ─> Phase 8 (wallet)
                   └─> Phase 3 (event URL) ────────┘                                                                       │
                                                                                                                            │
Phase 9 (home progress) ─ depends only on Phase 3, otherwise parallel to 4-8, reads outputs of 2/7/8 once they land ───────┘
```

### Phase 1 — Schema foundations
One migration underpinning everything else.

- `Transaction`: add `payerName String?`, `payerEmail String?`,
  `dlocalPaymentId String? @unique` (exact field name to confirm against
  dLocal Go docs at implementation time — this is the webhook
  reconciliation key).
- `TransactionStatusLog.changedById`: `String @db.ObjectId` → `String? @db.ObjectId`,
  and its `changedBy` relation becomes optional accordingly.
- New model `Payout` + `enum PayoutStatus { REQUESTED PROCESSING COMPLETED REJECTED }`,
  FKs to `Event`, `BankDetails`, `User` (`requestedBy`) — needed by Phase 8,
  no equivalent exists today.
- No change to `Event.url` / `Event.giftAmounts` — reuse as-is.
- Run `yarn prisma generate` (MongoDB provider — no migration files, schema
  push only).
- Verify: `yarn prisma generate` succeeds; no type errors in existing files
  referencing `Transaction`/`TransactionStatusLog`.

### Phase 2 — Wishlist-gift linking ("Mi lista" + "Agregar a la lista")
CRUD wiring on top of already-complete `Gift` CRUD (`actions/data/gift.ts`)
and the already-written, unused Zod schemas above.

**Reference (Figma):**

![Mi lista de regalos](docs/plan-assets/phase2-mi-lista.png)
![Agregar regalo dialog](docs/plan-assets/phase2-agregar-regalo-dialog.png)

- New `actions/data/wishlist-gift.ts` (`'use server'`, mirrors
  `actions/data/gift.ts`'s shape): `getWishlistGifts`, `createWishlistGift`,
  `createWishlistGifts` (bulk), `editWishlistGift`, `deleteWishlistGift`,
  `getWishlistGift` (single lookup for "already in my list" badge state).
- Rewrite `app/(dashboard)/wishlist/page.tsx` /
  `components/dashboard/dashboard-wishlist.tsx` as an async Server
  Component (pattern: `dashboard-bank-details.tsx` — `getEvent()` then a
  data call, `Suspense` + `lazy()` client form/list) — real data replaces
  the current unconditional `EmptyState`.
- `app/(default)/gifts/page.tsx`: replace the hardcoded "No agregado" badge
  (line 109) with a real `isInWishlist` check per gift; wire "Agregar
  regalo" (line 113-116) to a client island calling `createWishlistGift`;
  wire "Crear regalo" (line 31-34, currently has no handler) to a new
  `components/dialog/create-gift-dialog.tsx` that calls the already-built
  but never-invoked `createGift` action, then `createWishlistGift`. Note:
  `getGifts()` (`actions/data/gift.ts:26`) hardcodes `isDefault: true` in
  its query — a newly created custom gift (`isDefault: false`) correctly
  won't reappear in this catalog list; it only needs to surface via
  `getWishlistGifts` on `/wishlist`, so no change needed there.
- New hook `hooks/dashboard/use-wishlist-gift.ts` (manual-loading pattern,
  matches `useUpdateBankDetails.ts`).
- Verify: adding a gift from `/gifts` makes it appear on `/wishlist` with
  correct favorite/group flags; removing it updates both views.

**Status: ✅ Done, plus a substantial post-implementation polish pass** driven
by manual review/feedback across several follow-up rounds. Everything below
was verified live (seeded test user + Playwright + direct DB checks), not
just typechecked.

Delivered as planned: `actions/data/wishlist-gift.ts`, `dashboard-wishlist.tsx`
rewrite (async Server Component + `Suspense`/`lazy()` list), `/gifts` wiring,
`hooks/dashboard/use-wishlist-gift.ts`.

Also added, beyond the original scope:
- `actions/data/category.ts` (`getCategories`) — needed for category
  `Select`s; not in the original plan text.
- **Gift image rendering was broken app-wide.** Seed data always had images
  (`faker.image.url()`); the bug was `getGifts`/`getGiftlists` never
  `include`-ing the `image` relation, and the UI never rendering it. Fixed
  in both places — any future list/table of `Gift`s should `include: {
  image: true }` from the start.
- **New route `/gifts/lists/[giftlistId]`** — the "Ver paquete" giftlist
  detail page didn't exist yet; built it (package summary, bulk "Agregar
  paquete completo", per-gift table). A natural extension of this phase,
  not originally scoped.
- **Confirm-before-add modal.** Clicking a catalog gift row (not just its
  button) now opens a pre-filled, editable "Agregar regalo" dialog
  (`components/dialog/add-existing-gift-dialog.tsx` +
  `components/dashboard/gift-row.tsx`) before it's added, instead of adding
  instantly.
- **Gift personalization pattern** (relevant to any future gift-editing
  UI): editing a catalog gift's name/price/category/image forks a
  personalized copy (`Gift.isEditedVersion: true`, `sourceGiftId`) rather
  than mutating the shared default catalog item — *unless* the linked gift
  is already a personal copy, in which case it edits in place (no
  duplicate proliferation on repeated edits). `GiftCreateSchema`/
  `createGift` and `editGift` were extended to support this (image upload
  via nested `image: { create/upsert }`, `sourceGiftId`). Used in both
  `add-existing-gift-dialog.tsx` and `edit-wishlist-gift-dialog.tsx`.
- **`/wishlist` and `/gifts` filters wired** (search, Estado, Categoria).
  `/wishlist` filters client-side against already-fetched data (small
  dataset, no round-trip needed); `/gifts` filters via URL search params
  (`components/dashboard/gifts-filter-bar.tsx`), since `getGifts`/
  `getGiftlists` already supported `name`/`category` params server-side.
- **Design pass**: shared badge components
  (`components/dashboard/gift-type-badge.tsx`, `gift-added-badge.tsx`,
  `gift-favorite-badge.tsx`) replacing plain icon+text. Fixed a bug where
  the Tipo column always showed "Regalo Grupal" (was reading
  `Gift.giftlistId`, which just means "belongs to a predefined package" —
  unrelated to individual/group funding, which is a `WishlistGift`-level
  concept that doesn't exist until a gift is actually added to someone's
  list). Removed a redundant duplicate "already added" indicator that
  appeared twice in the same row.
- **`app/not-found.tsx`** — no custom 404 existed anywhere in the app;
  added one (reuses `EmptyState` + the sidebar's wedin logo mark). Also
  fixed `getGiftlist()`, which used to `throw` on error instead of
  returning `null` (crashed with an unhandled Prisma error on a malformed
  ObjectId in the URL) — now matches the rest of the codebase's
  return-`null`-on-error convention, and the detail page redirects to
  `/gifts` instead of a raw 404.
- **Price validation bug fix**: `GiftFormSchema.price` validated string
  *length* (`max(10)`) while the error message claimed a numeric max of
  99,999,999 — anything up to ~10 digits silently passed. Now validates
  the actual numeric value via `.refine()`. Note:
  `TransactionCreateSchema.amount` and `CreateTransactionParams.amount`
  (`schemas/form.ts`, `schemas/params.ts`) have the identical bug but are
  unused until Phase 6 — worth the same fix when that phase wires them up.
- **`components/forms/common/price-input.tsx`** — new shared masked
  Guaraní-currency input (strips non-digits live, formats with `es-PY`
  thousand separators e.g. `2.000.000`). Reused across all three gift
  dialogs; reuse it for any future PYG amount input (e.g. Phase 6/8).

**Known gap discovered, not fixed (flagged, out of scope for this phase)**:
`tailwind.config.ts` never mapped the shadcn CSS-variable tokens (`primary`,
`input`, `ring`, etc.) that `styles/globals.css` defines. Pre-existing,
affects ~14 shadcn primitives project-wide — most of the app just never hit
it because it's styled with explicit custom Tailwind colors instead of the
shadcn defaults. Only patched locally for the new `Switch` component (uses
`success`/`gray200` instead of `primary`/`input`). Worth a real fix
(wiring the CSS vars into `tailwind.config.ts`) before adding more shadcn
components that lean on default theme colors.

### Phase 3 — Event URL/slug write-path
Small, blocks Phase 4.

- New action in `actions/data/event.ts`: `updateEventUrl(eventId, url)` —
  validate via `EventUrlFormSchema`, check uniqueness against `Event.url`,
  update, `revalidatePath`.
- New form + hook using `EventUrlFormSchema`, surfaced in event-settings
  (check Figma for placement — likely a "your site is at
  wedin.com/e/{url}" field near the other settings forms).
- Verify: setting a URL rejects duplicates with a friendly error; valid
  submission persists and is reflected in `getEventById`/new `getEventByUrl`.

**Status: ✅ Done**, live-verified (real login session, real dev DB, no
mocks), plus follow-up hardening beyond the original scope.

Delivered as planned: `updateEventUrl` action, `hooks/dashboard/use-event-url.ts`,
a "Dirección de tu evento" field placed top of `event-settings.tsx` (right
after Fecha del evento, confirmed with the user), prefixed `wedin.com/e/` —
**this is now the committed guest-route path for Phase 4**, see the
`/e/[slug]` correction in Verified Facts above.

Also fixed along the way (not originally scoped, discovered while starting
this phase):
- **The MongoDB sparse-index gotcha** (see Verified Facts above) — this is
  what caused the original "Error uploading event images" bug
  (`Image.giftId`), was proactively found and pre-fixed on `Event.url`
  before it could bite the new field, then resurfaced twice more: once when
  `Image.giftId`'s sparse flag reverted outside of `prisma db push` (cause
  not fully identified — confirmed `db push` itself doesn't revert it), and
  once on `User.email` (onboarding step 2's partner-user creation, which
  never sets an email). All three now documented in `schema.prisma` with
  manual reindex commands.
- **`updateProfileStepTwo` non-atomic write bug** (`actions/common/onboarding.ts`) —
  the primary-user update and partner-user create ran as two separate
  writes; if the second failed (e.g. the `User.email` sparse-index bug
  above), the first had already committed, silently advancing the user to
  onboarding step 3 with the partner's name lost. Now wrapped in
  `prismaClient.$transaction(...)` so both writes succeed or neither does.
- **`EventUrlFormSchema` hardened to be DNS-label-safe**: lowercase-normalize
  (`.transform()`), 63-char cap (down from 255), a proper DNS-label regex
  (alphanumeric start/end, no leading/trailing hyphen) replacing the old
  charset-only check, and a reserved-word blocklist (`www`, `app`, `api`,
  `admin`, `dashboard`, `wedin`, etc.). Not needed for the current
  path-based `/e/{slug}` routing — done so that a **future** move to
  `{slug}.wedin.app` subdomain routing (discussed, deferred — see below)
  doesn't require a data-model or validation rewrite, just a routing-layer
  change. Also fixed a real bug found in the process: `updateEventUrl`
  validated through the schema but then used the raw, un-normalized input
  for both the uniqueness check and the DB write, discarding the
  normalization.
- **Event-cover form reload anti-pattern removed** (`/event-details`,
  Presentación section — adjacent bug hunt, not Phase 3 itself): the form
  used to require a full page refresh after save to reset state; now the
  mutation response is used to explicitly sync `existingImages`/form state
  without reloading (see `hooks/dashboard/use-event-cover.ts`). Also fixed
  an unawaited-`Promise`-in-`.map()` bug in the same hook's image-replace
  path.

**Deferred, documented for later**: `{eventUrl}.wedin.app` subdomain routing
(instead of `wedin.com/e/{eventUrl}`) was evaluated and explicitly deferred.
Real upside (feels like "their own site," matches Notion/Substack-style
personalization), but real infra cost: wildcard DNS + wildcard TLS is a
hosting-provider dependency (e.g. Vercel's Wildcard Domains needs a paid
tier), needs the reserved-word blocklist above to avoid subdomain collisions
with real platform infrastructure, needs case-insensitive slug handling
(also done above), and preview/staging deployments don't get the wildcard
automatically. The schema hardening above keeps this option open cheaply;
actually building it is its own project, not part of this plan's phases.

### Phase 4 — Guest-facing public event site
Net-new route tree outside `(dashboard)`/`(default)`, never importing the
session-gated `getEvent()`.

**Reference (Figma)** — full guest flow in one frame: hero header, gift grid,
and the three "Agregar regalo" dialog states (fixed-price/group detail, monto
libre, cart):

![Guest hero, gift grid, and add-to-cart dialog states (fixed-price, monto libre, cart)](docs/plan-assets/phase4-guest-experience-full-flow.png)

- New `actions/data/public-event.ts` (`'use server'`, deliberately no
  `getCurrentUser()` call anywhere in the file): `getEventByUrl(slug)` — new
  function, not a rename of `getEventById` — and `getPublicWishlistGifts(eventId)`.
  Kept as a separate file from `actions/data/event.ts` so no session-gated
  function can accidentally leak into the public route tree.
- `app/e/[slug]/page.tsx` — resolves via `getEventByUrl`; `notFound()`
  if missing or "unpublished" (define published = `url` set AND ≥1
  `WishlistGift` row, reused by Phase 9's checklist logic).
- **Hero section**: render `event.coverMessage` + `event.images` (the same
  fields edited on the dashboard's Presentación screen) plus couple name(s)
  and date, above the catalog — matches the reference frame's header
  ("Crisley & Yayo", "Nos casamos el 14 de febrero de 2027", welcome message,
  "Ver los regalos" CTA). Part of `getEventByUrl`'s payload, not a separate
  fetch.
- Gift catalog section reuses the `Category`-filter/grid-row UI pattern from
  `app/(default)/gifts/page.tsx`, plus the reference frame's type filter
  (Todos / Regalo individual / Regalo grupal) and search/sort controls.
  Group-gift progress = sum of `COMPLETED` transactions for that
  `WishlistGift` vs. `gift.price` (both stored as `String`, parse before
  comparing) — rendered as the "Faltan: Gs. X / 30%" progress bar shown on
  grouped/favorite cards in the reference.
- **Gift detail is a dialog, not a page** — corrects the earlier draft of
  this phase, which assumed an undesigned detail route. The reference frame
  shows it as an "Agregar regalo" `Dialog` opened from a card's
  "Seleccionar monto" / "Agregar al carrito" button, with two variants:
  - **Fixed-price / group gift**: product image, title, price, group/favorite
    badges, progress bar, a contribution-amount input, and a "Completar el
    valor total del regalo" checkbox (pay the remaining balance in full).
  - **Monto libre**: no product image/price — a "Montos sugeridos" radio
    list (Gs. 100.000 / 500.000 / 1.000.000 / 5.000.000 / "Otro monto" with a
    free-text input). The preset amounts match `Event.giftAmounts` /
    `GiftAmountsFormSchema`'s four `giftAmount1..4` fields (already in the
    schema, unwired) — this dialog is the consumer of that data, not a new
    input surface.
  Both variants end in "Cancelar" / "Agregar al carrito" — added lines are
  cart entries (Phase 5), not immediate transactions.
- `app/e/layout.tsx` — minimal public layout, no dashboard chrome.
- Verify: visiting `/e/{url}` in a logged-out/incognito browser renders
  the event (hero + catalog) without redirecting to `/login`; opening a gift
  card's dialog shows the correct variant (fixed-price vs. monto libre) and
  "Agregar al carrito" adds the right line item.

**Status: ✅ Done** for fixed-price/group gifts, live-verified (Playwright
against the real dev DB, disposable test event created and torn down in a
`finally`-equivalent cleanup step, not just typechecked).

Delivered as planned: `actions/data/public-event.ts` (`getEventByUrl`,
`getPublicWishlistGifts`, no `getCurrentUser()` import), `app/e/layout.tsx`
(wedin logo + "Compartir lista" clipboard-copy button, reusing the same
`w-icon.svg` mark as `app/not-found.tsx`), `app/e/[slug]/page.tsx`
(`notFound()` when the event is missing or has zero `WishlistGift` rows),
hero (`components/guest/guest-hero.tsx` + `guest-image-carousel.tsx`, couple
name derived from `users` — primary + secondary `isPrimary` flag, same
convention as `event-settings.tsx`), and the gift catalog
(`components/guest/guest-gift-catalog.tsx` + `guest-gift-card.tsx`) with the
Todos/Individual/Grupal type filter, search, category and sort controls, and
the fixed-price/group "Detalles del producto" dialog
(`components/dialog/gift-contribution-dialog.tsx`).

**Scope correction made live with the user, before writing code**: the plan
text assumed a schema/UI mechanism for "monto libre" gifts existed or would
be obvious, but nothing in `prisma/schema.prisma`, the live dev DB, or
`prisma/seed.ts` marks a `Gift` as open-amount cash (no `Dinero` category, no
boolean flag, `Gift.price` is a required `String`) — a real gap the plan
never resolved. Confirmed with the user to **skip the monto libre dialog
variant for this pass**. Only the fixed-price/individual card (direct
"Agregar al carrito", full price, no dialog) and the group-gift card
("Seleccionar monto" → contribution dialog with progress bar + "Completar el
valor total del regalo" checkbox) are built. **Follow-up needed before monto
libre can be built**: decide how a `Gift` is marked open-amount (a new
`Gift.isOpenAmount Boolean` field was the recommended option, discussed but
not yet decided) — this also blocks wiring `Event.giftAmounts` /
`GiftAmountsFormSchema`'s four preset amounts into any UI, since that data
has no consumer yet.

Also decided/found during implementation, not in the original plan text:
- **Cart is deliberately not persisted yet.** "Agregar al carrito" appends to
  a local `useState` array inside `guest-gift-catalog.tsx` (confirmed via
  toast + Playwright) with no drawer, sticky bar, or localStorage — those are
  explicitly Phase 5's scope (`hooks/use-cart-store.ts` Zustand + persist).
  Building real cart UI now would either duplicate or conflict with Phase 5's
  planned architecture.
- **Individual vs. group dialog dispatch**: re-reading the Figma frame
  closely, only group gifts open a dialog at all — a fixed-price individual
  gift's "Agregar al carrito" adds the full price directly, no dialog step.
  The plan's dialog spec only documents the dialog's *contents*, not this
  dispatch rule, so it's called out here explicitly for Phase 5+ to rely on.
- **Already-fully-paid gifts** (`WishlistGift.isFullyPaid`) show a "Regalo
  recibido" badge and hide the CTA entirely (both card types) — not in the
  Figma reference (which has no example of this state) but a real guest-facing
  gap without it: a guest could otherwise try to contribute to a gift that's
  already fully funded.
- Reused existing conventions rather than introducing new ones: native
  `<select>` filter dropdowns (matches `gifts-filter-bar.tsx` /
  `dashboard-wishlist-list.tsx`, sidesteps the known unmapped
  shadcn-theme-token gap noted in Phase 2 rather than hitting it a second
  time), `Checkbox` used as-is like `StepThree`/`StepFour` (same unmapped-token
  gap, not fixed here — out of scope for this phase), `Progress` bar
  component as already used in `dashboard-home.tsx`.
- **Verified date-of-week discrepancy while testing was a test-data artifact,
  not a code bug**: seeding the test event's `date` via `new Date('2027-02-14')`
  (UTC midnight) and then formatting it with `date-fns` `format()` (local time)
  in Paraguay's UTC-3 offset displays "13 de febrero" — but this exactly
  mirrors `event-settings.tsx`'s existing `format(field.value, 'PPP', ...)`
  pattern, and real dates come from the dashboard's `Calendar` picker
  (constructs a local-time `Date`, not a UTC-midnight one), so this isn't
  expected to reproduce from the real onboarding/event-settings flow — flagged
  here rather than silently fixed, in case a future phase touches date storage.

**Post-implementation design/UX polish pass**, driven by the user reviewing
the live page against Figma across several follow-up rounds (same pattern as
Phase 2's polish pass):

- **Hero matched to Figma pixel-for-pixel**: full-bleed `bg-gray50` band
  behind the whole hero (closest existing token to the requested `#F8FAFC`),
  date line rewritten as a pill badge (`bg-success/10`/`text-success`,
  rounded-full) instead of plain text, photo aspect ratio corrected to
  portrait `aspect-[3/4]` (matches the "hasta 6 fotos verticales" copy
  already in the Presentación upload form — the original square/4:3 crop was
  wrong for real uploaded photos, not just a Figma mismatch).
- **Carousel rebuilt as a real sliding track**: `guest-image-carousel.tsx`
  now renders every image side-by-side in a flex row and translates the
  track by `-activeIndex * 100%` with a `transition-transform` (previously a
  single `<Image>` whose `src` swapped instantly, no animation). Added
  left/right chevron buttons (`lucide-react`, wraps around), a bottom
  gradient overlay + `shadow-inner` so the dot indicators stay legible over
  any photo, and a 5-second `setInterval` autoplay that resets on every
  manual navigation (chevron or dot click) so auto-advance never fights a
  manual click. Verified live via Playwright: transform changes after
  5.6s, chevron clicks change it immediately.
- **"Ver los regalos" smooth-scroll**: extracted into
  `components/guest/view-gifts-button.tsx` (client component) calling
  `scrollIntoView({ behavior: 'smooth' })` instead of a raw anchor jump —
  confirmed via Playwright the scroll position moves gradually (0 → mid →
  final), not an instant jump.
- **Mobile-first grid, found via real iPhone-12 testing**: the original
  `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` clipped badge text ("El que más
  queremos") at 2-up on a 390px-wide phone — card width (~171px) was
  narrower than the pill needs. Since most guests are expected to browse
  from a phone, changed to mobile-first single column:
  `grid-cols-1 sm:grid-cols-2 md:grid-cols-3` (capped at 3 columns max per
  a separate request, down from 4, so cards get more room generally).
- **Filter pills matched to Figma**: active "Todos" state changed from a
  solid `bg-success` fill to a subtle `bg-gray100` fill — Figma's reference
  showed all three pills reading as one consistent white/thin-border family,
  not one filled solid green.
- **Contribution dialog** (`gift-contribution-dialog.tsx`):
  - Added a "Montos sugeridos" quick-pick row (25%/50%/75% of the remaining
    balance, rounded to the nearest Gs. 1.000, deduped, excludes anything
    ≥100% since the existing "Completar el valor total" checkbox already
    covers that) between the progress bar and the manual amount input —
    lets a guest contribute to a group gift without typing an exact number.
  - Fixed a real bug: Radix Dialog auto-focuses the amount input on open;
    clicking the "X" immediately after opening blurred that focused input
    first, which (with RHF `mode: 'all'`) synchronously validated the empty
    field and showed an error, absorbing the first click — a second click
    was needed to actually close. Fixed via `onOpenAutoFocus={(e) =>
    e.preventDefault()}` on `DialogContent`, **not** by switching validation
    mode to `onSubmit` (the user's first instinct) — that would have broken
    the "Agregar al carrito" button's `disabled={!isValid}` gating, since
    RHF only computes `isValid` live under `onChange`/`onBlur`/`all` modes.

**Open PR** (code + this plan update, not yet merged): branch
`feature/guest-public-site` → base `docs/guest-checkout-wallet-plan`,
https://github.com/wedin-app/wedin/compare/docs/guest-checkout-wallet-plan...feature/guest-public-site?expand=1

### Phase 5 — Cart (Zustand)
First real Zustand store in the codebase — `zustand` is installed and
`hooks/use-store.ts`'s hydration-safe wrapper exists, but zero stores exist
today; this phase sets the pattern.

- New `hooks/use-cart-store.ts` — `create(persist(...))`, localStorage key
  scoped per event (`wedin-cart-{eventId}`, since a guest could browse
  multiple couples' sites in one browser). Line-item `amount` kept as a
  `string` to match the `Transaction.amount`/`groupGiftParts` string
  convention noted above and avoid float rounding.
- Every client consumer goes through `useStore(useCartStore, selector)` per
  the existing hydration-safe contract in `hooks/use-store.ts` — this is
  the one genuinely new pattern to get right, since it's never been
  exercised in this repo.
- New `components/cart/` — drawer (`Dialog`, not `AlertDialog`, per
  convention), item row, header badge, plus a persistent sticky bottom bar
  while the catalog has ≥1 cart item: item count + cash total + a "Ver mi
  carrito" CTA (never a "pay" CTA at this layer). Full-page context, then a
  close-up of the confirmed design:

  ![Sticky cart bar in page context: item count, total, "Ver mi carrito"](docs/plan-assets/phase5-sticky-cart-bar-v1.png)
  ![Sticky cart bar close-up: "Cantidad de regalos", "En efectivo", "Ver mi carrito"](docs/plan-assets/phase5-sticky-cart-bar-v2.png)

  Confirmed with the user: inside the "Carrito" dialog itself (Phase 4's
  frame), clicking "Agregar al carrito" / "Pagar ahora" on a line only adds
  it to the cart — it does not initiate payment despite the label. Actual
  checkout only begins from a deliberate next step (opening the full cart
  view via "Ver mi carrito"/"Ir al carrito", then proceeding to Phase 6's
  checkout page) — don't wire either dialog button directly to
  `createDlocalCheckoutSession`.
- Verify: adding/removing cart items persists across a page refresh
  (localStorage), scoped per event.

**Status: ✅ Done**, live-verified (Playwright against the real dev DB and
dev server, not just typechecked): add-to-cart, sticky-bar visibility,
drawer open, localStorage persistence across a full page reload, and
remove-to-empty all confirmed with zero console errors.

Delivered as planned: `hooks/use-cart-store.ts`, `components/cart/`
(`cart-sticky-bar.tsx`, `cart-drawer.tsx`, `cart-item-row.tsx`), wired into
`guest-gift-catalog.tsx` in place of the Phase 4 placeholder `useState`
array. No "header badge" component was built — the confirmed Figma
reference (`phase5-sticky-cart-bar-v1.png`) only shows "Compartir lista" in
the header; cart affordance is entirely the sticky bar + drawer.

**Correction to this phase's premise**: "zero stores exist today" was
wrong — `hooks/use-sidebar.ts` is already a working `create(persist(...))`
Zustand store (dashboard sidebar open/hover state), consumed via
`useStore(useSidebar, x => x)` in `admin-panel-layout.tsx`/`sidebar.tsx`.
What's actually new in this phase is a **per-key store factory**: the
sidebar store is a single global singleton, but the cart needs one
`localStorage` key per event (`wedin-cart-{eventId}`), so
`hooks/use-cart-store.ts` exports `useCartStore(eventId)`, which
lazily creates and caches one store instance per `eventId` in a
module-level `Map` (not a React hook itself — no hooks called inside it,
safe to call unconditionally from render).

**Real bug found and fixed, relevant to any future `useStore` consumer**:
routing store *actions* (`addItem`/`removeItem`) through
`useStore(cartStore, selector)` — as the plan originally specified for
"every client consumer" — triggered a live React warning, "Cannot update a
component while rendering a different component," on first paint (confirmed
via Playwright console capture; reproduced with the plan's literal wording,
disappeared once fixed). Root cause: `useStore`'s hydration-safe wrapper
(`useState` + `useEffect` re-emit) exists to avoid an SSR/CSR mismatch for
*persisted state values* (e.g. `items`, whose initial value differs between
server and a hydrated-from-localStorage client) — it's not needed for
*actions*, which are referentially stable functions untouched by
hydration. Calling it three times per render (once per selector) on the
same store was the trigger. Fixed by only wrapping the reactive `items`
selector in `useStore`; actions are invoked directly via
`cartStore.getState().addItem(...)` / `.removeItem(...)`, no hook needed.
**Rule of thumb for Phase 6+**: `useStore(store, selector)` for state you
render; `store.getState().action(...)` for calls inside event handlers.

**Post-implementation UX fix**, caught by the user reviewing the live
dialog: removing a cart item left an empty "Todavía no agregaste ningún
regalo" dialog open instead of closing it — confusing once the cart is
empty, since the sticky bar (the only other cart entry point) has already
disappeared by then. Fixed in `guest-gift-catalog.tsx`'s `onRemoveItem`:
checks `cartItems.length === 1` (the pre-removal count) before calling
`removeItem`, and closes the dialog (`setIsCartOpen(false)`) when that
removal empties the cart. Live-verified via Playwright: dialog is gone
after removing the last item, zero console errors.

**Open PR**: `feature/guest-cart` → base `docs/guest-checkout-wallet-plan`.

### Phase 6 — Checkout + dLocal Go integration
Largest phase. dLocal Go's API shape is now verified (see "dLocal Go API
research" above) — `POST /v1/payments` with `currency: "PYG"`, `country:
"PY"`; still needs a follow-up correction pass once real sandbox
credentials are available and a live call/webhook has actually been
exercised.

**Reference (Figma):**

![Checkout form with payment method choice](docs/plan-assets/phase6-checkout-form.png)
![Manual bank-transfer instructions + WhatsApp proof step](docs/plan-assets/phase6-checkout-bank-transfer-instructions.png)
![Generic thank-you screen (low-fidelity placeholder)](docs/plan-assets/phase6-checkout-thank-you.png)

- New `schemas/checkout.ts`: `GuestCheckoutSchema` (`payerName`,
  `payerEmail`, cart line items).
- New `actions/data/checkout.ts`:
  - `createTransactionsForCart` — creates `OPEN` `Transaction` rows per
    cart line with `payerName`/`payerEmail` (Phase 1), `payerRole: INVITEE`,
    `payeeRole: ORGANIZER` (both already the schema defaults).
  - `createDlocalCheckoutSession` — calls dLocal Go to create a checkout
    session for the total, persists the returned reference onto
    `dlocalPaymentId`, returns the redirect URL.
- New `lib/dlocal.ts` — server-only wrapper following the
  `actions/upload-to-s3.ts` convention exactly: instantiate the client at
  module scope from `process.env.*`, no config abstraction layer. New env
  vars (none exist today): `DLOCAL_GO_API_KEY`, `DLOCAL_GO_SECRET_KEY`.
  No separate webhook secret exists — per the research above, the
  `V2-HMAC-SHA256` webhook signature is computed from the same API key +
  secret key already used for request auth (`HMAC-SHA256(ApiKey + rawBody,
  SecretKey)`), so `DLOCAL_GO_WEBHOOK_SECRET` is not a real dLocal Go
  concept and should not be added.
- New `app/e/[slug]/checkout/page.tsx` +
  `hooks/checkout/use-checkout.ts` (RHF + `zodResolver(GuestCheckoutSchema)`,
  manual-loading pattern per convention).
- New webhook route `app/api/webhooks/dlocal/route.ts` — repo's
  second-ever API route. The incoming POST body is only
  `{"payment_id": "..."}` — the handler must call back
  `GET /v1/payments/:payment_id` to learn the real `status` before doing
  anything (see research above). On `status: "PAID"`: look up
  `Transaction` by `dlocalPaymentId`, set `COMPLETED`, write a
  `TransactionStatusLog` with `changedById: null` (Phase 1's schema
  change), recompute `WishlistGift.isFullyPaid` (sum `COMPLETED`
  transactions vs. `gift.price`; for `isGroupGift`, increment
  `groupGiftParts` — parse the string, don't reinterpret as Int — and mark
  paid only once the sum covers the price). Must be idempotent (no-op if
  already `COMPLETED`), since dLocal retries non-200 responses every 10
  minutes for up to 30 days. Verify the `V2-HMAC-SHA256` signature
  (`HMAC-SHA256(ApiKey + rawJsonBody, SecretKey)`, header
  `Authorization: V2-HMAC-SHA256, Signature: <hex>`) against the **raw**
  request body — call `request.text()` before `JSON.parse`.
- Still deferred to implementation time (needs a real sandbox account to
  confirm): exact PYG amount rounding/decimals in a live response, refund
  request/response shape (`create-a-refund`/`retrieve-a-refund` pages
  weren't read in this pass), idempotency-key support for double-click
  checkout protection, and the contents of `errors.md`/`rate-limits.md`
  for `lib/dlocal.ts`'s error handling.
- Verify: a full guest checkout in dLocal Go's sandbox/test mode ends with
  the `Transaction` flipping to `COMPLETED` via the webhook, and
  `WishlistGift.isFullyPaid` updates correctly for both individual and
  group gifts (test group-gift partial payment specifically);
  double-submitting the same webhook payload manually confirms
  idempotency.

**Status: 🟡 Built, real sandbox credentials still not exercised**, on
`feature/guest-checkout` → base `docs/guest-checkout-wallet-plan`,
https://github.com/wedin-app/wedin/compare/docs/guest-checkout-wallet-plan...feature/guest-checkout?expand=1.
Delivered as planned: `schemas/checkout.ts`, `actions/data/checkout.ts`
(`createTransactionsForCart`, `createDlocalCheckoutSession`, plus a new
`getCheckoutTransactions` not in the original plan text — reads back the
transfer page's line items by id), `lib/dlocal.ts` (stubs responses when
`DLOCAL_GO_API_KEY`/`DLOCAL_GO_SECRET_KEY` are unset, so the flow is
click-through-able end to end without sandbox creds — real creds/live
sandbox call still outstanding), `app/e/[slug]/checkout/page.tsx` +
`hooks/checkout/use-checkout.ts`, `app/api/webhooks/dlocal/route.ts`.

**Scope addition beyond the original plan text, decided live with the
user**: bank transfer is a first-class second payment method, not deferred.
`GuestCheckoutSchema.paymentMethod: 'CARD' | 'BANK_TRANSFER'` (guest picks
one at checkout, `components/checkout/checkout-form.tsx` +
`components/ui/radio-group.tsx`); `BANK_TRANSFER` transactions are created
`PENDING` (vs. `CARD`'s `OPEN`) and skip `createDlocalCheckoutSession`
entirely — the guest instead lands on `app/e/[slug]/checkout/transfer/page.tsx`,
which shows Wedin's own bank account (`lib/wedin-bank-account.ts`) and a
"send proof via WhatsApp" deep-link to Wedin's ops number. Confirmation is
manual and ops-side, not organizer-facing (see below) — there is no
in-product path from "guest sent a transfer" to `COMPLETED`.

**Payment-method naming reconciliation** (found and fixed mid-session, not
an original plan item): partway through building this phase, manual
in-progress renames had left the schema in a broken, half-migrated state —
`prisma/schema.prisma` had a `paymentProcessor: PaymentProcessor
(DLOCAL|BANCARD|UPAY|PAGOPAR)` field (gateway-tracking, only dLocal ever
implemented), while `schemas/checkout.ts`/`actions/data/checkout.ts` had
already moved to a different concept, `paymentMethod: 'CARD'|'BANK_TRANSFER'`
(the guest's checkout choice) — these are genuinely different things that
had gotten conflated under one renamed field, and the mismatch meant
`actions/data/checkout.ts` didn't even type-check. Resolved, confirmed live
with the user: collapsed to a single `Transaction.paymentMethod:
PaymentMethod (CARD | BANK_TRANSFER)` field; dropped `paymentProcessor` and
the `PaymentProcessor` enum (Bancard/Upay/Pagopar) entirely as YAGNI — only
one gateway is implemented today, re-add a processor field if/when a second
one actually is. `dashboard-transactions-list.tsx`'s `PAYMENT_METHOD_ICON`
map (Phase 7, previously read the stale four-way enum) updated to match.

**Manual bank-transfer confirmation → wallet sync gap, resolved via a
staff-only `/admin` page** (superseding an earlier, now-retired ops-script
approach — see below): since a transfer is confirmed by Wedin staff off a
WhatsApp proof screenshot, not by the organizer in-app, nothing previously
called `applyTransactionStatusChange` for a manually-confirmed transfer.
`app/admin/page.tsx` lists every `Transaction` across every event (not
scoped to one couple's session, via new `getAllTransactionsForAdmin()`) and
lets staff change a row's status via a `<select>`
(`components/admin/admin-transactions-list.tsx` +
`hooks/admin/use-admin-transaction-status.ts`), which calls the new
`updateTransactionStatusAsAdmin(transactionId, status)` — this reuses the
real `applyTransactionStatusChange` directly (no duplicated logic) and
records the actual logged-in staff user as `changedById`, fixing the
audit-trail gap the earlier script had.

Access is gated on `User.role === 'ADMIN'` (enum value already existed,
unused until now) two ways: `middleware.ts`'s admin-route check — previously
dead code (`console.log` with no redirect) — now does
`Response.redirect(new URL(isLoggedIn ? '/dashboard' : '/login', nextUrl))`
for any non-admin hitting `/admin`; and the page/actions independently
re-check `getCurrentUser().role === 'ADMIN'` (DB-fresh, not the JWT-cached
session role) as defense-in-depth, since server actions are callable
independent of what page renders them. Staff accounts are flagged `ADMIN`
by hand in the DB (`yarn prisma studio`) — no self-serve role-assignment UI,
by explicit scope decision. No sidebar/nav entry either; staff navigate to
`/admin` directly by URL.

**`scripts/confirm-bank-transfer.ts` retired**: it was the original fix for
the confirmation gap above, but duplicated
`recomputeWishlistGiftProgress`/the status-update transaction from
`actions/data/transaction.ts` instead of reusing it, and hardcoded
`changedById: null` (no record of which staffer ran it). Once the `/admin`
page existed to do the same job through the real action with a proper audit
trail, the script became redundant — deleted, along with its `package.json`
entry. `CLAUDE.md`'s "one-off ops scripts" convention note stays (still
valid for a future script), just without this now-dead example.

**Known gaps found by a post-implementation code review — fixed in a
follow-up pass**:
- ~~No server-side re-validation of a cart line's `amount`~~ — fixed:
  `createTransactionsForCart` now batch-fetches the cart's `WishlistGift`s
  and rejects any item whose amount doesn't match the gift's price
  (non-group) or exceeds the remaining unpaid balance (group gift), before
  creating any `Transaction` rows.
- ~~Webhook only handled `PAID`~~ — fixed: `REJECTED`/`CANCELLED`/`EXPIRED`
  now flip the transaction to `FAILED` via the same
  `applyTransactionStatusChange` loop `PAID` already used; only genuinely
  unhandled statuses (`PENDING`) still just ack.
- ~~`getCheckoutTransactions` had no `eventId`/ownership check~~ — fixed:
  it now takes a required `eventId`, and the transfer page resolves it via
  `getEventByUrl(slug)` before calling it. Residual, accepted risk: guessing
  a transaction id *within the same event* still isn't blocked — true guest
  checkout has no account/session to check ownership against; closing that
  fully would mean signed/opaque references, out of scope for this pass.
- ~~Orphaned `OPEN` transactions on dLocal session failure~~ — fixed:
  `createDlocalCheckoutSession` now flips the cart's just-created
  transactions to `FAILED` (via the same status-change path) on both its
  error branches, instead of leaving them silently `OPEN`/`PENDING` forever.
- ~~Non-atomic idempotency check in `applyTransactionStatusChange`~~ —
  fixed: the plain `update` became a conditional `updateMany({ where: { id,
  status: { not: status } } })`; only the caller that actually flips the
  status (`count === 1`) proceeds to write the `TransactionStatusLog` and
  recompute progress, so concurrent/duplicate webhook deliveries can't both
  log the same transition.

### Phase 7 — Regalos recibidos ledger + "Agradecer"

**Reference (Figma):**

![Regalos recibidos ledger with summary stats and Agradecer buttons](docs/plan-assets/phase7-regalos-recibidos.png)

- New `actions/data/transaction.ts`: `getTransactions` (using
  `GetTransactionsParams`), `updateTransactionNotes` (using
  `TransactionEditSchema` — must pass the transaction's current `status`
  through alongside the new `notes`, since the schema requires it).
- Open product question to confirm before building this one sub-feature:
  does "Agradecer" mean a thank-you note stored on `Transaction.notes`, or
  a transactional email to `payerEmail` via the already-installed
  `resend`/`nodemailer`? Check the Figma flow; if unresolved, implement
  the `notes`-only version first (cheaper, reversible) and flag the email
  variant as a follow-up.
- Rewrite `components/dashboard/dashboard-transactions.tsx` as an async
  Server Component (same conversion pattern as Phase 2), real CSS-grid
  rows instead of the static `EmptyState`.
- Verify: completed transactions appear on `/transactions` ordered by
  date; "Agradecer" performs whichever confirmed behavior.

**Status: ✅ Done**, built without Phase 6 (checkout/dLocal) — that phase is
explicitly skipped for now, and nothing here depends on it. `getTransactions`
just reads `COMPLETED` `Transaction` rows; three dummy rows were inserted
directly into the dev DB to develop and live-verify against, no checkout
flow required. Live-verified with Playwright: real login
(`me+parejas@avilaca.com` on the `avilaca` dev event — password set to a
known test value for this, see note below), `/transactions` renders the
ledger with correct summary totals, "Agradecer" saves a note and the row
flips to a disabled "Agradecido" state after a refresh (see the one-time-
Agradecer note below — this replaced an editable "Editar agradecimiento"
state from the first pass), zero console errors.

Delivered as planned: `actions/data/transaction.ts` (`getTransactions`,
`updateTransactionNotes`), `dashboard-transactions.tsx` rewritten as an
async Server Component (`getEvent()` → `getTransactions()`, `Suspense` +
`lazy()`, same pattern as Phase 2's `dashboard-wishlist.tsx`), new
`components/dashboard/dashboard-transactions-list.tsx` (summary card + Nombre/
Monto/Regalo/Agradecer table, matches `dashboard-wishlist-list.tsx`'s grid
pattern), new `components/dialog/thank-transaction-dialog.tsx`, new
`components/skeletons/dashboard-transactions.tsx`.

**Open product question resolved by taking the plan's own documented
fallback**: built the `notes`-only "Agradecer" (pre-filled "¡Muchas gracias,
{payerName}! 💚", editable `Textarea`, saves to `Transaction.notes`). Button
label reads "Agradecer" vs. "Editar agradecimiento" based on whether `notes`
is already set — a free state marker, no schema change needed. Email variant
still a follow-up if wanted later.

**Scope correction made live with the user, after the first pass**: the
plan's own verify text ("completed transactions appear") led the first
implementation to hardcode `status: 'COMPLETED'` inside `getTransactions`.
Revisited with the user: `Payout` (Phase 8) and `Transaction` (this phase)
are separate collections tracking opposite directions of money (wallet →
bank vs. guest → wallet), so there's no overlap risk from showing more
`Transaction` statuses here — the `COMPLETED`-only filter was an unnecessary
self-imposed restriction, not something required to keep Phase 7 and 8
clean of each other. Changed to: `getTransactions` returns every status for
the event; the table adds **Fecha** (`createdAt`, `dd/MM/yyyy`) and
**Estado** columns (`ESTADO_BY_STATUS` badge map in
`dashboard-transactions-list.tsx` — `COMPLETED`→"Recibido" success,
`PENDING`→"En proceso" warning, `OPEN`→"Pendiente de pago" gray,
`FAILED`→"Fallido" error, `REFUNDED`→"Reembolsado" gray). The summary
card's count/total and the "Agradecer" button's visibility still filter to
`COMPLETED` only — showing a `FAILED` row's amount as "cash received," or
offering to thank a guest for a payment that never landed, would both be
wrong even though the row itself should be visible.

**Real pre-existing bug found and fixed while seeding test data**:
`Transaction.dlocalPaymentId String? @unique` (added in Phase 1) never got
its Mongo index converted to `sparse: true` — the exact gotcha
`CLAUDE.md` already documents for `Image.giftId`/`Event.url`/`User.email`,
just missed for this fourth field since Phase 1 had no real consumer to
surface it (Phase 6, which would set it, doesn't exist yet). A second
`Transaction` with no `dlocalPaymentId` threw `P2002` on create. Fixed via
the documented `$runCommandRaw` `dropIndexes`/`createIndexes` pattern
against the dev DB, and added the same NOTE-comment block above the field in
`schema.prisma` as the other three examples — copy that comment's exact
commands if this index is ever recreated on a fresh environment.

**Test credentials note**: to drive this live through the real login form
(not just typechecked), `me+parejas@avilaca.com`'s password was set to a
known value directly in the dev DB (bcrypt-hashed, same method as
`actions/auth/register.ts`) and `emailVerified` was stamped — this is the
existing `avilaca`-slug dev event's primary user. Also confirmed live: the
`signIn` callback in `auth.ts` always returns `true` regardless of
`emailVerified` (both branches), so verification is not actually enforced
at login today — dead check, same class of finding as the `isAdminRoute`
dead code already noted elsewhere in this doc. Flag to the user: decide
whether to keep this test password or rotate/clear it.

**Second round of changes, driven by the user reviewing the live page**
(all in `components/dashboard/dashboard-transactions-list.tsx` /
`components/dialog/thank-transaction-dialog.tsx` unless noted):

- **Agradecer made one-time, not editable.** The first pass's "Editar
  agradecimiento" (reopens the dialog once notes exist) was wrong — thanking
  a guest is a single action, not an editable note. Now: once
  `transaction.notes` is set, the row shows a disabled "Agradecido" button
  instead of a dialog trigger. `thank-transaction-dialog.tsx` early-returns
  the disabled state before rendering any `Dialog` at all in that case.
- **Estado badges got icons** (`ESTADO_BY_STATUS` now carries an `icon` per
  status alongside `label`/`className`: checkmark/sync/clock/close/undo),
  matching a reference pill design the user provided.
- **Search + Estado filter added**, styled identically to `/wishlist`'s
  filter row (`Input` with a leading `IoSearchOutline`, native `<select>`
  for Estado built from `ESTADO_OPTIONS`, derived from `ESTADO_BY_STATUS`).
  Search matches **either** `payerName` or `wishlistGift.gift.name`,
  client-side over the already-fetched rows — same small-dataset pattern as
  `dashboard-wishlist-list.tsx`, no new server round-trip.
- **Fecha and Monto columns made sortable.** Clicking a header toggles
  asc/desc (defaults to desc on first click); `SortIcon` shows a chevron on
  the active column and a neutral `IoSwapVerticalOutline` on the inactive
  one. Sort is applied after search/Estado filtering
  (`sortedTransactions` derived from `filteredTransactions`).
- **Summary card intentionally changed to count every status, not just
  `COMPLETED`** — explicit user request ("inflate the numbers a bit"),
  confirmed via `AskUserQuestion` that **both** "Regalos recibidos" (count)
  and "Equivalente en efectivo" (cash total) should include all statuses,
  not just the count. **This is a real, deliberate deviation from
  correctness, not a bug**: "Equivalente en efectivo" no longer represents
  money actually collected — it now includes `FAILED`/`PENDING`/`OPEN`/
  `REFUNDED` amounts too. **Load-bearing for Phase 8**: the wallet balance
  (`getEventBalance`) must NOT reuse this card's total — it needs a fresh
  `COMPLETED`-only sum (the `WHERE status = 'COMPLETED'` filter this phase
  deliberately removed from the *display* layer still needs to exist in
  Phase 8's own balance calculation).
- **Drive-by fixes riding along in this branch** (small, made directly by
  the user, unrelated to Phase 7's core scope but worth flagging when the
  PR is opened): `dashboard-wishlist-list.tsx` summary card capped to
  `max-h-24` with a vertically-centered heading (matches the transactions
  card); `admin-panel-layout.tsx` main background `bg-zinc-50` →
  `bg-white`; `content-layout.tsx` height `h-screen` → `h-full` (the fixed
  `h-screen` was causing overflow/double-scroll once a page's content list
  — like this ledger — got taller than one viewport).
- Nine dummy `Transaction` rows now exist on the `avilaca` dev event
  (mixed statuses, dates spread across the last week) — useful test data
  for Phase 8's balance/withdrawal work too, no need to reseed.

### Phase 8 — Wallet balance + withdrawal ("Retirar efectivo") — DONE

Built on `feature/wallet-withdrawal` off `docs/guest-checkout-wallet-plan`.
Manual-admin-processed for MVP: `BankDetails` has zero gateway account
tokens — a `Payout` row is created as `REQUESTED` and an operator flips its
status by hand later; no transfer API is called.

- `actions/data/payout.ts`: `getEventBalance(eventId)` (sum `COMPLETED`
  transaction amounts minus sum of non-`REJECTED` `Payout` amounts —
  manual JS reduce over fetched rows, not Prisma `_sum`, since
  `Transaction.amount`/`Payout.amount` are Mongo `String` fields with no
  Decimal aggregation support), `getWalletSummary(eventId)` (same two
  queries via a shared private `getEventFinancials` helper, returning
  `{ totalReceived, giftsCount, balance }` for the summary bar),
  `getPayouts(eventId)`, `requestPayout(eventId, values)` (rejects if no
  `BankDetails` row exists yet, or if `amount > getEventBalance(eventId)`).
  **Verified independent of Phase 7's deliberately-inflated ledger card**:
  on the `avilaca` dev event, `getEventBalance` returned exactly
  Gs. 1.692.303 (the true `COMPLETED`-only sum) while `/transactions`'
  "Equivalente en efectivo" showed Gs. 2.907.303 (all statuses) — confirmed
  live these two numbers are computed independently, not coincidentally
  equal.
- `RequestPayoutParams` added to `schemas/params.ts`; `hooks/dashboard/use-payout.ts`
  mirrors `use-transaction.ts` (loading state, toast, `router.refresh()`).
- `components/dialog/request-payout-dialog.tsx` — dynamic Zod schema factory
  (`createRequestPayoutSchema(balance)`, same pattern as
  `gift-contribution-dialog.tsx`) capping the amount to the live balance.
  Trigger button: "Retirar efectivo", `variant="success"` (matches the
  existing "Gestionar retiro" button styling, not the black `default`
  variant used in the first draft).
- Route is `/billetera` (Spanish, not `/wallet` — matches the Figma
  breadcrumb wording). Added to `protectedRoutes` in `lib/routes.ts`.
  Reachable two ways: a new dedicated **sidebar item** ("Mi billetera",
  `Wallet` icon, `lib/menu-list.ts`) and the profile-dropdown link in
  `user-nav.tsx` (its commented-out `/account` stub was repurposed —
  uncommented, repointed to `/billetera`, relabeled "Mi billetera"). The
  existing "Gestionar retiro" button in `dashboard-transactions.tsx` is now
  a real `Link` to `/billetera` (`asChild`, same pattern as
  `cart-drawer.tsx`'s checkout link) instead of a dialog trigger.
- **Layout went through two full revisions after the user reviewed the
  live page against actual reference screenshots** (the original
  `docs/plan-assets/phase8-billetera.png` Figma turned out to not match
  what was wanted):
  1. First pass built a two-column layout (fixed-width balance card left,
     movements list right) — rejected outright ("dont know why you decided
     to go with that layout!").
  2. Rebuilt as a **full-width single-column page mirroring
     `dashboard-transactions.tsx`/`dashboard-transactions-list.tsx` exactly**:
     header row (title + description + action button, `border-b`) → a
     horizontal `bg-gray50` stat bar ("Resúmen de tu billetera" with two
     icon+value stat blocks: `totalReceived` labeled "Regalos recibidos",
     `balance` labeled "Disponible para retiro") → "Historial" section →
     sortable table. `wallet-balance-card.tsx` was deleted; its content
     folded into `wallet-payouts-list.tsx`, which now owns the whole
     summary+history rendering (mirroring how
     `dashboard-transactions-list.tsx` owns both).
  3. Third round: **the search input was removed** from the Historial
     table — every `Payout` row has the identical description
     ("Transferencia a cuenta"), so free-text search had nothing
     meaningful to filter, unlike Phase 7's ledger where search matches
     `payerName`/gift name. Only the Estado `<select>` remains, now sharing
     one row with the "Historial" heading instead of its own search+filter
     row. Table columns are `Descripción | Fecha (sortable) | Monto
     (sortable) | Estado` — no `Regalo` column and no trailing
     per-row-action column (nothing analogous to Phase 7's "Agradecer"
     applies to a payout).
  4. `ESTADO_BY_PAYOUT_STATUS` badge map (`wallet-payouts-list.tsx`) mirrors
     `ESTADO_BY_STATUS`'s convention 1:1 by meaning: `REQUESTED`→"Pendiente"
     (gray), `PROCESSING`→"En proceso" (warning), `COMPLETED`→"Confirmado"
     (success), `REJECTED`→"Rechazado" (error).
  5. "Descargar/Ver extracto" (visible in both reference images) stayed
     explicitly out of scope this phase, confirmed with the user — no
     placeholder built either.
- Both stat blocks in `wallet-payouts-list.tsx`'s summary bar, and the
  matching blocks in `dashboard-transactions-list.tsx`, got a `w-1/2`
  class added (small manual polish by the user riding along in this
  branch, not otherwise part of Phase 8's scope).
- **Seeding**: `avilaca` dev event had no `BankDetails` row before this
  phase (`requestPayout` would always reject without one) — created one
  via a throwaway script, plus 5 dummy `Payout` rows spanning all four
  `PayoutStatus` values, same hand-seed pattern as Phase 7's dummy
  transactions.
- Verify (Playwright, live dev DB, `me+parejas@avilaca.com`): balance math
  matches independently-computed sums before and after seeding;
  "Gestionar retiro" navigates to `/billetera` rather than opening a
  dialog; sidebar "Mi billetera" highlights correctly on `/billetera`
  (`pathname.startsWith(href)` in `menu.tsx`); Estado filter and
  Fecha/Monto sort both work; `requestPayout` rejects an amount greater
  than balance and accepts one within it, after which the visible balance
  drops and a second request is correctly capped against the new, lower
  balance.
- **Unrelated commit riding on this branch**: `d11b6f4` ("Show
  group/individual gifts as complete once fully funded, not just
  isFullyPaid", `guest-gift-card.tsx`) was committed directly by the user
  on `feature/wallet-withdrawal` while this phase was in progress — it's
  guest-cart/checkout work (Phase 6, still not built), unrelated to the
  wallet feature. Flagging so PR review doesn't attribute it to Phase 8.

### Phase 9 — Dashboard home real progress tracking
Lowest complexity, highest visible payoff — buildable any time after
Phase 3, in parallel with 4-8.

**Reference (Figma):**

![Dashboard home checklist with progress bar](docs/plan-assets/phase9-dashboard-home-checklist.png)

- Rewrite `components/dashboard/dashboard-home.tsx` as an async Server
  Component. Replace every hardcoded checklist row (lines 28-95 today)
  with a real condition: presentación (`coverMessage` + images), guest
  count (`event.guests`, already exists), ≥1 gift (Phase 2's
  `getWishlistGifts` count), event config (existing
  `date`/`country`/`city`/`partnerName`), bank details
  (`!!getBankDetails()`), site URL (`!!event.url`, Phase 3). Compute the
  real `X / 6` progress bar (currently hardcoded "1 de 6" / `value={26}`).
  Enable "Ver sitio web" (currently `disabled`) once `event.url` is set,
  linking to `/e/{url}`.
- Verify: toggling each underlying condition (adding a gift, setting bank
  details, setting the URL, etc.) updates the corresponding checklist row
  and the progress bar.

**Status: ✅ Done**, but deliberately scoped down to **4 items, not 6**,
per a live discussion with the user before implementation — not the
original text above. Rationale, confirmed with the user:

- **"Completá el onboarding"** is item 1, always rendered checked.
  `middleware.ts` already redirects any logged-in, non-onboarded user to
  `/onboarding` before they can ever see `/dashboard`, so `isOnboarded` is
  guaranteed `true` here — this item can never be unchecked in practice.
  Kept anyway (static checkmark) for a satisfying "step 1 done" feel,
  per the user's explicit ask, not because it's a live condition.
- **"Agregá un regalo a tu lista"** (item 2) — `getWishlistGifts(event.wishlistId).length > 0`,
  links to `/gifts`.
- **"Completá la presentación de tu evento"** (item 3) — `!!event.coverMessage && event.images.length > 0`
  (both required, not either/or), links to `/event-details`.
- **"Completá los detalles de tu evento"** (item 4) — `!!event.date && !!event.url`,
  links to `/event-settings`. Note `country`/`city` (the original text's
  other candidates) are set during onboarding step 3, before `/dashboard`
  is ever reachable — same always-true problem as item 1 — so they're
  deliberately excluded from this condition; only `date` and `url` are
  actually still-unset at this point for a real user.
- **Guest count and bank details — dropped from this phase's 6-item list**,
  not deferred-and-forgotten: explicit user decision to ship a tighter
  4-step checklist now and revisit later rather than wire all 6 original
  conditions. If a guest-count or bank-details condition is added back
  later, `X / 4` throughout this component (labels + `Progress` value)
  needs to become `X / 6` again, and two more rows need to be inserted at
  the position the user chooses.
- **"Ver sitio web"** enables (links to `/e/{event.url}`) once **all 4**
  items are complete — not just `!!event.url` as the original text said.
  Straightforward now since Phase 4 (the actual `/e/[slug]` guest site)
  is done — no dead-link risk.
- Verified live: minted a real Auth.js v5 JWT session (`next-auth/jwt`
  `encode`, matching `auth.config.ts`'s cookie/secret setup) for two real
  seeded users against the running dev server, not just typechecked —
  `av2@wedin.app` (all 4 conditions true → "4 de 4", full progress bar,
  "Ver sitio web" enabled) and `av1@wedin.app` (gift added but no
  presentación/date → "2 de 4", correct mix of checked/unchecked rows,
  "Ver sitio web" correctly disabled).

## Recommended build order

**1 → 2 → 3 → 4 → 5 → 6 → 7 → 8**, with **9** slotted in any time after
Phase 3 (good candidate to do second, for a visible win before the public
site work).

## Critical files
- `prisma/schema.prisma`
- `schemas/form.ts`, `schemas/params.ts` (reuse existing schemas, don't recreate)
- `actions/data/event.ts`, `actions/data/gift.ts`, `actions/upload-to-s3.ts` (patterns to mirror)
- `hooks/use-store.ts` (cart hydration pattern), `hooks/dashboard/useUpdateBankDetails.ts` (form-hook pattern)
- `middleware.ts`, `lib/routes.ts` (no changes needed for the new public route; admin gate is broken, noted above)
- `components/dashboard/dashboard-home.tsx`, `dashboard-transactions.tsx`, `dashboard-wishlist.tsx`
- `app/(default)/gifts/page.tsx` (list/row convention to reuse)
- From Phase 2's polish pass, reusable in later phases (esp. Phase 4's
  guest-facing gift browsing): `components/dashboard/gift-type-badge.tsx`,
  `gift-added-badge.tsx`, `gift-favorite-badge.tsx` (pill badge
  conventions), `components/forms/common/price-input.tsx` (masked Gs.
  input), `components/dashboard/gifts-filter-bar.tsx` (URL-searchParams
  filter bar pattern), `app/not-found.tsx` (custom 404, now exists)