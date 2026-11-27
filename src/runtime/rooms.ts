import type {Vec3} from '../core/project';
export type Peer={id:string;name:string;position:Vec3};
export type Membership={code:string;id:string;token:string};
export function readPeers(raw:unknown):Peer[]{
 if(!Array.isArray(raw)||raw.length>7)throw Error('Invalid peer list');
 const ids=new Set<string>();
 return raw.map(p=>{if(!p||typeof p.id!=='string'||!/^[a-f0-9]{16}$/.test(p.id)||ids.has(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>32||!Array.isArray(p.position)||p.position.length!==3||!p.position.every((n:unknown)=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=1e8))throw Error('Invalid peer');ids.add(p.id);return {id:p.id,name:p.name,position:[...p.position] as Vec3};});
}
export function readMembership(raw:unknown):Membership{
 const p=raw as Membership;if(!p||typeof p.code!=='string'||!/^[a-f0-9]{8}$/.test(p.code)||typeof p.id!=='string'||!/^[a-f0-9]{16}$/.test(p.id)||typeof p.token!=='string'||!/^[a-f0-9]{48}$/.test(p.token))throw Error('Invalid room membership');
 return {code:p.code,id:p.id,token:p.token};
}
export async function roomRequest(body:object,signal?:AbortSignal):Promise<Record<string,unknown>>{
 const res=await fetch('/api/rooms',{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify(body),signal});
 if(!res.headers.get('content-type')?.includes('application/json'))throw Error('Rooms require the local development server.');
 const data=await res.json();if(!res.ok)throw Error(typeof data?.error==='string'?data.error:'Room request failed');
 if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Invalid room response');return data;
}
