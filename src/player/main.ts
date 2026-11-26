import {parseProject} from '../core/project';
import {mountViewport} from '../engine/viewport';
const canvas=document.querySelector<HTMLCanvasElement>('#game')!;
const hud=document.querySelector<HTMLElement>('#hud')!;
const restart=document.querySelector<HTMLButtonElement>('#restart')!;
try{
 const project=parseProject(document.querySelector('#project')?.textContent??'');
 const viewport=mountViewport(canvas,()=>{},message=>{const error=document.createElement('p');error.setAttribute('role','alert');error.textContent=message;hud.after(error);});
 const play=()=>viewport.start(project,s=>{hud.textContent=(s.won?'Level complete!':`Collectibles ${s.collected} / ${s.total}`)+` · Score ${s.score}`+(s.message?' · '+s.message:'');});
 restart.addEventListener('click',play);play();
 window.addEventListener('pagehide',()=>viewport.dispose(),{once:true});
}catch(error){hud.textContent=String(error);restart.disabled=true;}
