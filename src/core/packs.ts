import {parseProject,type Project} from './project';
import {type ModelAsset,validateAssets} from './assets';
import type {Prefab} from './prefabs';
import {readLogic,type Rule} from '../runtime/rules';
export type Pack={format:'game-studio-pack';version:1;name:string;assets:ModelAsset[];prefabs:Prefab[];rules:Rule[]};
export function createPack(project:Project,name:string):Pack{
 const p=parseProject(JSON.stringify(project));const prefabs=p.prefabs??[];
 const referenced=new Set(prefabs.map(f=>f.source.assetId).filter(Boolean));
 return readPack(JSON.stringify({format:'game-studio-pack',version:1,name,assets:(p.assets??[]).filter(a=>referenced.has(a.id)),prefabs,rules:(p.logic?.rules??[]).filter(r=>r.sourceId===undefined)}));
}
export function readPack(raw:string):Pack{
 if(raw.length>8_000_000)throw Error('Pack is too large');const p=JSON.parse(raw);
 if(!p||p.format!=='game-studio-pack'||p.version!==1||typeof p.name!=='string'||!p.name.trim()||p.name.length>200||!Array.isArray(p.assets)||!Array.isArray(p.prefabs)||!Array.isArray(p.rules))throw Error('Invalid pack');
 const normalized=parseProject(JSON.stringify({version:1,name:p.name,entities:[],assets:p.assets,prefabs:p.prefabs,logic:{autoWin:true,rules:p.rules}}));
 if(normalized.logic!.rules.some(r=>r.sourceId!==undefined))throw Error('Extension packs cannot contain level-specific event object references');
 return {format:'game-studio-pack',version:1,name:p.name,assets:normalized.assets!,prefabs:normalized.prefabs!,rules:normalized.logic!.rules};
}
export function installPack(project:Project,pack:Pack):Project{
 const safe=readPack(JSON.stringify(pack));const assets=new Map((project.assets??[]).map(a=>[a.id,a]));
 for(const a of safe.assets){const old=assets.get(a.id);if(old&&old.data!==a.data)throw Error('Asset identity conflict');if(!old)assets.set(a.id,a);}
 const prefabs=[...(project.prefabs??[]),...safe.prefabs.map(f=>({...structuredClone(f),id:crypto.randomUUID()}))];
 const logic=readLogic({autoWin:project.logic?.autoWin??true,maxLives:project.logic?.maxLives,rules:[...(project.logic?.rules??[]),...safe.rules.map(r=>({...structuredClone(r),id:crypto.randomUUID()}))]});
 return parseProject(JSON.stringify({...project,assets:validateAssets([...assets.values()]),prefabs,logic}));
}
