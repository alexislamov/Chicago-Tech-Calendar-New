// Canopy nightly updater.
// Reads the calendar feeds listed in feeds.json, keeps upcoming Chicago events,
// and writes them to auto-events.js. Runs in GitHub Actions (Node 20+, no packages needed).
// Run locally with:  node scripts/update-events.mjs
// Test with a saved file:  node scripts/update-events.mjs --file some.ics

import fs from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);
const OUT = new URL("auto-events.js", ROOT);
const GEOCACHE = new URL("geocache.json", ROOT);
const TZ = "America/Chicago";

/* ---------- time helpers ---------- */
function partsIn(tz, ms) {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const p = Object.fromEntries(f.formatToParts(new Date(ms)).map(x => [x.type, x.value]));
  return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute, s: +p.second };
}
function offsetMs(tz, ms) {
  const p = partsIn(tz, ms);
  return Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - ms;
}
function zonedToUtc(y, mo, d, h, mi, s, tz) {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  let utc = guess - offsetMs(tz, guess);
  utc = guess - offsetMs(tz, utc);
  return utc;
}
const pad = n => String(n).padStart(2, "0");
const ymd = p => `${p.y}-${pad(p.mo)}-${pad(p.d)}`;
const hm = p => `${pad(p.h)}:${pad(p.mi)}`;

// Returns {date:"YYYY-MM-DD", time:"HH:MM"|"" , allDay:boolean} in Chicago time
function parseIcsDate(value, params) {
  if (!value) return null;
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s, z] = m;
  if (h === undefined || params.VALUE === "DATE") return { date: `${y}-${mo}-${d}`, time: "", allDay: true };
  let utc;
  if (z) utc = Date.UTC(+y, +mo - 1, +d, +h, +mi, +(s || 0));
  else {
    const tz = (params.TZID || TZ).replace(/^"|"$/g, "");
    let zone = TZ;
    try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); zone = tz; } catch { /* unknown zone: assume Chicago */ }
    utc = zonedToUtc(+y, +mo, +d, +h, +mi, +(s || 0), zone);
  }
  const p = partsIn(TZ, utc);
  return { date: ymd(p), time: hm(p), allDay: false };
}

/* ---------- ICS parsing ---------- */
function unescapeText(s = "") {
  return s.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}
function parseICS(text) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");
  const events = [];
  let cur = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") { cur = {}; continue; }
    if (line === "END:VEVENT") { if (cur) events.push(cur); cur = null; continue; }
    if (!cur) continue;
    // split "NAME;P1=a;P2=\"b:c\":VALUE" at the first colon outside quotes
    let inQ = false, idx = -1;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') inQ = !inQ;
      else if (c === ":" && !inQ) { idx = i; break; }
    }
    if (idx < 0) continue;
    const [name, ...paramList] = line.slice(0, idx).split(";");
    const params = Object.fromEntries(paramList.map(p => { const [k, ...v] = p.split("="); return [k.toUpperCase(), v.join("=")]; }));
    const key = name.toUpperCase();
    if (!(key in cur)) cur[key] = { value: line.slice(idx + 1), params };
  }
  return events;
}

/* ---------- classification ---------- */
const TOPIC_RULES = [
  ["ai", /\b(ai|a\.i\.|llms?|genai|gen ai|machine learning|ml|agents?|agentic|gpt|neural|deep learning|computer vision|nlp|rag)\b/i],
  ["sec", /\b(security|cyber|infosec|hacking|hacker|appsec|threat|ciso|soc|pentest|zero[- ]trust|ransomware)\b/i],
  ["grc", /\b(audit|grc|governance|compliance|risk)\b/i],
  ["privacy", /\b(privacy|gdpr|data protection)\b/i],
  ["data", /\b(data|analytics|cloud|aws|azure|gcp|kubernetes|devops|database|postgres|snowflake|sql)\b/i],
  ["dev", /\b(developer|developers|coding|code|python|javascript|react|node|golang|ruby|rust|java|software|engineering|hack night|open source)\b/i],
  ["pm", /\b(product|ux|ui|design|figma|research)\b/i],
  ["startup", /\b(startup|start-up|founder|founders|pitch|venture|vc|investor|fundrais)\w*/i],
  ["lead", /\b(leadership|leaders|cio|cto|executive|management)\b/i],
  ["career", /\b(career|careers|job|hiring|certification|mentor|mentorship|women in)\b/i]
];
const TYPE_RULES = [
  ["Workshop", /\b(workshop|hands-on|lab|bootcamp|training|class)\b/i],
  ["Conference", /\b(conference|summit|symposium|con\b|world tour|expo)\b/i],
  ["Hackathon", /\bhackathon\b/i],
  ["Pitch", /\b(pitch|demo day|1 million cups)\b/i],
  ["Networking", /\b(networking|mixer|happy hour|social|meet and greet|open house)\b/i],
  ["Panel", /\bpanel\b/i],
  ["Talk", /\b(talk|webinar|fireside|lecture|info(rmation)? session)\b/i]
];
const AREAS = ["Rosemont","Schaumburg","Naperville","Evanston","Oak Brook","Wheeling","Hickory Hills","Crystal Lake","Skokie","Oak Park","Downers Grove","Lombard","Itasca","Deerfield","Northbrook","Lisle","Aurora","Elmhurst","Des Plaines","Arlington Heights","Chicago"];

function stripHtml(s) {
  return s.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
}
function shorten(s, n = 220) {
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  return cut.slice(0, cut.lastIndexOf(" ")) + "…";
}
const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, "");

function toEvent(v, feed, win) {
  if ((v.STATUS?.value || "").toUpperCase() === "CANCELLED") return null;
  const start = parseIcsDate(v.DTSTART?.value, v.DTSTART?.params || {});
  if (!start || start.date < win.from || start.date > win.to) return null;
  const endRaw = parseIcsDate(v.DTEND?.value, v.DTEND?.params || {});

  let title = unescapeText(v.SUMMARY?.value || "").trim();
  const free = /\[\s*free\s*\]|\bfree\b/i.test(title);
  title = title.replace(/\[\s*free\s*\]/ig, "").replace(/[☀-➿\u{1F300}-\u{1FAFF}️]/gu, "").replace(/\s+/g, " ").trim();
  if (!title) return null;

  const location = unescapeText(v.LOCATION?.value || "").replace(/\s+/g, " ").trim();
  const desc = shorten(stripHtml(unescapeText(v.DESCRIPTION?.value || "")));
  const hay = `${title} ${desc}`;
  const virtual = /\b(online|virtual|zoom|webinar|livestream|google meet|teams)\b/i.test(`${location} ${title}`) && !/\bhybrid\b/i.test(location);

  const topics = new Set(feed.topics || []);
  for (const [t, re] of TOPIC_RULES) if (re.test(hay)) topics.add(t);
  if (!topics.size) topics.add("dev");

  let type = feed.type || "";
  if (!type) for (const [t, re] of TYPE_RULES) if (re.test(title)) { type = t; break; }

  const area = virtual ? "Virtual" : (AREAS.find(a => new RegExp(`\\b${a}\\b`, "i").test(location)) || "");
  const organizer = (v.ORGANIZER?.params?.CN || "").replace(/^"|"$/g, "");

  let end = "", note = "";
  if (endRaw && !start.allDay) {
    if (endRaw.date === start.date) end = endRaw.time;
    else note = `Through ${new Date(endRaw.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  }

  const ev = {
    date: start.date, start: start.allDay ? "" : start.time, end,
    title, host: feed.host || organizer || "See event page",
    orgs: feed.group ? [feed.group] : [],
    type: type || "Meetup",
    venue: location || (virtual ? "Online" : "See event page"),
    area, mode: virtual ? "Virtual" : "In person",
    topics: [...topics].slice(0, 3),
    desc, link: (v.URL?.value || "").trim() || feed.site || "",
    feed: feed.id, auto: true
  };
  if (start.allDay) ev.allDay = true;
  if (free) ev.price = "Free";
  if (note) ev.note = note;
  return ev;
}


/* ---------- map coordinates ----------
   Looks up in-person venues with OpenStreetMap's Nominatim service (max 1 request/second,
   results cached in geocache.json so each address is only looked up once). */
const VIEWBOX = "-88.70,42.55,-87.25,41.35"; // Chicagoland
async function loadCache() { try { return JSON.parse(await fs.readFile(GEOCACHE, "utf8")); } catch { return {}; } }
function cleanAddress(v) {
  return v.replace(/\(.*?\)/g, " ").replace(/\b(room|suite|ste|floor|fl)\.?\s*[\w-]+/gi, " ").replace(/\s+/g, " ").replace(/\s+,/g, ",").trim();
}
async function geocodeAll(events, cache, limit = 25) {
  let looked = 0;
  for (const ev of events) {
    if (ev.mode !== "In person" || !ev.venue || /see event page|to be announced|tba|tbd/i.test(ev.venue)) continue;
    const q = cleanAddress(ev.venue) + (/chicago|, il\b|illinois/i.test(ev.venue) ? "" : ", Chicago, IL");
    if (!(q in cache)) {
      if (looked >= limit) continue;
      looked++;
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&bounded=1&viewbox=${VIEWBOX}&q=${encodeURIComponent(q)}`;
        const res = await fetch(url, { headers: { "User-Agent": `CanopyCalendar/1.0 (https://github.com/${process.env.GITHUB_REPOSITORY || "canopy-calendar"})` }, signal: AbortSignal.timeout(20000) });
        const hit = res.ok ? (await res.json())[0] : null;
        cache[q] = hit ? [Math.round(+hit.lat * 1e5) / 1e5, Math.round(+hit.lon * 1e5) / 1e5] : null;
      } catch { /* try again next run */ }
      await new Promise(r => setTimeout(r, 1100));
    }
    if (cache[q]) { ev.lat = cache[q][0]; ev.lng = cache[q][1]; }
  }
  return looked;
}

/* ---------- main ---------- */
async function readPrevious() {
  try {
    const txt = await fs.readFile(OUT, "utf8");
    const json = txt.slice(txt.indexOf("{"), txt.lastIndexOf("}") + 1);
    return JSON.parse(json).events || [];
  } catch { return []; }
}

async function main() {
  const cfg = JSON.parse(await fs.readFile(new URL("feeds.json", ROOT), "utf8"));
  const todayP = partsIn(TZ, Date.now());
  const toP = partsIn(TZ, Date.now() + (cfg.daysAhead || 120) * 864e5);
  const win = { from: ymd(todayP), to: ymd(toP) };

  const fileArg = process.argv.indexOf("--file");
  if (fileArg > -1) {
    const text = await fs.readFile(process.argv[fileArg + 1], "utf8");
    const evs = parseICS(text).map(v => toEvent(v, { id: "test", host: "Test feed", topics: [] }, { from: "0000-00-00", to: "9999-99-99" })).filter(Boolean);
    console.log(JSON.stringify(evs, null, 2));
    return;
  }

  const previous = await readPrevious();
  const all = [];
  const report = [];
  for (const feed of cfg.feeds) {
    try {
      const res = await fetch(feed.url, { headers: { "User-Agent": "CanopyCalendar/1.0 (community events calendar)", Accept: "text/calendar,*/*" }, signal: AbortSignal.timeout(25000), redirect: "follow" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (!text.includes("BEGIN:VCALENDAR")) throw new Error("response was not a calendar feed");
      const evs = parseICS(text).map(v => toEvent(v, feed, win)).filter(Boolean);
      all.push(...evs);
      report.push(`OK      ${feed.id.padEnd(14)} ${evs.length} upcoming`);
    } catch (e) {
      const kept = previous.filter(p => p.feed === feed.id && p.date >= win.from);
      all.push(...kept);
      report.push(`FAILED  ${feed.id.padEnd(14)} ${e.message} (kept ${kept.length} from last run)`);
    }
    await new Promise(r => setTimeout(r, 1200)); // be polite to the sources
  }

  // de-duplicate: same date + same/contained title -> merge groups
  const out = [];
  for (const ev of all.sort((a, b) => (a.date + (a.start || "99")).localeCompare(b.date + (b.start || "99")))) {
    const dup = out.find(o => o.date === ev.date && (norm(o.title).includes(norm(ev.title)) || norm(ev.title).includes(norm(o.title))));
    if (dup) { dup.orgs = [...new Set([...dup.orgs, ...ev.orgs])]; if (dup.host === "See event page") dup.host = ev.host; continue; }
    out.push(ev);
  }

  const cache = await loadCache();
  const looked = await geocodeAll(out, cache);
  await fs.writeFile(GEOCACHE, JSON.stringify(cache, null, 1) + "\n");
  report.push(`Map: looked up ${looked} new address(es); ${out.filter(e => e.lat).length} events have coordinates`);

  const payload = { updated: new Date().toISOString(), count: out.length, events: out };
  await fs.writeFile(OUT, `/* Generated by scripts/update-events.mjs. Do not edit by hand; edit data.js instead. */\nwindow.CANOPY_AUTO = ${JSON.stringify(payload, null, 1)};\n`);
  console.log(report.join("\n"));
  console.log(`\nWrote ${out.length} events to auto-events.js`);
  if (report.every(r => r.startsWith("FAILED"))) { console.error("Every feed failed."); process.exitCode = 1; }
}

main();
