import {describe,it,expect} from 'vitest';import {createPack,readPack,installPack} from './packs';import {entity,initialProject} from './project';import {savePrefab} from './prefabs';
describe('declarative extension packs',()=>{it('imports reusable content with fresh IDs and preserves the original project',()=>{const source=savePrefab(initialProject(),entity('character'));source.logic={autoWin:true,rules:[{id:'score',event:'collect',minScore:0,action:{kind:'score',amount:10}}]};const pack=createPack(source,'Characters');const target=initialProject();const next=installPack(target,pack);expect(next.prefabs).toHaveLength(1);expect(next.prefabs![0].id).not.toBe(source.prefabs![0].id);expect(next.logic?.rules).toHaveLength(1);expect(target.prefabs).toEqual([]);});it('rejects unknown versions and executable rules',()=>{expect(()=>readPack('{"format":"game-studio-pack","version":2}')).toThrow();expect(()=>readPack(JSON.stringify({format:'game-studio-pack',version:1,name:'bad',assets:[],prefabs:[],rules:[{id:'x',event:'start',minScore:0,action:{kind:'eval'}}]}))).toThrow();});});

it('exports only portable rules and rejects targeted rules in imported packs',()=>{
 const p=initialProject();p.logic={autoWin:false,rules:[
  {id:'portable',event:'collect',minScore:0,action:{kind:'score',amount:1}},
  {id:'specific',event:'collect',sourceId:'gem',minScore:0,action:{kind:'win'}}
 ]};
 const pack=createPack(p,'Portable rules');expect(pack.rules.map(r=>r.id)).toEqual(['portable']);
 expect(()=>readPack(JSON.stringify({...pack,rules:p.logic!.rules}))).toThrow('level-specific');
});
