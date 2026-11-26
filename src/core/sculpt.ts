import {readMesh,type MeshData} from './mesh';
import type {Vec3} from './project';
export type BrushMode='inflate'|'deflate'|'smooth';
export function sculpt(mesh:MeshData,centerIndex:number,radius:number,strength:number,mode:BrushMode):MeshData{
 const m=readMesh(mesh);const center=m.vertices[centerIndex];if(!center||!Number.isFinite(radius)||radius<=0||radius>100||!Number.isFinite(strength)||strength<=0||strength>1||!['inflate','deflate','smooth'].includes(mode))throw Error('Invalid sculpt brush');
 const neighbors=m.vertices.map(()=>new Set<number>());const normals=m.vertices.map(()=>[0,0,0] as Vec3);
 for(const [i,j,k] of m.triangles){const a=m.vertices[i],b=m.vertices[j],c=m.vertices[k];const u=b.map((n,t)=>n-a[t]),v=c.map((n,t)=>n-a[t]);
 const n:Vec3=[u[2]*v[1]-u[1]*v[2],u[0]*v[2]-u[2]*v[0],u[1]*v[0]-u[0]*v[1]];
 for(const [x,y,z] of [[i,j,k],[j,k,i],[k,i,j]]){neighbors[x].add(y);neighbors[x].add(z);for(let t=0;t<3;t++)normals[x][t]+=n[t];}}
 const vertices=m.vertices.map((v,i)=>{const d=Math.hypot(v[0]-center[0],v[1]-center[1],v[2]-center[2]);if(d>=radius)return v;const weight=(1-d/radius)**2*strength;
 if(mode==='smooth'){const adjacent=[...neighbors[i]];if(!adjacent.length)return v;return v.map((n,t)=>n+(adjacent.reduce((sum,j)=>sum+m.vertices[j][t],0)/adjacent.length-n)*weight) as Vec3;}
 const n=normals[i],length=Math.hypot(...n);if(length<1e-8)return v;return v.map((x,t)=>x+n[t]/length*weight*(mode==='inflate'?-1:1)) as Vec3;});
 return readMesh({vertices,triangles:m.triangles});
}
