import {describe,it,expect} from 'vitest';
import {entity,parseProject,type Project} from './project';
import {validateGlb} from './assets';
import {meshToGlb} from './glbExport';
import {readMesh,cubeMesh} from './mesh';
import {previewPlan} from '../ai/plan';
import {readShaderGraph} from './shaderGraph';
import {readMeshModifierState} from './meshModifiers';
import {readCreatorTool} from './creatorTools';
function random(seed:number){return ()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0;};}
const base:Project={version:1,name:'Fuzz seed',entities:[{...entity('mesh'),id:'mesh'}]};
function mutate(value:unknown,next:()=>number):unknown{
 const bad=[null,undefined,false,true,0,-1,1e200,'__proto__','</script><script>bad()</script>',[],{},[null,{}]];
 const copy=structuredClone(value);
 if(!copy||typeof copy!=='object')return bad[next()%bad.length];
 let target=copy as Record<string,unknown>;
 for(let d=0;d<4;d++){const keys=Object.keys(target);if(!keys.length)break;const key=keys[next()%keys.length],v=target[key];if(d<3&&v&&typeof v==='object'&&next()%2){target=v as Record<string,unknown>;continue;}if(next()%4===0)delete target[key];else target[key]=bad[next()%bad.length];break;}
 return copy;
}
describe('seeded untrusted-input regression fuzzing',()=>{
 it('project mutations either reject or yield a stable validated schema',()=>{const next=random(0x41c6ce57);let accepted=0,rejected=0;for(let i=0;i<600;i++){let p:Project;try{p=parseProject(JSON.stringify(mutate(base,next)));}catch{rejected++;continue;}accepted++;expect(parseProject(JSON.stringify(p))).toEqual(p);expect(Object.prototype).not.toHaveProperty('polluted');}expect(accepted).toBeGreaterThan(0);expect(rejected).toBeGreaterThan(0);});
 it('mutates GLB headers, JSON and buffers without unbounded or non-Error failures',()=>{const next=random(0x12345678),valid=meshToGlb(base.entities[0]);let rejected=0;for(let i=0;i<600;i++){const b=valid.slice(0,i%5===0?next()%valid.length:valid.length);for(let j=0;j<1+i%4&&b.length;j++)b[next()%b.length]=next()%256;try{validateGlb(b);}catch(e){expect(e).toBeInstanceOf(Error);rejected++;}}expect(rejected).toBeGreaterThan(100);expect(()=>validateGlb(valid)).not.toThrow();});
 it('rejects prototype keys and invalid plans without mutating the source',()=>{const snapshot=JSON.stringify(base);for(const op of ['__proto__','constructor','prototype','execute','fetch'])expect(()=>previewPlan(base,JSON.stringify({version:1,summary:'bad',commands:[{op}]}))).toThrow();expect(()=>previewPlan(base,'{"version":1,"summary":"bad","commands":[{"op":"edit","id":"mesh","patch":{"__proto__":{"polluted":true}}}]}')).toThrow();expect(JSON.stringify(base)).toBe(snapshot);expect(Object.prototype).not.toHaveProperty('polluted');});
 it('rejects forward references, invalid geometry and executable tool payloads',()=>{expect(()=>readShaderGraph({version:1,nodes:[{kind:'mix',a:0,b:0,factor:.5}]})).toThrow();expect(()=>readMesh({...cubeMesh(),triangles:[[0,0,1]]})).toThrow();expect(()=>readMeshModifierState({source:cubeMesh(),steps:[{kind:'eval',code:'fetch()'}]})).toThrow();expect(()=>readCreatorTool('{"format":"game-studio-tool","version":1,"code":"fetch()"}')).toThrow();});
 it('bounds oversized raw project JSON before parse',()=>{expect(()=>parseProject(' '.repeat(10_000_001))).toThrow(/10 MB/);});
});
