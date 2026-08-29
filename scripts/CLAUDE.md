# CLAUDE.md (scripts)

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

- `migrate-gift-collections.ts` backfills the Mongo many-to-many relation from
  legacy `Gift.giftlistId` values. Run it after `prisma generate` and before
  `prisma db push`.
