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

import {orderedScenes} from '../core/scenes';
it('creates and edits multiple levels in one atomic plan, with scoped change review',()=>{const p=initialProject();const before=JSON.stringify(p);const preview=previewPlan(p,plan([{op:'rename-level',name:'Intro'},{op:'add',kind:'box',patch:{name:'Intro exit',role:'goal'}},{op:'add-level',name:'Forest'},{op:'add',kind:'box',patch:{name:'Forest exit',role:'goal'}},{op:'switch-level',id:'main'}]));const levels=orderedScenes(preview.next);expect(levels.map(l=>l.name)).toEqual(['Intro','Forest']);expect(levels[0].entities.some(e=>e.name==='Intro exit')).toBe(true);expect(levels[1].entities.some(e=>e.name==='Forest exit')).toBe(true);expect(preview.changes).toContain('[Intro] Add: Intro exit (box)');expect(preview.changes).toContain('[Forest] Add: Forest exit (box)');expect(preview.changes).toContain('Add level: Forest');expect(JSON.stringify(p)).toBe(before);expect(()=>previewPlan(p,plan([{op:'add-level',name:'Test'},{op:'switch-level',id:'missing'}]))).toThrow();});

describe('AI environment, audio and presentation commands',()=>{
 it('merges partial settings into the active level and global presentation with reviewable changes',()=>{
  const p=initialProject(),before=JSON.stringify(p);
  const preview=previewPlan(p,plan([
   {op:'add-level',name:'Night'},
   {op:'environment',patch:{sky:'#101828',fogEnabled:true,fogDensity:.04}},
   {op:'audio',patch:{enabled:true,volume:.3,tones:{collect:{frequency:660}}}},
   {op:'presentation',patch:{hudTitle:'Night adventure',showCounters:true,showTimer:true}},
   {op:'switch-level',id:'main'}
  ]));
  const [main,night]=orderedScenes(preview.next);
  expect(main.environment?.sky).not.toBe('#101828');expect(night.environment?.sky).toBe('#101828');
  expect(night.environment?.fogDensity).toBe(.04);expect(night.audio?.enabled).toBe(true);
  expect(night.audio?.tones.collect.frequency).toBe(660);expect(night.audio?.tones.collect.duration).toBe(.14);
  expect(main.audio?.enabled).toBe(false);expect(preview.next.presentation?.hudTitle).toBe('Night adventure');expect(preview.next.presentation?.showTimer).toBe(true);
  expect(preview.changes).toContain('[Night] Update environment');
  expect(preview.changes).toContain('[Night] Update game audio');expect(preview.changes).toContain('Update game presentation');
  expect(preview.details.some(s=>s.includes('#101828'))).toBe(true);expect(JSON.stringify(p)).toBe(before);
 });
 it('rejects invalid settings, unknown keys and unsupported audio payloads',()=>{
  const p=initialProject();
  for(const command of [
   {op:'environment',patch:{fogDensity:99}},{op:'environment',patch:{shader:'code'}},
   {op:'presentation',patch:{camera:'unknown'}},{op:'audio',patch:{volume:2}},
   {op:'audio',patch:{tones:{collect:{frequency:3000}}}},{op:'audio',patch:{tones:{collect:{url:'https://example.invalid'}}}},
   {op:'audio',patch:{tones:{unknown:{frequency:440}}}},{op:'audio',patch:{tones:null}}
  ])expect(()=>previewPlan(p,plan([command]))).toThrow();
 });
});

it('duplicates a known level and includes the copied objects in review',()=>{
 const p=initialProject(),before=JSON.stringify(p);
 const result=previewPlan(p,plan([{op:'duplicate-level',id:'main',name:'Variant'}]));
 expect(orderedScenes(result.next).map(s=>s.name)).toEqual(['Level 1','Variant']);
 expect(result.next.entities[0].id).not.toBe(p.entities[0].id);expect(result.changes).toContain('Add level: Variant');
 expect(result.changes).toContain('[Variant] Add: box (box)');expect(JSON.stringify(p)).toBe(before);
 expect(()=>previewPlan(p,plan([{op:'duplicate-level',id:'unknown',name:'Variant'}]))).toThrow();
});
it('authors validated decorative animation and rejects incompatible roles or invalid keyframes',()=>{
 const p=initialProject();const id=p.entities[1].id;
 const pose={time:0,position:[0,1,0],rotation:[0,0,0],scale:[1,1,1]};
 const clip={loop:true,pingPong:true,interpolation:'smooth',keys:[pose,{...pose,time:2,position:[4,1,0]}]};
 const result=previewPlan(p,plan([{op:'edit',id,patch:{animation:clip}}]));
 expect(result.next.entities[1].animation).toEqual(clip);
 expect(result.details.some(d=>d.includes('animation:'))).toBe(true);
 expect(()=>previewPlan(p,plan([{op:'edit',id,patch:{role:'player',animation:clip}}]))).toThrow();
 expect(()=>previewPlan(p,plan([{op:'edit',id,patch:{animation:{...clip,keys:[{...pose,time:1}]}}}]))).toThrow();
});
it('rejects an AI rule that references an unknown or role-incompatible source',()=>{
 const p=initialProject();
 expect(()=>previewPlan(p,plan([{op:'logic',value:{autoWin:false,rules:[{id:'bad',event:'collect',sourceId:p.entities[0].id,minScore:0,action:{kind:'win'}}]}}]))).toThrow('incompatible');
});
