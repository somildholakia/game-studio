import {describe,it,expect} from 'vitest';
import {encodeProjectBundle,decodeProjectBundle} from './projectBundle';
import {entity,parseProject,type Project} from './project';
describe('compressed portable project bundle',()=>{
 it('round trips repetitive scene data with measurable compression',async()=>{const p:Project={version:1,name:'Bundle',entities:Array.from({length:100},(_,i)=>({...entity('box'),id:'cube-'+i}))};const bytes=await encodeProjectBundle(p);expect(bytes.length).toBeLessThan(JSON.stringify(p).length/2);expect(await decodeProjectBundle(bytes)).toEqual(parseProject(JSON.stringify(p)));});
 it('rejects wrong magic, length, checksum and inflated declared size',async()=>{const bytes=await encodeProjectBundle({version:1,name:'test',entities:[entity('box')]});for(const mutate of [(b:Uint8Array)=>{b[0]=0;},(b:Uint8Array)=>{b[16]^=1;},(b:Uint8Array)=>{new DataView(b.buffer).setUint32(8,10_000_001,true);},(b:Uint8Array)=>{new DataView(b.buffer).setUint32(8,1,true);},(b:Uint8Array)=>{b[12]^=1;}]){const b=bytes.slice();mutate(b);await expect(decodeProjectBundle(b)).rejects.toThrow();}});
});
