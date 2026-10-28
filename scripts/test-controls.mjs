import assert from 'node:assert/strict';import fs from 'node:fs';
import {flightControls} from '../game/src/controls.js';
import {createGame,update} from '../game/src/sim.js';
const manifest=fs.readFileSync(new URL('../game/starhermit.txt',import.meta.url),'utf8');
for(const [action,keys] of Object.entries({up:['KeyW','ArrowUp'],down:['KeyS','ArrowDown'],left:['KeyA','ArrowLeft'],right:['KeyD','ArrowRight'],boost:['ShiftLeft','ShiftRight']})){const line=manifest.split('\n').find(l=>l.startsWith('control.'+action+'='));for(const key of keys)assert.ok(line.split('|')[0].split('=')[1].split('+').map(k=>k.trim()).includes(key));}
for(const source of ['keyboard','gamepad','pointer','none']){const thrust=flightControls({up:1},source);assert.equal(thrust.steering,true);assert.equal(thrust.thrust,1);assert.equal(thrust.x,0);assert.equal(thrust.y,0);assert.equal(flightControls({down:1},source).brake,true);assert.equal(flightControls({left:1},source).turn,-1);assert.equal(flightControls({right:1},source).turn,1);}
assert.equal(flightControls({left:1,turnleft:1}).turn,-1);assert.equal(flightControls({up:1,thrust:1}).thrust,1);assert.equal(flightControls({left:1,right:1}).turn,0);
const touch=flightControls({right:1,up:1},'touch');assert.equal(touch.steering,false);assert.equal(touch.x,1);assert.equal(touch.y,-1);
function arena(){const s=createGame();s.baseDefense={shields:[],turrets:[],fighters:[],fx:[]};s.rocks=[];s.nests=[];s.objectives=[];s.ships=[s.player];s.player.x=0;s.player.y=0;s.player.a=-Math.PI/2;return s;}
for(const [action,direction] of [['left',-1],['right',1]]){const s=arena(),a=s.player.a;for(let i=0;i<30;i++)update(s,1/60,flightControls({[action]:1}));assert.ok((s.player.a-a)*direction>0);assert.equal(s.player.x,0);assert.equal(s.player.y,0);}
let s=arena();for(let i=0;i<60;i++)update(s,1/60,flightControls({up:1}));assert.ok(s.player.y<-80);const vy=s.player.vy;for(let i=0;i<20;i++)update(s,1/60,flightControls({down:1}));assert.ok(Math.abs(s.player.vy)<Math.abs(vy)*.1);assert.ok(s.player.vy<=0);
const normal=arena(),boost=arena();for(let i=0;i<60;i++){update(normal,1/60,flightControls({up:1}));update(boost,1/60,{...flightControls({up:1}),boost:true});}assert.ok(-boost.player.y>-normal.player.y*1.5);assert.ok(boost.boost<100);
console.log('PASS: exact WASD/arrow and both Shift defaults; keyboard works before pointer input; opposing turns cancel; no strafing; correct clockwise/counterclockwise turn, heading-relative thrust, non-reversing brake and boost.');
