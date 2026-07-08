# CLAUDE.md

Wedin — a wedding gift-list / registry web app (Next.js App Router).

## Stack
- Next.js (App Router) + TypeScript
- Prisma (PostgreSQL) — schema in `prisma/`
- NextAuth (`@auth/prisma-adapter`) for auth
- TanStack Query for client data fetching
- Radix UI + Tailwind for components
- AWS S3 for image uploads (`lib/s3.ts`, `actions/upload-to-s3.ts`)
- Zod for validation

## Commands
- `yarn dev` — start dev server
- `yarn build` — runs `prisma generate` then `next build`
- `yarn start` — run production build
- `yarn lint` — Next.js lint
- `yarn prisma migrate dev` — apply DB migrations locally
- `yarn prisma db seed` — seed the database (`prisma/seed.ts`)

## Project layout
- `app/` — routes, grouped: `(auth)`, `(dashboard)`, `(default)`, plus `onboarding/` and `api/`
- `actions/` — server actions, organized by domain: `auth/`, `data/`, `common/`
- `schemas/` — Zod validation schemas (one file per domain)
- `lib/` — shared helpers (routes, mail, s3, tokens, countries…)
- `components/` — UI; `hooks/`, `utils/`, `styles/`

## Conventions
- Package manager is **yarn**.
- Formatting/linting is **Biome** (`biome.json`): single quotes, 2-space indent,
  line width 80, semicolons, es5 trailing commas. lint-staged runs Prettier then Biome on commit.
- New server-side logic goes in `actions/<domain>/`; matching validation in `schemas/`.
- Keep imports organized (Biome `organizeImports` is on).
