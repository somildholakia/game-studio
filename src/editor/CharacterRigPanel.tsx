import {useState} from 'react';
import {defaultRig,joints,neutralPose,captureJointPose,type CharacterRig} from '../core/characterRig';
export function CharacterRigPanel({value,onChange,decorative,preview,onPreview}:{value?:CharacterRig;onChange:(r:CharacterRig)=>void;decorative:boolean;preview:number|null;onPreview:(time:number|null)=>void}){
 const rig=value??defaultRig;const [time,setTime]=useState(1);const clip=rig.clip,duration=clip?.keys.at(-1)?.time??0;const colors=['skin','hair','clothing','shoes'] as const;
 return <fieldset><legend>Character Studio · Appearance and joints</legend><p className="hint">Edit an articulated low-poly character. Joint angles are in degrees. Automatic locomotion is applied to player characters in play mode.</p>
 {colors.map(k=><label key={k}>{k}<input type="color" value={rig[k]} onChange={e=>onChange({...rig,[k]:e.target.value})}/></label>)}
 <label>Hair style<select value={rig.hairStyle} onChange={e=>onChange({...rig,hairStyle:e.target.value as CharacterRig['hairStyle']})}>{['none','short','cap'].map(k=><option key={k}>{k}</option>)}</select></label>
 <label><input type="checkbox" checked={rig.motion} onChange={e=>onChange({...rig,motion:e.target.checked})}/> Automatic walk and jump poses</label>
 {joints.map(j=><label key={j}>{j} · {rig.pose[j]}°<input type="range" min="-120" max="120" step="1" value={rig.pose[j]} onChange={e=>onChange({...rig,pose:{...rig.pose,[j]:e.target.valueAsNumber}})}/></label>)}
 <button onClick={()=>onChange({...rig,pose:{...neutralPose}})}>Reset joint pose</button>
 <fieldset disabled={!decorative}><legend>Joint animation timeline</legend><p className="hint">Decorative characters only. Edit the joint sliders and capture poses at different times. The preview scrubs both joint and transform timelines.</p>
 {!clip?<button onClick={()=>{onPreview(null);onChange({...rig,clip:captureJointPose(rig,0)});}}>Create joint animation</button>:<>
 <label><input type="checkbox" checked={clip.loop} onChange={e=>onChange({...rig,clip:{...clip,loop:e.target.checked}})}/> Loop joint animation</label>
 <label>Joint key time (seconds)<input type="number" min="0" max="60" step=".1" value={time} onChange={e=>{const n=e.target.valueAsNumber;if(Number.isFinite(n)&&n>=0&&n<=60)setTime(n);}}/></label>
 <button disabled={clip.keys.length>=128&&!clip.keys.some(k=>k.time===time)} onClick={()=>{onPreview(null);onChange({...rig,clip:captureJointPose(rig,time)});}}>Capture joint pose</button>
 <div className="keyframe-list">{clip.keys.map(k=><div key={k.time}><span>{k.time.toFixed(2)}s</span><button onClick={()=>{onPreview(null);onChange({...rig,pose:{...k.pose}});}}>Load joints</button><button disabled={k.time===0} onClick={()=>onChange({...rig,clip:{...clip,keys:clip.keys.filter(x=>x.time!==k.time)}})}>Delete joint key</button></div>)}</div>
 <label>Joint preview<input type="range" min="0" max={Math.max(.01,duration)} step=".01" value={Math.min(preview??0,duration)} onChange={e=>onPreview(e.target.valueAsNumber)}/></label>
 <button onClick={()=>onPreview(preview===null?0:null)}>{preview===null?'Preview joints':'Stop joint preview'}</button>
 <button onClick={()=>{onPreview(null);onChange({...rig,clip:undefined});}}>Remove joint animation</button></>}</fieldset></fieldset>;
}
