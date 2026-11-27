import type {MeshData} from './mesh';
import type {Vec3} from './project';
function unit(n:Vec3):Vec3{const length=Math.hypot(...n);return length>1e-9?n.map(x=>x/length) as Vec3:[0,0,0];}
/** Babylon's clockwise, left-handed front faces use the negative geometric cross product.
 * Area-weighted shared normals preserve the original topology across UV seams. */
export function cornerNormals(mesh:MeshData,smooth=false):Vec3[]{
 const sums:Vec3[]=mesh.vertices.map(()=>[0,0,0]),faces:Vec3[]=[];
 for(const face of mesh.triangles){
  const [a,b,c]=face.map(i=>mesh.vertices[i]);const u=b.map((x,j)=>x-a[j]),v=c.map((x,j)=>x-a[j]);
  const n:Vec3=[u[2]*v[1]-u[1]*v[2],u[0]*v[2]-u[2]*v[0],u[1]*v[0]-u[0]*v[1]];
  faces.push(unit(n));for(const i of face)for(let j=0;j<3;j++)sums[i][j]+=n[j];
 }
 const averaged=sums.map(unit);
 return mesh.triangles.flatMap((face,i)=>face.map(j=>smooth&&Math.hypot(...averaged[j])>0?averaged[j]:faces[i]));
}
