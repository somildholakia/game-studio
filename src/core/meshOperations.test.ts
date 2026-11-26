import {describe,it,expect} from 'vitest';import {cubeMesh} from './mesh';import {extrudeFace,reverseFace,mirrorMesh,weldVertices,meshToObj} from './meshOperations';
describe('mesh operations',()=>{
 it('extrudes a triangle with a cap and six connecting faces',()=>{const m=cubeMesh(),n=extrudeFace(m,0,.5);expect(n.vertices).toHaveLength(11);expect(n.triangles).toHaveLength(18);expect(n.vertices[8][2]).toBeCloseTo(-1.25);expect(m.vertices).toHaveLength(8);});
 it('reflects geometry and reverses winding',()=>{const m=cubeMesh(),n=mirrorMesh(m,0);expect(n.vertices[0][0]).toBe(-m.vertices[0][0]);expect(n.triangles[0]).toEqual(reverseFace(m,0).triangles[0]);});
 it('merges near duplicate vertices and removes collapsed faces',()=>{const m=cubeMesh();m.vertices.push([...m.vertices[0]]);m.triangles.push([8,1,2],[0,8,3]);expect(weldVertices(m,.001)).toEqual(cubeMesh());});
 it('rejects degenerate faces and writes portable OBJ indices',()=>{expect(()=>extrudeFace({vertices:[[0,0,0],[1,0,0],[2,0,0]],triangles:[[0,1,2]]},0,1)).toThrow();const obj=meshToObj(cubeMesh());expect(obj).toContain('v -0.75 -0.75 0.75');expect(obj).toContain('f 1 2 3');});
});
