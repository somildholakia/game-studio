import {describe,it,expect} from 'vitest';
import {begin,step} from './simulation';
import {entity,type Project} from '../core/project';
function world():Project {
 const player={...entity('box'),role:'player' as const,position:[0,1,0] as [number,number,number]};
 const coin={...entity('sphere'),role:'collectible' as const,position:[2,1,0] as [number,number,number]};
 const goal={...entity('box'),role:'goal' as const,position:[4,1,0] as [number,number,number]};
 return {version:1,name:'Test',entities:[player,coin,goal]};
}
describe('runtime',()=>{
 it('collects before winning without editing the source project',()=>{const p=world();const original=JSON.stringify(p);let s=begin(p);for(let i=0;i<30;i++)s=step(p,s,{x:1,z:0},.05);expect(s.collected.size).toBe(1);expect(s.won).toBe(true);expect(JSON.stringify(p)).toBe(original);});
 it('blocks movement into a solid',()=>{const p=world();p.entities.push({...entity('box'),role:'solid',position:[2,1,0]});let s=begin(p);for(let i=0;i<30;i++)s=step(p,s,{x:1,z:0},.05);expect(s.position[0]).toBeLessThan(1);expect(s.won).toBe(false);});
 it('requires a player',()=>expect(()=>begin({...world(),entities:[]})).toThrow());
 it('normalizes diagonal movement',()=>{const p=world();const s=step(p,begin(p),{x:1,z:1},.05);expect(Math.hypot(s.position[0],s.position[2])).toBeCloseTo(.2);});
});

describe('vertical physics',()=>{
 it('lands on the ground and jumps only once per held input',()=>{
 const p=world();let state=begin(p);
 for(let i=0;i<60;i++)state=step(p,state,{x:0,z:0},1/60);
 expect(state.grounded).toBe(true);expect(state.position[1]).toBeCloseTo(.75);
 state=step(p,state,{x:0,z:0,jump:true},1/60);expect(state.velocityY).toBeGreaterThan(0);
 for(let i=0;i<120;i++)state=step(p,state,{x:0,z:0,jump:true},1/60);
 expect(state.grounded).toBe(true);expect(state.position[1]).toBeCloseTo(.75);
 });
 it('lands on a raised platform',()=>{
 const p=world();p.entities[0].position=[0,5,0];p.entities.push({...entity('box'),role:'solid',position:[0,1,0]});
 let state=begin(p);for(let i=0;i<120;i++)state=step(p,state,{x:0,z:0},1/60);
 expect(state.position[1]).toBeCloseTo(2.5);expect(state.grounded).toBe(true);
 });
 it('does not collect items far above the player',()=>{
 const p=world();p.entities[1].position=[0,20,0];const state=step(p,begin(p),{x:0,z:0},.05);expect(state.collected.size).toBe(0);
 });
 it('respawns when falling outside a finite ground',()=>{
 const p=world();p.entities[0].position=[0,.75,0];p.entities.push({...entity('ground'),scale:[.1,1,.1]});
 let state=begin(p);for(let i=0;i<400&&state.respawns===0;i++)state=step(p,state,{x:-1,z:0},1/60);
 expect(state.respawns).toBe(1);expect(state.collected.size).toBe(0);
 });
});

it('dispatches collect events only once per item and preserves the authored rules',()=>{
 const p=world();p.logic={autoWin:false,rules:[{id:'s',event:'start',minScore:0,action:{kind:'message',text:'Begin'}},{id:'a',event:'collect',minScore:0,action:{kind:'score',amount:10}},{id:'b',event:'goal',minScore:10,action:{kind:'win'}}]};
 let state=begin(p);expect(state.logic.message).toBe('Begin');
 for(let i=0;i<60;i++)state=step(p,state,{x:1,z:0},.05);
 expect(state.logic.score).toBe(10);expect(state.won).toBe(true);
});

describe('checkpoints and hazards',()=>{
 it('sets a checkpoint once, then respawns there on hazard contact',()=>{
 const p:Project={version:1,name:'Checkpoint',entities:[{...entity('box'),role:'player',position:[0,.75,0]},{...entity('box'),id:'checkpoint',role:'checkpoint',position:[2,.2,0],scale:[.5,.2,.5]},{...entity('box'),role:'hazard',position:[5,.75,0],scale:[.6,1,.6]}],logic:{autoWin:false,rules:[{id:'cp',event:'checkpoint',minScore:0,action:{kind:'score',amount:10}},{id:'r',event:'respawn',minScore:0,action:{kind:'message',text:'Try again'}}]}};
 let s=begin(p);for(let i=0;i<15;i++)s=step(p,s,{x:1,z:0},.05);
 expect(s.checkpointId).toBe('checkpoint');expect(s.logic.score).toBe(10);
 for(let i=0;i<40&&s.respawns===0;i++)s=step(p,s,{x:1,z:0},.05);
 expect(s.respawns).toBe(1);expect(s.position[0]).toBeCloseTo(2,0);expect(s.logic.message).toBe('Try again');expect(s.logic.score).toBe(0);expect(s.checkpointId).toBe('checkpoint');
 });
 it('returns to the original spawn when no checkpoint is active',()=>{const p:Project={version:1,name:'Hazard',entities:[{...entity('box'),role:'player',position:[0,.75,0]},{...entity('box'),role:'hazard',position:[3,.75,0]}]};let s=begin(p);for(let i=0;i<40&&s.respawns===0;i++)s=step(p,s,{x:1,z:0},.05);expect(s.respawns).toBe(1);expect(s.position[0]).toBeLessThan(.3);expect(s.checkpointId).toBeNull();});
});

it('collects distinct items and dispatches scoped rules to the correct object',()=>{
 const p=world();p.entities[1].id='ruby';p.entities.push({...entity('sphere'),id:'emerald',role:'collectible',position:[5,1,0]});
 p.logic={autoWin:false,rules:[
  {id:'ruby-score',event:'collect',sourceId:'ruby',minScore:0,action:{kind:'score',amount:10}},
  {id:'emerald-score',event:'collect',sourceId:'emerald',minScore:0,action:{kind:'score',amount:20}}
 ]};
 let s=begin(p);for(let i=0;i<40;i++)s=step(p,s,{x:1,z:0},.05);
 expect(s.collected.size).toBe(2);expect(s.logic.score).toBe(30);
});
it('dispatches a second goal entry even if its bounds overlap the first goal',()=>{
 const p=world();p.entities[2].id='first-goal';p.entities.push({...entity('box'),id:'second-goal',role:'goal',position:[5,1,0]});
 p.logic={autoWin:false,rules:[
  {id:'first',event:'goal',sourceId:'first-goal',minScore:0,action:{kind:'score',amount:1}},
  {id:'second',event:'goal',sourceId:'second-goal',minScore:0,action:{kind:'score',amount:10}}
 ]};
 let s=begin(p);for(let i=0;i<28;i++)s=step(p,s,{x:1,z:0},.05);expect(s.logic.score).toBe(11);
 for(let i=0;i<20;i++)s=step(p,s,{x:0,z:0},.05);expect(s.logic.score).toBe(11);
});
