import {pilotMotionStats,WORLD_Y} from './universe-rules.js';

const turnDistance=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
const round=n=>Math.round(n*1000)/1000;
export function resetFlightAudit(p,now){
 p.audit={at:now,fundedAt:now,x:p.x,y:p.y,a:p.a,vx:p.vx||0,vy:p.vy||0,credit:pilotMotionStats(p).speed*.35,seq:p.inputAck||0,mean:0,variance:1,samples:0,score:p.audit&&p.audit.score||0};
 p.correctionSeq=(p.correctionSeq||0)+1;
}
export function movementAuthority(p){return p.untrusted?Math.max(0,.25-(p.violations||0)*.025):1;}
// Only server time funds the travel budget. Client timestamps, counters, and
// learned statistics cannot enlarge the physical limits of the equipped ship.
export function validateFlightReport(p,report,seq,now,input,rocks=[]){
 if(!report||p.hp<=0)return {accepted:false,reason:'none'};
 if(report.spawnSeq!==p.spawnSeq)return {accepted:false,reason:'old-spawn'};
 if(!p.audit)resetFlightAudit(p,now);
 const audit=p.audit;if(seq<=audit.seq)return {accepted:false,reason:'old-input'};
 const elapsed=Math.max(.001,(now-audit.at)/1000),st=pilotMotionStats(p);
 const cap=st.speed*(input.boost&&p.boost>0?440/225:1)*(p.cloaked?.65:1)*(input.tractor?.75:1),maxCap=st.speed*440/225;
 const allowance=p.untrusted?2:maxCap*.35,slack=p.untrusted?2:8;
 audit.credit=Math.min(maxCap*.4+allowance,audit.credit+cap*Math.min(Math.max(0,(now-(audit.fundedAt??audit.at))/1000),.5));
 audit.fundedAt=now;
 const finite=['x','y','vx','vy','a'].every(k=>Number.isFinite(report[k]));
 const travel=finite?Math.hypot(report.x-audit.x,report.y-audit.y):Infinity;
 const speed=finite?Math.hypot(report.vx,report.vy):Infinity;
 const acceleration=finite?Math.hypot(report.vx-audit.vx,report.vy-audit.vy):Infinity;
 const previousSpeed=Math.hypot(audit.vx,audit.vy),span=Math.min(elapsed,.5),jitter=p.untrusted?.04:.25;
 const physicalDistance=Math.min(maxCap*(span+jitter),(previousSpeed+speed)*.5*(span+jitter)+maxCap*3*(span+jitter)*(span+jitter)*.5)+slack;
 const residual=finite?Math.hypot(report.x-p.x,report.y-p.y):Infinity;
 let reason='';
 if(!finite)reason='non-finite';
 else if(Math.abs(report.x)>3200||Math.abs(report.y)>WORLD_Y)reason='world-bounds';
 else if(speed>maxCap*1.015+2)reason='speed';
 else if(travel>audit.credit+slack||travel>physicalDistance)reason='travel';
 else if(acceleration-Math.max(0,previousSpeed-speed)>maxCap*6*(span+jitter)+20)reason='acceleration';
 else if(turnDistance(report.a,audit.a)>st.turn*(span+jitter)+(p.untrusted?.04:.16))reason='turn';
 else if(p.untrusted&&residual>maxCap*.3+slack)reason='residual';
 else if(p.untrusted&&audit.samples>40&&residual/Math.max(4,maxCap*.08)>Math.max(2.5,audit.mean+4*Math.sqrt(audit.variance)))reason='statistical-outlier';
 // Lag and a superseded spawn are resynchronizations, not evidence of cheating.
 if(elapsed>.65){resetFlightAudit(p,now);return {accepted:false,reason:'resync'};}
 audit.seq=seq;
 if(reason){
  // One correction takes a network round trip to reach the pilot. Treat its
  // in-flight reports as one incident rather than several independent strikes.
  const hard=reason==='non-finite'||reason==='world-bounds'||speed>maxCap*1.5||travel>maxCap;
  if(hard||p.lastFlightStrike===undefined||now-p.lastFlightStrike>=350){p.violations=(p.violations||0)+1;audit.score+=hard?4:1;p.lastFlightStrike=now;}
  p.lastFlightReason=reason;
  if(audit.score>=3)p.untrusted=true;
  p.correctionSeq=(p.correctionSeq||0)+1;
  // A rejected sample never changes the anchor or teaches a wider envelope.
  return {accepted:false,reason};
 }
 // A small rolling innovation score detects persistent bias as well as spikes.
 const normalized=residual/Math.max(4,maxCap*.08),delta=normalized-audit.mean;
 audit.mean=round(audit.mean+.08*delta);audit.variance=round(Math.max(.1,.92*audit.variance+.08*delta*delta));audit.samples++;
 audit.score=Math.max(0,audit.score-.04);
 const alpha=movementAuthority(p),x=p.x+(report.x-p.x)*alpha,y=p.y+(report.y-p.y)*alpha;
 let blocked=false;
 for(const rock of rocks){const dx=x-p.x,dy=y-p.y,length=dx*dx+dy*dy,t=length?Math.max(0,Math.min(1,((rock.x-p.x)*dx+(rock.y-p.y)*dy)/length)):0;if(Math.hypot(p.x+t*dx-rock.x,p.y+t*dy-rock.y)<rock.r+st.radius-2&&(Math.hypot(p.x-rock.x,p.y-rock.y)>=rock.r+st.radius-2||Math.hypot(x-rock.x,y-rock.y)<Math.hypot(p.x-rock.x,p.y-rock.y))){blocked=true;break;}}
 if(blocked){p.correctionSeq=(p.correctionSeq||0)+1;return {accepted:false,reason:'collision'};}
 p.x=x;p.y=y;p.a+=Math.atan2(Math.sin(report.a-p.a),Math.cos(report.a-p.a))*alpha;p.vx+=(report.vx-p.vx)*alpha;p.vy+=(report.vy-p.vy)*alpha;
 audit.credit=round(Math.max(0,audit.credit-travel));audit.x=report.x;audit.y=report.y;audit.a=report.a;audit.vx=report.vx;audit.vy=report.vy;audit.at=now;
 return {accepted:true,authority:alpha};
}
