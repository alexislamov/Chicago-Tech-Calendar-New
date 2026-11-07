# Popular events

The sidebar shows up to five upcoming events ranked by unique browser views in the past seven days. An event view is recorded when its details open from a calendar card, keyboard selection, map popup, shared event link or the Top 5 list. Saving an already open event does not record another view. Repeated opens by one browser count once per event within the rolling window. Ties use event date, time and title for a stable order.

The existing same-origin community API accepts `status: clicked` and stores a hashed browser identity, event key and latest view timestamp in an additive `event_clicks` D1 table. No names or connection notes are stored. Schema creation is idempotent for the existing deployment. Rankings contain aggregate counts only and do not return visitor identities. Interested/Going responses and invitations are independent.

The list refreshes after a view and with the existing minute/tab-return activity refresh. Only events still present and upcoming in the current calendar are displayed. No historical clicks are inferred or seeded: fewer than five clicked events yield a shorter list, and the empty state explains that the list will populate as visitors explore. Unavailable activity displays a clear fallback.

Validation: API tests cover distinct viewers, repeat opens, ranking, expiry, returning viewers and RSVP independence. Browser checks opened five different events, confirmed all five appeared, and reopened the first from the ranked list without increasing its count.
