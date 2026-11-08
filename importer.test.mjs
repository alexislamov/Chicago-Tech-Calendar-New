import assert from 'node:assert/strict';
import {parseICS,toEvent} from './scripts/update-events.mjs';
const parse=(dates)=>toEvent(parseICS(`BEGIN:VCALENDAR\nBEGIN:VEVENT\nSUMMARY:Chicago conference\n${dates}\nDESCRIPTION:${'Long event details. '.repeat(70)}\nURL:https://example.com/event\nEND:VEVENT\nEND:VCALENDAR`)[0],{id:'fixture',host:'Organizer',topics:['ai']},{from:'2026-01-01',to:'2027-01-01'});
let e=parse('DTSTART;VALUE=DATE:20261109\nDTEND;VALUE=DATE:20261112');assert.equal(e.date,'2026-11-09');assert.equal(e.endDate,'2026-11-11');assert.ok(e.desc.length>1000);
e=parse('DTSTART;TZID=America/Chicago:20261109T180000\nDTEND;TZID=America/Chicago:20261111T200000');assert.equal(e.endDate,'2026-11-11');assert.equal(e.end,'20:00');
console.log('Passed: retained full feed descriptions and inclusive multi-day end dates.');
