import {events,defaultLogic,type Logic,type Rule,type Action,type EventKind} from '../runtime/rules';
export function RulePanel({value,onChange,disabled}:{value?:Logic;onChange:(logic:Logic)=>void;disabled:boolean}){
 const logic=value??defaultLogic;const edit=(id:string,patch:Partial<Rule>)=>onChange({...logic,rules:logic.rules.map(r=>r.id===id?{...r,...patch}:r)});
 const action=(kind:Action['kind']):Action=>kind==='score'?{kind,amount:10}:kind==='message'?{kind,text:'Nice work!'}:{kind:'win'};
 return <fieldset disabled={disabled}><legend>Gameplay Studio · Events</legend><label><input type="checkbox" checked={logic.autoWin} onChange={e=>onChange({...logic,autoWin:e.target.checked})}/> Win at goal after collecting everything</label>
 <p className="hint">Rules run top to bottom when an event occurs. Jump fires on a grounded jump; second fires once per simulated second. Score resets on respawn. No code required.</p>
 {logic.rules.map((r,i)=><fieldset key={r.id}><legend>Rule {i+1}</legend><label>When<select value={r.event} onChange={e=>edit(r.id,{event:e.target.value as EventKind})}>{events.map(e=><option key={e}>{e}</option>)}</select></label>
 <label>If score is at least<input type="number" value={r.minScore} onChange={e=>{const n=e.target.valueAsNumber;if(Number.isInteger(n)&&Math.abs(n)<=1e6)edit(r.id,{minScore:n});}}/></label>
 <label>Do<select value={r.action.kind} onChange={e=>edit(r.id,{action:action(e.target.value as Action['kind'])})}><option value="score">Change score</option><option value="message">Show message</option><option value="win">Win game</option></select></label>
 {r.action.kind==='score'&&<label>Amount<input type="number" value={r.action.amount} onChange={e=>{const n=e.target.valueAsNumber;if(Number.isInteger(n)&&Math.abs(n)<=10000)edit(r.id,{action:{kind:'score',amount:n}});}}/></label>}
 {r.action.kind==='message'&&<label>Message<input maxLength={200} value={r.action.text} onChange={e=>edit(r.id,{action:{kind:'message',text:e.target.value}})}/></label>}
 <button disabled={i===0} onClick={()=>{const rules=[...logic.rules];[rules[i-1],rules[i]]=[rules[i],rules[i-1]];onChange({...logic,rules});}}>Move up</button><button onClick={()=>onChange({...logic,rules:logic.rules.filter(x=>x.id!==r.id)})}>Delete rule</button></fieldset>)}
 <button disabled={logic.rules.length>=128} onClick={()=>onChange({...logic,rules:[...logic.rules,{id:crypto.randomUUID(),event:'collect',minScore:0,action:{kind:'score',amount:10}}]})}>+ Add event rule</button></fieldset>;
}
