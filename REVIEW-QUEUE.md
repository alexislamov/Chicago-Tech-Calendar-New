# Shared event review queue

New submissions are stored in the `event_submissions` table of the `canopy-community` D1 database in the existing Cloudflare account. Notification emails go to iskandarislamov@gmail.com; delivery failures are kept in the notification retry queue. The public submission API accepts POST only and never exposes submitted records.

Staff use Cloudflare's existing account permissions to access D1 → canopy-community → Explore Data → event_submissions. Filter `status` to `pending`, then sort by `submitted_at`. See the event title, organizer, date and full event details in `payload`. Use `review_notes` for internal reviewer notes.

Review workflow:
1. Verify the organizer's official event page and submitted details.
2. For approved events, add the reviewed event object from `payload` to `CANOPY_EVENTS` in `data.js` in GitHub. That deploys through the existing workflow.
3. Set `status` to `approved` after publication; use `rejected` and `review_notes` for declined entries.

Changing status alone does not publish an event. This first version uses Cloudflare's staff interface; an in-site organizer/admin dashboard and automatic approval-to-publication are future work.

Existing submissions saved only in a visitor's browser are not automatically uploaded. That visitor can resubmit through the new form.

`submissions-schema.sql` creates the table and indexes. Test with Node 22.13+ using `node submissions.test.mjs`. Per-browser throttling reduces accidental flooding but is not a replacement for verified organizer accounts or bot protection.

## Collaboration and notifications

New event and partner submissions notify `iskandarislamov@gmail.com` from `notifications@chitech.events` through the recipient-restricted `NOTIFICATIONS` binding. The destination is verified in Cloudflare. Notification records live in `notification_outbox`; failed sends retry every 15 minutes, up to five attempts. After resolving a persistent failure, staff can reset attempts to 0 and status to pending to retry. Submissions remain saved even when email is unavailable.

Partner requests are in `partner_requests`. Check the organization and its public contact page, then set status to `approved` to publish on the Partner Requests page. Use `rejected` to decline or `closed` to remove a request. Expired requests disappear automatically. `contact_email`, visitor identity and internal notes are never returned by the public API. The posted organization/contact-page URL is intentionally public after approval.

Co-hosts are stored in an event submission's `payload.cohosts`. Verify each partner's participation, then retain `cohosts` and the merged `orgs` IDs when publishing the event in `data.js`. The calendar displays partner names and roles and supports searching by partner name. Listing a partner does not provide an organizer login or shared editing rights.

Apply `collaboration-schema.sql` before deploying these changes. Run `node collaboration.test.mjs` for moderation, privacy, expiry, validation, co-host and notification tests. Keep the shared database out of preview deployments unless explicitly intended.
