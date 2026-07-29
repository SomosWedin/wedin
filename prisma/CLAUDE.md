# CLAUDE.md (prisma)

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
