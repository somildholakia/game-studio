import {parseProject,type Project} from './project';
import {campaign} from './scenes';
import {encodeProjectBundle,decodeProjectBundle} from './projectBundle';
import {projectFingerprint} from '../runtime/progress';
const MAX_LEVEL=8_000_048,MAX_TOTAL=64_000_000;
export type HostedLevel={id:string;name:string;path:string;size:number;sha256:string};
export type HostedManifest={format:'game-studio-hosted';version:1;fingerprint:string;levels:HostedLevel[]};
export type HostedFile={path:string;bytes:Uint8Array<ArrayBuffer>};
const sha=async(bytes:Uint8Array<ArrayBuffer>)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
const levelPath=(index:number)=>'levels/'+String(index).padStart(2,'0')+'.gstudio';
export function readHostedManifest(raw:unknown):HostedManifest{
 const m=raw as HostedManifest;
 if(!m||m.format!=='game-studio-hosted'||m.version!==1||typeof m.fingerprint!=='string'||!/^[0-9a-f]{1,8}-[0-9a-f]{8}-[0-9a-f]{8}$/.test(m.fingerprint)||!Array.isArray(m.levels)||m.levels.length<1||m.levels.length>32)throw Error('Invalid hosted game manifest');
 const ids=new Set<string>();let total=0;
 const levels=m.levels.map((l,i)=>{
  if(!l||typeof l.id!=='string'||!l.id||l.id.length>200||ids.has(l.id)||typeof l.name!=='string'||!l.name.trim()||l.name.length>200||l.path!==levelPath(i)||!Number.isSafeInteger(l.size)||l.size<48||l.size>MAX_LEVEL||typeof l.sha256!=='string'||!/^[a-f0-9]{64}$/.test(l.sha256)||(total+=l.size)>MAX_TOTAL)throw Error('Invalid hosted level descriptor');
  ids.add(l.id);return {id:l.id,name:l.name,path:l.path,size:l.size,sha256:l.sha256};
 });
 return {format:'game-studio-hosted',version:1,fingerprint:m.fingerprint,levels};
}
/** Progress needs only ordered identities when passed the already-computed full-game fingerprint. */
export function hostedProgressProject(m:HostedManifest):Project{
 return {version:1,name:'Hosted campaign',entities:[],sceneId:m.levels[0].id,sceneName:m.levels[0].name,levels:m.levels.slice(1).map(l=>({id:l.id,name:l.name,entities:[]})),sceneOrder:m.levels.map(l=>l.id)};
}
export async function createHostedCampaign(project:Project):Promise<{manifest:HostedManifest;files:HostedFile[]}>{
 const p=parseProject(JSON.stringify(project));delete p.materialPresets;
 const levels=campaign(p),files:HostedFile[]=[],descriptors:HostedLevel[]=[];let total=0;
 for(const [i,level] of levels.entries()){
  // Runtime does not need authoring prefab definitions or unused models from other levels.
  const entities=level.entities.map(e=>{const copy={...e};delete copy.prefabId;return copy;});
  const ids=new Set(entities.filter(e=>e.kind==='model').map(e=>e.assetId));
  const isolated={...level,entities,prefabs:[],assets:level.assets?.filter(a=>ids.has(a.id))??[],levels:[],sceneOrder:[level.sceneId!]};
  const bytes=await encodeProjectBundle(isolated);total+=bytes.length;if(total>MAX_TOTAL)throw Error('Hosted game exceeds 64 MB compressed budget');
  const path=levelPath(i);files.push({path,bytes});descriptors.push({id:level.sceneId!,name:level.sceneName!,path,size:bytes.length,sha256:await sha(bytes)});
 }
 return {manifest:readHostedManifest({format:'game-studio-hosted',version:1,fingerprint:projectFingerprint(p),levels:descriptors}),files};
}
export async function loadHostedLevel(m:HostedManifest,index:number,base:string,signal?:AbortSignal,fetcher:typeof fetch=fetch):Promise<Project>{
 const manifest=readHostedManifest(m),level=manifest.levels[index];if(!level)throw Error('Invalid hosted level index');
 const origin=new URL(base);if(!['http:','https:'].includes(origin.protocol))throw Error('Hosted packages require an HTTP(S) static server');
 const url=new URL(level.path,origin);if(url.origin!==origin.origin)throw Error('Cross-origin hosted level');
 const response=await fetcher(url,{signal,redirect:'error',credentials:'omit',cache:'default'});
 if(!response.ok||!response.body)throw Error('Hosted level unavailable: '+level.name);
 // Do not trust Content-Length; bound streamed bytes before retaining or decompressing.
 const bytes=new Uint8Array(level.size),reader=response.body.getReader();let offset=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;if(value){if(offset+value.length>bytes.length)throw Error('Hosted level exceeds declared size');bytes.set(value,offset);offset+=value.length;}}}
 catch(e){await reader.cancel().catch(()=>{});throw e;}finally{reader.releaseLock();}
 if(offset!==level.size||await sha(bytes)!==level.sha256)throw Error('Hosted level integrity mismatch');
 const project=await decodeProjectBundle(bytes);
 if(project.sceneId!==level.id||project.sceneName!==level.name||project.levels?.length)throw Error('Hosted level identity mismatch');
 campaign(project);return project;
}
