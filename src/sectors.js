export const SECTOR_INFO = [
  {name:'THE PALE BELT',risk:'LOW',reward:1,hazard:'none',toll:0,repair:35,types:[0,1,5],note:'Quiet salvage lanes. Affordable repairs.',bonus:'Balanced rewards / safe station'},
  {name:'CINDER REACH',risk:'HIGH',reward:1.65,hazard:'heat',toll:35,repair:65,types:[0,1,3],note:'Hot debris drains hull outside the ring.',bonus:'+65% salvage / thermal hull damage'},
  {name:'THE HOLLOW',risk:'HIGH',reward:1.45,hazard:'ion',toll:0,repair:55,types:[3,4,5],note:'Ion storms suppress shield regeneration.',bonus:'+45% salvage / unreliable shields'},
  {name:'DRIFTER HAVEN',risk:'LOW',reward:.85,hazard:'none',toll:55,repair:20,types:[0,5],note:'A protected refuge with cheap repairs.',bonus:'-15% salvage / low danger / cheap services'},
  {name:'IRON GRAVEYARD',risk:'MEDIUM',reward:1.8,hazard:'dense',toll:25,repair:55,types:[1,3,4],note:'Rich ore, dense rocks, armored patrols.',bonus:'+80% salvage / 90 asteroids / heavy enemies'},
  {name:'REBEL FRONTIER',risk:'EXTREME',reward:1.5,hazard:'reinforcements',toll:0,repair:70,types:[4,5,3],note:'Carrier swarms. Every rebel outpost yields extra intel.',bonus:'+50% salvage / double outpost intel'},
  {name:'REBEL CITADEL',risk:'FINAL',reward:1.8,hazard:'ion',toll:80,repair:60,types:[0,1,3,4,5],note:'Destroy the rebel flagship and dismantle its command network.',bonus:'Final battle / requires the completed command campaign'},
  {name:'PRISM NEBULA',risk:'HIGH',reward:1.7,hazard:'ion',toll:60,repair:70,types:[1,3,5],note:'Shielded guardians patrol the relay.',bonus:'Disruptors counter shields / +70% salvage'},
  {name:'THE SILENT ARCHIVE',risk:'EXTREME',reward:1.9,hazard:'dense',toll:80,repair:80,types:[1,3,4],note:'Recover an ancient navigation cipher at the relay.',bonus:'Navigation cipher / armored long-range patrols'},
  {name:'EMBER FORGE',risk:'EXTREME',reward:2,hazard:'heat',toll:90,repair:95,types:[1,4,5],note:'Hot salvage fields favor radiators over raw firepower.',bonus:'+100% salvage / heat and carrier swarms'},
  {name:'OUTER WATCH',risk:'EXTREME',reward:2.1,hazard:'reinforcements',toll:100,repair:100,types:[1,3,4],note:'The last armada stands between you and Rebel Citadel.',bonus:'+110% salvage / elite defenders'}
];
export const SECTORS=SECTOR_INFO.map(s=>s.name);
