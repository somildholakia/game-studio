import {describe,it,expect} from 'vitest';
import {entity} from '../core/project';
import {bounds} from './collision';
describe('custom mesh bounds',()=>{
 it('transforms offset vertices, negative scale and rotation, ignoring unused vertices',()=>{
  const e=entity('mesh');e.mesh={vertices:[[1,0,0],[3,0,0],[1,2,0],[999,999,999]],triangles:[[0,1,2]]};
  e.scale=[-2,1,1];e.rotation=[0,0,Math.PI/2];e.position=[10,20,30];
  const b=bounds(e);expect(b.center[0]).toBeCloseTo(9);expect(b.center[1]).toBeCloseTo(16);expect(b.center[2]).toBeCloseTo(30);
  expect(b.half[0]).toBeCloseTo(1);expect(b.half[1]).toBeCloseTo(2);expect(b.half[2]).toBe(.005);
 });
});
