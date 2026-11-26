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
async function read():Promise<unknown>{
 const db=await open();try{return await new Promise((resolve,reject)=>{
 const tx=db.transaction(STORE,'readonly');const req=tx.objectStore(STORE).get(KEY);
 tx.oncomplete=()=>resolve(req.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error??Error('Read aborted'));
 });}finally{db.close();}
}
async function write(project:Project):Promise<void>{
 const db=await open();try{await new Promise<void>((resolve,reject)=>{
 const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(project,KEY);
 tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error??Error('Save aborted'));
 });}finally{db.close();}
}
export async function restore():Promise<Project|null>{
 const value=await read();
 if(value!==undefined)return parseProject(JSON.stringify(value));
 const legacy=localStorage.getItem(LEGACY);if(!legacy)return null;
 const project=parseProject(legacy);await write(project);
 // Retain the legacy backup; do not delete a user's only previous copy.
 return project;
}
let pending:Promise<void>=Promise.resolve();
export function persist(project:Project):Promise<void>{
 const result=pending.catch(()=>{}).then(()=>write(project));pending=result;return result;
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
