import {useEffect,useState} from 'react';
import {readMeshModifierState,type MeshModifierState} from '../core/meshModifiers';
import type {MeshData} from '../core/mesh';
export function MeshModifierPanel({mesh,value,onChange}:{mesh:MeshData;value?:MeshModifierState;onChange:(mesh:MeshData,state?:MeshModifierState)=>void}){
 const [draft,setDraft]=useState(JSON.stringify(value?.steps??[{kind:'subdivide'}],null,2)),[error,setError]=useState('');
 useEffect(()=>{setDraft(JSON.stringify(value?.steps??[{kind:'subdivide'}],null,2));setError('');},[value]);
 return <fieldset><legend>Model Studio · Non-destructive modifiers</legend>
 <p className="hint">Keep the source mesh while applying up to four ordered steps. Subdivide, smooth, mirror or use a box Boolean first on the standard cuboid. Bake to edit the result directly; remove to restore the source.</p>
 <label>Modifier stack JSON<textarea rows={7} maxLength={8000} value={draft} onChange={e=>setDraft(e.target.value)}/></label>
 <div className="tools"><button onClick={()=>setDraft(JSON.stringify([{kind:'subdivide'}],null,2))}>Subdivision example</button><button onClick={()=>setDraft(JSON.stringify([{kind:'box-boolean',mode:'difference',center:[.5,0,0],size:[1,1,2]}],null,2))}>Box cut example</button>
 <button onClick={()=>{try{const result=readMeshModifierState({source:value?.source??mesh,steps:JSON.parse(draft)});onChange(result.mesh,result.state);setError('');}catch(e){setError(e instanceof Error?e.message:String(e));}}}>Apply modifier stack</button>
 <button disabled={!value} onClick={()=>onChange(mesh)}>Bake modifier stack</button><button disabled={!value} onClick={()=>{if(value)onChange(value.source);}}>Remove modifier stack</button></div>
 {value&&<p data-testid="modifier-summary">Source {value.source.vertices.length} vertices · {value.source.triangles.length} triangles; evaluated {mesh.vertices.length} vertices · {mesh.triangles.length} triangles. {value.steps.length} active steps.</p>}
 {error&&<p role="alert">{error}</p>}
 </fieldset>;
}
