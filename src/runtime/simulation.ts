import type {Project,Vec3} from '../core/project';
import {bounds,overlaps,moveAxis,type Bounds} from './collision';
import {defaultLogic,trigger,type LogicState} from './rules';
import {defaults} from './physicsSettings';
export type Input={x:number;z:number;jump?:boolean};
export type GameState={position:Vec3;collected:ReadonlySet<string>;won:boolean;velocityY:number;grounded:boolean;jumpHeld:boolean;respawns:number;logic:LogicState;insideGoal:boolean};
export function begin(project:Project):GameState {
 const spawn=project.entities.find(e=>e.role==='player');
 if(!spawn)throw Error('Add a player spawn before playing.');
 const logic=trigger(project.logic??defaultLogic,{score:0,message:'',won:false},'start');
 return {position:[...spawn.position],collected:new Set(),won:logic.won,velocityY:0,grounded:false,jumpHeld:false,respawns:0,logic,insideGoal:false};
}
export function compileWorld(project:Project){
 const spawn=project.entities.find(e=>e.role==='player');if(!spawn)throw Error('Add a player spawn before playing.');
 const half=bounds(spawn).half.map(n=>Math.max(.05,n)) as Vec3;
 const solids=project.entities.filter(e=>e.role==='solid'&&e.kind!=='ground'&&e.kind!=='model').map(bounds);
 const floors=project.entities.filter(e=>e.kind==='ground').map(bounds);
 // Preserve legacy worlds without an explicit ground; use an implicit horizontal plane.
 if(!floors.length)floors.push({center:[0,0,0],half:[Infinity,0,Infinity]});
 const pickups=project.entities.filter(e=>e.role==='collectible').map(e=>({id:e.id,bounds:bounds(e)}));
 const goals=project.entities.filter(e=>e.role==='goal').map(bounds);
 return {spawn:spawn.position,half,solids,floors,pickups,goals,settings:project.physics??defaults,logic:project.logic??defaultLogic};
}
type World=ReturnType<typeof compileWorld>;
function integrate(world:World,state:GameState,input:Input,dt:number,jump:boolean):GameState{
 const {half,solids,floors,settings}=world;const p:Vec3=[...state.position];
 const length=Math.max(1,Math.hypot(input.x,input.z));const speed=settings.moveSpeed*dt/length;
 p[0]=moveAxis(p,half,0,input.x*speed,solids).position;
 p[2]=moveAxis(p,half,2,input.z*speed,solids).position;
 let vy=jump&&state.grounded?settings.jumpSpeed:state.velocityY;
 vy-=settings.gravity*dt;
 const vertical=moveAxis(p,half,1,vy*dt,solids);let nextY=vertical.position;let landed=vertical.hit&&vy<0;
 if(vy<=0)for(const floor of floors){const top=floor.center[1]+floor.half[1]+half[1];if(overlaps(p,half,floor,[0,2])&&p[1]>=top-1e-6&&nextY<=top){nextY=Math.max(nextY,top);landed=true;}}
 p[1]=nextY;if(vertical.hit||landed)vy=0;
 if(p[1]<settings.fallLimit){const logic=trigger(world.logic,{score:0,message:'',won:false},'respawn');return {...state,position:[...world.spawn],velocityY:0,grounded:false,collected:new Set(),respawns:state.respawns+1,logic,won:logic.won,insideGoal:false};}
 const collected=new Set(state.collected);let logic=state.logic;
 for(const item of world.pickups)if(!collected.has(item.id)&&overlaps(p,half,item.bounds)){collected.add(item.id);logic=trigger(world.logic,logic,'collect');}
 const insideGoal=world.goals.some(b=>overlaps(p,half,b));if(insideGoal&&!state.insideGoal)logic=trigger(world.logic,logic,'goal');
 const won=logic.won||(world.logic.autoWin&&insideGoal&&world.pickups.every(e=>collected.has(e.id)));
 return {...state,position:p,velocityY:vy,grounded:landed,collected,won,logic,insideGoal};
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
