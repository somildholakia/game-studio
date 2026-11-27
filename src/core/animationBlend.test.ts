import {describe,it,expect} from 'vitest';
import {defaultRig,neutralPose,joints,readRig,retargetJointClip,sampleRig,rigDuration,type JointClip} from './characterRig';
import {entity,parseProject} from './project';
const a:JointClip={loop:false,keys:[{time:0,pose:{...neutralPose}},{time:2,pose:{...neutralPose,leftElbow:80}}]};
const b:JointClip={loop:false,keys:[{time:0,pose:{...neutralPose,rightElbow:40}},{time:4,pose:{...neutralPose,rightElbow:120}}]};
describe('animation blending and retargeting',()=>{
 it('blends independently sampled clips with speed and clamp',()=>{const r={...defaultRig,clip:a,blend:{clip:b,weight:.5,speed:2}};expect(rigDuration(r)).toBe(2);expect(sampleRig(r,1).leftElbow).toBe(20);expect(sampleRig(r,1).rightElbow).toBe(40);expect(sampleRig({...r,blend:{...r.blend,weight:0}},1).leftElbow).toBe(40);expect(sampleRig({...r,blend:{...r.blend,weight:1}},1).rightElbow).toBe(80);});
 it('retargets named source channels with sign and rest offset, without sharing data',()=>{const mapping=Object.fromEntries(joints.map(j=>[j,{source:'src_'+j,sign:j==='leftElbow'?-1:1,offset:j==='head'?10:0}]));const input={loop:false,keys:[{time:0,pose:Object.fromEntries(joints.map(j=>['src_'+j,j==='leftElbow'?30:0]))}]};const clip=retargetJointClip(input,mapping);expect(clip.keys[0].pose.leftElbow).toBe(-30);expect(clip.keys[0].pose.head).toBe(10);expect(()=>retargetJointClip(input,{})).toThrow(/mapping/);expect(()=>retargetJointClip({...input,keys:[{time:0,pose:{}}]},mapping)).toThrow(/channel/);});
 it('validates and persists both clips on different character proportions',()=>{const rig={...defaultRig,clip:a,blend:{clip:b,weight:.25,speed:1}};const p={version:1,name:'Blend',entities:[{...entity('character'),rig,character:{bodyWidth:1.3,headSize:.8,limbLength:1.4}}]};expect(parseProject(JSON.stringify(p)).entities[0].rig).toEqual(rig);expect(()=>readRig({...rig,blend:{...rig.blend,weight:2}})).toThrow();});
});
