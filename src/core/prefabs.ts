import {duplicateEntity,type Entity,type Project} from './project';
import {validateAssets,type ModelAsset} from './assets';
export type Prefab={id:string;name:string;source:Entity};
export function savePrefab(p:Project,e:Entity):Project {
 const source=structuredClone(e);source.role=source.role==='player'?'decoration':source.role;
 return {...p,prefabs:[...(p.prefabs??[]),{id:crypto.randomUUID(),name:e.name.slice(0,200),source}]};
}
export function instantiatePrefab(prefab:Prefab):Entity {
 const instance=duplicateEntity(prefab.source);instance.name=prefab.name;return instance;
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
