import {ProviderPanel} from './ProviderPanel';
import {useState} from 'react';
import {buildPlanPrompt,previewPlan,type PlanPreview} from '../ai/plan';
import type {Project} from '../core/project';
export function AIPlanPanel({project,onChange,disabled}:{project:Project;onChange:(p:Project)=>void;disabled:boolean}){
 const [raw,setRaw]=useState('');const [error,setError]=useState('');const [showPrompt,setShowPrompt]=useState(false);const [preview,setPreview]=useState<(PlanPreview&{base:Project})|null>(null);
 const valid=preview?.base===project;
 return <fieldset disabled={disabled}><legend>AI Studio · Command preview</legend>
 <p className="hint">Review declarative AI-generated scene changes before applying. Generate through the local BYOK endpoint or paste a plan manually.</p>
 <ProviderPanel project={project} onPlan={(plan,base)=>{setRaw(plan);setPreview(null);try{setPreview({...previewPlan(base,plan),base});setError('');}catch(e){setError(String(e));}}}/><button onClick={()=>setShowPrompt(v=>!v)}>{showPrompt?'Hide project context':'Show project context prompt'}</button>
 {showPrompt&&<label>Prompt<textarea readOnly rows={8} value={buildPlanPrompt(project)}/></label>}
 <label>JSON edit plan<textarea rows={5} maxLength={100000} placeholder='{"version":1,"summary":"Create a wall","commands":[...]}' value={raw} onChange={e=>{setRaw(e.target.value);setPreview(null);setError('');}}/></label>
 <button disabled={!raw.trim()} onClick={()=>{try{setPreview({...previewPlan(project,raw),base:project});setError('');}catch(e){setPreview(null);setError(String(e));}}}>Validate and preview</button>
 {error&&<p role="alert">{error}</p>}
 {preview&&<div><p>{preview.summary}</p>{valid?<><p>{preview.changes.length} changes</p><ul>{preview.changes.map((c,i)=><li key={i}>{c}</li>)}</ul><details><summary>Review field-level changes</summary><ul>{preview.details.map((d,i)=><li key={i}>{d}</li>)}</ul></details><button disabled={!preview.changes.length} onClick={()=>{onChange(preview.next);setPreview(null);setRaw('');}}>Apply as one undoable edit</button></>:<p>Project changed. Validate again before applying.</p>}</div>}</fieldset>;
}
