import {readMesh,type MeshData} from './mesh';
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
export function meshToObj(m:MeshData):string{
 const mesh=readMesh(m);return ['# Game Studio mesh (right-handed OBJ)','o GameStudioMesh',...mesh.vertices.map(v=>'v '+[v[0],v[1],-v[2]].join(' ')),...mesh.triangles.map(t=>'f '+[t[0]+1,t[1]+1,t[2]+1].join(' '))].join('\n')+'\n';
}
