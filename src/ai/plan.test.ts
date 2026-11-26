import {describe,it,expect} from 'vitest';
import {initialProject,entity} from '../core/project';
import {previewPlan,readPlan} from './plan';
const plan=(commands:unknown[])=>JSON.stringify({version:1,summary:'Test',commands});
describe('AI command boundary',()=>{
 it('previews additions atomically without editing input',()=>{const p=initialProject();const before=JSON.stringify(p);const result=previewPlan(p,plan([{op:'add',kind:'box',patch:{name:'Wall',role:'solid',position:[0,1,2]}}]));expect(result.changes).toEqual(['Add: Wall (box)']);expect(result.next.entities).toHaveLength(p.entities.length+1);expect(JSON.stringify(p)).toBe(before);});
 it('rejects code and unknown properties',()=>{expect(()=>readPlan(plan([{op:'eval',code:'alert(1)'}]))).toThrow();expect(()=>readPlan(plan([{op:'add',kind:'box',patch:{script:'x'}}]))).toThrow();});
 it('rejects invalid transforms and missing references',()=>{const p=initialProject();expect(()=>previewPlan(p,plan([{op:'edit',id:p.entities[0].id,patch:{position:[0,1,1e9]}}]))).toThrow();expect(()=>previewPlan(p,plan([{op:'delete',id:'unknown'}]))).toThrow();});
 it('shows implicit demotion of the old player',()=>{const p=initialProject();p.entities.push({...entity('box'),name:'Old player',role:'player'});const preview=previewPlan(p,plan([{op:'add',kind:'character',patch:{name:'New player',role:'player'}}]));expect(preview.changes).toContain('Update: Old player · role decoration');expect(preview.next.entities.filter(e=>e.role==='player')).toHaveLength(1);});
});
