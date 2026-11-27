import {useState} from 'react';
import {platformTool,readCreatorTool,toolDefaults,previewCreatorTool,type CreatorTool} from '../core/creatorTools';
import type {Project} from '../core/project';
import type {PlanPreview} from '../ai/plan';
export function CreatorToolPanel({project,onChange,disabled}:{project:Project;onChange:(p:Project)=>void;disabled:boolean}){
 const [tools,setTools]=useState<CreatorTool[]>([platformTool]),[id,setId]=useState(platformTool.id),[values,setValues]=useState<Record<string,string|number|boolean>>(toolDefaults(platformTool)),[error,setError]=useState(''),[preview,setPreview]=useState<(PlanPreview&{base:Project})|null>(null);
 const tool=tools.find(t=>t.id===id)??platformTool;
 function select(t:CreatorTool){setId(t.id);setValues(toolDefaults(t));setPreview(null);setError('');}
 function set(key:string,value:string|number|boolean){setValues(old=>({...old,[key]:value}));setPreview(null);}
 return <fieldset disabled={disabled}><legend>Creator tools · Declarative extensions</legend><p className="hint">Reusable parameterized commands. Tool manifests cannot execute JavaScript, access files or send network requests. Changes always require preview and approval. Imported tools are session-only.</p>
 <label>Import creator tool<input type="file" accept=".json,application/json" onChange={async e=>{const file=e.currentTarget.files?.[0];e.currentTarget.value='';if(!file)return;try{if(file.size>100000)throw Error('Tool manifest too large');const t=readCreatorTool(await file.text());if(tools.some(x=>x.id===t.id))throw Error('Tool ID already loaded');if(tools.length>=16)throw Error('Maximum 16 tools per session');setTools(old=>old.some(x=>x.id===t.id)||old.length>=16?old:[...old,t]);select(t);}catch(err){setError(String(err));}}}/></label>
 <label>Creator tool<select value={id} onChange={e=>{const t=tools.find(x=>x.id===e.target.value);if(t)select(t);}}>{tools.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
 <p>{tool.description}</p><p>Capabilities: {tool.capabilities.join(', ')}</p>
 {tool.parameters.map(p=><label key={p.key}>{p.label}{p.type==='boolean'?<input type="checkbox" checked={!!values[p.key]} onChange={e=>set(p.key,e.target.checked)}/>:p.type==='number'?<input type="number" min={p.min} max={p.max} step="any" value={Number(values[p.key])} onChange={e=>{const n=e.target.valueAsNumber;if(Number.isFinite(n))set(p.key,n);}}/>:<input maxLength={200} value={String(values[p.key]??'')} onChange={e=>set(p.key,e.target.value)}/>}</label>)}
 <button onClick={()=>{try{setPreview({...previewCreatorTool(project,tool,values),base:project});setError('');}catch(err){setPreview(null);setError(String(err));}}}>Preview tool changes</button>
 <button onClick={()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(tool,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='creator-tool.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}>Export tool manifest</button>
 {error&&<p role="alert">{error}</p>}{preview&&<div>{preview.base!==project?<p>Project changed. Preview again.</p>:<><ul>{preview.changes.map((c,i)=><li key={i}>{c}</li>)}</ul><details><summary>Review tool field changes</summary><ul>{preview.details.map((c,i)=><li key={i}>{c}</li>)}</ul></details><button disabled={!preview.changes.length} onClick={()=>{onChange(preview.next);setPreview(null);}}>Apply creator tool</button></>}</div>}</fieldset>;
}
