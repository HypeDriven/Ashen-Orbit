import {createGame,checkpoint} from './sim.js';
// Replace the persisted checkpoint before handing the fresh world to the UI.
// Reloading immediately after reset must never resurrect the previous campaign.
export function resetExpedition(storage){
 const fresh=createGame();
 storage.setJson('campaign',checkpoint(fresh));
 return fresh;
}
