import {useState} from 'react';
import {addScene,orderedScenes,switchScene,renameScene,moveScene,removeScene,MAIN_SCENE,MAX_SCENES} from '../core/scenes';
import type {Project} from '../core/project';
export function ScenePanel({project,onChange,disabled}:{project:Project;onChange:(p:Project)=>void;disabled:boolean}){
 const [name,setName]=useState('');const [error,setError]=useState('');const scenes=orderedScenes(project);
 function apply(fn:()=>Project){try{onChange(fn());setError('');}catch(e){setError(String(e));}}
 return <fieldset disabled={disabled}><legend>Level Manager</legend><p className="hint">Levels play in this order. Assets and prefabs are shared across the game.</p>
 {scenes.map((s,i)=><div className="asset-item" key={s.id}><span>{i+1}. {s.name}{s.id===(project.sceneId??MAIN_SCENE)?' (editing)':''}</span><button disabled={s.id===(project.sceneId??MAIN_SCENE)} onClick={()=>apply(()=>switchScene(project,s.id))}>Edit level {i+1}</button><button aria-label={'Move level '+(i+1)+' up'} disabled={i===0} onClick={()=>apply(()=>moveScene(project,s.id,-1))}>↑</button><button aria-label={'Move level '+(i+1)+' down'} disabled={i===scenes.length-1} onClick={()=>apply(()=>moveScene(project,s.id,1))}>↓</button><button aria-label={'Delete level '+(i+1)} disabled={scenes.length===1} onClick={()=>{if(confirm('Delete level '+s.name+'? Undo can restore it.'))apply(()=>removeScene(project,s.id));}}>Delete</button></div>)}
 <label>Level name<input maxLength={200} value={name} onChange={e=>setName(e.target.value)}/></label>
 <button disabled={!name.trim()||scenes.length>=MAX_SCENES} onClick={()=>{apply(()=>addScene(project,name));setName('');}}>Add level</button><button disabled={!name.trim()} onClick={()=>{apply(()=>renameScene(project,name));setName('');}}>Rename current level</button>{error&&<p role="alert">{error}</p>}</fieldset>;
}
