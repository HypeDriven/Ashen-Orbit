import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {HULL_OUTLINES,shipGeometry,hullFragments,shipBreakup,recordShipImpact,MAX_IMPACT_DRIFT,DEBRIS_LIFE} from '../src/ship-debris.js';
import {createEffectPainter,renderVisual,stepVisuals,emitVisual,MAX_EFFECTS} from '../src/effects.js';
import {createGame,makeShip,update,ENEMIES} from '../src/sim.js';
import {createBaseDefense,interceptBaseShot,updateBaseDefense} from '../src/defenses.js';
const input={steering:true,thrust:0,strafe:0,turn:0,aim:null,fire:false,boost:false,tractor:false};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const area=points=>Math.abs(points.reduce((sum,a,i)=>{const b=points[(i+1)%points.length];return sum+a[0]*b[1]-a[1]*b[0];},0)/2);

test('fragments exactly cover every rendered hull outline with at most sixteen real geometry pieces',()=>{
 for(let shape=0;shape<HULL_OUTLINES.length;shape++)for(const size of [7,24,40,66]){const f={shape,size,a:.73,vx:190,vy:-80,av:0,seed:41},parts=hullFragments(f);assert.ok(parts.length>=3&&parts.length<=16);close(parts.reduce((sum,p)=>sum+p.mass,0),area(HULL_OUTLINES[shape])*size*size);for(const p of parts){assert.ok(p.points.length===3&&p.mass>0);close(area(p.points),p.mass);assert.ok([p.vx,p.vy,p.spin,p.x,p.y].every(Number.isFinite));}}
 for(let kind=0;kind<ENEMIES.length;kind++)assert.equal(shipGeometry({kind,team:1}).size,ENEMIES[kind].radius);
});
test('all hull pieces inherit full flight velocity and angular momentum without a net explosion push',()=>{
 const base={shape:0,size:24,a:.5,seed:3,av:0,vx:0,vy:0},rest=hullFragments(base),flight=hullFragments({...base,vx:420,vy:-125}),spin=hullFragments({...base,av:2});let mass=0,mx=0,my=0;
 for(let i=0;i<rest.length;i++){close(flight[i].vx-rest[i].vx,420);close(flight[i].vy-rest[i].vy,-125);close(spin[i].vx-rest[i].vx,-2*rest[i].y);close(spin[i].vy-rest[i].vy,2*rest[i].x);close(spin[i].spin-rest[i].spin,2);mass+=flight[i].mass;mx+=flight[i].vx*flight[i].mass;my+=flight[i].vy*flight[i].mass;}close(mx/mass,420);close(my/mass,-125);
});
test('recent incoming hits bias debris in the fire direction, decay, and remain a small visual-only impulse',()=>{
 const p={x:0,y:0,a:0,vx:300,vy:-20,hp:100,hull:0,pilot:true};for(let i=0;i<100;i++)recordShipImpact(p,1000,{x:1000,y:0},0);close(p.impactX,MAX_IMPACT_DRIFT);assert.equal(p.vx,300);assert.equal(p.hp,100);
 recordShipImpact(p,30,{x:0,y:700},1);assert.ok(p.impactX>0&&p.impactX<13);assert.ok(p.impactY>0);const wreck=shipBreakup(p,1);close(wreck.vx,300+p.impactX);close(wreck.vy,-20+p.impactY);assert.ok(Math.hypot(wreck.vx-300,wreck.vy+20)<=MAX_IMPACT_DRIFT);const stale=shipBreakup(p,20);close(stale.vx,300);close(stale.vy,-20);
 const q={};recordShipImpact(q,24,{x:1,y:0},0);recordShipImpact(q,24,{x:-1,y:0},0);close(q.impactX,0);recordShipImpact(q,100,{x:NaN,y:0},1);assert.ok(Number.isFinite(q.impactX));
});
test('debris trajectories are independent of frame rate and expire instead of leaving live colliders',()=>{
 const f={...shipBreakup({x:10,y:20,a:.3,vx:230,vy:40,av:1,hull:2,pilot:true},0),seed:9};let a=[{...f}],b=[{...f}];a=stepVisuals(a,1.2);for(let i=0;i<72;i++)b=stepVisuals(b,1/60);close(a[0].x,b[0].x);close(a[0].y,b[0].y);close(a[0].t,b[0].t);close(a[0].x,10+230*1.2);assert.equal(stepVisuals(a,DEBRIS_LIFE).length,0);assert.equal(f.hp,undefined);
});
test('breakups survive ordinary effect pressure and obey the existing rendering command budget',()=>{
 const list=[];emitVisual(list,'ship-breakup',0,0,{...shipBreakup({x:0,y:0,a:0,vx:200,vy:30,pilot:true,hull:4},0),seed:7});const wreck=list[0];for(let i=0;i<MAX_EFFECTS*3;i++)emitVisual(list,'impact',0,0);assert.equal(list.length,MAX_EFFECTS);assert.ok(list.includes(wreck));let commands=0;
 const sink={line(...args){assert.ok(args.slice(0,4).every(Number.isFinite));commands++;},polygon(points){assert.ok(points.flat().every(Number.isFinite));commands++;},disc(){commands++;},arc(){commands++;}},p=createEffectPainter(sink,{zoom:1.2,width:1000,height:700,cx:0,cy:0},1800);
 for(let i=0;i<50;i++)renderVisual(p,{...wreck,t:2,fragments:undefined},1);assert.ok(commands>100&&commands<=1800);
});
test('solo ships fracture once on a real projectile hit and retain the victim velocity and incoming direction',()=>{
 const s=createGame(),e=makeShip(700,500,1,0);s.player.x=s.player.y=-900;s.ships=[s.player,e];s.rocks=[];s.nests=[];s.objectives=[];s.sectorDone=true;e.hp=1;e.vx=140;e.vy=25;e.cd=100;s.bullets=[{x:700,y:490,vx:0,vy:1000,t:1,team:0,dmg:1000,pierce:0,hits:[],weapon:'cannon'}];update(s,.01,input);const wreck=s.fx.find(f=>f.effect==='ship-breakup');assert.ok(wreck);assert.equal(wreck.shape,6);assert.equal(wreck.size,17);close(wreck.vx,e.vx);assert.ok(wreck.vy>e.vy);assert.ok(!s.ships.includes(e));update(s,.01,input);assert.equal(s.fx.filter(f=>f.effect==='ship-breakup').length,1);
});
test('solo player wreckage keeps drifting while the campaign is stopped at the death screen',()=>{
 const s=createGame(),p=s.player;p.x=p.y=700;p.vx=200;p.vy=-40;p.a=0;s.ships=[p];s.rocks=[];s.nests=[];s.objectives=[];s.sectorDone=true;s.bullets=[{x:690,y:700,vx:1000,vy:0,t:1,team:1,dmg:10000,pierce:0,hits:[]}];update(s,.01,input);assert.equal(s.dead,true);const f=s.fx.find(f=>f.effect==='ship-breakup');assert.ok(f);const x=f.x,y=f.y,t=f.t,clock=s.time;update(s,.2,input);close(f.x-x,f.vx*.2);close(f.y-y,f.vy*.2);close(t-f.t,.2);assert.equal(s.time,clock);
});
test('station fighters break into their own geometry and inherit fighter movement before respawning',()=>{
 const d=createBaseDefense(),f=d.fighters[0];d.shields=[];f.hp=1;f.vx=150;f.vy=-20;f.av=1;const b={team:1,t:1,dmg:100,vx:1000,vy:0};assert.equal(interceptBaseShot(d,b,f.x-15,f.y,f.x+1,f.y),true);const wreck=d.fx.find(f=>f.effect==='ship-breakup');assert.ok(wreck);assert.equal(wreck.shape,12);assert.equal(wreck.size,7);assert.ok(wreck.vx>150);assert.equal(wreck.vy,-20);assert.equal(f.hp,0);updateBaseDefense(d,46,46,[],[],()=>{});assert.equal(f.hp,f.max);assert.equal(f.destroyed,false);
});
test('co-op destruction uses the same breakup event for pilots and moving NPC ships',()=>{
 const sandbox=vm.createContext({});vm.runInContext(readFileSync(new URL('../server.js',import.meta.url),'utf8'),sandbox);const ctx={now:100000,players:[{id:'a',name:'A'},{id:'b',name:'B'}],room:{metadata:{mission:'relay'}}},game=sandbox.game;const created=game.createSession(ctx);assert.equal(created.ok,true);const s=created.sessionState,p=s.pilots[0];p.vx=200;p.vy=30;s.spawn=1e9;s.baseDefense=null;s.bullets=[{x:p.x-40,y:p.y,vx:1000,vy:0,t:1,team:1,dmg:10000}];const out=game.onTick({...ctx,now:100050,sessionState:s,inputs:[{from:'a',data:{seq:1,x:.5,y:.25,steering:false}}]});assert.equal(out.ok,true);const f=s.fx.find(f=>f.effect==='ship-breakup');assert.ok(f);assert.equal(f.shape,0);assert.equal(f.size,24);assert.equal(f.faction,0);assert.ok(f.vx>p.vx);assert.ok(f.vy>0);
});

test('a crowded co-op battle batches simultaneous breakups and a full salvage field into bounded packets',()=>{
 const sandbox=vm.createContext({});vm.runInContext(readFileSync(new URL('../server.js',import.meta.url),'utf8'),sandbox);const ctx={now:100000,players:[{id:'a',name:'A'},{id:'b',name:'B'}],room:{metadata:{mission:'relay'}}},game=sandbox.game,s=game.createSession(ctx).sessionState;s.spawn=1e9;s.enemies=Array.from({length:24},(_,i)=>({id:i+1,x:650+i%8*100,y:500+Math.floor(i/8)*80,vx:180,vy:40,a:0,hp:1,max:1,kind:0,cd:100}));s.bullets=s.enemies.map(e=>({x:e.x-50,y:e.y,vx:1000,vy:0,t:1,team:0,dmg:26}));s.loot=Array.from({length:160},(_,i)=>({x:800+i*.12345,y:600+i*.9876,v:12}));const out=game.onTick({...ctx,now:100050,sessionState:s,inputs:[]});assert.equal(out.ok,true);assert.equal(s.fx.filter(f=>f.effect==='ship-breakup').length,24);assert.equal(out.broadcast.at(-1).data.world.multipart,true);for(const packet of out.broadcast)assert.ok(Buffer.byteLength(JSON.stringify(packet.data))<16000);
});
