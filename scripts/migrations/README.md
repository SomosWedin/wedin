# Database migrations

Generate a forward-only migration:

```sh
yarn migration:create add_status_to_gifts
```

The generated file exports `up(prisma)`. Keep it idempotent: Mongo schema and
index operations cannot always share a transaction with data backfills, so an
interrupted migration may need to run again before its tracking row was saved.
The first four tracked files represent database changes that predate this
runner. They inspect the current MongoDB state, complete only missing work, and
are then recorded exactly like every newer migration.

Useful commands:

```sh
yarn migration:status
yarn migrate
yarn migrate:deploy
yarn deploy:build
```

`migrate:deploy` runs `prisma generate`, applies pending data migrations, and
then runs `prisma db push`. A failure exits non-zero and must stop the release.
Applied migration files must never be edited or deleted; add another migration
to correct them.

`deploy:build` is the production deployment entrypoint. On Vercel production
it runs `migrate:deploy` before `build`; preview builds run only `build`. Set
`RUN_MIGRATIONS=true` when using the command on another deployment platform.

On the first `yarn migrate` run, an old database safely completes any missing
historical work, while a fresh or already updated database records each file
after its state-aware operations become no-ops.
