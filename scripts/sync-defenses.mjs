import fs from 'node:fs';
const module=fs.readFileSync(new URL('../game/src/defenses.js',import.meta.url),'utf8').replace(/^export /gm,'');
const file=new URL('../game/server.js',import.meta.url),source=fs.readFileSync(file,'utf8');
const begin='// BEGIN GENERATED BASE DEFENSES',end='// END GENERATED BASE DEFENSES';
const block=begin+'\n'+module+end;
const next=source.includes(begin)?source.slice(0,source.indexOf(begin))+block+source.slice(source.indexOf(end)+end.length):source.replace("'use strict';","'use strict';\n"+block);
if(process.argv.includes('--check')){if(next!==source)throw Error('Server defenses are stale: run node scripts/sync-defenses.mjs');}else if(next!==source)fs.writeFileSync(file,next);
