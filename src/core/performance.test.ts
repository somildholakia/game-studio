import {describe,it,expect} from 'vitest';
import {complexMesh,runtimeStressProject} from './performanceFixtures';
import {entity,parseProject} from './project';
import {readMesh} from './mesh';
import {cornerNormals} from './meshNormals';
import {projectUV} from './uv';
import {meshToGlb} from './glbExport';
import {validateGlb} from './assets';
import {begin,compileWorld,advance} from '../runtime/simulation';
function report(name:string,samples:number[],budget:number){
 const sorted=[...samples].sort((a,b)=>a-b),p95=sorted[Math.ceil(sorted.length*.95)-1];
 console.log(JSON.stringify({benchmark:name,samples:samples.length,p95Ms:+p95.toFixed(3),maxMs:+sorted.at(-1)!.toFixed(3),budgetMs:budget}));
 expect(p95).toBeLessThan(budget);
}
describe('controlled CPU performance budgets',()=>{
 it('validates, shades, UV projects and exports near-quota mesh repeatedly',()=>{
 const m=complexMesh();expect(m.vertices.length).toBe(1986);expect(m.triangles.length).toBe(3968);
 const e={...entity('mesh'),mesh:m,smoothNormals:true};
 const run=()=>{const copy=readMesh(m);expect(cornerNormals(copy,true)).toHaveLength(11904);expect(projectUV(copy)).toHaveLength(11904);validateGlb(meshToGlb(e));};
 run();const times=[];for(let i=0;i<12;i++){const t=performance.now();run();times.push(performance.now()-t);}report('mesh pipeline',times,300);
 },20000);
 it('profiles compiled simulation with 1024 static and 16 dynamic bodies',()=>{
 const p=parseProject(JSON.stringify(runtimeStressProject())),w=compileWorld(p);let s=begin(p);
 for(let i=0;i<30;i++)s=advance(w,s,{x:0,z:0},1/60);
 const times=[];for(let i=0;i<180;i++){const t=performance.now();s=advance(w,s,{x:i%120<60?.5:-.5,z:0,jump:i===10},1/60);times.push(performance.now()-t);}
 expect(s.elapsed).toBeCloseTo(3.5,5);expect(s.position.every(Number.isFinite)).toBe(true);expect(s.bodies.size).toBe(16);
 report('simulation CPU step',times,16.7);
 },20000);
});
