import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {webcrypto} from 'node:crypto';globalThis.crypto??=webcrypto;import './calendar.js';import './event-utils.js';import './chooser-core.js';import {chooserRoute,allowance} from './chooser-service.mjs';
const now=Date.parse('2026-11-07T15:00:00Z'),core=CanopyChooserCore;
const base={id:'a',date:'2026-11-10',start:'18:00',end:'20:00',topics:['ai'],mode:'In person',area:'The Loop',venue:'Test venue',type:'Workshop',title:'Intro to AI',desc:'An introductory hands-on workshop',host:'Test',price:'Free',slug:'test-a'};
const events=[base,{...base,id:'b',price:'Price not confirmed'},{...base,id:'c',price:'$75',area:'Rosemont'},{...base,id:'d',mode:'Virtual',venue:'Online'},{...base,id:'past',date:'2020-01-01'},{...base,id:'deadline',type:'Opportunity',note:'Application deadline · not a meetup'}];
const p=core.infer('Free AI events downtown after work',{});assert.deepEqual(core.rank(events,p,{},now).map(x=>x.event.id),['a']);
assert.equal(core.rank(events,core.normalize({topics:['quantum']}),{},now).length,0);
assert.ok(core.rank(events,core.infer('under $25',{}),{},now).every(x=>core.cost(x.event)!==null&&core.cost(x.event)<=25));
assert.equal(core.rank(events,core.normalize({budget:'50'}),{},now).some(x=>x.event.id==='b'),false);
assert.equal(core.rank(events,core.normalize({where:'downtown'}),{},now).some(x=>x.event.mode==='Virtual'),false);
assert.equal(core.rank(events,core.normalize(),{dismissed:['a']},now).some(x=>x.event.id==='a'),false);
assert.equal(core.rank(events,core.normalize({level:'beginner'}),{},now)[0].event.id,'a');
const identity='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',req=(b={},origin='https://chitech.events')=>new Request('https://chitech.events/api/choose',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Authorization:'Bearer '+identity},body:JSON.stringify({request:'',...b})});
const db=new DatabaseSync(':memory:'),env={COMMUNITY:{prepare(sql){return{bind(...args){this.args=args;return this},async first(){return db.prepare(sql).get(...(this.args||[]))},async run(){return db.prepare(sql).run(...(this.args||[]))}}}}};
let r=await chooserRoute(req({preferences:{budget:'free',where:'downtown'},useClaude:true}),env,{events,now});assert.equal(r.status,200);let d=await r.json();assert.equal(d.engine,'catalog');assert.deepEqual(d.recommendations.map(x=>x.eventId),['a']);
assert.equal((await chooserRoute(req({},'https://other.example'),env,{events,now})).status,403);
assert.equal((await chooserRoute(req({request:'x'.repeat(1001)}),env,{events,now})).status,400);
let captured,calls=0;const fetcher=async(url,options)=>{calls++;captured=JSON.parse(options.body);assert.equal(url,'https://api.anthropic.com/v1/messages');assert.ok(options.headers['x-api-key']);return new Response(JSON.stringify({content:[{type:'tool_use',name:'choose_events',input:{recommendations:[{eventId:'invented',reason:'fake'},{eventId:'a',reason:'Introductory AI workshop.'},{eventId:'a',reason:'duplicate'}]}}]}))};
env.ANTHROPIC_API_KEY='test-key';r=await chooserRoute(req({request:'Free AI events downtown',useClaude:true,notes:'NEVER SHARE PRIVATE NOTES',preferences:{budget:'free',where:'downtown'}}),env,{events,now,fetcher});d=await r.json();assert.equal(d.engine,'claude');assert.equal(d.recommendations.length,1);assert.equal(d.recommendations[0].eventId,'a');assert.ok(!JSON.stringify(captured).includes('NEVER SHARE'));assert.ok(!JSON.stringify(d).includes('test-key'));
const before=calls;await chooserRoute(req({useClaude:false}),env,{events,now,fetcher});assert.equal(calls,before,'Claude opt out avoids provider');
r=await chooserRoute(req({useClaude:true}),env,{events,now,fetcher:async()=>{throw Error('provider credentials detail')}});d=await r.json();assert.equal(d.engine,'catalog');assert.ok(!JSON.stringify(d).includes('credentials'));
r=await chooserRoute(req({useClaude:true}),env,{events,now,fetcher:async()=>new Response(JSON.stringify({content:[{type:'tool_use',name:'choose_events',input:{recommendations:[{eventId:'past',reason:'past event'}]}}]}))});assert.equal((await r.json()).engine,'catalog');
for(let i=0;i<10;i++)assert.equal(await allowance(env.COMMUNITY,'limit-test','ip-test',now),true);assert.equal(await allowance(env.COMMUNITY,'limit-test','ip-test',now),false);
assert.ok(!db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().some(x=>/preferences|prompt/.test(x.name)));
console.log('Passed: hard constraints, ended/deadline exclusion, budget honesty, feedback, Claude opt-in, verified IDs, duplicates, private-note exclusion, secret safety, provider fallback and rate limits.');

for(const [status,message,issue] of [[400,'Your credit balance is too low','provider_billing'],[401,'invalid x-api-key','provider_authentication'],[404,'model unavailable','provider_model'],[400,'unsupported anthropic-version','provider_api_version']]){const result=await chooserRoute(req({useClaude:true}),env,{events,now,fetcher:async()=>new Response(JSON.stringify({error:{message}}),{status})});const body=await result.json();assert.equal(body.issue,issue);assert.ok(!JSON.stringify(body).includes(message));}
// Prompt search sees every upcoming event, including dates beyond 30 days and old shortlist limits.
const many=Array.from({length:55},(_,i)=>({...base,id:'prompt-'+i,date:i===54?'2026-12-20':'2026-11-10',topics:i===54?['quantum']:['ai']}));
let promptPayload;
const promptRequest=req({mode:'prompt',request:'Quantum events in December, not AI.',preferences:{topics:['ai'],when:'7'},useClaude:true});promptRequest.headers.set('Authorization','Bearer '+crypto.randomUUID());
const promptResponse=await chooserRoute(promptRequest,env,{events:many,now,fetcher:async(url,options)=>{promptPayload=JSON.parse(JSON.parse(options.body).messages[0].content);return new Response(JSON.stringify({content:[{type:'tool_use',name:'choose_events',input:{recommendations:[{eventId:'prompt-54',reason:'Quantum event in December.'}]}}]}))}});
const promptData=await promptResponse.json();assert.equal(promptData.engine,'claude');assert.equal(promptPayload.candidates.length,55);assert.equal(promptData.recommendations[0].eventId,'prompt-54');assert.equal(promptPayload.preferences.when,'all');assert.deepEqual(promptPayload.preferences.topics,[]);
