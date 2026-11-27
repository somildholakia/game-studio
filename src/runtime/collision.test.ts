import {describe,it,expect} from 'vitest';
import {entity} from '../core/project';
import {bounds,indexBounds,moveAxis,combineBounds,type Bounds} from './collision';
describe('custom mesh bounds',()=>{
 it('transforms offset vertices, negative scale and rotation, ignoring unused vertices',()=>{
  const e=entity('mesh');e.mesh={vertices:[[1,0,0],[3,0,0],[1,2,0],[999,999,999]],triangles:[[0,1,2]]};
  e.scale=[-2,1,1];e.rotation=[0,0,Math.PI/2];e.position=[10,20,30];
  const b=bounds(e);expect(b.center[0]).toBeCloseTo(9);expect(b.center[1]).toBeCloseTo(16);expect(b.center[2]).toBeCloseTo(30);
  expect(b.half[0]).toBeCloseTo(1);expect(b.half[1]).toBeCloseTo(2);expect(b.half[2]).toBe(.005);
 });
});

describe('static collision broad phase',()=>{
 it('matches brute force across signed positions, axes, sweeps and giant fallback colliders',()=>{
  const items:Bounds[]=Array.from({length:1500},(_,i)=>({center:[(i%30-15)*5,((i*13)%11-5)*4,(Math.floor(i/30)-25)*6],half:[1+(i%5),.5+(i%3),1]}));
  items.push({center:[0,0,0],half:[2000,.3,2000]});
  const index=indexBounds(items),half:[number,number,number]=[.75,.75,.75];
  for(let i=0;i<200;i++){const p:[number,number,number]=[(i*13)%90-45,(i*7)%20-10,(i*17)%120-60];for(const axis of [0,1,2] as const)for(const delta of [-14,-.04,.04,14])expect(moveAxis(p,half,axis,delta,index)).toEqual(moveAxis(p,half,axis,delta,items));}
  expect(moveAxis([0,1,0],half,1,-100000,index)).toEqual(moveAxis([0,1,0],half,1,-100000,items));
 });
 it('culls distant colliders while retaining dynamically supplied bounds',()=>{
  const items:Bounds[]=Array.from({length:2000},(_,i)=>({center:[i*20,0,0],half:[1,1,1]}));const index=indexBounds(items);
  expect(index.query([0,0,0],[.75,.75,.75],0,4).length).toBeLessThan(10);
  const gate:Bounds={center:[4,0,0],half:[.5,1,1]};
  expect(moveAxis([2,0,0],[.5,.5,.5],0,4,combineBounds(index,[gate])).position).toBe(3);
 });
});
