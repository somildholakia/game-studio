import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {entity,initialProject,parseProject,replaceEntity,type Project,type Entity} from './core/project';
import {start,commit,undo,redo} from './core/history';
import {mountViewport} from './engine/viewport';
import './style.css';
function App(){
 const [h,setH]=useState(()=>start(initialProject()));const p=h.present;
 const [selected,setSelected]=useState<string>('');const [error,setError]=useState('');
 const canvas=useRef<HTMLCanvasElement>(null);const view=useRef<ReturnType<typeof mountViewport>|null>(null);
 useEffect(()=>{try{view.current=mountViewport(canvas.current!,setSelected);}catch(e){setError(String(e));}return()=>{view.current?.dispose();view.current=null;};},[]);
 useEffect(()=>{view.current?.sync(p);},[p]);
 const change=(next:Project)=>setH(old=>commit(old,next));const active=p.entities.find(e=>e.id===selected);
 const add=(kind:Entity['kind'])=>{const e=entity(kind);change({...p,entities:[...p.entities,e]});setSelected(e.id);};
 const edit=(e:Entity)=>change(replaceEntity(p,e));
 const save=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(p,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='world.game-studio.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 return <main><header><strong>GAME STUDIO</strong><span>{p.name}</span><button onClick={()=>setH(undo)}>Undo</button><button onClick={()=>setH(redo)}>Redo</button><button onClick={save}>Export project</button><label className="button">Import<input type="file" accept=".json" hidden onChange={async e=>{try{const f=e.target.files?.[0];if(f){if(f.size>10000000)throw Error('Project exceeds 10 MB');change(parseProject(await f.text()));setSelected('');setError('');}}catch(err){setError(String(err));}e.target.value='';}}/></label></header>
 <section className="workspace"><aside><h2>Scene</h2><div className="tools">{(['box','sphere','ground'] as const).map(k=><button key={k} onClick={()=>add(k)}>+ {k}</button>)}</div>{p.entities.map(e=><button className={'entity '+(selected===e.id?'selected':'')} key={e.id} onClick={()=>setSelected(e.id)}>{e.name}</button>)}</aside><article><div className="viewport-label">WORLD · Perspective</div><canvas ref={canvas}/>{error&&<div role="alert">{error}</div>}</article><aside><h2>Inspector</h2>{active?<><label>Name<input value={active.name} onChange={e=>edit({...active,name:e.target.value})}/></label>{(['position','rotation','scale'] as const).map(key=><fieldset key={key}><legend>{key}</legend>{active[key].map((v,i)=><label key={i}>{['X','Y','Z'][i]}<input type="number" step="0.1" value={v} onChange={e=>{const n=e.target.valueAsNumber;if(Number.isFinite(n)){const vec=[...active[key]] as Entity['position'];vec[i]=n;edit({...active,[key]:vec});}}}/></label>)}</fieldset>)}<label>Color<input type="color" value={active.color} onChange={e=>edit({...active,color:e.target.value})}/></label><button onClick={()=>{change({...p,entities:p.entities.filter(e=>e.id!==selected)});setSelected('');}}>Delete entity</button></>:<p>Select an object to edit its properties.</p>}</aside></section><footer>Local viewport · Experimental foundation · Export to save your project</footer></main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
