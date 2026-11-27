import {useEffect,useRef,useState} from 'react';
import {providers,requestPlan,type Provider} from '../ai/provider';
import {buildPlanPrompt} from '../ai/plan';
import type {Project} from '../core/project';
export function ProviderPanel({project,onPlan}:{project:Project;onPlan:(raw:string,base:Project)=>void}){
 const [provider,setProvider]=useState<Provider>('openai');const [model,setModel]=useState('');const [key,setKey]=useState('');const [task,setTask]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [consent,setConsent]=useState(false);
 const request=useRef<AbortController|null>(null);useEffect(()=>()=>request.current?.abort(),[]);
 async function generate(){
 if(request.current)return;const controller=new AbortController();request.current=controller;setBusy(true);setError('');
 const base=project;
 try{const raw=await requestPlan({provider,model:model.trim(),apiKey:key.trim()||undefined,context:buildPlanPrompt(base),task},controller.signal);if(!controller.signal.aborted)onPlan(raw,base);}
 catch(e){if(!controller.signal.aborted)setError(String(e));}
 finally{if(request.current===controller){request.current=null;setBusy(false);setKey('');}}
 }
 return <details><summary>Generate with your own API key (local server)</summary><fieldset disabled={busy}>
 <label>Provider<select value={provider} onChange={e=>{setProvider(e.target.value as Provider);setModel('');setKey('');}}>{providers.map(p=><option key={p}>{p}</option>)}</select></label>
 <label>Model ID<input value={model} maxLength={150} placeholder="Provider model ID" onChange={e=>setModel(e.target.value)}/></label>
 <label>API key (optional if configured locally)<input type="password" autoComplete="off" value={key} maxLength={2048} onChange={e=>setKey(e.target.value)}/></label>
 <label>Describe your game or change<textarea rows={4} value={task} maxLength={4000} onChange={e=>setTask(e.target.value)}/></label>
 <label><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> I allow this project context and prompt to be sent to the chosen AI provider. API use may incur charges.</label>
 <button disabled={!model.trim()||!task.trim()||!consent} onClick={()=>void generate()}>Generate edit plan</button></fieldset>
 {busy&&<button onClick={()=>request.current?.abort()}>Cancel request</button>}
 {error&&<p role="alert">{error}</p>}<p className="hint">Keys are held only in memory and passed through your local server. Do not use a public deployment. Responses require validation and approval.</p></details>;
}
