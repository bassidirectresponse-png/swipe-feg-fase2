import {readFile,writeFile} from 'node:fs/promises';
const catalog=JSON.parse(await readFile(new URL('../lib/niche-catalog.json',import.meta.url),'utf8'));
const output='// Generated from niche-catalog.json. Do not edit.\nglobalThis.SwipeNicheCatalog = '+JSON.stringify(catalog)+';\n';
const path=new URL('../lib/niche-catalog.generated.js',import.meta.url);
if(process.argv.includes('--check')){if(await readFile(path,'utf8').catch(()=>'')!==output)throw Error('Run npm run taxonomy:sync');}
else await writeFile(path,output);
