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
