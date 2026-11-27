import {describe,it,expect} from 'vitest';
import {entity,type Project} from '../core/project';
import {indexBounds,type Bounds} from './collision';
import {compileBodies,initialBodies,advanceBodies,defaultBody,readBody} from './bodies';
const fixture=()=>({version:1,name:'Physics',entities:[{...entity('box'),role:'dynamic',position:[0,4,0],body:{...defaultBody,restitution:0}}]} as Project);
const floor={center:[0,0,0] as [number,number,number],half:[10,0,10] as [number,number,number]};
const player={center:[9,1,9] as [number,number,number],half:[.5,.75,.5] as [number,number,number]};
describe('translational dynamics',()=>{it('falls and settles on a floor without mutating the initial state',()=>{const specs=compileBodies(fixture()),initial=initialBodies(specs);let s=initial;for(let i=0;i<240;i++)s=advanceBodies(specs,s,[],[floor],[],20,-30,1/120,player,[0,0,0]);expect(s.get(specs[0].id)?.position[1]).toBeCloseTo(.75);expect(initial.get(specs[0].id)?.position[1]).toBe(4);});it('blocks against static walls and rejects invalid body settings',()=>{const p=fixture();p.entities[0].position=[0,.75,0];p.entities[0].body={...defaultBody,restitution:0,friction:0,velocity:[10,0,0]};const specs=compileBodies(p);let s=initialBodies(specs);for(let i=0;i<120;i++)s=advanceBodies(specs,s,[{center:[3,1,0],half:[.75,1,.75]}],[floor],[],20,-30,1/120,player,[0,0,0]);expect(s.get(specs[0].id)?.position[0]).toBeCloseTo(1.5);expect(()=>readBody({...defaultBody,mass:0})).toThrow();});});

import {begin,step} from './simulation';
import {parseProject} from '../core/project';
import {physicsTemplate} from '../core/templates';
it('moves a crate under player pushing while preserving authored data',()=>{const p:Project={version:1,name:'Push',entities:[{...entity('box'),role:'player',position:[0,.75,0]},{...entity('box'),id:'crate',role:'dynamic',position:[2,.75,0],body:{...defaultBody,mass:.5,friction:1,restitution:0}}]};const before=JSON.stringify(p);let s=begin(p);for(let i=0;i<60;i++)s=step(p,s,{x:1,z:0},.05);expect(s.bodies.get('crate')!.position[0]).toBeGreaterThan(3);expect(JSON.stringify(p)).toBe(before);});
it('round trips the physics playground and rejects excess or invalid bodies',()=>{const p=physicsTemplate();const parsed=parseProject(JSON.stringify(p));expect(parsed.entities.find(e=>e.role==='dynamic')?.body?.mass).toBe(.6);expect(parsed.entities.find(e=>e.role==='hazard')?.patrol?.period).toBe(5);const bad:Project={...p,entities:Array.from({length:65},()=>({...entity('box'),role:'dynamic' as const}))};expect(()=>parseProject(JSON.stringify(bad))).toThrow();});

it('uses indexed static bounds for dynamic body sweeps without changing results',()=>{const p=fixture();p.entities[0].position=[0,.75,0];p.entities[0].body={...defaultBody,restitution:0,friction:0,velocity:[10,0,0]};const specs=compileBodies(p);let a=initialBodies(specs),b=initialBodies(specs);const solids:Bounds[]=[{center:[3,1,0],half:[.75,1,.75]},...Array.from({length:200},(_,i)=>({center:[i*10+100,1,0] as [number,number,number],half:[1,1,1] as [number,number,number]}))];const index=indexBounds(solids);for(let i=0;i<120;i++){a=advanceBodies(specs,a,solids,[floor],[],20,-30,1/120,player,[0,0,0]);b=advanceBodies(specs,b,index,[floor],[],20,-30,1/120,player,[0,0,0]);}expect(b).toEqual(a);});

import type {BodySpec} from './bodies';
const movingBody=(id:string,x:number,v:number,mass:number,restitution:number):BodySpec=>({id,bounds:{center:[x,5,0],half:[.75,.75,.75]},settings:{...defaultBody,velocity:[v,0,0],mass,restitution,friction:0}});
const noContactPlayer:Bounds={center:[100,5,0],half:[.5,.5,.5]};
const contactStep=(specs:BodySpec[],dt:number)=>advanceBodies(specs,initialBodies(specs),[],[],[],0,-30,dt,noContactPlayer,[0,0,0]);
it('exchanges normal momentum for equal-mass approaching bodies without adding kinetic energy',()=>{const specs=[movingBody('a',-1.2,5,1,.8),movingBody('b',1.2,-5,1,.8)];const result=contactStep(specs,.1);expect(result.get('a')!.velocity[0]).toBeCloseTo(-4);expect(result.get('b')!.velocity[0]).toBeCloseTo(4);expect(result.get('b')!.position[0]-result.get('a')!.position[0]).toBeCloseTo(1.5);expect(result.get('a')!.velocity[0]**2+result.get('b')!.velocity[0]**2).toBeLessThan(50);});
it('transfers less speed to a heavier body and conserves linear momentum',()=>{const result=contactStep([movingBody('a',0,4,1,0),movingBody('b',1.5,0,3,0)],1/120);const a=result.get('a')!,b=result.get('b')!;expect(a.velocity[0]).toBeCloseTo(1);expect(b.velocity[0]).toBeCloseTo(1);expect(a.velocity[0]+3*b.velocity[0]).toBeCloseTo(4);expect(b.position[0]-a.position[0]).toBeGreaterThanOrEqual(1.5);});

it('separates initially overlapping bodies with mass-weighted correction and preserves prior state',()=>{
 const specs=[movingBody('a',0,0,1,0),movingBody('b',1,0,3,0)],before=initialBodies(specs);
 const result=advanceBodies(specs,before,[],[],[],0,-30,1/120,noContactPlayer,[0,0,0]);
 const a=result.get('a')!,b=result.get('b')!;
 expect(b.position[0]-a.position[0]).toBeCloseTo(1.5);expect(a.position[0]).toBeCloseTo(-.375);expect(b.position[0]).toBeCloseTo(1.125);expect(before.get('a')!.position[0]).toBe(0);
});
it('dissipates tangential contact velocity without increasing pair momentum or energy',()=>{
 const a=movingBody('a',0,4,1,0),b=movingBody('b',1.5,0,1,0);a.settings={...a.settings,friction:20,velocity:[4,0,2]};b.settings={...b.settings,friction:20};
 const result=contactStep([a,b],1/120),va=result.get('a')!.velocity,vb=result.get('b')!.velocity;
 expect(va[0]).toBeCloseTo(2);expect(vb[0]).toBeCloseTo(2);expect(va[2]).toBeCloseTo(1);expect(vb[2]).toBeCloseTo(1);expect(va[2]+vb[2]).toBeCloseTo(2);
 expect(va.reduce((n,v)=>n+v*v,0)+vb.reduce((n,v)=>n+v*v,0)).toBeLessThan(20);
});

it('persists angular settings and integrates a free spinning box without mutating authored state',()=>{
 const p=fixture();p.entities[0].body={...defaultBody,angular:{velocity:[0,0,Math.PI],damping:0}};
 p.entities[0].scale=[2,1,1];const parsed=parseProject(JSON.stringify(p));const specs=compileBodies(parsed),initial=initialBodies(specs);let state=initial;
 for(let i=0;i<60;i++)state=advanceBodies(specs,state,[],[],[],0,-30,1/120,noContactPlayer,[0,0,0]);
 const body=state.get(specs[0].id)!;expect(body.angular).toBeDefined();expect(Math.hypot(...body.angular!.orientation)).toBeCloseTo(1);expect(body.angular!.orientation[2]).toBeCloseTo(Math.SQRT1_2);expect(initial.get(specs[0].id)!.angular!.orientation).toEqual([0,0,0,1]);
 expect(()=>readBody({...defaultBody,angular:{velocity:[0,0,21],damping:0}})).toThrow();
});
it('transfers floor friction into spin for opt-in rolling spheres',()=>{
 const p=fixture();p.entities[0].kind='sphere';p.entities[0].position=[0,.75,0];p.entities[0].body={...defaultBody,velocity:[3,0,0],friction:20,restitution:0,angular:{velocity:[0,0,0],damping:0}};
 const specs=compileBodies(p);let state=initialBodies(specs);for(let i=0;i<120;i++)state=advanceBodies(specs,state,[],[floor],[],20,-30,1/120,noContactPlayer,[0,0,0]);
 const b=state.get(specs[0].id)!;expect(b.position[1]).toBeCloseTo(.75);expect(b.angular!.angularVelocity[2]).toBeLessThan(-1);expect(b.velocity[0]).toBeLessThan(3);expect(b.velocity[0]+.75*b.angular!.angularVelocity[2]).toBeCloseTo(0,3);
});
