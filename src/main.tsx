import {useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {entity,initialProject,parseProject,replaceEntity,duplicateEntity,roles,type Project,type Entity,type Role} from './core/project';
import {start,commit,undo,redo} from './core/history';
import {restore,persist} from './core/persistence';
import {treasureTemplate} from './core/templates';
import {mountViewport,type PlayStatus} from './engine/viewport';
import {downloadGame} from './core/exportGame';
import './style.css';
function App(){
 const [boot]=useState(()=>{try{return {project:restore()??initialProject(),error:''};}catch{return {project:initialProject(),error:'Saved project could not be restored. Import a backup if available.'};}});
 const [h,setH]=useState(()=>start(boot.project));const p=h.present;
 const [selected,setSelected]=useState('');const [error,setError]=useState(boot.error);
 const [playing,setPlaying]=useState(false);const [status,setStatus]=useState<PlayStatus>({collected:0,total:0,won:false});const [storage,setStorage]=useState('Local save pending');
 const canvas=useRef<HTMLCanvasElement>(null);const view=useRef<ReturnType<typeof mountViewport>|null>(null);
 useEffect(()=>{try{view.current=mountViewport(canvas.current!,setSelected);}catch(e){setError(String(e));}return()=>{view.current?.dispose();view.current=null;};},[]);
 useEffect(()=>{if(!playing)view.current?.sync(p);},[p,playing]);
 useEffect(()=>{try{persist(p);setStorage('Saved on this device');}catch{setStorage('Local save failed — export a backup');}},[p]);
 const change=(next:Project)=>{if(!playing)setH(old=>commit(old,next));};const active=p.entities.find(e=>e.id===selected);
 const add=(kind:Entity['kind'])=>{const e=entity(kind);change({...p,entities:[...p.entities,e]});setSelected(e.id);};
 const edit=(e:Entity)=>change(replaceEntity(p,e));
 const save=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(p,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='world.game-studio.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 const play=()=>{try{if(!view.current)throw Error('3D renderer unavailable');view.current.start(p,setStatus);setPlaying(true);setError('');}catch(e){setError(String(e));}};
 const stop=()=>{view.current?.stop(p);setPlaying(false);};
 return <main><header><strong>GAME STUDIO</strong><span>{p.name}</span>
 {playing?<button onClick={stop}>■ Stop</button>:<button className="play" onClick={play}>▶ Play</button>}
 <button disabled={playing||!h.past.length} onClick={()=>setH(undo)}>Undo</button><button disabled={playing||!h.future.length} onClick={()=>setH(redo)}>Redo</button><button onClick={save}>Export project</button><button disabled={playing} onClick={()=>{try{downloadGame(p);setError('');}catch(e){setError(String(e));}}}>Export playable HTML</button><label className="button">Import<input type="file" disabled={playing} accept=".json" hidden onChange={async e=>{const input=e.currentTarget;try{const f=input.files?.[0];if(f){if(f.size>10000000)throw Error('Project exceeds 10 MB');change(parseProject(await f.text()));setSelected('');setError('');}}catch(err){setError(String(err));}input.value='';}}/></label></header>
 <section className="workspace"><aside><h2>Scene</h2><button disabled={playing} onClick={()=>{change(treasureTemplate());setSelected('');}}>Load Treasure Run</button><p className="hint">A ready-to-play example. Undo restores your previous scene.</p><fieldset disabled={playing}><legend>Add object</legend><div className="tools">{(['box','sphere','ground'] as const).map(k=><button key={k} onClick={()=>add(k)}>+ {k}</button>)}</div></fieldset>{p.entities.map(e=><button disabled={playing} className={'entity '+(selected===e.id?'selected':'')} key={e.id} onClick={()=>setSelected(e.id)}>{e.name} <small>{e.role!=='decoration'?e.role:''}</small></button>)}</aside>
 <article><div className="viewport-label">{playing?'PLAY · WASD / Arrow keys':'WORLD · Perspective'}</div><canvas ref={canvas}/>{playing&&<div className="game-hud" role="status">{status.won?'Level complete!':`Collectibles ${status.collected} / ${status.total}`} {status.won&&<button onClick={play}>Restart</button>}</div>}{error&&<div className="error" role="alert">{error}</div>}</article>
 <aside><h2>Inspector</h2>{active?<fieldset disabled={playing}><legend>{active.kind}</legend><label>Name<input maxLength={200} value={active.name} onChange={e=>edit({...active,name:e.target.value})}/></label><label>Gameplay role<select disabled={active.kind==='ground'} value={active.role??'decoration'} onChange={e=>edit({...active,role:e.target.value as Role})}>{roles.map(role=><option key={role}>{role}</option>)}</select></label><p className="hint">Player moves. Solid blocks movement. Collectibles disappear. Goal wins after all items are collected.</p>{(['position','rotation','scale'] as const).map(key=><fieldset key={key}><legend>{key}</legend>{active[key].map((v,i)=><label key={i}>{['X','Y','Z'][i]}<input type="number" step="0.1" value={v} onChange={e=>{const n=e.target.valueAsNumber;if(Number.isFinite(n)&&Math.abs(n)<=100000){const vec=[...active[key]] as Entity['position'];vec[i]=n;edit({...active,[key]:vec});}}}/></label>)}</fieldset>)}<label>Color<input type="color" value={active.color} onChange={e=>edit({...active,color:e.target.value})}/></label><button onClick={()=>{const copy=duplicateEntity(active);change({...p,entities:[...p.entities,copy]});setSelected(copy.id);}}>Duplicate</button><button onClick={()=>{change({...p,entities:p.entities.filter(e=>e.id!==selected)});setSelected('');}}>Delete entity</button></fieldset>:<p>Select an object to edit its properties.</p>}</aside></section><footer>{storage} · Experimental foundation · Local browser runtime</footer></main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
