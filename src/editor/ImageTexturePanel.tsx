import {useEffect,useRef,useState} from 'react';
import {validateTextureImage} from '../core/assets';
import {encodeImageTexture,IMAGE_TEXTURE_SIZE,type ImageTexture} from '../core/textures';
export function ImageTexturePanel({value,onChange,onError}:{value?:ImageTexture;onChange:(v:ImageTexture|undefined)=>void;onError:(message:string)=>void}){
 const [busy,setBusy]=useState(false),alive=useRef(true),latest=useRef(value);latest.current=value;
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 return <fieldset><legend>Image texture</legend><p className="hint">Import a static PNG or JPEG up to 2 MiB. The image is resampled to 128 × 128 pixels and embedded in the project.</p>
 <label>Import image texture<input type="file" accept="image/png,image/jpeg" disabled={busy} onChange={async e=>{
 const file=e.currentTarget.files?.[0];e.currentTarget.value='';if(!file)return;setBusy(true);
 try{
 if(file.size>2*1024*1024)throw Error('Image exceeds 2 MiB');
 const mime=/\.png$/i.test(file.name)?'image/png':/\.jpe?g$/i.test(file.name)?'image/jpeg':'';
 const bytes=new Uint8Array(await file.arrayBuffer());validateTextureImage(bytes,mime);
 const bitmap=await createImageBitmap(new Blob([bytes],{type:mime}));try{
 if(!bitmap.width||!bitmap.height||bitmap.width>4096||bitmap.height>4096)throw Error('Invalid decoded dimensions');
 const canvas=document.createElement('canvas');canvas.width=canvas.height=IMAGE_TEXTURE_SIZE;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Image conversion unavailable');
 ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
 const next=encodeImageTexture(file.name,ctx.getImageData(0,0,canvas.width,canvas.height).data);
 if(alive.current){if(latest.current!==value)throw Error('Texture changed during import. Try again.');onChange(next);}
 }finally{bitmap.close();}
 }catch(err){if(alive.current)onError(String(err));}finally{if(alive.current)setBusy(false);}
 }}/></label>{value&&<><p>{value.name}</p>{(['repeatU','repeatV'] as const).map(key=><label key={key}>{key==='repeatU'?'Image horizontal repeat':'Image vertical repeat'}<input type="number" min=".25" max="32" step=".25" value={value[key]} onChange={e=>{const n=e.target.valueAsNumber;if(Number.isFinite(n)&&n>=.25&&n<=32)onChange({...value,[key]:n});}}/></label>)}<button onClick={()=>onChange(undefined)}>Remove image texture</button></>}</fieldset>;
}
