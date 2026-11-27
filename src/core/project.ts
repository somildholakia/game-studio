import {validateAssets,type ModelAsset} from './assets';
import {readPhysics,type PhysicsSettings} from '../runtime/physicsSettings';
import {readLogic,type Logic} from '../runtime/rules';
import {readClip,type Clip} from './animation';
import {cubeMesh,readMesh,type MeshData} from './mesh';
import {readAudio,type AudioSettings} from '../runtime/audio';
import {defaultTerrain,readTerrain,validTerrainTransform,type TerrainSettings} from './terrain';
import {readEnvironment,type Environment} from './environment';
import {readRig,type CharacterRig} from './characterRig';
import {MAIN_SCENE,MAX_SCENES,type SceneData} from './scenes';
import {readPresentation,type Presentation} from './presentation';
import {readGraphics,type GraphicsSettings} from './graphics';
import {readBody,MAX_BODIES,type BodySettings} from '../runtime/bodies';
import {readPatrol,type Patrol} from '../runtime/patrol';
import {readTexture,readImageTexture,MAX_IMAGE_TEXTURES,type TextureStyle,type ImageTexture} from './textures';
import {projections,type Projection} from './uv';
import type {Prefab} from './prefabs';
export type Vec3=[number,number,number];
export const roles=['decoration','player','solid','collectible','goal','hazard','checkpoint','dynamic','trigger'] as const;
export type Role=typeof roles[number];
export const kinds=['box','sphere','ground','cylinder','cone','torus','character','model','mesh','terrain'] as const;
export type CharacterStyle={bodyWidth:number;headSize:number;limbLength:number};
export type MaterialStyle={metallic:number;roughness:number;emissive:string;texture?:TextureStyle;imageTexture?:ImageTexture};
export type Entity={id:string;name:string;kind:typeof kinds[number];position:Vec3;rotation:Vec3;scale:Vec3;color:string;role?:Role;assetId?:string;character?:CharacterStyle;material?:MaterialStyle;animation?:Clip;mesh?:MeshData;terrain?:TerrainSettings;rig?:CharacterRig;prefabId?:string;body?:BodySettings;patrol?:Patrol;uvProjection?:Projection};
export type Project={version:1;name:string;entities:Entity[];assets?:ModelAsset[];prefabs?:Prefab[];physics?:PhysicsSettings;logic?:Logic;audio?:AudioSettings;environment?:Environment;sceneId?:string;sceneName?:string;levels?:SceneData[];sceneOrder?:string[];presentation?:Presentation;graphics?:GraphicsSettings};
export function entity(kind:Entity['kind']):Entity {
 return {id:crypto.randomUUID(),name:kind,kind,position:[0,kind==='ground'||kind==='terrain'?0:1,0],rotation:[0,0,0],scale:[1,1,1],color:'#6688bb',role:'decoration',...(kind==='terrain'?{terrain:{...defaultTerrain},color:'#527c50'}:{}),...(kind==='mesh'?{mesh:cubeMesh()}:{}),...(kind==='character'?{character:{bodyWidth:1,headSize:1,limbLength:1}}:{})};
}
export function initialProject():Project {return {version:1,name:'Untitled world',entities:[entity('ground'),entity('box')],assets:[],prefabs:[]};}
export function replaceEntity(p:Project,e:Entity):Project {return {...p,entities:p.entities.map(x=>x.id===e.id?e:e.role==='player'&&e.role===x.role?{...x,role:'decoration'}:x)};}
export function duplicateEntity(e:Entity):Entity {
 const copy=structuredClone(e);const offset=Math.min(1,100000-copy.position[0],...(copy.animation?.keys.map(k=>100000-k.position[0])??[]));copy.position[0]+=offset;
 if(copy.animation)for(const key of copy.animation.keys)key.position[0]+=offset;
 return {...copy,id:crypto.randomUUID(),name:(e.name+' copy').slice(0,200),role:e.role==='player'?'decoration':e.role};
}
const vec=(v:unknown):v is Vec3=>Array.isArray(v)&&v.length===3&&v.every(n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=100000);
const proportion=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n)&&n>=.6&&n<=1.4;
export function parseProject(raw:string):Project {
 const p=JSON.parse(raw);
 if(!p||p.version!==1||typeof p.name!=='string'||p.name.length>200||!Array.isArray(p.entities)||p.entities.length>10000)throw Error('Invalid project');
 const assets=validateAssets(p.assets),assetIds=new Set(assets.map(a=>a.id));
 let imageCount=0;
 function readEntity(e:any):Entity {
 if(!e||typeof e.id!=='string'||!e.id||e.id.length>200||typeof e.name!=='string'||e.name.length>200||!kinds.includes(e.kind)||!vec(e.position)||!vec(e.rotation)||!vec(e.scale)||typeof e.color!=='string'||!/^#[0-9a-f]{6}$/i.test(e.color)||(e.role!==undefined&&!roles.includes(e.role))||(['ground','model','mesh','terrain'].includes(e.kind)&&e.role&&e.role!=='decoration')||(e.kind==='model'&&!assetIds.has(e.assetId)))throw Error('Invalid entity');
 const result:Entity={id:e.id,name:e.name,kind:e.kind,position:e.position,rotation:e.rotation,scale:e.scale,color:e.color,role:e.role??'decoration'};
 if(e.prefabId!==undefined){if(typeof e.prefabId!=='string'||!e.prefabId||e.prefabId.length>200)throw Error('Invalid prefab reference');result.prefabId=e.prefabId;}
 if(e.kind==='model')result.assetId=e.assetId;
 if(e.role==='trigger'&&e.kind!=='box')throw Error('Trigger zones require box geometry');
 if(e.role==='dynamic'){if(!['box','sphere','cylinder','cone','torus'].includes(e.kind))throw Error('Unsupported dynamic body geometry');result.body=readBody(e.body);}
 if(e.patrol!==undefined&&(e.role==='hazard'||e.role==='collectible'))result.patrol=readPatrol(e.patrol);
 if(e.animation!==undefined)result.animation=readClip(e.animation);
 if(e.kind==='mesh'){result.mesh=readMesh(e.mesh);if(e.uvProjection!==undefined){if(!projections.includes(e.uvProjection))throw Error('Invalid UV projection');result.uvProjection=e.uvProjection;}}
 if(e.kind==='terrain'){if(!validTerrainTransform(result))throw Error('Terrain must be axis-aligned with positive bounded scale');result.terrain=readTerrain(e.terrain);delete result.animation;}
 if(e.material!==undefined){const m=e.material;if(!m||![m.metallic,m.roughness].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1)||typeof m.emissive!=='string'||!/^#[0-9a-f]{6}$/i.test(m.emissive))throw Error('Invalid material');result.material={metallic:m.metallic,roughness:m.roughness,emissive:m.emissive,...(m.texture!==undefined?{texture:readTexture(m.texture)}:{})};if(m.imageTexture!==undefined){if(m.texture!==undefined)throw Error('Choose one material texture source');if(++imageCount>MAX_IMAGE_TEXTURES)throw Error('Embedded image texture limit exceeded');result.material.imageTexture=readImageTexture(m.imageTexture);}}
 if(e.kind==='character'){const c=e.character??{bodyWidth:1,headSize:1,limbLength:1};if(!proportion(c.bodyWidth)||!proportion(c.headSize)||!proportion(c.limbLength))throw Error('Invalid character proportions');result.character={bodyWidth:c.bodyWidth,headSize:c.headSize,limbLength:c.limbLength};if(e.rig!==undefined)result.rig=readRig(e.rig);}
 return result;
 }
 let total=0;
 function readEntities(raw:unknown):Entity[]{if(!Array.isArray(raw)||raw.length>10000||(total+=raw.length)>20000)throw Error('Level entity limit exceeded');const ids=new Set<string>();let players=0,bodies=0;return raw.map((item:unknown)=>{const e=readEntity(item);if(ids.has(e.id))throw Error('Duplicate entity ID');ids.add(e.id);if(e.role==='player'&&++players>1)throw Error('Only one player is allowed per level');if(e.role==='dynamic'&&++bodies>MAX_BODIES)throw Error('Maximum 64 dynamic bodies per level');return e;});}
 const entities=readEntities(p.entities);
 const validId=(id:unknown):id is string=>typeof id==='string'&&id.length>0&&id.length<=200;
 const sceneId=p.sceneId??MAIN_SCENE,sceneName=p.sceneName??'Level 1';if(!validId(sceneId)||typeof sceneName!=='string'||!sceneName.trim()||sceneName.length>200)throw Error('Invalid active level');
 const levelIds=new Set<string>([sceneId]);const rawLevels=p.levels??[];if(!Array.isArray(rawLevels)||rawLevels.length>=MAX_SCENES)throw Error('Invalid level library');
 const levels:SceneData[]=rawLevels.map((l:any)=>{if(!l||!validId(l.id)||levelIds.has(l.id)||typeof l.name!=='string'||!l.name.trim()||l.name.length>200)throw Error('Invalid level');levelIds.add(l.id);return {id:l.id,name:l.name,entities:readEntities(l.entities),physics:readPhysics(l.physics),logic:readLogic(l.logic),audio:readAudio(l.audio),environment:readEnvironment(l.environment)};});
 const sceneOrder=p.sceneOrder??[...levelIds];if(!Array.isArray(sceneOrder)||sceneOrder.length!==levelIds.size||new Set(sceneOrder).size!==levelIds.size||!sceneOrder.every((id:unknown)=>validId(id)&&levelIds.has(id)))throw Error('Invalid level order');
 const prefabIds=new Set<string>();const input=p.prefabs??[];
 if(!Array.isArray(input)||input.length>1000)throw Error('Invalid prefab library');
 const prefabs:Prefab[]=input.map((f:any)=>{if(!f||typeof f.id!=='string'||!f.id||f.id.length>200||prefabIds.has(f.id)||typeof f.name!=='string'||f.name.length>200)throw Error('Invalid prefab');prefabIds.add(f.id);const source=readEntity(f.source);if(source.role==='player')source.role='decoration';delete source.prefabId;return {id:f.id,name:f.name,source};});
 const prefabMap=new Map(prefabs.map(f=>[f.id,f.source.kind]));for(const e of [...entities,...levels.flatMap(l=>l.entities)])if(e.prefabId&&prefabMap.get(e.prefabId)!==e.kind)throw Error('Missing or incompatible prefab reference');
 return {version:1,name:p.name,entities,assets,prefabs,physics:readPhysics(p.physics),logic:readLogic(p.logic),audio:readAudio(p.audio),environment:readEnvironment(p.environment),presentation:readPresentation(p.presentation),graphics:readGraphics(p.graphics),...(p.sceneId!==undefined||p.sceneName!==undefined||p.levels!==undefined||p.sceneOrder!==undefined?{sceneId,sceneName,levels,sceneOrder}:{})};
}
