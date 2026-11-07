# Canopy evolution — November 7, 2026

## Published application changes

- Shorter event-first homepage, News section, secondary organizer menu, weekly picks and My activity navigation.
- Date presets, separate Free and Following filters, result counts, a reset action and consistent Central time. Hybrid events appear in either participation filter.
- Multi-day/overnight bounds, ongoing events and ended-event exclusion. Unknown prices and audience/eligibility details are explicit. Submission dates and times are not guessed.
- Stable event IDs for existing records in event-identities.json, preserving legacy saves, RSVPs and views. New source identities use deterministic hashes. A source URL reused across occurrences also uses date and organizer to distinguish occurrences.
- Crawlable /events/:slug pages with canonical URLs, structured event data, social metadata, related events, corrections, save/attendance/invite/calendar actions. /sitemap.xml and /robots.txt support discovery.
- Group topic filtering, browser-local follows, reviewed source links, automated link availability auditing. Link availability is not event verification.
- Distinct group suggestions and correction forms go to a private review queue; organizer confirmations require staff review. No suggestion automatically publishes.
- One-file export of saved events, activity backup/restore, personalized /calendar.ics subscription and /digest.xml feed.
- Quiet zero activity, smaller orange statistics, popularity visible after three distinct events receive views, keyboard-operable event titles, modal focus trap/return, skip link, touch target and focus contrast improvements.
- Lazy maps/news, one consolidated catalog, cached Chicago time conversions for responsive filtering.
- Private dashboard at /admin (redirects to /#admin) and /api/admin, with 30-day event views, registration-link clicks, saves, current Going responses, directory health and a listing review queue. Registration clicks do not prove registration or attendance.

## Email activation: Resend

The complete opt-in and weekly delivery implementation is present, but signup stays unavailable until authorized delivery is configured. Calendar/RSS subscriptions and the on-site email preview work immediately.

1. Create or use a Resend account and verify a sending domain you control. Complete any account terms yourself.
2. Configure a sending address, for example a digest mailbox on the verified domain. Do not use an unverified sender.
3. In the existing Cloudflare Worker settings, add RESEND_API_KEY as a secret and DIGEST_FROM as the verified sender value. Never commit the API key or paste it into a public issue.
4. Choose a plan that supports the expected weekly volume. The site sends through /emails, with confirmation and visible/RFC one-click unsubscribe links; this is separate from Resend Broadcasts.
5. Test using your own address: subscribe, confirm, receive a weekly email and unsubscribe. Only confirmed subscribers receive weekly emails.

The existing 15-minute Worker cron checks for Monday after 8 a.m. America/Chicago. Delivery is deduplicated by subscriber and week using Resend idempotency keys plus a D1 delivery record; failed sends can retry. A run handles up to 50 unsent subscribers. Review provider quotas before a larger launch. Confirmation requests are limited per browser and email.

## Staff access activation: Cloudflare Access

No staff data is public. Unconfigured or unauthorized requests return an error without metrics or queue data.

1. Create a Cloudflare Access application protecting BOTH chitech.events/admin* and chitech.events/api/admin*. Keep all normal visitor pages public.
2. Enable email one-time PIN and allow only the intended staff email address. Do not use an unrestricted email-domain or all-users rule.
3. Set ACCESS_ISSUER to the exact Access issuer origin, ACCESS_AUD to that application's audience, and ADMIN_EMAIL to the allowed staff address in the Worker settings.
4. Verify an anonymous request is denied and the allowed staff identity can open /admin. The Worker independently verifies the JWT signature, issuer, audience, expiry and staff email.
5. Optional alternative: configure a long random DASHBOARD_TOKEN as a Worker secret. The login form holds it only in page memory. Cloudflare Access is preferred for normal use.

A listing's "Mark reviewed" action records review; it does not publish source changes. Verified changes must still be applied to data.js and deployed. Existing event/partner submissions remain in their established D1 review tables.

Automated email tests use a mocked provider; live delivery still needs the account configuration above.

## Build and verification

Run node build-site.mjs before tests and deployment. It regenerates catalog.mjs and public/catalog.js, preserves existing event-identities.json and prepares static assets. The existing Cloudflare build command already calls this script. D1 tables are created additively/idempotently; no existing response, referral or connection data is deleted.

Checks: community.test.mjs, submissions.test.mjs, collaboration.test.mjs, news-calendar.test.mjs and evolution.test.mjs. New checks cover Chicago dates, overnight/multiday overlap, analytics access isolation, pending-only suggestions, email disabled state, double opt-in, confirmation reuse, weekly deduplication, unsubscribe, event-page escaping and structured metadata.

The group link audit is included in the daily source-update workflow. 93 links were reachable and four restricted automated access on the last check after replacing broken links. Restricted is not the same as broken. Some groups still need current event-date verification; unknown prices, times and audiences were not fabricated.
