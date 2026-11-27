import {useState} from 'react';
import {capture,type Clip,type Pose,type Interpolation} from '../core/animation';
import type {Entity} from '../core/project';
export function AnimationPanel({entity,onChange,onPose,preview,onPreview}:{entity:Entity;onChange:(clip:Clip|undefined)=>void;onPose:(pose:Pose)=>void;preview:number|null;onPreview:(time:number|null)=>void}){
 const [time,setTime]=useState(1);const clip=entity.animation;
 const duration=clip?.keys.at(-1)?.time??0;
 return <fieldset disabled={entity.kind==='ground'||entity.kind==='terrain'||(!!entity.role&&entity.role!=='decoration')}><legend>Animation Studio · Transform timeline</legend><p className="hint">Animate decorative objects. Capture the current transform, then move or rotate the object and capture another pose.</p>
 {!clip?<button onClick={()=>onChange(capture(entity,0))}>Create animation at 0s</button>:<>
 <label><input type="checkbox" checked={clip.loop} onChange={e=>onChange({...clip,loop:e.target.checked})}/> Loop during play</label>
 <label>Interpolation<select aria-label="Interpolation" value={clip.interpolation??'linear'} onChange={e=>onChange({...clip,interpolation:e.target.value as Interpolation})}><option value="linear">Linear</option><option value="smooth">Ease in and out</option><option value="step">Stepped</option></select></label>
 <label><input type="checkbox" checked={clip.pingPong??false} disabled={!clip.loop} onChange={e=>onChange({...clip,pingPong:e.target.checked})}/> Ping-pong loop</label>
 <label>Keyframe time (seconds)<input type="number" min="0" max="60" step=".1" value={time} onChange={e=>{const n=e.target.valueAsNumber;if(Number.isFinite(n)&&n>=0&&n<=60)setTime(n);}}/></label>
 <button disabled={clip.keys.length>=128&&!clip.keys.some(k=>k.time===time)} onClick={()=>onChange(capture(entity,time))}>Capture pose</button>
 <div className="keyframe-list">{clip.keys.map(k=><div key={k.time}><span>{k.time.toFixed(2)}s</span><button onClick={()=>{onPreview(null);onPose({position:[...k.position],rotation:[...k.rotation],scale:[...k.scale]});}}>Load pose</button><button disabled={k.time===0} onClick={()=>onChange({...clip,keys:clip.keys.filter(x=>x.time!==k.time)})}>Delete</button></div>)}</div>
 <label>Preview · {(preview??0).toFixed(2)}s<input type="range" min="0" max={Math.max(.01,duration)} step=".01" value={Math.min(preview??0,duration)} onChange={e=>onPreview(e.target.valueAsNumber)}/></label>
 <button onClick={()=>onPreview(preview===null?0:null)}>{preview===null?'Preview pose':'Stop preview'}</button>
 <button onClick={()=>{onPreview(null);onChange(undefined);}}>Remove animation</button></>}</fieldset>;
}
