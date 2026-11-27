import {defaultPresentation,hudLines,timerText} from '../core/presentation';
import {makeProgress,readProgress,projectFingerprint} from '../runtime/progress';
import {campaign} from '../core/scenes';
import {bindTouchControls} from '../runtime/controls';
import {parseProject,type Project} from '../core/project';
import {readHostedManifest,hostedProgressProject,loadHostedLevel} from '../core/hostedCampaign';
import {mountViewport} from '../engine/viewport';
const canvas=document.querySelector<HTMLCanvasElement>('#game')!;
const hud=document.querySelector<HTMLElement>('#hud')!;
const restart=document.querySelector<HTMLButtonElement>('#restart')!;
const pause=document.querySelector<HTMLButtonElement>('#pause')!;
const save=document.querySelector<HTMLButtonElement>('#save-progress')!,load=document.querySelector<HTMLInputElement>('#load-progress')!;
const progressNotice=document.querySelector<HTMLElement>('#progress-notice')!;
const graphicsNotice=document.querySelector<HTMLElement>('#graphics-notice')!;
const next=document.querySelector<HTMLButtonElement>('#next-level')!;
const controls=document.querySelector<HTMLElement>('#touch-controls');
const pauseNotice=document.querySelector<HTMLElement>('#pause-notice')!;
async function main(){
 const life=new AbortController();let dispose=()=>{};
 const onPageHide=(event:PageTransitionEvent)=>{if(event.persisted)return;life.abort();dispose();window.removeEventListener('pagehide',onPageHide);};
 window.addEventListener('pagehide',onPageHide);
 try{
 restart.disabled=pause.disabled=save.disabled=load.disabled=true;if(controls)controls.hidden=true;
 const raw=document.querySelector('#project')?.textContent??'';
 if(raw.length>10_000_000)throw Error('Game project exceeds size limit');
 const data=JSON.parse(raw),hosted=data?.format==='game-studio-hosted'?readHostedManifest(data):null;
 const project=hosted?hostedProgressProject(hosted):parseProject(raw);
 const offline=hosted?null:campaign(project);
 const levels=hosted?hosted.levels.map(l=>({sceneName:l.name})):offline!;
 const fingerprint=hosted?hosted.fingerprint:projectFingerprint(project);
 const getLevel=(i:number):Promise<Project>=>hosted?loadHostedLevel(hosted,i,location.href,life.signal):Promise.resolve(offline![i]);
 if(hosted)hud.textContent='Loading level: '+levels[0].sceneName;
 let current=await getLevel(0);if(life.signal.aborted)return;
 let index=0,paused=false,unlocked=0,generation=0,loading=false,finished=false;
 const viewport=mountViewport(canvas,()=>{},message=>{const error=document.createElement('p');error.setAttribute('role','alert');error.textContent=message;hud.after(error);},undefined,undefined,undefined,lost=>{graphicsNotice.hidden=!lost;restart.disabled=lost||loading;load.disabled=lost||loading;});
 dispose=()=>viewport.dispose();
 const settings=current.presentation??defaultPresentation;hud.style.color=settings.hudColor;
 const timer=document.querySelector<HTMLElement>('#timer')!;timer.hidden=!settings.showTimer;timer.style.color=settings.hudColor;
 const updatePause=()=>{pause.textContent=paused?'Resume':'Pause';pauseNotice.hidden=!paused;if(controls)controls.hidden=paused||loading;};
 pause.addEventListener('click',()=>{if(!loading&&viewport.setPaused(!paused)){paused=!paused;updatePause();}});
 const play=()=>{if(!graphicsNotice.hidden||loading)return;generation++;paused=false;finished=false;pause.disabled=false;restart.disabled=save.disabled=load.disabled=false;updatePause();next.hidden=true;next.disabled=false;timer.textContent=timerText();viewport.start(current,s=>{const final=index===levels.length-1;if(s.won&&!final)unlocked=Math.max(unlocked,index+1);const lines=hudLines(settings,s);if(s.won&&final&&levels.length>1)lines.push('Game complete!');const message=(levels.length>1?levels[index].sceneName+' · ':'')+lines.join(' · ');if(!loading&&hud.textContent!==message)hud.textContent=message;if(settings.showTimer)timer.textContent=timerText(s.elapsedSeconds);finished=!!(s.won||s.lost);next.hidden=!s.won||final;pause.disabled=finished||loading;});};
 async function go(target:number,fromSave=false){
  if(loading||!graphicsNotice.hidden||life.signal.aborted)return;
  const wasPaused=paused,oldHud=hud.textContent;loading=true;generation++;viewport.setPaused(true);restart.disabled=pause.disabled=next.disabled=save.disabled=load.disabled=true;if(controls)controls.hidden=true;
  if(hosted)hud.textContent='Loading level: '+levels[target].sceneName;
  try{const candidate=target===index?current:await getLevel(target);if(life.signal.aborted)return;if(!graphicsNotice.hidden)throw Error('Graphics unavailable; retry after recovery');current=candidate;index=target;if(fromSave)unlocked=target;loading=false;play();if(fromSave)progressNotice.textContent='Loaded level: '+levels[index].sceneName;}
  catch(error){if(life.signal.aborted)return;loading=false;hud.textContent=oldHud;progressNotice.textContent=String(error);if(!wasPaused)viewport.setPaused(false);paused=wasPaused;updatePause();restart.disabled=load.disabled=!graphicsNotice.hidden;save.disabled=next.disabled=false;pause.disabled=finished;}
 }
 save.addEventListener('click',()=>{try{const url=URL.createObjectURL(new Blob([JSON.stringify(makeProgress(project,unlocked,fingerprint))],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='game-studio-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);progressNotice.textContent='Saved level: '+levels[unlocked].sceneName;}catch(error){progressNotice.textContent=String(error);}});
 load.addEventListener('change',async()=>{const file=load.files?.[0];load.value='';if(!file)return;const before=generation;try{if(file.size>4096)throw Error('Save file exceeds size limit');const saved=readProgress(await file.text(),project,fingerprint);if(generation!==before||!graphicsNotice.hidden||loading)throw Error('Game changed during load; try again');await go(saved,true);}catch(error){progressNotice.textContent=String(error);}});
 document.querySelector<HTMLElement>('#progress-controls')!.hidden=levels.length<2;
 next.addEventListener('click',()=>{if(!graphicsNotice.hidden||next.hidden||index>=levels.length-1)return;void go(index+1);});
 const unbind=controls?bindTouchControls(controls,(c,a)=>viewport.setControl(c,a)):()=>{};
 dispose=()=>{unbind();viewport.dispose();};
 window.addEventListener('pointerdown',viewport.unlockAudio,{once:true});restart.addEventListener('click',play);play();
 }catch(error){if(life.signal.aborted)return;dispose();hud.textContent=String(error);restart.disabled=pause.disabled=save.disabled=load.disabled=true;}
}
void main();
