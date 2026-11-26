import {useEffect,useRef,useState} from 'react';
import {cues,defaultAudio,createAudio,type AudioSettings,type Cue,type Tone} from '../runtime/audio';
export function AudioPanel({value,onChange,disabled}:{value?:AudioSettings;onChange:(a:AudioSettings)=>void;disabled:boolean}){
 const audio=value??defaultAudio;const [cue,setCue]=useState<Cue>('collect');const [error,setError]=useState('');const preview=useRef<ReturnType<typeof createAudio>|null>(null);
 useEffect(()=>()=>preview.current?.dispose(),[]);
 const tone=audio.tones[cue];function update(patch:Partial<Tone>){onChange({...audio,tones:{...audio.tones,[cue]:{...tone,...patch}}});}
 return <fieldset disabled={disabled}><legend>Audio Studio · Event sounds</legend><label><input type="checkbox" checked={audio.enabled} onChange={e=>onChange({...audio,enabled:e.target.checked})}/> Enable game sounds</label>
 <label>Master volume<input type="range" min="0" max="1" step=".01" value={audio.volume} onChange={e=>onChange({...audio,volume:e.target.valueAsNumber})}/></label>
 <label>Sound event<select value={cue} onChange={e=>setCue(e.target.value as Cue)}>{cues.map(c=><option key={c}>{c}</option>)}</select></label>
 <label>Frequency (Hz)<input type="range" min="40" max="2000" step="1" value={tone.frequency} onChange={e=>update({frequency:e.target.valueAsNumber})}/>{tone.frequency}</label>
 <label>Duration (seconds)<input type="range" min=".03" max="1" step=".01" value={tone.duration} onChange={e=>update({duration:e.target.valueAsNumber})}/>{tone.duration}</label>
 <label>Waveform<select value={tone.wave} onChange={e=>update({wave:e.target.value as OscillatorType})}>{['sine','triangle','square','sawtooth'].map(w=><option key={w}>{w}</option>)}</select></label>
 <button onClick={async()=>{try{preview.current??=createAudio();await preview.current.unlock();preview.current.play({...audio,enabled:true},cue);setError('');}catch{setError('Audio is unavailable in this browser.');}}}>Preview sound</button>{error&&<p role="alert">{error}</p>}</fieldset>;
}
