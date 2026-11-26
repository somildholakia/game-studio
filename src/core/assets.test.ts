import {describe,it,expect} from 'vitest';
import {validateGlb,validateAssets,type ModelAsset} from './assets';
import {entity,initialProject,parseProject,replaceEntity} from './project';
import {addModel,removeModel,savePrefab,instantiatePrefab,countInstances,updatePrefab,removePrefab,detachPrefab} from './prefabs';
function glb(document:object,binLength=0):Uint8Array<ArrayBuffer>{
 const json=new TextEncoder().encode(JSON.stringify(document));const n=Math.ceil(json.length/4)*4;
 const bytes=new Uint8Array(20+n+(binLength?8+binLength:0));const view=new DataView(bytes.buffer);
 view.setUint32(0,0x46546c67,true);view.setUint32(4,2,true);view.setUint32(8,bytes.length,true);view.setUint32(12,n,true);view.setUint32(16,0x4e4f534a,true);
 bytes.fill(32,20,20+n);bytes.set(json,20);if(binLength){view.setUint32(20+n,binLength,true);view.setUint32(24+n,0x004e4942,true);}return bytes;
}
const minimal={asset:{version:'2.0'},meshes:[{primitives:[]}]};
function model():ModelAsset {return {id:'sha256:'+'a'.repeat(64),name:'fixture.glb',format:'glb',data:btoa(String.fromCharCode(...glb(minimal)))};}
describe('asset policy',()=>{
 it('accepts a GLB envelope and rejects malformed files',()=>{expect(()=>validateGlb(glb(minimal))).not.toThrow();expect(()=>validateGlb(new Uint8Array(5))).toThrow();});
 it('rejects external URIs and extensions',()=>{expect(()=>validateGlb(glb({...minimal,images:[{uri:'https://example.com/a.png'}]}))).toThrow();expect(()=>validateGlb(glb({...minimal,extensionsUsed:['KHR_draco_mesh_compression']}))).toThrow();});
 it('rejects duplicates and missing model references',()=>{const a=model();expect(()=>validateAssets([a,a])).toThrow();const p=initialProject();p.entities.push({...entity('model'),assetId:a.id});expect(()=>parseProject(JSON.stringify(p))).toThrow();});
 it('preserves embedded assets and blocks removal while referenced',()=>{const a=model();let p=addModel(initialProject(),a);expect(addModel(p,a)).toBe(p);const e={...entity('model'),assetId:a.id};p=savePrefab(p,e);expect(()=>removeModel(p,a.id)).toThrow();expect(parseProject(JSON.stringify(p)).assets).toEqual([a]);});
});
describe('reusable prefabs and characters',()=>{
 it('creates independent snapshots and unique instances',()=>{const e=entity('character');const p=savePrefab(initialProject(),e);const f=p.prefabs![0];const a=instantiatePrefab(f),b=instantiatePrefab(f);expect(a.id).not.toBe(b.id);a.character!.headSize=1.2;expect(b.character!.headSize).toBe(1);expect(f.source.character!.headSize).toBe(1);});
 it('preserves character settings and rejects invalid proportions',()=>{let p=initialProject();const e=entity('character');p.entities.push(e);p=replaceEntity(p,{...e,character:{bodyWidth:1.2,headSize:.8,limbLength:1.1}});expect(parseProject(JSON.stringify(p)).entities.at(-1)?.character?.bodyWidth).toBe(1.2);p.entities.at(-1)!.character!.headSize=99;expect(()=>parseProject(JSON.stringify(p))).toThrow();});
});

it('updates linked appearance across levels without modifying placement or gameplay',()=>{
 let p=savePrefab(initialProject(),entity('box'));const f=p.prefabs![0];const a=instantiatePrefab(f,true),b=instantiatePrefab(f,true),c=instantiatePrefab(f);
 a.role='solid';a.position=[5,2,1];b.position=[7,2,1];p={...p,entities:[a,c],levels:[{id:'second',name:'Second',entities:[b]}]};
 expect(countInstances(p,f.id)).toBe(2);const next=updatePrefab(p,f.id,{...a,color:'#ff0000'});
 expect(next.entities[0].color).toBe('#ff0000');expect(next.entities[0].position).toEqual([5,2,1]);expect(next.entities[0].role).toBe('solid');expect(next.entities[1].color).toBe(c.color);expect(next.levels![0].entities[0].color).toBe('#ff0000');expect(p.entities[0].color).not.toBe('#ff0000');
 expect(parseProject(JSON.stringify(next)).entities[0].prefabId).toBe(f.id);
 expect(detachPrefab(next.entities[0]).prefabId).toBeUndefined();const removed=removePrefab(next,f.id);expect(countInstances(removed,f.id)).toBe(0);expect(removed.entities).toHaveLength(2);
 expect(()=>parseProject(JSON.stringify({...next,prefabs:[]}))).toThrow();
});

describe('GLB decoded resource budgets',()=>{
 const accessor={count:3,type:'VEC3',componentType:5126,bufferView:0};
 const embedded={...minimal,buffers:[{byteLength:36}],bufferViews:[{buffer:0,byteLength:36}],accessors:[accessor]};
 it('accepts bounded binary geometry and rejects a missing or oversized buffer',()=>{
  expect(()=>validateGlb(glb(embedded,36))).not.toThrow();
  expect(()=>validateGlb(glb(embedded))).toThrow();
  expect(()=>validateGlb(glb({...embedded,buffers:[{byteLength:40}]},36))).toThrow();
  expect(()=>validateGlb(glb({...embedded,bufferViews:[{buffer:0,byteOffset:4,byteLength:36}]},36))).toThrow();
 });
 it('rejects accessor ranges outside the view and invalid references',()=>{
  for(const a of [{...accessor,count:4},{...accessor,bufferView:1},{...accessor,byteOffset:4},{...accessor,type:'toString'},{...accessor,componentType:123}]){
   expect(()=>validateGlb(glb({...embedded,accessors:[a]},36))).toThrow();
  }
 });
 it('validates strided and sparse accessors',()=>{
  expect(()=>validateGlb(glb({...embedded,bufferViews:[{buffer:0,byteLength:36,byteStride:16}]},36))).toThrow();
  expect(()=>validateGlb(glb({...embedded,accessors:[{count:3,type:'VEC3',componentType:5126,sparse:{count:1,indices:{bufferView:1,componentType:5121},values:{bufferView:0}}}]},36))).toThrow();
 });
 it('rejects huge and cumulative implicit zero-filled accessor allocations',()=>{
  const zero={type:'VEC4',componentType:5126,count:250000};
  expect(()=>validateGlb(glb({...minimal,accessors:[{...zero,count:250001}]}))).toThrow();
  expect(()=>validateGlb(glb({...minimal,accessors:Array.from({length:5},()=>zero)}))).toThrow();
  expect(()=>validateGlb(glb({...minimal,accessors:[zero]}))).not.toThrow();
 });
});

describe('GLB scene graph safety',()=>{
 it('accepts bounded trees and shared meshes across independent nodes',()=>{
  expect(()=>validateGlb(glb({...minimal,nodes:[{children:[1,2]},{mesh:0},{mesh:0}],scenes:[{nodes:[0]},{nodes:[0]}],scene:1}))).not.toThrow();
 });
 it('rejects cycles, repeated children, multiple parents and bad references',()=>{
  for(const nodes of [[{children:[0]}],[{children:[1]},{children:[0]}],[{children:[1,1]},{}],[{children:[2]},{children:[2]},{}],[{children:[4]}],[{mesh:1}],[null]]){
   expect(()=>validateGlb(glb({...minimal,nodes}))).toThrow();
  }
 });
 it('rejects invalid scene roots and selected scenes',()=>{
  const nodes=[{children:[1]},{}];
  for(const scenes of [[{nodes:[1]}],[{nodes:[0,0]}],[{nodes:[2]}],[null]]){
   expect(()=>validateGlb(glb({...minimal,nodes,scenes}))).toThrow();
  }
  expect(()=>validateGlb(glb({...minimal,nodes,scenes:[{nodes:[0]}],scene:1}))).toThrow();
 });
 it('enforces depth, node and repeated primitive budgets',()=>{
  const chain=(length:number)=>Array.from({length},(_,i)=>i+1<length?{children:[i+1]}:{});
  expect(()=>validateGlb(glb({...minimal,nodes:chain(64)}))).not.toThrow();
  expect(()=>validateGlb(glb({...minimal,nodes:chain(65)}))).toThrow();
  expect(()=>validateGlb(glb({...minimal,nodes:Array.from({length:2049},()=>({}))}))).toThrow();
  const meshes=[{primitives:Array.from({length:32},()=>({}))}];
  expect(()=>validateGlb(glb({...minimal,meshes,nodes:Array.from({length:129},()=>({mesh:0}))}))).toThrow();
 });
});
