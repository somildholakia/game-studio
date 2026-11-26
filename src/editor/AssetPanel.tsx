import {useState} from 'react';
import {importGlb,type ModelAsset} from '../core/assets';
import {instantiatePrefab,removeModel,savePrefab,countInstances,updatePrefab,removePrefab,detachPrefab} from '../core/prefabs';
import {entity,type Entity,type Project} from '../core/project';
type Props={project:Project;selected?:Entity;disabled:boolean;onChange:(project:Project)=>void;onSelect:(id:string)=>void;onImport:(asset:ModelAsset)=>void;onError:(message:string)=>void};
export function AssetPanel({project,selected,disabled,onChange,onSelect,onImport,onError}:Props){
 const [busy,setBusy]=useState(false);
 function insert(e:Entity){if(project.entities.length>=10000){onError('Scene entity limit reached');return;}onChange({...project,entities:[...project.entities,e]});onSelect(e.id);}
 return <section className="asset-panel" aria-label="Asset library"><h2>Asset library</h2>
 <fieldset disabled={disabled||busy}><legend>3D models</legend><label className="button">{busy?'Importing…':'Import GLB'}<input hidden type="file" accept=".glb" onChange={async e=>{const f=e.currentTarget.files?.[0];e.currentTarget.value='';if(!f)return;setBusy(true);try{onImport(await importGlb(f));}catch(err){onError(String(err));}finally{setBusy(false);}}}/></label>
 <p className="hint">Embedded, uncompressed GLB · 2 MiB per file.</p>
 {(project.assets??[]).map(a=><div className="asset-item" key={a.id}><span>{a.name}</span><button onClick={()=>insert({...entity('model'),name:a.name,assetId:a.id})}>Place</button><button aria-label={'Remove '+a.name} onClick={()=>{try{onChange(removeModel(project,a.id));}catch(err){onError(String(err));}}}>Remove</button></div>)}</fieldset>
 <fieldset disabled={disabled}><legend>Reusable prefabs</legend><button disabled={!selected||(project.prefabs?.length??0)>=1000} onClick={()=>{if(selected)onChange(savePrefab(project,selected));}}>Save selected as prefab</button>
 <p className="hint">Place a snapshot or linked copy. Update a prefab explicitly to propagate appearance across levels; local transforms and roles stay unchanged.</p>
 {(project.prefabs??[]).map(f=><div className="asset-item" key={f.id}><span>{f.name} · {countInstances(project,f.id)} linked</span><button onClick={()=>insert(instantiatePrefab(f))}>Place</button><button onClick={()=>insert(instantiatePrefab(f,true))}>Place linked</button><button disabled={!selected||selected.kind!==f.source.kind} onClick={()=>{if(selected&&confirm('Update this prefab and all linked appearances?'))try{onChange(updatePrefab(project,f.id,selected));}catch(e){onError(String(e));}}}>Update from selected</button><button aria-label={'Remove prefab '+f.name} onClick={()=>{if(confirm('Remove prefab? Existing linked objects become independent.'))onChange(removePrefab(project,f.id));}}>Remove</button></div>)}{selected?.prefabId&&<button onClick={()=>onChange({...project,entities:project.entities.map(e=>e.id===selected.id?detachPrefab(e):e)})}>Detach selected instance</button>}</fieldset></section>;
}
