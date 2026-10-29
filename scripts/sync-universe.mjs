import {readFile,writeFile} from 'node:fs/promises';
const path=new URL('../server.js',import.meta.url);
const server=await readFile(path,'utf8');
const shared=[];
for(const name of ['factions','arsenal','sectors','shipyard','universe-rules','flight-authority'])shared.push((await readFile(new URL('../src/'+name+'.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'').replace(/^export \{.*\}.*;\n/gm,'').replaceAll('export ',''));
const rules=shared.join('\n');
const universe=(await readFile(new URL('../src/universe-combat.js',import.meta.url),'utf8'))+'\n'+(await readFile(new URL('../src/universe-server.js',import.meta.url),'utf8'));
const generated=`// BEGIN GENERATED UNIVERSE\n${rules}\n${universe}// END GENERATED UNIVERSE`;
const result=server.replace(/\/\/ BEGIN GENERATED UNIVERSE[\s\S]*?\/\/ END GENERATED UNIVERSE/,generated);
if(process.argv.includes('--check')){
 if(result!==server)throw Error('Run node scripts/sync-universe.mjs before packaging.');
}else await writeFile(path,result);
