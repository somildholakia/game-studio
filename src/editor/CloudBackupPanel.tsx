import {useEffect,useRef,useState} from 'react';
import type {Project} from '../core/project';
import {createBackupClient,validBackupTarget,type BackupRevision} from '../runtime/backupClient';
export function CloudBackupPanel({project,onOpen,disabled}:{project:Project;onOpen:(project:Project)=>void;disabled:boolean}){
 const [id,setId]=useState('game'),[token,setToken]=useState(''),[history,setHistory]=useState<BackupRevision[]|null>(null),[selected,setSelected]=useState(0),[review,setReview]=useState<{record:BackupRevision;project:Project;base:Project}|null>(null);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const request=useRef<AbortController|null>(null),alive=useRef(true),latest=useRef({project,disabled});latest.current={project,disabled};
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;request.current?.abort();};},[]);
 const ready=validBackupTarget(id,token);
 const reset=()=>{setHistory(null);setReview(null);setSelected(0);setMessage('');setError('');};
 async function operation(fn:(client:ReturnType<typeof createBackupClient>,signal:AbortSignal)=>Promise<void>){
  if(request.current||!ready||disabled)return;const c=new AbortController();request.current=c;setBusy(true);setError('');setMessage('');
  try{await fn(createBackupClient(id,token),c.signal);}catch(e){if(alive.current&&!c.signal.aborted){setError(String(e));setHistory(null);setReview(null);setSelected(0);}}finally{request.current=null;if(alive.current)setBusy(false);}
 }
 const head=history?.length??0,record=history?.find(r=>r.revision===selected);
 return <fieldset disabled={disabled||busy}><legend>Cloud backups</legend><details><summary>Connect private backup service</summary>
 <p className="hint">Requires a configured same-origin backup service. The access token stays in this panel's memory and is never saved in the project. Inspect history before saving. Backup data is sent only after explicit confirmation.</p>
 <label>Backup project ID<input maxLength={64} value={id} onChange={e=>{setId(e.target.value);reset();}}/></label>
 <label>Backup access token<input type="password" autoComplete="off" maxLength={8000} value={token} onChange={e=>{setToken(e.target.value);reset();}}/></label>
 <button disabled={!ready} onClick={()=>void operation(async(client,signal)=>{const revisions=await client.list(signal);if(signal.aborted)return;setHistory(revisions);setSelected(revisions.at(-1)?.revision??0);setReview(null);setMessage(revisions.length?'Loaded '+revisions.length+' backup revisions.':'No backup revisions yet.');})}>Refresh backup history</button>
 {history&&<><p>Current backup revision: {head}</p>
 <button disabled={head>=16} onClick={()=>{if(!window.confirm('Save a new private backup revision for '+id+'?'))return;void operation(async(client,signal)=>{const saved=await client.save(project,head,signal);if(signal.aborted)return;setHistory([...history,saved]);setSelected(saved.revision);setReview(null);setMessage('Saved backup revision '+saved.revision+'.');});}}>Save current backup</button>
 {history.length>0&&<><label>Backup revision<select value={selected} onChange={e=>{setSelected(Number(e.target.value));setReview(null);}}>{history.map(r=><option key={r.revision} value={r.revision}>Revision {r.revision} · {r.sha.slice(0,12)}</option>)}</select></label>
 <button disabled={!record} onClick={()=>{if(!record)return;void operation(async(client,signal)=>{const candidate=await client.read(record,signal);if(signal.aborted)return;setReview({record,project:candidate,base:project});setMessage('Verified revision '+record.revision+': '+candidate.name);});}}>Inspect backup revision</button>
 {review&&<><p>Verified project: {review.project.name} · {review.project.entities.length} objects</p>
 <button disabled={review.base!==project} onClick={()=>{if(latest.current.disabled||latest.current.project!==review.base)return;if(window.confirm('Open verified backup locally? The remote history will not change.')){onOpen(review.project);setReview(null);setMessage('Backup opened locally.');}}}>Open verified backup</button>
 <button disabled={head>=16||review.record.revision===head} onClick={()=>{if(!window.confirm('Restore revision '+review.record.revision+' as a new remote backup revision? Your local project will not change.'))return;void operation(async(client,signal)=>{const saved=await client.restore(review.record,head,signal);if(signal.aborted)return;setHistory([...history,saved]);setSelected(saved.revision);setReview(null);setMessage('Restored as backup revision '+saved.revision+'.');});}}>Restore as new backup</button></>}
 </>}</>}
 <button onClick={()=>{setToken('');reset();}}>Clear backup credentials</button>
 {message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}
 </details></fieldset>;
}
