import {describe,it,expect} from 'vitest';import {cubeMesh} from './mesh';import {extrudeFace,reverseFace,mirrorMesh,weldVertices,cleanMesh,reverseMesh,smoothSubdivision,meshToObj,meshFromObj} from './meshOperations';
describe('mesh operations',()=>{
 it('extrudes a triangle with a cap and six connecting faces',()=>{const m=cubeMesh(),n=extrudeFace(m,0,.5);expect(n.vertices).toHaveLength(11);expect(n.triangles).toHaveLength(18);expect(n.vertices[8][2]).toBeCloseTo(-1.25);expect(m.vertices).toHaveLength(8);});
 it('reflects geometry and reverses winding',()=>{const m=cubeMesh(),n=mirrorMesh(m,0);expect(n.vertices[0][0]).toBe(-m.vertices[0][0]);expect(n.triangles[0]).toEqual(reverseFace(m,0).triangles[0]);});
 it('merges near duplicate vertices and removes collapsed faces',()=>{const m=cubeMesh();m.vertices.push([...m.vertices[0]]);m.triangles.push([8,1,2],[0,8,3]);expect(weldVertices(m,.001)).toEqual(cubeMesh());});
 it('rejects degenerate faces and writes portable OBJ indices',()=>{expect(()=>extrudeFace({vertices:[[0,0,0],[1,0,0],[2,0,0]],triangles:[[0,1,2]]},0,1)).toThrow();const obj=meshToObj(cubeMesh());expect(obj).toContain('v -0.75 -0.75 0.75');expect(obj).toContain('f 1 2 3');});
});

it('round trips geometry through OBJ',()=>{const mesh=cubeMesh();expect(meshFromObj(meshToObj(mesh))).toEqual(mesh);});
it('supports negative face indices and ignores external references without fetching',()=>{const m=meshFromObj('mtllib https://example.com/material.mtl\nv 0 0 0\nv 1 0 0\nv 1 1 0\nv 0 1 0\nf -4 -3 -2 -1');expect(m.triangles).toEqual([[0,1,2],[0,2,3]]);expect(()=>meshFromObj('v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 99')).toThrow();});

it('cleans duplicates, zero-area triangles and unused vertices with stable remapping',()=>{
 const m={vertices:[[9,9,9],[0,0,0],[1,0,0],[0,1,0],[2,0,0]] as import('./project').Vec3[],triangles:[[1,2,3],[1,3,2],[1,2,4]] as [number,number,number][]};
 const result=cleanMesh(m);
 expect(result).toEqual({vertices:[[0,0,0],[1,0,0],[0,1,0]],triangles:[[0,1,2]]});
 expect(m.vertices).toHaveLength(5);expect(cleanMesh(result)).toEqual(result);
 expect(()=>cleanMesh({...m,triangles:[[1,2,4]]})).toThrow('Cleanup would remove every triangle');
});
it('reverses all face winding and is an involution',()=>{
 const m=cubeMesh(),r=reverseMesh(m);expect(r.vertices).toEqual(m.vertices);
 expect(r.triangles[0]).toEqual([0,2,1]);expect(reverseMesh(r)).toEqual(m);
});

it('smoothly subdivides a closed cube with shared edge vertices and preserves input',()=>{
 const m=cubeMesh(),before=JSON.stringify(m),r=smoothSubdivision(m);
 expect(r.vertices).toHaveLength(26);expect(r.triangles).toHaveLength(48);
 expect(r.vertices[0]).not.toEqual(m.vertices[0]);expect(r.vertices.every(v=>v.every(n=>Math.abs(n)<=.75))).toBe(true);
 expect(JSON.stringify(m)).toBe(before);expect(smoothSubdivision(r).triangles).toHaveLength(192);
});
it('uses Loop boundary weights on an open triangle',()=>{
 const m={vertices:[[0,0,0],[2,0,0],[0,2,0]],triangles:[[0,1,2]]} as import('./mesh').MeshData;
 const r=smoothSubdivision(m);
 expect(r.vertices).toEqual([[.25,.25,0],[1.5,.25,0],[.25,1.5,0],[1,0,0],[1,1,0],[0,1,0]]);
 expect(r.triangles).toEqual([[0,3,5],[3,1,4],[5,4,2],[3,4,5]]);
});
it('rejects duplicate faces, inconsistent winding, nonmanifold vertex fans and unused vertices',()=>{
 const m=cubeMesh();
 expect(()=>smoothSubdivision({...m,triangles:[...m.triangles,m.triangles[0]]})).toThrow('manifold');
 expect(()=>smoothSubdivision(reverseFace(m,0))).toThrow('manifold');
 expect(()=>smoothSubdivision({...m,vertices:[...m.vertices,[9,9,9]]})).toThrow('unused');
 const bow={vertices:[[0,0,0],[1,0,0],[0,1,0],[-1,0,0],[0,-1,0]],triangles:[[0,1,2],[0,3,4]]} as import('./mesh').MeshData;
 expect(()=>smoothSubdivision(bow)).toThrow('manifold');
});
it('enforces subdivision triangle quotas before allocating topology',()=>{
 const m=cubeMesh();expect(()=>smoothSubdivision({...m,triangles:Array.from({length:1025},()=>m.triangles[0])})).toThrow('triangle limit');
});
