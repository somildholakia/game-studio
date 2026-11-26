import {GizmoManager,type Mesh,type Scene} from '@babylonjs/core';
import type {Vec3} from '../core/project';
export type Tool='select'|'move'|'rotate'|'scale';
export type Transform={position:Vec3;rotation:Vec3;scale:Vec3};
export function createGizmos(scene:Scene,onCommit:(id:string,transform:Transform)=>void){
 const manager=new GizmoManager(scene);
 manager.usePointerToAttachGizmos=false;
 manager.positionGizmoEnabled=true;manager.rotationGizmoEnabled=true;manager.scaleGizmoEnabled=true;
 let mesh:Mesh|null=null;let dragMesh:Mesh|null=null;
 const begin=()=>{dragMesh=mesh;};
 const end=()=>{
 const m=dragMesh;dragMesh=null;if(!m||m!==mesh||m.isDisposed())return;
 const v=(a:{x:number;y:number;z:number}):Vec3=>[a.x,a.y,a.z];
 const rotation=m.rotationQuaternion?.toEulerAngles()??m.rotation;
 onCommit(m.id,{position:v(m.position),rotation:v(rotation),scale:v(m.scaling)});
 };
 const g=manager.gizmos;
 for(const axis of [g.positionGizmo!.xGizmo,g.positionGizmo!.yGizmo,g.positionGizmo!.zGizmo,g.rotationGizmo!.xGizmo,g.rotationGizmo!.yGizmo,g.rotationGizmo!.zGizmo,g.scaleGizmo!.xGizmo,g.scaleGizmo!.yGizmo,g.scaleGizmo!.zGizmo,g.scaleGizmo!.uniformScaleGizmo]){
 axis.dragBehavior.onDragStartObservable.add(begin);axis.dragBehavior.onDragEndObservable.add(end);
 }
 g.positionGizmo!.planarGizmoEnabled=false;
 function configure(target:Mesh|null,tool:Tool,snap:boolean){
 if(target!==mesh){dragMesh=null;mesh=target;}
 manager.positionGizmoEnabled=tool==='move';manager.rotationGizmoEnabled=tool==='rotate';manager.scaleGizmoEnabled=tool==='scale';
 if(g.positionGizmo)g.positionGizmo.snapDistance=snap?.25:0;
 if(g.rotationGizmo)g.rotationGizmo.snapDistance=snap?Math.PI/12:0;
 if(g.scaleGizmo)g.scaleGizmo.snapDistance=snap?.1:0;
 manager.attachToMesh(tool==='select'?null:target);
 }
 configure(null,'select',false);
 return {configure,dispose(){mesh=null;dragMesh=null;manager.dispose();}};
}
