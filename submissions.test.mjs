import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {submitEvent} from './worker.mjs';
const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('./submissions-schema.sql',import.meta.url),'utf8'));
const env={COMMUNITY:{prepare(sql){return {bind(...args){this.args=args;return this},async first(){return db.prepare(sql).get(...this.args)},async run(){return db.prepare(sql).run(...this.args)}}}}};
const event={title:'Test event',host:'Test organizer',date:'2026-12-01',start:'17:30',end:'19:30',type:'Meetup',mode:'In person',venue:'Test venue',topics:['ai'],orgs:[]};
async function send(body,method='POST',origin='https://chitech.events'){const response=await submitEvent({env,request:new Request('https://chitech.events/api/submissions',{method,headers:{Origin:origin,Authorization:'Bearer aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'},body:method==='POST'?JSON.stringify(body):undefined})});return {...await response.json(),httpStatus:response.status}}
const first=await send(event);assert.equal(first.httpStatus,201);assert.equal(first.httpStatus===201,true);
assert.equal(db.prepare('SELECT status FROM event_submissions').get().status,'pending');
assert.equal((await send(event)).id,first.id);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM event_submissions').get().n,1);
assert.equal((await send({...event,date:'2026-02-30'})).httpStatus,400);
assert.equal((await send({...event,link:'javascript:alert(1)'})).httpStatus,400);
assert.equal((await send(null,'GET')).httpStatus,405,'public callers cannot read the queue');
assert.equal((await send(event,'POST','https://attacker.example')).httpStatus,403);
for(let n=0;n<4;n++)assert.equal((await send({...event,title:'Other '+n})).httpStatus,201);
assert.equal((await send({...event,title:'Sixth event'})).httpStatus,429);
console.log('Submission checks passed: pending storage, duplicate prevention, invalid dates/URLs, queue privacy, origin checks and throttling.');
