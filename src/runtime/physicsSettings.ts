export type PhysicsSettings={gravity:number;moveSpeed:number;jumpSpeed:number;fallLimit:number;coyoteTime?:number;jumpBuffer?:number};
export const defaults:PhysicsSettings={gravity:20,moveSpeed:4,jumpSpeed:7,fallLimit:-30};
export function readPhysics(raw:unknown):PhysicsSettings{
 if(raw===undefined)return {...defaults};
 if(!raw||typeof raw!=='object')throw Error('Invalid physics settings');
 const p=raw as Record<string,unknown>;
 function number(key:keyof PhysicsSettings,min:number,max:number){const n=p[key];if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max)throw Error('Invalid physics setting: '+key);return n;}
 return {gravity:number('gravity',1,100),moveSpeed:number('moveSpeed',.1,30),jumpSpeed:number('jumpSpeed',.1,30),fallLimit:number('fallLimit',-10000,-1),...(p.coyoteTime!==undefined?{coyoteTime:number('coyoteTime',0,.3)}:{}),...(p.jumpBuffer!==undefined?{jumpBuffer:number('jumpBuffer',0,.3)}:{})};
}
