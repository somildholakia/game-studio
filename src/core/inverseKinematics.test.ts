import {describe,it,expect} from 'vitest';
import {neutralPose,readRig,defaultRig} from './characterRig';
import {solveLimb,limbEndpoint,limbs} from './inverseKinematics';
describe('two-link inverse kinematics',()=>{
 it('solves both bend directions without modifying unrelated joints',()=>{
 for(const bend of [-1,1] as const){const p=solveLimb({...neutralPose,head:12},'left arm',1,1,bend);const [d,f]=limbEndpoint(p.leftShoulder,p.leftElbow);expect(d).toBeCloseTo(1,8);expect(f).toBeCloseTo(1,8);expect(Math.sign(p.leftElbow)).toBe(bend);expect(p.head).toBe(12);expect(p.rightShoulder).toBe(0);expect(readRig({...defaultRig,pose:p}).pose).toEqual(p);}
 });
 it('supports every arm and leg at full extension',()=>{for(const limb of limbs)expect(solveLimb(neutralPose,limb,2,0,1)).toEqual(neutralPose);});
 it('rejects unreachable, singular, nonfinite and joint-limited targets',()=>{for(const [d,f] of [[2,2],[0,0],[.1,0],[-2,0],[NaN,1]])expect(()=>solveLimb(neutralPose,'left leg',d,f,1)).toThrow();});
 it('reaches a range of valid generated targets',()=>{for(let a=-60;a<=60;a+=15)for(let b=15;b<=90;b+=15){const [d,f]=limbEndpoint(a,b);const p=solveLimb(neutralPose,'right leg',d,f,1);expect(p.rightHip).toBeCloseTo(a,7);expect(p.rightKnee).toBeCloseTo(b,7);}});
});
