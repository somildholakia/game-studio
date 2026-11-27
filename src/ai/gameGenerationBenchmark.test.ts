import {describe,it,expect} from 'vitest';
import {entity,parseProject,type Project} from '../core/project';
import {campaign} from '../core/scenes';
import {diagnose} from '../core/diagnostics';
import {previewPlan} from './plan';
import {begin,advance,compileWorld,type Input,type GameState} from '../runtime/simulation';
const base=():Project=>({version:1,name:'Generated benchmark',entities:[{...entity('ground'),scale:[4,1,4]},{...entity('box'),id:'player',role:'player',position:[0,.75,0]}]});
const add=(ref:string,role:string,position:[number,number,number],patch:object={})=>({op:'add',kind:'box',ref,patch:{name:ref,role,position,...patch}});
const rule=(id:string,event:string,action:object,extra:object={})=>({id,event,minScore:0,action,...extra});
const logic=(rules:object[],autoWin=false,extra:object={})=>({op:'logic',value:{autoWin,rules,...extra}});
const still={x:0,z:0},right={x:1,z:0},left={x:-1,z:0};
function generate(task:string,commands:object[]){
 const p=base(),before=JSON.stringify(p);
 const review=previewPlan(p,JSON.stringify({version:1,summary:task,commands}));
 expect(review.changes.length).toBeGreaterThan(0);expect(JSON.stringify(p)).toBe(before);
 const normalized=parseProject(JSON.stringify(review.next));expect(diagnose(normalized).filter(d=>d.severity==='error')).toEqual([]);
 return campaign(normalized);
}
function run(p:Project,input:Input,seconds:number,state=begin(p)):GameState{
 const world=compileWorld(p);for(let i=0;i<Math.round(seconds*20);i++)state=advance(world,state,input,.05);return state;
}
describe('offline game-generation acceptance benchmark: authored provider-response fixtures',()=>{
 it('timed survival: win only after three simulated seconds and reward exactly once',()=>{
  const [p]=generate('Create a three-second survival challenge',[
   logic([rule('reward','second',{kind:'score',amount:5},{timing:{start:1,repeat:1},once:true}),rule('win','second',{kind:'win'},{timing:{start:3,repeat:0}})]),
   {op:'presentation',patch:{showTimer:true,hudTitle:'Survive'}}
  ]);
  const early=run(p,still,2);expect(early.won).toBe(false);expect(early.logic.score).toBe(5);
  const final=run(p,still,1.1,early);expect(final.won).toBe(true);expect(final.logic.score).toBe(5);
 });
 it('zone puzzle: enter the specified zone before exiting to win',()=>{
  const [p]=generate('Create a enter-and-exit trigger puzzle',[
   add('zone','trigger',[2,.75,0]),logic([
    rule('enter','zone-enter',{kind:'counter',key:'entered',mode:'set',amount:1},{sourceId:'@zone'}),
    rule('exit','zone-exit',{kind:'win'},{sourceId:'@zone',condition:{key:'entered',comparison:'eq',value:1}})
   ])
  ]);
  expect(run(p,left,1).won).toBe(false);const inside=run(p,right,.5);expect(inside.logic.counters?.entered).toBe(1);expect(inside.won).toBe(false);
  expect(run(p,right,1,inside).won).toBe(true);
 });
 it('checkpoint adventure: hazard death restores the checkpoint and a different route wins',()=>{
  const [p]=generate('Make a checkpoint with a hazard and safe exit',[
   add('checkpoint','checkpoint',[2,.75,0]),add('danger','hazard',[5,.75,0]),add('exit','goal',[-3,.75,0]),logic([],true,{maxLives:2})
  ]);
  const start=run(p,right,.6);expect(start.checkpointId).toBe(p.entities.find(e=>e.name==='checkpoint')!.id);
  const respawn=run(p,right,.5,start);expect(respawn.respawns).toBe(1);expect(respawn.logic.lost).not.toBe(true);
  expect(run(p,left,2,respawn).won).toBe(true);
 });
 it('physics puzzle: a player can push the generated crate before returning to the finish',()=>{
  const [p]=generate('Make a pushable crate challenge',[
   add('crate','dynamic',[2,.75,0],{body:{mass:.5,restitution:0,friction:1,velocity:[0,0,0]}}),add('exit','goal',[-3,.75,0]),logic([],true)
  ]);
  const crate=p.entities.find(e=>e.name==='crate')!;const moved=run(p,right,2);expect(moved.bodies.get(crate.id)!.position[0]).toBeGreaterThan(3);expect(moved.won).toBe(false);
  expect(run(p,left,4,moved).won).toBe(true);
 });
 it('campaign: independently playable generated stages with distinct scoped exits',()=>{
  const levels=generate('Create two stages with separately scoped exit rules',[
   {op:'rename-level',name:'Intro'},add('intro','goal',[2,.75,0]),logic([rule('intro-win','goal',{kind:'win'},{sourceId:'@intro'})]),
   {op:'add-level',name:'Finale'},add('final','goal',[0,.85,2]),logic([rule('final-win','goal',{kind:'win'},{sourceId:'@final'})])
  ]);
  expect(levels.map(l=>l.sceneName)).toEqual(['Intro','Finale']);expect(run(levels[0],right,2).won).toBe(true);
  expect(run(levels[1],{x:0,z:1},2).won).toBe(true);expect(levels[0].logic?.rules[0].sourceId).not.toBe(levels[1].logic?.rules[0].sourceId);
 });
 it('jump tutorial: movement alone cannot finish; a grounded jump triggers the scoped tutorial goal',()=>{
  const [p]=generate('Create a jump tutorial with an explicit win event',[
   logic([rule('jump-win','jump',{kind:'win'})]),{op:'physics',value:{gravity:20,moveSpeed:4,jumpSpeed:7,fallLimit:-30,coyoteTime:.12,jumpBuffer:.12}}
  ]);
  const grounded=run(p,still,.3);expect(grounded.grounded).toBe(true);expect(grounded.won).toBe(false);
  const jumped=run(p,{...still,jump:true},.1,grounded);expect(jumped.jumps).toBe(1);expect(jumped.won).toBe(true);
 });
});
