# CLAUDE.md (prisma)

`schema.prisma` stays comment-free. Non-obvious context about fields,
indexes, and migration gotchas lives here instead — update this file
whenever you touch something documented below.

## Mongo/Prisma gotchas

- `Migration` is the application-managed equivalent of Rails'
  `schema_migrations`: its string `_id` is the complete timestamped filename,
  and its checksum makes applied files immutable. `MigrationLock` is a leased
  singleton used only by `yarn migrate` to prevent concurrent deploys from
  applying the same file. These collections are managed by the scripts in
  `scripts/migrations/`; they do not replace edits to this schema or
  `prisma db push`. The initial tracked migrations inspect MongoDB state so
  they safely recognize databases where the older changes were already
  applied, partially applied, or not applied yet.

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
- `EventType` is a seeded model, not an enum. Its stable `key` (`wedding`,
  `other`) is for application checks; its editable display `name` is for the
  UI. `Event.eventTypeId` is required; the 20260829 backfill assigns legacy
  events without one to `wedding` before `prisma db push` enforces the schema.
- `Category.eventTypeIds` is a Mongo many-to-many relation to `EventType`. A
  category may have several types. Category names are globally unique after
  normalization. In the admin gift form, a category is available only when it
  contains every selected event type. Editing a category updates the shared
  category seen by all of its gifts, including gifts linked to wishlists; do
  not create category snapshots. A collection's types are calculated at read
  time as the intersection of the event types on all categories represented by
  its gifts; an empty collection has no event types. Admins do not select
  collection types directly.
- `Gift.categoryId` is required and backed by the explicit `Gift.category` /
  `Category.gifts` relation. Mongo does not enforce cross-collection foreign
  keys, so supported gift writes validate the category and use a nested
  relation `connect`. The tracked gift-category migration deletes unreferenced
  orphan gifts and images, but retains and reports any orphan referenced by a
  wishlist to protect transaction history.
- `Gift.nameScopeKey` is a JSON-encoded unique key that normalizes the name
  and scopes catalog names by category and private organizer names by event
  plus category.
- `Giftlist` has no category or event-type fields: both are derived from its
  `gifts`. Do not persist or synchronize collection event types.
  `Gift.giftlistIds` / `Giftlist.giftIds` form a Mongo many-to-many relation;
  a gift may belong to zero or more collections. Adding, moving, or removing
  a gift recalculates each affected collection independently.
  New collections require at least one selected event type. Existing legacy
  collections may still have no types until migrated. Removing or deleting a
  gift never deletes an empty collection.
  `normalizedName` is the trimmed, lowercase Spanish locale form of `name` and
  enforces case-insensitive global collection-name uniqueness. Counts and total
  prices are derived from `Giftlist.gifts`; do not add denormalized fields for
  them. The tracked migrations detect duplicate collection names, backfill
  `normalizedName`, remove the legacy `categoryId`, migrate the former event
  type enum, and reconcile both sides of the gift/collection many-to-many
  relation before `migrate:deploy` runs `prisma db push`.
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
  copies `ORGANIZER_TERMS.version` from `lib/terms/` at acceptance time —
  it records *which* document was accepted, so bump that version whenever
  the organizer terms change materially. Grandfathered events (published
  before this existed) have both `null` while being live, so the dashboard
  treats `termsAcceptedAt != null || isPublished` as "already accepted" —
  otherwise they'd be shown an "Activar lista" button for a site that is
  already on. The consequence is that those events carry no acceptance
  record until the next time they are published from a fresh page load,
  which is deliberate: stamping one on deploy would assert an acceptance
  that never happened.
