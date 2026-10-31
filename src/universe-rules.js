import {WORLD_CAPACITY,FACTIONS,ROLES} from './factions.js';
export {WORLD_CAPACITY,FACTIONS,ROLES} from './factions.js';
import {shipStats,shipLevel} from './shipyard.js';
export function voiceGain(listener,speaker){if(!listener||!speaker||listener.hp<=0||listener.faction!==speaker.faction||speaker.hp<=0)return 0;const d=Math.hypot(listener.x-speaker.x,listener.y-speaker.y);if(d>=1100)return 0;if(d<=120)return 1;const t=(d-120)/980;return (1-t)*(1-t);}
export function visibleShip(viewer,target){return viewer.faction===target.faction||!target.cloaked||Math.hypot(viewer.x-target.x,viewer.y-target.y)<=150;}
export const ROCK_MIN=13;
// Area and ore are conserved through each split; the hit is never applied to a
// just-created child, so a single projectile cannot erase a complete rock tree.
export function fractureRock(r,hitX,hitY){
 if(r.r<=ROCK_MIN)return [];
 const a=Math.atan2(r.y-hitY,r.x-hitX)+Math.PI/2,seed=(r.seed||Math.floor(r.x*13+r.y*7))>>>0,ratio=.44+(seed%13)/100;
 return [ratio,1-ratio].map((fraction,i)=>{const sign=i?1:-1,radius=r.r*Math.sqrt(fraction),ore=i?(r.ore??24)-Math.floor((r.ore??24)*ratio):Math.floor((r.ore??24)*ratio),speed=24+(seed%31);return {x:r.x+Math.cos(a)*sign*radius*.4,y:r.y+Math.sin(a)*sign*radius*.4,r:radius,hp:Math.max(8,radius*.85),type:(r.type+i+1)%10,a:(r.a||0)+sign*.3,vx:(r.vx||0)+Math.cos(a)*sign*speed,vy:(r.vy||0)+Math.sin(a)*sign*speed,spin:sign*(.2+(seed%7)*.08),seed:seed+i+17,ore};});
}
export function driftRocks(rocks,dt){const drag=Math.exp(-dt*.15);for(const r of rocks){r.x+=(r.vx||0)*dt;r.y+=(r.vy||0)*dt;r.a+=(r.spin||0)*dt;r.vx=(r.vx||0)*drag;r.vy=(r.vy||0)*drag;}}

export function sweptHit(ax,ay,bx,by,x,y,r){const dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-ax-t*dx,y-ay-t*dy)<=r;}

const flightClamp=(v,a,b)=>Number.isFinite(v)?Math.max(a,Math.min(b,v)):0;
export const WORLD_SECTORS=9,SECTOR_SPACING=1600,WORLD_Y=7200;
export const sectorAt=y=>Math.max(0,Math.min(WORLD_SECTORS-1,Math.floor((y+WORLD_Y)/SECTOR_SPACING)));
export const sectorY=id=>(id-4)*SECTOR_SPACING;
export function pilotMotionStats(p,stats=null){const hull=p.hull||0,role=ROLES[p.role||0];if(p.loadout){const st=stats||shipStats(p);return {speed:225*(1+shipLevel(p,'engine')*.09)*st.speed,turn:st.turn,radius:HULLS_MOTION_RADIUS[ hull ]};}return {speed:(250-hull*24)*role.speed,turn:(2.8-hull*.32)*role.turn,radius:22+hull*9};}
const HULLS_MOTION_RADIUS=[24,31,40,52,66];
// Force/torque integration shared by solo flight, server simulation and prediction.
export function integratePilotThrust(p,dt,input,st){
 p.thrusting=Math.abs(input.thrust||0)+Math.abs(input.strafe||0)+Math.abs(input.x||0)+Math.abs(input.y||0)>.01;
 const steps=Math.max(1,Math.ceil(dt*120)),h=dt/steps,turnAcceleration=st.turn*9;
 const thrust=flightClamp((input.thrust||0)-(input.brake?1:0),-1,1),strafe=flightClamp(input.strafe||0,-1,1);
 const boosted=input.boost&&p.boost!==0,limit=st.speed*(boosted?440/225:1)*(p.cloaked?.65:1)*(input.tractor?.75:1);
 for(let i=0;i<steps;i++){
  let av=p.av||0,torque=0;
  if(Number.isFinite(input.aim)){
   const error=Math.atan2(Math.sin(input.aim-p.a),Math.cos(input.aim-p.a));
   const wanted=Math.sign(error)*Math.min(st.turn,Math.sqrt(2*turnAcceleration*Math.abs(error)));
   torque=flightClamp((wanted-av)/h,-turnAcceleration,turnAcceleration);
  }else torque=flightClamp(input.turn||0,-1,1)*turnAcceleration;
  const nextAv=flightClamp(av+torque*h,-st.turn,st.turn),angle=p.a+(av+nextAv)*h*.25;
  let ax,ay;
  if(input.steering){const cos=Math.cos(angle),sin=Math.sin(angle);ax=cos*thrust-sin*strafe;ay=sin*thrust+cos*strafe;}
  else {ax=flightClamp(input.x||0,-1,1);ay=flightClamp(input.y||0,-1,1);}
  const magnitude=Math.max(1,Math.hypot(ax,ay)),acceleration=limit*3;
  const vx=p.vx||0,vy=p.vy||0,oldSpeed=Math.hypot(vx,vy);
  let nx=vx+ax/magnitude*acceleration*h,ny=vy+ay/magnitude*acceleration*h;
  // A speed limit constrains engine acceleration, never erases existing momentum.
  const cap=Math.max(limit,oldSpeed),speed=Math.hypot(nx,ny);if(speed>cap){nx*=cap/speed;ny*=cap/speed;}
  p.x+=(vx+nx)*.5*h;p.y+=(vy+ny)*.5*h;p.vx=nx;p.vy=ny;
  const nextAngle=p.a+(av+nextAv)*h*.5;p.a=Math.atan2(Math.sin(nextAngle),Math.cos(nextAngle));p.av=nextAv;
 }
}
// Used by the authoritative server, live prediction, and input replay. This
// changes movement only: damage, weapons, resources and visibility stay on the server.
export function stepPilotMovement(p,dt,input,rocks=[],shared=true){
 if(p.hp<=0)return;
 if(shared){
  const st=pilotMotionStats(p);integratePilotThrust(p,dt,input,st);
  for(const r of rocks){const d=Math.hypot(p.x-r.x,p.y-r.y),radius=r.r+st.radius;if(d<radius){const nx=d?(p.x-r.x)/d:1,ny=d?(p.y-r.y)/d:0,dot=p.vx*nx+p.vy*ny;p.x=r.x+nx*radius;p.y=r.y+ny*radius;if(dot<0){p.vx-=nx*dot*1.15;p.vy-=ny*dot*1.15;}}}
  if(p.x>3200||p.x< -3200){p.x=flightClamp(p.x,-3200,3200);p.vx=0;}if(p.y>WORLD_Y||p.y< -WORLD_Y){p.y=flightClamp(p.y,-WORLD_Y,WORLD_Y);p.vy=0;}return;
 }
 const m={steering:input.steering===true,turn:flightClamp(input.turn,-1,1),strafe:flightClamp(input.strafe,-1,1),thrust:flightClamp(input.thrust,-1,1),brake:input.brake===true,x:flightClamp(input.x,-1,1),y:flightClamp(input.y,-1,1),aim:Number.isFinite(input.aim)?input.aim:null,boost:input.boost===true,tractor:input.tractor===true};
 const st=shared?pilotMotionStats(p):{speed:215,turn:2.8,radius:25};
 if(m.aim!==null&&(shared||m.steering)){const delta=Math.atan2(Math.sin(m.aim-p.a),Math.cos(m.aim-p.a));p.a+=flightClamp(delta,-st.turn*dt,st.turn*dt);}else if(m.steering)p.a+=m.turn*st.turn*dt;
 if(!shared)p.a=Math.atan2(Math.sin(p.a),Math.cos(p.a));
 const thrust=flightClamp(m.thrust-(m.brake?1:0),-1,1),length=Math.max(1,Math.hypot(m.x,m.y));
 let dx=m.steering?Math.cos(p.a)*thrust-Math.sin(p.a)*m.strafe:m.x,dy=m.steering?Math.sin(p.a)*thrust+Math.cos(p.a)*m.strafe:m.y;
 if(!shared&&m.steering){dx+=m.x/length;dy+=m.y/length;}
 const n=Math.max(1,Math.hypot(dx,dy)),cloaked=p.cloaked&&!input.fire&&!m.boost;
 const speed=shared?st.speed*(m.boost&&!cloaked&&p.boost!==0?(p.loadout?440/225:1.65):1)*(cloaked?.65:1)*(m.tractor?.75:1):m.boost?310:m.tractor?155:215;
 if(shared){p.vx+=(dx/n*speed-p.vx)*(1-Math.exp(-dt*12));p.vy+=(dy/n*speed-p.vy)*(1-Math.exp(-dt*12));}
 else if(m.steering){p.vx+=(dx/n*speed*2-p.vx*.3)*dt;p.vy+=(dy/n*speed*2-p.vy*.3)*dt;}
 else{p.vx=dx/n*speed;p.vy=dy/n*speed;if(m.aim!==null)p.a=m.aim;}
 const cap=Math.max(1,Math.hypot(p.vx,p.vy)/speed);p.vx/=cap;p.vy/=cap;
 p.x=flightClamp(p.x+p.vx*dt,shared?-3200:-1400,shared?3200:1400);p.y=flightClamp(p.y+p.vy*dt,shared?-WORLD_Y:-1000,shared?WORLD_Y:1000);
 if(shared)for(const r of rocks){const d=Math.hypot(p.x-r.x,p.y-r.y),radius=r.r+st.radius;if(d<radius){const a=Math.atan2(p.y-r.y,p.x-r.x);p.x=r.x+Math.cos(a)*radius;p.y=r.y+Math.sin(a)*radius;p.vx*=.65;p.vy*=.65;}}
 if(shared){p.x=flightClamp(p.x,-3200,3200);p.y=flightClamp(p.y,-WORLD_Y,WORLD_Y);}
}
