import {Engine,Scene,ArcRotateCamera,Vector3,HemisphericLight,MeshBuilder,StandardMaterial,Color3,Mesh} from '@babylonjs/core';
import type {Project} from '../core/project';
import {begin,step,type GameState} from '../runtime/simulation';
export type PlayStatus={collected:number;total:number;won:boolean};
export function mountViewport(canvas:HTMLCanvasElement,onSelect:(id:string)=>void) {
 const engine=new Engine(canvas,true);const scene=new Scene(engine);
 const camera=new ArcRotateCamera('camera',-Math.PI/2,Math.PI/3,12,new Vector3(0,1,0),scene);camera.attachControl(canvas,true);
 new HemisphericLight('light',new Vector3(0,1,0),scene);
 const meshes=new Map<string,{mesh:Mesh;kind:string}>();
 const keys=new Set<string>();
 let run:{project:Project;state:GameState;player:string;notify:(s:PlayStatus)=>void;last:string;total:number}|null=null;
 const down=(e:KeyboardEvent)=>{if(run&&['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase())){e.preventDefault();keys.add(e.key.toLowerCase());}};
 const up=(e:KeyboardEvent)=>keys.delete(e.key.toLowerCase());
 const clear=()=>keys.clear();
 window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',clear);
 scene.onPointerDown=(_,pick)=>{if(!run&&pick?.pickedMesh)onSelect(pick.pickedMesh.id);};
 function sync(project:Project){
 const ids=new Set(project.entities.map(e=>e.id));
 for(const [id,m] of meshes)if(!ids.has(id)){m.mesh.dispose(false,true);meshes.delete(id);}
 for(const e of project.entities){let entry=meshes.get(e.id);
 if(entry&&entry.kind!==e.kind){entry.mesh.dispose(false,true);meshes.delete(e.id);entry=undefined;}
 if(!entry){const m=e.kind==='ground'?MeshBuilder.CreateGround(e.id,{width:12,height:12},scene):e.kind==='sphere'?MeshBuilder.CreateSphere(e.id,{diameter:1.5},scene):MeshBuilder.CreateBox(e.id,{size:1.5},scene);m.id=e.id;m.material=new StandardMaterial(e.id,scene);entry={mesh:m,kind:e.kind};meshes.set(e.id,entry);}
 const m=entry.mesh;m.setEnabled(true);m.position.set(...e.position);m.rotation.set(...e.rotation);m.scaling.set(...e.scale);(m.material as StandardMaterial).diffuseColor=Color3.FromHexString(e.color);}
 }
 const render=()=>{
 if(run){
 const input={x:Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),z:Number(keys.has('w')||keys.has('arrowup'))-Number(keys.has('s')||keys.has('arrowdown'))};
 run.state=step(run.project,run.state,input,engine.getDeltaTime()/1000);
 const player=meshes.get(run.player)?.mesh;player?.position.set(...run.state.position);
 camera.setTarget(new Vector3(...run.state.position));
 for(const id of run.state.collected)meshes.get(id)?.mesh.setEnabled(false);
 const status={collected:run.state.collected.size,total:run.total,won:run.state.won};
 const signature=JSON.stringify(status);if(signature!==run.last){run.last=signature;run.notify(status);}
 }
 scene.render();};
 engine.runRenderLoop(render);
 const observer=new ResizeObserver(()=>engine.resize());observer.observe(canvas);
 return {sync,start(project:Project,notify:(s:PlayStatus)=>void){
 const state=begin(project);const player=project.entities.find(e=>e.role==='player')!;
 sync(project);keys.clear();camera.detachControl();camera.alpha=-Math.PI/2;camera.beta=.65;camera.radius=12;run={project,state,player:player.id,notify,last:'',total:project.entities.filter(e=>e.role==='collectible').length};
 },stop(project:Project){run=null;keys.clear();sync(project);camera.setTarget(new Vector3(0,1,0));camera.attachControl(canvas,true);},
 dispose(){run=null;observer.disconnect();window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',clear);engine.stopRenderLoop(render);scene.dispose();engine.dispose();}};
}
