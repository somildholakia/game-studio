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

it('dispatches timed rules on simulated second boundaries and stops at win',()=>{
 const p=world();p.logic={autoWin:false,rules:[
  {id:'tick',event:'second',minScore:0,timing:{start:1,repeat:1},action:{kind:'score',amount:1}},
  {id:'once',event:'second',minScore:0,once:true,action:{kind:'score',amount:10}},
  {id:'end',event:'second',minScore:0,timing:{start:3,repeat:0},action:{kind:'win'}}
 ]};
 let s=begin(p);for(let i=0;i<19;i++)s=step(p,s,{x:0,z:0},.05);
 expect(s.logic.score).toBe(0);s=step(p,s,{x:0,z:0},.05);expect(s.logic.score).toBe(11);
 for(let i=0;i<40;i++)s=step(p,s,{x:0,z:0},.05);
 expect(s.won).toBe(true);expect(s.logic.score).toBe(13);expect(step(p,s,{x:0,z:0},.1)).toBe(s);
});
it('resets once-only rules on respawn while keeping the level clock',()=>{
 const p=world();p.logic={autoWin:false,rules:[{id:'one',event:'second',once:true,minScore:0,action:{kind:'score',amount:1}}]};
 let s=begin(p);for(let i=0;i<20;i++)s=step(p,s,{x:0,z:0},.05);
 expect(s.logic.score).toBe(1);s=step(p,{...s,position:[0,-1000,0]},{x:0,z:0},.05);
 expect(s.respawns).toBe(1);expect(s.logic.score).toBe(0);expect(s.elapsed).toBeGreaterThan(1);
 for(let i=0;i<20;i++)s=step(p,s,{x:0,z:0},.05);expect(s.logic.score).toBe(1);
});

it('stops a timed defeat, prevents automatic win, and restarts fresh',()=>{
 const p=world();p.logic={autoWin:true,rules:[{id:'timeout',event:'second',minScore:0,timing:{start:1,repeat:0},action:{kind:'lose'}}]};
 let s=begin(p);for(let i=0;i<20;i++)s=step(p,s,{x:0,z:0},.05);
 expect(s.logic.lost).toBe(true);expect(s.won).toBe(false);
 expect(step(p,s,{x:1,z:0},.1)).toBe(s);
 const fresh=begin(p);expect(fresh.logic.lost).toBeUndefined();expect(fresh.elapsed).toBe(0);
});
it('uses limited lives per level and preserves final score instead of respawning on last death',()=>{
 const p=world();p.logic={autoWin:false,maxLives:2,rules:[{id:'respawn',event:'respawn',minScore:0,action:{kind:'score',amount:5}}]};
 let s=begin(p);
 s=step(p,{...s,position:[0,-1000,0]},{x:0,z:0},.05);
 expect(s.respawns).toBe(1);expect(s.logic.lost).toBeUndefined();expect(s.logic.score).toBe(5);
 s=step(p,{...s,position:[0,-1000,0]},{x:0,z:0},.05);
 expect(s.respawns).toBe(2);expect(s.logic.lost).toBe(true);expect(s.won).toBe(false);
 expect(s.logic.score).toBe(5);expect(s.logic.message).toBe('No lives remaining');
 expect(step(p,s,{x:1,z:0},.05)).toBe(s);expect(begin(p).respawns).toBe(0);
});

it('tracks independent trigger zone entry and exit without blocking movement',()=>{
 const p:Project={version:1,name:'Zones',entities:[
 {...entity('box'),role:'player',position:[0,.75,0]},
 {...entity('box'),id:'a',role:'trigger',position:[3,.75,0],scale:[1,2,2]},
 {...entity('box'),id:'b',role:'trigger',position:[4,.75,0],scale:[1,2,2]}
 ],logic:{autoWin:false,rules:[
 {id:'any',event:'zone-enter',minScore:0,action:{kind:'score',amount:1}},
 {id:'a',event:'zone-enter',sourceId:'a',minScore:0,action:{kind:'score',amount:10}},
 {id:'out',event:'zone-exit',sourceId:'a',minScore:0,action:{kind:'score',amount:100}}
 ]}};
 let s=begin(p);for(let i=0;i<16;i++)s=step(p,s,{x:1,z:0},.05);
 expect(s.insideZoneIds).toEqual(new Set(['a','b']));expect(s.logic.score).toBe(12);
 for(let i=0;i<5;i++)s=step(p,s,{x:0,z:0},.05);expect(s.logic.score).toBe(12);
 for(let i=0;i<12;i++)s=step(p,s,{x:1,z:0},.05);
 expect(s.insideZoneIds.size).toBe(0);expect(s.logic.score).toBe(112);expect(s.position[0]).toBeGreaterThan(5);
});
it('clears zone occupancy on respawn and does not dispatch synthetic exits',()=>{
 const p:Project={version:1,name:'Zone spawn',entities:[
 {...entity('box'),role:'player',position:[0,.75,0]},
 {...entity('box'),id:'zone',role:'trigger',position:[0,.75,0],scale:[2,2,2]}
 ],logic:{autoWin:false,rules:[
 {id:'in',event:'zone-enter',minScore:0,action:{kind:'score',amount:1}},
 {id:'out',event:'zone-exit',minScore:0,action:{kind:'score',amount:100}}
 ]}};
 let s=step(p,begin(p),{x:0,z:0},.05);expect(s.logic.score).toBe(1);
 s=step(p,{...s,position:[0,-1000,0]},{x:0,z:0},.005);expect(s.insideZoneIds.size).toBe(0);expect(s.logic.score).toBe(0);
 s=step(p,s,{x:0,z:0},.05);expect(s.logic.score).toBe(1);
});

it('allows a coyote jump just after leaving a platform but never a second aerial jump',()=>{
 const p:Project={version:1,name:'Grace',entities:[{...entity('box'),role:'player',position:[0,.75,0]}, {...entity('ground'),scale:[.1,1,.1]}],physics:{gravity:20,moveSpeed:4,jumpSpeed:7,fallLimit:-30,coyoteTime:.15}};
 let s=step(p,begin(p),{x:0,z:0},.05);expect(s.grounded).toBe(true);
 for(let i=0;i<20&&s.grounded;i++)s=step(p,s,{x:1,z:0},.05);
 expect(s.grounded).toBe(false);expect(s.coyoteRemaining).toBeGreaterThan(0);
 s=step(p,s,{x:0,z:0,jump:true},.01);expect(s.velocityY).toBeGreaterThan(0);expect(s.jumps).toBe(1);
 s=step(p,s,{x:0,z:0},.01);s=step(p,s,{x:0,z:0,jump:true},.01);expect(s.jumps).toBe(1);
});
it('buffers a single early jump press until landing, then consumes it',()=>{
 const p:Project={version:1,name:'Buffer',entities:[{...entity('box'),role:'player',position:[0,.85,0]}],physics:{gravity:20,moveSpeed:4,jumpSpeed:7,fallLimit:-30,jumpBuffer:.2}};
 let s=step(p,begin(p),{x:0,z:0,jump:true},.02);expect(s.jumps).toBe(0);expect(s.bufferRemaining).toBeGreaterThan(0);
 for(let i=0;i<10&&s.jumps===0;i++)s=step(p,s,{x:0,z:0,jump:true},.02);
 expect(s.jumps).toBe(1);expect(s.velocityY).toBeGreaterThan(0);expect(s.bufferRemaining).toBe(0);
 for(let i=0;i<60;i++)s=step(p,s,{x:0,z:0,jump:true},.02);expect(s.jumps).toBe(1);
});
it('expires buffered presses and clears both aids on respawn',()=>{
 const p:Project={version:1,name:'Expiry',entities:[{...entity('box'),role:'player',position:[0,3,0]}],physics:{gravity:20,moveSpeed:4,jumpSpeed:7,fallLimit:-30,jumpBuffer:.05,coyoteTime:.1}};
 let s=step(p,begin(p),{x:0,z:0,jump:true},.02);for(let i=0;i<35;i++)s=step(p,s,{x:0,z:0,jump:true},.02);
 expect(s.jumps).toBe(0);expect(s.bufferRemaining).toBe(0);
 s=step(p,{...s,position:[0,-1000,0],bufferRemaining:.05,coyoteRemaining:.1},{x:0,z:0},.005);
 expect(s.bufferRemaining).toBe(0);expect(s.coyoteRemaining).toBe(0);
});

it('opens a counter gate after collecting a key and uses the same state for collision',()=>{
 const p:Project={version:1,name:'Door',entities:[
 {...entity('box'),role:'player',position:[0,.75,0]},
 {...entity('box'),id:'door',role:'solid',position:[3,.75,0],gate:{key:'keys',comparison:'gte',value:1}},
 {...entity('sphere'),role:'collectible',position:[-3,.75,0]}],
 logic:{autoWin:false,rules:[{id:'key',event:'collect',minScore:0,action:{kind:'counter',key:'keys',mode:'add',amount:1}}]}};
 let s=begin(p);for(let i=0;i<25;i++)s=step(p,s,{x:1,z:0},.05);
 expect(s.position[0]).toBeCloseTo(1.5);expect(s.openGates.size).toBe(0);
 for(let i=0;i<25;i++)s=step(p,s,{x:-1,z:0},.05);
 expect(s.openGates.has('door')).toBe(true);
 for(let i=0;i<40;i++)s=step(p,s,{x:1,z:0},.05);
 expect(s.position[0]).toBeGreaterThan(3);
});
it('defers closing an open gate while the player occupies it',()=>{
 const p:Project={version:1,name:'Door',entities:[
 {...entity('box'),role:'player',position:[0,.75,0]},
 {...entity('box'),id:'door',role:'solid',position:[0,.75,0],gate:{key:'keys',comparison:'eq',value:0}}],
 logic:{autoWin:false,rules:[{id:'close',event:'second',minScore:0,action:{kind:'counter',key:'keys',mode:'set',amount:1}}]}};
 let s=begin(p);expect(s.openGates.has('door')).toBe(true);
 for(let i=0;i<25;i++)s=step(p,s,{x:0,z:0},.05);
 expect(s.openGates.has('door')).toBe(true);
 for(let i=0;i<15;i++)s=step(p,s,{x:1,z:0},.05);
 expect(s.openGates.size).toBe(0);
 for(let i=0;i<15;i++)s=step(p,s,{x:-1,z:0},.05);
 expect(s.position[0]).toBeCloseTo(1.5);
});

it('blocks movement and supports landing on transformed custom mesh bounds',()=>{
 const platform={...entity('mesh'),role:'solid' as const,position:[3,1,0] as [number,number,number],scale:[1,1,1] as [number,number,number]};
 const p:Project={version:1,name:'Custom collider',entities:[{...entity('box'),role:'player',position:[0,.75,0]},platform]};
 let s=begin(p);for(let i=0;i<30;i++)s=step(p,s,{x:1,z:0},.05);expect(s.position[0]).toBeCloseTo(1.5);
 p.entities[0].position=[3,4,0];s=begin(p);for(let i=0;i<40;i++)s=step(p,s,{x:0,z:0},.05);expect(s.grounded).toBe(true);expect(s.position[1]).toBeCloseTo(2.5);
});

describe('moving one-way platforms',()=>{
 function stage(offset:[number,number,number],period=4):Project{return {version:1,name:'Ride',entities:[{...entity('box'),role:'player',position:[0,1.9,0]},{...entity('box'),id:'ride',role:'platform',position:[0,1,0],scale:[2,.2,2],patrol:{offset,period}}]};}
 it('carries the player horizontally and detaches when jumping',()=>{const p=stage([4,0,0]);let s=begin(p);for(let i=0;i<20;i++)s=step(p,s,{x:0,z:0},.05);expect(s.platformId).toBe('ride');expect(s.position[0]).toBeGreaterThan(1.5);expect(s.position[1]).toBeCloseTo(1.9);const x=s.position[0];s=step(p,s,{x:0,z:0,jump:true},.05);expect(s.platformId).toBeNull();expect(s.position[0]).toBeCloseTo(x);expect(s.velocityY).toBeGreaterThan(0);});
 it('supports ascending and descending elevators',()=>{const p=stage([0,2,0],2);let s=begin(p);for(let i=0;i<20;i++)s=step(p,s,{x:0,z:0},.05);expect(s.platformId).toBe('ride');expect(s.position[1]).toBeCloseTo(3.9);for(let i=0;i<20;i++)s=step(p,s,{x:0,z:0},.05);expect(s.platformId).toBe('ride');expect(s.position[1]).toBeCloseTo(1.9);});
 it('does not block horizontal motion beneath the support',()=>{const p=stage([0,0,0]);p.entities[0].position=[-3,.75,0];p.entities[1].position=[0,3,0];let s=begin(p);for(let i=0;i<30;i++)s=step(p,s,{x:1,z:0},.05);expect(s.position[0]).toBeGreaterThan(2);expect(s.platformId).toBeNull();});
});

import {skyTransitTemplate} from '../core/templates';
it('completes Sky Transit by riding the shuttle, collecting its key and opening the gate',()=>{const p=skyTransitTemplate();const gate=p.entities.find(e=>e.gate)!;let s=begin(p);expect(s.openGates.has(gate.id)).toBe(false);for(let i=0;i<100&&!s.won;i++)s=step(p,s,{x:0,z:0},.05);expect(s.logic.counters?.keys).toBe(1);expect(s.openGates.has(gate.id)).toBe(true);expect(s.won).toBe(true);});
