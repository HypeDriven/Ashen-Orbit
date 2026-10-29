import test from 'node:test';
import assert from 'node:assert/strict';
import {resetFlightAudit,validateFlightReport,movementAuthority} from '../src/flight-authority.js';
import {stepPilotMovement} from '../src/universe-rules.js';
import {FlightPrediction} from '../src/prediction.js';
const pilot=()=>({id:'me',pilot:true,x:0,y:0,a:0,vx:0,vy:0,hp:176,hull:0,role:0,loadout:['cannon',null,'drive','reactor'],upgrades:{gun:1},boost:100,spawnSeq:1,inputAck:0});
const input={steering:true,thrust:1,strafe:0,turn:0,boost:false,tractor:false,aim:0};
test('legitimate 60Hz flight with 20Hz reports and network jitter retains full authority',()=>{
 const p=pilot(),client=pilot();resetFlightAudit(p,0);let now=0,seq=0;
 for(let i=0;i<600;i++){
  const dt=[.04,.06,.05,.05,.07,.03][i%6];now+=dt*1000;
  const m={...input,aim:Math.sin(i/30)*2,boost:i%120<30};
  for(let j=0;j<3;j++)stepPilotMovement(client,dt/3,m,[],true);
  stepPilotMovement(p,dt,m,[],true);
  const r=validateFlightReport(p,{...client},++seq,now,m);
  assert.equal(r.accepted,true,`${i}: ${r.reason}`);
  assert.equal(p.untrusted,undefined);
 }
 assert.equal(movementAuthority(p),1);
});
test('teleports and nonfinite reports reduce authority and cannot teach larger boundaries',()=>{
 const p=pilot();resetFlightAudit(p,0);
 for(let i=1;i<=6;i++){const x=p.x;const r=validateFlightReport(p,{...p,x:3000},i,i*50,input);assert.equal(r.accepted,false);assert.equal(p.x,x);}
 assert.equal(p.untrusted,true);assert.ok(movementAuthority(p)<=.1);
 resetFlightAudit(p,400);assert.equal(p.untrusted,true);assert.ok(p.audit.score>=3);
 assert.equal(validateFlightReport(p,{...p,x:NaN},7,450,input).reason,'non-finite');
});
test('stale spawns, duplicate reports and lag resynchronize without cheating flags',()=>{
 const p=pilot();resetFlightAudit(p,0);
 assert.equal(validateFlightReport(p,{...p,spawnSeq:0},1,50,input).reason,'old-spawn');
 assert.equal(validateFlightReport(p,{...p},0,50,input).reason,'old-input');
 assert.equal(validateFlightReport(p,{...p,x:2000},1,1000,input).reason,'resync');assert.equal(p.violations,undefined);
});
test('trusted snapshots retain immediate local pose and rejected reports reconcile',()=>{
 const prediction=new FlightPrediction(),p={...pilot(),authority:1,correctionSeq:1},s={player:p,ships:[p],rocks:[]};prediction.receive(s,0,true);
 for(let i=0;i<6;i++)prediction.step(1/60,input,s);
 const local=prediction.report().x,next={...pilot(),authority:1,correctionSeq:1,inputAck:3},view={player:next,ships:[next],rocks:[]};prediction.receive(view,.05,true);assert.equal(prediction.report().x,local);
 const corrected={...pilot(),authority:0,correctionSeq:2,inputAck:6};prediction.receive({player:corrected,ships:[corrected],rocks:[]},.1,true);assert.equal(prediction.report().x,0);
});

test('arrival jitter consumes bounded server-time credit without false trust flags',()=>{
 const p=pilot(),c=pilot();resetFlightAudit(p,0);let now=0,lastDelivery=0,seq=0;
 for(let i=0;i<250;i++){
  stepPilotMovement(c,.05,input,[],true);const arrival=(i+1)*50+[90,130,100,160,100][i%5];
  if(arrival<=lastDelivery)continue;const dt=(arrival-now)/1000;now=arrival;lastDelivery=arrival;stepPilotMovement(p,dt,input,[],true);
  const r=validateFlightReport(p,{...c},++seq,now,input);assert.equal(r.accepted,true,`${i}: ${r.reason}`);
 }
 assert.equal(p.untrusted,undefined);
});

test('in-flight reports from one correction count as one incident, while repeated incidents restrict authority',()=>{
 const p=pilot();p.x=200;resetFlightAudit(p,0);
 for(let i=1;i<=5;i++)assert.equal(validateFlightReport(p,{...p,x:0},i,i*50,input).accepted,false);
 assert.equal(p.violations,1);assert.equal(p.untrusted,undefined);
 validateFlightReport(p,{...p,x:0},6,450,input);assert.equal(p.violations,2);
 validateFlightReport(p,{...p,x:0},7,600,input);assert.equal(p.untrusted,undefined);
 validateFlightReport(p,{...p,x:0},8,650,input);assert.equal(p.untrusted,undefined);
 validateFlightReport(p,{...p,x:0},9,700,input);validateFlightReport(p,{...p,x:0},10,800,input);assert.equal(p.untrusted,true);
});
