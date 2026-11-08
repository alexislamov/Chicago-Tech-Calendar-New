# Event pages and archive

Quick-view dialogs retain the main calendar experience and include a View full event link. AI recommendations and invitation links use the permanent `/events/<slug>` address.

Full pages include organizer-provided descriptions, schedule in Central time, venue, cost, registration, audience and organizer information. Missing information is explicitly identified. Upcoming pages support saving, calendar export and community responses; completed pages show an ended notice and omit registration and RSVP prompts.

`/past-events` provides keyword, topic and year search with pagination. Completed listings leave upcoming results automatically and remain searchable here. Permanent pages remain available for saved links.

`event-archive.json` stores public listing history, not visitor data. `build-site.mjs` merges the current feeds with this history. The daily feed workflow commits the history and event identities so feed removals do not erase old pages. A recurring registration URL on a new date receives a separate identity.

Run `node build-site.mjs` and `node --test *.test.mjs` to validate. Cloudflare builds regenerate the catalog and assets on deployment.
