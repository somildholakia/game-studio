import {useState} from 'react';
import {readMesh,deleteVertex,subdivideFace,MAX_VERTICES,MAX_TRIANGLES,type MeshData} from '../core/mesh';
import type {Vec3} from '../core/project';
export function MeshPanel({mesh,onChange,onError}:{mesh:MeshData;onChange:(m:MeshData)=>void;onError:(message:string)=>void}){
 const [selected,setSelected]=useState(0);const [face,setFace]=useState(0);const [indices,setIndices]=useState<[number,number,number]>([0,1,2]);
 const index=Math.min(selected,mesh.vertices.length-1);const fi=Math.min(face,mesh.triangles.length-1);const v=mesh.vertices[index];
 function apply(operation:()=>MeshData){try{onChange(readMesh(operation()));}catch(e){onError(String(e));}}
 return <fieldset><legend>Model Studio · Mesh topology</legend><p className="hint">{mesh.vertices.length} vertices · {mesh.triangles.length} triangles. Numeric local-space editing.</p>
 <label>Vertex<select value={index} onChange={e=>setSelected(Number(e.target.value))}>{mesh.vertices.map((_,i)=><option key={i} value={i}>Vertex {i}</option>)}</select></label>
 {v.map((n,i)=><label key={i}>{['X','Y','Z'][i]}<input type="number" min="-1000" max="1000" step=".05" value={n} onChange={e=>{const value=e.target.valueAsNumber;if(!Number.isFinite(value)||Math.abs(value)>1000)return;const vertices=[...mesh.vertices];const next=[...v] as Vec3;next[i]=value;vertices[index]=next;apply(()=>({...mesh,vertices}));}}/></label>)}
 <button disabled={mesh.vertices.length>=MAX_VERTICES} onClick={()=>{apply(()=>({...mesh,vertices:[...mesh.vertices,[...v] as Vec3]}));setSelected(mesh.vertices.length);}}>Duplicate vertex</button>
 <button onClick={()=>apply(()=>deleteVertex(mesh,index))}>Delete vertex</button>
 <label>Triangle<select value={fi} onChange={e=>setFace(Number(e.target.value))}>{mesh.triangles.map((t,i)=><option key={i} value={i}>{i}: {t.join(', ')}</option>)}</select></label>
 <button disabled={mesh.vertices.length>=MAX_VERTICES||mesh.triangles.length+2>MAX_TRIANGLES} onClick={()=>apply(()=>subdivideFace(mesh,fi))}>Subdivide triangle</button>
 <button disabled={mesh.triangles.length<=1} onClick={()=>apply(()=>({...mesh,triangles:mesh.triangles.filter((_,i)=>i!==fi)}))}>Delete triangle</button>
 <p className="hint">Add a face using three vertex indices.</p>{indices.map((n,i)=><label key={i}>Index {i+1}<input type="number" min="0" max={mesh.vertices.length-1} value={n} onChange={e=>{const next=[...indices] as [number,number,number];const value=e.target.valueAsNumber;if(Number.isInteger(value)){next[i]=value;setIndices(next);}}}/></label>)}
 <button disabled={mesh.triangles.length>=MAX_TRIANGLES} onClick={()=>apply(()=>({...mesh,triangles:[...mesh.triangles,indices]}))}>Add triangle</button></fieldset>;
}
