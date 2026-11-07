import vm from 'node:vm';import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url),ctx={window:{},URL};vm.createContext(ctx);vm.runInContext(await readFile(new URL('data.js',root),'utf8'),ctx);
const checked=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format();
const queue=Object.entries(ctx.window.CANOPY_GROUPS),results={};
async function run(){while(queue.length){const [id,g]=queue.shift();try{const response=await fetch(g.url,{redirect:'follow',signal:AbortSignal.timeout(8000),headers:{'User-Agent':'Canopy-Link-Check/1.0'}});results[id]={url:g.url,status:response.status,checked,result:response.ok?'reachable':[401,403,429].includes(response.status)?'restricted':'review'};await response.body?.cancel()}catch{results[id]={url:g.url,checked,result:'unavailable'}}}}
await Promise.all(Array.from({length:8},run));await writeFile(new URL('group-link-audit.json',root),JSON.stringify(results,null,2)+'\n');console.log(Object.values(results).reduce((o,x)=>(o[x.result]=(o[x.result]||0)+1,o),{}));
