import {describe,it,expect} from 'vitest';import {readRig,defaultRig,neutralPose,motionPose,captureJointPose,readJointClip,sampleJointClip} from './characterRig';import {entity,parseProject} from './project';
describe('articulated characters',()=>{it('validates rig customization',()=>{expect(readRig(undefined)).toEqual(defaultRig);expect(()=>readRig({...defaultRig,pose:{...neutralPose,leftHip:999}})).toThrow();});it('generates alternating movement poses without editing the base',()=>{const p=motionPose(neutralPose,.15,true,true);expect(p.leftHip).toBeCloseTo(-p.rightHip);expect(p.leftHip).not.toBe(0);expect(neutralPose.leftHip).toBe(0);expect(motionPose(neutralPose,0,false,true)).toEqual(neutralPose);});it('preserves custom appearance and joint angles in a project',()=>{const e={...entity('character'),rig:{...defaultRig,hairStyle:'cap' as const,pose:{...neutralPose,leftShoulder:30}}};expect(parseProject(JSON.stringify({version:1,name:'Character',entities:[e]})).entities[0].rig).toEqual(e.rig);});});

it('captures joint keys, samples linearly and loops without changing authored poses',()=>{
 const a={...defaultRig,pose:{...neutralPose}},clip=captureJointPose(a,0);
 const b={...a,clip,pose:{...neutralPose,leftShoulder:60,rightKnee:-30}},next=captureJointPose(b,2);
 expect(sampleJointClip(next,1).leftShoulder).toBe(30);expect(sampleJointClip(next,3).rightKnee).toBe(-15);
 expect(sampleJointClip({...next,loop:false},9).leftShoulder).toBe(60);expect(sampleJointClip(next,NaN)).toEqual(neutralPose);
 expect(clip.keys).toHaveLength(1);expect(a.pose.leftShoulder).toBe(0);
 expect(readJointClip(next)).toEqual(next);
 const e={...entity('character'),rig:{...b,clip:next}};expect(parseProject(JSON.stringify({version:1,name:'Rig',entities:[e]})).entities[0].rig?.clip).toEqual(next);
});
it('rejects malformed, duplicate, oversized or nonzero-first joint keys',()=>{
 const key={time:0,pose:neutralPose};
 for(const keys of [[{...key,time:1}],[key,key],[key,{...key,time:61}],[{...key,pose:{...neutralPose,leftHip:121}}],Array.from({length:129},(_,i)=>({...key,time:i/10}))]){
  expect(()=>readJointClip({loop:true,keys})).toThrow();
 }
});
