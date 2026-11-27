import type {Project,Vec3} from '../core/project';
import {bounds,moveAxis,overlaps,combineBounds,type Bounds,type BoundsSource} from './collision';
import {eulerQuaternion,integrateAngular,inverseInertia,rotatedHalf,solveAngularContact,type AngularState,type InertialBody} from './angularContacts';
export type AngularSettings={velocity:Vec3;damping:number};
export type BodySettings={mass:number;restitution:number;friction:number;velocity:Vec3;angular?:AngularSettings};
export const defaultBody:BodySettings={mass:1,restitution:.2,friction:4,velocity:[0,0,0]};
export const MAX_BODIES=64;
export function readBody(raw:unknown):BodySettings{
 if(raw===undefined)return structuredClone(defaultBody);
 const b=raw as BodySettings;if(!b||!Array.isArray(b.velocity)||b.velocity.length!==3||!b.velocity.every(n=>Number.isFinite(n)&&Math.abs(n)<=20))throw Error('Invalid body velocity');
 for(const [v,min,max] of [[b.mass,.1,100],[b.restitution,0,.9],[b.friction,0,20]])if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error('Invalid body settings');
 const a=b.angular;if(a!==undefined&&(!a||!Array.isArray(a.velocity)||a.velocity.length!==3||!a.velocity.every(n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=20)||typeof a.damping!=='number'||!Number.isFinite(a.damping)||a.damping<0||a.damping>10))throw Error('Invalid angular body settings');
 return {mass:b.mass,restitution:b.restitution,friction:b.friction,velocity:[...b.velocity],...(a?{angular:{velocity:[...a.velocity],damping:a.damping}}:{})};
}
export type BodySpec={id:string;bounds:Bounds;settings:BodySettings;angularShape?:{half:Vec3;sphere:boolean;initial:AngularState;inverseInertia:Vec3}};
export type BodyState={position:Vec3;velocity:Vec3;angular?:AngularState};
export type BodyStates=ReadonlyMap<string,BodyState>;
export function compileBodies(p:Project):BodySpec[]{
 const objects=p.entities.filter(e=>e.role==='dynamic');
 if(objects.length>MAX_BODIES)throw Error('Maximum 64 dynamic bodies per level');
 return objects.map(e=>{
  const settings=readBody(e.body),base={id:e.id,bounds:bounds(e),settings};
  if(!settings.angular)return base;
  const half=e.scale.map(v=>Math.max(.05,.75*Math.abs(v))) as Vec3;
  const sphere=e.kind==='sphere'&&Math.max(...half)-Math.min(...half)<1e-6;
  return {...base,angularShape:{half,sphere,initial:{orientation:eulerQuaternion(e.rotation),angularVelocity:[...settings.angular.velocity]},inverseInertia:inverseInertia(settings.mass,half,sphere)}};
 });
}
export function initialBodies(specs:readonly BodySpec[]):BodyStates{return new Map(specs.map(b=>[b.id,{position:[...b.bounds.center],velocity:[...b.settings.velocity],...(b.angularShape?{angular:structuredClone(b.angularShape.initial)}:{})}]));}
export function bodyBounds(spec:BodySpec,state:BodyState):Bounds{const shape=spec.angularShape;return {center:state.position,half:shape&&state.angular?(shape.sphere?shape.half:rotatedHalf(state.angular.orientation,shape.half)):spec.bounds.half};}
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
   const ah=bodyBounds(sa,a).half,bh=bodyBounds(sb,b).half;
   if(!overlaps(a.position,ah,bodyBounds(sb,b)))continue;
   const depths=ah.map((h,k)=>h+bh[k]-Math.abs(a.position[k]-b.position[k]));
   const axes=([0,1,2] as const).slice().sort((x,y)=>depths[x]-depths[y]);
   const ia=1/sa.settings.mass,ib=1/sb.settings.mass,sum=ia+ib;
   for(const axis of axes){
    const direction=a.position[axis]<=b.position[axis]?1:-1,depth=depths[axis]+1e-6;
    const pa=[...a.position] as Vec3,pb=[...b.position] as Vec3;
    pa[axis]-=direction*depth*ia/sum;pb[axis]+=direction*depth*ib/sum;
    if(clear(pa,ah)&&clear(pb,bh)){a.position=pa;b.position=pb;changed=true;break;}
    // If one side is pinned against a static surface, try moving only the free body.
    pa[axis]=a.position[axis]-direction*depth;pb[axis]=b.position[axis]+direction*depth;
    if(clear(pa,ah)){a.position=pa;changed=true;break;}
    if(clear(pb,bh)){b.position=pb;changed=true;break;}
   }
  }
  if(!changed)break;
 }
}

export function advanceBodies(specs:readonly BodySpec[],previous:BodyStates,solids:BoundsSource,floors:readonly Bounds[],terrains:readonly Surface[],gravity:number,fallLimit:number,dt:number,player:Bounds,push:Vec3):BodyStates{
 const next=new Map<string,BodyState>();for(const spec of specs){const b=previous.get(spec.id)!;next.set(spec.id,{position:[...b.position],velocity:[...b.velocity],...(b.angular?{angular:structuredClone(b.angular)}:{})});}
 separateBodies(specs,next,solids,floors,terrains,player);
 for(const spec of specs){
 const b=next.get(spec.id)!,half=bodyBounds(spec,b).half,settings=spec.settings;
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
 if(b.angular||(contact&&next.get(contact.id)?.angular)){
  const direction=Math.sign(delta),normal=[0,0,0] as Vec3,ra=[0,0,0] as Vec3,rb=[0,0,0] as Vec3;
  normal[axis]=-direction;ra[axis]=direction*half[axis];
  const inertial=(s:BodySpec,state:BodyState):InertialBody=>({mass:s.settings.mass,position:state.position,velocity:state.velocity,angular:state.angular,inverseInertia:s.angularShape?.inverseInertia});
  if(contact){
   const peer=next.get(contact.id)!,peerHalf=bodyBounds(contact,peer).half;
   rb[axis]=-direction*peerHalf[axis];
   for(const k of [0,1,2] as const)if(k!==axis){const middle=(Math.max(b.position[k]-half[k],peer.position[k]-peerHalf[k])+Math.min(b.position[k]+half[k],peer.position[k]+peerHalf[k]))/2;ra[k]=middle-b.position[k];rb[k]=middle-peer.position[k];}
   solveAngularContact(inertial(spec,b),inertial(contact,peer),ra,rb,normal,Math.min(settings.restitution,contact.settings.restitution),Math.min(settings.friction,contact.settings.friction)/20);
  }else solveAngularContact(inertial(spec,b),null,ra,rb,normal,settings.restitution,settings.friction/20);
 }else if(contact){
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
 if(grounded&&!b.angular){const factor=Math.max(0,1-settings.friction*dt);b.velocity[0]*=factor;b.velocity[2]*=factor;}
 if(b.angular&&spec.angularShape&&settings.angular){
  // Bound extreme impulses from tiny inertia and keep a finite normalized orientation.
  const speed=Math.hypot(...b.angular.angularVelocity);if(speed>80)b.angular.angularVelocity=b.angular.angularVelocity.map(v=>v*80/speed) as Vec3;
  const rotated=integrateAngular(b.angular,dt,settings.angular.damping),newHalf=spec.angularShape.sphere?spec.angularShape.half:rotatedHalf(rotated.orientation,spec.angularShape.half);
  const candidates='query' in solids?solids.query(b.position,newHalf,0,0):solids;
  const blocked=!spec.angularShape.sphere&&(candidates.some(o=>overlaps(b.position,newHalf,o))||overlaps(b.position,newHalf,player)||other.some(s=>overlaps(b.position,newHalf,bodyBounds(s,next.get(s.id)!)))||floors.some(f=>overlaps(b.position,newHalf,f,[0,2])&&b.position[1]-newHalf[1]<f.center[1]+f.half[1]-1e-6)||terrains.some(t=>{const h=t.height(b.position[0],b.position[2]);return h!==null&&b.position[1]-newHalf[1]<h-1e-6;}));
  if(blocked)b.angular.angularVelocity=[0,0,0];else b.angular=rotated;
 }
 if(b.position[1]<fallLimit){b.position=[...spec.bounds.center];b.velocity=[...settings.velocity];if(spec.angularShape)b.angular=structuredClone(spec.angularShape.initial);}
 }
 return next;
}
