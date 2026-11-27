import {defaultPatrol,type Patrol} from '../runtime/patrol';
import type {Vec3} from '../core/project';
export function PatrolPanel({value,onChange}:{value?:Patrol;onChange:(p:Patrol|undefined)=>void}){
 return <fieldset><legend>Moving gameplay object</legend><label><input type="checkbox" checked={!!value} onChange={e=>onChange(e.target.checked?structuredClone(defaultPatrol):undefined)}/> Enable patrol</label>
 {value&&<><p className="hint">Move from the authored position to an offset and back, repeating during play. Collision triggers and one-way platform supports move with the object.</p><label>Round trip (seconds)<input type="number" min=".5" max="120" step=".5" value={value.period} onChange={e=>{const n=e.target.valueAsNumber;if(Number.isFinite(n)&&n>=.5&&n<=120)onChange({...value,period:n});}}/></label>
 <fieldset><legend>Destination offset</legend>{value.offset.map((n,i)=><label key={i}>{['X','Y','Z'][i]}<input type="number" min="-100" max="100" step=".1" value={n} onChange={e=>{const v=e.target.valueAsNumber;if(Number.isFinite(v)&&Math.abs(v)<=100){const offset=[...value.offset] as Vec3;offset[i]=v;onChange({...value,offset});}}}/></label>)}</fieldset></>}
 </fieldset>;
}
