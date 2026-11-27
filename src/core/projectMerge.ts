import {parseProject,type Project} from './project';
import {orderedScenes,type SceneData} from './scenes';
type Value=unknown;
export type MergeChoice='local'|'incoming';
export type MergeConflict={path:string;local:string;incoming:string};
export type MergeResult={project:Project|null;conflicts:MergeConflict[];error?:string};
const equal=(a:Value,b:Value):boolean=>{
 if(a===b)return true;
 if(a===null||b===null||typeof a!=='object'||typeof b!=='object')return false;
 if(Array.isArray(a)||Array.isArray(b))return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>equal(v,b[i]));
 const x=a as Record<string,unknown>,y=b as Record<string,unknown>,keys=Object.keys(x);
 return keys.length===Object.keys(y).length&&keys.every(k=>Object.hasOwn(y,k)&&equal(x[k],y[k]));
};
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const idArray=(v:unknown):v is {id:string}[]=>Array.isArray(v)&&v.every(x=>record(x)&&typeof x.id==='string');
const escape=(s:string)=>s.replace(/~/g,'~0').replace(/\//g,'~1');
const summarize=(v:unknown)=>{if(v===undefined)return '(deleted)';const s=JSON.stringify(v);return s.length>240?s.slice(0,237)+'…':s;};
function normalized(p:Project){
 const parsed=parseProject(JSON.stringify(p)),{entities,physics,logic,audio,environment,sceneId,sceneName,levels,sceneOrder,...global}=parsed;
 return {...global,scenes:orderedScenes(parsed)};
}
export function mergeProjects(base:Project,local:Project,incoming:Project,choices:Record<string,MergeChoice>={}):MergeResult{
 const conflicts:MergeConflict[]=[];let nodes=0;
 function conflict(a:unknown,b:unknown,path:string){
  if(conflicts.length>=256)throw Error('Too many merge conflicts; split changes into smaller batches');
  conflicts.push({path,local:summarize(a),incoming:summarize(b)});
  return Object.hasOwn(choices,path)&&choices[path]==='incoming'?b:a;
 }
 function merge(o:unknown,a:unknown,b:unknown,path:string,depth=0):unknown{
  if(++nodes>100000||depth>32)throw Error('Merge complexity limit exceeded');
  if(equal(a,b))return a;if(equal(o,a))return b;if(equal(o,b))return a;
  // Deletion-vs-edit, independently added same ID and ordered arrays are explicit conflicts.
  if(o===undefined||a===undefined||b===undefined)return conflict(a,b,path);
  const key=path.slice(path.lastIndexOf('/')+1);
  if(['scenes','entities','prefabs','assets','rules'].includes(key)&&idArray(o)&&idArray(a)&&idArray(b)){
   const maps=[o,a,b].map(v=>new Map(v.map(x=>[x.id,x]))),ids=[...new Set([...o,...a,...b].map(x=>x.id))];
   const merged=new Map<string,unknown>();
   for(const id of ids){const value=merge(maps[0].get(id),maps[1].get(id),maps[2].get(id),path+'/'+escape(id),depth+1);if(value!==undefined)merged.set(id,value);}
   const common=ids.filter(id=>maps.every(m=>m.has(id))&&merged.has(id)),set=new Set(common);
   const order=merge(o.filter(x=>set.has(x.id)).map(x=>x.id),a.filter(x=>set.has(x.id)).map(x=>x.id),b.filter(x=>set.has(x.id)).map(x=>x.id),path+'/@order',depth+1) as string[];
   // Preserve the chosen common ordering and insert newly added IDs relative to their nearest existing predecessor/successor.
   const result=[...order];
   for(const source of [a,b,o])for(let i=0;i<source.length;i++){
    const id=source[i].id;if(!merged.has(id)||result.includes(id))continue;
    const prev=source.slice(0,i).reverse().find(x=>result.includes(x.id)),next=source.slice(i+1).find(x=>result.includes(x.id));
    if(prev)result.splice(result.indexOf(prev.id)+1,0,id);else if(next)result.splice(result.indexOf(next.id),0,id);else result.push(id);
   }
   return result.map(id=>merged.get(id));
  }
  // Coupled structures cannot be merged independently (e.g. modifier source and evaluated cache).
  if(['mesh','meshModifiers','rig','shader','animation','material','body','terrain'].includes(key))return conflict(a,b,path);
  if(record(o)&&record(a)&&record(b)){
   return Object.fromEntries([...new Set([...Object.keys(o),...Object.keys(a),...Object.keys(b)])].map(k=>[k,merge(o[k],a[k],b[k],path+'/'+escape(k),depth+1)]).filter(([,v])=>v!==undefined));
  }
  return conflict(a,b,path);
 }
 try{
 const value=merge(normalized(base),normalized(local),normalized(incoming),'') as ReturnType<typeof normalized>;
 if(conflicts.some(c=>!Object.hasOwn(choices,c.path)||!['local','incoming'].includes(choices[c.path])))return {project:null,conflicts};
 const {scenes,...global}=value;const active=scenes.find(s=>s.id===(local.sceneId??'main'))??scenes[0];
 if(!active)throw Error('Keep at least one level');
 const {id,name,entities,physics,logic,audio,environment}=active;
 const result={...global,sceneId:id,sceneName:name,entities,physics,logic,audio,environment,levels:scenes.filter(s=>s.id!==id),sceneOrder:scenes.map(s=>s.id)};
 return {project:parseProject(JSON.stringify(result)),conflicts};
 }catch(e){return {project:null,conflicts,error:e instanceof Error?e.message:String(e)};}
}
