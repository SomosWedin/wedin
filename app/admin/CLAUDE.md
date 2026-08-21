# CLAUDE.md (app/admin)

### Staff-only access (`/admin`)
Gated on `User.role === 'ADMIN'` (`UserType` enum) **plus** a short-lived
email OTP step-up session. Staff accounts are flagged by hand in the DB
(`yarn prisma studio`) — there's no self-serve role-assignment UI, and none
is planned; keep it that way unless a real need shows up. Enforcement is
layered, all three real (not just belt-and-suspenders):
- `middleware.ts` redirects non-admins away from admin routes, but it reads
  `session.user.role` from the JWT, which is only refreshed at login — a
  role change via Prisma Studio doesn't take effect until the user
  re-logs-in. It also redirects admins without a valid step-up cookie to
  `/admin/login`, verifying the cookie with `lib/admin-session.ts` (jose +
  Web Crypto only, so it stays Edge-safe — never import Prisma there).
- Every admin page/server action independently calls
  `getAdminSessionUser()` (`actions/auth/admin-session.ts`), which hits the
  DB fresh for the role *and* re-verifies the step-up cookie.
  **This is the real boundary**, not the middleware — server actions are
  callable independent of what page renders them, so an admin with only a
  normal session must not be able to reach them. It's also what catches a
  demoted admin whose cookie is stale.

### The step-up session
`/admin/login` (`actions/auth/admin-otp.ts`) emails a 6-digit code via the
shared Resend helper in `lib/emails.ts`. On success it sets a separate
cookie — `__Host-wedin_admin` in production, `wedin_admin` in dev, since
`__Host-` requires Secure — holding a jose-signed JWT that expires after 60
minutes with no sliding renewal. Deliberate properties:
- The token's `sessionBinding` claim is a SHA-256 of the Auth.js session
  cookie value, so a step-up cookie lifted on its own (or kept across a
  re-login) is worthless. `authjs.session-token` is read under both its
  plain and `__Secure-` names.
- The `__Host-` prefix also keeps the cookie off the per-event subdomains
  that `middleware.ts` rewrites.
- Codes are stored as a keyed HMAC (`AdminOtp.codeHash`), never in plain
  text, and capped at 5 attempts — see `prisma/CLAUDE.md`. Requesting a new
  code deletes any prior unconsumed one.
- Rate limits live beside the magic-link ones in `lib/rate-limit.ts` and
  key on the *hashed* user id, matching `actions/auth/login.ts`.
- Signing uses `ADMIN_SESSION_SECRET`, falling back to `NEXTAUTH_SECRET`
  when unset, so no new env var is required to deploy.

Unlike the magic-link login, the OTP failure messages here are specific
(wrong code, attempts remaining, cooldown) rather than deliberately vague —
the caller is already an authenticated admin, so there's no enumeration to
protect against and the clarity is worth more.

Because the code goes to the same mailbox that receives the magic link,
this is **re-authentication, not a true second factor** — it limits the
blast radius of a stolen session cookie or an unlocked laptop, but a
compromised mailbox still clears both gates. Adding TOTP later means adding
a second verifier in front of `startAdminSession`; nothing else has to
change.

When adding a new admin route under `app/admin/`, remember the onboarding
redirect in `middleware.ts` explicitly exempts admin routes (a freshly
`ADMIN`-flagged account defaults to `isOnboarded: false` and would
otherwise get bounced into the couple-onboarding wizard) — a new top-level
route group outside `app/admin/` would need the same exemption.
