import {defaultPresentation,type Presentation} from '../core/presentation';
export function PresentationPanel({value,onChange,disabled}:{value?:Presentation;onChange:(p:Presentation)=>void;disabled:boolean}){
 const p=value??defaultPresentation;
 return <fieldset disabled={disabled}><legend>Game UI and camera</legend><p className="hint">Shared across all levels. Movement uses world axes in both camera modes.</p>
 <label>Camera mode<select value={p.camera} onChange={e=>onChange({...p,camera:e.target.value as Presentation['camera']})}><option value="follow">Follow</option><option value="overhead">Overhead</option></select></label>
 <label>Camera distance<input type="range" min="4" max="40" step=".5" value={p.distance} onChange={e=>onChange({...p,distance:e.target.valueAsNumber})}/>{p.distance}</label>
 <label>HUD title<input maxLength={100} value={p.hudTitle} onChange={e=>onChange({...p,hudTitle:e.target.value})}/></label>
 <label>HUD text color<input type="color" value={p.hudColor} onChange={e=>onChange({...p,hudColor:e.target.value})}/></label>
 {(['showScore','showCollectibles','showMessages','showCounters'] as const).map(k=><label key={k}><input type="checkbox" checked={p[k]??false} onChange={e=>onChange({...p,[k]:e.target.checked})}/>{({showScore:'Show score',showCollectibles:'Show collectibles',showMessages:'Show messages',showCounters:'Show named counters'})[k]}</label>)}
 <button onClick={()=>onChange({...defaultPresentation})}>Reset game UI</button></fieldset>;
}
