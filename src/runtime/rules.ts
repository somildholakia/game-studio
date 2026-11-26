export const events=['start','collect','goal','respawn','checkpoint','jump','second'] as const;
export type EventKind=typeof events[number];
export type Action={kind:'score';amount:number}|{kind:'message';text:string}|{kind:'win'};
export type Rule={id:string;event:EventKind;minScore:number;action:Action};
export type Logic={autoWin:boolean;rules:Rule[]};
export type LogicState={score:number;message:string;won:boolean};
export const defaultLogic:Logic={autoWin:true,rules:[]};
export function readLogic(raw:unknown):Logic{
 if(raw===undefined)return {autoWin:true,rules:[]};
 const p=raw as Logic;if(!p||typeof p.autoWin!=='boolean'||!Array.isArray(p.rules)||p.rules.length>128)throw Error('Invalid gameplay rules');
 const ids=new Set<string>();const rules=p.rules.map(r=>{
 if(!r||typeof r.id!=='string'||!r.id||r.id.length>200||ids.has(r.id)||!events.includes(r.event)||!Number.isInteger(r.minScore)||Math.abs(r.minScore)>1e6||!r.action)throw Error('Invalid gameplay rule');
 ids.add(r.id);const a=r.action;let action:Action;
 switch(a.kind){case 'score':if(!Number.isInteger(a.amount)||Math.abs(a.amount)>10000)throw Error('Invalid score action');action={kind:'score',amount:a.amount};break;
 case 'message':if(typeof a.text!=='string'||a.text.length>200)throw Error('Invalid message action');action={kind:'message',text:a.text};break;
 case 'win':action={kind:'win'};break;default:throw Error('Unknown action');}
 return {id:r.id,event:r.event,minScore:r.minScore,action};});
 return {autoWin:p.autoWin,rules};
}
export function trigger(logic:Logic,state:LogicState,event:EventKind):LogicState{
 let next={...state};
 for(const rule of logic.rules){if(rule.event!==event||next.score<rule.minScore)continue;
 const a=rule.action;if(a.kind==='score')next.score=Math.max(-1e6,Math.min(1e6,next.score+a.amount));
 else if(a.kind==='message')next.message=a.text;else next.won=true;}
 return next;
}
