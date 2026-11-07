import {mkdir,copyFile,readFile,writeFile} from 'node:fs/promises';
import vm from 'node:vm';import {createHash} from 'node:crypto';
const root=new URL('./',import.meta.url),ctx={window:{},URL};vm.createContext(ctx);
for(const f of ['data.js','auto-events.js'])vm.runInContext(await readFile(new URL(f,root),'utf8'),ctx);
const {CANOPY_GROUPS:groups,CANOPY_EVENTS:manual,CANOPY_AUTO:auto}=ctx.window;
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const records=manual.concat(auto.events.filter(a=>!manual.some(m=>m.date===a.date&&(norm(m.title).includes(norm(a.title))||norm(a.title).includes(norm(m.title))))));
let identities={};try{identities=JSON.parse(await readFile(new URL('event-identities.json',root),'utf8'))}catch{}
const urls=records.reduce((m,e)=>(m[e.link]=(m[e.link]||0)+1,m),{});
const events=records.map(e=>{
 const legacy=`${e.date}|${e.start}|${e.title}`;
 const key=e.link?(urls[e.link]===1?e.link:e.link+'|'+e.date+'|'+e.host):legacy;
 const id=identities[key]||("evt-"+createHash("sha256").update(key).digest("hex").slice(0,24));identities[key]=id;
 return {...e,id,slug:createHash('sha256').update(id).digest('hex').slice(0,16)};
});
await writeFile(new URL('event-identities.json',root),JSON.stringify(identities,null,2)+'\n');
let audit={};try{audit=JSON.parse(await readFile(new URL("group-link-audit.json",root),"utf8"))}catch{}
for(const [id,g] of Object.entries(groups))if(audit[id])g.linkAudit=audit[id];
const catalog={events,groups,updated:auto.updated,places:ctx.window.CANOPY_PLACES||{},areas:ctx.window.CANOPY_AREAS||{}};
await writeFile(new URL('catalog.mjs',root),'export default '+JSON.stringify(catalog)+';\n');
await mkdir(new URL('public/',root),{recursive:true});
await writeFile(new URL('public/catalog.js',root),'window.CANOPY_CATALOG='+JSON.stringify(catalog)+';');
for(const file of ['index.html','data.js','auto-events.js','community.js','community.css','collaboration.js','calendar.js','news.js','event-utils.js','evolution.js','evolution.css','event-page.js','chooser-core.js','chooser.js','chooser.css'])await copyFile(new URL(file,root),new URL('public/'+file,root));
console.log(`Prepared ${events.length} events and ${Object.keys(groups).length} groups.`);

const page=await readFile(new URL('index.html',root),'utf8'),start=page.indexOf('/* Layout:');
await writeFile(new URL('public/theme.css',root),page.slice(start,page.indexOf('</style>',start)));
