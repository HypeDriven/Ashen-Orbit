import test from 'node:test';import assert from 'node:assert/strict';import {packShots,unpackShots} from '../src/wire.js';import {FireFeedback} from '../src/fire-feedback.js';import {createGame} from '../src/sim.js';
test('packed projectiles preserve collision-visible positions and long-lived mines',()=>{
 const shots=Array.from({length:1200},(_,i)=>[100000+i,-3199.25,7199.5,-2100,1400,90,1,145,4]);const text=packShots(shots),decoded=[];for(let i=0;i<text.length;i+=11952)decoded.push(...unpackShots(text.slice(i,i+11952)));assert.deepEqual(decoded,shots);assert.ok(text.length<JSON.stringify(shots).length*.6);
});
test('firing gives local feedback on the first frame and never applies damage',()=>{
 const s=createGame(),feedback=new FireFeedback(),hp=s.player.hp,energy=s.energy;feedback.step(s,1/60,{fire:true});assert.ok(s.fx.some(e=>e.effect==='muzzle'));assert.ok(s.fx.some(e=>e.beam));assert.equal(s.player.hp,hp);assert.equal(s.energy,energy);const count=s.fx.length;feedback.step(s,1/60,{fire:true});assert.equal(s.fx.length,count);
});

test('client feedback cannot preview a weapon forbidden on the current hull',()=>{
 const s=createGame(),feedback=new FireFeedback();s.loadout[0]='siege-lance';feedback.step(s,1/60,{fire:true});assert.equal(s.fx.length,0);
});
