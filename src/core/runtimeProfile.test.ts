import {describe,it,expect} from 'vitest';
import {createRuntimeProfiler} from './runtimeProfile';
describe('bounded runtime profiler',()=>{
 it('keeps the most recent finite samples and computes p95 and max independently',()=>{
  const p=createRuntimeProfiler(20);for(let i=1;i<=25;i++)p.record(i,i/2,i*2);
  const s=p.snapshot();expect(s.frame).toEqual({samples:20,p95Ms:24,maxMs:25});
  expect(s.simulation.p95Ms).toBe(12);expect(s.renderSubmit.p95Ms).toBe(48);
  p.record(Infinity,1,1);p.record(1,-1,1);p.record(0,0,0);expect(p.snapshot()).toEqual(s);
  p.reset();expect(p.snapshot().frame).toEqual({samples:0,p95Ms:0,maxMs:0});p.record(1,2,3);expect(p.snapshot().simulation.maxMs).toBe(2);
 });
 it('rejects excessive capacity',()=>expect(()=>createRuntimeProfiler(100000)).toThrow());
});
