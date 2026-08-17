# CLAUDE.md (scripts)

- **One-off ops scripts** live in `scripts/`, run via a `yarn <script-name>`
  entry. Self-contained like `prisma/seed.ts`: plain
  `require('@prisma/client')` + `new PrismaClient()`, no `@/` path-alias
  imports — `ts-node` isn't configured to resolve them outside Next's build,
  so alias imports fail at runtime. CLI usage strings use `<required>` /
  `[optional...]` (angle vs. square brackets). (An earlier example, a
  bank-transfer confirmation tool, was retired in favor of the staff-only
  `/admin` page, which calls the real `applyTransactionStatusChange` action
  directly instead of a duplicated copy.)
- `backfill-wishlist-gift-quantity.ts` (`yarn backfill:wishlist-gift-quantity`):
  one-time raw-Mongo backfill for the `WishlistGift.quantity`/
  `reservedQuantity` and `Transaction.quantity` fields added by the
  individual-gift quantity feature — see the NOTE above
  `WishlistGift.quantity` in `prisma/schema.prisma` for why it's needed.
  Idempotent (every update is scoped to docs still missing the field), so
  it's safe to re-run.
