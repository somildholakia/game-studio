import {describe,it,expect} from 'vitest';import {readLogic,trigger} from './rules';
describe('gameplay rules',()=>{it('executes ordered conditional actions',()=>{const logic=readLogic({autoWin:false,rules:[{id:'a',event:'collect',minScore:0,action:{kind:'score',amount:10}},{id:'b',event:'collect',minScore:20,action:{kind:'win'}}]});let state={score:0,message:'',won:false};state=trigger(logic,state,'collect');expect(state).toEqual({score:10,message:'',won:false});expect(trigger(logic,state,'collect').won).toBe(true);});it('rejects arbitrary actions and duplicate IDs',()=>{expect(()=>readLogic({autoWin:true,rules:[{id:'x',event:'start',minScore:0,action:{kind:'eval'}}]})).toThrow();});});

it('uses ordered counters for gated goals without mutating state',()=>{const logic=readLogic({autoWin:false,rules:[{id:'key',event:'collect',minScore:0,action:{kind:'counter',key:'keys',mode:'add',amount:1}},{id:'gate',event:'goal',minScore:0,condition:{key:'keys',comparison:'gte',value:2},action:{kind:'win'}}]});const initial={score:0,message:'',won:false};const one=trigger(logic,initial,'collect');expect(trigger(logic,one,'goal').won).toBe(false);const two=trigger(logic,one,'collect');expect(trigger(logic,two,'goal').won).toBe(true);expect(one.counters?.keys).toBe(1);expect(two.counters?.keys).toBe(2);expect(initial).toEqual({score:0,message:'',won:false});});
it('rejects reserved counter names and unbounded values',()=>{const rule={id:'a',event:'start',minScore:0,action:{kind:'counter',key:'constructor',mode:'add',amount:1}};expect(()=>readLogic({autoWin:false,rules:[rule]})).toThrow();expect(()=>readLogic({autoWin:false,rules:[{...rule,action:{...rule.action,key:'keys',amount:1e8}}]})).toThrow();});

it('filters object-specific rules while preserving general rules and order',()=>{
 const logic=readLogic({autoWin:false,rules:[
  {id:'all',event:'collect',minScore:0,action:{kind:'score',amount:1}},
  {id:'one',event:'collect',sourceId:'ruby',minScore:1,action:{kind:'score',amount:10}}
 ]});
 const initial={score:0,message:'',won:false};
 expect(trigger(logic,initial,'collect','emerald').score).toBe(1);
 expect(trigger(logic,initial,'collect','ruby').score).toBe(11);
 expect(trigger(logic,initial,'collect').score).toBe(1);
 expect(logic.rules[1].sourceId).toBe('ruby');
 expect(()=>readLogic({autoWin:false,rules:[{...logic.rules[1],event:'start'}]})).toThrow();
});

it('supports scheduled and repeating timed rules in declaration order',()=>{
 const logic=readLogic({autoWin:false,rules:[
  {id:'delay',event:'second',minScore:0,timing:{start:2,repeat:0},action:{kind:'score',amount:10}},
  {id:'loop',event:'second',minScore:10,timing:{start:2,repeat:3},action:{kind:'score',amount:1}},
  {id:'legacy',event:'second',minScore:0,action:{kind:'score',amount:1}}
 ]});
 let s={score:0,message:'',won:false};for(let n=1;n<=8;n++)s=trigger(logic,s,'second',undefined,n);
 expect(s.score).toBe(21);
});
it('consumes once-only rules only after their conditions pass and never mutates the prior state',()=>{
 const logic=readLogic({autoWin:false,rules:[{id:'one',event:'collect',minScore:1,once:true,action:{kind:'score',amount:10}}]});
 const initial={score:0,message:'',won:false};
 expect(trigger(logic,initial,'collect')).toEqual(initial);
 const ready={...initial,score:1};const first=trigger(logic,ready,'collect');
 expect(first.score).toBe(11);expect(trigger(logic,first,'collect').score).toBe(11);
 expect(first.firedRules?.has('one')).toBe(true);expect(ready).not.toHaveProperty('firedRules');
 expect(trigger(logic,ready,'collect').score).toBe(11);
});
it('rejects out-of-range and non-second timing and invalid one-shot flags',()=>{
 const rule={id:'r',event:'second',minScore:0,action:{kind:'win'}};
 for(const patch of [{timing:{start:0,repeat:1}},{timing:{start:1.5,repeat:1}},{timing:{start:1,repeat:-1}},{timing:{start:3601,repeat:0}},{timing:{start:1,repeat:3601}},{event:'start',timing:{start:1,repeat:0}},{once:'yes'}]){
  expect(()=>readLogic({autoWin:false,rules:[{...rule,...patch}]})).toThrow();
 }
});
