import {duplicateEntity,parseProject,type Entity,type Project} from './project';
import {validateAssets,type ModelAsset} from './assets';
export type Prefab={id:string;name:string;source:Entity};
export function savePrefab(p:Project,e:Entity):Project {
 const source=structuredClone(e);delete source.prefabId;source.role=source.role==='player'?'decoration':source.role;
 return {...p,prefabs:[...(p.prefabs??[]),{id:crypto.randomUUID(),name:e.name.slice(0,200),source}]};
}
export function instantiatePrefab(prefab:Prefab,linked=false):Entity {
 const instance=duplicateEntity(prefab.source);instance.name=prefab.name;if(linked)instance.prefabId=prefab.id;return instance;
}
export function addModel(p:Project,asset:ModelAsset):Project{
 const existing=(p.assets??[]).find(a=>a.id===asset.id);
 if(existing&&existing.data!==asset.data)throw Error('Model identity conflict');
 return existing?p:{...p,assets:validateAssets([...(p.assets??[]),asset])};
}
export function removeModel(p:Project,id:string):Project {
 if(p.entities.some(e=>e.assetId===id)||p.levels?.some(l=>l.entities.some(e=>e.assetId===id))||p.prefabs?.some(f=>f.source.assetId===id))throw Error('Remove all scene and prefab references first.');
 return {...p,assets:(p.assets??[]).filter(a=>a.id!==id)};
}

export function countInstances(p:Project,id:string):number{return [...p.entities,...(p.levels??[]).flatMap(l=>l.entities)].filter(e=>e.prefabId===id).length;}
export function updatePrefab(p:Project,id:string,selected:Entity):Project{
 const old=p.prefabs?.find(f=>f.id===id);if(!old||selected.kind!==old.source.kind)throw Error('Select an object of the same kind as the prefab');
 const source=structuredClone(selected);delete source.prefabId;if(source.role==='player')source.role='decoration';
 // Explicit propagation updates reusable appearance, while preserving local gameplay and placement.
 const apply=(e:Entity):Entity=>e.prefabId!==id?e:{...e,color:source.color,material:structuredClone(source.material),shader:structuredClone(source.shader),character:structuredClone(source.character),rig:structuredClone(source.rig),mesh:structuredClone(source.mesh),uvProjection:source.uvProjection,smoothNormals:source.smoothNormals,terrain:structuredClone(source.terrain),assetId:source.assetId};
 return parseProject(JSON.stringify({...p,prefabs:p.prefabs!.map(f=>f.id===id?{...f,source}:f),entities:p.entities.map(apply),levels:p.levels?.map(l=>({...l,entities:l.entities.map(apply)}))}));
}
export function detachPrefab(e:Entity):Entity{const next={...e};delete next.prefabId;return next;}
export function removePrefab(p:Project,id:string):Project{
 const detach=(e:Entity)=>e.prefabId===id?detachPrefab(e):e;
 return {...p,prefabs:(p.prefabs??[]).filter(f=>f.id!==id),entities:p.entities.map(detach),levels:p.levels?.map(l=>({...l,entities:l.entities.map(detach)}))};
}
