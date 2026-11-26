import {describe,it,expect} from 'vitest';
import {validateGlb,validateAssets,type ModelAsset} from './assets';
import {entity,initialProject,parseProject,replaceEntity} from './project';
import {addModel,removeModel,savePrefab,instantiatePrefab,countInstances,updatePrefab,removePrefab,detachPrefab} from './prefabs';
function glb(document:object):Uint8Array<ArrayBuffer>{
 const json=new TextEncoder().encode(JSON.stringify(document));const n=Math.ceil(json.length/4)*4;
 const bytes=new Uint8Array(20+n);const view=new DataView(bytes.buffer);
 view.setUint32(0,0x46546c67,true);view.setUint32(4,2,true);view.setUint32(8,bytes.length,true);view.setUint32(12,n,true);view.setUint32(16,0x4e4f534a,true);
 bytes.fill(32,20);bytes.set(json,20);return bytes;
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
