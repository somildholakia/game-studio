import {describe,it,expect} from 'vitest';
import {NullEngine,Scene,VertexBuffer} from '@babylonjs/core';
import {entity} from '../core/project';
import {defaultRig,neutralPose,type CharacterRig} from '../core/characterRig';
import {createCharacterRig,syncCharacterRig,animateDecorativeRig} from './characterRig';
describe('actual renderer skinning and blend integration',()=>{
 it('updates live mesh position and normal buffers while keeping the opposite limb unchanged',()=>{
 const engine=new NullEngine(),scene=new Scene(engine);
 try{
 const rig:CharacterRig={...defaultRig,skinMode:'weighted',pose:{...neutralPose}};
 const e={...entity('character'),rig},root=createCharacterRig(e,scene);syncCharacterRig(root,e);
 const left=scene.getMeshByName(e.id+'-left-arm-skin')!,right=scene.getMeshByName(e.id+'-right-arm-skin')!;
 const positions=()=>Array.from(left.getVerticesData(VertexBuffer.PositionKind)!);
 const rest=positions(),other=Array.from(right.getVerticesData(VertexBuffer.PositionKind)!);
 syncCharacterRig(root,{...e,rig:{...rig,pose:{...neutralPose,leftElbow:90}}});
 expect(positions()).not.toEqual(rest);expect(Array.from(right.getVerticesData(VertexBuffer.PositionKind)!)).toEqual(other);
 expect(Array.from(left.getVerticesData(VertexBuffer.NormalKind)!).every(Number.isFinite)).toBe(true);
 const bent=positions();
 animateDecorativeRig(root,{...rig,clip:{loop:false,keys:[{time:0,pose:{...neutralPose}}]},blend:{clip:{loop:false,keys:[{time:0,pose:{...neutralPose,leftElbow:90}}]},weight:1,speed:1}},0,true);
 expect(positions()).toEqual(bent);syncCharacterRig(root,e);expect(positions()).toEqual(rest);
 }finally{scene.dispose();engine.dispose();}
 });
});
