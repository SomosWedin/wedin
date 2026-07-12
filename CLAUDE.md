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
- **One-off ops scripts** live in `scripts/`, run via a `yarn <script-name>`
  entry (see `confirm-bank-transfer.ts`). Self-contained like
  `prisma/seed.ts`: plain `require('@prisma/client')` + `new PrismaClient()`,
  no `@/` path-alias imports — `ts-node` isn't configured to resolve them
  outside Next's build, so alias imports fail at runtime. CLI usage strings
  use `<required>` / `[optional...]` (angle vs. square brackets), e.g.
  `yarn confirm-bank-transfer <transactionId> [transactionId...]`.
