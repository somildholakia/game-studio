export const cues=['start','collect','jump','respawn','win'] as const;
export type Cue=typeof cues[number];
export type Tone={frequency:number;duration:number;wave:OscillatorType};
export type AudioSettings={enabled:boolean;volume:number;tones:Record<Cue,Tone>};
export const defaultAudio:AudioSettings={enabled:false,volume:.2,tones:{start:{frequency:440,duration:.18,wave:'sine'},collect:{frequency:880,duration:.14,wave:'sine'},jump:{frequency:330,duration:.12,wave:'triangle'},respawn:{frequency:180,duration:.25,wave:'triangle'},win:{frequency:1047,duration:.35,wave:'sine'}}};
const waves=['sine','square','sawtooth','triangle'];
export function readAudio(raw:unknown):AudioSettings{
 if(raw===undefined)return structuredClone(defaultAudio);
 const a=raw as AudioSettings;if(!a||typeof a.enabled!=='boolean'||typeof a.volume!=='number'||!Number.isFinite(a.volume)||a.volume<0||a.volume>1||!a.tones)throw Error('Invalid audio settings');
 const tones={} as Record<Cue,Tone>;
 for(const cue of cues){const t=a.tones[cue];if(!t||typeof t.frequency!=='number'||!Number.isFinite(t.frequency)||t.frequency<40||t.frequency>2000||typeof t.duration!=='number'||!Number.isFinite(t.duration)||t.duration<.03||t.duration>1||!waves.includes(t.wave))throw Error('Invalid tone');tones[cue]={frequency:t.frequency,duration:t.duration,wave:t.wave};}
 return {enabled:a.enabled,volume:a.volume,tones};
}
export function createAudio(){
 let context:AudioContext|undefined;let generation=0;const active=new Set<OscillatorNode>();
 function stop(){generation++;for(const osc of active){try{osc.stop();}catch{}osc.disconnect();}active.clear();}
 async function unlock(){if(!context)context=new AudioContext();if(context.state==='suspended')await context.resume();}
 function play(settings:AudioSettings,cue:Cue){
 if(!settings.enabled||settings.volume===0||!context||context.state!=='running'||active.size>=12)return;
 const c=context,t=settings.tones[cue],osc=c.createOscillator(),gain=c.createGain(),time=c.currentTime;
 osc.type=t.wave;osc.frequency.value=t.frequency;gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(Math.max(.0001,settings.volume*.18),time+.008);gain.gain.exponentialRampToValueAtTime(.0001,time+t.duration);
 osc.connect(gain);gain.connect(c.destination);active.add(osc);osc.onended=()=>{active.delete(osc);osc.disconnect();gain.disconnect();};osc.start(time);osc.stop(time+t.duration+.01);
 }
 return {unlock,play,stop,dispose(){stop();if(context)void context.close().catch(()=>{});context=undefined;}};
}
