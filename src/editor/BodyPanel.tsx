import {defaultBody,type BodySettings} from '../runtime/bodies';
import type {Vec3} from '../core/project';
export function BodyPanel({value,onChange}:{value?:BodySettings;onChange:(b:BodySettings)=>void}){
 const b=value??defaultBody;const fields:[keyof Pick<BodySettings,'mass'|'restitution'|'friction'>,string,number,number,number][]=[['mass','Mass',.1,100,.1],['restitution','Bounce',0,.9,.05],['friction','Friction',0,20,.1]];
 return <fieldset><legend>Dynamic body</legend><p className="hint">Gravity, translation, collision, bounce, contact friction and player pushing. Friction controls ground damping and dynamic contact friction. Optional angular contacts use inertia, quaternion rotation and bounded collision checks. Conservative box bounds; no joints yet.</p>
 {fields.map(([key,label,min,max,step])=><label key={key}>{label}<input type="number" min={min} max={max} step={step} value={b[key]} onChange={e=>{const n=e.target.valueAsNumber;if(Number.isFinite(n)&&n>=min&&n<=max)onChange({...b,[key]:n});}}/></label>)}
 <fieldset><legend>Initial velocity</legend>{b.velocity.map((n,i)=><label key={i}>{['X','Y','Z'][i]}<input type="number" min="-20" max="20" step=".1" value={n} onChange={e=>{const v=e.target.valueAsNumber;if(Number.isFinite(v)&&Math.abs(v)<=20){const velocity=[...b.velocity] as Vec3;velocity[i]=v;onChange({...b,velocity});}}}/></label>)}</fieldset>

 <label><input type="checkbox" checked={!!b.angular} onChange={e=>{if(e.target.checked)onChange({...b,angular:{velocity:[0,0,0],damping:.1}});else{const {angular,...rest}=b;onChange(rest);}}}/> Enable angular dynamics</label>
 {b.angular&&<fieldset><legend>Angular dynamics</legend>{b.angular.velocity.map((n,i)=><label key={i}>{['Spin X','Spin Y','Spin Z'][i]} (rad/s)<input type="number" min="-20" max="20" step=".1" value={n} onChange={e=>{const v=e.target.valueAsNumber;if(Number.isFinite(v)&&Math.abs(v)<=20&&b.angular){const velocity=[...b.angular.velocity] as Vec3;velocity[i]=v;onChange({...b,angular:{...b.angular,velocity}});}}}/></label>)}
 <label>Angular damping<input type="number" min="0" max="10" step=".1" value={b.angular.damping} onChange={e=>{const damping=e.target.valueAsNumber;if(b.angular&&Number.isFinite(damping)&&damping>=0&&damping<=10)onChange({...b,angular:{...b.angular,damping}});}}/></label></fieldset>}
 <button onClick={()=>onChange(structuredClone(defaultBody))}>Reset dynamic body</button></fieldset>;
}
