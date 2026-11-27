import {describe,it,expect} from 'vitest';
import {entity,parseProject,type Project} from './project';
import {applyMaterial,builtInMaterials,captureMaterial,readMaterialLibrary,MAX_MATERIAL_PRESETS} from './materialLibrary';
import {start,commit,undo,redo} from './history';
import {addScene} from './scenes';
describe('material library',()=>{
 it('validates built-ins and copies independently without changing geometry or identity',()=>{
 const e=entity('box'),p=builtInMaterials[3],copy=applyMaterial(e,p);
 expect(copy.id).toBe(e.id);expect(copy.position).toEqual(e.position);expect(e.material).toBeUndefined();
 expect(copy.material).toEqual(p.material);copy.material!.texture!.repeatU=2;expect(p.material.texture!.repeatU).toBe(4);
 });
 it('persists project-wide named snapshots and history through scene changes',()=>{
 const source=applyMaterial(entity('box'),builtInMaterials[0]);const p:Project={version:1,name:'test',entities:[source]};
 const saved={...p,materialPresets:[captureMaterial(' Steel ',source)]};const h=commit(start(p),saved);
 expect(undo(h).present.materialPresets).toBeUndefined();expect(redo(undo(h)).present.materialPresets).toEqual(saved.materialPresets);
 const restored=parseProject(JSON.stringify(addScene(saved,'Other')));
 expect(restored.materialPresets).toEqual(saved.materialPresets);
 });
 it('rejects duplicate names, oversized libraries, invalid values and images',()=>{
 const p=builtInMaterials[0];expect(()=>readMaterialLibrary([p,{...p,name:p.name.toUpperCase()}])).toThrow(/Duplicate/);
 expect(()=>readMaterialLibrary(Array.from({length:MAX_MATERIAL_PRESETS+1},(_,i)=>({...p,name:String(i)})))).toThrow(/size/);
 expect(()=>readMaterialLibrary([{...p,material:{...p.material,roughness:2}}])).toThrow();
 expect(()=>readMaterialLibrary([{...p,material:{...p.material,imageTexture:{}}}])).toThrow();
 expect(()=>parseProject(JSON.stringify({version:1,name:'bad',entities:[],materialPresets:[{...p,color:'red'}]}))).toThrow();
 });
});
