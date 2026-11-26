import {useEffect,useState} from 'react';
import {listProjects,saveProjectCopy,openProjectCopy,deleteProjectCopy,type SavedProject} from '../core/persistence';
import {initialProject,type Project} from '../core/project';
export function ProjectPanel({project,onOpen,disabled}:{project:Project;onOpen:(p:Project)=>void;disabled:boolean}){
 const [entries,setEntries]=useState<SavedProject[]>([]);const [name,setName]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 useEffect(()=>{let live=true;void listProjects().then(rows=>{if(live)setEntries(rows);}).catch(()=>{if(live)setError('Project library unavailable.');});return()=>{live=false;};},[]);
 async function operation(fn:()=>Promise<void>){setBusy(true);setError('');try{await fn();setEntries(await listProjects());}catch(e){setError(String(e));}finally{setBusy(false);}}
 return <fieldset disabled={disabled||busy}><legend>Project library</legend><p className="hint">Save named copies independently from the active autosaved workspace.</p>
 <label>Project name<input value={name} placeholder={project.name} maxLength={200} onChange={e=>setName(e.target.value)}/></label>
 <button onClick={()=>void operation(async()=>{await saveProjectCopy(project,name.trim()||project.name);setName('');})}>Save project copy</button>
 <button onClick={()=>{if(window.confirm('Start a new workspace? Save a copy of the current project first if needed.'))onOpen(initialProject());}}>New project</button>
 {entries.map(entry=><div className="asset-item" key={entry.id}><span>{entry.name}</span><button onClick={()=>void operation(async()=>{const saved=await openProjectCopy(entry.id);if(window.confirm('Open this saved copy in the active workspace?'))onOpen(saved);})}>Open</button><button onClick={()=>void operation(async()=>{if(window.confirm('Replace this saved copy with the current project?'))await saveProjectCopy(project,entry.name,entry.id);})}>Update</button><button onClick={()=>void operation(async()=>{if(window.confirm('Delete this saved copy?'))await deleteProjectCopy(entry.id);})}>Delete</button></div>)}
 {error&&<p role="alert">{error}</p>}</fieldset>;
}
