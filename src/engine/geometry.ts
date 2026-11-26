import {Mesh,MeshBuilder,VertexData,type Scene} from '@babylonjs/core';
import type {Entity} from '../core/project';
export function createPrimitive(e:Entity,scene:Scene):Mesh {
 const id=e.id;
 switch(e.kind){
 case 'mesh':{const data=e.mesh;if(!data)throw Error('Missing mesh geometry');const mesh=new Mesh(id,scene);const vertexData=new VertexData();vertexData.positions=data.vertices.flat();vertexData.indices=data.triangles.flat();const normals:number[]=[];VertexData.ComputeNormals(vertexData.positions,vertexData.indices,normals);vertexData.normals=normals;vertexData.applyToMesh(mesh);mesh.convertToFlatShadedMesh();return mesh;}
 case 'ground':return MeshBuilder.CreateGround(id,{width:12,height:12},scene);
 case 'sphere':return MeshBuilder.CreateSphere(id,{diameter:1.5},scene);
 case 'cylinder':return MeshBuilder.CreateCylinder(id,{height:1.5,diameter:1.5,tessellation:32},scene);
 case 'cone':return MeshBuilder.CreateCylinder(id,{height:1.5,diameterTop:0,diameterBottom:1.5,tessellation:32},scene);
 case 'torus':return MeshBuilder.CreateTorus(id,{diameter:1.1,thickness:.4,tessellation:32},scene);
 case 'character':{
 const c=e.character??{bodyWidth:1,headSize:1,limbLength:1};
 const parts:Mesh[]=[];
 const box=(name:string,w:number,h:number,d:number,x:number,y:number)=>{const m=MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene);m.position.set(x,y,0);parts.push(m);};
 box(id+'-torso',.42*c.bodyWidth,.48,.24,0,.03);
 const head=MeshBuilder.CreateSphere(id+'-head',{diameter:.34*c.headSize,segments:16},scene);head.position.y=.43;parts.push(head);
 for(const sign of [-1,1]){box(id+'-arm',.14,.48*c.limbLength,.16,sign*(.22*c.bodyWidth+.08),.02);box(id+'-leg',.17,.47*c.limbLength,.2,sign*.11*c.bodyWidth,-.43);}
 const merged=Mesh.MergeMeshes(parts,true,true);if(!merged)throw Error('Character geometry creation failed');merged.name=id;return merged;
 }
 default:return MeshBuilder.CreateBox(id,{size:1.5},scene);
 }
}
