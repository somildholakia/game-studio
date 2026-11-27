import {describe,it,expect} from 'vitest';
import {initialProject,parseProject} from '../core/project';
import {addScene} from '../core/scenes';
import {makeProgress,readProgress,projectFingerprint} from './progress';
describe('portable campaign saves',()=>{
 it('loads the matching level without mutating authored data',()=>{const p=addScene(initialProject(),'Stage 2'),before=JSON.stringify(p);const save=makeProgress(p,1);expect(readProgress(JSON.stringify(save),p)).toBe(1);expect(projectFingerprint(structuredClone(p))).toBe(save.fingerprint);expect(JSON.stringify(p)).toBe(before);});
 it('rejects unrelated, edited, malformed or oversized saves',()=>{const p=initialProject(),s=makeProgress(p,0);expect(()=>readProgress(JSON.stringify(s),{...p,name:'Other game'})).toThrow('different game');expect(()=>readProgress(JSON.stringify({...s,levelId:'missing'}),p)).toThrow('no longer exists');expect(()=>readProgress(JSON.stringify({...s,version:2}),p)).toThrow();expect(()=>readProgress(' '.repeat(4097),p)).toThrow('size limit');expect(()=>makeProgress(p,1)).toThrow();});
});

it('normalizes legacy optional defaults before fingerprinting so reopened levels match',()=>{const p=initialProject();expect(projectFingerprint(p)).toBe(projectFingerprint(parseProject(JSON.stringify(p))));});

it('ignores changes to unused authoring material presets when fingerprinting',()=>{const p=initialProject();const saved=makeProgress(p,0);const withPresets={...p,materialPresets:[{name:'Unused',color:'#112233',material:{metallic:0,roughness:.5,emissive:'#000000'}}]};expect(readProgress(JSON.stringify(saved),withPresets)).toBe(0);expect(projectFingerprint({...withPresets,entities:p.entities.map(e=>({...e,color:'#ff0000'}))})).not.toBe(saved.fingerprint);});
