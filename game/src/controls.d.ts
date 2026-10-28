export function flightControls(values:Record<string,number>,source?:string):{steering:boolean;turn:number;strafe:number;thrust:number;brake:boolean;x:number;y:number};

export const FLIGHT_KEYS:Record<string,string[]>;

export function cursorHeading(cursorX:number,cursorY:number,shipX:number,shipY:number,cameraX:number,cameraY:number,zoom:number,width:number,height:number):number|null;
