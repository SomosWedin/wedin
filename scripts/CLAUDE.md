# CLAUDE.md (scripts)

- **One-off ops scripts** live in `scripts/`, run via a `yarn <script-name>`
  entry. Self-contained like `prisma/seed.ts`: plain
  `require('@prisma/client')` + `new PrismaClient()`, no `@/` path-alias
  imports — `ts-node` isn't configured to resolve them outside Next's build,
  so alias imports fail at runtime. CLI usage strings use `<required>` /
  `[optional...]` (angle vs. square brackets). An earlier example, a
  bank-transfer confirmation tool, was retired in favor of the staff-only
  `/admin` page, which calls the real `applyTransactionStatusChange` action
  directly instead of a duplicated copy.
- **Declare nothing at top level.** These files have no `import`/`export`, so
  TypeScript treats them as global scripts and their top-level bindings share
  one scope with `prisma/seed.ts` — a second file declaring `PrismaClient`,
  `main`, or any other repeated name fails the typecheck with `TS2451:
  Cannot redeclare block-scoped variable`. (It's why the seed names its
  client `prismaSeed`.) Wrap the whole script in an async IIFE and keep the
  `require` calls inside it, as `redefine-categories.ts` does; a module that
  only needs to export data can assign straight to `module.exports` with no
  top-level `const`, as `prisma/categories.ts` does.
- `redefine-categories.ts` — migrates the gift catalog to the event-type-aware
  taxonomy. Dry run by default, `--apply` to write, never deletes a category.
  Must run right after `prisma db push`; see `prisma/CLAUDE.md` for why it
  backfills through `$runCommandRaw`.
