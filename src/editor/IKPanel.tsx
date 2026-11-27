import {useState} from 'react';
import {limbs,solveLimb,type Limb} from '../core/inverseKinematics';
import type {JointPose} from '../core/characterRig';
export function IKPanel({pose,onChange}:{pose:JointPose;onChange:(p:JointPose)=>void}){
 const [limb,setLimb]=useState<Limb>('left arm'),[down,setDown]=useState(1),[forward,setForward]=useState(1),[bend,setBend]=useState<1|-1>(1),[error,setError]=useState('');
 return <fieldset><legend>Inverse kinematics · limb target</legend><p className="hint">Aim the hand or foot in its local bend plane. Distances are in limb segment lengths. The solved pose can be captured on the joint timeline.</p>
 <label>Limb<select value={limb} onChange={e=>setLimb(e.target.value as Limb)}>{limbs.map(l=><option key={l}>{l}</option>)}</select></label>
 <label>Target down<input type="number" min="-2" max="2" step=".05" value={down} onChange={e=>{if(Number.isFinite(e.target.valueAsNumber))setDown(e.target.valueAsNumber);}}/></label>
 <label>Target forward<input type="number" min="-2" max="2" step=".05" value={forward} onChange={e=>{if(Number.isFinite(e.target.valueAsNumber))setForward(e.target.valueAsNumber);}}/></label>
 <label>Bend direction<select value={bend} onChange={e=>setBend(e.target.value==='1'?1:-1)}><option value={1}>Positive</option><option value={-1}>Negative</option></select></label>
 <button onClick={()=>{try{onChange(solveLimb(pose,limb,down,forward,bend));setError('');}catch(e){setError(e instanceof Error?e.message:String(e));}}}>Solve limb pose</button>{error&&<p role="alert">{error}</p>}</fieldset>;
}
