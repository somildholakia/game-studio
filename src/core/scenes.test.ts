import {describe,it,expect} from 'vitest';import {initialProject,entity,parseProject} from './project';import {addScene,switchScene,orderedScenes,moveScene,removeScene,campaign} from './scenes';
describe('multi-level projects',()=>{
 it('preserves independent edits, shared assets and ordering on switching',()=>{const p=initialProject();const next=addScene(p,'Second');expect(next.entities.some(e=>e.role==='player')).toBe(true);const first=switchScene(next,'main');expect(first.entities).toEqual(p.entities);const parsed=parseProject(JSON.stringify(first));expect(orderedScenes(parsed).map(s=>s.name)).toEqual(['Level 1','Second']);const second=orderedScenes(parsed)[1];expect(orderedScenes(moveScene(parsed,second.id,-1))[0].id).toBe(second.id);expect(removeScene(parsed,second.id).levels).toEqual([]);});
 it('validates campaign player and goal for every level',()=>{const p=initialProject();expect(()=>campaign(p)).toThrow();p.entities.push({...entity('box'),role:'player'},{...entity('box'),role:'goal'});let next=addScene(p,'Next');expect(()=>campaign(next)).toThrow();next={...next,entities:[...next.entities,{...entity('box'),role:'goal'}]};expect(campaign(next).map(s=>s.sceneName)).toEqual(['Level 1','Next']);});
});

it('rejects missing or duplicate scene order entries and multiple players in an inactive level',()=>{const p=addScene(initialProject(),'Next');expect(()=>parseProject(JSON.stringify({...p,sceneOrder:['main','main']}))).toThrow();const first=p.levels![0];first.entities.push({...entity('box'),role:'player'},{...entity('box'),role:'player'});expect(()=>parseProject(JSON.stringify(p))).toThrow();});

import {removeModel} from './prefabs';
import {adventureCampaign} from './templates';
it('retains inactive-level asset dependencies and exports the sample campaign in order',()=>{const p=addScene(initialProject(),'Next');p.levels![0].entities.push({...entity('model'),assetId:'shared'});expect(()=>removeModel(p,'shared')).toThrow();expect(campaign(parseProject(JSON.stringify(adventureCampaign()))).map(l=>l.sceneName)).toEqual(['Treasure Run','Meadow Explorer']);});
