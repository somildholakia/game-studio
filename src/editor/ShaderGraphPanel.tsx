import {useEffect,useState} from 'react';
import {defaultShaderGraph,readShaderGraph,type ShaderGraph,type ShaderNode} from '../core/shaderGraph';
export function ShaderGraphPanel({value,onChange}:{value?:ShaderGraph;onChange:(v:ShaderGraph|undefined)=>void}){
 const [draft,setDraft]=useState(JSON.stringify(value??defaultShaderGraph,null,2)),[error,setError]=useState('');
 let graph:ShaderGraph|undefined;try{graph=readShaderGraph(JSON.parse(draft));}catch{/* Advanced JSON may be incomplete during typing. */}
 const setNodes=(nodes:ShaderNode[])=>setDraft(JSON.stringify({version:1,nodes},null,2));
 const add=(kind:ShaderNode['kind'])=>{if(!graph||graph.nodes.length>=16)return;const i=graph.nodes.length,a=Math.max(0,i-2),b=i-1;const node:ShaderNode=kind==='base'?{kind}:kind==='color'?{kind,color:'#ffffff'}:kind==='mix'?{kind,a,b,factor:.5}:kind==='multiply'?{kind,a,b}:{kind,a,b,axis:'y',scale:1};setNodes([...graph.nodes,node]);};
 const update=(index:number,node:ShaderNode)=>{if(graph)setNodes(graph.nodes.map((n,i)=>i===index?node:n));};
 useEffect(()=>{setDraft(JSON.stringify(value??defaultShaderGraph,null,2));setError('');},[value]);
 return <fieldset><legend>Shader Studio · GPU surface graph</legend><p className="hint">An unlit surface shader replaces PBR while enabled. Edit a bounded color graph. The final node is the output; inputs refer only to earlier node indices. Supports base, color, gradient, bands, mix and multiply. No arbitrary shader code.</p>
 {graph&&<fieldset><legend>Visual graph controls</legend>
 {graph.nodes.map((n,i)=><fieldset key={i}><legend>Node {i} · {n.kind}{i===graph!.nodes.length-1?' · output':''}</legend>
 {n.kind==='color'&&<label>Node {i} color<input type="color" value={n.color} onChange={e=>update(i,{...n,color:e.target.value})}/></label>}
 {'a' in n&&<>{(['a','b'] as const).map(k=><label key={k}>Node {i} input {k.toUpperCase()}<select value={n[k]} onChange={e=>update(i,{...n,[k]:Number(e.target.value)})}>{graph!.nodes.slice(0,i).map((p,j)=><option value={j} key={j}>{j}: {p.kind}</option>)}</select></label>)}</>}
 {n.kind==='mix'&&<label>Node {i} blend<input type="range" min="0" max="1" step=".01" value={n.factor} onChange={e=>update(i,{...n,factor:e.target.valueAsNumber})}/></label>}
 {(n.kind==='gradient'||n.kind==='bands')&&<><label>Node {i} axis<select value={n.axis} onChange={e=>update(i,{...n,axis:e.target.value as 'x'|'y'|'z'})}>{['x','y','z'].map(a=><option key={a}>{a}</option>)}</select></label><label>Node {i} scale<input type="number" min=".01" max="32" step=".1" value={n.scale} onChange={e=>{const v=e.target.valueAsNumber;if(v>=.01&&v<=32)update(i,{...n,scale:v});}}/></label></>}
 </fieldset>)}
 <div className="tools">{(['base','color','gradient','bands','mix','multiply'] as const).map(kind=><button key={kind} disabled={graph!.nodes.length>=16} onClick={()=>add(kind)}>Add {kind} node</button>)}<button disabled={graph.nodes.length<=1} onClick={()=>setNodes(graph!.nodes.slice(0,-1))}>Remove output node</button></div></fieldset>}
 <label>Shader graph JSON<textarea rows={9} maxLength={10000} value={draft} onChange={e=>setDraft(e.target.value)}/></label>
 <div className="tools"><button onClick={()=>{try{onChange(readShaderGraph(JSON.parse(draft)));setError('');}catch(e){setError(e instanceof Error?e.message:String(e));}}}>Apply shader graph</button><button onClick={()=>setDraft(JSON.stringify(defaultShaderGraph,null,2))}>Gradient example</button><button onClick={()=>setDraft(JSON.stringify({version:1,nodes:[{kind:'color',color:'#ff8844'},{kind:'color',color:'#264488'},{kind:'bands',a:0,b:1,axis:'y',scale:4}]},null,2))}>Bands example</button><button disabled={!value} onClick={()=>onChange(undefined)}>Restore PBR material</button></div>
 {value&&<p role="status">GPU graph active · {value.nodes.length} nodes</p>}{error&&<p role="alert">{error}</p>}</fieldset>;
}
