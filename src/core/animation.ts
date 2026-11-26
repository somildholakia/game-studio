import type {Entity,Vec3} from './project';
export type Pose={position:Vec3;rotation:Vec3;scale:Vec3};
export type Keyframe=Pose&{time:number};
export type Clip={loop:boolean;keys:Keyframe[]};
const vec=(v:unknown):v is Vec3=>Array.isArray(v)&&v.length===3&&v.every(n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=100000);
export function readClip(raw:unknown):Clip{
 const c=raw as Clip;if(!c||typeof c.loop!=='boolean'||!Array.isArray(c.keys)||!c.keys.length||c.keys.length>128)throw Error('Invalid animation clip');
 let last=-1;const keys=c.keys.map(k=>{if(!k||!Number.isFinite(k.time)||k.time<0||k.time>60||k.time<=last||!vec(k.position)||!vec(k.rotation)||!vec(k.scale))throw Error('Invalid animation keyframe');last=k.time;return {time:k.time,position:k.position,rotation:k.rotation,scale:k.scale};});
 if(keys[0].time!==0)throw Error('Animation must start at zero');
 return {loop:c.loop,keys};
}
export function capture(e:Entity,time:number):Clip{
 const old=e.animation??{loop:true,keys:[]};
 const key={time,position:[...e.position] as Vec3,rotation:[...e.rotation] as Vec3,scale:[...e.scale] as Vec3};
 return readClip({loop:old.loop,keys:[...old.keys.filter(k=>k.time!==time),key].sort((a,b)=>a.time-b.time)});
}
export function sample(clip:Clip,time:number):Pose{
 const keys=clip.keys;const duration=keys[keys.length-1].time;
 const t=duration>0&&clip.loop?((time%duration)+duration)%duration:Math.max(0,Math.min(duration,time));
 if(t<=keys[0].time)return keys[0];
 let i=1;while(i<keys.length&&keys[i].time<t)i++;if(i===keys.length)return keys[keys.length-1];
 const a=keys[i-1],b=keys[i],f=(t-a.time)/(b.time-a.time);
 const lerp=(a:Vec3,b:Vec3):Vec3=>[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f,a[2]+(b[2]-a[2])*f];
 return {position:lerp(a.position,b.position),rotation:lerp(a.rotation,b.rotation),scale:lerp(a.scale,b.scale)};
}
