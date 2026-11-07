# Help me choose

The orange button beside search opens an accessible side panel. Visitors choose topics, goals and optional budget/location/format/date/time limits, or describe a request. Up to three current catalog events are shown with reasons, Save, Invite a friend and feedback. Top 5 remains a separate popularity feature.

## Enable Claude

In Cloudflare Workers & Pages, select `chicago-tech-calendar`, open Settings → Variables and Secrets, and add `ANTHROPIC_API_KEY` as a Secret. Save and deploy. Never put the key into source, browser code or chat. Optional `CLAUDE_MODEL` overrides the default `claude-haiku-5-5`. The service uses Anthropic Messages API version `2023-06-01` with the `x-api-key` authentication header, forced tool output, disabled thinking and 1,200 maximum output tokens. API billing belongs to the Anthropic account. Configure an account spending limit in Anthropic as well.

`GET /api/choose/status` reports only whether the key is configured. Check the panel after deployment and use Find my matches: the result label must say Chosen for you by Claude to confirm a real provider call. A configured key alone does not prove credentials, credits, or model access work. Missing credentials, timeouts, limits or malformed output fall back to explicitly labeled catalog matches. Free-text filtering without Claude recognizes only common phrases; use form controls for precise constraints.

## Privacy and learning

Remember my preferences is off by default. Preferences, feedback and viewed IDs remain in memory for the visit unless the visitor opts in. Saved-event and click-based affinity is used only with that opt-in. Likes carry more weight than saves; clicks are a weaker signal. Clear preferences & feedback deletes the guide’s local record without deleting saved events. Private connection notes are never read or transmitted. With Use Claude enabled, the request, normalized preferences and at most 40 short public event records are sent server-side to Anthropic. Requests, preferences, API responses and keys are not stored in D1 or logged by the application.

## Limits and grounding

The service limits Claude calls to 10 per hashed browser per hour, 20 per hashed network per hour and 250 total per UTC day. D1 atomically reserves quota before each provider call. These are request limits, not identity verification; the global cap bounds calls even if browser IDs rotate. Rate-limit records contain only counters, hashes and expiry, and are cleaned on subsequent requests. No D1 migration is needed: the counter table is created on first Claude request.

Only unexpired catalog events meeting selected hard filters are candidates. Unknown prices or times are excluded when the corresponding hard limit is selected. Application deadlines are excluded. Output IDs must be among the prefiltered candidates and duplicates are removed. Explanations are escaped as plain text. Organizer requirements and missing facts remain visible. Introductory suitability is a preference rather than a guarantee. No invented attendees, events, ticket availability or registration confirmations.

Run `node --test chooser.test.mjs community.test.mjs news-calendar.test.mjs evolution.test.mjs`, then `node build-site.mjs`. Check desktop and phone layouts, feedback, saving, invite copying, clearing, Escape/focus return, and provider fallback.
