import {describe,it,expect} from 'vitest';
import {eulerQuaternion,integrateAngular,inverseInertia,rotate,rotatedHalf,solveAngularContact,type InertialBody} from './angularContacts';
describe('angular contact primitives',()=>{
 it('integrates normalized quaternion orientation in world coordinates',()=>{
  let state={orientation:eulerQuaternion([0,0,0]),angularVelocity:[0,0,Math.PI] as [number,number,number]};
  for(let i=0;i<120;i++)state=integrateAngular(state,1/120,0);
  expect(Math.hypot(...state.orientation)).toBeCloseTo(1,12);expect(rotate(state.orientation,[1,0,0])[0]).toBeCloseTo(-1,10);
  expect(rotatedHalf(eulerQuaternion([0,0,Math.PI/2]),[2,1,.5])).toEqual(expect.arrayContaining([expect.closeTo(1),expect.closeTo(2),expect.closeTo(.5)]));
 });
 it('transfers tangential momentum into rolling spin and respects friction cap',()=>{
  const a:InertialBody={mass:1,position:[0,1,0],velocity:[4,-2,0],angular:{orientation:[0,0,0,1],angularVelocity:[0,0,0]},inverseInertia:inverseInertia(1,[1,1,1],true)};
  const result=solveAngularContact(a,null,[0,-1,0],[0,0,0],[0,1,0],0,1);
  expect(result.normalImpulse).toBeCloseTo(2);expect(result.tangentImpulse).toBeLessThanOrEqual(2);expect(a.velocity[1]).toBeCloseTo(0);expect(a.angular!.angularVelocity[2]).toBeLessThan(0);expect(a.velocity[0]+a.angular!.angularVelocity[2]).toBeCloseTo(0);
 });
 it('creates opposite linear impulses at an off-center dynamic contact',()=>{
  const a:InertialBody={mass:1,position:[0,0,0],velocity:[3,0,0],angular:{orientation:[0,0,0,1],angularVelocity:[0,0,0]},inverseInertia:inverseInertia(1,[1,1,1])};
  const b:InertialBody={mass:2,position:[2,1,0],velocity:[0,0,0],angular:{orientation:[0,0,0,1],angularVelocity:[0,0,0]},inverseInertia:inverseInertia(2,[1,1,1])};
  solveAngularContact(a,b,[1,.5,0],[-1,-.5,0],[-1,0,0],.2,.4);expect(a.velocity[0]+2*b.velocity[0]).toBeCloseTo(3);expect(Math.abs(a.angular!.angularVelocity[2])).toBeGreaterThan(0);expect(Math.abs(b.angular!.angularVelocity[2])).toBeGreaterThan(0);
 });
 it('does not pull separating contacts together',()=>{
  const a:InertialBody={mass:1,position:[0,0,0],velocity:[0,1,0]};expect(solveAngularContact(a,null,[0,-1,0],[0,0,0],[0,1,0],.9,1)).toEqual({normalImpulse:0,tangentImpulse:0});
 });
});
