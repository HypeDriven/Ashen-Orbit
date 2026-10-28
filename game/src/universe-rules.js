export const WORLD_CAPACITY=32;
export const FACTIONS=[{name:'RIGHTEOUS REPUBLIC',short:'REPUBLIC',color:'#c7d1ab',baseX:-2200},{name:'LEFT WING REBELLION',short:'REBELLION',color:'#d4a296',baseX:2200}];
export const ROLES=[
 {id:'interceptor',name:'INTERCEPTOR',desc:'Fast, agile dogfighter; light armor, only 2 mines.',cost:0,speed:1.2,hp:.8,turn:1.3,damage:1,tractor:1,cloak:1,mines:2,shape:0},
 {id:'guardian',name:'GUARDIAN',desc:'Heavy shields and armor; slow, cannot cloak.',cost:280,speed:.72,hp:1.5,turn:.8,damage:1.1,tractor:.8,cloak:0,mines:3,shape:1},
 {id:'miner',name:'PROSPECTOR',desc:'60% more ore, wide tractor; weak combat weapons.',cost:220,speed:.85,hp:1.1,turn:.9,damage:.7,tractor:1.6,cloak:1,mines:4,shape:2},
 {id:'minelayer',name:'MINELAYER',desc:'12 persistent mines; modest hull and gun damage.',cost:260,speed:.95,hp:.9,turn:1,damage:.85,tractor:1,cloak:1,mines:12,shape:3},
 {id:'infiltrator',name:'INFILTRATOR',desc:'Efficient cloak and nimble flight; fragile hull.',cost:320,speed:1.12,hp:.72,turn:1.2,damage:.9,tractor:.8,cloak:.45,mines:3,shape:4},
 {id:'support',name:'SUPPORT TENDER',desc:'Repairs nearby allies; slow, low weapon damage.',cost:240,speed:.88,hp:1.1,turn:.85,damage:.7,tractor:1.2,cloak:1.2,mines:5,shape:5}
];
export function voiceGain(listener,speaker){if(!listener||!speaker||listener.faction!==speaker.faction||speaker.hp<=0)return 0;const d=Math.hypot(listener.x-speaker.x,listener.y-speaker.y);if(d>=1100)return 0;if(d<=120)return 1;const t=(d-120)/980;return (1-t)*(1-t);}
export function visibleShip(viewer,target){return viewer.faction===target.faction||!target.cloaked||Math.hypot(viewer.x-target.x,viewer.y-target.y)<=150;}
export const ROCK_MIN=13;
// Area and ore are conserved through each split; the hit is never applied to a
// just-created child, so a single projectile cannot erase a complete rock tree.
export function fractureRock(r,hitX,hitY){
 if(r.r<=ROCK_MIN)return [];
 const a=Math.atan2(r.y-hitY,r.x-hitX)+Math.PI/2,seed=(r.seed||Math.floor(r.x*13+r.y*7))>>>0,ratio=.44+(seed%13)/100;
 return [ratio,1-ratio].map((fraction,i)=>{const sign=i?1:-1,radius=r.r*Math.sqrt(fraction),ore=i?(r.ore??24)-Math.floor((r.ore??24)*ratio):Math.floor((r.ore??24)*ratio),speed=24+(seed%31);return {x:r.x+Math.cos(a)*sign*radius*.4,y:r.y+Math.sin(a)*sign*radius*.4,r:radius,hp:Math.max(8,radius*.85),type:(r.type+i+1)%10,a:(r.a||0)+sign*.3,vx:(r.vx||0)+Math.cos(a)*sign*speed,vy:(r.vy||0)+Math.sin(a)*sign*speed,spin:sign*(.2+(seed%7)*.08),seed:seed+i+17,ore};});
}
export function driftRocks(rocks,dt){for(const r of rocks){r.x+=(r.vx||0)*dt;r.y+=(r.vy||0)*dt;r.a+=(r.spin||0)*dt;const drag=Math.exp(-dt*.15);r.vx=(r.vx||0)*drag;r.vy=(r.vy||0)*drag;}}

export function sweptHit(ax,ay,bx,by,x,y,r){const dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-ax-t*dx,y-ay-t*dy)<=r;}
