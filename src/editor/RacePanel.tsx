import {useEffect,useRef,useState} from 'react';
import type {Project} from '../core/project';
import type {Input} from '../runtime/simulation';
import type {RaceSnapshot} from '../runtime/raceMatch';
import type {Membership} from '../runtime/rooms';
import {raceRequest,readRaceSession,readRaceSnapshot} from '../runtime/raceClient';
type Connection=ReturnType<typeof readRaceSession>;
type Props={project:Project;getInput:()=>Input;onConnect:(project:Project,snapshot:RaceSnapshot,id:string)=>void;onSnapshot:(snapshot:RaceSnapshot,id:string)=>void;onDisconnect:()=>void;focus:()=>void};
const leave=(member:Membership)=>{void fetch('/api/race',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'leave',...member}),keepalive:true}).catch(()=>{});};
export function RacePanel(props:Props){
 const [name,setName]=useState('Player'),[code,setCode]=useState(''),[connection,setConnection]=useState<Connection|null>(null),[snapshot,setSnapshot]=useState<RaceSnapshot|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const callbacks=useRef(props);callbacks.current=props;
 const alive=useRef(true),request=useRef<AbortController|null>(null),startPending=useRef(false),startWanted=useRef(false);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;request.current?.abort();};},[]);
 useEffect(()=>{
  if(!connection)return;const {member,project}=connection,c=new AbortController();let active=true,sequence=0,timer:ReturnType<typeof setTimeout>|undefined,current=connection.snapshot;
  const unload=()=>leave(member);
  async function poll(){
   if(!active)return;
   try{
    let data;
    if(startWanted.current){startWanted.current=false;startPending.current=true;try{data=await raceRequest({action:'start',...member},c.signal);}finally{startPending.current=false;}}
    else if(current.phase==='running'){const input=callbacks.current.getInput();data=await raceRequest({action:'input',...member,sequence:sequence++,input:{x:input.x,z:input.z,jump:!!input.jump}},c.signal);}
    else data=await raceRequest({action:'snapshot',...member},c.signal);
    if(!active)return;
    current=readRaceSnapshot(data.snapshot,project,member.id);setSnapshot(current);callbacks.current.onSnapshot(current,member.id);timer=setTimeout(poll,100);
   }catch(err){if(active){setError(String(err));setConnection(null);setSnapshot(null);}}
  }
  timer=setTimeout(poll,100);window.addEventListener('pagehide',unload);
  return()=>{active=false;c.abort();clearTimeout(timer);window.removeEventListener('pagehide',unload);startWanted.current=false;startPending.current=false;leave(member);callbacks.current.onDisconnect();};
 },[connection]);
 async function connect(action:'create'|'join'){
  if(request.current)return;const controller=new AbortController();request.current=controller;setBusy(true);setError('');
  let pending:Membership|null=null;
  try{
   const data=await raceRequest(action==='create'?{action,name:name.trim(),mode:'shared',project:JSON.stringify(props.project)}:{action,name:name.trim(),code:code.trim().toLowerCase()},controller.signal);
   const next=readRaceSession(data);pending=next.member;if(!alive.current)return;
   callbacks.current.onConnect(next.project,next.snapshot,next.member.id);setSnapshot(next.snapshot);setConnection(next);pending=null;
  }catch(err){if(alive.current&&!controller.signal.aborted)setError(String(err));}
  finally{if(pending)leave(pending);request.current=null;if(alive.current)setBusy(false);}
 }
 const self=connection?.member.id,host=snapshot?.hostId===self;
 return <fieldset><legend>Shared local race</legend><p className="hint">Play a static course together. The host starts the match; gems disappear for everyone and the first player to reach the exit after all gems are collected wins. Players do not collide. Join loads the host's level temporarily without changing your authored project.</p>
 {connection&&snapshot?<><p>Race code: <strong>{connection.member.code}</strong></p><p role="status">{snapshot.phase==='lobby'?'Waiting for start':snapshot.phase==='running'?'Race running':'Race finished: '+(snapshot.winnerId===self?'You won':snapshot.racers.find(r=>r.id===snapshot.winnerId)?.name??'A departed racer') }</p><ul>{snapshot.racers.map(r=><li key={r.id}>{r.name}{r.id===self?' (you)':''} · gems claimed: {r.claimed}</li>)}</ul>
 {snapshot.phase==='lobby'&&host&&<button disabled={snapshot.racers.length<2} onClick={()=>{if(!startPending.current){startWanted.current=true;callbacks.current.focus();}}}>Start shared race</button>}
 <button onClick={()=>callbacks.current.focus()}>Focus race viewport</button><button onClick={()=>{setConnection(null);setSnapshot(null);}}>Leave shared race</button></>:<><label>Race display name<input maxLength={32} value={name} onChange={e=>setName(e.target.value)}/></label><button disabled={busy||!name.trim()} onClick={()=>void connect('create')}>Create shared race</button><label>Shared race code<input maxLength={8} value={code} onChange={e=>setCode(e.target.value)}/></label><button disabled={busy||!name.trim()||!/^[a-f0-9]{8}$/i.test(code.trim())} onClick={()=>void connect('join')}>Join shared race</button></>}
 {error&&<p role="alert">{error}</p>}</fieldset>;
}
