import {useState} from 'react';import {createPack,readPack,installPack,type Pack} from '../core/packs';import type {Project} from '../core/project';
export function PackPanel({project,onChange,disabled}:{project:Project;onChange:(p:Project)=>void;disabled:boolean}){
 const [name,setName]=useState(''),[pack,setPack]=useState<Pack|null>(null),[error,setError]=useState('');
 function exportPack(){try{const value=createPack(project,name.trim()||project.name+' library');const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='library.game-studio-pack.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setError('');}catch(e){setError(String(e));}}
 return <fieldset disabled={disabled}><legend>Extension packs</legend><p className="hint">Share reusable prefabs and gameplay rules. Packs contain data only and cannot run JavaScript.</p>
 <label>Pack name<input maxLength={200} value={name} onChange={e=>setName(e.target.value)}/></label><button onClick={exportPack}>Export reusable pack</button>
 <label className="button">Import extension pack<input type="file" hidden accept=".json" onChange={async e=>{const file=e.currentTarget.files?.[0];e.currentTarget.value='';if(!file)return;try{if(file.size>8_000_000)throw Error('Pack exceeds 8 MB');setPack(readPack(await file.text()));setError('');}catch(err){setPack(null);setError(String(err));}}}/></label>
 {pack&&<div><strong>{pack.name}</strong><p>{pack.prefabs.length} prefabs · {pack.assets.length} models · {pack.rules.length} gameplay rules</p><p>Rules may change score or game completion. They will be appended to the active project's rules.</p><button onClick={()=>{try{onChange(installPack(project,pack));setPack(null);setError('');}catch(e){setError(String(e));}}}>Install as one undoable edit</button><button onClick={()=>setPack(null)}>Cancel</button></div>}
 {error&&<p role="alert">{error}</p>}</fieldset>;
}
