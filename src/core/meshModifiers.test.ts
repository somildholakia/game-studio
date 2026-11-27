import {describe,it,expect} from 'vitest';
import {boxBoolean,evaluateModifiers,readMeshModifierState} from './meshModifiers';
import {cubeMesh} from './mesh';
import {entity,parseProject,type Vec3} from './project';
import type {MeshData} from './mesh';
function volume(m:MeshData){let v=0;for(const f of m.triangles){const [a,b,c]=f.map(i=>m.vertices[i]);v+=a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]);}return Math.abs(v)/6;}
describe('non-destructive mesh modifiers',()=>{
 it('evaluates ordered subdivision and mirror without changing source',()=>{const source=cubeMesh(),original=JSON.stringify(source);const mesh=evaluateModifiers(source,[{kind:'subdivide'},{kind:'mirror',axis:0}]);expect(mesh.triangles).toHaveLength(48);expect(mesh.vertices).toHaveLength(26);expect(JSON.stringify(source)).toBe(original);});
 it('computes exact union, intersection and difference volumes for overlapping cuboids',()=>{const cube=cubeMesh(),center:Vec3=[.75,0,0],size:Vec3=[1.5,1.5,1.5];expect(volume(boxBoolean(cube,'union',center,size))).toBeCloseTo(5.0625,8);expect(volume(boxBoolean(cube,'intersection',center,size))).toBeCloseTo(1.6875,8);expect(volume(boxBoolean(cube,'difference',center,size))).toBeCloseTo(1.6875,8);});
 it('cuts a through-hole, rejects empty and touching results and validates limits',()=>{const cube=cubeMesh();expect(volume(boxBoolean(cube,'difference',[0,0,0],[.5,.5,2]))).toBeCloseTo(3,8);expect(()=>boxBoolean(cube,'intersection',[5,0,0],[1,1,1])).toThrow(/empty/);expect(()=>boxBoolean(cube,'union',[1.5,0,0],[1.5,1.5,1.5])).toThrow(/Touching/);expect(()=>boxBoolean(evaluateModifiers(cube,[{kind:'subdivide'}]),'union',[0,0,0],[1,1,1])).toThrow(/topology/);expect(()=>evaluateModifiers(cube,Array.from({length:5},()=>({kind:'subdivide'})))).toThrow();});
 it('persists source and derives the evaluated mesh, rejecting a stale cache',()=>{const result=readMeshModifierState({source:cubeMesh(),steps:[{kind:'subdivide'}]});const p={version:1,name:'Modifiers',entities:[{...entity('mesh'),mesh:result.mesh,meshModifiers:result.state}]};const restored=parseProject(JSON.stringify(p));expect(restored.entities[0].meshModifiers).toEqual(result.state);expect(restored.entities[0].mesh).toEqual(result.mesh);expect(()=>parseProject(JSON.stringify({...p,entities:[{...p.entities[0],mesh:cubeMesh()}]}))).toThrow(/cache/);});
});
