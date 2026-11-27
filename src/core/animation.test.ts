import {describe,it,expect} from 'vitest';import {capture,sample,readClip} from './animation';import {entity,duplicateEntity} from './project';
describe('transform clips',()=>{it('captures and interpolates ordered poses',()=>{let e=entity('box');e.position=[0,0,0];e.animation=capture(e,0);e.position=[4,2,-2];const clip=capture(e,2);expect(sample(clip,1).position).toEqual([2,1,-1]);expect(sample(clip,3).position).toEqual([2,1,-1]);expect(sample({...clip,loop:false},9).position).toEqual([4,2,-2]);});it('rejects missing zero, duplicates and non-finite values',()=>{const e=entity('box'),clip=capture(e,0);expect(()=>readClip({...clip,keys:[{...clip.keys[0],time:1}]})).toThrow();expect(()=>readClip({...clip,keys:[clip.keys[0],clip.keys[0]]})).toThrow();});});

it('offsets animation positions when duplicating an object',()=>{const e=entity('box');e.animation=capture(e,0);const copy=duplicateEntity(e);expect(copy.animation?.keys[0].position[0]).toBe(e.position[0]+1);expect(e.animation.keys[0].position[0]).toBe(e.position[0]);});

it('samples smooth and stepped clips with exact keyframe boundaries',()=>{
 const e=entity('box');e.position=[0,0,0];e.animation=capture(e,0);e.position=[8,0,0];const clip=capture(e,2);
 expect(sample({...clip,interpolation:'smooth'},.5).position[0]).toBeCloseTo(1.25);
 expect(sample({...clip,interpolation:'step'},1.99).position[0]).toBe(0);
 expect(sample({...clip,interpolation:'step',loop:false},2).position[0]).toBe(8);
 expect(sample(clip,NaN).position[0]).toBe(0);
});
it('plays ping-pong loops and preserves options when capturing a pose',()=>{
 const e=entity('box');e.position=[0,0,0];e.animation={...capture(e,0),interpolation:'smooth',pingPong:true};e.position=[8,0,0];const clip=capture(e,2);
 expect(readClip(clip)).toEqual(clip);expect(clip.interpolation).toBe('smooth');
 expect(sample(clip,2).position[0]).toBe(8);expect(sample(clip,3).position[0]).toBe(4);
 expect(sample(clip,4).position[0]).toBe(0);expect(sample(clip,-1).position[0]).toBe(4);
 expect(sample({...clip,loop:false},3).position[0]).toBe(8);
 expect(()=>readClip({...clip,interpolation:'invalid'})).toThrow();
 expect(()=>readClip({...clip,pingPong:'yes'})).toThrow();
});
