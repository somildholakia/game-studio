import type {Entity,Project,Vec3} from '../core/project';
import {bounds,moveAxis,overlaps,type Bounds} from './collision';
export type BodySettings={mass:number;restitution:number;friction:number;velocity:Vec3};
export const defaultBody:BodySettings={mass:1,restitution:.2,friction:4,velocity:[0,0,0]};
export const MAX_BODIES=64;
export function readBody(raw:unknown):BodySettings{
 if(raw===undefined)return structuredClone(defaultBody);
 const b=raw as BodySettings;if(!b||!Array.isArray(b.velocity)||b.velocity.length!==3||!b.velocity.every(n=>Number.isFinite(n)&&Math.abs(n)<=20))throw Error('Invalid body velocity');
 for(const [v,min,max] of [[b.mass,.1,100],[b.restitution,0,.9],[b.friction,0,20]])if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error('Invalid body settings');
 return {mass:b.mass,restitution:b.restitution,friction:b.friction,velocity:[...b.velocity]};
}
export type BodySpec={id:string;bounds:Bounds;settings:BodySettings};
export type BodyState={position:Vec3;velocity:Vec3};
export type BodyStates=ReadonlyMap<string,BodyState>;
export function compileBodies(p:Project):BodySpec[]{
 const objects=p.entities.filter(e=>e.role==='dynamic');
 if(objects.length>MAX_BODIES)throw Error('Maximum 64 dynamic bodies per level');
 return objects.map(e=>({id:e.id,bounds:bounds(e),settings:readBody(e.body)}));
}
export function initialBodies(specs:readonly BodySpec[]):BodyStates{return new Map(specs.map(b=>[b.id,{position:[...b.bounds.center],velocity:[...b.settings.velocity]}]));}
export function bodyBounds(spec:BodySpec,state:BodyState):Bounds{return {center:state.position,half:spec.bounds.half};}
type Surface={height(x:number,z:number):number|null};
export function advanceBodies(specs:readonly BodySpec[],previous:BodyStates,solids:readonly Bounds[],floors:readonly Bounds[],terrains:readonly Surface[],gravity:number,fallLimit:number,dt:number,player:Bounds,push:Vec3):BodyStates{
 const next=new Map<string,BodyState>();for(const spec of specs){const b=previous.get(spec.id)!;next.set(spec.id,{position:[...b.position],velocity:[...b.velocity]});}
 for(const spec of specs){
 const b=next.get(spec.id)!,half=spec.bounds.half,settings=spec.settings;
 const other=specs.filter(s=>s.id!==spec.id).map(s=>bodyBounds(s,next.get(s.id)!));
 const obstacles=[...solids,...other,player];
 // Contact-driven horizontal force; player remains a kinematic controller.
 if(overlaps(b.position,half,{center:[player.center[0]+push[0]*dt,player.center[1],player.center[2]+push[2]*dt],half:player.half})){
 for(const axis of [0,2] as const){if(push[axis]*(b.position[axis]-player.center[axis])>0)b.velocity[axis]=Math.max(-20,Math.min(20,b.velocity[axis]+push[axis]*dt*12/settings.mass));}
 }
 b.velocity[1]=Math.max(-40,b.velocity[1]-gravity*dt);
 let grounded=false;
 for(const axis of [0,2,1] as const){
 const delta=b.velocity[axis]*dt;const moved=moveAxis(b.position,half,axis,delta,obstacles);
 let target=moved.position,hit=moved.hit;
 if(axis===1&&delta<0){
 let surface=-Infinity;
 for(const floor of floors)if(overlaps(b.position,half,floor,[0,2]))surface=Math.max(surface,floor.center[1]+floor.half[1]);
 for(const t of terrains){const h=t.height(b.position[0],b.position[2]);if(h!==null)surface=Math.max(surface,h);}
 const top=surface+half[1];if(Number.isFinite(top)&&target<top&&b.position[1]>=top-.0001){target=top;hit=true;}
 grounded=hit;
 }
 b.position[axis]=target;
 if(hit){b.velocity[axis]=-b.velocity[axis]*settings.restitution;if(Math.abs(b.velocity[axis])<.15)b.velocity[axis]=0;}
 }
 if(grounded){const factor=Math.max(0,1-settings.friction*dt);b.velocity[0]*=factor;b.velocity[2]*=factor;}
 if(b.position[1]<fallLimit){b.position=[...spec.bounds.center];b.velocity=[...settings.velocity];}
 }
 return next;
}
