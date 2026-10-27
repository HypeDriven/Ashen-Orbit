import assert from 'node:assert/strict';
import {createGame,update,checkpoint,fit,fitStatus,expandHull,hullStatus,HULLS,WEAPONS,COMPONENTS,stats,makeShip,selectTarget,selectedTarget,campaignStatus,routes,jump,loadSector} from '../game/src/sim.js';
function arena(){const s=createGame();s.player.x=0;s.player.y=0;s.player.a=0;s.player.hp=s.player.max=10000;s.rocks=[];s.nests=[];s.objectives=[];s.ships=[s.player];s.scrap=100000;s.tech=100;s.cleared=[0,1,2,3,4,5,7,8,9,10];return s;}
function frames(s,n,input={}){for(let i=0;i<n;i++)update(s,1/60,{steering:true,...input});}
assert.equal(WEAPONS.length,17);assert.equal(new Set(WEAPONS.map(w=>w.id)).size,17);
for(const w of WEAPONS){const s=arena();assert.ok(fit(s,0,w.id));const e=makeShip(w.mine?30:130,0,1,1);e.hp=e.max=5000;e.cd=100;e.shield=0;s.ships.push(e);selectTarget(s);const start=e.hp;frames(s,1,{fire:true});assert.ok(s.energy<100,w.id+' must cost capacitor');assert.ok(s.heat>0,w.id+' must create heat');frames(s,w.mine?109:59,{fire:true});assert.ok(e.hp<start,w.id+' must deal real damage');}
// Power / type restrictions, one-time licenses and hull expansion preserve compatible components.
let s=arena();assert.equal(fit(s,2,'laser'),false);assert.equal(fit(s,0,'fortress'),false);let money=s.scrap;assert.ok(fit(s,0,'laser'));assert.equal(s.scrap,money-150);money=s.scrap;assert.ok(fit(s,0,'cannon'));assert.ok(fit(s,0,'laser'));assert.equal(s.scrap,money);assert.ok(expandHull(s));assert.equal(s.hull,1);assert.equal(s.loadout[0],'laser');assert.ok(s.loadout.includes('drive'));assert.ok(s.loadout.includes('reactor'));
while(s.hull<4)assert.ok(expandHull(s));assert.equal(hullStatus(s).ok,false);assert.equal(s.loadout.length,HULLS[4].mounts.length);assert.ok(stats(s).hp>1000);
s.loadout=HULLS[4].mounts.map(m=>m.type==='fixed'||m.type==='turret'?'siege':m.type==='shield'?'fortress':m.type==='engine'?'agile':m.type==='utility'?'magnet':null);assert.equal(fitStatus(s,0,'siege').reason,'POWER BUDGET EXCEEDED');
// Turrets track selected targets without rotating the hull or instantly snapping.
s=arena();expandHull(s);fit(s,0,null);fit(s,1,'laser');const enemy=makeShip(0,220,1,1);enemy.hp=1000;enemy.cd=100;s.ships.push(enemy);selectTarget(s);frames(s,1,{fire:true});assert.equal(enemy.hp,1000);assert.ok(s.mountState[1].a>0&&s.mountState[1].a<.1);frames(s,90,{fire:true});assert.ok(enemy.hp<1000);assert.equal(s.player.a,0);assert.equal(selectedTarget(s),enemy);
// Forward thrust is relative to heading; brake opposes velocity rather than reversing it.
s=arena();frames(s,30,{turn:1});assert.ok(s.player.a>1);let x=s.player.x,y=s.player.y;frames(s,30,{thrust:1});assert.ok(s.player.y>y+20);const v=Math.hypot(s.player.vx,s.player.vy);frames(s,10,{brake:true});assert.ok(Math.hypot(s.player.vx,s.player.vy)<v*.3);
// Continuous fire overheats; radiator changes cooling; saved thermal state cannot be reset by reload.
s=arena();fit(s,0,'gatling');frames(s,600,{fire:true});assert.ok(s.overheated||s.heat>30);s.heat=110;s.overheated=true;let resumed=createGame(JSON.parse(JSON.stringify(checkpoint(s))));assert.equal(resumed.heat,110);assert.equal(resumed.overheated,true);frames(s,300);assert.equal(s.overheated,false);let cooling=stats(s).cooling;fit(s,1,'radiator');assert.ok(stats(s).cooling>cooling);
// Disruptor, ion, homing, blast collateral, particle sweep, and beam healing are functional mechanics.
s=arena();fit(s,0,'disruptor');let e=makeShip(130,0,1,0);e.hp=1000;e.shield=100;e.cd=100;s.ships.push(e);frames(s,15,{fire:true});assert.ok(e.shield<60);assert.equal(e.hp,1000);
s=arena();fit(s,0,'ion');e=makeShip(130,0,1,0);e.cd=100;s.ships.push(e);frames(s,15,{fire:true});assert.ok(e.jam>1);
s=arena();fit(s,0,'homing');e=makeShip(400,150,1,0);s.ships.push(e);selectTarget(s);frames(s,1,{fire:true});const vy=s.bullets[0].vy;frames(s,8);assert.ok(s.bullets[0].vy>vy);
s=arena();fit(s,0,'rocket');e=makeShip(45,0,1,0);s.ships.push(e);const hp=s.player.hp;frames(s,5,{fire:true});assert.ok(s.player.hp<hp);
s=arena();fit(s,0,'particle');for(let i=0;i<3;i++){e=makeShip(90+i*100,0,1,0);e.hp=1000;e.cd=100;s.ships.push(e);}frames(s,15,{fire:true});assert.ok(s.ships.slice(1).every(e=>e.hp<1000));
s=arena();fit(s,0,'siphon');s.player.hp=100;e=makeShip(130,0,1,0);e.cd=100;s.ships.push(e);frames(s,1,{fire:true});assert.ok(s.player.hp>100);
// Every final gate is necessary. Revisit remains possible to recover missed ciphers/contracts.
s=arena();s.hull=3;s.ciphers=[2,5,8];s.contractLog=Array.from({length:12},(_,i)=>'x'+i);assert.ok(campaignStatus(s).ready);assert.ok(routes(s).some(r=>r.id===6));for(const key of ['hull','cleared','ciphers','contractLog']){let keep=s[key];s[key]=key==='hull'?2:[];assert.equal(campaignStatus(s).ready,false,key);assert.ok(!routes(s).some(r=>r.id===6));s[key]=keep;}assert.ok(routes(s).some(r=>r.id===2));
s.hull=3;s.loadout=HULLS[3].mounts.map(()=>null);assert.ok(jump(s,6));let boss=s.ships.find(e=>e.kind===2&&e.team);assert.equal(boss.hp,9500);assert.equal(s.ships.filter(e=>e.bossGuard).length,3);boss.hp=5000;frames(s,1);assert.equal(boss.phase,1);boss.hp=2500;frames(s,1);assert.equal(boss.phase,2);
s=arena();s.sector=2;s.contractLog=['2:relay'];s.ciphers=[2];loadSector(s);assert.ok(s.objectives.find(o=>o.id==='relay').done);const scrap=s.scrap;frames(s,1);assert.equal(s.scrap,scrap);assert.ok(s.sectorDone);
for(const c of COMPONENTS)assert.ok(c.desc&&Number.isFinite(c.power));
console.log('PASS: 17 damaging weapons; fitting, licensing and power; 5 hulls; independent turret tracking; thrust/turn/brake; heat/save migration; shield/jam/homing/blast/piercing/healing mechanics; campaign gates, revisits and 3 boss phases.');
