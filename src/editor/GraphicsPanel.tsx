import {defaultGraphics,type GraphicsSettings,type RenderMetrics} from '../core/graphics';
export function GraphicsPanel({value,onChange,disabled,metrics}:{value?:GraphicsSettings;onChange:(g:GraphicsSettings)=>void;disabled:boolean;metrics:RenderMetrics|null}){
 const g=value??defaultGraphics;
 return <fieldset disabled={disabled}><legend>Graphics and performance</legend><p className="hint">Controls apply to the editor and exported games. Lower settings may help on low-power devices.</p>
 <label>Render resolution · {Math.round(g.renderScale*100)}%<input type="range" min=".5" max="1" step=".05" value={g.renderScale} onChange={e=>onChange({...g,renderScale:e.target.valueAsNumber})}/></label>
 <label><input type="checkbox" checked={g.shadows} onChange={e=>onChange({...g,shadows:e.target.checked})}/> Enable directional shadows</label>
 <label>Shadow resolution<select disabled={!g.shadows} value={g.shadowSize} onChange={e=>onChange({...g,shadowSize:Number(e.target.value) as GraphicsSettings['shadowSize']})}>{[512,1024,2048].map(size=><option key={size} value={size}>{size}</option>)}</select></label>
 <button onClick={()=>onChange({...defaultGraphics})}>Reset graphics</button>
 {metrics&&<dl className="render-metrics"><dt>Frame rate</dt><dd>{metrics.fps} FPS</dd><dt>Meshes</dt><dd>{metrics.meshes}</dd><dt>Total vertices</dt><dd>{metrics.vertices}</dd><dt>Render buffer</dt><dd>{metrics.width} × {metrics.height}</dd></dl>}
 </fieldset>;
}
