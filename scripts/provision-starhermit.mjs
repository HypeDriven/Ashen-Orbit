// Owner-only setup. Credentials stay in environment variables and are never written.
import fs from 'node:fs';
const api='https://api.starhermit.com/api/v1';
const token=process.env.STARHERMIT_ACCESS_TOKEN;
if(!token){console.error('Set STARHERMIT_ACCESS_TOKEN to the game owner access token. Do not use a launch token.');process.exit(1);}
async function request(path,method='GET',body){const r=await fetch(api+path,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});if(!r.ok)throw new Error(`StarHermit ${method} ${path}: HTTP ${r.status}. Verify game ownership, server deployment and token permissions.`);return r.status===204?null:r.json();}
const all=await request('/me/github-games');const list=Array.isArray(all)?all:all.items||[];
const owned=list.filter(g=>String(g.repoUrl||g.repositoryUrl||'').replace(/\.git$/,'').replace(/\/$/,'').toLowerCase()==='https://github.com/hypedriven/ashen-orbit');
let game=owned.find(g=>g.id===process.env.STARHERMIT_GAME_ID)||(!process.env.STARHERMIT_GAME_ID&&owned.length===1?owned[0]:null);
if(!game)throw new Error('Register/claim HypeDriven/Ashen-Orbit on StarHermit and deploy main first. If multiple listings exist, set STARHERMIT_GAME_ID.');
const base=`/me/github-games/${game.id}/leaderboards`;const raw=await request(base);const boards=Array.isArray(raw)?raw:raw.items||[];const definition=JSON.parse(fs.readFileSync(new URL('../config/daily-scrap.json',import.meta.url),'utf8'));let board=boards.find(b=>b.key===definition.key);
if(board){if(board.scoreType!=='integer'||!['desc','descending'].includes(board.sortDirection))throw new Error('Existing daily-scrap board has incompatible immutable score type or sort order.');board=await request(base+'/'+board.id,'PUT',{name:definition.name,resetSchedule:'daily',minScore:0,maxScore:1000000,isActive:true});}else board=await request(base,'POST',definition);
console.log('Daily Scrap Collected configured. UTC daily reset; scores are written only by server.js.');
