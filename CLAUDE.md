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
  build it ahead of need). Pagopar replaced dLocal Go entirely (2026-07-16)
  — dLocal was never actually live (no real sandbox credentials were ever
  configured), so this was a clean swap, not a cutover with in-flight
  payments. Pagopar's redirect/webhook URLs are configured once in its
  dashboard for the whole merchant account, not per-request like dLocal's
  were — see `app/checkout/pagopar/result/[hash]/page.tsx` for why a
  hash-keyed landing route exists instead of reusing
  `app/e/[slug]/checkout/success/page.tsx` (still used by `BANK_TRANSFER`,
  which never leaves the app).
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
  (see below) doesn't yet block it. `BANK_TRANSFER` transactions have no
  automated path to `COMPLETED` at all; that's the one case staff are
  expected to set by hand.

### Terminology (Spanish UI ↔ code/domain)
- regalo(s) → gift(s)
- lista de regalos / "Mi lista" → wishlist/registry
- billetera / retiro → wallet / withdrawal (cash-out to bank)
- transferencia → bank transfer/payout
- datos bancarios → bank details (payout account)
- evento → the wedding/event
- listas predefinidas / `Giftlist` → pre-built gift bundles/categories

### Current implementation state
For what's done vs. missing and the build sequence for the guest
checkout/wallet loop, see `plan-ultraplan.md`.

### Staff-only access (`/admin`)
Gated on `User.role === 'ADMIN'` (`UserType` enum). Staff accounts are
flagged by hand in the DB (`yarn prisma studio`) — there's no self-serve
role-assignment UI, and none is planned; keep it that way unless a real
need shows up. Enforcement is layered, both real (not just
belt-and-suspenders):
- `middleware.ts` redirects non-admins away from admin routes, but it reads
  `session.user.role` from the JWT, which is only refreshed at login — a
  role change via Prisma Studio doesn't take effect until the user
  re-logs-in.
- Every admin page/server action independently re-checks
  `getCurrentUser().role === 'ADMIN'`, which hits the DB fresh every call.
  **This is the real boundary**, not the middleware — server actions are
  callable independent of what page renders them, and it's what actually
  catches a demoted admin whose cookie is stale.
When adding a new admin route under `app/admin/`, remember the onboarding
redirect in `middleware.ts` explicitly exempts admin routes (a freshly
`ADMIN`-flagged account defaults to `isOnboarded: false` and would
otherwise get bounced into the couple-onboarding wizard) — a new top-level
route group outside `app/admin/` would need the same exemption.

## Stack
- Next.js (App Router) + TypeScript
- Prisma (MongoDB) — schema in `prisma/`
- NextAuth (`@auth/prisma-adapter`) for auth
- TanStack Query for client data fetching
- Radix UI + Tailwind for components
- AWS S3 for image uploads (`lib/s3.ts`, `actions/upload-to-s3.ts`)
- Zod for validation

## Commands
- `yarn dev` — start dev server
- `yarn build` — runs `prisma generate` then `next build`
- `yarn start` — run production build
- `yarn lint` — Next.js lint
- `yarn prisma generate` — regenerate the Prisma client after a schema change
- `yarn prisma db push` — push schema changes to MongoDB (no migration files —
  Mongo connector doesn't support `prisma migrate`)
- `yarn prisma db seed` — seed the database (`prisma/seed.ts`)
- `yarn prisma studio` — open Prisma Studio to browse/edit the database

## Project layout
- `app/` — routes, grouped: `(auth)`, `(dashboard)`, `(default)`, plus `onboarding/` and `api/`
- `actions/` — server actions, organized by domain: `auth/`, `data/`, `common/`
- `schemas/` — Zod validation schemas (one file per domain)
- `lib/` — shared helpers (routes, mail, s3, tokens, countries…)
- `components/` — UI; `hooks/`, `utils/`, `styles/`

## Conventions
- Package manager is **yarn**.
- Formatting/linting is **Biome** (`biome.json`): single quotes, 2-space indent,
  line width 80, semicolons, es5 trailing commas. lint-staged runs Prettier then Biome on commit.
- New server-side logic goes in `actions/<domain>/`; matching validation in `schemas/`.
- Keep imports organized (Biome `organizeImports` is on).
- **MongoDB + optional `@unique` fields**: any `String? @unique` field
  (`Image.giftId`, `Event.url`, `User.email` are existing examples) needs its
  underlying index converted to `sparse: true` manually. Prisma's schema DSL
  has no `sparse` option, and `prisma db push` will not create or repair it —
  a non-sparse unique index only tolerates **one** document missing the
  field; the second throws `P2002`. Fix via raw Mongo commands
  (`$runCommandRaw` `dropIndexes` + `createIndexes` with `sparse: true`), and
  document the manual reindex commands as a comment above the field in
  `schema.prisma` (copy the pattern from the three existing examples).
  Apply this immediately whenever a new optional `@unique` field is added.
- **MongoDB + renamed/narrowed enum values**: same root cause as the sparse-index
  gotcha above — `prisma db push` only changes the schema definition, it never
  rewrites existing documents. If an enum's allowed values change (a field is
  renamed, or a value is removed/renamed), any document written under the old
  values still has the old string stored in Mongo, and Prisma throws
  (`Value 'X' not found in enum 'Y'`) the moment it tries to read that field —
  which a `try/catch`-wrapped read (the convention elsewhere in this codebase)
  will silently swallow into an empty result, not a visible error. Whenever an
  enum's values change, backfill existing documents in the same pass (raw
  `$runCommandRaw` `update`, mapping each old value to its new equivalent —
  see the `Transaction.paymentMethod`/`PaymentMethod` migration for the
  pattern), don't just update `schema.prisma`.
- **One-off ops scripts** live in `scripts/`, run via a `yarn <script-name>`
  entry. Self-contained like `prisma/seed.ts`: plain
  `require('@prisma/client')` + `new PrismaClient()`, no `@/` path-alias
  imports — `ts-node` isn't configured to resolve them outside Next's build,
  so alias imports fail at runtime. CLI usage strings use `<required>` /
  `[optional...]` (angle vs. square brackets). (No script lives here today —
  the one example, a bank-transfer confirmation tool, was retired in favor
  of the staff-only `/admin` page, which calls the real
  `applyTransactionStatusChange` action directly instead of a duplicated
  copy.)
- **Testing an authenticated flow live**: don't mint a raw session JWT
  (`next-auth/jwt`'s `encode`) to impersonate a user for testing — that's a
  forged credential and gets (correctly) blocked. Instead rotate a known
  test account's password directly in the DB (bcrypt, same method as
  `actions/auth/register.ts`) and log in through the real `/login` form (a
  `curl` cookie-jar login via `/api/auth/csrf` +
  `/api/auth/callback/credentials` works fine, no browser needed).
