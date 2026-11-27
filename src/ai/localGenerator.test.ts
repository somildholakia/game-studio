import {describe,it,expect} from 'vitest';
import {generateLocalGame,gameGenres,type GameRecipe} from './localGenerator';
import {campaign} from '../core/scenes';
import {diagnose} from '../core/diagnostics';
import {parseProject,type Project} from '../core/project';
import {advance,begin,compileWorld,type GameState,type Input} from '../runtime/simulation';
const right={x:1,z:0},still={x:0,z:0};
function run(p:Project,input:Input,seconds:number,s=begin(p)):GameState{const w=compileWorld(p);for(let i=0;i<Math.round(seconds*20);i++)s=advance(w,s,input,.05);return s;}
describe('actual offline recipe generation evaluation',()=>{
 for(const genre of gameGenres)for(const difficulty of [1,3,5])for(const seed of [0,42,12345]){
  it(genre+' difficulty '+difficulty+' seed '+seed+' produces a playable round-tripped game',()=>{
   const result=generateLocalGame({genre,difficulty,seed,title:'Generated '+genre});
   const p=parseProject(JSON.stringify(result.next)),levels=campaign(p);
   expect(result.changes.length).toBeGreaterThan(0);expect(diagnose(p).filter(d=>d.severity==='error')).toEqual([]);
   if(genre==='checkpoint'){
    const checkpoint=run(levels[0],right,.75);expect(checkpoint.checkpointId).not.toBeNull();
    expect(run(levels[0],{x:0,z:1},2,checkpoint).won).toBe(true);
    return;
   }
   const won=run(levels[0],right,10);expect(won.won).toBe(true);expect(won.logic.lost).not.toBe(true);
   if(genre==='key-quest')expect(won.logic.counters?.keys).toBe(difficulty+1);
   if(genre==='timed-collect'){expect(run(levels[0],still,20).logic.lost).toBe(true);expect(p.presentation?.showTimer).toBe(true);}
   if(genre==='campaign'){expect(levels).toHaveLength(2);expect(run(levels[1],right,2).won).toBe(true);}
  });
 }
 it('repeats geometry for the same seed and rejects invalid recipes',()=>{
  const recipe:GameRecipe={genre:'treasure',difficulty:3,seed:7,title:'Repeat'};
  const layout=(p:Project)=>p.entities.map(({name,position,color})=>({name,position,color}));
  expect(layout(generateLocalGame(recipe).next)).toEqual(layout(generateLocalGame(recipe).next));
  expect(layout(generateLocalGame(recipe).next)).not.toEqual(layout(generateLocalGame({...recipe,seed:8}).next));
  for(const patch of [{seed:-1},{difficulty:6},{title:''},{genre:'unknown'}])expect(()=>generateLocalGame({...recipe,...patch} as GameRecipe)).toThrow();
 });
});
