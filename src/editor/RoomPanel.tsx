import {useEffect,useRef,useState} from 'react';
import type {Project,Vec3} from '../core/project';
import {projectFingerprint} from '../runtime/progress';
import {roomRequest,readMembership,readPeers,type Membership,type Peer} from '../runtime/rooms';
export function RoomPanel({project,getPosition,onPeers}:{project:Project;getPosition:()=>Vec3|null;onPeers:(peers:Peer[])=>void}){
 const [name,setName]=useState('Player'),[code,setCode]=useState(''),[member,setMember]=useState<Membership|null>(null),[peers,setPeers]=useState<Peer[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const alive=useRef(true),joinController=useRef<AbortController|null>(null),callbacks=useRef({getPosition,onPeers});callbacks.current={getPosition,onPeers};
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;joinController.current?.abort();};},[]);
 useEffect(()=>{
 if(!member)return;let active=true,sequence=0,timeout:ReturnType<typeof setTimeout>|undefined;const c=new AbortController();
 const leave=()=>{void fetch('/api/rooms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'leave',...member}),keepalive:true}).catch(()=>{});};
 const tick=async()=>{if(!active)return;try{const position=callbacks.current.getPosition();if(!position)throw Error('Play session ended');const response=await roomRequest({action:'update',...member,sequence:sequence++,position},c.signal);if(!active)return;const next=readPeers(response.peers);setPeers(next);callbacks.current.onPeers(next);timeout=setTimeout(tick,250);}catch(err){if(active){setError(String(err));setMember(null);}}};
 timeout=setTimeout(tick,250);window.addEventListener('pagehide',leave);
 return()=>{active=false;c.abort();if(timeout!==undefined)clearTimeout(timeout);window.removeEventListener('pagehide',leave);leave();callbacks.current.onPeers([]);};
 },[member]);
 async function connect(action:'create'|'join'){
 if(joinController.current)return;const position=getPosition();if(!position){setError('Start play first');return;}
 const c=new AbortController();joinController.current=c;setBusy(true);setError('');
 try{const data=await roomRequest({action,name:name.trim(),code:code.trim().toLowerCase(),fingerprint:projectFingerprint(project),position},c.signal);if(!alive.current)return;const next=readMembership(data),others=readPeers(data.peers);setMember(next);setPeers(others);onPeers(others);}catch(err){if(alive.current&&!c.signal.aborted)setError(String(err));}finally{joinController.current=null;if(alive.current)setBusy(false);}
 }
 return <fieldset><legend>Local multiplayer preview</legend><p className="hint">Optional same-origin development room. Sends only your display name, level fingerprint and player position to the local server. Other players appear as ghost markers; gameplay, score and collisions are not shared. Not available in standalone exports.</p>
 {member?<><p>Room code: <strong>{member.code}</strong></p><p>{peers.length} other players</p><ul>{peers.map(p=><li key={p.id}>{p.name}</li>)}</ul><button onClick={()=>{setMember(null);setPeers([]);}}>Leave room</button></>:<><label>Display name<input maxLength={32} value={name} onChange={e=>setName(e.target.value)}/></label><button disabled={busy||!name.trim()} onClick={()=>void connect('create')}>Create local room</button><label>Room code<input maxLength={8} value={code} onChange={e=>setCode(e.target.value)}/></label><button disabled={busy||!name.trim()||!/^[a-f0-9]{8}$/i.test(code.trim())} onClick={()=>void connect('join')}>Join local room</button></>}
 {error&&<p role="alert">{error}</p>}</fieldset>;
}
