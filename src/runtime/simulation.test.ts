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
