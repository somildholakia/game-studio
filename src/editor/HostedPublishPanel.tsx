import {useRef,useState} from 'react';
import type {Project} from '../core/project';
import {buildHostedGameZip} from '../core/exportGame';
export function HostedPublishPanel({project,disabled}:{project:Project;disabled:boolean}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');const running=useRef(false);
 async function download(){if(running.current)return;running.current=true;setBusy(true);setError('');try{
 const blob=await buildHostedGameZip(project),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='game-studio-hosted.zip';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }catch(e){setError(String(e));}finally{running.current=false;setBusy(false);}}
 return <fieldset disabled={disabled||busy}><legend>Hosted game publishing</legend><p className="hint">Download a static website ZIP. Extract the whole folder onto an HTTPS static host; the player fetches and validates one compressed level at a time. Your project is not uploaded automatically. Use the normal playable HTML export for offline play.</p><button onClick={()=>void download()}>{busy?'Preparing hosted package…':'Export hosted website ZIP'}</button>{error&&<p role="alert">{error}</p>}</fieldset>;
}
