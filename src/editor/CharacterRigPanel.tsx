import {defaultRig,joints,neutralPose,type CharacterRig} from '../core/characterRig';
export function CharacterRigPanel({value,onChange}:{value?:CharacterRig;onChange:(r:CharacterRig)=>void}){
 const rig=value??defaultRig;const colors=['skin','hair','clothing','shoes'] as const;
 return <fieldset><legend>Character Studio · Appearance and joints</legend><p className="hint">Edit an articulated low-poly character. Joint angles are in degrees. Automatic locomotion is applied to player characters in play mode.</p>
 {colors.map(k=><label key={k}>{k}<input type="color" value={rig[k]} onChange={e=>onChange({...rig,[k]:e.target.value})}/></label>)}
 <label>Hair style<select value={rig.hairStyle} onChange={e=>onChange({...rig,hairStyle:e.target.value as CharacterRig['hairStyle']})}>{['none','short','cap'].map(k=><option key={k}>{k}</option>)}</select></label>
 <label><input type="checkbox" checked={rig.motion} onChange={e=>onChange({...rig,motion:e.target.checked})}/> Automatic walk and jump poses</label>
 {joints.map(j=><label key={j}>{j} · {rig.pose[j]}°<input type="range" min="-120" max="120" step="1" value={rig.pose[j]} onChange={e=>onChange({...rig,pose:{...rig.pose,[j]:e.target.valueAsNumber}})}/></label>)}
 <button onClick={()=>onChange({...rig,pose:{...neutralPose}})}>Reset joint pose</button></fieldset>;
}
