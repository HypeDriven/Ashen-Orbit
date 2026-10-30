import {launchVelocity} from './ballistics.js';
import {HULLS,weapon} from './arsenal.js';
import {shipLevel} from './shipyard.js';
// Cosmetic only. Hit detection, damage, ammunition and heat stay on the server.
export class FireFeedback {
 constructor(){this.reset();}
 reset(){this.life=-1;this.cooldowns=[];}
 step(s,dt,input){
  const p=s.player;if(this.life!==p.spawnSeq){this.reset();this.life=p.spawnSeq;}
  HULLS[s.hull||0].mounts.forEach((mount,i)=>{
   this.cooldowns[i]=Math.max(0,(this.cooldowns[i]||0)-dt);const w=weapon(s.loadout?.[i]);
   if(!w||mount.type!=='fixed'||!input.fire||p.hp<=0||p.cloaked||s.overheated||s.energy<w.energy||this.cooldowns[i]>0)return;
   this.cooldowns[i]=w.rate/(1+shipLevel(s,'gun')*.05);
   const a=p.a,x=p.x+Math.cos(a)*mount.x-Math.sin(a)*mount.y,y=p.y+Math.sin(a)*mount.x+Math.cos(a)*mount.y;
   s.fx.push({effect:'muzzle',x,y,a,vx:0,vy:0,t:.12,max:.12,size:9,weapon:w.id,seed:i});
   // Short tracers bridge the first network round trip; they never apply hits.
   const velocity=launchVelocity(p,a,w.speed,x,y),span=Math.min(.08,110/(Math.hypot(velocity.vx,velocity.vy)||1));if(!w.beam)s.fx.push({effect:'beam',beam:true,x,y,x2:x+velocity.vx*span,y2:y+velocity.vy*span,t:.065,max:.065,weapon:w.id});
  });
 }
}
