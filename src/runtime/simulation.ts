import type {Project,Vec3} from '../core/project';
import {bounds,overlaps,moveAxis,indexBounds,combineBounds,type Bounds} from './collision';
import {defaultLogic,trigger,matchesCounter,type LogicState,type CounterCondition} from './rules';
import {compileTerrain} from '../core/terrain';
import {compileBodies,initialBodies,advanceBodies,bodyBounds,type BodyStates} from './bodies';
import {triggerSpec,triggerBounds} from './patrol';
import {defaults} from './physicsSettings';
export type Input={x:number;z:number;jump?:boolean};
export type GameState={position:Vec3;collected:ReadonlySet<string>;won:boolean;velocityY:number;grounded:boolean;jumpHeld:boolean;coyoteRemaining:number;bufferRemaining:number;jumps:number;respawns:number;logic:LogicState;insideGoal:boolean;insideGoalIds:ReadonlySet<string>;insideZoneIds:ReadonlySet<string>;openGates:ReadonlySet<string>;checkpointId:string|null;respawnPosition:Vec3;bodies:BodyStates;elapsed:number};
export function begin(project:Project):GameState {
 const spawn=project.entities.find(e=>e.role==='player');
 if(!spawn)throw Error('Add a player spawn before playing.');
 const logic=trigger(project.logic??defaultLogic,{score:0,message:'',won:false},'start');
 return {position:[...spawn.position],collected:new Set(),won:logic.won,velocityY:0,grounded:false,jumpHeld:false,coyoteRemaining:0,bufferRemaining:0,jumps:0,respawns:0,logic,insideGoal:false,insideGoalIds:new Set(),insideZoneIds:new Set(),openGates:new Set(project.entities.filter(e=>e.role==='solid'&&e.gate&&matchesCounter(logic,e.gate)).map(e=>e.id)),checkpointId:null,respawnPosition:[...spawn.position],bodies:initialBodies(compileBodies(project)),elapsed:0};
}
export function compileWorld(project:Project){
 const spawn=project.entities.find(e=>e.role==='player');if(!spawn)throw Error('Add a player spawn before playing.');
 const half=bounds(spawn).half.map(n=>Math.max(.05,n)) as Vec3;
 const solids=project.entities.filter(e=>e.role==='solid'&&!e.gate&&e.kind!=='ground'&&e.kind!=='model'&&e.kind!=='terrain').map(bounds);
 const gates=project.entities.filter(e=>e.role==='solid'&&e.gate).map(e=>({id:e.id,bounds:bounds(e),condition:e.gate!}));
 const terrains=project.entities.filter(e=>e.kind==='terrain').map(compileTerrain);
 const floors=project.entities.filter(e=>e.kind==='ground').map(bounds);
 // Preserve legacy worlds without an explicit ground; use an implicit horizontal plane.
 if(!floors.length&&!terrains.length)floors.push({center:[0,0,0],half:[Infinity,0,Infinity]});
 const pickups=project.entities.filter(e=>e.role==='collectible').map(triggerSpec);
 const goals=project.entities.filter(e=>e.role==='goal').map(e=>({id:e.id,bounds:bounds(e)}));
 const bodies=compileBodies(project);
 const hazards=project.entities.filter(e=>e.role==='hazard').map(triggerSpec);
 const zones=project.entities.filter(e=>e.role==='trigger').map(e=>({id:e.id,bounds:bounds(e)}));
 const checkpoints=project.entities.filter(e=>e.role==='checkpoint').map(e=>({id:e.id,bounds:bounds(e)}));
 return {spawn:spawn.position,half,solids,solidIndex:indexBounds(solids),gates,floors,terrains,pickups,goals,bodies,hazards,checkpoints,zones,settings:project.physics??defaults,logic:project.logic??defaultLogic};
}
type World=ReturnType<typeof compileWorld>;
function updateGates(world:World,logic:LogicState,previous:ReadonlySet<string>,player:Bounds,bodies:BodyStates):ReadonlySet<string>{
 const open=new Set<string>();for(const gate of world.gates){if(matchesCounter(logic,gate.condition)||(previous.has(gate.id)&&(overlaps(player.center,player.half,gate.bounds)||world.bodies.some(spec=>{const body=bodyBounds(spec,bodies.get(spec.id)!);return overlaps(body.center,body.half,gate.bounds);}))))open.add(gate.id);}return open;
}
function integrate(world:World,state:GameState,input:Input,dt:number,jump:boolean):GameState{
 const elapsed=state.elapsed+dt;const {half,floors,terrains,settings}=world;const p:Vec3=[...state.position];
 const queued=jump?(settings.jumpBuffer??0):state.bufferRemaining;
 const jumped=(jump||queued>0)&&(state.grounded||state.coyoteRemaining>0);
 const length=Math.max(1,Math.hypot(input.x,input.z));const speed=settings.moveSpeed*dt/length;
 const staticSolids=combineBounds(world.solidIndex,world.gates.filter(g=>!state.openGates.has(g.id)).map(g=>g.bounds));
 const bodies=world.bodies.length?advanceBodies(world.bodies,state.bodies,staticSolids,floors,terrains,settings.gravity,settings.fallLimit,dt,{center:p,half},[input.x*speed/dt,0,input.z*speed/dt]):state.bodies;
 const solids=world.bodies.length?combineBounds(staticSolids,world.bodies.map(spec=>bodyBounds(spec,bodies.get(spec.id)!))):staticSolids;
 p[0]=moveAxis(p,half,0,input.x*speed,solids).position;
 p[2]=moveAxis(p,half,2,input.z*speed,solids).position;
 // Follow the terrain surface only when already grounded on it, or crossing it from above.
 const surfaceAt=(x:number,z:number)=>{let h=-Infinity;for(const t of terrains){const v=t.height(x,z);if(v!==null)h=Math.max(h,v);}return h;};
 const oldSurface=surfaceAt(state.position[0],state.position[2]);let surface=surfaceAt(p[0],p[2]);
 const wasOnTerrain=state.grounded&&Math.abs(state.position[1]-half[1]-oldSurface)<.02;
 const follows=wasOnTerrain&&!jumped&&Number.isFinite(surface)&&Math.abs(surface-oldSurface)<=.5;
 // Prevent walking into a high terrain side, or climbing through a solid ceiling.
 if(surface+half[1]>p[1]+1e-6){const rise=surface+half[1]-p[1];if(!follows||moveAxis(p,half,1,rise,solids).hit){p[0]=state.position[0];p[2]=state.position[2];surface=oldSurface;}else p[1]+=rise;}
 let vy=jumped?settings.jumpSpeed:state.velocityY;
 vy-=settings.gravity*dt;
 const vertical=moveAxis(p,half,1,vy*dt,solids);let nextY=vertical.position;let landed=vertical.hit&&vy<0;
 if(vy<=0)for(const floor of floors){const top=floor.center[1]+floor.half[1]+half[1];if(overlaps(p,half,floor,[0,2])&&p[1]>=top-1e-6&&nextY<=top){nextY=Math.max(nextY,top);landed=true;}}
 if(vy<=0&&Number.isFinite(surface)){const top=surface+half[1];const crossing=p[1]>=top-1e-6&&nextY<=top;const downhill=wasOnTerrain&&!jumped&&Math.abs(surface-oldSurface)<=.5&&p[1]>=top-1e-6;
 if(crossing||downhill){const contact=moveAxis(p,half,1,top-p[1],solids);if(!contact.hit&&(!landed||top>=nextY)){nextY=top;landed=true;}}}
 p[1]=nextY;if(vertical.hit||landed)vy=0;
 if(p[1]<settings.fallLimit||world.hazards.some(b=>overlaps(p,half,triggerBounds(b,elapsed)))){
 const deaths=state.respawns+1;
 if(world.logic.maxLives!==undefined&&deaths>=world.logic.maxLives){return {...state,position:p,velocityY:0,grounded:false,coyoteRemaining:0,bufferRemaining:0,respawns:deaths,bodies,elapsed,logic:{...state.logic,lost:true,message:'No lives remaining'},won:false};}
 const logic=trigger(world.logic,{score:0,message:'',won:false},'respawn');return {...state,position:[...state.respawnPosition],velocityY:0,grounded:false,coyoteRemaining:0,bufferRemaining:0,collected:new Set(),respawns:state.respawns+1,bodies,elapsed,logic,won:logic.won,insideGoal:false,insideGoalIds:new Set(),insideZoneIds:new Set(),openGates:updateGates(world,logic,state.openGates,{center:state.respawnPosition,half},bodies)};}
 const collected=new Set(state.collected);let logic=state.logic;if(jumped)logic=trigger(world.logic,logic,'jump');if(Math.floor(elapsed+1e-9)>Math.floor(state.elapsed+1e-9))logic=trigger(world.logic,logic,'second',undefined,Math.floor(elapsed+1e-9));let checkpointId=state.checkpointId;let respawnPosition=state.respawnPosition;
 const checkpoint=world.checkpoints.find(c=>overlaps(p,half,c.bounds));if(checkpoint&&checkpoint.id!==checkpointId){checkpointId=checkpoint.id;respawnPosition=[checkpoint.bounds.center[0],checkpoint.bounds.center[1]+checkpoint.bounds.half[1]+half[1]+.05,checkpoint.bounds.center[2]];logic=trigger(world.logic,logic,'checkpoint',checkpoint.id);}
 for(const item of world.pickups)if(!collected.has(item.id)&&overlaps(p,half,triggerBounds(item,elapsed))){collected.add(item.id);logic=trigger(world.logic,logic,'collect',item.id);}
 const insideGoalIds=new Set(world.goals.filter(g=>overlaps(p,half,g.bounds)).map(g=>g.id));const insideGoal=insideGoalIds.size>0;
 for(const id of insideGoalIds)if(!state.insideGoalIds.has(id))logic=trigger(world.logic,logic,'goal',id);
 const insideZoneIds=new Set(world.zones.filter(zone=>overlaps(p,half,zone.bounds)).map(zone=>zone.id));
 // Stable authored order: exits before enters. Respawn clears overlap state without emitting exits.
 for(const zone of world.zones)if(state.insideZoneIds.has(zone.id)&&!insideZoneIds.has(zone.id))logic=trigger(world.logic,logic,'zone-exit',zone.id);
 for(const zone of world.zones)if(insideZoneIds.has(zone.id)&&!state.insideZoneIds.has(zone.id))logic=trigger(world.logic,logic,'zone-enter',zone.id);
 const won=!logic.lost&&(logic.won||(world.logic.autoWin&&insideGoal&&world.pickups.every(e=>collected.has(e.id))));
 return {...state,position:p,velocityY:vy,grounded:landed,coyoteRemaining:jumped?0:landed?(settings.coyoteTime??0):Math.max(0,state.coyoteRemaining-dt),bufferRemaining:jumped?0:Math.max(0,queued-dt),jumps:state.jumps+Number(jumped),collected,won,logic,insideGoal,insideGoalIds,insideZoneIds,openGates:updateGates(world,logic,state.openGates,{center:p,half},bodies),checkpointId,respawnPosition,bodies,elapsed};
}
export function advance(world:World,state:GameState,input:Input,dt:number):GameState{
 if(state.won||state.logic.lost)return state;
 const time=Math.min(.1,Math.max(0,Number.isFinite(dt)?dt:0));if(!time)return state;
 const count=Math.ceil(time*120);const sub=time/count;let s=state;
 const safe={x:Number.isFinite(input.x)?Math.max(-1,Math.min(1,input.x)):0,z:Number.isFinite(input.z)?Math.max(-1,Math.min(1,input.z)):0};
 const jump=!!input.jump&&!state.jumpHeld;
 for(let i=0;i<count&&!s.won&&!s.logic.lost;i++)s=integrate(world,s,safe,sub,jump&&i===0);
 return {...s,jumpHeld:!!input.jump};
}
export function step(project:Project,state:GameState,input:Input,dt:number):GameState{return advance(compileWorld(project),state,input,dt);}
