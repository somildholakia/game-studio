import {parseProject,type Project} from './project';
const LEGACY='game-studio:project:v1';
const DB='game-studio';const STORE='projects';const KEY='active';
function open():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{
 const request=indexedDB.open(DB,1);let blocked=false;
 request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE);};
 request.onerror=()=>reject(request.error??Error('Database unavailable'));
 request.onblocked=()=>{blocked=true;reject(Error('Close other Game Studio tabs to upgrade storage.'));};
 request.onsuccess=()=>{if(blocked){request.result.close();return;}request.result.onversionchange=()=>request.result.close();resolve(request.result);};
});}
// Keep the original active-project record format for backward-readable backups.
// A separate revision is updated in the same IndexedDB transaction.
const REVISION='active:revision';
type WorkspaceSnapshot={value:unknown;revision:string|null};
export class WorkspaceConflictError extends Error{
 constructor(){super('Another Game Studio tab saved a different version. Export your work before replacing the saved workspace.');this.name='WorkspaceConflictError';}
}
async function readWorkspace():Promise<WorkspaceSnapshot>{
 const db=await open();try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readonly'),store=tx.objectStore(STORE);
  const project=store.get(KEY),revision=store.get(REVISION);
  tx.oncomplete=()=>resolve({value:project.result,revision:typeof revision.result==='string'?revision.result:null});
  tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error??Error('Read aborted'));
 });}finally{db.close();}
}
/** The revision comparison and writes are atomic across browser tabs. */
async function write(project:Project,expected?:string|null):Promise<string>{
 const next=crypto.randomUUID();const db=await open();
 try{return await new Promise<string>((resolve,reject)=>{
  const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);
  let conflict=false;
  tx.oncomplete=()=>resolve(next);tx.onerror=()=>reject(tx.error??Error('Save failed'));
  tx.onabort=()=>reject(conflict?new WorkspaceConflictError():tx.error??Error('Save aborted'));
  const revision=store.get(REVISION);
  revision.onsuccess=()=>{
   const actual=typeof revision.result==='string'?revision.result:null;
   if(expected!==undefined&&expected!==actual){conflict=true;tx.abort();return;}
   store.put(project,KEY);store.put(next,REVISION);
  };
 });}finally{db.close();}
}
async function loadWorkspace():Promise<{project:Project|null;revision:string|null}>{
 let {value,revision}=await readWorkspace();
 if(value!==undefined)return {project:parseProject(JSON.stringify(value)),revision};
 const legacy=localStorage.getItem(LEGACY);if(!legacy)return {project:null,revision};
 // Retain the legacy backup; do not delete a user's only previous copy.
 const project=parseProject(legacy);
 try{revision=await write(project,revision);return {project,revision};}
 catch(error){
  if(!(error instanceof WorkspaceConflictError))throw error;
  // Another tab won the migration; use its committed version rather than overwrite it.
  const latest=await readWorkspace();
  if(latest.value===undefined)throw error;
  return {project:parseProject(JSON.stringify(latest.value)),revision:latest.revision};
 }
}
export async function restore():Promise<Project|null>{return (await loadWorkspace()).project;}
let pending:Promise<void>=Promise.resolve();
export function persist(project:Project):Promise<void>{
 const result=pending.catch(()=>{}).then(()=>write(project)).then(()=>{});
 pending=result;return result;
}
/** One session per editor tab. A stale session cannot overwrite a newer saved revision. */
export function createWorkspaceSession(){
 let revision:string|null|undefined;let initial:Project|null= null;let queue:Promise<void>=Promise.resolve();
 return {
  async restore():Promise<Project|null>{const loaded=await loadWorkspace();revision=loaded.revision;initial=loaded.project;return loaded.project;},
  persist(project:Project,overwrite=false):Promise<void>{
   const result=queue.catch(()=>{}).then(async()=>{
    if(revision===undefined&&!overwrite)throw Error('Workspace has not been restored');
    // The editor's initial immutable snapshot is already saved; opening a second tab is not a write.
    const unchanged=!overwrite&&project===initial;initial=null;if(unchanged)return;
    revision=await write(project,overwrite?undefined:revision);
   });
   queue=result;return result;
  }
 };
}

export type SavedProject={id:string;name:string;updatedAt:number};
const PREFIX='library:';
function libraryKey(id:string){if(!/^[a-f0-9-]{36}$/.test(id))throw Error('Invalid library ID');return PREFIX+id;}
type Entry=SavedProject&{project:Project};
async function transaction<T>(mode:IDBTransactionMode,operation:(store:IDBObjectStore)=>IDBRequest<T>):Promise<T>{
 const db=await open();try{return await new Promise<T>((resolve,reject)=>{
 const tx=db.transaction(STORE,mode);const req=operation(tx.objectStore(STORE));
 tx.oncomplete=()=>resolve(req.result);tx.onerror=()=>reject(tx.error??Error('Library transaction failed'));tx.onabort=()=>reject(tx.error??Error('Library transaction aborted'));
 });}finally{db.close();}
}
export async function listProjects():Promise<SavedProject[]>{
 const db=await open();try{return await new Promise((resolve,reject)=>{
 const tx=db.transaction(STORE,'readonly');const cursor=tx.objectStore(STORE).openCursor(IDBKeyRange.bound(PREFIX,PREFIX+'\uffff'));
 const entries:SavedProject[]=[];cursor.onsuccess=()=>{const c=cursor.result;if(!c)return;const e=c.value as Entry;if(e&&typeof e.id==='string'&&typeof e.name==='string'&&typeof e.updatedAt==='number')entries.push({id:e.id,name:e.name,updatedAt:e.updatedAt});c.continue();};
 tx.oncomplete=()=>resolve(entries.sort((a,b)=>b.updatedAt-a.updatedAt));tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
 });}finally{db.close();}
}
export async function saveProjectCopy(project:Project,name:string,id:string=crypto.randomUUID()):Promise<SavedProject>{
 const title=name.trim();if(!title||title.length>200)throw Error('Enter a project name up to 200 characters.');
 const validated=parseProject(JSON.stringify({...project,name:title}));
 const entry:Entry={id,name:title,updatedAt:Date.now(),project:validated};
 await transaction('readwrite',store=>store.put(entry,libraryKey(id)));return {id,name:title,updatedAt:entry.updatedAt};
}
export async function openProjectCopy(id:string):Promise<Project>{
 const entry=await transaction('readonly',store=>store.get(libraryKey(id))) as Entry|undefined;
 if(!entry)throw Error('Saved project not found');return parseProject(JSON.stringify(entry.project));
}
export async function deleteProjectCopy(id:string):Promise<void>{await transaction('readwrite',store=>store.delete(libraryKey(id)));}
