import {Engine,Scene,ArcRotateCamera,Vector3,HemisphericLight,DirectionalLight,Mesh,type AssetContainer} from '@babylonjs/core';
import {createGizmos,type Tool,type Transform} from './gizmos';
import {createMaterial,updateMaterial} from './material';
import {createPrimitive} from './geometry';
import {loadModel} from './modelLoader';
import {sample} from '../core/animation';
import type {Project} from '../core/project';
import {begin,advance,compileWorld,type GameState} from '../runtime/simulation';
export type PlayStatus={collected:number;total:number;won:boolean;score:number;message:string};
export function mountViewport(canvas:HTMLCanvasElement,onSelect:(id:string)=>void,onError:(message:string)=>void=()=>{},onTransform?:(id:string,transform:Transform)=>void) {
 const engine=new Engine(canvas,true);const scene=new Scene(engine);
 const camera=new ArcRotateCamera('camera',-Math.PI/2,Math.PI/3,12,new Vector3(0,1,0),scene);camera.attachControl(canvas,true);
 new HemisphericLight('light',new Vector3(0,1,0),scene);const sun=new DirectionalLight('sun',new Vector3(-.5,-1,.6),scene);sun.intensity=2;
 const gizmos=onTransform?createGizmos(scene,onTransform):null;let selected='';let tool:Tool='move';let snap=false;let previewing=false;
 function refreshGizmo(){gizmos?.configure(run||previewing?null:meshes.get(selected)?.mesh??null,run||previewing?'select':tool,snap);}
 type Entry={mesh:Mesh;signature:string;assetData?:string;container?:AssetContainer};
 const meshes=new Map<string,Entry>();let disposed=false;
 function destroy(entry:Entry){entry.container?.removeAllFromScene();entry.container?.dispose();entry.mesh.dispose(false,true);}
 const keys=new Set<string>();
 let run:{project:Project;state:GameState;world:ReturnType<typeof compileWorld>;player:string;notify:(s:PlayStatus)=>void;last:string;total:number;elapsed:number}|null=null;
 const down=(e:KeyboardEvent)=>{if(run&&['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase())){e.preventDefault();keys.add(e.key.toLowerCase());}};
 const up=(e:KeyboardEvent)=>keys.delete(e.key.toLowerCase());
 const clear=()=>keys.clear();
 window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',clear);
 scene.onPointerDown=(_,pick)=>{if(run||previewing)return;let node=pick?.pickedMesh as import('@babylonjs/core').Node|null|undefined;while(node){if(meshes.get(node.id)?.mesh===node){onSelect(node.id);return;}node=node.parent;}};
 function sync(project:Project){
 const ids=new Set(project.entities.map(e=>e.id));
 for(const [id,m] of meshes)if(!ids.has(id)){meshes.delete(id);destroy(m);}
 for(const e of project.entities){let entry=meshes.get(e.id);
 const asset=e.kind==='model'?project.assets?.find(a=>a.id===e.assetId):undefined;
 const signature=JSON.stringify([e.kind,e.character,e.assetId,e.mesh]);
 if(entry&&(entry.signature!==signature||entry.assetData!==asset?.data)){meshes.delete(e.id);destroy(entry);entry=undefined;}
 if(!entry){const m=e.kind==='model'?new Mesh(e.id,scene):createPrimitive(e,scene);m.id=e.id;if(e.kind!=='model')m.material=createMaterial(e,scene);entry={mesh:m,signature,assetData:asset?.data};meshes.set(e.id,entry);
 if(asset){const current=entry;const valid=()=>!disposed&&meshes.get(e.id)===current;void loadModel(asset,scene,m,valid).then(container=>{if(container&&valid())current.container=container;else if(container){container.removeAllFromScene();container.dispose();}}).catch(err=>{if(valid())onError('Model '+e.name+': '+String(err));});}}
 const m=entry.mesh;m.setEnabled(true);m.position.set(...e.position);m.rotationQuaternion=null;m.rotation.set(...e.rotation);m.scaling.set(...e.scale);updateMaterial(m,e);}
 refreshGizmo();
 }
 function applyAnimation(project:Project,time:number){for(const e of project.entities){if(!e.animation||e.kind==='ground'||(e.role&&e.role!=='decoration'))continue;const m=meshes.get(e.id)?.mesh;if(!m)continue;const pose=sample(previewing?{...e.animation,loop:false}:e.animation,time);m.position.set(...pose.position);m.rotationQuaternion=null;m.rotation.set(...pose.rotation);m.scaling.set(...pose.scale);}}
 const render=()=>{
 if(run){
 const input={x:Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),z:Number(keys.has('w')||keys.has('arrowup'))-Number(keys.has('s')||keys.has('arrowdown')),jump:keys.has(' ')};
 const dt=engine.getDeltaTime()/1000;if(!run.state.won)run.elapsed+=Math.min(.1,Math.max(0,dt));run.state=advance(run.world,run.state,input,dt);applyAnimation(run.project,run.elapsed);
 const player=meshes.get(run.player)?.mesh;player?.position.set(...run.state.position);
 camera.setTarget(new Vector3(...run.state.position));
 for(const item of run.world.pickups)meshes.get(item.id)?.mesh.setEnabled(!run.state.collected.has(item.id));
 const status={collected:run.state.collected.size,total:run.total,won:run.state.won,score:run.state.logic.score,message:run.state.logic.message};
 const signature=JSON.stringify(status);if(signature!==run.last){run.last=signature;run.notify(status);}
 }
 scene.render();};
 engine.runRenderLoop(render);
 const observer=new ResizeObserver(()=>engine.resize());observer.observe(canvas);
 return {sync,preview(project:Project,time:number|null){if(run)return;previewing=time!==null;sync(project);if(time!==null)applyAnimation(project,time);refreshGizmo();},setTool(id:string,next:Tool,snapping:boolean){selected=id;tool=next;snap=snapping;refreshGizmo();},start(project:Project,notify:(s:PlayStatus)=>void){
 const state=begin(project);const player=project.entities.find(e=>e.role==='player')!;
 previewing=false;sync(project);keys.clear();camera.detachControl();camera.alpha=-Math.PI/2;camera.beta=.65;camera.radius=12;run={project,state,world:compileWorld(project),player:player.id,notify,last:'',total:project.entities.filter(e=>e.role==='collectible').length,elapsed:0};refreshGizmo();
 },stop(project:Project){run=null;previewing=false;keys.clear();sync(project);camera.setTarget(new Vector3(0,1,0));camera.attachControl(canvas,true);},
 dispose(){disposed=true;run=null;gizmos?.dispose();for(const entry of meshes.values())destroy(entry);meshes.clear();observer.disconnect();window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',clear);engine.stopRenderLoop(render);scene.dispose();engine.dispose();}};
}
