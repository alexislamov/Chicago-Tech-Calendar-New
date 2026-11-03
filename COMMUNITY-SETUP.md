# Go together: deployment

The updated site adds shareable event invitations, Interested/Going responses, community counts, a private connection journal, follow-up dates and milestone badges.

## Production deployment

The existing site uses a Git-connected Cloudflare Worker named `chicago-tech-calendar`, deployed with `npx wrangler deploy` on pushes to `main`.

`wrangler.jsonc` defines the Worker entrypoint, the `ASSETS` static binding and the `COMMUNITY` D1 binding. Wrangler runs `build-site.mjs` before deployment; it copies only public website assets into `public/`. API requests run through `worker.mjs`; normal requests retain static asset hosting. Daily event updates continue to trigger the same deployment.

The `canopy-community` database was created in the existing Cloudflare account, and `community-schema.sql` was successfully applied through the database console. Its non-secret database ID is recorded in the deployment config.

Deploy by committing the changes to the connected GitHub repository. Keep the Cloudflare deploy command `npx wrangler deploy`. No extra build command is needed. In a fresh environment, create a D1 database, replace the database ID in `wrangler.jsonc`, and apply the SQL migration before deploying.

After deployment, use two separate browser profiles: copy an invite in profile A, open it in profile B, respond, then reload A. Counts and the invite milestone should update. Remove B's response and confirm the credit disappears.

Official references: [Workers static assets](https://developers.cloudflare.com/workers/static-assets/) and [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/).

## What is stored

- Shared database: hashed random browser identities, event keys, response status and referral attribution. It stores no connection names or journal notes.
- Browser storage: a random identity plus private connection names, event names, notes, follow-up dates and follow-up status. These do not sync across devices. Clearing storage loses the journal and resets browser identity.
- Invitation links contain an event key and a public referral code, never the browser's secret identity.
- One response per browser/event; changing status replaces the response. Clicking the active status withdraws it.
- Invite totals count distinct referred browsers with at least one active response. Sharing a link alone earns no credit; self-invites earn none.
- Follow-up dates are saved reminders shown in the journal; there are no email or push notifications.

This is a lightweight community system, not verified attendance or verified accounts. Multiple profiles can inflate counts; add sign-in and abuse controls before using milestones for prizes or rewards. The API accepts event keys up to 1,000 characters; server-side event catalog validation is not included.

## Preview and checks

A static preview supports event links and the private journal. Community counts intentionally show unavailable without the API and database; no fabricated counts are displayed.

Use Node 22.13+ to run `node community.test.mjs`. The test uses SQLite in memory and exercises the real API handler: status replacement, counts, unique referrals, self-referrals, response privacy, withdrawals, input validation and origin checks. It does not replace a deployed Cloudflare smoke test.

Local browser checks completed: event modal, invite link generation, event preselection in journal, connection creation, follow-up milestones and persistence after reload. Shared API tests passed against SQLite; production Cloudflare has not been deployed or verified.
