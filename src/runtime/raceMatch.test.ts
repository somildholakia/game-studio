import {describe,it,expect} from 'vitest';
import {entity,type Project} from '../core/project';
import {createRaceMatch,RACE_INPUT_TTL,MAX_RACERS} from './raceMatch';
const a='0000000000000001',b='0000000000000002';
function project(wall=false):Project{
 const p:Project={version:1,name:'Race',entities:[{...entity('box'),role:'player',position:[0,.75,0]},{...entity('sphere'),role:'collectible',position:[2,.75,0]},{...entity('box'),role:'goal',position:[4,.75,0]}]};
 if(wall)p.entities.push({...entity('box'),role:'solid',position:[2,.75,0]});
 return p;
}
const input={x:1,z:0,jump:false};
describe('server-authoritative independent-lane race',()=>{
 it('uses real simulation and common server ticks, rejects spoofed positions and stale inputs',()=>{
  const match=createRaceMatch(JSON.stringify(project()));expect(match.add(a,'A')).toBe(true);expect(match.add(b,'B')).toBe(true);
  expect(match.input(a,0,{...input,position:[100,0,0]})).toBe(false);expect(match.input(a,0,input)).toBe(true);expect(match.input(a,0,{x:-1,z:0,jump:false})).toBe(false);expect(match.input(a,1,{...input,x:Infinity})).toBe(false);
  for(let i=0;i<60;i++){if(i===30)expect(match.input(a,1,input)).toBe(true);match.step();}
  const snap=match.snapshot();expect(snap.tick).toBe(60);expect(snap.racers[0].won).toBe(true);expect(snap.racers[0].collected).toBe(1);expect(snap.racers[0].ack).toBe(1);expect(snap.racers[1].position[0]).toBe(0);expect(snap.racers[1].collected).toBe(0);
  snap.racers[0].position[0]=99;expect(match.snapshot().racers[0].position[0]).not.toBe(99);
 });
 it('obeys authored walls, expires movement input and bounds roster/tick work',()=>{
  const match=createRaceMatch(JSON.stringify(project(true)));for(let i=1;i<=MAX_RACERS;i++)expect(match.add(String(i).padStart(16,'0'),'R')).toBe(true);expect(match.add('ffffffffffffffff','extra')).toBe(false);
  expect(match.input(a,1,input)).toBe(true);for(let i=0;i<RACE_INPUT_TTL;i++)match.step();
  const stopped=match.snapshot().racers[0].position[0];expect(stopped).toBeLessThan(1);for(let i=0;i<60;i++)match.step();expect(match.snapshot().racers[0].position[0]).toBeCloseTo(stopped);expect(match.snapshot().racers[0].won).toBe(false);expect(()=>match.step(9)).toThrow();expect(match.remove(a)).toBe(true);expect(match.input(a,2,input)).toBe(false);
 });
 it('neutralizes stale input in an unobstructed scene',()=>{
  const match=createRaceMatch(JSON.stringify(project()));match.add(a,'A');match.input(a,0,input);for(let i=0;i<RACE_INPUT_TTL;i++)match.step();const x=match.snapshot().racers[0].position[0];for(let i=0;i<60;i++)match.step();expect(match.snapshot().racers[0].position[0]).toBeCloseTo(x);expect(match.snapshot().racers[0].won).toBe(false);
 });
 it('rejects a level without a spawn and oversized projects',()=>{expect(()=>createRaceMatch(JSON.stringify({...project(),entities:[]}))).toThrow();expect(()=>createRaceMatch(' '.repeat(256001))).toThrow();});
});

describe('shared collectible race',()=>{
 it('starts only with host and two racers, claims each pickup once and freezes on first winner',()=>{
  const match=createRaceMatch(JSON.stringify(project()),'shared');
  expect(match.add(a,'A')).toBe(true);expect(match.start(a)).toBe(false);expect(match.add(b,'B')).toBe(true);
  expect(match.input(a,0,input)).toBe(false);match.step(8);expect(match.snapshot().tick).toBe(0);
  expect(match.start(b)).toBe(false);expect(match.start(a)).toBe(true);expect(match.add('ffffffffffffffff','Late')).toBe(false);
  expect(match.input(a,0,input)).toBe(true);expect(match.input(b,0,input)).toBe(true);
  for(let i=0;i<60;i++){if(i===30&&match.snapshot().phase==='running'){match.input(a,1,input);match.input(b,1,input);}match.step();}
  const snap=match.snapshot();expect(snap.phase).toBe('finished');expect(snap.winnerId).toBe(a);expect(snap.collectedIds).toHaveLength(1);
  expect(snap.racers.map(r=>r.claimed)).toEqual([1,0]);expect(snap.racers.map(r=>r.collected)).toEqual([1,1]);expect(snap.racers.filter(r=>r.won)).toHaveLength(1);
  match.step(8);expect(match.snapshot()).toEqual(snap);
 });
 it('passes host ownership in the lobby and rejects unsupported shared world features',()=>{
  const match=createRaceMatch(JSON.stringify(project()),'shared');match.add(a,'A');match.add(b,'B');match.remove(a);expect(match.snapshot().hostId).toBe(b);expect(match.start(b)).toBe(false);
  const p=project();p.entities.push({...entity('box'),role:'dynamic'});expect(()=>createRaceMatch(JSON.stringify(p),'shared')).toThrow();
 });
});
