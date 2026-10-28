import type {Game} from './sim.js';
import type {JsonValue} from 'starhermit:engine';
interface Writer {setJson(key:string,value:JsonValue):void}
export function resetExpedition(storage:Writer,faction?:number):Game;
export function saveExpedition(storage:Writer,state:Game):void;
export function savedExpedition(storage:{getJson(key:string):unknown},faction?:number):unknown;
