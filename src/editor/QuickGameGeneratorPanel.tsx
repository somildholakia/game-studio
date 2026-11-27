import {useState} from 'react';
import type {Project} from '../core/project';
import {diagnose} from '../core/diagnostics';
import {generateLocalGame,gameGenres,genreLabels,type GameGenre} from '../ai/localGenerator';
import type {PlanPreview} from '../ai/plan';
export function QuickGameGeneratorPanel({project,disabled,onOpen}:{project:Project;disabled:boolean;onOpen:(p:Project)=>void}){
 const [genre,setGenre]=useState<GameGenre>('treasure'),[title,setTitle]=useState('My adventure'),[difficulty,setDifficulty]=useState(1),[seed,setSeed]=useState('42'),[preview,setPreview]=useState<{base:Project;result:PlanPreview}|null>(null),[error,setError]=useState('');
 const reset=()=>{setPreview(null);setError('');};
 return <fieldset disabled={disabled}><legend>Quick game generator (offline)</legend><p className="hint">Generate a new playable game from a deterministic recipe. No AI provider, network access or API key is required. Review the draft before replacing your workspace.</p>
 <label>Game genre<select value={genre} onChange={e=>{setGenre(e.target.value as GameGenre);reset();}}>{gameGenres.map(g=><option key={g} value={g}>{genreLabels[g]}</option>)}</select></label>
 <label>Generated game title<input value={title} maxLength={100} onChange={e=>{setTitle(e.target.value);reset();}}/></label>
 <label>Game difficulty<select value={difficulty} onChange={e=>{setDifficulty(Number(e.target.value));reset();}}>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}</select></label>
 <label>Layout seed<input type="number" min="0" max="4294967295" step="1" value={seed} onChange={e=>{setSeed(e.target.value);reset();}}/></label>
 <button disabled={!title.trim()||!seed.trim()} onClick={()=>{try{const result=generateLocalGame({genre,title,difficulty,seed:Number(seed)});const errors=diagnose(result.next).filter(d=>d.severity==='error');if(errors.length)throw Error(errors.map(d=>d.message).join('; '));setPreview({base:project,result});setError('');}catch(e){setPreview(null);setError(String(e));}}}>Generate playable draft</button>
 {preview&&<><p>Generated draft: {preview.result.next.name}</p><p>{preview.result.summary}</p><p>{preview.result.changes.length} reviewed changes · structural checks passed</p><details><summary>Review generated objects and rules</summary><ul>{preview.result.changes.map((c,i)=><li key={i}>{c}</li>)}</ul></details>
 <button disabled={preview.base!==project} onClick={()=>{onOpen(preview.result.next);setPreview(null);}}>Open generated game (undoable)</button>{preview.base!==project&&<p>Workspace changed; regenerate the draft first.</p>}</>}
 {error&&<p role="alert">{error}</p>}</fieldset>;
}
