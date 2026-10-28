import fs from 'node:fs';
const root=new URL('../game/',import.meta.url),file=new URL('server.js',root),begin='// BEGIN GENERATED UNIVERSE',end='// END GENERATED UNIVERSE';
let source=fs.readFileSync(file,'utf8'),rules=fs.readFileSync(new URL('src/universe-rules.js',root),'utf8').replace(/^export /gm,'');
const logic=fs.readFileSync(new URL('../scripts/universe-server.js',root),'utf8');
const block=begin+'\n'+rules+'\n'+logic+'\n'+end;
const next=source.includes(begin)?source.slice(0,source.indexOf(begin))+block+source.slice(source.indexOf(end)+end.length):source+'\n'+block+'\n';
if(process.argv.includes('--check')){if(next!==source)throw Error('Stale universe server: node scripts/sync-universe.mjs');}else if(next!==source)fs.writeFileSync(file,next);
