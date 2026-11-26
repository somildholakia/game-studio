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
