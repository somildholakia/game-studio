import type {CounterCondition} from '../runtime/rules';
export function GatePanel({value,onChange}:{value?:CounterCondition;onChange:(gate:CounterCondition|undefined)=>void}){
 return <fieldset><legend>Counter gate</legend><label><input type="checkbox" checked={!!value} onChange={e=>onChange(e.target.checked?{key:'keys',comparison:'gte',value:1}:undefined)}/> Open using a counter</label>
 {value&&<><p className="hint">The solid disappears and stops blocking movement when its condition matches. Closing waits until the doorway is clear.</p><label>Gate counter<input value={value.key} maxLength={32} onChange={e=>{const key=e.target.value;if(/^[a-zA-Z][a-zA-Z0-9_]{0,31}$/.test(key)&&!['constructor','prototype','__proto__'].includes(key))onChange({...value,key});}}/></label>
 <label>Gate comparison<select value={value.comparison} onChange={e=>onChange({...value,comparison:e.target.value as CounterCondition['comparison']})}><option value="gte">At least</option><option value="lte">At most</option><option value="eq">Equals</option></select></label>
 <label>Gate threshold<input type="number" value={value.value} onChange={e=>{const n=e.target.valueAsNumber;if(Number.isInteger(n)&&Math.abs(n)<=1e6)onChange({...value,value:n});}}/></label></>}</fieldset>;
}
