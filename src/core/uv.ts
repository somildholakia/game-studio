import type {MeshData} from './mesh';
import type {Vec3} from './project';
export type UV=[number,number];
export type Projection='auto'|'xy'|'xz'|'yz';
export const projections=['auto','xy','xz','yz'] as const;
export function projectUV(mesh:MeshData,projection:Projection='auto'):UV[]{
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 for(const v of mesh.vertices)for(let i=0;i<3;i++){min[i]=Math.min(min[i],v[i]);max[i]=Math.max(max[i],v[i]);}
 const norm=(v:Vec3,i:number)=>(v[i]-min[i])/Math.max(1e-8,max[i]-min[i]);
 const result:UV[]=[];
 for(const face of mesh.triangles){const [a,b,c]=face.map(i=>mesh.vertices[i]);let mode=projection;
 if(mode==='auto'){const u=b.map((n,i)=>n-a[i]),v=c.map((n,i)=>n-a[i]);const n=[Math.abs(u[1]*v[2]-u[2]*v[1]),Math.abs(u[2]*v[0]-u[0]*v[2]),Math.abs(u[0]*v[1]-u[1]*v[0])];mode=n[0]>=n[1]&&n[0]>=n[2]?'yz':n[1]>=n[2]?'xz':'xy';}
 const axes=mode==='xy'?[0,1]:mode==='xz'?[0,2]:[2,1];for(const v of [a,b,c])result.push([norm(v,axes[0]),norm(v,axes[1])]);
 }return result;
}
