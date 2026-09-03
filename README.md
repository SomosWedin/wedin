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

Install dependencies and create a fresh local copy of the Atlas database:

```bash
yarn install
yarn db:local:refresh
```

The refresh command starts MongoDB, downloads the Atlas archive, drops the
complete local `wedin` database only after the download succeeds, restores the
archive, and then stops. It does not run tracked migrations or `prisma db push`.
It prompts for the Atlas URI without echoing it. The URI should include the
source database name, for example
`mongodb+srv://<user>:<password>@<cluster>/wedin-prod`. If it does not, provide
the non-secret database name separately:

```bash
MONGO_SOURCE_DB=wedin-prod yarn db:local:refresh
```

Start the app with a connection string that is explicitly forced to local
MongoDB, regardless of the value in `.env` or `.env.local`:

```bash
yarn dev:local
```

For later sessions, `yarn dev:local` starts MongoDB automatically. Run
`yarn db:local:refresh` only when a completely fresh Atlas copy is needed;
every local collection is removed. `yarn db:local:pull` is also available when
only collections present in the Atlas archive should be replaced. Use a staging
or sanitized source when production contains personal, payment, or
authentication data.

Stop MongoDB without deleting its local data:

```bash
yarn db:local:stop
```

The explicit local connection used by these commands is
`mongodb://127.0.0.1:27017/wedin?replicaSet=rs0`.

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
