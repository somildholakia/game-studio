import type {Project} from './project';
import {orderedScenes} from './scenes';
import {bounds,overlaps} from '../runtime/collision';
import {eventSourceRole} from '../runtime/rules';
import {MAX_BODIES} from '../runtime/bodies';
export type Diagnostic={severity:'error'|'warning';level:string;message:string;entityId?:string};
export function diagnose(p:Project):Diagnostic[]{
 const result:Diagnostic[]=[];
 const scenes=orderedScenes(p);
 for(const level of scenes){
 const add=(severity:Diagnostic['severity'],message:string,entityId?:string)=>result.push({severity,level:level.name,message,entityId});
 const player=level.entities.find(e=>e.role==='player');const bodies=level.entities.filter(e=>e.role==='dynamic');
 if(!player)add('error','Add a player spawn.');
 if(level.entities.filter(e=>e.role==='player').length>1)add('error','Only one player is allowed per level.');
 if(bodies.length>MAX_BODIES)add('error','Maximum 64 dynamic objects per level.');
 for(const [i,rule] of (level.logic?.rules??[]).entries()){if(rule.sourceId!==undefined&&!level.entities.some(e=>e.id===rule.sourceId&&e.role===eventSourceRole(rule.event)))add('warning','Rule '+(i+1)+' references a missing or incompatible event object.');}
 const win=(level.logic?.autoWin??true)&&level.entities.some(e=>e.role==='goal')||level.logic?.rules.some(r=>r.action.kind==='win');
 if(!win)add(scenes.length>1?'error':'warning','No configured goal or win rule.');
 if(!level.entities.some(e=>e.kind==='ground'||e.kind==='terrain'))add('warning','No floor mesh; runtime uses an invisible default floor.');
 const solids=level.entities.filter(e=>e.role==='solid').map(e=>({e,b:bounds(e)}));
 if(player){const b=bounds(player);for(const obstacle of solids){if(overlaps(b.center,b.half,obstacle.b))add('warning','Player spawn overlaps solid '+obstacle.e.name,player.id);}
 for(const e of level.entities.filter(e=>e.role==='hazard')){if(overlaps(b.center,b.half,bounds(e)))add('warning','Player spawn overlaps hazard '+e.name,player.id);}
 }
 for(const e of level.entities){if(e.scale.some(n=>Math.abs(n)<.00001))add('warning','Object has a zero or near-zero scale: '+e.name,e.id);}
 for(const e of bodies){const b=bounds(e);if(solids.some(o=>overlaps(b.center,b.half,o.b)))add('warning','Dynamic object starts inside a solid: '+e.name,e.id);}
 }
 return result;
}
