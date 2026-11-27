import {useEffect,useRef} from 'react';import {bindTouchControls,type Control} from '../runtime/controls';
export function TouchControls({onChange}:{onChange:(control:Control,active:boolean)=>void}){
 const root=useRef<HTMLDivElement>(null);const callback=useRef(onChange);callback.current=onChange;
 useEffect(()=>bindTouchControls(root.current!,(c,v)=>callback.current(c,v)),[]);
 return <div ref={root} className="touch-controls" aria-label="Game touch controls">{(['up','left','down','right','jump'] as const).map((c,i)=><button key={c} type="button" data-control={c} aria-label={['Move forward','Move left','Move backward','Move right','Jump'][i]}>{['↑','←','↓','→','Jump'][i]}</button>)}</div>;
}
