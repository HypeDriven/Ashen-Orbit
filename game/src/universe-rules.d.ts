export const WORLD_CAPACITY:number;
export const FACTIONS:{name:string;short:string;color:string;baseX:number}[];
export interface Role {id:string;name:string;desc:string;cost:number;speed:number;hp:number;turn:number;damage:number;tractor:number;cloak:number;mines:number;shape:number}
export const ROLES:Role[];
export function voiceGain(listener:{faction:number;x:number;y:number},speaker:{faction:number;x:number;y:number;hp:number}):number;
export function visibleShip(viewer:{faction:number;x:number;y:number},target:{faction:number;x:number;y:number;cloaked?:boolean}):boolean;
export function fractureRock(r:import('./sim.js').Rock,hitX:number,hitY:number):import('./sim.js').Rock[];
export function driftRocks(rocks:import('./sim.js').Rock[],dt:number):void;
