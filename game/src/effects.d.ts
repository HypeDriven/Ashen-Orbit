export interface Visual {x:number;y:number;vx?:number;vy?:number;t:number;max?:number;effect?:string;seed?:number;a?:number;size?:number;weapon?:string;color?:string;beam?:boolean;x2?:number;y2?:number;pulse?:boolean;r?:number}
export interface EffectSink {line:(x:number,y:number,xx:number,yy:number,c:string,w:number)=>void;polygon:(points:[number,number][],c:string)=>void;path:(points:[number,number][],c:string,w:number)=>void}
export interface EffectPainter {zoom:number;detail:number;count:number;budget:number;line:(x:number,y:number,xx:number,yy:number,c:string,w?:number)=>void;poly:(points:[number,number][],c:string)=>void;ring:(x:number,y:number,r:number,c:string,w?:number,start?:number,end?:number)=>void;disc:(x:number,y:number,r:number,c:string)=>void;glow:(x:number,y:number,r:number,c:string,strength?:number)=>void}
export const MAX_EFFECTS:number;
export function emitVisual(list:Visual[],effect:string,x:number,y:number,options?:Partial<Visual>):void;
export function stepVisuals<T extends Visual>(list:T[],dt:number):T[];
export function createEffectPainter(sink:EffectSink,view:{zoom:number;scale?:number;cx:number;cy:number;width:number;height:number},budget?:number):EffectPainter;
export function renderProjectile(p:EffectPainter,b:{x:number;y:number;vx:number;vy:number;t:number;weapon?:string;team?:number;trail?:{x:number;y:number}[]},time:number):void;
export function renderVisual(p:EffectPainter,f:Visual,time:number):void;
export function renderBeam(p:EffectPainter,f:Visual,time:number):void;
export function renderHullDetail(p:EffectPainter,e:{x:number;y:number;a:number;mountAngles?:number[];scars?:{x:number;y:number;a:number;size:number;born:number;weapon:string}[]},r:number,time:number,mounts?:{x:number;y:number;type:string}[],loadout?:(string|null)[]):void;
