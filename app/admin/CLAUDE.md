# CLAUDE.md (app/admin)

### Staff-only access (`/admin`)

Gated on `User.role === 'ADMIN'` (`UserType` enum). Staff accounts are
flagged by hand in the DB (`yarn prisma studio`) — there's no self-serve
role-assignment UI, and none is planned; keep it that way unless a real
need shows up. Enforcement is layered, both real (not just
belt-and-suspenders):

- `middleware.ts` redirects non-admins away from admin routes, but it reads
  `session.user.role` from the JWT, which is only refreshed at login — a
  role change via Prisma Studio doesn't take effect until the user
  re-logs-in.
- Every admin page/server action independently re-checks
  `getCurrentUser().role === 'ADMIN'`, which hits the DB fresh every call.
  **This is the real boundary**, not the middleware — server actions are
  callable independent of what page renders them, and it's what actually
  catches a demoted admin whose cookie is stale.
  When adding a new admin route under `app/admin/`, remember the onboarding
  redirect in `middleware.ts` explicitly exempts admin routes (a freshly
  `ADMIN`-flagged account defaults to `isOnboarded: false` and would
  otherwise get bounced into the couple-onboarding wizard) — a new top-level
  route group outside `app/admin/` would need the same exemption.

### Editing catalog gifts

`editAdminGift` (`actions/data/gift.ts`) never consults the wishlist edit lock
(`lib/wishlist-gift-edit-lock.ts`) — a catalog gift is editable no matter how
many events have paid for it. What protects couples is **copy-on-write, and
only for the money fields**:

- Changing `price` or `categoryId` calls `copyCatalogGiftForWishlistLinks`
  first, forking a private per-event `Gift` for every linked `WishlistGift` and
  repointing it, so live events keep the values guests were shown. The gate is
  `catalogGiftSnapshotRequired`, not "did anything change".
- Changing only the **name or image** does not fork. The catalog row is renamed
  in place, so every `WishlistGift` still pointing at it picks the change up —
  **including ones with completed payments**, whose ledger relabels. That is
  deliberate (see the root `CLAUDE.md`); linkage decides propagation, payment
  state is irrelevant here.
- Gifts a couple already customized are private `Gift` rows and are therefore
  untouched by any admin edit, name included — there's no path to push a
  correction into them.
- `deleteDefaultGiftAsAdmin` always forks, unconditionally: the row is about to
  disappear, so a snapshot is mandatory.

Neither path revalidates `/e/[slug]`, so a rename may not reach the public
event page until that route re-renders.
