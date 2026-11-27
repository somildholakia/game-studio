export const events=['start','collect','goal','respawn','checkpoint','jump','second'] as const;
export type EventKind=typeof events[number];
export const eventSourceRole=(event:EventKind):'collectible'|'checkpoint'|'goal'|undefined=>event==='collect'?'collectible':event==='checkpoint'?'checkpoint':event==='goal'?'goal':undefined;
export type CounterCondition={key:string;comparison:'gte'|'lte'|'eq';value:number};
export type Action={kind:'score';amount:number}|{kind:'message';text:string}|{kind:'win'}|{kind:'lose'}|{kind:'counter';key:string;mode:'add'|'set';amount:number};
export type RuleTiming={start:number;repeat:number};
export type Rule={id:string;event:EventKind;minScore:number;sourceId?:string;condition?:CounterCondition;timing?:RuleTiming;once?:boolean;action:Action};
export type Logic={autoWin:boolean;rules:Rule[];maxLives?:number};
export type LogicState={score:number;message:string;won:boolean;lost?:boolean;counters?:Record<string,number>;firedRules?:ReadonlySet<string>};
export const defaultLogic:Logic={autoWin:true,rules:[]};
const validKey=(k:unknown):k is string=>typeof k==='string'&&/^[a-zA-Z][a-zA-Z0-9_]{0,31}$/.test(k)&&!['constructor','prototype','__proto__'].includes(k);
const integer=(n:unknown,limit:number):n is number=>typeof n==='number'&&Number.isInteger(n)&&Math.abs(n)<=limit;
export function readLogic(raw:unknown):Logic{
 if(raw===undefined)return {autoWin:true,rules:[]};
 const p=raw as Logic;if(!p||typeof p.autoWin!=='boolean'||!Array.isArray(p.rules)||p.rules.length>128)throw Error('Invalid gameplay rules');
 if(p.maxLives!==undefined&&(!integer(p.maxLives,99)||p.maxLives<1))throw Error('Invalid life limit');
 const ids=new Set<string>();const rules=p.rules.map(r=>{
 if(!r||typeof r.id!=='string'||!r.id||r.id.length>200||ids.has(r.id)||!events.includes(r.event)||!integer(r.minScore,1e6)||!r.action)throw Error('Invalid gameplay rule');
 if(r.sourceId!==undefined&&(!eventSourceRole(r.event)||typeof r.sourceId!=='string'||!r.sourceId||r.sourceId.length>200))throw Error('Invalid rule event source');
 if(r.once!==undefined&&typeof r.once!=='boolean')throw Error('Invalid rule repeat setting');
 let timing:RuleTiming|undefined;
 if(r.timing!==undefined){const t=r.timing;if(r.event!=='second'||!t||!integer(t.start,3600)||t.start<1||!integer(t.repeat,3600)||t.repeat<0)throw Error('Invalid timed rule');timing={start:t.start,repeat:t.repeat};}
 ids.add(r.id);const a=r.action;let action:Action;let condition:CounterCondition|undefined;
 if(r.condition!==undefined){const c=r.condition;if(!c||!validKey(c.key)||!['gte','lte','eq'].includes(c.comparison)||!integer(c.value,1e6))throw Error('Invalid counter condition');condition={key:c.key,comparison:c.comparison,value:c.value};}
 switch(a.kind){case 'score':if(!integer(a.amount,10000))throw Error('Invalid score action');action={kind:'score',amount:a.amount};break;
 case 'message':if(typeof a.text!=='string'||a.text.length>200)throw Error('Invalid message action');action={kind:'message',text:a.text};break;
 case 'win':action={kind:'win'};break;
 case 'lose':action={kind:'lose'};break;
 case 'counter':if(!validKey(a.key)||!['add','set'].includes(a.mode)||!integer(a.amount,10000))throw Error('Invalid counter action');action={kind:'counter',key:a.key,mode:a.mode,amount:a.amount};break;
 default:throw Error('Unknown action');}
 return {id:r.id,event:r.event,minScore:r.minScore,...(r.sourceId!==undefined?{sourceId:r.sourceId}:{}),...(condition?{condition}:{}),...(timing?{timing}:{}),...(r.once!==undefined?{once:r.once}:{}),action};});
 return {autoWin:p.autoWin,rules,...(p.maxLives!==undefined?{maxLives:p.maxLives}:{})};
}
const counter=(state:LogicState,key:string)=>state.counters&&Object.hasOwn(state.counters,key)?state.counters[key]:0;
export function trigger(logic:Logic,state:LogicState,event:EventKind,sourceId?:string,second?:number):LogicState{
 let next={...state};
 for(const rule of logic.rules){if(rule.event!==event||(rule.sourceId!==undefined&&rule.sourceId!==sourceId)||next.score<rule.minScore||(rule.once&&next.firedRules?.has(rule.id)))continue;
 const t=rule.timing;if(t&&(second===undefined||!Number.isSafeInteger(second)||second<t.start||(t.repeat===0?second!==t.start:(second-t.start)%t.repeat!==0)))continue;
 const c=rule.condition;if(c){const n=counter(next,c.key);if(!(c.comparison==='gte'?n>=c.value:c.comparison==='lte'?n<=c.value:n===c.value))continue;}
 if(rule.once)next.firedRules=new Set([...next.firedRules??[],rule.id]);
 const a=rule.action;if(a.kind==='score')next.score=Math.max(-1e6,Math.min(1e6,next.score+a.amount));
 else if(a.kind==='message')next.message=a.text;
 else if(a.kind==='win'){if(!next.lost)next.won=true;}
 else if(a.kind==='lose'){if(!next.won)next.lost=true;}
 else if(a.kind==='counter'){const n=a.mode==='set'?a.amount:counter(next,a.key)+a.amount;next.counters={...next.counters,[a.key]:Math.max(-1e6,Math.min(1e6,n))};}
 }return next;
}
