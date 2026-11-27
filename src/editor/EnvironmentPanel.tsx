import {defaultEnvironment,environmentPresets,type Environment} from '../core/environment';
export function EnvironmentPanel({value,onChange,disabled}:{value?:Environment;onChange:(e:Environment)=>void;disabled:boolean}){
 const env=value??defaultEnvironment;
 const colors:[keyof Pick<Environment,'sky'|'ambient'|'sunColor'|'fogColor'>,string][]=[['sky','Sky color'],['ambient','Ambient color'],['sunColor','Sun color'],['fogColor','Fog color']];
 const values:[keyof Pick<Environment,'ambientIntensity'|'sunIntensity'|'sunAzimuth'|'sunElevation'|'fogDensity'>,string,number,number,number][]=[['ambientIntensity','Ambient intensity',0,3,.05],['sunIntensity','Sun intensity',0,8,.05],['sunAzimuth','Sun direction',-360,360,1],['sunElevation','Sun elevation',-90,90,1],['fogDensity','Fog density',0,.5,.005]];
 return <fieldset disabled={disabled}><legend>Environment Studio</legend><p className="hint">Set lighting and atmospheric colors for the scene and exported game.</p><div className="tools">{Object.entries(environmentPresets).map(([name,preset])=><button key={name} onClick={()=>onChange({...preset})}>{name}</button>)}</div>
 {colors.map(([key,label])=><label key={key}>{label}<input type="color" value={env[key]} onChange={e=>onChange({...env,[key]:e.target.value})}/></label>)}
 <label><input type="checkbox" checked={env.fogEnabled} onChange={e=>onChange({...env,fogEnabled:e.target.checked})}/> Enable fog</label>
 {values.map(([key,label,min,max,step])=><label key={key}>{label} · {env[key].toFixed(step<.01?3:step<1?2:0)}<input type="range" min={min} max={max} step={step} value={env[key]} onChange={e=>onChange({...env,[key]:e.target.valueAsNumber})}/></label>)}
 <button onClick={()=>onChange({...defaultEnvironment})}>Reset environment</button></fieldset>;
}
