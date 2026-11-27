import type {Project,Vec3} from '../core/project';
import {bounds,moveAxis,overlaps,combineBounds,type Bounds,type BoundsSource} from './collision';
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
/** Resolve initially overlapping dynamic AABBs using inverse-mass position corrections.
 * Correct only where both proposed positions are clear of static geometry and floor surfaces. */
function separateBodies(specs:readonly BodySpec[],states:Map<string,BodyState>,solids:BoundsSource,floors:readonly Bounds[],terrains:readonly Surface[],player:Bounds){
 function clear(position:Vec3,half:Vec3){
  if(overlaps(position,half,player))return false;
  const obstacles='query' in solids?solids.query(position,half,0,0):solids;
  if(obstacles.some(b=>overlaps(position,half,b)))return false;
  if(floors.some(f=>overlaps(position,half,f,[0,2])&&position[1]-half[1]<f.center[1]+f.half[1]-1e-6))return false;
  for(const t of terrains){const h=t.height(position[0],position[2]);if(h!==null&&position[1]-half[1]<h-1e-6)return false;}
  return true;
 }
 for(let pass=0;pass<4;pass++){
  let changed=false;
  for(let i=0;i<specs.length;i++)for(let j=i+1;j<specs.length;j++){
   const sa=specs[i],sb=specs[j],a=states.get(sa.id)!,b=states.get(sb.id)!;
   if(!overlaps(a.position,sa.bounds.half,bodyBounds(sb,b)))continue;
   const depths=sa.bounds.half.map((h,k)=>h+sb.bounds.half[k]-Math.abs(a.position[k]-b.position[k]));
   const axes=([0,1,2] as const).slice().sort((x,y)=>depths[x]-depths[y]);
   const ia=1/sa.settings.mass,ib=1/sb.settings.mass,sum=ia+ib;
   for(const axis of axes){
    const direction=a.position[axis]<=b.position[axis]?1:-1,depth=depths[axis]+1e-6;
    const pa=[...a.position] as Vec3,pb=[...b.position] as Vec3;
    pa[axis]-=direction*depth*ia/sum;pb[axis]+=direction*depth*ib/sum;
    if(clear(pa,sa.bounds.half)&&clear(pb,sb.bounds.half)){a.position=pa;b.position=pb;changed=true;break;}
    // If one side is pinned against a static surface, try moving only the free body.
    pa[axis]=a.position[axis]-direction*depth;pb[axis]=b.position[axis]+direction*depth;
    if(clear(pa,sa.bounds.half)){a.position=pa;changed=true;break;}
    if(clear(pb,sb.bounds.half)){b.position=pb;changed=true;break;}
   }
  }
  if(!changed)break;
 }
}

export function advanceBodies(specs:readonly BodySpec[],previous:BodyStates,solids:BoundsSource,floors:readonly Bounds[],terrains:readonly Surface[],gravity:number,fallLimit:number,dt:number,player:Bounds,push:Vec3):BodyStates{
 const next=new Map<string,BodyState>();for(const spec of specs){const b=previous.get(spec.id)!;next.set(spec.id,{position:[...b.position],velocity:[...b.velocity]});}
 separateBodies(specs,next,solids,floors,terrains,player);
 for(const spec of specs){
 const b=next.get(spec.id)!,half=spec.bounds.half,settings=spec.settings;
 const other=specs.filter(s=>s.id!==spec.id);
 const obstacles=combineBounds(solids,[player]);
 // Contact-driven horizontal force; player remains a kinematic controller.
 if(overlaps(b.position,half,{center:[player.center[0]+push[0]*dt,player.center[1],player.center[2]+push[2]*dt],half:player.half})){
 for(const axis of [0,2] as const){if(push[axis]*(b.position[axis]-player.center[axis])>0)b.velocity[axis]=Math.max(-20,Math.min(20,b.velocity[axis]+push[axis]*dt*12/settings.mass));}
 }
 b.velocity[1]=Math.max(-40,b.velocity[1]-gravity*dt);
 let grounded=false;
 for(const axis of [0,2,1] as const){
 const delta=b.velocity[axis]*dt;const moved=moveAxis(b.position,half,axis,delta,obstacles);
 let target=moved.position,hit=moved.hit,contact:BodySpec|undefined;
 // Pick the nearest swept contact; a static collider wins exact ties.
 for(const candidate of other){const sweep=moveAxis(b.position,half,axis,delta,[bodyBounds(candidate,next.get(candidate.id)!)]);if(sweep.hit&&(delta>0?sweep.position<target:sweep.position>target)){target=sweep.position;hit=true;contact=candidate;}}
 if(axis===1&&delta<0){
 let surface=-Infinity;
 for(const floor of floors)if(overlaps(b.position,half,floor,[0,2])&&floor.center[1]+floor.half[1]+half[1]<=b.position[1]+.0001)surface=Math.max(surface,floor.center[1]+floor.half[1]);
 for(const t of terrains){const h=t.height(b.position[0],b.position[2]);if(h!==null&&h+half[1]<=b.position[1]+.0001)surface=Math.max(surface,h);}
 const top=surface+half[1];if(Number.isFinite(top)&&target<top&&b.position[1]>=top-.0001){target=top;hit=true;contact=undefined;}
 grounded=hit;
 }
 if(axis!==1){const candidate=[...b.position] as Vec3;candidate[axis]=target;for(const t of terrains){const h=t.height(candidate[0],candidate[2]);if(h!==null&&candidate[1]-half[1]<h-.001){target=b.position[axis];hit=true;contact=undefined;break;}}}
 b.position[axis]=target;
 if(hit){
 if(contact){
  // Equal and opposite normal impulses conserve linear momentum. Only approaching pairs collide.
  const peer=next.get(contact.id)!,direction=Math.sign(delta),closing=(b.velocity[axis]-peer.velocity[axis])*direction;
  if(closing>0){
   const invA=1/settings.mass,invB=1/contact.settings.mass,denom=invA+invB,restitution=closing<.15?0:Math.min(settings.restitution,contact.settings.restitution);
   const impulse=(1+restitution)*closing/denom;b.velocity[axis]-=direction*impulse*invA;peer.velocity[axis]+=direction*impulse*invB;
   // Coulomb-bounded tangential impulse. Existing ground damping remains separate.
   const tangents=([0,1,2] as const).filter(k=>k!==axis),relative=tangents.map(k=>b.velocity[k]-peer.velocity[k]),speed=Math.hypot(...relative);
   const friction=Math.min(settings.friction,contact.settings.friction)/20,limit=Math.min(speed/denom,friction*impulse);
   if(speed>1e-9&&limit>0)for(let i=0;i<tangents.length;i++){const k=tangents[i],j=limit*relative[i]/speed;b.velocity[k]-=j*invA;peer.velocity[k]+=j*invB;}
  }
 }else{b.velocity[axis]=-b.velocity[axis]*settings.restitution;if(Math.abs(b.velocity[axis])<.15)b.velocity[axis]=0;}
 }
 }
 if(grounded){const factor=Math.max(0,1-settings.friction*dt);b.velocity[0]*=factor;b.velocity[2]*=factor;}
 if(b.position[1]<fallLimit){b.position=[...spec.bounds.center];b.velocity=[...settings.velocity];}
 }
 return next;
}
