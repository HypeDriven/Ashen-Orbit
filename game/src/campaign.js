import {createGame,checkpoint} from './sim.js';
// Each allegiance has its own solo expedition. The original active checkpoint
// remains readable so existing campaigns migrate without losing their progress.
export function savedExpedition(storage,faction=0){const active=storage.getJson('campaign');if(active&&(active.faction===1?1:0)===faction)return active;return storage.getJson('campaign_'+faction);}
export function saveExpedition(storage,state){const snapshot=checkpoint(state);storage.setJson('campaign',snapshot);storage.setJson('campaign_'+(state.faction===1?1:0),snapshot);}
export function resetExpedition(storage,faction=0){const fresh=createGame();fresh.faction=faction===1?1:0;fresh.player.faction=fresh.faction;saveExpedition(storage,fresh);return fresh;}
