import {validateAssets,type ModelAsset} from './assets';
import {readPhysics,type PhysicsSettings} from '../runtime/physicsSettings';
import {readLogic,type Logic} from '../runtime/rules';
import {readClip,type Clip} from './animation';
import type {Prefab} from './prefabs';
export type Vec3=[number,number,number];
export const roles=['decoration','player','solid','collectible','goal'] as const;
export type Role=typeof roles[number];
export const kinds=['box','sphere','ground','cylinder','cone','torus','character','model'] as const;
export type CharacterStyle={bodyWidth:number;headSize:number;limbLength:number};
export type MaterialStyle={metallic:number;roughness:number;emissive:string};
export type Entity={id:string;name:string;kind:typeof kinds[number];position:Vec3;rotation:Vec3;scale:Vec3;color:string;role?:Role;assetId?:string;character?:CharacterStyle;material?:MaterialStyle;animation?:Clip};
export type Project={version:1;name:string;entities:Entity[];assets?:ModelAsset[];prefabs?:Prefab[];physics?:PhysicsSettings;logic?:Logic};
export function entity(kind:Entity['kind']):Entity {
 return {id:crypto.randomUUID(),name:kind,kind,position:[0,kind==='ground'?0:1,0],rotation:[0,0,0],scale:[1,1,1],color:'#6688bb',role:'decoration',...(kind==='character'?{character:{bodyWidth:1,headSize:1,limbLength:1}}:{})};
}
export function initialProject():Project {return {version:1,name:'Untitled world',entities:[entity('ground'),entity('box')],assets:[],prefabs:[]};}
export function replaceEntity(p:Project,e:Entity):Project {return {...p,entities:p.entities.map(x=>x.id===e.id?e:e.role==='player'&&e.role===x.role?{...x,role:'decoration'}:x)};}
export function duplicateEntity(e:Entity):Entity {return {...structuredClone(e),id:crypto.randomUUID(),name:(e.name+' copy').slice(0,200),role:e.role==='player'?'decoration':e.role,position:[Math.min(100000,e.position[0]+1),e.position[1],e.position[2]]};}
const vec=(v:unknown):v is Vec3=>Array.isArray(v)&&v.length===3&&v.every(n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=100000);
const proportion=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n)&&n>=.6&&n<=1.4;
export function parseProject(raw:string):Project {
 const p=JSON.parse(raw);
 if(!p||p.version!==1||typeof p.name!=='string'||p.name.length>200||!Array.isArray(p.entities)||p.entities.length>10000)throw Error('Invalid project');
 const assets=validateAssets(p.assets),assetIds=new Set(assets.map(a=>a.id));
 function readEntity(e:any):Entity {
 if(!e||typeof e.id!=='string'||!e.id||e.id.length>200||typeof e.name!=='string'||e.name.length>200||!kinds.includes(e.kind)||!vec(e.position)||!vec(e.rotation)||!vec(e.scale)||typeof e.color!=='string'||!/^#[0-9a-f]{6}$/i.test(e.color)||(e.role!==undefined&&!roles.includes(e.role))||(['ground','model'].includes(e.kind)&&e.role&&e.role!=='decoration')||(e.kind==='model'&&!assetIds.has(e.assetId)))throw Error('Invalid entity');
 const result:Entity={id:e.id,name:e.name,kind:e.kind,position:e.position,rotation:e.rotation,scale:e.scale,color:e.color,role:e.role??'decoration'};
 if(e.kind==='model')result.assetId=e.assetId;
 if(e.animation!==undefined)result.animation=readClip(e.animation);
 if(e.material!==undefined){const m=e.material;if(!m||![m.metallic,m.roughness].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1)||typeof m.emissive!=='string'||!/^#[0-9a-f]{6}$/i.test(m.emissive))throw Error('Invalid material');result.material={metallic:m.metallic,roughness:m.roughness,emissive:m.emissive};}
 if(e.kind==='character'){const c=e.character??{bodyWidth:1,headSize:1,limbLength:1};if(!proportion(c.bodyWidth)||!proportion(c.headSize)||!proportion(c.limbLength))throw Error('Invalid character proportions');result.character={bodyWidth:c.bodyWidth,headSize:c.headSize,limbLength:c.limbLength};}
 return result;
 }
 const ids=new Set<string>();let players=0;
 const entities=p.entities.map((raw:unknown)=>{const e=readEntity(raw);if(ids.has(e.id))throw Error('Duplicate entity ID');ids.add(e.id);if(e.role==='player'&&++players>1)throw Error('Only one player is allowed');return e;});
 const prefabIds=new Set<string>();const input=p.prefabs??[];
 if(!Array.isArray(input)||input.length>1000)throw Error('Invalid prefab library');
 const prefabs:Prefab[]=input.map((f:any)=>{if(!f||typeof f.id!=='string'||!f.id||f.id.length>200||prefabIds.has(f.id)||typeof f.name!=='string'||f.name.length>200)throw Error('Invalid prefab');prefabIds.add(f.id);const source=readEntity(f.source);if(source.role==='player')source.role='decoration';return {id:f.id,name:f.name,source};});
 return {version:1,name:p.name,entities,assets,prefabs,physics:readPhysics(p.physics),logic:readLogic(p.logic)};
}
