import {parseProject,type Project} from './project';
import {campaign} from './scenes';
import {encodeBundleBytes,decodeBundleBytes} from './projectBundle';
import {decodeAsset,validateGlb,MAX_GLB_BYTES,MAX_ASSET_BYTES,type ModelAsset} from './assets';
import {projectFingerprint} from '../runtime/progress';
const MAX_LEVEL=8_000_048,MAX_TOTAL=64_000_000;
export type HostedChunk={path:string;size:number;sha256:string};
export type HostedAsset=HostedChunk&{id:string;name:string;rawSha256:string;rawSize:number};
export type HostedLevel=HostedChunk&{id:string;name:string;assetIds:string[]};
export type HostedManifest={format:'game-studio-hosted';version:1;fingerprint:string;levels:HostedLevel[];assets:HostedAsset[]};
export type HostedFile={path:string;bytes:Uint8Array<ArrayBuffer>};
const sha=async(bytes:Uint8Array<ArrayBuffer>)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
const digest=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const levelPath=(index:number)=>'levels/'+String(index).padStart(2,'0')+'.gstudio';
const assetPath=(hash:string)=>'assets/'+hash+'.gstudio';
const idOk=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=200;
const chunkOk=(c:HostedChunk)=>Number.isSafeInteger(c.size)&&c.size>=48&&c.size<=MAX_LEVEL&&digest(c.sha256);
export function readHostedManifest(raw:unknown):HostedManifest{
 const m=raw as HostedManifest;
 if(!m||m.format!=='game-studio-hosted'||m.version!==1||typeof m.fingerprint!=='string'||!/^[0-9a-f]{1,8}-[0-9a-f]{8}-[0-9a-f]{8}$/.test(m.fingerprint)||!Array.isArray(m.levels)||m.levels.length<1||m.levels.length>32||!Array.isArray(m.assets)||m.assets.length>100)throw Error('Invalid hosted game manifest');
 const assetIds=new Set<string>(),chunks=new Map<string,HostedAsset>();let total=0,rawTotal=0;
 const assets=m.assets.map(a=>{
  if(!a||typeof a.id!=='string'||!/^sha256:[a-f0-9]{64}$/.test(a.id)||assetIds.has(a.id)||typeof a.name!=='string'||a.name.length>200||!digest(a.rawSha256)||a.path!==assetPath(a.rawSha256)||!chunkOk(a)||!Number.isSafeInteger(a.rawSize)||a.rawSize<20||a.rawSize>MAX_GLB_BYTES||(rawTotal+=a.rawSize)>MAX_ASSET_BYTES)throw Error('Invalid hosted asset descriptor');
  const previous=chunks.get(a.path);
  if(previous&&(previous.sha256!==a.sha256||previous.size!==a.size||previous.rawSize!==a.rawSize))throw Error('Conflicting hosted asset chunk');
  if(!previous){chunks.set(a.path,a);total+=a.size;}assetIds.add(a.id);
  return {id:a.id,name:a.name,path:a.path,size:a.size,sha256:a.sha256,rawSize:a.rawSize,rawSha256:a.rawSha256};
 });
 const ids=new Set<string>();
 const levels=m.levels.map((l,i)=>{
  if(!l||!idOk(l.id)||ids.has(l.id)||!idOk(l.name)||!l.name.trim()||l.path!==levelPath(i)||!chunkOk(l)||!Array.isArray(l.assetIds)||l.assetIds.length>100||new Set(l.assetIds).size!==l.assetIds.length||!l.assetIds.every(id=>assetIds.has(id))||(total+=l.size)>MAX_TOTAL)throw Error('Invalid hosted level descriptor');
  ids.add(l.id);return {id:l.id,name:l.name,path:l.path,size:l.size,sha256:l.sha256,assetIds:[...l.assetIds]};
 });
 return {format:'game-studio-hosted',version:1,fingerprint:m.fingerprint,levels,assets};
}
export function hostedProgressProject(m:HostedManifest):Project{
 return {version:1,name:'Hosted campaign',entities:[],sceneId:m.levels[0].id,sceneName:m.levels[0].name,levels:m.levels.slice(1).map(l=>({id:l.id,name:l.name,entities:[]})),sceneOrder:m.levels.map(l=>l.id)};
}
export async function createHostedCampaign(project:Project):Promise<{manifest:HostedManifest;files:HostedFile[]}>{
 const p=parseProject(JSON.stringify(project));delete p.materialPresets;
 const levels=campaign(p),files:HostedFile[]=[],descriptors:HostedLevel[]=[],assets:HostedAsset[]=[];let total=0;
 const used=new Set(levels.flatMap(l=>l.entities.filter(e=>e.kind==='model').map(e=>e.assetId)));
 const chunks=new Map<string,HostedChunk>();
 for(const a of p.assets??[]){
  if(!used.has(a.id))continue;
  const raw=decodeAsset(a.data),rawSha256=await sha(raw),path=assetPath(rawSha256);let chunk=chunks.get(path);
  if(!chunk){const bytes=await encodeBundleBytes(raw);chunk={path,size:bytes.length,sha256:await sha(bytes)};chunks.set(path,chunk);files.push({path,bytes});total+=bytes.length;}
  assets.push({...chunk,id:a.id,name:a.name,rawSha256,rawSize:raw.length});
 }
 for(const [i,level] of levels.entries()){
  const entities=level.entities.map(e=>{const copy={...e};delete copy.prefabId;return copy;});
  const ids=new Set(entities.filter(e=>e.kind==='model').map(e=>e.assetId));
  const isolated={...level,entities,prefabs:[],assets:[],levels:[],sceneOrder:[level.sceneId!]};
  const bytes=await encodeBundleBytes(new TextEncoder().encode(JSON.stringify(isolated)));total+=bytes.length;if(total>MAX_TOTAL)throw Error('Hosted game exceeds 64 MB compressed budget');
  const path=levelPath(i);files.push({path,bytes});descriptors.push({id:level.sceneId!,name:level.sceneName!,path,size:bytes.length,sha256:await sha(bytes),assetIds:assets.filter(a=>ids.has(a.id)).map(a=>a.id)});
 }
 return {manifest:readHostedManifest({format:'game-studio-hosted',version:1,fingerprint:projectFingerprint(p),levels:descriptors,assets}),files};
}
async function fetchChunk(chunk:HostedChunk,base:string,signal:AbortSignal|undefined,fetcher:typeof fetch){
 const origin=new URL(base);if(!['http:','https:'].includes(origin.protocol))throw Error('Hosted packages require an HTTP(S) static server');
 const url=new URL(chunk.path,origin);if(url.origin!==origin.origin)throw Error('Cross-origin hosted chunk');
 const response=await fetcher(url,{signal,redirect:'error',credentials:'omit',cache:'default'});
 if(!response.ok||!response.body)throw Error('Hosted chunk unavailable: '+chunk.path);
 const bytes=new Uint8Array(chunk.size),reader=response.body.getReader();let offset=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;if(value){if(offset+value.length>bytes.length)throw Error('Hosted chunk exceeds declared size');bytes.set(value,offset);offset+=value.length;}}}
 catch(e){await reader.cancel().catch(()=>{});throw e;}finally{reader.releaseLock();}
 if(offset!==chunk.size||await sha(bytes)!==chunk.sha256)throw Error('Hosted level integrity mismatch');
 return bytes;
}
function base64(bytes:Uint8Array){let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(text);}
export async function loadHostedLevel(m:HostedManifest,index:number,base:string,signal?:AbortSignal,fetcher:typeof fetch=fetch):Promise<Project>{
 const manifest=readHostedManifest(m),level=manifest.levels[index];if(!level)throw Error('Invalid hosted level index');
 const bytes=await fetchChunk(level,base,signal,fetcher);
 const raw=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await decodeBundleBytes(bytes)));
 if(!raw||raw.sceneId!==level.id||raw.sceneName!==level.name||!Array.isArray(raw.levels)||raw.levels.length||!Array.isArray(raw.assets)||raw.assets.length||!Array.isArray(raw.prefabs)||raw.prefabs.length||!Array.isArray(raw.entities)||raw.entities.length>10000)throw Error('Hosted level identity mismatch');
 const needed=new Set(raw.entities.filter((e:unknown)=>e&&typeof e==='object'&&'kind' in e&&e.kind==='model').map((e:{assetId?:unknown})=>e.assetId));
 if(needed.size!==level.assetIds.length||!level.assetIds.every(id=>needed.has(id)))throw Error('Hosted asset reference mismatch');
 const descriptors=level.assetIds.map(id=>manifest.assets.find(a=>a.id===id)!);
 const chunks=new Map<string,Promise<string>>();
 const models:ModelAsset[]=[];
 // Fetch at most two distinct chunks concurrently, deduplicating identical content in this level.
 for(let i=0;i<descriptors.length;i+=2){
  const pair=await Promise.all(descriptors.slice(i,i+2).map(async a=>{
   let data=chunks.get(a.path);if(!data){data=(async()=>{const raw=await decodeBundleBytes(await fetchChunk(a,base,signal,fetcher),MAX_GLB_BYTES);if(raw.length!==a.rawSize||await sha(raw)!==a.rawSha256)throw Error('Hosted model integrity mismatch');validateGlb(raw);return base64(raw);})();chunks.set(a.path,data);}
   return {id:a.id,name:a.name,format:'glb' as const,data:await data};
  }));models.push(...pair);
 }
 const project=parseProject(JSON.stringify({...raw,assets:models}));campaign(project);return project;
}
