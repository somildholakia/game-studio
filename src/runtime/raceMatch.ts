import {parseProject,type Vec3} from '../core/project';
import {advance,begin,compileWorld,type GameState,type Input} from './simulation';

export const RACE_STEP=1/60,MAX_RACERS=4,RACE_INPUT_TTL=30;
export type RaceMode='independent'|'shared';
export type RacePhase='lobby'|'running'|'finished';
const neutral:Input={x:0,z:0,jump:false};
type Racer={name:string;state:GameState;input:Input;sequence:number;inputTick:number;claimed:number};
export type RaceSnapshot={tick:number;mode:RaceMode;phase:RacePhase;hostId:string|null;winnerId:string|null;collectedIds:string[];racers:{id:string;name:string;position:Vec3;ack:number;score:number;collected:number;claimed:number;won:boolean;lost:boolean;elapsed:number;respawns:number}[]};
function readInput(raw:unknown):Input|null{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
 const p=raw as Record<string,unknown>;
 if(Object.keys(p).some(k=>!['x','z','jump'].includes(k))||typeof p.x!=='number'||typeof p.z!=='number'||!Number.isFinite(p.x)||!Number.isFinite(p.z)||Math.abs(p.x)>1||Math.abs(p.z)>1||typeof p.jump!=='boolean')return null;
 return {x:p.x,z:p.z,jump:p.jump};
}
/** Independent lanes preserve authored gameplay. Shared mode is deliberately restricted
 * to a static collectible course: one shared pickup set, one winner, no player contacts. */
export function createRaceMatch(raw:string,mode:RaceMode='independent'){
 if(typeof raw!=='string'||raw.length>256_000)throw Error('Race project exceeds limit');
 if(mode!=='independent'&&mode!=='shared')throw Error('Invalid race mode');
 const project=parseProject(raw);
 if(project.entities.length>128||project.entities.filter(e=>e.role==='dynamic').length>8)throw Error('Race level exceeds simulation quota');
 if(mode==='shared'&&(project.entities.some(e=>e.patrol||e.gate||['dynamic','hazard','checkpoint','platform','trigger'].includes(e.role??''))||project.logic?.rules.length||project.logic?.maxLives!==undefined||project.logic?.autoWin===false||!project.entities.some(e=>e.role==='goal')))throw Error('Shared races require a static collectible course with a goal and default gameplay rules');
 const world=compileWorld(project);
 const racers=new Map<string,Racer>(),shared=new Set<string>();let tick=0,phase:RacePhase=mode==='shared'?'lobby':'running',hostId:string|null=null,winnerId:string|null=null;
 return {
  projectJson:JSON.stringify(project),
  add(id:string,name:string){
   if((mode==='shared'&&phase!=='lobby')||!/^[a-f0-9]{16}$/.test(id)||typeof name!=='string'||!name.trim()||name.length>32||/[\u0000-\u001f\u007f]/.test(name)||racers.has(id)||racers.size>=MAX_RACERS)return false;
   racers.set(id,{name:name.trim(),state:begin(project),input:neutral,sequence:-1,inputTick:tick,claimed:0});if(hostId===null)hostId=id;return true;
  },
  remove(id:string){const removed=racers.delete(id);if(removed&&hostId===id)hostId=racers.keys().next().value??null;return removed;},
  start(id:string){if(mode!=='shared'||phase!=='lobby'||id!==hostId||racers.size<2)return false;phase='running';return true;},
  input(id:string,sequence:unknown,rawInput:unknown){
   const racer=racers.get(id),input=readInput(rawInput);
   if(phase!=='running'||!racer||typeof sequence!=='number'||!Number.isSafeInteger(sequence)||sequence<0||sequence<=racer.sequence||!input)return false;
   racer.sequence=sequence;racer.input=input;racer.inputTick=tick;return true;
  },
  step(count=1){
   if(!Number.isSafeInteger(count)||count<1||count>8)throw Error('Invalid server tick count');
   for(let i=0;i<count&&phase==='running';i++){
    tick++;
    if(mode==='independent'){for(const r of racers.values())r.state=advance(world,r.state,tick-r.inputTick<=RACE_INPUT_TTL?r.input:neutral,RACE_STEP);continue;}
    // Interleave the existing 120 Hz collision substeps, with stable join-order tie breaking.
    for(let sub=0;sub<2&&phase==='running';sub++){
     for(const [id,r] of racers){
      r.state=advance(world,{...r.state,collected:new Set(shared)},tick-r.inputTick<=RACE_INPUT_TTL?r.input:neutral,RACE_STEP/2);
      for(const pickup of r.state.collected)if(!shared.has(pickup)){shared.add(pickup);r.claimed++;}
      if(r.state.won){winnerId=id;phase='finished';break;}
     }
    }
   }
  },
  snapshot():RaceSnapshot{return {tick,mode,phase,hostId,winnerId,collectedIds:[...shared],racers:[...racers].map(([id,r])=>({id,name:r.name,position:[...r.state.position],ack:r.sequence,score:r.state.logic.score,collected:mode==='shared'?shared.size:r.state.collected.size,claimed:r.claimed,won:r.state.won,lost:!!r.state.logic.lost,elapsed:r.state.elapsed,respawns:r.state.respawns}))};}
 };
}
