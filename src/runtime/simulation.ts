import type {Project,Vec3} from '../core/project';
import {bounds,overlaps,moveAxis,type Bounds} from './collision';
import {defaultLogic,trigger,type LogicState} from './rules';
import {compileTerrain} from '../core/terrain';
import {defaults} from './physicsSettings';
export type Input={x:number;z:number;jump?:boolean};
export type GameState={position:Vec3;collected:ReadonlySet<string>;won:boolean;velocityY:number;grounded:boolean;jumpHeld:boolean;respawns:number;logic:LogicState;insideGoal:boolean;checkpointId:string|null;respawnPosition:Vec3};
export function begin(project:Project):GameState {
 const spawn=project.entities.find(e=>e.role==='player');
 if(!spawn)throw Error('Add a player spawn before playing.');
 const logic=trigger(project.logic??defaultLogic,{score:0,message:'',won:false},'start');
 return {position:[...spawn.position],collected:new Set(),won:logic.won,velocityY:0,grounded:false,jumpHeld:false,respawns:0,logic,insideGoal:false,checkpointId:null,respawnPosition:[...spawn.position]};
}
export function compileWorld(project:Project){
 const spawn=project.entities.find(e=>e.role==='player');if(!spawn)throw Error('Add a player spawn before playing.');
 const half=bounds(spawn).half.map(n=>Math.max(.05,n)) as Vec3;
 const solids=project.entities.filter(e=>e.role==='solid'&&e.kind!=='ground'&&e.kind!=='model'&&e.kind!=='mesh'&&e.kind!=='terrain').map(bounds);
 const terrains=project.entities.filter(e=>e.kind==='terrain').map(compileTerrain);
 const floors=project.entities.filter(e=>e.kind==='ground').map(bounds);
 // Preserve legacy worlds without an explicit ground; use an implicit horizontal plane.
 if(!floors.length&&!terrains.length)floors.push({center:[0,0,0],half:[Infinity,0,Infinity]});
 const pickups=project.entities.filter(e=>e.role==='collectible').map(e=>({id:e.id,bounds:bounds(e)}));
 const goals=project.entities.filter(e=>e.role==='goal').map(bounds);
 const hazards=project.entities.filter(e=>e.role==='hazard').map(bounds);
 const checkpoints=project.entities.filter(e=>e.role==='checkpoint').map(e=>({id:e.id,bounds:bounds(e)}));
 return {spawn:spawn.position,half,solids,floors,terrains,pickups,goals,hazards,checkpoints,settings:project.physics??defaults,logic:project.logic??defaultLogic};
}
type World=ReturnType<typeof compileWorld>;
function integrate(world:World,state:GameState,input:Input,dt:number,jump:boolean):GameState{
 const {half,solids,floors,terrains,settings}=world;const p:Vec3=[...state.position];
 const length=Math.max(1,Math.hypot(input.x,input.z));const speed=settings.moveSpeed*dt/length;
 p[0]=moveAxis(p,half,0,input.x*speed,solids).position;
 p[2]=moveAxis(p,half,2,input.z*speed,solids).position;
 // Follow the terrain surface only when already grounded on it, or crossing it from above.
 const surfaceAt=(x:number,z:number)=>{let h=-Infinity;for(const t of terrains){const v=t.height(x,z);if(v!==null)h=Math.max(h,v);}return h;};
 const oldSurface=surfaceAt(state.position[0],state.position[2]);let surface=surfaceAt(p[0],p[2]);
 const wasOnTerrain=state.grounded&&Math.abs(state.position[1]-half[1]-oldSurface)<.02;
 const follows=wasOnTerrain&&!jump&&Number.isFinite(surface)&&Math.abs(surface-oldSurface)<=.5;
 // Prevent walking into a high terrain side, or climbing through a solid ceiling.
 if(surface+half[1]>p[1]+1e-6){const rise=surface+half[1]-p[1];if(!follows||moveAxis(p,half,1,rise,solids).hit){p[0]=state.position[0];p[2]=state.position[2];surface=oldSurface;}else p[1]+=rise;}
 let vy=jump&&state.grounded?settings.jumpSpeed:state.velocityY;
 vy-=settings.gravity*dt;
 const vertical=moveAxis(p,half,1,vy*dt,solids);let nextY=vertical.position;let landed=vertical.hit&&vy<0;
 if(vy<=0)for(const floor of floors){const top=floor.center[1]+floor.half[1]+half[1];if(overlaps(p,half,floor,[0,2])&&p[1]>=top-1e-6&&nextY<=top){nextY=Math.max(nextY,top);landed=true;}}
 if(vy<=0&&Number.isFinite(surface)){const top=surface+half[1];const crossing=p[1]>=top-1e-6&&nextY<=top;const downhill=wasOnTerrain&&!jump&&Math.abs(surface-oldSurface)<=.5&&p[1]>=top-1e-6;
 if(crossing||downhill){const contact=moveAxis(p,half,1,top-p[1],solids);if(!contact.hit&&(!landed||top>=nextY)){nextY=top;landed=true;}}}
 p[1]=nextY;if(vertical.hit||landed)vy=0;
 if(p[1]<settings.fallLimit||world.hazards.some(b=>overlaps(p,half,b))){const logic=trigger(world.logic,{score:0,message:'',won:false},'respawn');return {...state,position:[...state.respawnPosition],velocityY:0,grounded:false,collected:new Set(),respawns:state.respawns+1,logic,won:logic.won,insideGoal:false};}
 const collected=new Set(state.collected);let logic=state.logic;let checkpointId=state.checkpointId;let respawnPosition=state.respawnPosition;
 const checkpoint=world.checkpoints.find(c=>overlaps(p,half,c.bounds));if(checkpoint&&checkpoint.id!==checkpointId){checkpointId=checkpoint.id;respawnPosition=[checkpoint.bounds.center[0],checkpoint.bounds.center[1]+checkpoint.bounds.half[1]+half[1]+.05,checkpoint.bounds.center[2]];logic=trigger(world.logic,logic,'checkpoint');}
 for(const item of world.pickups)if(!collected.has(item.id)&&overlaps(p,half,item.bounds)){collected.add(item.id);logic=trigger(world.logic,logic,'collect');}
 const insideGoal=world.goals.some(b=>overlaps(p,half,b));if(insideGoal&&!state.insideGoal)logic=trigger(world.logic,logic,'goal');
 const won=logic.won||(world.logic.autoWin&&insideGoal&&world.pickups.every(e=>collected.has(e.id)));
 return {...state,position:p,velocityY:vy,grounded:landed,collected,won,logic,insideGoal,checkpointId,respawnPosition};
}
export function advance(world:World,state:GameState,input:Input,dt:number):GameState{
 if(state.won)return state;
 const time=Math.min(.1,Math.max(0,Number.isFinite(dt)?dt:0));if(!time)return state;
 const count=Math.ceil(time*120);const sub=time/count;let s=state;
 const safe={x:Number.isFinite(input.x)?Math.max(-1,Math.min(1,input.x)):0,z:Number.isFinite(input.z)?Math.max(-1,Math.min(1,input.z)):0};
 const jump=!!input.jump&&!state.jumpHeld;
 for(let i=0;i<count&&!s.won;i++)s=integrate(world,s,safe,sub,jump&&i===0);
 return {...s,jumpHeld:!!input.jump};
}
export function step(project:Project,state:GameState,input:Input,dt:number):GameState{return advance(compileWorld(project),state,input,dt);}
