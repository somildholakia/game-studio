import {useRef,useState} from 'react';
import {parseProject,type Project} from '../core/project';
import {mergeProjects,type MergeChoice,type MergeResult} from '../core/projectMerge';
export function CollaborationPanel({project,disabled,onApply}:{project:Project;disabled:boolean;onApply:(p:Project)=>void}){
 const [base,setBase]=useState<Project|null>(null),[incoming,setIncoming]=useState<Project|null>(null),[choices,setChoices]=useState<Record<string,MergeChoice>>({}),[review,setReview]=useState<{local:Project;result:MergeResult}|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const generation=useRef(0);
 async function load(file:File|undefined,target:'base'|'incoming'){
 if(!file)return;const id=++generation.current;setBusy(true);setReview(null);setChoices({});setError('');
 try{if(file.size>10_000_000)throw Error('Project exceeds 10 MB');const p=parseProject(await file.text());if(generation.current===id)(target==='base'?setBase:setIncoming)(p);}catch(e){if(generation.current===id)setError(String(e));}finally{if(generation.current===id)setBusy(false);}
 }
 function preview(next:Record<string,MergeChoice>){if(!base||!incoming)return;setReview({local:project,result:mergeProjects(base,project,incoming,next)});}
 const stale=review!==null&&review.local!==project;
 return <fieldset disabled={disabled||busy}><legend>Collaborative project merge</legend><details><summary>Merge a teammate's project</summary><p className="hint">Export a common base before working independently. Import that base and the teammate's edited project. Your current workspace is the local version. No changes are applied until review.</p>
 <label>Common base project<input type="file" accept=".json" onChange={e=>{const f=e.currentTarget.files?.[0];e.currentTarget.value='';void load(f,'base');}}/></label>{base&&<p>Base: {base.name}</p>}
 <label>Incoming project<input type="file" accept=".json" onChange={e=>{const f=e.currentTarget.files?.[0];e.currentTarget.value='';void load(f,'incoming');}}/></label>{incoming&&<p>Incoming: {incoming.name}</p>}
 <button disabled={!base||!incoming} onClick={()=>{setChoices({});preview({});}}>Review project merge</button>
 {review&&<><p role="status">{review.result.conflicts.length} merge conflicts{stale?' · Workspace changed; review again.':''}</p>{review.result.conflicts.map(c=><fieldset key={c.path}><legend>{c.path}</legend><p>Local: {c.local}</p><p>Incoming: {c.incoming}</p><label>Resolve {c.path}<select disabled={stale} value={choices[c.path]??''} onChange={e=>{const next={...choices};if(e.target.value)next[c.path]=e.target.value as MergeChoice;else delete next[c.path];setChoices(next);preview(next);}}><option value="">Choose version</option><option value="local">Keep local</option><option value="incoming">Use incoming</option></select></label></fieldset>)}
 {review.result.error&&<p role="alert">{review.result.error}</p>}
 {review.result.project&&<p>Validated merge ready · {review.result.project.entities.length} active level objects</p>}
 <button disabled={stale||!review.result.project} onClick={()=>{if(review.local===project&&review.result.project){onApply(review.result.project);setReview(null);setChoices({});}}}>Apply reviewed merge</button></>}
 {error&&<p role="alert">{error}</p>}</details></fieldset>;
}
