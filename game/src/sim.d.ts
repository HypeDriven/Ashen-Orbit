export interface Point {x:number;y:number}
export interface Ship extends Point {id:number;faction?:number;hull?:number;role?:number;cloaked?:boolean;mineCount?:number;vx:number;vy:number;a:number;hp:number;max:number;shield:number;maxShield:number;lastHit:number;cd:number;spawn:number;charge:number;team:number;kind:number;hit:number;scars?:{x:number;y:number;a:number;size:number;born:number;weapon:string}[];phase?:number;bossGuard?:boolean;burn?:number;jam?:number;destroyed?:boolean;bounty?:boolean;pilot?:string;name?:string}
export interface Rock extends Point {r:number;hp:number;type:number;a:number;vx?:number;vy?:number;spin?:number;seed?:number;ore?:number}
export interface Nest extends Point {id?:number;r:number;hp:number;max:number;cd:number;team:number;destroyed?:boolean}
export interface Objective extends Point {id:string;name:string;progress:number;total:number;reward:number;tech:number;hp?:number;done:boolean;failed:boolean;active:boolean;target?:number}
export interface BaseDefense {shields:(Point&{r:number;hp:number;max:number;recharge:number;flash:number;hitX?:number;hitY?:number})[];turrets:(Point&{a:number;cd:number})[];fighters:(Point&{a:number;hp:number;max:number;cd:number;respawn:number;down:boolean;squad:number;slot:number})[];fx:(Point&{x2:number;y2:number;t:number;kind:string})[]}
export interface Game {faction:number;role:number;cloakLock:number;mines:(Point&{arm:number;t:number;faction:number})[];bases:(Point&{hp:number;max:number;faction:number})[];baseDefense:BaseDefense|null;schema:number;hull:number;loadout:(string|null)[];owned:string[];mountState:({a:number;cd:number}|null)[];heat:number;overheated:boolean;targetId:number|null;ciphers:number[];sector:number;depth:number;scrap:number;tech:number;kills:number;gun:number;armor:number;wing:number;time:number;pulse:number;boost:number;energy:number;tractorOn:boolean;stance:number;upgrades:Record<string,number>;visited:number[];cleared:number[];sectorDone:boolean;ships:Ship[];rocks:Rock[];bullets:(Point&{vx:number;vy:number;team:number;t:number;dmg:number;pierce:number;hits:number[];weapon?:string;target?:number|null})[];loot:(Point&{v:number})[];fx:(Point&{vx:number;vy:number;t:number;max:number;pulse?:boolean;r?:number;effect?:string;seed?:number;a?:number;size?:number;weapon?:string;beam?:boolean;color?:string;x2?:number;y2?:number})[];nests:Nest[];objectives:Objective[];message:string;messageTime:number;won:boolean;dead:boolean;events:string[];seed:number;player:Ship;contractLog:string[];hazardClock:number}
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
export function update(s:Game,dt:number,input:{x?:number;y?:number;fire?:boolean;boost?:boolean;aim?:number|null;steering?:boolean;turn?:number;strafe?:number;thrust?:number;brake?:boolean}):void;
export function emp(s:Game):void; export function notify(s:Game,m:string):void;
export function tractorRange(s:Game):number;
export function interact(s:Game):string;
export function upgrade(s:Game,k:number|string):boolean;
export function upgradeStatus(s:Game,id:string):{cost:number;tech:number;ok:boolean;reason:string;level:number};
export function jump(s:Game,destination?:number):boolean;
export function routes(s:Game):(SectorInfo&{id:number})[];
export function clear(s:Game):boolean;

export interface Weapon {id:string;name:string;desc:string;cost:number;research:number;tier:number;power:number;energy:number;heat:number;rate:number;speed:number;life:number;damage:number;color:string;range?:number;beam?:boolean;splash?:number;mine?:boolean}
export interface Component {id:string;name:string;type:string;power:number;cost:number;research:number;desc:string}
export interface Mount {type:string;x:number;y:number}
export interface Hull {name:string;cost:number;research:number;sectors:number;hp:number;radius:number;speed:number;turn:number;power:number;mounts:Mount[]}
export const WEAPONS:Weapon[];export const COMPONENTS:Component[];export const HULLS:Hull[];
export function stats(s:Game):{power:number;budget:number;cooling:number;regen:number;magnet:number;speed:number;turn:number;hp:number;shield:number};
export function hullStatus(s:Game):{ok:boolean;reason:string;cost:number;research:number};
export function expandHull(s:Game):boolean;
export function fitStatus(s:Game,slot:number,id:string|null):{ok:boolean;reason:string;cost:number;research:number};
export function fit(s:Game,slot:number,id:string|null):boolean;
export function selectedTarget(s:Game):Ship|Nest|null;
export function selectTarget(s:Game,x?:number|null,y?:number|null):Ship|Nest|null;
export function campaignStatus(s:Game):{sectors:number;contracts:number;ciphers:number;ready:boolean;text:string};

export function chooseRole(s:Game,id:number):boolean;
export function toggleCloak(s:Game):boolean;
export function layMine(s:Game):boolean;
