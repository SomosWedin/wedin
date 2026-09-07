# Background catalog imports

Staff upload and match a file in the browser without creating a job. When they
request step 3, the app creates a `PREPARING` draft and transfers mapped rows
through stable JSON endpoints in requests of at most 20 rows / 600 KB. This
keeps large imports out of one Server Action and lets the server persist and
page the database-backed review. Acceptance rechecks the review token and all
included rows before queueing. Only the job and run identifiers are sent
through QStash. The modal can close after acceptance; `/admin/jobs` shows
persisted progress and paginated details.

Collection imports use the same job lifecycle. They synchronize only the
collections present in the file, never create or edit gifts, and show added,
removed, retained, missing, and ambiguous gift references before acceptance.
The worker compares the reviewed membership snapshot before writing so a later
admin edit is never overwritten silently.

## Review filters

Step 3 filters rows by validity or error category, including database duplicates,
file duplicates, names, prices, categories, event types, collections, collection
compatibility, and image URLs. Counts represent rows; a row can have
several error types. Filters never change the acceptance exclusions.

## Local development

Run `yarn db:local:migrate` and `yarn db:local:push`, then `yarn dev:local`.
These commands explicitly target the native loopback MongoDB replica set.
They never select the configured Atlas database. QStash automatically uses
its local development server when Next runs in development outside Vercel;
the SDK downloads the local QStash binary on first use.

For a port other than 3000, set `QSTASH_CALLBACK_URL=http://localhost:PORT`
in your local environment. This must be the app origin, without credentials,
query parameters, or a path. Keep the Next process running after closing the
modal. Restarting the QStash development server clears its in-memory queue;
use the jobs table to resume saved imports after a restart.

## Vercel

Configure `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, and
`QSTASH_NEXT_SIGNING_KEY` for the intended deployment environment. Set
`QSTASH_CALLBACK_URL=https://your-app-domain` when a stable public origin is
required. Otherwise Vercel deployments use their system-provided `VERCEL_URL`,
which keeps the callback on the same immutable deployment and database. Use
separate queue credentials and callback origins for preview environments.
Deployment protection must allow QStash to reach
`/api/jobs/gift-import`, `/api/jobs/gift-import/failure`,
`/api/jobs/collection-import`, and `/api/jobs/collection-import/failure` (all
verify QStash signatures, including the exact callback URL).

Use the existing `yarn migrate:deploy` workflow before release. Ordinary
builds do not migrate or change databases. No credentials are checked in.

## Recovery and limits

A delivery processes up to 50 rows, stops starting rows after 20 seconds, and
has a 60-second route budget. Each row transaction has a 15-second timeout;
its lease is renewed for 90 seconds. QStash retries delivery three times,
95 seconds apart so an interrupted worker's lease can expire first. A fresh
attempt revalidates pending rows against the current catalog. Database name
conflicts retry and then resolve to skipped rows linking the existing gift.

Dispatch failures and exhausted deliveries are persisted. Staff can resume
pending/failed rows when no worker lease is active. A manual retry changes
`runId`, fencing out old deliveries and failure callbacks. Completed and
excluded rows remain untouched. Validation errors continue to the next row;
infrastructure failures keep completed work and record only a safe message.

Preparing jobs have not been accepted and never create gifts. Closing or
backing out of their review marks them cancelled. Existing stranded
preparations can also be cancelled from the jobs table; importing their file
still requires a new upload and review. Cancelling accepted work, editing,
scheduling, and deleting job history are outside this feature.

QStash reference: https://upstash.com/docs/qstash/howto/local-development
and https://upstash.com/docs/qstash/features/callbacks.

## Automated verification

`RUN_LOCAL_IMPORT_TESTS=1 yarn test:run tests/integration/import-jobs.test.ts`
runs against only `127.0.0.1:27017/wedin_import_jobs_test`. It clears its own
test fixtures between cases. Add `RUN_LOCAL_QSTASH_TESTS=1` to also exercise
a real signed HTTP delivery through the local QStash server. Ordinary tests
and builds skip these opt-in integration checks.
