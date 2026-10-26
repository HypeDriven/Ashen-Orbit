export interface Point {x:number;y:number}
export interface Ship extends Point {vx:number;vy:number;a:number;hp:number;max:number;cd:number;team:number;kind:number;hit:number;destroyed?:boolean}
export interface Rock extends Point {r:number;hp:number;type:number;a:number}
export interface Nest extends Point {r:number;hp:number;max:number;cd:number;destroyed?:boolean}
export interface Game {sector:number;scrap:number;kills:number;gun:number;armor:number;wing:number;time:number;pulse:number;boost:number;stance:number;ships:Ship[];rocks:Rock[];bullets:(Point&{vx:number;vy:number;team:number;t:number;dmg:number})[];loot:(Point&{v:number})[];fx:(Point&{vx:number;vy:number;t:number;max:number;pulse?:boolean})[];nests:Nest[];message:string;messageTime:number;won:boolean;dead:boolean;events:string[];seed:number;player:Ship;spawnTimer:number}
export interface Checkpoint {[key:string]:number;sector:number;scrap:number;gun:number;armor:number;wing:number;kills:number}
export const TAU:number;
export const SECTORS:string[];
export function rng(seed:number):()=>number;
export function dist(a:Point,b:Point):number;
export function createGame(saved?:unknown):Game;
export function checkpoint(s:Game):Checkpoint;
export function update(s:Game,dt:number,input:{x?:number;y?:number;fire?:boolean;boost?:boolean;aim?:number|null}):void;
export function emp(s:Game):void;
export function interact(s:Game):string;
export function upgrade(s:Game,k:number):boolean;
export function jump(s:Game):boolean;
export function clear(s:Game):boolean;
