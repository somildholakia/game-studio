import {useEffect,useRef,useState} from 'react';
import {readWasmTool,type WasmTool} from '../core/wasmTools';
import {runWasmTool} from '../core/wasmToolClient';
import {fixtureTool} from '../core/wasmToolFixture';
import {previewPlan,type PlanPreview} from '../ai/plan';
import type {Project} from '../core/project';
export function WasmToolPanel({project,disabled,onChange}:{project:Project;disabled:boolean;onChange:(p:Project)=>void}){
 const [tool,setTool]=useState<WasmTool>(fixtureTool),[count,setCount]=useState(4),[spacing,setSpacing]=useState(2),[error,setError]=useState(''),[busy,setBusy]=useState(false),[preview,setPreview]=useState<(PlanPreview&{base:Project})|null>(null);
 const controller=useRef<AbortController|null>(null);useEffect(()=>()=>controller.current?.abort(),[]);
 async function run(){const c=new AbortController();controller.current=c;setBusy(true);setPreview(null);setError('');try{const raw=await runWasmTool(tool,{count,spacing},c.signal);if(!c.signal.aborted)setPreview({...previewPlan(project,raw),base:project});}catch(e){if(!c.signal.aborted)setError(String(e));}finally{if(controller.current===c){controller.current=null;setBusy(false);}}}
 return <fieldset disabled={disabled}><legend>Executable extensions · Wasm SDK</legend><details><summary>Run a restricted extension</summary><p className="hint">Compiled numeric tools run in a disposable worker. No project access, network, files, memory or arbitrary JavaScript. Review emitted commands before applying. Loaded tools are session-only.</p>
 <label>Import Wasm tool<input disabled={busy} type="file" accept=".json" onChange={async e=>{const f=e.currentTarget.files?.[0];e.currentTarget.value='';if(!f)return;try{if(f.size>50000)throw Error('Manifest exceeds limit');setTool(readWasmTool(await f.text()));setPreview(null);setError('');}catch(err){setError(String(err));}}}/></label>
 <p>{tool.name} · capabilities: {tool.capabilities.join(', ')}</p><label>Extension count<input type="number" min="1" max="32" value={count} disabled={busy} onChange={e=>{if(Number.isInteger(e.target.valueAsNumber)){setCount(e.target.valueAsNumber);setPreview(null);}}}/></label><label>Extension spacing<input type="number" min=".1" max="100" step=".1" value={spacing} disabled={busy} onChange={e=>{if(Number.isFinite(e.target.valueAsNumber)){setSpacing(e.target.valueAsNumber);setPreview(null);}}}/></label>
 <button disabled={busy} onClick={()=>void run()}>Preview executable extension</button><button disabled={!busy} onClick={()=>controller.current?.abort()}>Cancel extension</button>
 {error&&<p role="alert">{error}</p>}{preview&&<>{preview.base!==project?<p>Project changed. Preview again.</p>:<><ul>{preview.changes.map((v,i)=><li key={i}>{v}</li>)}</ul><button onClick={()=>{onChange(preview.next);setPreview(null);}}>Apply executable extension</button></>}</>}</details></fieldset>;
}
