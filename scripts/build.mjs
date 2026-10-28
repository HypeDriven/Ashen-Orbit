import {spawnSync} from 'node:child_process';import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
await import('./sync-defenses.mjs');await import('./sync-universe.mjs');
const engine=process.env.STARHERMIT_RUNTIME||'starhermit';
for(const args of [['check','game'],['package','--web','game','--out','dist']]){const r=spawnSync(engine,args,{stdio:'inherit'});if(r.error)throw r.error;if(r.status!==0)process.exit(r.status||1);}
const root=path.resolve('dist'),index=JSON.parse(fs.readFileSync(path.join(root,'starhermit-files.json'),'utf8'));
for(const [name,meta] of Object.entries(index.files)){const b=fs.readFileSync(path.join(root,name));if(b.length!==meta.size||crypto.createHash('sha256').update(b).digest('hex')!==meta.sha256)throw new Error('Integrity mismatch: '+name);}
const manifest=fs.readFileSync(path.join(root,'starhermit.txt'),'utf8');
for(const key of ['cover','banner','server']){const value=manifest.split('\n').find(l=>l.startsWith(key+'='))?.slice(key.length+1);if(!value||!fs.existsSync(path.join(root,value)))throw new Error('Missing manifest asset: '+key);}
console.log('PASS: complete build, engine integrity index, server script, cover and banner.');
