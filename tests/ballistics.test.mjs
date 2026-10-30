import test from 'node:test';import assert from 'node:assert/strict';import {launchVelocity,interceptPoint} from '../src/ballistics.js';import {InputTimeline,decodeFlightEvent,projectPilotMotion} from '../src/input-timeline.js';import {integratePilotThrust} from '../src/universe-rules.js';
test('muzzle velocity inherits full forward and lateral motion and rotating mount velocity',()=>{
 const p={x:0,y:0,vx:500,vy:120,av:2};assert.deepEqual(launchVelocity(p,0,720,10,0),{vx:1220,vy:140});assert.deepEqual(launchVelocity({...p,av:0},Math.PI,720),{vx:-220,vy:120+Math.sin(Math.PI)*720});
});
test('defensive intercept accounts for velocity, acceleration and barrel offset',()=>{
 const origin={x:0,y:0},target={x:450,y:0,vx:20,vy:100,ax:30,ay:80},p=interceptPoint(origin,target,390,1.8,155);assert.equal(p.reachable,true);assert.ok(p.y>0);assert.ok(Math.abs(Math.hypot(p.x,p.y)-155-390*p.time)<.001);assert.ok(Math.abs(p.y-(100*p.time+40*p.time*p.time))<1e-7);
});
test('input changes apply exactly 32ms later, including press/release inside one network interval',()=>{
 const q=new InputTimeline(),applied=[];q.capture(1,{steering:true,thrust:1,fire:true},0,10);q.capture(2,{steering:true,thrust:0,fire:false},.01,10.01);
 q.advance(0,.031,(dt,m)=>applied.push({dt,fire:m.fire}));assert.ok(applied.every(e=>!e.fire));applied.length=0;q.advance(.031,.05,(dt,m)=>applied.push({dt,fire:m.fire}));assert.ok(Math.abs(applied.filter(e=>e.fire).reduce((n,e)=>n+e.dt,0)-.01)<1e-9);assert.equal(q.held.fire,false);assert.equal(decodeFlightEvent(q.events()[0]).at,10.032);
});
test('remote motion applies announced future thrust only at its scheduled timestamp',()=>{
 const sample={x:0,y:0,vx:0,vy:0,a:0,av:0,time:10},meta={flightSpec:[300,3],intent:{controls:{steering:true}},pending:[{at:10.032,controls:{steering:true,thrust:1}}]};assert.equal(projectPilotMotion(sample,meta,.031,integratePilotThrust).vx,0);assert.ok(projectPilotMotion(sample,meta,.05,integratePilotThrust).vx>0);
});

test('helix motion weaves on opposite sides without losing launch drift or depending on frame rate',async()=>{
 const {advanceProjectile,projectileFragments}=await import('../src/ballistics.js');const w={weave:24},a={x:0,y:0,vx:750,vy:120,driftX:100,driftY:120,launchAngle:0,weaveSide:1},b={...a,weaveSide:-1},c={...a};advanceProjectile(a,w,.1);advanceProjectile(b,w,.1);for(let i=0;i<10;i++)advanceProjectile(c,w,.01);assert.ok(a.y>12&&b.y<12);assert.ok(Math.abs(a.y-c.y)<1e-9);assert.equal(a.vx,750);assert.equal(a.vy,120);assert.equal(projectileFragments(a,{fragments:8,fragmentSpeed:430},3).length,3);
});
test('warp visuals grow incoming hulls smoothly and render both directions within their draw budget',async()=>{
 const {warpScale,renderVisual,createEffectPainter}=await import('../src/effects.js');assert.equal(warpScale(10,10),0);assert.equal(warpScale(10,10.65),1);assert.ok(warpScale(10,10.3)>0&&warpScale(10,10.3)<1);let commands=0;const sink={line(){commands++;},polygon(){commands++;},disc(){commands++;},arc(){commands++;}};const p=createEffectPainter(sink,{zoom:1,width:1000,height:700,cx:0,cy:0},3000);for(const out of [true,false])for(let i=0;i<10;i++)renderVisual(p,{effect:'warp',x:0,y:0,a:.5,size:40,role:2,t:.85-i*.08,max:.85,out},10);assert.ok(commands>100&&commands<=3000);
});
