import type {Vec3} from '../core/project';
export type Quaternion=[number,number,number,number];
export type AngularState={orientation:Quaternion;angularVelocity:Vec3};
export type InertialBody={mass:number;position:Vec3;velocity:Vec3;angular?:AngularState;inverseInertia?:Vec3};
export const cross=(a:Vec3,b:Vec3):Vec3=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a:Vec3,b:Vec3)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const add=(a:Vec3,b:Vec3):Vec3=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const sub=(a:Vec3,b:Vec3):Vec3=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const scale=(a:Vec3,s:number):Vec3=>[a[0]*s,a[1]*s,a[2]*s];
export function multiplyQuaternion(a:Quaternion,b:Quaternion):Quaternion{
 const [x,y,z,w]=a,[u,v,t,s]=b;return [w*u+x*s+y*t-z*v,w*v-x*t+y*s+z*u,w*t+x*v-y*u+z*s,w*s-x*u-y*v-z*t];
}
function normalize(q:Quaternion):Quaternion{const n=Math.hypot(...q);return n>1e-12&&Number.isFinite(n)?q.map(v=>v/n) as Quaternion:[0,0,0,1];}
export function eulerQuaternion(rotation:Vec3):Quaternion{
 const [x,y,z]=rotation.map(v=>v/2);return normalize(multiplyQuaternion(multiplyQuaternion([0,Math.sin(y),0,Math.cos(y)],[Math.sin(x),0,0,Math.cos(x)]),[0,0,Math.sin(z),Math.cos(z)]));
}
export function rotate(q:Quaternion,v:Vec3):Vec3{
 const u:Vec3=[q[0],q[1],q[2]],t=scale(cross(u,v),2);return add(v,add(scale(t,q[3]),cross(u,t)));
}
export function rotatedHalf(q:Quaternion,half:Vec3):Vec3{
 const x=rotate(q,[half[0],0,0]),y=rotate(q,[0,half[1],0]),z=rotate(q,[0,0,half[2]]);return x.map((v,i)=>Math.abs(v)+Math.abs(y[i])+Math.abs(z[i])) as Vec3;
}
export function inverseInertia(mass:number,half:Vec3,sphere=false):Vec3{
 const [x,y,z]=half;const factor=sphere?1/5:1/3;
 return [y*y+z*z,x*x+z*z,x*x+y*y].map(v=>1/Math.max(1e-8,mass*factor*v)) as Vec3;
}
export function integrateAngular(s:AngularState,dt:number,damping:number):AngularState{
 const velocity=scale(s.angularVelocity,Math.exp(-Math.max(0,damping)*dt));
 const speed=Math.hypot(...velocity),angle=speed*dt/2;
 const q:Quaternion=speed>1e-9?[...scale(velocity,Math.sin(angle)/speed),Math.cos(angle)]:[0,0,0,1];
 return {orientation:normalize(multiplyQuaternion(q,s.orientation)),angularVelocity:velocity};
}
function worldInverse(body:InertialBody,v:Vec3):Vec3{
 if(!body.angular||!body.inverseInertia)return [0,0,0];
 const q=body.angular.orientation,local=rotate([-q[0],-q[1],-q[2],q[3]],v);
 return rotate(q,local.map((n,i)=>n*body.inverseInertia![i]) as Vec3);
}
function pointVelocity(b:InertialBody,r:Vec3):Vec3{return add(b.velocity,b.angular?cross(b.angular.angularVelocity,r):[0,0,0]);}
function effective(b:InertialBody,r:Vec3,n:Vec3){return 1/b.mass+dot(n,cross(worldInverse(b,cross(r,n)),r));}
function apply(b:InertialBody,r:Vec3,j:Vec3){
 const v=add(b.velocity,scale(j,1/b.mass));for(let i=0;i<3;i++)b.velocity[i]=v[i];
 if(b.angular)b.angular.angularVelocity=add(b.angular.angularVelocity,worldInverse(b,cross(r,j)));
}
/** Normal points from body B (or static surface) toward A. One contact point, world-space
 * angular velocity, inverse inertia, restitution and Coulomb-bounded friction. */
export function solveAngularContact(a:InertialBody,b:InertialBody|null,ra:Vec3,rb:Vec3,normal:Vec3,restitution:number,friction:number){
 const relative=()=>sub(pointVelocity(a,ra),b?pointVelocity(b,rb):[0,0,0]);
 const vn=dot(relative(),normal);if(vn>=0)return {normalImpulse:0,tangentImpulse:0};
 const denom=effective(a,ra,normal)+(b?effective(b,rb,normal):0);if(!Number.isFinite(denom)||denom<1e-9)return {normalImpulse:0,tangentImpulse:0};
 const j=-(1+(vn>-.15?0:restitution))*vn/denom;
 const normalJ=scale(normal,j);apply(a,ra,normalJ);if(b)apply(b,rb,scale(normalJ,-1));
 const v=relative(),t=sub(v,scale(normal,dot(v,normal))),speed=Math.hypot(...t);
 if(speed<1e-9||friction<=0)return {normalImpulse:j,tangentImpulse:0};
 const tangent=scale(t,1/speed),d=effective(a,ra,tangent)+(b?effective(b,rb,tangent):0);
 if(!Number.isFinite(d)||d<1e-9)return {normalImpulse:j,tangentImpulse:0};
 const jt=Math.min(speed/d,friction*j),tangentJ=scale(tangent,-jt);apply(a,ra,tangentJ);if(b)apply(b,rb,scale(tangentJ,-1));return {normalImpulse:j,tangentImpulse:jt};
}
