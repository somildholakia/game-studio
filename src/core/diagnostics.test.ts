import {describe,it,expect} from 'vitest';
import {diagnose} from './diagnostics';import {initialProject,entity} from './project';import {physicsTemplate,adventureCampaign} from './templates';
describe('project diagnostics',()=>{it('detects a missing spawn and warns about missing win conditions',()=>{const d=diagnose(initialProject());expect(d.some(i=>i.severity==='error'&&i.message.includes('player'))).toBe(true);expect(d.some(i=>i.message.includes('win rule'))).toBe(true);});it('reports likely initial collision problems',()=>{const p=initialProject();p.entities.push({...entity('box'),role:'player'},{...entity('box'),role:'solid'});expect(diagnose(p).some(i=>i.message.includes('overlaps solid'))).toBe(true);});it('recognizes the built-in games as structurally playable',()=>{expect(diagnose(physicsTemplate()).filter(i=>i.severity==='error')).toEqual([]);expect(diagnose(adventureCampaign()).filter(i=>i.severity==='error')).toEqual([]);});});

it('warns about missing or role-mismatched rule event objects',()=>{
 const p=initialProject();p.logic={autoWin:false,rules:[{id:'a',event:'collect',sourceId:p.entities[0].id,minScore:0,action:{kind:'win'}}]};
 expect(diagnose(p).some(i=>i.message.includes('incompatible event object'))).toBe(true);
});
