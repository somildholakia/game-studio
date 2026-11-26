import {describe,it,expect} from 'vitest';
import {entity,type Project} from '../core/project';
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
