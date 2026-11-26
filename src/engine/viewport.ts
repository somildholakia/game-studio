import {Engine,Scene,ArcRotateCamera,Vector3,HemisphericLight,MeshBuilder,StandardMaterial,Color3,Mesh} from '@babylonjs/core';
import type {Project} from '../core/project';
export function mountViewport(canvas:HTMLCanvasElement,onSelect:(id:string)=>void) {
 const engine=new Engine(canvas,true); const scene=new Scene(engine);
 const camera=new ArcRotateCamera('camera',-Math.PI/2,Math.PI/3,12,new Vector3(0,1,0),scene);camera.attachControl(canvas,true);
 new HemisphericLight('light',new Vector3(0,1,0),scene);
 const meshes=new Map<string,Mesh>();
 scene.onPointerDown=(_,pick)=>{if(pick?.pickedMesh)onSelect(pick.pickedMesh.id);};
 const render=()=>scene.render();engine.runRenderLoop(render);
 const observer=new ResizeObserver(()=>engine.resize());observer.observe(canvas);
 return {sync(project:Project){
 for(const [id,m] of meshes)if(!project.entities.some(e=>e.id===id)){m.dispose(false,true);meshes.delete(id);}
 for(const e of project.entities){let m=meshes.get(e.id);
 if(!m){m=e.kind==='ground'?MeshBuilder.CreateGround(e.id,{width:12,height:12},scene):e.kind==='sphere'?MeshBuilder.CreateSphere(e.id,{diameter:1.5},scene):MeshBuilder.CreateBox(e.id,{size:1.5},scene);m.id=e.id;m.material=new StandardMaterial(e.id,scene);meshes.set(e.id,m);}
 m.position.set(...e.position);m.rotation.set(...e.rotation);m.scaling.set(...e.scale);(m.material as StandardMaterial).diffuseColor=Color3.FromHexString(e.color);}
 },dispose(){observer.disconnect();engine.stopRenderLoop(render);scene.dispose();engine.dispose();}};
}
