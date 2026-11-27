import {describe,it,expect} from 'vitest';
import {entity,parseProject,type Project} from '../core/project';
import {start,commit,undo} from '../core/history';
import {orderedScenes} from '../core/scenes';
import {previewPlan,readPlan,buildPlanPrompt} from './plan';
import {begin,advance,compileWorld,type Input,type GameState} from '../runtime/simulation';
const plan=(commands:unknown[])=>JSON.stringify({version:1,summary:'Generated gameplay',commands});
const base=():Project=>({version:1,name:'Evaluation',entities:[entity('ground'),{...entity('box'),id:'player',role:'player',position:[0,.75,0]}]});
const add=(ref:string,role:string,x=0)=>({op:'add',kind:'box',ref,patch:{name:ref,role,position:[x,.75,0]}});
const rule=(id:string,event:string,sourceId:string,action:unknown)=>({id,event,sourceId,minScore:0,action});
const logic=(rules:unknown[])=>({op:'logic',value:{autoWin:false,rules}});
function simulate(p:Project,input:Input,seconds:number,s=begin(p)):GameState{
 const world=compileWorld(p);for(let i=0;i<seconds*20;i++)s=advance(world,s,input,.05);return s;
}
describe('AI plan-local references',()=>{
 it('resolves new object references to persistent IDs and supports edit/delete',()=>{
  const p=base(),before=JSON.stringify(p);
  const preview=previewPlan(p,plan([add('key','collectible',2),add('unused','decoration'),{op:'edit',id:'@key',patch:{name:'Golden key'}},{op:'delete',id:'@unused'},logic([rule('score','collect','@key',{kind:'score',amount:5})])]));
  const key=preview.next.entities.find(e=>e.name==='Golden key')!;
  expect(key.id).not.toBe('@key');expect(preview.next.logic?.rules[0].sourceId).toBe(key.id);
  expect(preview.next.entities.some(e=>e.name==='unused')).toBe(false);
  expect(JSON.stringify(preview.next)).not.toContain('@key');
  expect(JSON.stringify(p)).toBe(before);
  expect(parseProject(JSON.stringify(preview.next))).toEqual(preview.next);
  expect(undo(commit(start(p),preview.next)).present).toEqual(p);
  expect(buildPlanPrompt(p)).toContain('plan-local ref');
 });
 it('rejects invalid, repeated, forward, deleted, incompatible and cross-level references atomically',()=>{
  const p=base(),before=JSON.stringify(p);
  for(const commands of [
   [add('invalid space','collectible')],
   [add('key','collectible'),add('key','collectible')],
   [{op:'edit',id:'@key',patch:{name:'x'}},add('key','collectible')],
   [add('key','collectible'),{op:'delete',id:'@key'},{op:'edit',id:'@key',patch:{name:'x'}}],
   [add('key','decoration'),logic([rule('r','collect','@key',{kind:'win'})])],
   [add('key','collectible'),{op:'add-level',name:'Other'},logic([rule('r','collect','@key',{kind:'win'})])]
  ])expect(()=>previewPlan(p,plan(commands))).toThrow();
  expect(JSON.stringify(p)).toBe(before);
  expect(()=>readPlan(plan([{...add('key','collectible'),ref:null}]))).toThrow();
 });
 it('preserves literal imported IDs and rejects ambiguous aliases',()=>{
  const p=base();p.entities.push({...entity('box'),id:'@key',role:'collectible'});
  expect(previewPlan(p,plan([{op:'edit',id:'@key',patch:{name:'Existing'}}])).next.entities.find(e=>e.id==='@key')?.name).toBe('Existing');
  expect(()=>previewPlan(p,plan([add('key','collectible')]))).toThrow('ambiguous');
 });
 it('restores access when switching back to the referenced level',()=>{
  const p=base();const result=previewPlan(p,plan([add('key','collectible'),{op:'add-level',name:'Other'}, {op:'switch-level',id:'main'}, {op:'edit',id:'@key',patch:{name:'Main key'}}]));
  expect(orderedScenes(result.next)[0].entities.some(e=>e.name==='Main key')).toBe(true);
 });
});
describe('deterministic generated game acceptance fixtures (not live AI)',()=>{
 it('plays a generated key-and-gate quest from preview through validated runtime',()=>{
  const p=base(),before=JSON.stringify(p);
  const generated=previewPlan(p,plan([
   add('key','collectible',2),
   {op:'add',kind:'box',patch:{name:'Locked door',role:'solid',position:[4,.75,0],gate:{key:'keys',comparison:'gte',value:1}}},
   add('exit','goal',7),
   logic([rule('key','collect','@key',{kind:'counter',key:'keys',mode:'add',amount:1}),rule('finish','goal','@exit',{kind:'win'})])
  ])).next;
  const restored=parseProject(JSON.stringify(generated));
  const door=restored.entities.find(e=>e.name==='Locked door')!;
  expect(begin(restored).openGates.has(door.id)).toBe(false);
  const state=simulate(restored,{x:1,z:0},5);
  expect(state.logic.counters?.keys).toBe(1);
  expect(state.openGates.has(door.id)).toBe(true);
  expect(state.won).toBe(true);
  expect(JSON.stringify(p)).toBe(before);
 });
 it('awards only the selected pickup and does not reward a different object',()=>{
  const generated=previewPlan(base(),plan([add('decoy','collectible',2),add('prize','collectible',-3),logic([rule('r','collect','@prize',{kind:'score',amount:10})])])).next;
  const right=simulate(generated,{x:1,z:0},.6);
  expect(right.collected.size).toBe(1);expect(right.logic.score).toBe(0);
  const left=simulate(generated,{x:-1,z:0},1.5);
  expect(left.logic.score).toBe(10);expect(left.won).toBe(false);
 });
});
