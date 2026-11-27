import {readSoundSample,decodeSoundSample,SOUND_RATE,type SoundSample} from './wav';
export const cues=['start','collect','jump','respawn','win','checkpoint','lose'] as const;
export type Cue=typeof cues[number];
export type Tone={frequency:number;duration:number;wave:OscillatorType};
export type AudioSettings={enabled:boolean;volume:number;tones:Record<Cue,Tone>;samples?:Partial<Record<Cue,SoundSample>>};
export const defaultAudio:AudioSettings={enabled:false,volume:.2,tones:{start:{frequency:440,duration:.18,wave:'sine'},collect:{frequency:880,duration:.14,wave:'sine'},jump:{frequency:330,duration:.12,wave:'triangle'},respawn:{frequency:180,duration:.25,wave:'triangle'},win:{frequency:1047,duration:.35,wave:'sine'},checkpoint:{frequency:660,duration:.2,wave:'sine'},lose:{frequency:110,duration:.4,wave:'triangle'}}};
const waves=['sine','square','sawtooth','triangle'];
export function readAudio(raw:unknown):AudioSettings{
 if(raw===undefined)return structuredClone(defaultAudio);
 const a=raw as AudioSettings;if(!a||typeof a.enabled!=='boolean'||typeof a.volume!=='number'||!Number.isFinite(a.volume)||a.volume<0||a.volume>1||!a.tones)throw Error('Invalid audio settings');
 const tones={} as Record<Cue,Tone>;
 for(const cue of cues){const t=a.tones[cue]??((cue==='checkpoint'||cue==='lose')?defaultAudio.tones[cue]:undefined);if(!t||typeof t.frequency!=='number'||!Number.isFinite(t.frequency)||t.frequency<40||t.frequency>2000||typeof t.duration!=='number'||!Number.isFinite(t.duration)||t.duration<.03||t.duration>1||!waves.includes(t.wave))throw Error('Invalid tone');tones[cue]={frequency:t.frequency,duration:t.duration,wave:t.wave};}
 const samples:Partial<Record<Cue,SoundSample>>={};if(a.samples!==undefined){if(!a.samples||typeof a.samples!=='object'||Array.isArray(a.samples))throw Error('Invalid sound library');for(const key of Object.keys(a.samples)){if(!cues.includes(key as Cue))throw Error('Invalid sound event');samples[key as Cue]=readSoundSample(a.samples[key as Cue]);}}
 return {enabled:a.enabled,volume:a.volume,tones,...(Object.keys(samples).length?{samples}:{})};
}
export function createAudio(){
 let context:AudioContext|undefined;const active=new Map<AudioScheduledSourceNode,GainNode>();const buffers=new WeakMap<SoundSample,AudioBuffer>();
 function stop(){for(const [source,gain] of active){try{source.stop();}catch{}source.disconnect();gain.disconnect();}active.clear();}
 async function unlock(){if(!context)context=new AudioContext();if(context.state==='suspended')await context.resume();}
 function play(settings:AudioSettings,cue:Cue){
 if(!settings.enabled||settings.volume===0||!context||context.state!=='running'||active.size>=12)return;
 const c=context,sample=settings.samples?.[cue],gain=c.createGain(),time=c.currentTime;
 const connect=(source:AudioScheduledSourceNode)=>{source.connect(gain);gain.connect(c.destination);active.set(source,gain);source.onended=()=>{active.delete(source);source.disconnect();gain.disconnect();};};
 if(sample){let buffer=buffers.get(sample);if(!buffer){const pcm=decodeSoundSample(sample);buffer=c.createBuffer(1,pcm.length,SOUND_RATE);buffer.copyToChannel(pcm,0);buffers.set(sample,buffer);}const source=c.createBufferSource();source.buffer=buffer;gain.gain.value=settings.volume*.5;connect(source);source.start(time);return;}
 const t=settings.tones[cue],osc=c.createOscillator();
 osc.type=t.wave;osc.frequency.value=t.frequency;gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(Math.max(.0001,settings.volume*.18),time+.008);gain.gain.exponentialRampToValueAtTime(.0001,time+t.duration);
 connect(osc);osc.start(time);osc.stop(time+t.duration+.01);
 }
 return {unlock,play,stop,dispose(){stop();if(context)void context.close().catch(()=>{});context=undefined;}};
}
