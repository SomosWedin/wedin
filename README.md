Wedin — a wedding gift-list / cash-registry web app (Next.js App Router).
See `CLAUDE.md` for the product overview, stack, conventions, and current
implementation state.

## Getting Started

### Local MongoDB

The development database runs as a single-node replica set because Prisma
transactions require one. It runs directly on macOS with a 256 MB cache; Docker
is not used. Its user-scoped data and logs live in
`~/Library/Application Support/WedinMongoDB`; it does not change Homebrew's
global MongoDB configuration or data directory.

Install MongoDB Community once:

```bash
brew tap mongodb/brew
brew trust mongodb/brew
brew install mongodb-community
```

For the first local setup, install dependencies, restore Atlas, bring that copy
up to date with the current branch, and start the app:

```bash
yarn install
yarn db:local:refresh
yarn db:local:sync
yarn dev:local
```

The refresh command starts MongoDB, downloads the Atlas archive, drops the
complete local `wedin` database only after the download succeeds, restores the
archive, and leaves MongoDB running for the next command. It does not run
tracked migrations or `prisma db push`. The following `db:local:sync` is a
separate step that applies both operations to the restored local copy.

It prompts for the Atlas URI without echoing it. The URI should include the
source database name, for example
`mongodb+srv://<user>:<password>@<cluster>/wedin-prod`. If it does not, provide
the non-secret database name separately:

```bash
MONGO_SOURCE_DB=wedin-prod yarn db:local:refresh
```

For normal development after the first setup, only run:

```bash
yarn dev:local
```

This starts MongoDB automatically and forces the app to use the local connection
regardless of the value in `.env` or `.env.local`.

When a completely fresh Atlas copy is needed, run the restore and schema steps
separately:

```bash
yarn db:local:refresh
yarn db:local:sync
```

`db:local:refresh` removes every local collection. `db:local:pull` is also
available when only collections present in the Atlas archive should be
replaced. Use a staging or sanitized source when production contains personal,
payment, or authentication data.

Stop MongoDB without deleting its local data:

```bash
yarn db:local:stop
```

The explicit local connection used by these commands is
`mongodb://127.0.0.1:27017/wedin?replicaSet=rs0`.

#### Direct command replacements

During local development, use these replacements so database operations cannot
accidentally use the Atlas URL from an environment file:

| Previously used directly | Local-development replacement | Effect                                                                                                       |
| ------------------------ | ----------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `yarn dev`               | `yarn dev:local`              | Starts MongoDB and runs Next.js against the local database.                                                  |
| `yarn migrate`           | `yarn db:local:migrate`       | Generates Prisma Client and applies pending tracked migrations locally.                                      |
| `yarn prisma db push`    | `yarn db:local:push`          | Generates Prisma Client and pushes `prisma/schema.prisma` locally.                                           |
| `yarn migrate:deploy`    | `yarn db:local:sync`          | Generates Prisma Client once, runs tracked migrations, then runs `prisma db push` locally.                   |
| `yarn prisma generate`   | `yarn prisma generate`        | No replacement is needed because it only generates client code and does not connect to or modify a database. |

The local database-management commands are:

| Purpose                         | Command                 | Effect                                                                                                  |
| ------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------- |
| Start MongoDB                   | `yarn db:local:start`   | Starts the local replica set without starting Next.js.                                                  |
| Stop MongoDB                    | `yarn db:local:stop`    | Stops MongoDB and keeps its local data.                                                                 |
| Replace matching collections    | `yarn db:local:pull`    | Restores Atlas collections with `--drop` but keeps local-only collections.                              |
| Restore a completely fresh copy | `yarn db:local:refresh` | Downloads Atlas first, drops the complete local database, and restores it. It does not migrate or push. |

After making database-related code changes, choose the smallest command that
matches the change:

```bash
# Apply pending tracked data migrations
yarn db:local:migrate

# Apply changes from prisma/schema.prisma
yarn db:local:push

# Apply both, in the order shown above
yarn db:local:sync
```

Do not use a bare `yarn prisma db push` when you intend to update only the local
database. Prisma uses the resolved `DATABASE_URL`, so that command could target
Atlas if the environment files point there. `yarn prisma generate` is safe to
run by itself because it only regenerates the Prisma client and does not change
any database.

These replacements are for local development only. Vercel continues to run
`yarn deploy:build` and uses the `DATABASE_URL` configured in the Vercel
environment.

### Development server

Run the development server:

```bash
yarn dev:local
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
