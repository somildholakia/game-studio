import {describe,it,expect} from 'vitest';import {cubeMesh,readMesh,deleteVertex,subdivideFace,subdivideMesh} from './mesh';
describe('editable topology',()=>{it('subdivides a face and preserves indices',()=>{const original=cubeMesh();const next=subdivideFace(original,0);expect(next.vertices).toHaveLength(9);expect(next.triangles).toHaveLength(14);expect(original.vertices).toHaveLength(8);expect(readMesh(next)).toEqual(next);});it('remaps indices after deleting a vertex',()=>{const next=deleteVertex(cubeMesh(),0);expect(next.vertices).toHaveLength(7);expect(next.triangles.flat().every(i=>i<7)).toBe(true);});it('rejects invalid faces',()=>{const m=cubeMesh();expect(()=>readMesh({...m,triangles:[[0,0,1]]})).toThrow();expect(()=>readMesh({...m,triangles:[[0,1,999]]})).toThrow();});});

describe('whole mesh refinement',()=>{
 it('shares midpoints across adjacent triangles without changing the original',()=>{
  const original=cubeMesh(),snapshot=structuredClone(original),next=subdivideMesh(original);
  expect(next.vertices).toHaveLength(26);expect(next.triangles).toHaveLength(48);
  expect(original).toEqual(snapshot);expect(readMesh(next)).toEqual(next);
  const midpoint=next.vertices.findIndex(v=>v[0]===0&&v[1]===0&&v[2]===-.75);
  expect(midpoint).toBeGreaterThanOrEqual(8);
  expect(next.triangles.filter(t=>t.includes(midpoint))).toHaveLength(6);
  const edges=new Map<string,number>();
  for(const t of next.triangles)for(let i=0;i<3;i++){
   const key=[t[i],t[(i+1)%3]].sort((a,b)=>a-b).join(':');
   edges.set(key,(edges.get(key)??0)+1);
  }
  expect([...edges.values()].every(n=>n===2)).toBe(true);
 });
 it('rejects excessive triangle and vertex counts before returning a mesh',()=>{
  const m=cubeMesh();
  expect(()=>subdivideMesh({...m,triangles:Array.from({length:1025},()=>[0,1,2] as [number,number,number])})).toThrow('triangle limit');
  expect(()=>subdivideMesh({...m,vertices:Array.from({length:2048},()=>[0,0,0] as [number,number,number])})).toThrow('vertex limit');
 });
});
