# Canopy: Chicago Tech, AI & Security Calendar

This folder contains the website. The calendar has no build step. Shared community responses use a Cloudflare Worker and D1 database; see [COMMUNITY-SETUP.md](COMMUNITY-SETUP.md). Event sharing and the private connection journal also work in a static preview.

| File | What it is |
|---|---|
| `index.html` | The page: layout, styles and all the behavior |
| `data.js` | The content: every group and event. **This is the file you edit to add events by hand.** |
| `auto-events.js` | Events pulled in automatically every night. **Don't edit by hand**: it's overwritten on each run |
| `geocache.json` | Saved map coordinates for addresses, so each one is only looked up once (updated automatically) |
| `feeds.json` | The list of calendar feeds the nightly update reads |
| `scripts/update-events.mjs` | The script that does the nightly update |
| `.github/workflows/update-events.yml` | Tells GitHub to run that script every day |
| `README.md` | These instructions (not shown on the site) |

To preview it, double-click `index.html` and it opens in your browser.

---

## Option 1: Netlify Drop (fastest, about 2 minutes, free)

1. Go to **https://app.netlify.com/drop**.
2. Drag this whole folder (the one containing `index.html`) onto the page.
3. Netlify gives you a live link like `https://random-name-123.netlify.app`.
4. Create a free account when asked, so the site doesn't expire.
5. In **Site configuration → Change site name**, rename it, e.g. `chicago-tech-calendar.netlify.app`.

**To update later:** open the site in Netlify → **Deploys** → drag the folder onto the deploy area again.

## Option 2: GitHub Pages (free, keeps a history of every change)

1. Create a free account at **https://github.com** if you don't have one.
2. Click **New repository**. Name it e.g. `chicago-tech-calendar`, set it to **Public**, and click **Create repository**.
3. On the new repo page, click **uploading an existing file**. Drag in `index.html`, `data.js` and `README.md`, then click **Commit changes**.
4. Go to **Settings → Pages**. Under "Build and deployment", set **Source: Deploy from a branch**, **Branch: main**, folder **/ (root)**, and click **Save**.
5. After a minute or two the site is live at `https://YOUR-USERNAME.github.io/chicago-tech-calendar/`.

**To update later:** open `data.js` on GitHub, click the pencil icon, edit, and click **Commit changes**. The site updates in about a minute.

## Option 3: Cloudflare Pages (free, fast worldwide)

1. Sign up at **https://dash.cloudflare.com**.
2. Go to **Workers & Pages → Create → Pages → Upload assets**.
3. Name the project, drag in this folder, and click **Deploy**.
4. Your site is live at `https://PROJECT-NAME.pages.dev`.

You can also connect Cloudflare Pages to the GitHub repo from Option 2, so every edit on GitHub goes live automatically.

---

## Use your own domain (optional, about $10–15/year)

1. Buy a domain from a registrar such as Cloudflare Registrar, Namecheap or Porkbun (for example `chitech.events`).
2. In your host:
   - **Netlify:** Domain management → Add a domain, then follow the DNS steps it shows.
   - **GitHub Pages:** Settings → Pages → Custom domain, type the domain and click Save. Then at your registrar add the DNS records GitHub lists (four `A` records for the root domain, or a `CNAME` for `www`).
   - **Cloudflare Pages:** your project → Custom domains → Set up a domain.
3. HTTPS is set up automatically by all three hosts. DNS changes can take up to a few hours.

---

## Automatic daily updates

Every morning around 6am Chicago time, GitHub runs `scripts/update-events.mjs`. It:

1. Reads each calendar feed in `feeds.json` (28 Meetup groups plus the Chicago Tech Insider calendar).
2. Keeps events from today through the next 120 days, skips canceled ones, and converts times to Central.
3. Looks up map coordinates for new in-person addresses using OpenStreetMap (saved in `geocache.json`).
4. Saves everything to `auto-events.js` and commits the change. Cloudflare then republishes the site within about a minute.

On the page, hand-entered events in `data.js` always win. If an imported event matches one you entered (same date, matching title), the imported copy is hidden. Imported events carry a note telling visitors to confirm details on the event page.

If one feed fails on a given night, the script keeps that feed's events from the previous run, so nothing disappears because of a temporary outage.

### Turn it on (one time)

1. Upload **all** the files to your GitHub repository, including `feeds.json`, `auto-events.js`, the `scripts` folder and the `.github` folder.
   - On a Mac, the `.github` folder is hidden in Finder. Press **Cmd + Shift + .** (period) to show it, or create the file on GitHub instead: **Add file → Create new file**, type `.github/workflows/update-events.yml` as the name, and paste in the file's contents.
2. In your repository, open the **Actions** tab. If GitHub asks, click **I understand my workflows, go ahead and enable them**.
3. Click **Update events** in the left list, then **Run workflow → Run workflow** to do the first run now instead of waiting for tomorrow.
4. After a minute, click the run to see the log. Each feed shows `OK` with an event count, or `FAILED` with a reason.

**If the run fails at the "Save changes" step** with a permission error: go to **Settings → Actions → General → Workflow permissions**, choose **Read and write permissions**, click **Save**, and run it again.

### What it can and can't pick up

- **Picked up automatically:** any group in `feeds.json`, which covers most AI, developer, product, startup and BurbSec meetups, plus whatever is listed on the Chicago Tech Insider calendar.
- **Still entered by hand in `data.js`:** ISACA, ISSA, ISC2, IAPP, AITP, InfraGard, IEEE, mHUB, CAMP IT and the conferences. Their sites don't publish a calendar feed.
- The Chicago Tech Insider feed address is a best guess. If the log shows it failing, open https://calendars.illinois.edu/list/7948, find its iCal or "subscribe" link, and put that address in `feeds.json`.

### Add another feed

Add a line to `feeds.json`:

```json
{"id":"mygroup","url":"https://www.meetup.com/GROUP-URL-NAME/events/ical/","group":"mygroup","host":"My Group Name","topics":["ai"]},
```

- Any public `.ics` calendar link works, including Meetup, Luma ("Add iCal subscription" on a calendar page), Google Calendar public addresses and many university calendars.
- `group` should match a group id in `data.js` so the event links to the right card. Use `""` if there isn't one.

### Good to know

- GitHub runs this for free on public repositories.
- GitHub pauses scheduled workflows in repositories with no activity for 60 days. The daily commits count as activity, so this normally won't happen. If it does, click **Enable workflow** on the Actions tab.

---

## Adding events by hand

Open `data.js` in any text editor (Notepad, TextEdit, VS Code, or GitHub's editor).

**Add an event:** copy one line inside `CANOPY_EVENTS`, paste it below, and change the values:

```js
{date:"2026-12-03",start:"18:00",end:"20:00",title:"Holiday Meetup",host:"ISSA Chicago",orgs:["issa"],type:"Networking",venue:"Venue name, address",area:"The Loop",mode:"In person",topics:["sec"],price:"Free",desc:"One sentence about the event.",link:"https://official-event-page"},
```

- `date` is `YYYY-MM-DD`. Times are 24-hour Central time. Leave `start:""` if no time is posted.
- `orgs` uses the short ids from `CANOPY_GROUPS` (such as `isaca`, `issa`, `aitp`). Use `[]` if the host isn't in the directory.
- `topics` can be: `sec`, `grc`, `privacy`, `ai`, `data`, `dev`, `pm`, `startup`, `lead`, `career`.
- `mode` is `"In person"` or `"Virtual"`.
- Optional fields: `note` (for example `"Saturdays, Oct 10–31"`), `price`, `allDay:true`.
- Keep the comma at the end of each line.

**Put an event on the map:** the map matches the event's `venue` text against the names in `CANOPY_PLACES` at the bottom of `data.js`. To add a venue, add a line like `"Venue name or street address":[41.8789,-87.6359],`. To find the numbers, right-click the spot in Google Maps and click the coordinates to copy them. Add `,true` at the end when the point is only approximate; it then shows as a dashed pin. Events with only a suburb or neighborhood get an approximate pin from `CANOPY_AREAS`. Virtual events never appear on the map.

**Add a group:** copy a line inside `CANOPY_GROUPS`, give it a new short id, and set `cat` to one of: `Security & GRC`, `AI & Data`, `Developers`, `Product & Design`, `IT Leadership`, `Startups & Innovation`, `Conferences`. Add `status:"..."` when the group has nothing posted.

**Update the "last checked" date:** change `window.CANOPY_CHECKED` at the top of `data.js`.

Past events hide themselves automatically, so you don't need to delete them, though you can.

---

## Where to check for new events

These calendars cover most of what's on the site:

- Chicago Tech Insider (University of Illinois): https://calendars.illinois.edu/list/7948
- Illinois security conferences: https://infosec-conferences.com/us-state/illinois/
- ISACA Chicago: https://engage.isaca.org/chicagochapter/events/calendar
- ISSA Chicago: https://www.tickettailor.com/events/issachicago
- AITP Chicago (also lists many partner events): https://aitpchicago.com/Events
- InfraGard Chicago: https://chicagoinfragard.org/events/
- BurbSec: https://burbsec.com/
- mHUB: https://mhub.org/events
- Each group's "Official site" link in the Groups tab

---

## Event submissions

The Submit an Event form sends new entries to the shared `event_submissions` review queue in Cloudflare D1. It notifies the review team by email and does not publish unreviewed submissions. See [REVIEW-QUEUE.md](REVIEW-QUEUE.md) for the staff workflow.

## LinkedIn connections

My Connections supports optional personal LinkedIn profile links when logging a connection and adding, editing or removing links on existing records. Profiles and journal notes remain in the visitor's browser; there is no LinkedIn account integration or automatic connection request.

## Event collaboration

Submit an Event supports up to five co-hosts and partners, each with a role. Partner Requests lets organizations seek co-hosts, venues, speakers, sponsors and community partners. New requests require staff approval before becoming public. See REVIEW-QUEUE.md for moderation and notifications.
