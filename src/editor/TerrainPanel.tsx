import {defaultTerrain,type TerrainSettings} from '../core/terrain';
export function TerrainPanel({value,onChange}:{value?:TerrainSettings;onChange:(t:TerrainSettings)=>void}){
 const t=value??defaultTerrain;const fields:[keyof TerrainSettings,string,number,number,number][]=[['resolution','Grid resolution',8,64,1],['seed','Seed',-1000000,1000000,1],['amplitude','Height amplitude',0,5,.05],['frequency','Hill frequency',.25,8,.25]];
 return <fieldset><legend>Terrain Studio · Procedural heightfield</legend><p className="hint">Generate deterministic hills. Player collision follows the triangle surface. Keep terrain axis-aligned and scale positive.</p>
 {fields.map(([key,label,min,max,step])=><label key={key}>{label}<input type="number" min={min} max={max} step={step} value={t[key]} onChange={e=>{const n=e.target.valueAsNumber;if(Number.isFinite(n)&&n>=min&&n<=max&&(!['seed','resolution'].includes(key)||Number.isInteger(n)))onChange({...t,[key]:n});}}/></label>)}
 <button onClick={()=>onChange({...t,seed:Math.floor(Math.random()*1000000)})}>Randomize terrain</button><button onClick={()=>onChange({...defaultTerrain})}>Reset terrain</button></fieldset>;
}
