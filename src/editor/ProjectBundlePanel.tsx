import {useRef,useState} from 'react';
import type {Project} from '../core/project';
import {encodeProjectBundle,decodeProjectBundle} from '../core/projectBundle';
export function ProjectBundlePanel({project,onOpen,disabled}:{project:Project;onOpen:(p:Project)=>void;disabled:boolean}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[incoming,setIncoming]=useState<{base:Project;project:Project}|null>(null);const loading=useRef(false);
 const supported=typeof CompressionStream!=='undefined'&&typeof DecompressionStream!=='undefined'&&!!globalThis.crypto?.subtle;
 async function operation(fn:()=>Promise<void>){if(loading.current)return;loading.current=true;setBusy(true);setError('');try{await fn();}catch(e){setError(e instanceof Error?e.message:String(e));}finally{loading.current=false;setBusy(false);}}
 return <fieldset disabled={disabled||busy||!supported}><legend>Compressed project backup</legend><p className="hint">Portable gzip bundle with bounded decompression and SHA-256 integrity checking. Existing plain JSON exports still work.</p>
 {!supported&&<p>Compressed backups require browser compression and secure context support.</p>}
 <button onClick={()=>void operation(async()=>{const bytes=await encodeProjectBundle(project),url=URL.createObjectURL(new Blob([bytes],{type:'application/octet-stream'}));const a=document.createElement('a');a.href=url;a.download='project.gstudio';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);})}>Export compressed project</button>
 <label>Import compressed project<input type="file" accept=".gstudio" onChange={e=>{const f=e.currentTarget.files?.[0];e.currentTarget.value='';setIncoming(null);if(f)void operation(async()=>{if(f.size>8_000_048)throw Error('Compressed project exceeds size limit');setIncoming({base:project,project:await decodeProjectBundle(new Uint8Array(await f.arrayBuffer()))});});}}/></label>
 {incoming&&<><p>Validated backup: {incoming.project.name} · {incoming.project.entities.length} active objects</p><button disabled={incoming.base!==project} onClick={()=>{onOpen(incoming.project);setIncoming(null);}}>Open validated backup</button>{incoming.base!==project&&<p>Workspace changed; import again before opening.</p>}</>}{error&&<p role="alert">{error}</p>}</fieldset>;
}
