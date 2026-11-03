# Shared event review queue

New submissions are stored in the `event_submissions` table of the `canopy-community` D1 database in the existing Cloudflare account. No emails are sent. The public submission API accepts POST only and never exposes submitted records.

Staff use Cloudflare's existing account permissions to access D1 → canopy-community → Explore Data → event_submissions. Filter `status` to `pending`, then sort by `submitted_at`. See the event title, organizer, date and full event details in `payload`. Use `review_notes` for internal reviewer notes.

Review workflow:
1. Verify the organizer's official event page and submitted details.
2. For approved events, add the reviewed event object from `payload` to `CANOPY_EVENTS` in `data.js` in GitHub. That deploys through the existing workflow.
3. Set `status` to `approved` after publication; use `rejected` and `review_notes` for declined entries.

Changing status alone does not publish an event. This first version uses Cloudflare's staff interface; an in-site organizer/admin dashboard and automatic approval-to-publication are future work.

Existing submissions saved only in a visitor's browser are not automatically uploaded. That visitor can resubmit through the new form.

`submissions-schema.sql` creates the table and indexes. Test with Node 22.13+ using `node submissions.test.mjs`. Per-browser throttling reduces accidental flooding but is not a replacement for verified organizer accounts or bot protection.
