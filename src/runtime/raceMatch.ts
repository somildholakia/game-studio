import {parseProject,type Vec3} from '../core/project';
import {advance,begin,compileWorld,type GameState,type Input} from './simulation';

export const RACE_STEP=1/60,MAX_RACERS=4,RACE_INPUT_TTL=30;
const neutral:Input={x:0,z:0,jump:false};
type Racer={name:string;state:GameState;input:Input;sequence:number;inputTick:number};
export type RaceSnapshot={tick:number;racers:{id:string;name:string;position:Vec3;ack:number;score:number;collected:number;won:boolean;lost:boolean;elapsed:number;respawns:number}[]};
function readInput(raw:unknown):Input|null{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
 const p=raw as Record<string,unknown>;
 if(Object.keys(p).some(k=>!['x','z','jump'].includes(k))||typeof p.x!=='number'||typeof p.z!=='number'||!Number.isFinite(p.x)||!Number.isFinite(p.z)||Math.abs(p.x)>1||Math.abs(p.z)>1||typeof p.jump!=='boolean')return null;
 return {x:p.x,z:p.z,jump:p.jump};
}
/** Authoritative independent-lane race: each racer plays the same validated level under one server clock.
 * Shared rigid bodies, cross-player contacts and shared event state are intentionally not simulated. */
export function createRaceMatch(raw:string){
 if(typeof raw!=='string'||raw.length>256_000)throw Error('Race project exceeds limit');
 const project=parseProject(raw);
 if(project.entities.length>128||project.entities.filter(e=>e.role==='dynamic').length>8)throw Error('Race level exceeds simulation quota');
 const world=compileWorld(project);
 const racers=new Map<string,Racer>();let tick=0;
 return {
  projectJson:JSON.stringify(project),
  add(id:string,name:string){
   if(!/^[a-f0-9]{16}$/.test(id)||typeof name!=='string'||!name.trim()||name.length>32||/[\u0000-\u001f\u007f]/.test(name)||racers.has(id)||racers.size>=MAX_RACERS)return false;
   racers.set(id,{name:name.trim(),state:begin(project),input:neutral,sequence:-1,inputTick:tick});return true;
  },
  remove(id:string){return racers.delete(id);},
  input(id:string,sequence:unknown,rawInput:unknown){
   const racer=racers.get(id),input=readInput(rawInput);
   if(!racer||typeof sequence!=='number'||!Number.isSafeInteger(sequence)||sequence<0||sequence<=racer.sequence||!input)return false;
   racer.sequence=sequence;racer.input=input;racer.inputTick=tick;return true;
  },
  step(count=1){
   if(!Number.isSafeInteger(count)||count<1||count>8)throw Error('Invalid server tick count');
   for(let i=0;i<count;i++){
    tick++;
    for(const r of racers.values())r.state=advance(world,r.state,tick-r.inputTick<=RACE_INPUT_TTL?r.input:neutral,RACE_STEP);
   }
  },
  snapshot():RaceSnapshot{return {tick,racers:[...racers].map(([id,r])=>({id,name:r.name,position:[...r.state.position],ack:r.sequence,score:r.state.logic.score,collected:r.state.collected.size,won:r.state.won,lost:!!r.state.logic.lost,elapsed:r.state.elapsed,respawns:r.state.respawns}))};}
 };
}
