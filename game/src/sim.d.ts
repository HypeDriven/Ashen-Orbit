export interface Point {x:number;y:number}
export interface Ship extends Point {id:number;vx:number;vy:number;a:number;hp:number;max:number;shield:number;maxShield:number;lastHit:number;cd:number;spawn:number;charge:number;team:number;kind:number;hit:number;destroyed?:boolean;bounty?:boolean;pilot?:string;name?:string}
export interface Rock extends Point {r:number;hp:number;type:number;a:number}
export interface Nest extends Point {r:number;hp:number;max:number;cd:number;team:number;destroyed?:boolean}
export interface Objective extends Point {id:string;name:string;progress:number;total:number;reward:number;tech:number;hp?:number;done:boolean;failed:boolean;active:boolean;target?:number}
export interface Game {schema:number;sector:number;depth:number;scrap:number;tech:number;kills:number;gun:number;armor:number;wing:number;time:number;pulse:number;boost:number;energy:number;tractorOn:boolean;stance:number;upgrades:Record<string,number>;visited:number[];cleared:number[];sectorDone:boolean;ships:Ship[];rocks:Rock[];bullets:(Point&{vx:number;vy:number;team:number;t:number;dmg:number;pierce:number;hits:number[]})[];loot:(Point&{v:number})[];fx:(Point&{vx:number;vy:number;t:number;max:number;pulse?:boolean;r?:number})[];nests:Nest[];objectives:Objective[];message:string;messageTime:number;won:boolean;dead:boolean;events:string[];seed:number;player:Ship;contractLog:string[];hazardClock:number}
export interface SectorInfo {id?:number;name:string;risk:string;reward:number;hazard:string;toll:number;repair:number;types:number[];note:string;bonus:string}
export interface Upgrade {id:string;tree:number;name:string;desc:string;max:number;base:number;need:string;rank:number;tech:number}
export const TAU:number; export const SECTORS:string[]; export const SECTOR_INFO:SectorInfo[];
export const TREES:string[];export const UPGRADES:Upgrade[];
export const ENEMIES:{name:string;hp:number;speed:number;range:number;rate:number;radius:number;reward:number}[];
export function rng(seed:number):()=>number;
export function dist(a:Point,b:Point):number;
export function makeShip(x:number,y:number,team?:number,kind?:number):Ship;
export function createGame(saved?:unknown):Game;
export function checkpoint(s:Game):import('starhermit:engine').JsonValue;
export function loadSector(s:Game):void;
export function update(s:Game,dt:number,input:{x?:number;y?:number;fire?:boolean;boost?:boolean;aim?:number|null}):void;
export function emp(s:Game):void; export function notify(s:Game,m:string):void;
export function tractorRange(s:Game):number;
export function interact(s:Game):string;
export function upgrade(s:Game,k:number|string):boolean;
export function upgradeStatus(s:Game,id:string):{cost:number;tech:number;ok:boolean;reason:string;level:number};
export function jump(s:Game,destination?:number):boolean;
export function routes(s:Game):(SectorInfo&{id:number})[];
export function clear(s:Game):boolean;
