import {parseProject,type Project} from '../core/project';
import {readMembership,type Membership} from './rooms';
import type {RaceSnapshot} from './raceMatch';
const id=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{16}$/.test(v);
const int=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const finite=(v:unknown,min:number,max:number):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
export function readRaceSnapshot(raw:unknown,project:Project,self:string):RaceSnapshot{
 const s=raw as RaceSnapshot;
 if(!s||s.mode!=='shared'||!['lobby','running','finished'].includes(s.phase)||!int(s.tick)||!id(s.hostId)||!(s.winnerId===null||id(s.winnerId))||(s.phase==='finished')!==(s.winnerId!==null)||!Array.isArray(s.racers)||s.racers.length<1||s.racers.length>4||!Array.isArray(s.collectedIds))throw Error('Invalid shared race snapshot');
 const allowed=new Set(project.entities.filter(e=>e.role==='collectible').map(e=>e.id));
 if(s.collectedIds.length>allowed.size||new Set(s.collectedIds).size!==s.collectedIds.length||s.collectedIds.some(k=>!allowed.has(k)))throw Error('Invalid race collectibles');
 const ids=new Set<string>();for(const r of s.racers){
  if(!r||!id(r.id)||ids.has(r.id)||typeof r.name!=='string'||!r.name.trim()||r.name.length>32||/[\u0000-\u001f\u007f]/.test(r.name)||!Array.isArray(r.position)||r.position.length!==3||!r.position.every(n=>finite(n,-1e8,1e8))||!int(r.ack,-1)||!int(r.score,-1e6,1e6)||!int(r.collected,0,allowed.size)||r.collected!==s.collectedIds.length||!int(r.claimed,0,r.collected)||typeof r.won!=='boolean'||typeof r.lost!=='boolean'||!finite(r.elapsed,0,1e9)||!int(r.respawns)||r.won!==(s.winnerId===r.id))throw Error('Invalid racer state');ids.add(r.id);
 }
 if(!ids.has(self)||!ids.has(s.hostId))throw Error('Race membership missing from snapshot');
 return structuredClone(s);
}
export function readRaceSession(data:Record<string,unknown>):{member:Membership;project:Project;snapshot:RaceSnapshot}{
 const member=readMembership(data);if(typeof data.project!=='string'||data.project.length>256000)throw Error('Invalid race project');
 const project=parseProject(data.project);if(project.entities.length>128||project.entities.some(e=>e.patrol||e.gate||['dynamic','hazard','checkpoint','platform','trigger'].includes(e.role??''))||project.logic?.rules.length||project.logic?.maxLives!==undefined||project.logic?.autoWin===false||!project.entities.some(e=>e.role==='player')||!project.entities.some(e=>e.role==='goal'))throw Error('Unsupported shared race project');
 return {member,project,snapshot:readRaceSnapshot(data.snapshot,project,member.id)};
}
export async function raceRequest(body:object,signal?:AbortSignal):Promise<Record<string,unknown>>{
 const response=await fetch('/api/race',{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify(body),signal});
 if(!response.headers.get('content-type')?.includes('application/json'))throw Error('Shared races require the local development server.');
 const data=await response.json();if(!response.ok)throw Error(typeof data?.error==='string'?data.error:'Race request failed');
 if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Invalid race response');return data;
}
