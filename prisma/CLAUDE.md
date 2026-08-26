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
    as a local, one-off script per environment, run by hand).

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
- `Transaction.bankTransferGroupId` — shared by every transaction created
  from the same `BANK_TRANSFER` cart checkout. The equivalent of
  `pagoparHash` for `CARD` transactions, since bank transfer never gets a
  Pagopar-issued hash to group by.
- `BankDetails.accountIdentifierType` — `'account'` or `'alias'`, chosen by
  the organizer with the chips on `/bank-details`. Deliberately nullable
  rather than a required field with `@default("account")`: every
  `BankDetails` document written before the alias feature lacks the field,
  and a required field missing from an existing document breaks the read
  (see the backfill note above). Read it as `=== 'alias' ? alias :
accountNumber` so `null` falls through to the account number.
- `BankDetails.accountNumber` / `alias` — both nullable, exactly one is
  authoritative per `accountIdentifierType`. The form keeps whatever the
  organizer typed in the other one, so switching chips back and forth
  doesn't lose data; only the selected one should ever be shown to staff
  processing a payout.
