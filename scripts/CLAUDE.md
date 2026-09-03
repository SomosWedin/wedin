# CLAUDE.md (scripts)

- **One-off ops scripts** live in `scripts/`, run via a `yarn <script-name>`
  entry. Keep database schema/data changes out of standalone scripts; they
  belong in the tracked workflow below. Scripts must not use `@/` path-alias
  imports because `ts-node` is not configured to resolve them outside Next's
  build. CLI usage strings use `<required>` / `[optional...]`.

- **Tracked migrations** live in `scripts/migrations/` and use an immutable
  `YYYYMMDDHHMMSS_snake_case_name.ts` filename. Generate one with
  `yarn migration:create <name>` and export one idempotent `up(prisma)`
  function. `yarn migrate` applies pending files in filename order and records
  their checksums in `Migration`; never edit or delete an applied file. Use
  `yarn migration:status` to inspect a database. There is intentionally no
  rollback command: repair mistakes with a new forward migration. Migrations
  must inspect current database state and be idempotent so an older, partially
  migrated, already-migrated, or fresh database can safely run the same file.

- New deployments should run `yarn migrate:deploy` before building/releasing;
  it runs `prisma generate`, all pending tracked migrations, then
  `prisma db push`. Do not add it to `yarn build`, because ordinary and preview
  builds must not write to a database.
