import {entity,type Project,type Vec3} from './project';
import {readMesh,type MeshData} from './mesh';
/** Near the current per-mesh topology quota: 1986 vertices, 3968 triangles. */
export function complexMesh():MeshData{
 const segments=64,rings=31,vertices:Vec3[]=[[0,1,0]],triangles:MeshData['triangles']=[];
 for(let r=1;r<=rings;r++){const phi=Math.PI*r/(rings+1);for(let j=0;j<segments;j++){const a=2*Math.PI*j/segments;vertices.push([Math.sin(phi)*Math.cos(a),Math.cos(phi),Math.sin(phi)*Math.sin(a)]);}}
 const bottom=vertices.length;vertices.push([0,-1,0]);
 const at=(r:number,j:number)=>1+r*segments+(j+segments)%segments;
 for(let j=0;j<segments;j++){triangles.push([0,at(0,j+1),at(0,j)]);for(let r=0;r<rings-1;r++){const a=at(r,j),b=at(r,j+1),c=at(r+1,j),d=at(r+1,j+1);triangles.push([a,b,c],[b,d,c]);}triangles.push([at(rings-1,j),at(rings-1,j+1),bottom]);}
 return readMesh({vertices,triangles});
}
export function runtimeStressProject():Project{
 const p:Project={version:1,name:'Runtime benchmark',entities:[{...entity('box'),role:'player',position:[0,.75,0]}]};
 for(let i=0;i<1024;i++)p.entities.push({...entity('box'),role:'solid',position:[(i%32)*3-48,1,10+Math.floor(i/32)*3]});
 for(let i=0;i<16;i++)p.entities.push({...entity('box'),role:'dynamic',position:[i*3-24,3,-8]});
 for(let i=0;i<32;i++)p.entities.push({...entity('sphere'),role:'collectible',position:[i*3,1,-20]});
 return p;
}
