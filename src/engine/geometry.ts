import {Mesh,MeshBuilder,VertexData,type Scene} from '@babylonjs/core';
import {terrainGeometry,readTerrain} from '../core/terrain';
import {createCharacterRig} from './characterRig';
import type {Entity} from '../core/project';
export function createPrimitive(e:Entity,scene:Scene):Mesh {
 const id=e.id;
 switch(e.kind){
 case 'terrain':{const g=terrainGeometry(readTerrain(e.terrain));const mesh=new Mesh(id,scene);const data=new VertexData();data.positions=g.positions;data.indices=g.indices;data.uvs=g.uvs;const normals:number[]=[];VertexData.ComputeNormals(g.positions,g.indices,normals);data.normals=normals;data.applyToMesh(mesh);return mesh;}
 case 'mesh':{const data=e.mesh;if(!data)throw Error('Missing mesh geometry');const mesh=new Mesh(id,scene);const vertexData=new VertexData();vertexData.positions=data.vertices.flat();vertexData.indices=data.triangles.flat();const normals:number[]=[];VertexData.ComputeNormals(vertexData.positions,vertexData.indices,normals);vertexData.normals=normals;vertexData.applyToMesh(mesh);mesh.convertToFlatShadedMesh();return mesh;}
 case 'ground':return MeshBuilder.CreateGround(id,{width:12,height:12},scene);
 case 'sphere':return MeshBuilder.CreateSphere(id,{diameter:1.5},scene);
 case 'cylinder':return MeshBuilder.CreateCylinder(id,{height:1.5,diameter:1.5,tessellation:32},scene);
 case 'cone':return MeshBuilder.CreateCylinder(id,{height:1.5,diameterTop:0,diameterBottom:1.5,tessellation:32},scene);
 case 'torus':return MeshBuilder.CreateTorus(id,{diameter:1.1,thickness:.4,tessellation:32},scene);
 case 'character':return createCharacterRig(e,scene);
 default:return MeshBuilder.CreateBox(id,{size:1.5},scene);
 }
}
