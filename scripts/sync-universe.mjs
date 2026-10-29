import {readFile,writeFile} from 'node:fs/promises';
const path=new URL('../server.js',import.meta.url);
const server=await readFile(path,'utf8');
const rules=(await readFile(new URL('../src/universe-rules.js',import.meta.url),'utf8')).replaceAll('export ','');
const universe=await readFile(new URL('../src/universe-server.js',import.meta.url),'utf8');
const generated=`// BEGIN GENERATED UNIVERSE\n${rules}\n${universe}// END GENERATED UNIVERSE`;
const result=server.replace(/\/\/ BEGIN GENERATED UNIVERSE[\s\S]*?\/\/ END GENERATED UNIVERSE/,generated);
if(process.argv.includes('--check')){
 if(result!==server)throw Error('Run node scripts/sync-universe.mjs before packaging.');
}else await writeFile(path,result);
