import {readMesh,MAX_VERTICES,MAX_TRIANGLES,type MeshData} from './mesh';
import type {Vec3} from './project';
type Face=[number,number,number];
const sub=(a:Vec3,b:Vec3):Vec3=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const cross=(a:Vec3,b:Vec3):Vec3=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export function extrudeFace(m:MeshData,index:number,distance:number):MeshData{
 const face=m.triangles[index];if(!face||!Number.isFinite(distance)||Math.abs(distance)>100||Math.abs(distance)<1e-6)throw Error('Choose a face and nonzero extrusion distance');
 const [a,b,c]=face.map(i=>m.vertices[i]);const n=cross(sub(b,a),sub(c,a));const length=Math.hypot(...n);if(length<1e-9)throw Error('Cannot extrude a degenerate face');
 // Babylon uses clockwise front faces in its default left-handed scene.
 const top=face.map(i=>m.vertices[i].map((v,j)=>v-distance*n[j]/length) as Vec3);const start=m.vertices.length;
 const triangles=m.triangles.filter((_,i)=>i!==index);triangles.push([start,start+1,start+2]);
 for(let i=0;i<3;i++){const j=(i+1)%3;triangles.push([face[i],face[j],start+j],[face[i],start+j,start+i]);}
 return readMesh({vertices:[...m.vertices,...top],triangles});
}
export function reverseFace(m:MeshData,index:number):MeshData{
 if(!m.triangles[index])throw Error('Choose a face');return readMesh({...m,triangles:m.triangles.map((t,i)=>i===index?[t[0],t[2],t[1]]:t)});
}
export function mirrorMesh(m:MeshData,axis:0|1|2):MeshData{
 return readMesh({vertices:m.vertices.map(v=>v.map((n,i)=>i===axis?-n:n)),triangles:m.triangles.map(t=>[t[0],t[2],t[1]])});
}
export function weldVertices(m:MeshData,tolerance:number):MeshData{
 if(!Number.isFinite(tolerance)||tolerance<.00001||tolerance>.1)throw Error('Weld tolerance must be between 0.00001 and 0.1');
 const vertices:Vec3[]=[];const map:number[]=[];
 for(const v of m.vertices){let index=vertices.findIndex(w=>Math.hypot(...sub(v,w))<=tolerance);if(index<0){index=vertices.length;vertices.push([...v]);}map.push(index);}
 const seen=new Set<string>();const triangles:Face[]=[];
 for(const t of m.triangles){const f=t.map(i=>map[i]) as Face;if(new Set(f).size<3)continue;const key=[...f].sort((a,b)=>a-b).join(',');if(seen.has(key))continue;seen.add(key);triangles.push(f);}
 return readMesh({vertices,triangles});
}
/** Remove duplicate/zero-area faces and unreferenced vertices without changing the surviving surface. */
export function cleanMesh(raw:MeshData):MeshData{
 const mesh=readMesh(raw),seen=new Set<string>(),used=new Set<number>(),faces:Face[]=[];
 for(const face of mesh.triangles){
  const [a,b,c]=face.map(i=>mesh.vertices[i]);
  if(Math.hypot(...cross(sub(b,a),sub(c,a)))<1e-9)continue;
  const key=[...face].sort((x,y)=>x-y).join(',');
  if(seen.has(key))continue;seen.add(key);faces.push(face);
  for(const i of face)used.add(i);
 }
 if(!faces.length)throw Error('Cleanup would remove every triangle');
 const vertices:Vec3[]=[],remap=new Map<number,number>();
 mesh.vertices.forEach((v,i)=>{if(used.has(i)){remap.set(i,vertices.length);vertices.push(v);}});
 const triangles=faces.map(face=>face.map(i=>remap.get(i)!) as Face);
 return readMesh({vertices,triangles});
}
/** Flip all triangle winding while preserving vertex positions and indices. */
export function reverseMesh(raw:MeshData):MeshData{
 const mesh=readMesh(raw);
 return readMesh({...mesh,triangles:mesh.triangles.map(([a,b,c])=>[a,c,b])});
}
/** One Loop subdivision step on an oriented triangular manifold, with boundary smoothing. */
export function smoothSubdivision(raw:MeshData):MeshData{
 const m=readMesh(raw),n=m.vertices.length;
 if(m.triangles.length*4>MAX_TRIANGLES)throw Error('Subdivision exceeds triangle limit');
 type Edge={a:number;b:number;opposite:number[];direction:number;index:number};
 const edges=new Map<string,Edge>(),links=Array.from({length:n},()=>new Map<number,Set<number>>());
 const key=(a:number,b:number)=>a<b?a+':'+b:b+':'+a;
 const seen=new Set<string>();
 const invalid=()=>{throw Error('Smooth subdivision requires a clean, consistently oriented manifold mesh.');};
 const link=(v:number,a:number,b:number)=>{
  const graph=links[v];
  if(!graph.has(a))graph.set(a,new Set());
  if(!graph.has(b))graph.set(b,new Set());
  graph.get(a)!.add(b);graph.get(b)!.add(a);
 };
 for(const [a,b,c] of m.triangles){
  const signature=[a,b,c].sort((x,y)=>x-y).join(',');
  if(seen.has(signature)||Math.hypot(...cross(sub(m.vertices[b],m.vertices[a]),sub(m.vertices[c],m.vertices[a])))<1e-9)invalid();
  seen.add(signature);
  for(const [u,v,w] of [[a,b,c],[b,c,a],[c,a,b]]){
   const k=key(u,v),direction=u<v?1:-1,existing=edges.get(k);
   if(existing){
    if(existing.opposite.length!==1||existing.direction===direction)invalid();
    existing.opposite.push(w);
   }else edges.set(k,{a:u,b:v,opposite:[w],direction,index:n+edges.size});
   link(u,v,w);
  }
 }
 if(n+edges.size>MAX_VERTICES)throw Error('Subdivision exceeds vertex limit');
 const vertices:Vec3[]=m.vertices.map((p,i)=>{
  const graph=links[i],neighbors=[...graph.keys()];
  if(!neighbors.length)throw Error('Clean unused vertices before smooth subdivision');
  const boundary=neighbors.filter(j=>edges.get(key(i,j))!.opposite.length===1);
  if(boundary.length!==0&&boundary.length!==2)invalid();
  // The link of each vertex must be a single cycle or path; reject bow-tie vertices.
  for(const j of neighbors)if(graph.get(j)!.size!==(boundary.includes(j)?1:2))invalid();
  const visited=new Set<number>(),stack=[neighbors[0]];
  while(stack.length){const j=stack.pop()!;if(visited.has(j))continue;visited.add(j);for(const k of graph.get(j)!)stack.push(k);}
  if(visited.size!==neighbors.length)invalid();
  if(boundary.length===2)return p.map((x,k)=>.75*x+.125*(m.vertices[boundary[0]][k]+m.vertices[boundary[1]][k])) as Vec3;
  const valence=neighbors.length;if(valence<3)invalid();
  const beta=(5/8-(3/8+Math.cos(2*Math.PI/valence)/4)**2)/valence;
  return p.map((x,k)=>(1-valence*beta)*x+beta*neighbors.reduce((sum,j)=>sum+m.vertices[j][k],0)) as Vec3;
 });
 for(const e of edges.values()){
  const a=m.vertices[e.a],b=m.vertices[e.b];
  vertices.push(a.map((x,k)=>e.opposite.length===1?(x+b[k])/2:3/8*(x+b[k])+1/8*(m.vertices[e.opposite[0]][k]+m.vertices[e.opposite[1]][k])) as Vec3);
 }
 const triangles:Face[]=[];
 for(const [a,b,c] of m.triangles){
  const ab=edges.get(key(a,b))!.index,bc=edges.get(key(b,c))!.index,ca=edges.get(key(c,a))!.index;
  triangles.push([a,ab,ca],[ab,b,bc],[ca,bc,c],[ab,bc,ca]);
 }
 return readMesh({vertices,triangles});
}
export function meshToObj(m:MeshData):string{
 const mesh=readMesh(m);return ['# Game Studio mesh (right-handed OBJ)','o GameStudioMesh',...mesh.vertices.map(v=>'v '+[v[0],v[1],-v[2]].join(' ')),...mesh.triangles.map(t=>'f '+[t[0]+1,t[1]+1,t[2]+1].join(' '))].join('\n')+'\n';
}

/** Geometry-only OBJ import. Triangles and convex polygon fans, no external resources. */
export function meshFromObj(raw:string):MeshData{
 if(raw.length>2_000_000)throw Error('OBJ exceeds 2 MB');
 const vertices:Vec3[]=[],triangles:Face[]=[];
 for(const line of raw.split(/\r?\n/)){
 const fields=line.split('#',1)[0].trim().split(/\s+/);const tag=fields.shift();
 if(!tag)continue;
 if(tag==='v'){
 if(fields.length!==3||fields.some(s=>!s||!Number.isFinite(Number(s))))throw Error('Expected three finite OBJ coordinates');
 const [x,y,z]=fields.map(Number);if(Math.max(Math.abs(x),Math.abs(y),Math.abs(z))>1000||vertices.length>=2048)throw Error('OBJ vertex limit exceeded');
 vertices.push([x,y,-z]);
 }else if(tag==='f'){
 if(fields.length<3||fields.length>64)throw Error('Invalid OBJ face');
 const face=fields.map(field=>{const index=field.split('/')[0];if(!/^-?\d+$/.test(index))throw Error('Invalid OBJ index');const n=Number(index),i=n>0?n-1:vertices.length+n;if(!n||i<0||i>=vertices.length)throw Error('OBJ face references an unknown vertex');return i;});
 if(new Set(face).size!==face.length)throw Error('Repeated OBJ vertex index');
 for(let i=1;i<face.length-1;i++){if(triangles.length>=4096)throw Error('OBJ triangle limit exceeded');triangles.push([face[0],face[i],face[i+1]]);}
 }else if(['vn','vt','o','g','s','usemtl','mtllib'].includes(tag)){
 // Ignore metadata and references. No resource loading, normals or UV import.
 }else throw Error('Unsupported OBJ statement: '+tag);
 }
 return readMesh({vertices,triangles});
}
