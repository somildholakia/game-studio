import {describe,it,expect} from 'vitest';
import {cornerNormals} from './meshNormals';
import {cubeMesh} from './mesh';
describe('mesh normals',()=>{
 it('uses consistent clockwise face normals and smooth shared corners',()=>{
 const m=cubeMesh(),flat=cornerNormals(m),smooth=cornerNormals(m,true);
 expect(flat[0].map(x=>x||0)).toEqual([0,0,-1]);expect(smooth).toHaveLength(36);
 expect(smooth[0]).toEqual(smooth[3]);expect(smooth[0][0]).toBeLessThan(0);
 expect(smooth.every(n=>Math.abs(Math.hypot(...n)-1)<1e-8)).toBe(true);
 });
 it('keeps degenerate normals finite',()=>{const m={vertices:[[0,0,0],[1,0,0],[2,0,0]],triangles:[[0,1,2]]} as import('./mesh').MeshData;expect(cornerNormals(m,true)).toEqual([[0,0,0],[0,0,0],[0,0,0]]);});
});
