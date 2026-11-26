import type {Entity,Vec3} from '../core/project';
import {bounds,type Bounds} from './collision';
export type Patrol={offset:Vec3;period:number};
export const defaultPatrol:Patrol={offset:[3,0,0],period:4};
export function readPatrol(raw:unknown):Patrol{
 const p=raw as Patrol;if(!p||!Array.isArray(p.offset)||p.offset.length!==3||!p.offset.every(n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=100)||typeof p.period!=='number'||!Number.isFinite(p.period)||p.period<.5||p.period>120)throw Error('Invalid patrol settings');
 return {offset:[...p.offset],period:p.period};
}
export function patrolPosition(origin:Vec3,patrol:Patrol,time:number):Vec3{
 const phase=((time%patrol.period)+patrol.period)%patrol.period/patrol.period;
 const f=phase<.5?phase*2:2-phase*2;
 return origin.map((n,i)=>n+patrol.offset[i]*f) as Vec3;
}
export type MovingTrigger={id:string;bounds:Bounds;patrol?:Patrol};
export function triggerSpec(e:Entity):MovingTrigger{return {id:e.id,bounds:bounds(e),patrol:e.patrol};}
export function triggerBounds(spec:MovingTrigger,time:number):Bounds{return spec.patrol?{...spec.bounds,center:patrolPosition(spec.bounds.center,spec.patrol,time)}:spec.bounds;}
