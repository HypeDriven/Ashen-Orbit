// Velocity at a moving/rotating launch point, plus muzzle velocity in that frame.
export function launchVelocity(ship,angle,speed,x=ship.x,y=ship.y){return {vx:(ship.vx||0)-(ship.av||0)*(y-ship.y)+Math.cos(angle)*speed,vy:(ship.vy||0)+(ship.av||0)*(x-ship.x)+Math.sin(angle)*speed};}
// Earliest reachable intercept, bounded by projectile lifetime. Acceleration is
// an observed estimate, not a promise: recalculated for every defensive shot.
export function interceptPoint(origin,target,speed,lifetime,offset=0){
 const acceleration=Math.hypot(target.ax||0,target.ay||0),limit=1200,scale=acceleration>limit?limit/acceleration:1,ax=(target.ax||0)*scale,ay=(target.ay||0)*scale;
 const position=t=>({x:target.x+(target.vx||0)*t+.5*ax*t*t,y:target.y+(target.vy||0)*t+.5*ay*t*t});
 const error=t=>{const p=position(t);return Math.max(0,Math.hypot(p.x-origin.x,p.y-origin.y)-offset)-speed*t;};
 let previous=0;for(let i=1;i<=64;i++){const t=lifetime*i/64;if(error(t)<=0){let lo=previous,hi=t;for(let j=0;j<16;j++){const mid=(lo+hi)/2;if(error(mid)>0)lo=mid;else hi=mid;}return {...position(hi),time:hi,reachable:true};}previous=t;}
 return {...position(Math.min(lifetime,Math.hypot(target.x-origin.x,target.y-origin.y)/speed)),time:lifetime,reachable:false};
}
