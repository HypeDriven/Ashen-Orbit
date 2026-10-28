// Keyboard/gamepad actions always use ship-relative flight. A mouse move is not
// required to activate steering. Existing directional action names keep saved bindings valid.
export function flightControls(values,source='keyboard'){
 const read=id=>Math.max(0,Math.min(1,values[id]||0));
 if(source==='touch')return {steering:false,turn:0,thrust:0,brake:false,x:read('right')-read('left'),y:read('down')-read('up')};
 return {steering:true,turn:read('right')-read('left'),thrust:read('up')-read('down'),brake:false,x:0,y:0};
}

export const FLIGHT_KEYS={up:['KeyW','ArrowUp'],down:['KeyS','ArrowDown'],left:['KeyA','ArrowLeft'],right:['KeyD','ArrowRight'],boost:['ShiftLeft','ShiftRight']};
