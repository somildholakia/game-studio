import type {Entity,Vec3} from '../core/project';
export type Bounds={center:Vec3;half:Vec3};
export function bounds(e:Entity):Bounds{
 const h:Vec3=e.kind==='ground'?[6,0,6]:e.kind==='character'?[.55,.8,.2]:[.75,.75,.75];
 const [x,y,z]=h.map((n,i)=>n*Math.abs(e.scale[i]));
 const [rx,ry,rz]=e.rotation;
 const cx=Math.cos(rx),sx=Math.sin(rx),cy=Math.cos(ry),sy=Math.sin(ry),cz=Math.cos(rz),sz=Math.sin(rz);
 // Babylon Euler rotation order: yaw * pitch * roll. Transform referenced vertices only;
 // unused authoring vertices must not enlarge the collider.
 if(e.kind==='mesh'&&e.mesh){
  const min:Vec3=[Infinity,Infinity,Infinity],max:Vec3=[-Infinity,-Infinity,-Infinity];
  const indices=new Set(e.mesh.triangles.flat());
  for(const i of indices){
   const [a,b,c]=e.mesh.vertices[i].map((n,k)=>n*e.scale[k]);
   const p:Vec3=[(cy*cz+sy*sx*sz)*a+(-cy*sz+sy*sx*cz)*b+sy*cx*c,cx*sz*a+cx*cz*b-sx*c,(-sy*cz+cy*sx*sz)*a+(sy*sz+cy*sx*cz)*b+cy*cx*c];
   for(let j=0;j<3;j++){min[j]=Math.min(min[j],p[j]);max[j]=Math.max(max[j],p[j]);}
  }
  return {center:min.map((n,j)=>e.position[j]+(n+max[j])/2) as Vec3,half:min.map((n,j)=>Math.max(.005,(max[j]-n)/2)) as Vec3};
 }
 return {center:e.position,half:[
 Math.abs(cy*cz+sy*sx*sz)*x+Math.abs(-cy*sz+sy*sx*cz)*y+Math.abs(sy*cx)*z,
 Math.abs(cx*sz)*x+Math.abs(cx*cz)*y+Math.abs(sx)*z,
 Math.abs(-sy*cz+cy*sx*sz)*x+Math.abs(sy*sz+cy*sx*cz)*y+Math.abs(cy*cx)*z]};
}
const EPS=1e-6;
export function overlaps(a:Vec3,ah:Vec3,b:Bounds,axes:readonly number[]=[0,1,2]):boolean{
 return axes.every(i=>Math.abs(a[i]-b.center[i])<ah[i]+b.half[i]-EPS);
}
export function moveAxis(p:Vec3,half:Vec3,axis:0|1|2,delta:number,solids:readonly Bounds[]):{position:number;hit:boolean}{
 let target=p[axis]+delta;const other=[0,1,2].filter(i=>i!==axis);
 for(const b of solids){
 if(!overlaps(p,half,b,other))continue;
 const min=b.center[axis]-b.half[axis]-half[axis],max=b.center[axis]+b.half[axis]+half[axis];
 if(delta>0&&p[axis]<=min+EPS&&target>min)target=Math.min(target,min);
 if(delta<0&&p[axis]>=max-EPS&&target<max)target=Math.max(target,max);
 }
 return {position:target,hit:Math.abs(target-(p[axis]+delta))>EPS};
}
