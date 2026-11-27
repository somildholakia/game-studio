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
export type Axis=0|1|2;
export type BoundsIndex={query:(p:Vec3,half:Vec3,axis:Axis,delta:number)=>readonly Bounds[]};
export type BoundsSource=readonly Bounds[]|BoundsIndex;
const CELL_SIZE=8,MAX_INSERT_CELLS=64,MAX_QUERY_CELLS=512;
const cell=(n:number)=>Math.floor(n/CELL_SIZE);
function cells(min:Vec3,max:Vec3,limit:number,visit:(key:string)=>void):boolean{
 const low=min.map(cell),high=max.map(cell),count=(high[0]-low[0]+1)*(high[1]-low[1]+1)*(high[2]-low[2]+1);
 if(!Number.isSafeInteger(count)||count<1||count>limit||![...low,...high].every(Number.isSafeInteger))return false;
 for(let x=low[0];x<=high[0];x++)for(let y=low[1];y<=high[1];y++)for(let z=low[2];z<=high[2];z++)visit(x+':'+y+':'+z);
 return true;
}
/** Immutable broad phase: preserves authored ordering, with bounded work and conservative fallbacks. */
export function indexBounds(bounds:readonly Bounds[]):BoundsIndex{
 const buckets=new Map<string,number[]>(),large:number[]=[];
 bounds.forEach((b,i)=>{
  const min=b.center.map((n,j)=>n-b.half[j]-EPS) as Vec3,max=b.center.map((n,j)=>n+b.half[j]+EPS) as Vec3;
  if(!cells(min,max,MAX_INSERT_CELLS,key=>{const list=buckets.get(key);if(list)list.push(i);else buckets.set(key,[i]);}))large.push(i);
 });
 return {query(p,half,axis,delta){
  const min=p.map((n,j)=>n-half[j]-EPS+(j===axis?Math.min(0,delta):0)) as Vec3;
  const max=p.map((n,j)=>n+half[j]+EPS+(j===axis?Math.max(0,delta):0)) as Vec3;
  const ids=new Set(large);
  if(!cells(min,max,MAX_QUERY_CELLS,key=>{for(const id of buckets.get(key)??[])ids.add(id);}))return bounds;
  return [...ids].sort((a,b)=>a-b).map(i=>bounds[i]);
 }};
}
export function combineBounds(source:BoundsSource,extra:readonly Bounds[]):BoundsSource{
 if(!extra.length)return source;
 return 'query' in source?{query:(p,half,axis,delta)=>[...source.query(p,half,axis,delta),...extra]}:[...source,...extra];
}
export function moveAxis(p:Vec3,half:Vec3,axis:Axis,delta:number,solids:BoundsSource):{position:number;hit:boolean}{
 let target=p[axis]+delta;const other=[0,1,2].filter(i=>i!==axis);
 for(const b of ('query' in solids?solids.query(p,half,axis,delta):solids)){
 if(!overlaps(p,half,b,other))continue;
 const min=b.center[axis]-b.half[axis]-half[axis],max=b.center[axis]+b.half[axis]+half[axis];
 if(delta>0&&p[axis]<=min+EPS&&target>min)target=Math.min(target,min);
 if(delta<0&&p[axis]>=max-EPS&&target<max)target=Math.max(target,max);
 }
 return {position:target,hit:Math.abs(target-(p[axis]+delta))>EPS};
}
