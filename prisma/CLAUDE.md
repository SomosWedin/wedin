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
- `Category.eventType` — which `EventType` a category is offered for; drives
  `getCategories(eventType)` and the catalog scoping in `getGifts` /
  `getGiftlists`. Deliberately a scalar, not a list: a category wanted for
  both event types gets **two rows with the same name** (team decision,
  2026-08-26). That is why `name` is no longer `@unique` on its own and
  `@@unique([name, eventType])` replaces it — dropping that compound index
  makes the duplicate-name model impossible, so don't.
  The open cost: `Gift.categoryId` points at one row, so duplicating a
  category splits the gifts beneath it. Two rows named "Aniversarios" do not
  share a catalog — a gift tagged to the `WEDDING` one is invisible to an
  `OTHER` event. Nothing needs this yet (every category has exactly one event
  type), but whoever first duplicates a name has to decide where the gifts
  live.
- `Category.eventType` is **optional on purpose**. A required scalar with
  `@default(WEDDING)` would silently tag every not-yet-migrated document as a
  wedding category; `null` instead means "not assigned yet", which is what
  `getCategoryIdsForEventType` keys on to suppress scoping while a database
  is mid-migration.
- `Transaction.bankTransferGroupId` — shared by every transaction created
  from the same `BANK_TRANSFER` cart checkout. The equivalent of
  `pagoparHash` for `CARD` transactions, since bank transfer never gets a
  Pagopar-issued hash to group by.
- `Event.isPublished` — default flipped `true` → `false` (2026-08-30) so a
  new event starts hidden and the organizer has to press "Activar lista",
  which is what makes their acceptance of the bases y condiciones an actual
  deliberate act. **No backfill:** `db push` doesn't touch existing
  documents, so events already live in an environment keep the `true` they
  were written with, which is what we want — nobody's site goes dark on
  deploy.
- `Event.termsAcceptedAt` / `termsVersion` — stamped by `setEventPublished`
  the first time an event is published, never overwritten afterwards
  (deactivating and reactivating does not re-stamp). Optional scalars with
  no index, so none of the sparse-unique traps above apply. `termsVersion`
  copies `ORGANIZER_TERMS.version` from `lib/terms.ts` at acceptance time —
  it records *which* document was accepted, so bump that version whenever
  the organizer terms change materially. Grandfathered events (published
  before this existed) have both `null` while being live, so the dashboard
  treats `termsAcceptedAt != null || isPublished` as "already accepted" —
  otherwise they'd be shown an "Activar lista" button for a site that is
  already on. The consequence is that those events carry no acceptance
  record until the next time they are published from a fresh page load,
  which is deliberate: stamping one on deploy would assert an acceptance
  that never happened.
