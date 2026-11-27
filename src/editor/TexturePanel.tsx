import {patterns,defaultTexture,type TextureStyle,type Pattern} from '../core/textures';
export function TexturePanel({value,onChange}:{value?:TextureStyle;onChange:(v:TextureStyle|undefined)=>void}){
 return <fieldset><legend>Procedural texture</legend><label><input type="checkbox" checked={!!value} onChange={e=>onChange(e.target.checked?{...defaultTexture,color:'#555555'}:undefined)}/> Enable texture</label>
 {value&&<><label>Pattern<select aria-label="Pattern" value={value.pattern} onChange={e=>onChange({...value,pattern:e.target.value as Pattern})}>{patterns.map(p=><option key={p}>{p}</option>)}</select></label><label>Pattern tint<input type="color" value={value.color} onChange={e=>onChange({...value,color:e.target.value})}/></label>
 {(['repeatU','repeatV'] as const).map(key=><label key={key}>{key==='repeatU'?'Horizontal repeat':'Vertical repeat'}<input type="number" min=".25" max="32" step=".25" value={value[key]} onChange={e=>{const n=e.target.valueAsNumber;if(Number.isFinite(n)&&n>=.25&&n<=32)onChange({...value,[key]:n});}}/></label>)}
 <p className="hint">Local generated texture multiplied by the base color. No external images are loaded.</p></>}</fieldset>;
}
