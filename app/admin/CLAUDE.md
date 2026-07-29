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
