import {Engine,Scene,ArcRotateCamera,Vector3,Mesh,MeshBuilder,StandardMaterial,Color3,type AssetContainer} from '@babylonjs/core';
import {createShadows} from './shadows';
import {defaultGraphics,type GraphicsSettings,type RenderMetrics} from '../core/graphics';
import {defaultPresentation} from '../core/presentation';
import {syncCharacterRig,animateCharacterRig,animateDecorativeRig} from './characterRig';
import {createEnvironment} from './environment';
import {createGizmos,type Tool,type Transform} from './gizmos';
import {createMaterial,updateMaterial} from './material';
import {createPrimitive} from './geometry';
import {loadModel} from './modelLoader';
import {createAudio,defaultAudio} from '../runtime/audio';
import {pollGamepad,type Control} from '../runtime/controls';
import {triggerBounds} from '../runtime/patrol';
import {sample} from '../core/animation';
import type {Project} from '../core/project';
import {begin,advance,compileWorld,type GameState} from '../runtime/simulation';
export type PlayStatus={collected:number;total:number;won:boolean;lost?:boolean;livesRemaining?:number;score:number;message:string;counters?:Record<string,number>;elapsedSeconds?:number};
export function mountViewport(canvas:HTMLCanvasElement,onSelect:(id:string)=>void,onError:(message:string)=>void=()=>{},onTransform?:(id:string,transform:Transform)=>void,onMetrics?:(m:RenderMetrics)=>void,onVertexPick?:(index:number)=>void) {
 const engine=new Engine(canvas,true);const scene=new Scene(engine);
 const camera=new ArcRotateCamera('camera',-Math.PI/2,Math.PI/3,12,new Vector3(0,1,0),scene);camera.attachControl(canvas,true);
 const environment=createEnvironment(scene);const shadows=createShadows(environment.sun);let graphics:GraphicsSettings=defaultGraphics;let lastMetrics=0;
 const refreshShadows=()=>shadows.sync(graphics,Array.from(meshes.values(),entry=>entry.mesh));
 const gizmos=onTransform?createGizmos(scene,onTransform):null;let selected='';let tool:Tool='move';let snap=false;let previewing=false;let vertexMode=false;let vertexIndex=0;let authored:Project|null=null;
 const marker=onVertexPick?MeshBuilder.CreateSphere('editor-vertex-marker',{diameter:.12,segments:8},scene):null;
 if(marker){const material=new StandardMaterial('editor-vertex-marker-material',scene);material.emissiveColor=new Color3(1,.65,.08);material.disableLighting=true;marker.material=material;marker.isPickable=false;marker.setEnabled(false);}
 function vertexPoint(index:number){const data=authored?.entities.find(e=>e.id===selected)?.mesh;const mesh=meshes.get(selected)?.mesh;if(!data||!mesh||!data.vertices[index])return null;return Vector3.TransformCoordinates(new Vector3(...data.vertices[index]),mesh.computeWorldMatrix(true));}
 function refreshGizmo(){gizmos?.configure(run||previewing||vertexMode?null:meshes.get(selected)?.mesh??null,run||previewing||vertexMode?'select':tool,snap);}
 type Entry={mesh:Mesh;signature:string;assetData?:string;container?:AssetContainer};
 const meshes=new Map<string,Entry>();let disposed=false;
 function destroy(entry:Entry){entry.container?.removeAllFromScene();entry.container?.dispose();entry.mesh.dispose(false,true);}
 const keys=new Set<string>();const touch=new Set<Control>();const audio=createAudio();
 const unlock=()=>{void audio.unlock().catch(()=>{});};
 let paused=false;
 let run:{project:Project;state:GameState;world:ReturnType<typeof compileWorld>;player:string;notify:(s:PlayStatus)=>void;last:string;total:number}|null=null;
 const down=(e:KeyboardEvent)=>{if(run&&!paused&&e.target===canvas&&!e.altKey&&!e.ctrlKey&&!e.metaKey&&['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase())){e.preventDefault();keys.add(e.key.toLowerCase());}};
 const up=(e:KeyboardEvent)=>keys.delete(e.key.toLowerCase());
 const clear=()=>{keys.clear();touch.clear();};
 const clearKeys=()=>keys.clear();const visibility=()=>{if(document.hidden)clear();};
 window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',clear);document.addEventListener('visibilitychange',visibility);canvas.addEventListener('blur',clearKeys);canvas.addEventListener('pointerdown',unlock);
 scene.onPointerDown=(_,pick)=>{if(run||previewing)return;if(vertexMode){const data=authored?.entities.find(e=>e.id===selected)?.mesh;const mesh=meshes.get(selected)?.mesh;if(pick&&mesh&&pick.pickedMesh===mesh&&pick.pickedPoint&&data){const face=data.triangles[pick.faceId];if(face){let closest=face[0],distance=Infinity;for(const i of face){const point=vertexPoint(i);if(point){const d=Vector3.DistanceSquared(point,pick.pickedPoint);if(d<distance){distance=d;closest=i;}}}onVertexPick?.(closest);}}return;}let node=pick?.pickedMesh as import('@babylonjs/core').Node|null|undefined;while(node){if(meshes.get(node.id)?.mesh===node){onSelect(node.id);return;}node=node.parent;}};
 function sync(project:Project){
 authored=project;
 environment.sync(project.environment);const nextGraphics=project.graphics??defaultGraphics;if(nextGraphics.renderScale!==graphics.renderScale)engine.setHardwareScalingLevel(1/nextGraphics.renderScale);graphics=nextGraphics;
 const ids=new Set(project.entities.map(e=>e.id));
 for(const [id,m] of meshes)if(!ids.has(id)){meshes.delete(id);destroy(m);}
 for(const e of project.entities){let entry=meshes.get(e.id);
 const asset=e.kind==='model'?project.assets?.find(a=>a.id===e.assetId):undefined;
 const signature=JSON.stringify([e.kind,e.character,e.assetId,e.mesh,e.terrain,e.rig?.hairStyle,e.uvProjection,e.smoothNormals]);
 if(entry&&(entry.signature!==signature||entry.assetData!==asset?.data)){meshes.delete(e.id);destroy(entry);entry=undefined;}
 if(!entry){const m=e.kind==='model'?new Mesh(e.id,scene):createPrimitive(e,scene);m.id=e.id;if(e.kind!=='model'&&e.kind!=='character')m.material=createMaterial(e,scene);entry={mesh:m,signature,assetData:asset?.data};meshes.set(e.id,entry);
 if(asset){const current=entry;const valid=()=>!disposed&&meshes.get(e.id)===current;void loadModel(asset,scene,m,valid).then(container=>{if(container&&valid()){current.container=container;refreshShadows();}else if(container){container.removeAllFromScene();container.dispose();}}).catch(err=>{if(valid())onError('Model '+e.name+': '+String(err));});}}
 const m=entry.mesh;m.setEnabled(true);m.position.set(...e.position);m.rotationQuaternion=null;m.rotation.set(...e.rotation);m.scaling.set(...e.scale);updateMaterial(m,e);if(e.kind==='character')syncCharacterRig(m,e);}
 refreshShadows();refreshGizmo();
 }
 function applyAnimation(project:Project,time:number){for(const e of project.entities){if((!e.animation&&!e.rig?.clip)||(e.kind==='ground'||e.kind==='terrain')||(e.role&&e.role!=='decoration'))continue;const m=meshes.get(e.id)?.mesh;if(!m)continue;if(e.kind==='character')animateDecorativeRig(m,e.rig,time,previewing);if(!e.animation)continue;const pose=sample(previewing?{...e.animation,loop:false}:e.animation,time);m.position.set(...pose.position);m.rotationQuaternion=null;m.rotation.set(...pose.rotation);m.scaling.set(...pose.scale);}}
 const render=()=>{
 if(run&&!paused){
 const pad=pollGamepad(()=>document.hidden?[]:navigator.getGamepads?.()??[]);
 const horizontal=Number(touch.has('right')||keys.has('d')||keys.has('arrowright'))-Number(touch.has('left')||keys.has('a')||keys.has('arrowleft'));
 const vertical=Number(touch.has('up')||keys.has('w')||keys.has('arrowup'))-Number(touch.has('down')||keys.has('s')||keys.has('arrowdown'));
 const input={x:horizontal||pad.x,z:vertical||pad.z,jump:touch.has('jump')||keys.has(' ')||pad.jump};
 const dt=engine.getDeltaTime()/1000;const before=run.state;run.state=advance(run.world,run.state,input,dt);const sound=run.project.audio??defaultAudio;
 if(run.state.respawns>before.respawns)audio.play(sound,'respawn');else if(run.state.collected.size>before.collected.size)audio.play(sound,'collect');if(run.state.jumps>before.jumps)audio.play(sound,'jump');if(!before.won&&run.state.won)audio.play(sound,'win');applyAnimation(run.project,run.state.elapsed);
 const player=meshes.get(run.player)?.mesh;player?.position.set(...run.state.position);if(player){const actor=run.project.entities.find(e=>e.id===run!.player);if(actor?.kind==='character'){const dx=run.state.position[0]-before.position[0],dz=run.state.position[2]-before.position[2];const moving=run.state.respawns===before.respawns&&Math.hypot(dx,dz)>1e-5;if(moving)player.rotation.y=Math.atan2(dx,dz);animateCharacterRig(player,actor.rig,run.state.elapsed,moving,run.state.grounded);}}
 for(const [id,body] of run.state.bodies)meshes.get(id)?.mesh.position.set(...body.position);
 camera.setTarget(new Vector3(...run.state.position));
 for(const gate of run.world.gates)meshes.get(gate.id)?.mesh.setEnabled(!run.state.openGates.has(gate.id));
 for(const item of [...run.world.pickups,...run.world.hazards]){const mesh=meshes.get(item.id)?.mesh;if(item.patrol)mesh?.position.set(...triggerBounds(item,run.state.elapsed).center);if(run.state.collected.has(item.id))mesh?.setEnabled(false);else mesh?.setEnabled(true);}
 const status={collected:run.state.collected.size,total:run.total,won:run.state.won,lost:!!run.state.logic.lost,...(run.world.logic.maxLives!==undefined?{livesRemaining:Math.max(0,run.world.logic.maxLives-run.state.respawns)}:{}),score:run.state.logic.score,message:run.state.logic.message,counters:run.state.logic.counters,...(run.project.presentation?.showTimer?{elapsedSeconds:Math.floor(run.state.elapsed+1e-9)}:{})};
 const signature=JSON.stringify(status);if(signature!==run.last){run.last=signature;run.notify(status);}
 }
 if(marker){const point=!run&&!previewing&&vertexMode?vertexPoint(vertexIndex):null;marker.setEnabled(!!point);if(point){marker.position.copyFrom(point);marker.scaling.setAll(Math.max(.2,camera.radius/12));}}
 scene.render();if(onMetrics&&performance.now()-lastMetrics>=750){lastMetrics=performance.now();onMetrics({fps:Math.round(engine.getFps()),meshes:scene.meshes.length,vertices:scene.getTotalVertices(),width:engine.getRenderWidth(),height:engine.getRenderHeight()});}};
 engine.runRenderLoop(render);
 const observer=new ResizeObserver(()=>engine.resize());observer.observe(canvas);
 return {sync,setVertexMode(enabled:boolean,index:number){vertexMode=enabled;vertexIndex=index;refreshGizmo();},setPaused(value:boolean){if(!run||run.state.won||run.state.logic.lost)return false;paused=value;clear();if(paused)audio.stop();else canvas.focus({preventScroll:true});return true;},setControl(c:Control,active:boolean){if(!run||paused)return;if(active){touch.add(c);if(run.project.audio?.enabled)unlock();}else touch.delete(c);},unlockAudio:unlock,preview(project:Project,time:number|null){if(run)return;previewing=time!==null;sync(project);if(time!==null)applyAnimation(project,time);refreshGizmo();},setTool(id:string,next:Tool,snapping:boolean){selected=id;tool=next;snap=snapping;refreshGizmo();},start(project:Project,notify:(s:PlayStatus)=>void){
 const state=begin(project);const player=project.entities.find(e=>e.role==='player')!;
 paused=false;previewing=false;sync(project);clear();audio.stop();if(project.audio?.enabled){void audio.unlock().then(()=>{if(run?.project===project&&!paused)audio.play(project.audio!,'start');}).catch(()=>{});}camera.detachControl();camera.alpha=-Math.PI/2;camera.beta=(project.presentation??defaultPresentation).camera==='overhead' ? .08 : .65;camera.radius=(project.presentation??defaultPresentation).distance;run={project,state,world:compileWorld(project),player:player.id,notify,last:'',total:project.entities.filter(e=>e.role==='collectible').length};for(const e of project.entities)if(e.role==='trigger')meshes.get(e.id)?.mesh.setEnabled(false);canvas.focus({preventScroll:true});refreshGizmo();
 },stop(project:Project){run=null;paused=false;previewing=false;clear();audio.stop();sync(project);camera.setTarget(new Vector3(0,1,0));camera.attachControl(canvas,true);},
 dispose(){disposed=true;run=null;audio.dispose();canvas.removeEventListener('pointerdown',unlock);gizmos?.dispose();marker?.dispose(false,true);shadows.dispose();for(const entry of meshes.values())destroy(entry);meshes.clear();observer.disconnect();window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',visibility);canvas.removeEventListener('blur',clearKeys);engine.stopRenderLoop(render);scene.dispose();engine.dispose();}};
}
