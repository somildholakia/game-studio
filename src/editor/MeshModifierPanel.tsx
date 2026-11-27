import {useEffect,useState} from 'react';
import {readMeshModifierState,readModifierSteps,type MeshModifierState,type MeshModifier,type BoxMode} from '../core/meshModifiers';
import type {MeshData} from '../core/mesh';
export function MeshModifierPanel({mesh,value,onChange}:{mesh:MeshData;value?:MeshModifierState;onChange:(mesh:MeshData,state?:MeshModifierState)=>void}){
 const [draft,setDraft]=useState(JSON.stringify(value?.steps??[{kind:'subdivide'}],null,2)),[error,setError]=useState('');
 let steps:MeshModifier[]|undefined;try{steps=readModifierSteps(JSON.parse(draft));}catch{/* Advanced JSON may be incomplete during typing. */}
 const setSteps=(next:MeshModifier[])=>setDraft(JSON.stringify(next,null,2));
 const update=(index:number,step:MeshModifier)=>{if(steps)setSteps(steps.map((v,i)=>i===index?step:v));};
 const move=(index:number,direction:-1|1)=>{if(!steps)return;const next=[...steps],target=index+direction;if(target<0||target>=next.length)return;[next[index],next[target]]=[next[target],next[index]];if(next.some((v,i)=>v.kind==='box-boolean'&&i!==0))return;setSteps(next);};
 useEffect(()=>{setDraft(JSON.stringify(value?.steps??[{kind:'subdivide'}],null,2));setError('');},[value]);
 return <fieldset><legend>Model Studio · Non-destructive modifiers</legend>
 <p className="hint">Keep the source mesh while applying up to four ordered steps. Subdivide, smooth, mirror or use a box Boolean first on the standard cuboid. Bake to edit the result directly; remove to restore the source.</p>
 {steps&&<fieldset><legend>Visual modifier controls</legend>{steps.map((step,i)=><fieldset key={i}><legend>Step {i+1} · {step.kind}</legend>
 {step.kind==='mirror'&&<label>Mirror axis<select value={step.axis} onChange={e=>update(i,{...step,axis:Number(e.target.value) as 0|1|2})}>{['X','Y','Z'].map((a,j)=><option key={a} value={j}>{a}</option>)}</select></label>}
 {step.kind==='box-boolean'&&<><label>Boolean operation<select value={step.mode} onChange={e=>update(i,{...step,mode:e.target.value as BoxMode})}>{['union','difference','intersection'].map(m=><option key={m}>{m}</option>)}</select></label>{(['center','size'] as const).map(key=><fieldset key={key}><legend>Cutter {key}</legend>{step[key].map((n,j)=><label key={j}>{key} {['X','Y','Z'][j]}<input type="number" min={key==='size'?.01:-1000} max="1000" step=".1" value={n} onChange={e=>{const x=e.target.valueAsNumber;if(!Number.isFinite(x)||Math.abs(x)>1000||(key==='size'&&x<.01))return;const next=[...step[key]] as [number,number,number];next[j]=x;update(i,{...step,[key]:next});}}/></label>)}</fieldset>)}</>}
 <div className="tools"><button disabled={i===0||steps![i-1]?.kind==='box-boolean'} onClick={()=>move(i,-1)}>Move step {i+1} up</button><button disabled={i===steps!.length-1||step.kind==='box-boolean'} onClick={()=>move(i,1)}>Move step {i+1} down</button><button disabled={steps!.length<=1} onClick={()=>setSteps(steps!.filter((_,j)=>i!==j))}>Remove step {i+1}</button></div></fieldset>)}
 <div className="tools"><button disabled={steps.length>=4} onClick={()=>setSteps([...steps!,{kind:'subdivide'}])}>Add subdivision step</button><button disabled={steps.length>=4} onClick={()=>setSteps([...steps!,{kind:'smooth'}])}>Add smoothing step</button><button disabled={steps.length>=4} onClick={()=>setSteps([...steps!,{kind:'mirror',axis:0}])}>Add mirror step</button><button disabled={steps.length>=4||steps.some(s=>s.kind==='box-boolean')} onClick={()=>setSteps([{kind:'box-boolean',mode:'difference',center:[.5,0,0],size:[1,1,2]},...steps!])}>Insert box Boolean</button></div></fieldset>}
 <label>Modifier stack JSON<textarea rows={7} maxLength={8000} value={draft} onChange={e=>setDraft(e.target.value)}/></label>
 <div className="tools"><button onClick={()=>setDraft(JSON.stringify([{kind:'subdivide'}],null,2))}>Subdivision example</button><button onClick={()=>setDraft(JSON.stringify([{kind:'box-boolean',mode:'difference',center:[.5,0,0],size:[1,1,2]}],null,2))}>Box cut example</button>
 <button onClick={()=>{try{const result=readMeshModifierState({source:value?.source??mesh,steps:JSON.parse(draft)});onChange(result.mesh,result.state);setError('');}catch(e){setError(e instanceof Error?e.message:String(e));}}}>Apply modifier stack</button>
 <button disabled={!value} onClick={()=>onChange(mesh)}>Bake modifier stack</button><button disabled={!value} onClick={()=>{if(value)onChange(value.source);}}>Remove modifier stack</button></div>
 {value&&<p data-testid="modifier-summary">Source {value.source.vertices.length} vertices · {value.source.triangles.length} triangles; evaluated {mesh.vertices.length} vertices · {mesh.triangles.length} triangles. {value.steps.length} active steps.</p>}
 {error&&<p role="alert">{error}</p>}
 </fieldset>;
}
