import {describe,it,expect} from 'vitest';
import {createAssetQueue} from './assetQueue';
describe('bounded asset decode scheduling',()=>{
 it('runs at most two jobs, drops stale requests and releases a slot after errors',async()=>{
 const q=createAssetQueue(2),started:number[]=[],finish:((error?:Error)=>void)[]=[];let valid=true;
 const run=(i:number)=>()=>new Promise<void>((resolve,reject)=>{started.push(i);finish.push(error=>error?reject(error):resolve());});
 const a=q.enqueue(()=>true,run(1)),b=q.enqueue(()=>true,run(2)),stale=q.enqueue(()=>valid,run(3)),d=q.enqueue(()=>true,run(4));
 await Promise.resolve();expect(started).toEqual([1,2]);expect(q.stats()).toMatchObject({active:2,pending:2});valid=false;q.prune();await stale;
 finish[0](Error('decode'));await expect(a).rejects.toThrow('decode');for(let i=0;i<10&&started.length<3;i++)await Promise.resolve();expect(started).toEqual([1,2,4]);finish[1]();finish[2]();await Promise.all([b,d]);
 });
 it('closing drops pending jobs and prevents new work',async()=>{const q=createAssetQueue(1);let release!:()=>void;const a=q.enqueue(()=>true,()=>new Promise<void>(r=>{release=r;}));await Promise.resolve();let started=false;const b=q.enqueue(()=>true,async()=>{started=true;});q.close();await b;await q.enqueue(()=>true,async()=>{started=true;});expect(started).toBe(false);release();await a;});
});

it('close before a scheduled microtask prevents its decoder from starting',async()=>{const q=createAssetQueue(1);let called=false;const work=q.enqueue(()=>true,async()=>{called=true;});q.close();await work;expect(called).toBe(false);});
