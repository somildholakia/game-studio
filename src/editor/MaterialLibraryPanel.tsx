import {useState} from 'react';
import type {Entity} from '../core/project';
import {applyMaterial,builtInMaterials,captureMaterial,MAX_MATERIAL_PRESETS,readMaterialLibrary,type MaterialPreset} from '../core/materialLibrary';
export function MaterialLibraryPanel({entity,presets,onApply,onChange,onError}:{entity:Entity;presets:MaterialPreset[];onApply:(e:Entity)=>void;onChange:(p:MaterialPreset[])=>void;onError:(message:string)=>void}){
 const [name,setName]=useState('');
 const safe=(f:()=>void)=>{try{f();}catch(e){onError(e instanceof Error?e.message:String(e));}};
 return <fieldset disabled={entity.kind==='model'}><legend>Material library</legend>
 <p className="hint">Apply a built-in or saved material to this object. Copies are independent; edits do not change the library.</p>
 <div className="tools">{builtInMaterials.map(p=><button key={p.name} onClick={()=>safe(()=>onApply(applyMaterial(entity,p)))}>Apply {p.name}</button>)}</div>
 <label>Preset name<input maxLength={80} value={name} onChange={e=>setName(e.target.value)}/></label>
 <button disabled={!name.trim()||presets.length>=MAX_MATERIAL_PRESETS||!!entity.material?.imageTexture||!!entity.shader} onClick={()=>safe(()=>{onChange(readMaterialLibrary([...presets,captureMaterial(name,entity)]));setName('');})}>Save current material</button>
 {entity.shader&&<p className="hint">Restore PBR before saving a preset. Applying a saved material replaces the graph.</p>}{entity.material?.imageTexture&&<p className="hint">Image textures are not supported in saved material presets.</p>}
 <p>{presets.length} / {MAX_MATERIAL_PRESETS} saved materials</p>
 {presets.map(p=><div key={p.name} className="tools"><button onClick={()=>safe(()=>onApply(applyMaterial(entity,p)))}>Apply saved {p.name}</button><button onClick={()=>onChange(presets.filter(x=>x.name!==p.name))}>Delete saved {p.name}</button></div>)}
 </fieldset>;
}
