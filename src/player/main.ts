import {defaultPresentation,hudLines,timerText} from '../core/presentation';
import {campaign} from '../core/scenes';
import {bindTouchControls} from '../runtime/controls';
import {parseProject} from '../core/project';
import {mountViewport} from '../engine/viewport';
const canvas=document.querySelector<HTMLCanvasElement>('#game')!;
const hud=document.querySelector<HTMLElement>('#hud')!;
const restart=document.querySelector<HTMLButtonElement>('#restart')!;
const pause=document.querySelector<HTMLButtonElement>('#pause')!;
try{
 const project=parseProject(document.querySelector('#project')?.textContent??'');
 const viewport=mountViewport(canvas,()=>{},message=>{const error=document.createElement('p');error.setAttribute('role','alert');error.textContent=message;hud.after(error);});
 const settings=project.presentation??defaultPresentation;hud.style.color=settings.hudColor;
 const timer=document.querySelector<HTMLElement>('#timer')!;timer.hidden=!settings.showTimer;timer.style.color=settings.hudColor;
 const levels=campaign(project);let index=0,paused=false;const next=document.querySelector<HTMLButtonElement>('#next-level')!;
 const pauseNotice=document.querySelector<HTMLElement>('#pause-notice')!;
 const controls=document.querySelector<HTMLElement>('#touch-controls');
 const updatePause=()=>{pause.textContent=paused?'Resume':'Pause';pauseNotice.hidden=!paused;if(controls)controls.hidden=paused;};
 pause.addEventListener('click',()=>{if(viewport.setPaused(!paused)){paused=!paused;updatePause();}});
 const play=()=>{paused=false;pause.disabled=false;updatePause();next.hidden=true;timer.textContent=timerText();viewport.start(levels[index],s=>{const final=index===levels.length-1;const lines=hudLines(settings,s);if(s.won&&final&&levels.length>1)lines.push('Game complete!');const message=(levels.length>1?levels[index].sceneName+' · ':'')+lines.join(' · ');if(hud.textContent!==message)hud.textContent=message;if(settings.showTimer)timer.textContent=timerText(s.elapsedSeconds);next.hidden=!s.won||final;pause.disabled=!!(s.won||s.lost);});};
 next.addEventListener('click',()=>{if(next.hidden||index>=levels.length-1)return;index++;play();});
 const unbind=controls?bindTouchControls(controls,(c,a)=>viewport.setControl(c,a)):()=>{};
 window.addEventListener('pointerdown',viewport.unlockAudio,{once:true});restart.addEventListener('click',play);play();
 const onPageHide=(event:PageTransitionEvent)=>{if(event.persisted)return;unbind();viewport.dispose();window.removeEventListener('pagehide',onPageHide);};
 window.addEventListener('pagehide',onPageHide);
}catch(error){hud.textContent=String(error);restart.disabled=true;pause.disabled=true;}
