import {describe,it,expect} from 'vitest';
import {limbSkin,skinLimb} from './skinning';
describe('weighted skeletal skinning',()=>{
 it('preserves bind pose and valid topology',()=>{const m=limbSkin(1,.1);const rest=m.vertices.flatMap(v=>v.position);skinLimb(m,1,0,0).forEach((v,i)=>expect(v).toBeCloseTo(rest[i],10));expect(m.indices.every(i=>i>=0&&i<m.vertices.length)).toBe(true);expect(m.uvs.length).toBe(m.vertices.length*2);expect(m.vertices.some(v=>v.lowerWeight===.5)).toBe(true);});
 it('blends both bone transforms across the joint',()=>{const m=limbSkin(1,.1),p=skinLimb(m,1,0,90),i=4*13;expect(p[i*3]).toBeCloseTo(.1);expect(p[i*3+1]).toBeCloseTo(-1);expect(p[i*3+2]).toBeCloseTo(0);const tip=8*13;expect(p[tip*3+1]).toBeCloseTo(-1);expect(p[tip*3+2]).toBeCloseTo(-1);const edge=4*13+3;expect(p[edge*3+1]).toBeCloseTo(-1.05);expect(p[edge*3+2]).toBeCloseTo(.05);});
 it('keeps endpoint transforms correct under two bends and every value finite',()=>{const m=limbSkin(.23,.06),p=skinLimb(m,.23,90,-90),tip=8*13;expect(p[tip*3+1]).toBeCloseTo(-.23);expect(p[tip*3+2]).toBeCloseTo(-.23);expect(p.every(Number.isFinite)).toBe(true);});
});
