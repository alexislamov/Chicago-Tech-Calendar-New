import {mkdir,copyFile} from 'node:fs/promises';
const root=new URL('./',import.meta.url);
await mkdir(new URL('public/',root),{recursive:true});
for(const file of ['index.html','data.js','auto-events.js','community.js','community.css']) {
  await copyFile(new URL(file,root),new URL('public/'+file,root));
}
console.log('Prepared calendar assets.');
