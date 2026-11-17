# Maple Ridge Business Hub — unpublished draft

Private job management for Maple Ridge Home & Property Solutions LLC, from first contact through payment. The first implementation is complete and tested locally; no Vercel deployment has been created.

## What works

- Owner-only email/password sign-in; public registration disabled.
- Job dashboard and searchable job list, with stages from lead to closed.
- Customer/property details, window counts, measurements, scope, notes, and checklists.
- Monthly calendar with editable site visits, work days, and follow-ups in Eastern time.
- Estimated versus actual costs for materials, owner/helper hours, travel, rentals, disposal, and other expenses. Unknown costs stay blank; confirmed zero is distinct.
- Separate proposed customer price, recorded deposits/payments, and preliminary margin calculations.
- Private JPEG/PNG/WebP photos (3 MB per photo), protected on every read.
- Editable estimate, invoice, change-order, and customer-message drafts. Every document is validated as `draft` on the server and printed with draft labels. No sending, approval, or finalization endpoint exists.
- Private JSON backup download, including photos. Stale concurrent job edits are rejected instead of overwriting newer data.

Customer data is stored in the database, never in the source repository or browser local storage. The initial real lead was imported into the local database and preserved separately as a private JSON draft. No prices, dates, deposits, measurements, or contact details were invented.

## Deployment restriction

**Do not deploy or publish without Michael’s explicit approval.** `vercel.json` sets `git.deploymentEnabled` to `false`, so Git pushes are not deployment authorization. Do not remove this safeguard or run any Vercel deployment command without approval. The existing marketing website is outside this repository’s scope.

Intended Vercel project: `maple-ridge-business-hub`. No production environment variables were configured at the time of this build. Production still needs PostgreSQL, a strong authentication secret, the canonical HTTPS origin, and an owner account before release. App authentication remains mandatory even behind Vercel protection.

## Local development

Requires Node.js 24.

1. `npm ci`
2. Copy `.env.example` to `.env.local`. Generate a strong `BETTER_AUTH_SECRET`, set `HUB_OWNER_EMAIL`, and set `BETTER_AUTH_URL` to the exact local origin. Keep all credentials out of git.
3. `npm run db:prepare`
4. Run `npm run owner:create`, providing a password of at least 12 characters through stdin (not a command-line argument), then close stdin. The command only creates the first account. Public signup remains disabled.
5. `npm run dev`

Local development uses `.private/hub.db` (SQLite). Production and Vercel **refuse** filesystem storage and require `DATABASE_URL`; there is no silent temporary-storage fallback.

## Future production setup — no release authorization

After the owner authorizes the required hosting setup, configure a managed PostgreSQL database and set `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (the exact HTTPS origin), and `HUB_OWNER_EMAIL` in the intended project. Run `npm run db:prepare` against that database, create the owner account through the stdin-only command, and import the private lead file with `npm run lead:import < /private/path/lead.json`. Imports are idempotent and never overwrite an existing job ID.

Production migrations and PostgreSQL connectivity must be verified against the actual database before any approved deployment. Do not upload the local SQLite database, local environment files, temporary QA credentials, or authentication tables to GitHub. Customer data must remain separate from the code.

## Validation

- `npm run test`: 13 automated checks covering session authentication/sign-out, disabled registration, origin protection, draft-only validation, cost calculations, persistence, owner scoping, concurrency conflicts, and production storage failure behavior.
- `npm run typecheck`
- `npm run build`
- `npm audit --omit=dev --audit-level=high`: no known vulnerabilities at verification time.
- Desktop and 390-pixel phone layouts visually reviewed with synthetic data; job navigation and draft preview inspected.
- Local HTTP workflow verified through the running development server: 11 checks covering anonymous access rejection, authenticated creation/save/readback, draft status rejection, stale revisions, calendar/cost/payment persistence, private photo upload/read, unsafe file rejection, and backup export. Test fixtures were removed; real lead data was not changed.

`scripts/verify-local.ts` can rerun the HTTP workflow against a local development server. It reads the local QA owner password through stdin, creates disposable test records, and removes only its own fixtures. Do not run against production. If the execution environment isolates localhost from the preview process, run the test from the server’s environment; do not open the app’s authentication boundary.

## Practical limits

- Not deployed. Production database provisioning, actual PostgreSQL migration, and production login are not yet verified.
- Single owner; no customer portal or additional staff accounts.
- No accounting sync, email delivery, card charging, tax calculation, or final invoices.
- Photos are stored in the private database for this initial version. For a large photo collection, migrate to private object storage while retaining authorization on reads.
- Backup export exists; importing a single job is supported. A bulk backup restore UI is not included.
- New job and document changes require saving. Photo uploads save immediately.
