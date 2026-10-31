import {HULLS} from './arsenal.js';

export const PILOT_SHAPES=[[[1.4,0],[-.8,-.5],[-.25,0],[-.8,.5]],[[1,-.5],[1,.5],[-.7,.8],[-1,0],[-.7,-.8]],[[1,0],[.5,-.65],[-.9,-.65],[-.7,0],[-.9,.65],[.5,.65]],[[1.15,0],[.2,-.8],[-1,-.6],[-.5,0],[-1,.6],[.2,.8]],[[1.6,0],[-.8,-.32],[-.4,0],[-.8,.32]],[[1,-.4],[1,.4],[-.8,.7],[-1,-.7]]];
export const HULL_OUTLINES=PILOT_SHAPES.concat([
 [[1,0],[.2,-.3],[-.35,-.65],[-.7,-.6],[-.45,0],[-.7,.6],[-.35,.65],[.2,.3]],
 [[1,-.5],[1,.5],[-.8,.8],[-1,0],[-.8,-.8]],
 [[1.6,0],[-.8,-.24],[-.35,0],[-.8,.24]],
 [[1,0],[.5,-.8],[-.7,-.8],[-1,0],[-.7,.8],[.5,.8]],
 [[1.4,0],[-.9,-.5],[-.3,0],[-.9,.5]],
 [[8/9,0],[1/9,-5/9],[-7/9,-4/9],[-7/9,4/9],[1/9,5/9]],
 [[1,0],[-.8,-.55],[-.45,0],[-.8,.55]]
]);
export const NPC_RADII=[17,29,62,22,38,12];
export const DEBRIS_LIFE=3.6,MAX_IMPACT_DRIFT=48;
export function shipGeometry(ship,pilot=!!ship.pilot,hull=ship.hull||0,role=ship.role||0){
 if(ship.mining)return {shape:11,size:9};
 if(ship.baseFighter)return {shape:12,size:7};
 if(pilot)return {shape:role,size:HULLS[hull]?.radius||24};
 const kind=ship.kind||0;return {shape:[6,7,6,8,9,10][kind]??6,size:ship.owner?13:ship.escort||ship.team===0&&ship.faction===undefined?18:NPC_RADII[kind]||17};
}
const impactDecay=(ship,time)=>Math.exp(-Math.max(0,time-(ship.impactAt??time))*1.4);
// Visual impulse only: this never changes live movement, health or trust checks.
export function recordShipImpact(ship,damage,direction,time){
 if(!direction||!Number.isFinite(damage)||damage<=0)return;
 const length=Math.hypot(direction.x,direction.y);if(!Number.isFinite(length)||length<.0001)return;
 const decay=impactDecay(ship,time),force=Math.min(14,damage*.18)/(1+(ship.hull||0)*.25);
 let x=(ship.impactX||0)*decay+direction.x/length*force,y=(ship.impactY||0)*decay+direction.y/length*force;
 const magnitude=Math.hypot(x,y);if(magnitude>MAX_IMPACT_DRIFT){x*=MAX_IMPACT_DRIFT/magnitude;y*=MAX_IMPACT_DRIFT/magnitude;}
 ship.impactX=x;ship.impactY=y;ship.impactAt=time;
}
export function shipBreakup(ship,time,pilot=!!ship.pilot,hull=ship.hull||0,role=ship.role||0){
 const geometry=shipGeometry(ship,pilot,hull,role),decay=impactDecay(ship,time);
 return {effect:'ship-breakup',x:ship.x,y:ship.y,a:ship.a||0,vx:(ship.vx||0)+(ship.impactX||0)*decay,vy:(ship.vy||0)+(ship.impactY||0)*decay,av:ship.av||0,shape:geometry.shape,size:geometry.size,faction:ship.faction,max:DEBRIS_LIFE,t:DEBRIS_LIFE};
}
function debrisHash(seed){const n=Math.sin(seed*127.1+311.7)*43758.5453;return n-Math.floor(n);}
// All outlines are star-shaped around the origin. Wedges exactly cover the hull;
// larger hulls split each wedge again, keeping a strict sixteen-piece limit.
export function hullFragments(f){
 const shape=HULL_OUTLINES[f.shape]||HULL_OUTLINES[6],r=f.size||24,ca=Math.cos(f.a||0),sa=Math.sin(f.a||0),seed=f.seed||0,parts=[];
 const add=(a,b)=>{const points=[[0,0],[a[0]*r,a[1]*r],[b[0]*r,b[1]*r]],cx=(a[0]+b[0])*r/3,cy=(a[1]+b[1])*r/3,x=ca*cx-sa*cy,y=sa*cx+ca*cy,mass=Math.abs((a[0]*b[1]-a[1]*b[0])*r*r/2);if(mass<.001)return;
  const length=Math.hypot(x,y)||1,speed=(26+Math.sqrt(r)*5)*(.65+debrisHash(seed+parts.length+9)*.65);
  parts.push({points:points.map(p=>[p[0]-cx,p[1]-cy]),x,y,mass,radialX:x/length*speed,radialY:y/length*speed,spin:(f.av||0)+(debrisHash(seed+parts.length+40)-.5)*3});};
 for(let i=0;i<shape.length;i++){const a=shape[i],b=shape[(i+1)%shape.length];if(r>=36){const mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];add(a,mid);add(mid,b);}else add(a,b);}
 const mass=parts.reduce((n,p)=>n+p.mass,0)||1,meanX=parts.reduce((n,p)=>n+p.radialX*p.mass,0)/mass,meanY=parts.reduce((n,p)=>n+p.radialY*p.mass,0)/mass;
 return parts.map(p=>({...p,vx:(f.vx||0)-(f.av||0)*p.y+p.radialX-meanX,vy:(f.vy||0)+(f.av||0)*p.x+p.radialY-meanY}));
}
