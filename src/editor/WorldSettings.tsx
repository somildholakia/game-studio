import {TexturePanel} from './TexturePanel';
import {defaults,type PhysicsSettings} from '../runtime/physicsSettings';
import type {Entity,MaterialStyle} from '../core/project';
const fields:[keyof PhysicsSettings,string,number,number][]=[['gravity','Gravity',1,100],['moveSpeed','Movement speed',.1,30],['jumpSpeed','Jump speed',.1,30],['fallLimit','Respawn height',-10000,-1]];
export function WorldSettings({value,onChange,disabled}:{value?:PhysicsSettings;onChange:(p:PhysicsSettings)=>void;disabled:boolean}){
 const physics=value??defaults;
 return <fieldset disabled={disabled}><legend>World physics</legend>{fields.map(([key,label,min,max])=><label key={key}>{label}<input type="number" step=".1" min={min} max={max} value={physics[key]} onChange={e=>{const n=e.target.valueAsNumber;if(Number.isFinite(n)&&n>=min&&n<=max)onChange({...physics,[key]:n});}}/></label>)}<button onClick={()=>onChange({...defaults})}>Reset physics</button></fieldset>;
}
export function MaterialSettings({entity,onChange}:{entity:Entity;onChange:(m:MaterialStyle)=>void}){
 const material=entity.material??{metallic:0,roughness:.65,emissive:'#000000'};
 return <fieldset disabled={entity.kind==='model'}><legend>Material Studio</legend>{(['metallic','roughness'] as const).map(key=><label key={key}>{key} · {material[key].toFixed(2)}<input type="range" min="0" max="1" step=".01" value={material[key]} onChange={e=>onChange({...material,[key]:e.target.valueAsNumber})}/></label>)}<label>Emission<input type="color" value={material.emissive} onChange={e=>onChange({...material,emissive:e.target.value})}/></label><TexturePanel value={material.texture} onChange={texture=>onChange({...material,texture})}/><button onClick={()=>onChange({metallic:0,roughness:.65,emissive:'#000000'})}>Reset material</button></fieldset>;
}
