export const SOUND_RATE=16000,MAX_SOUND_FRAMES=SOUND_RATE*2,MAX_SOUND_REFERENCES=24;
export type SoundSample={name:string;data:string};
export function readSoundSample(raw:unknown):SoundSample{
 const s=raw as SoundSample;
 if(!s||typeof s.name!=='string'||!s.name.trim()||s.name.length>200||typeof s.data!=='string'||!s.data.length||s.data.length>Math.ceil(MAX_SOUND_FRAMES*2/3)*4||!/^[A-Za-z0-9+/]+={0,2}$/.test(s.data))throw Error('Invalid embedded sound');
 const bytes=atob(s.data);
 if(!bytes.length||bytes.length%2||bytes.length>MAX_SOUND_FRAMES*2||btoa(bytes)!==s.data)throw Error('Invalid sound sample');
 return {name:s.name,data:s.data};
}
/** Accept bounded little-endian PCM16 WAV, then downmix/resample to fixed-rate mono. */
export function importWav(name:string,bytes:Uint8Array):SoundSample{
 const fail=()=>{throw Error('Choose a PCM 16-bit mono/stereo WAV, 8–48 kHz, at most 2 seconds.');};
 if(bytes.length<44||bytes.length>512000)fail();
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 const tag=(offset:number)=>String.fromCharCode(...bytes.subarray(offset,offset+4));
 if(tag(0)!=='RIFF'||tag(8)!=='WAVE'||v.getUint32(4,true)!==bytes.length-8)fail();
 let fmt=-1,data=-1,dataSize=0,offset=12;
 while(offset+8<=bytes.length){
  const size=v.getUint32(offset+4,true),start=offset+8,end=start+size;
  if(end+(size%2)>bytes.length)fail();
  if(tag(offset)==='fmt '){if(fmt!==-1||size<16)fail();fmt=start;}
  if(tag(offset)==='data'){if(data!==-1)fail();data=start;dataSize=size;}
  offset=end+(size%2);
 }
 if(offset!==bytes.length||fmt<0||data<0||!dataSize)fail();
 const channels=v.getUint16(fmt+2,true),rate=v.getUint32(fmt+4,true),align=v.getUint16(fmt+12,true);
 if(v.getUint16(fmt,true)!==1||![1,2].includes(channels)||rate<8000||rate>48000||v.getUint16(fmt+14,true)!==16||align!==channels*2||v.getUint32(fmt+8,true)!==rate*align||dataSize%align)fail();
 const frames=dataSize/align;if(frames<1||frames>rate*2)fail();
 const count=Math.max(1,Math.round(frames*SOUND_RATE/rate)),out=new Uint8Array(count*2),target=new DataView(out.buffer);
 const read=(i:number)=>{let n=0;for(let c=0;c<channels;c++)n+=v.getInt16(data+i*align+c*2,true);return n/channels;};
 for(let i=0;i<count;i++){const p=Math.min(frames-1,i*rate/SOUND_RATE),a=Math.floor(p),b=Math.min(frames-1,a+1),f=p-a;target.setInt16(i*2,Math.round(read(a)*(1-f)+read(b)*f),true);}
 let binary='';for(let i=0;i<out.length;i+=8192)binary+=String.fromCharCode(...out.subarray(i,i+8192));
 return readSoundSample({name:name.slice(0,200),data:btoa(binary)});
}
export function decodeSoundSample(s:SoundSample):Float32Array<ArrayBuffer>{
 const binary=atob(s.data),out=new Float32Array(binary.length/2);
 for(let i=0;i<out.length;i++){const n=binary.charCodeAt(i*2)|(binary.charCodeAt(i*2+1)<<8);out[i]=(n>=32768?n-65536:n)/32768;}
 return out;
}
