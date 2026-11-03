# Daily news and Outlook Calendar

The daily news brief appears below the calendar's headline statistics. It selects up to six stories from seven RSS feeds: BleepingComputer, The Hacker News, SecurityWeek, Google AI, MIT Technology Review, NIST Cybersecurity Insights and Microsoft Security. Each card includes publisher, publication date, headline, a brief publisher excerpt and original link. Newsletter/footer boilerplate is removed; no full articles are stored.

## Updates and recovery

The existing Cloudflare scheduled handler checks every 15 minutes. After 6am America/Chicago, the first check of a new day refreshes the feeds once. Existing notification retries continue independently. The first visitor can initialize an empty brief; there is no dependency on a visitor being present for later daily updates. Seven fixed feed URLs are fetched on the server with timeouts, and article links are restricted to the publisher's domain. The public API allows GET only.

`news-schema.sql` creates `news_sources` (last good items per publisher) and `news_brief` (current six-story selection and refresh state). Apply it before deployment. An atomic lease prevents duplicate refreshes. Total failures keep the previous brief and permit retry after an hour. Partial failures retain recent items from affected sources. UI labels show refresh time, partial coverage and stale results. Items older than 14 days are not newly selected; a stale last-good brief is clearly labeled. Fewer than six stories are shown if there are insufficient recent results.

Selection favors freshness and different publishers, includes AI and security stories when available, and caps any publisher at two stories. This is an automated daily selection, not an editorial claim about the six most important stories. Adjust sources or keyword rules in `news-service.mjs`.

## Related events

Automatically show related events is enabled by default. Specific matches require both shared event topics and a shared subject such as AI agents, identity, vulnerabilities, cloud platforms or privacy. Include broader topic matches is an optional visitor preference. Up to two events in the next 30 days are shown with a reason. No close matches are invented. Clicking an event opens its existing details; matching happens in the visitor's browser and does not transmit their activity or notes to a news service.

## Outlook

Each event card and event detail has Add to Outlook Calendar. It downloads an `.ics` file to open in desktop Outlook or import using Outlook's Add calendar → Upload from file. It does not automatically modify anyone's calendar. Timed events are converted from America/Chicago to UTC, including daylight saving. Missing end times default to one hour; end times before the start are treated as overnight. All-day events and unknown start times become one-day all-day entries, with a note to confirm organizer details.

Run `node news-calendar.test.mjs` with Node 22.13+ for calendar time/escaping/folding, feed parsing, source/age validation, story selection, event matching, daily refresh gating and failure fallback tests. Confirm a six-story production brief and download an event before closing a release.
