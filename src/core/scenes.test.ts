import {describe,it,expect} from 'vitest';import {initialProject,entity,parseProject} from './project';import {addScene,switchScene,orderedScenes,moveScene,removeScene,campaign,duplicateScene} from './scenes';
describe('multi-level projects',()=>{
 it('preserves independent edits, shared assets and ordering on switching',()=>{const p=initialProject();const next=addScene(p,'Second');expect(next.entities.some(e=>e.role==='player')).toBe(true);const first=switchScene(next,'main');expect(first.entities).toEqual(p.entities);const parsed=parseProject(JSON.stringify(first));expect(orderedScenes(parsed).map(s=>s.name)).toEqual(['Level 1','Second']);const second=orderedScenes(parsed)[1];expect(orderedScenes(moveScene(parsed,second.id,-1))[0].id).toBe(second.id);expect(removeScene(parsed,second.id).levels).toEqual([]);});
 it('validates campaign player and goal for every level',()=>{const p=initialProject();expect(()=>campaign(p)).toThrow();p.entities.push({...entity('box'),role:'player'},{...entity('box'),role:'goal'});let next=addScene(p,'Next');expect(()=>campaign(next)).toThrow();next={...next,entities:[...next.entities,{...entity('box'),role:'goal'}]};expect(campaign(next).map(s=>s.sceneName)).toEqual(['Level 1','Next']);});
});

it('rejects missing or duplicate scene order entries and multiple players in an inactive level',()=>{const p=addScene(initialProject(),'Next');expect(()=>parseProject(JSON.stringify({...p,sceneOrder:['main','main']}))).toThrow();const first=p.levels![0];first.entities.push({...entity('box'),role:'player'},{...entity('box'),role:'player'});expect(()=>parseProject(JSON.stringify(p))).toThrow();});

import {removeModel} from './prefabs';
import {adventureCampaign} from './templates';
it('retains inactive-level asset dependencies and exports the sample campaign in order',()=>{const p=addScene(initialProject(),'Next');p.levels![0].entities.push({...entity('model'),assetId:'shared'});expect(()=>removeModel(p,'shared')).toThrow();expect(campaign(parseProject(JSON.stringify(adventureCampaign()))).map(l=>l.sceneName)).toEqual(['Treasure Run','Meadow Explorer']);});

it('duplicates a level independently and remaps object-specific rules while sharing assets',()=>{
 const p=initialProject();const target={...entity('sphere'),role:'collectible' as const};p.entities.push(target);
 p.logic={autoWin:false,rules:[{id:'a',event:'collect',sourceId:target.id,minScore:0,action:{kind:'score',amount:5}},{id:'b',event:'goal',sourceId:'missing',minScore:0,action:{kind:'win'}}]};
 const before=JSON.stringify(p),next=duplicateScene(p,'main','Variant'),levels=orderedScenes(next);
 expect(levels.map(s=>s.name)).toEqual(['Level 1','Variant']);
 expect(next.entities[2].id).not.toBe(target.id);expect(next.logic!.rules[0].sourceId).toBe(next.entities[2].id);
 expect(next.logic!.rules[0].id).not.toBe('a');expect(next.logic!.rules[1].sourceId).not.toBeUndefined();
 expect(next.entities.some(e=>e.id===next.logic!.rules[1].sourceId)).toBe(false);
 expect(next.assets).toBe(p.assets);expect(next.prefabs).toBe(p.prefabs);
 next.entities[2].position[0]=42;expect(JSON.stringify(p)).toBe(before);
 expect(orderedScenes(parseProject(JSON.stringify(next))).map(s=>s.name)).toEqual(['Level 1','Variant']);
 expect(()=>duplicateScene(p,'unknown')).toThrow();
});

it('preserves trigger zones and remaps their event targets on level duplication',()=>{
 const p=initialProject();const zone={...entity('box'),role:'trigger' as const};p.entities.push(zone);p.logic={autoWin:false,rules:[{id:'enter',event:'zone-enter',sourceId:zone.id,minScore:0,action:{kind:'win'}}]};
 const parsed=parseProject(JSON.stringify(p));const copy=duplicateScene(parsed,'main');expect(copy.entities[2].role).toBe('trigger');expect(copy.logic?.rules[0].sourceId).toBe(copy.entities[2].id);
 expect(()=>parseProject(JSON.stringify({...p,entities:[{...zone,kind:'sphere'}]}))).toThrow('box geometry');
});
