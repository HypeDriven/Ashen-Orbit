// Keyboard/gamepad actions always use ship-relative flight. A mouse move is not
// required to activate steering. Existing directional action names keep saved bindings valid.
export function flightControls(values,source='keyboard'){
 const read=id=>Math.max(0,Math.min(1,values[id]||0));
 if(source==='touch')return {steering:false,turn:0,strafe:0,thrust:0,brake:false,x:read('right')-read('left'),y:read('down')-read('up')};
 return {steering:true,turn:source==='gamepad'?read('right')-read('left'):0,strafe:source==='gamepad'?0:read('right')-read('left'),thrust:read('up')-read('down'),brake:false,x:0,y:0};
}

export const FLIGHT_KEYS={up:['KeyW','ArrowUp'],down:['KeyS','ArrowDown'],left:['KeyA','ArrowLeft'],right:['KeyD','ArrowRight'],boost:['ShiftLeft','ShiftRight']};

// Cursor coordinates and the projected ship share the same logical viewport.
// Camera lag and zoom must not offset the rotation target.
export function cursorHeading(cursorX,cursorY,shipX,shipY,cameraX,cameraY,zoom,width,height){const dx=cursorX-((shipX-cameraX)*zoom+width/2),dy=cursorY-((shipY-cameraY)*zoom+height/2);return Math.hypot(dx,dy)<4?null:Math.atan2(dy,dx);}
