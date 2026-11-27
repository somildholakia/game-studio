import {cubeMesh,readMesh,subdivideMesh,type MeshData} from './mesh';
import {mirrorMesh,smoothSubdivision} from './meshOperations';
import type {Vec3} from './project';
type Axis=0|1|2;
export type BoxMode='union'|'difference'|'intersection';
export type MeshModifier={kind:'subdivide'|'smooth'}|{kind:'mirror';axis:Axis}|{kind:'box-boolean';mode:BoxMode;center:Vec3;size:Vec3};
export type MeshModifierState={source:MeshData;steps:MeshModifier[]};
export const MAX_MODIFIER_OBJECTS=32;
const axes=[0,1,2] as const;
const epsilon=1e-6;
function tuple(value:unknown,positive=false):Vec3{
 if(!Array.isArray(value)||value.length!==3||!value.every(v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=1000&&(!positive||v>=.01)))throw Error('Invalid cutter dimensions');
 return [...value] as Vec3;
}
export function readModifierSteps(raw:unknown):MeshModifier[]{
 if(!Array.isArray(raw)||!raw.length||raw.length>4)throw Error('Modifier stack must have 1–4 steps');
 return raw.map((v,i)=>{
 if(!v||typeof v!=='object')throw Error('Invalid modifier');
 if(v.kind==='subdivide'||v.kind==='smooth')return {kind:v.kind};
 if(v.kind==='mirror'&&axes.includes(v.axis))return {kind:'mirror',axis:v.axis};
 if(v.kind==='box-boolean'&&i===0&&['union','difference','intersection'].includes(v.mode))return {kind:'box-boolean',mode:v.mode,center:tuple(v.center),size:tuple(v.size,true)};
 throw Error('Invalid modifier; box Boolean must be the first step');
 });
}
type Box={min:Vec3;max:Vec3};
function sourceBox(mesh:MeshData):Box{
 const canonical=cubeMesh();
 if(mesh.vertices.length!==8||JSON.stringify(mesh.triangles)!==JSON.stringify(canonical.triangles))throw Error('Box Boolean requires the standard axis-aligned cube topology');
 const min=axes.map(k=>Math.min(...mesh.vertices.map(v=>v[k]))) as Vec3,max=axes.map(k=>Math.max(...mesh.vertices.map(v=>v[k]))) as Vec3;
 if(axes.some(k=>max[k]-min[k]<.01)||mesh.vertices.some((v,i)=>axes.some(k=>v[k]!== (canonical.vertices[i][k]<0?min[k]:max[k]))))throw Error('Box Boolean requires an axis-aligned cuboid source');
 return {min,max};
}
function inside(box:Box,p:Vec3){return axes.every(k=>p[k]>box.min[k]&&p[k]<box.max[k]);}
/** Exact coordinate-cell CSG for two axis-aligned cuboids. Surface quads share grid vertices.
 * Reject edge/point contact and empty results; no approximation of general mesh Boolean. */
export function boxBoolean(raw:MeshData,mode:BoxMode,center:Vec3,size:Vec3):MeshData{
 const a=sourceBox(readMesh(raw)),c=tuple(center),s=tuple(size,true);
 if(!['union','difference','intersection'].includes(mode))throw Error('Invalid Boolean mode');
 const b:Box={min:axes.map(k=>c[k]-s[k]/2) as Vec3,max:axes.map(k=>c[k]+s[k]/2) as Vec3};
 if([...b.min,...b.max].some(n=>Math.abs(n)>1000))throw Error('Cutter exceeds mesh coordinate limits');
 const overlap=axes.map(k=>Math.min(a.max[k],b.max[k])-Math.max(a.min[k],b.min[k]));
 if(overlap.every(n=>n>=-epsilon)&&overlap.some(n=>Math.abs(n)<epsilon))throw Error('Touching boxes are ambiguous; overlap or separate them');
 const grid=axes.map(k=>[...new Set([a.min[k],a.max[k],b.min[k],b.max[k]])].sort((x,y)=>x-y));
 if(grid.some(g=>g.some((n,i)=>i>0&&n-g[i-1]<epsilon)))throw Error('Box boundaries are too close');
 const key=(p:Vec3)=>p.join(':');
 const filled=new Set<string>(),cells:Vec3[]=[];
 for(let x=0;x<grid[0].length-1;x++)for(let y=0;y<grid[1].length-1;y++)for(let z=0;z<grid[2].length-1;z++){
 const i:Vec3=[x,y,z],p=axes.map(k=>(grid[k][i[k]]+grid[k][i[k]+1])/2) as Vec3;
 const aa=inside(a,p),bb=inside(b,p),yes=mode==='union'?aa||bb:mode==='difference'?aa&&!bb:aa&&bb;
 if(yes){filled.add(key(i));cells.push(i);}
 }
 if(!cells.length)throw Error('Boolean result is empty');
 const vertices:Vec3[]=[],triangles:MeshData['triangles']=[],ids=new Map<string,number>();
 function vertex(p:Vec3){const k=key(p),old=ids.get(k);if(old!==undefined)return old;const i=vertices.length;ids.set(k,i);vertices.push(axes.map(a=>grid[a][p[a]]) as Vec3);return i;}
 for(const cell of cells)for(const axis of axes)for(const sign of [-1,1] as const){
 const neighbor=[...cell] as Vec3;neighbor[axis]+=sign;if(filled.has(key(neighbor)))continue;
 const u=(axis+1)%3,v=(axis+2)%3;
 const corners=([[0,0],[1,0],[1,1],[0,1]] as const).map(([du,dv])=>{const p=[...cell] as Vec3;p[axis]+=sign===1?1:0;p[u]+=du;p[v]+=dv;return vertex(p);});
 const [i,j,k,l]=corners;
 // Clockwise exterior winding in the Babylon left-handed scene.
 if(sign===1)triangles.push([i,k,j],[i,l,k]);else triangles.push([i,j,k],[i,k,l]);
 }
 const counts=new Map<string,number>();
 for(const t of triangles)for(let i=0;i<3;i++){const a=t[i],b=t[(i+1)%3],k=[Math.min(a,b),Math.max(a,b)].join(':');counts.set(k,(counts.get(k)??0)+1);}
 if([...counts.values()].some(n=>n!==2))throw Error('Boolean result is non-manifold');
 return readMesh({vertices,triangles});
}
export function evaluateModifiers(source:MeshData,steps:MeshModifier[]):MeshData{
 let mesh=readMesh(source);
 for(const step of readModifierSteps(steps)){
 if(step.kind==='subdivide')mesh=subdivideMesh(mesh);
 else if(step.kind==='smooth')mesh=smoothSubdivision(mesh);
 else if(step.kind==='mirror')mesh=mirrorMesh(mesh,step.axis);
 else if(step.kind==='box-boolean')mesh=boxBoolean(mesh,step.mode,step.center,step.size);
 }
 return mesh;
}
export function readMeshModifierState(raw:unknown):{state:MeshModifierState;mesh:MeshData}{
 const v=raw as MeshModifierState;if(!v||typeof v!=='object')throw Error('Invalid modifier state');
 const source=readMesh(v.source),steps=readModifierSteps(v.steps);
 return {state:{source,steps},mesh:evaluateModifiers(source,steps)};
}
