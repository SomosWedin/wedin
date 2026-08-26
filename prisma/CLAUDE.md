# CLAUDE.md (prisma)

`schema.prisma` stays comment-free. Non-obvious context about fields,
indexes, and migration gotchas lives here instead — update this file
whenever you touch something documented below.

## Mongo/Prisma gotchas

- **Sparse unique indexes**: any `String? @unique` field needs its
  underlying index manually converted to `sparse: true`. Prisma's schema DSL
  has no `sparse` option, and `prisma db push` will not create or repair it —
  a non-sparse unique index tolerates only **one** document missing the
  field; the second write throws `P2002`. Existing examples: `User.email`,
  `Image.giftId`, `Event.url`. Fix via raw Mongo commands whenever a new
  optional `@unique` field is added:
  ```
  db.<Collection>.dropIndex("<Field>_key")
  db.<Collection>.createIndex({ <field>: 1 }, { unique: true, sparse: true, name: "<Field>_key" })
  ```
  Order matters: create the sparse index **before** `prisma db push`, not
  after. `db push` can only create a unique index non-sparse, so on a
  collection where more than one document lacks the field the creation fails
  outright on duplicate nulls. Given an existing `unique: true, sparse: true`
  index of the right name it leaves it alone (verified against `wedin-prod`,
  2026-08-25).
  Sparse only skips documents **missing** the field — an explicit `null`
  still gets indexed, so more than one of those collides even on a sparse
  index. Clear the field rather than setting it null.
- **Environment index drift is real; audit before assuming**: as of
  2026-08-25 `wedin-prod` had accumulated, over and above the schema, a
  `Transaction_dlocalPaymentId_key` (unique, non-sparse, on a field deleted
  with the pre-Pagopar gateway — the second card checkout in prod threw
  `P2002` on it) and an `Image.url` unique index misnamed `Event_url_key`,
  apparently a past sparse repair aimed at the wrong collection. It was also
  missing `Image_giftId_key` entirely. All three were fixed by hand and the
  environment now matches the schema. `db push` reports only additions, so it
  will not tell you about a stale index — list the indexes per collection and
  diff against the schema when a `P2002` names a constraint you don't
  recognize.
- **`prisma db push` never touches existing documents** — it only updates
  the schema definition. Two ways this bites:
  - Renaming/narrowing an enum's values leaves old documents holding the old
    string; Prisma throws `Value 'X' not found in enum 'Y'` the moment it
    reads that field — and a `try/catch`-wrapped read (the convention
    elsewhere in this codebase) silently swallows that into an empty
    result, not a visible error. Backfill existing documents in the same
    pass (raw `$runCommandRaw` `update`, mapping old values to new) — see
    the `Transaction.paymentMethod`/`PaymentMethod` migration for the
    pattern.
  - Adding a new required field with a `@default(...)` does not backfill
    that default onto existing documents — only new writes get it. See
    `WishlistGift.quantity`/`reservedQuantity` below: before deploying a
    change like that to an environment, run a one-time raw Mongo backfill
    against that environment's database (not checked into this repo — kept
    as a local, one-off script per environment, run by hand). What this does
    _not_ do is make reads fail: verified on an unmigrated `Category` in
    production, Prisma substitutes the `@default` for a missing scalar and an
    empty array for a missing scalar list, so `findMany` returns rows rather
    than throwing. The visible symptom is silent and worse — a filter like
    `eventTypes: { has: ... }` matches nothing, so the query succeeds and
    returns zero rows. `getCategories` is built for that: it falls back to
    the unscoped list, and `getCategoryIdsForEventType` returns `null` rather
    than `[]` so callers skip scoping instead of filtering the catalog down
    to nothing.

## Field notes

- `WishlistGift.isReceived` — repurposed as an "archived" flag.
  `deleteWishlistGift` sets it instead of hard-deleting when the gift has
  any Transaction (any status) still pointing at it. Archived gifts are
  excluded from the guest site and the organizer's default `/wishlist` view,
  but the row and its transactions are kept. Despite the name, it's not
  literally "physically received" — no dedicated concept for that exists
  yet.
- `WishlistGift.reservedAmount` / `reservedQuantity` — atomic overselling
  guards used by `actions/data/checkout.ts` (group gifts held by amount,
  individual gifts held by unit count). Not `@unique`; atomicity comes from
  Mongo's single-document write, not an index.
- `WishlistGift.quantity` — total units available for an individual gift;
  unused for group gifts. Default `1` preserves pre-quantity-feature
  behavior for existing gifts.
- `Transaction.quantity` — always `1` for group-gift contributions; can be
  > 1 for an individual-gift purchase.
- `Category.eventTypes` — which `EventType`s a category is offered for;
  drives `getCategories(eventType)` and the catalog scoping in `getGifts` /
  `getGiftlists`. A list rather than a scalar because `Category.name` is
  `@unique`: with a scalar, a category offered for both event types would
  need two rows sharing a name, which the index rejects. The two taxonomies
  are disjoint today, so nothing sets both — the exception is a legacy row
  mid-migration, parked on `['WEDDING', 'OTHER']` so it stays visible until
  its gifts are retagged.
- `Category.sortOrder` — the catalog list has a deliberate order ("Luna de
  miel" first), so `getCategories` sorts on this before falling back to
  `name`. The canonical categories occupy 1..9 (see `prisma/seed.ts`); give
  any legacy row a higher number so it sorts last.
- `Transaction.bankTransferGroupId` — shared by every transaction created
  from the same `BANK_TRANSFER` cart checkout. The equivalent of
  `pagoparHash` for `CARD` transactions, since bank transfer never gets a
  Pagopar-issued hash to group by.
