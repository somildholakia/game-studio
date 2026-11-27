import {useEffect,useState} from 'react';
import {defaultShaderGraph,readShaderGraph,type ShaderGraph} from '../core/shaderGraph';
export function ShaderGraphPanel({value,onChange}:{value?:ShaderGraph;onChange:(v:ShaderGraph|undefined)=>void}){
 const [draft,setDraft]=useState(JSON.stringify(value??defaultShaderGraph,null,2)),[error,setError]=useState('');
 useEffect(()=>{setDraft(JSON.stringify(value??defaultShaderGraph,null,2));setError('');},[value]);
 return <fieldset><legend>Shader Studio · GPU surface graph</legend><p className="hint">An unlit surface shader replaces PBR while enabled. Edit a bounded color graph. The final node is the output; inputs refer only to earlier node indices. Supports base, color, gradient, bands, mix and multiply. No arbitrary shader code.</p>
 <label>Shader graph JSON<textarea rows={9} maxLength={10000} value={draft} onChange={e=>setDraft(e.target.value)}/></label>
 <div className="tools"><button onClick={()=>{try{onChange(readShaderGraph(JSON.parse(draft)));setError('');}catch(e){setError(e instanceof Error?e.message:String(e));}}}>Apply shader graph</button><button onClick={()=>setDraft(JSON.stringify(defaultShaderGraph,null,2))}>Gradient example</button><button onClick={()=>setDraft(JSON.stringify({version:1,nodes:[{kind:'color',color:'#ff8844'},{kind:'color',color:'#264488'},{kind:'bands',a:0,b:1,axis:'y',scale:4}]},null,2))}>Bands example</button><button disabled={!value} onClick={()=>onChange(undefined)}>Restore PBR material</button></div>
 {value&&<p role="status">GPU graph active · {value.nodes.length} nodes</p>}{error&&<p role="alert">{error}</p>}</fieldset>;
}
