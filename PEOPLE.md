# People: first release

## Visitor experience

- `/people`: searchable public directory, expertise/date/availability filters, and an optional Claude connection guide.
- `/people/<id>`: professional profile, LinkedIn link, conversation interests, confirmed upcoming appearances and an event-specific introduction form.
- `/people/manage`: private profile editor, appearance management, introduction inbox and recovery tools.
- Upcoming event pages include People You Can Meet. Completed appearances automatically leave discovery.
- My Activity links to the inbox. Participants can save a connection and its LinkedIn link to their private browser journal after confirming they met.

The launch directory intentionally contains no fabricated or scraped people. Each person submits their own profile and explicitly agrees to publication. Invite the first community members to create profiles, then review them.

## Publication and attendance

Profile submissions and profile edits are pending until approved. Staff must check identity and consent against the supplied profile and other appropriate evidence; approval is not represented as a LinkedIn verification badge.

Attending is self-confirmed by the owner of an approved profile. Speaking and hosting additionally require an organizer announcement and staff approval. All claims refer to upcoming catalog events. Clicks, saved events and LinkedIn activity are never used to infer attendance.

People can remove their public profile or individual appearances. Profile removal also withdraws pending introductions. Removing an appearance withdraws pending introductions addressed to that person for that event. Plans can change; a listing is not a guaranteed meeting.

## Staff operations

Use `/people/review`. It reuses the existing `ACCESS_ISSUER`, `ACCESS_AUD`, `ADMIN_EMAIL` Cloudflare Access verification or `DASHBOARD_TOKEN` fallback used by the existing staff dashboard. No new credential is required. If Access is scoped to specific paths, include `/people/review` and `/api/people/review` in the existing staff Access application. A token, when used, is entered only in the password field and kept in page memory, never in a URL or local storage.

The queue supports approving profiles, requesting changes with a note, reviewing speaker/host source URLs, hiding published profiles, and resolving reports. Pending submissions, report details, and profile ownership keys are not public. Introduction messages are not included in the staff review API.

## Private workspaces and introductions

This pilot uses a random 256-bit browser key (`ppl_` plus 64 hexadecimal characters). Only a SHA-256 hash is stored as ownership proof on the server. The key is stored locally; the visitor can reveal a recovery code and restore it in another browser. Treat recovery codes as passwords. There is no email-based recovery or external sign-in in this release.

Approved members can request up to five introductions per day. A request requires a real, approved, upcoming appearance and an open-to-meet recipient. Only the recipient can accept or decline. Participants can withdraw, block, mark follow-up, and confirm they met. Mutual connections require both participants' confirmations; future events cannot be marked as already met. Requests and replies are private to participants. The inbox is the notification channel in this release; no external invitations or email notifications are sent.

My Activity notes remain browser-local. Saving an accepted introduction into the journal is an explicit participant action after they confirm the meeting.

## Claude and public search

Help Me Connect uses the existing Anthropic secret and model configuration. It sends only the current prompt, approved public profile data, and confirmed upcoming appearances. It does not include private introductions, recovery keys or My Activity notes. Returned person/event IDs are checked against actual public pairs; invented pairs are discarded. Empty directories, unavailable providers and rate limits have explicit states. Basic directory search works without Claude.

## Storage and validation

`people-schema.sql` and `people-db.mjs` define idempotent D1 tables. The Worker initializes them on first use through the existing COMMUNITY binding; deployment requires no destructive database migration. Public HTTP responses never expose ownership hashes or private messages.

Run `node build-site.mjs`, `node --test *.test.mjs`, and a Wrangler dry-run. `people.test.mjs` covers privacy, access controls, moderation, link validation, event expiry, introduction state transitions, blocking, opt-out, connection confirmation and AI person/event validation.
