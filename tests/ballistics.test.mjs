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
