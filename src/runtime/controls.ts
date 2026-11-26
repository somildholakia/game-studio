export type Control='up'|'down'|'left'|'right'|'jump';
export type PadInput={x:number;z:number;jump:boolean};
/** Read the first connected standard gamepad. Ignore noisy stick motion near rest. */
export function gamepadInput(pads:readonly (Pick<Gamepad,'connected'|'mapping'|'axes'|'buttons'>|null)[]):PadInput{
 const pad=pads.find(p=>p?.connected&&p.mapping==='standard');
 if(!pad)return {x:0,z:0,jump:false};
 const pressed=(index:number)=>pad.buttons[index]?.pressed===true;
 const axis=(index:number)=>{const value=pad.axes[index];return Number.isFinite(value)&&Math.abs(value)>.2?Math.max(-1,Math.min(1,value)):0;};
 const x=Number(pressed(15))-Number(pressed(14));
 const z=Number(pressed(12))-Number(pressed(13));
 return {x:x||axis(0),z:z||-axis(1)||0,jump:pressed(0)};
}
export function bindTouchControls(root:HTMLElement,onChange:(control:Control,active:boolean)=>void){
 const pointers=new Map<number,Control>();const valid=['up','down','left','right','jump'];
 function release(id:number){const c=pointers.get(id);if(!c)return;pointers.delete(id);if(![...pointers.values()].includes(c))onChange(c,false);}
 function clear(){for(const id of [...pointers.keys()])release(id);}
 function down(e:PointerEvent){const button=(e.target as HTMLElement).closest<HTMLButtonElement>('button[data-control]');if(!button||!root.contains(button)||!valid.includes(button.dataset.control??''))return;e.preventDefault();const c=button.dataset.control as Control;pointers.set(e.pointerId,c);try{button.setPointerCapture(e.pointerId);}catch{}onChange(c,true);}
 const up=(e:PointerEvent)=>release(e.pointerId);
 root.addEventListener('pointerdown',down);root.addEventListener('pointerup',up);root.addEventListener('pointercancel',up);root.addEventListener('lostpointercapture',up);window.addEventListener('blur',clear);
 return ()=>{clear();root.removeEventListener('pointerdown',down);root.removeEventListener('pointerup',up);root.removeEventListener('pointercancel',up);root.removeEventListener('lostpointercapture',up);window.removeEventListener('blur',clear);};
}
export const touchMarkup='<button type="button" data-control="up" aria-label="Move forward">↑</button><button type="button" data-control="left" aria-label="Move left">←</button><button type="button" data-control="down" aria-label="Move backward">↓</button><button type="button" data-control="right" aria-label="Move right">→</button><button type="button" data-control="jump" aria-label="Jump">Jump</button>';
