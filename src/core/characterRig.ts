export const joints=['head','leftShoulder','rightShoulder','leftElbow','rightElbow','leftHip','rightHip','leftKnee','rightKnee'] as const;
export type Joint=typeof joints[number];
export type JointPose=Record<Joint,number>;
export type JointKey={time:number;pose:JointPose};
export type JointClip={loop:boolean;keys:JointKey[]};
export type CharacterRig={skin:string;hair:string;clothing:string;shoes:string;hairStyle:'none'|'cap'|'short';motion:boolean;pose:JointPose;clip?:JointClip;skinMode?:'rigid'|'weighted'};
export const neutralPose=Object.fromEntries(joints.map(j=>[j,0])) as JointPose;
export const defaultRig:CharacterRig={skin:'#d5a384',hair:'#382c27',clothing:'#476b92',shoes:'#283244',hairStyle:'short',motion:true,pose:neutralPose};
function readPose(raw:unknown):JointPose{
 if(!raw||typeof raw!=='object')throw Error('Invalid joint pose');
 const input=raw as JointPose,pose={...neutralPose};
 for(const j of joints){const angle=input[j];if(typeof angle!=='number'||!Number.isFinite(angle)||angle< -120||angle>120)throw Error('Invalid joint angle');pose[j]=angle;}
 return pose;
}
export function readJointClip(raw:unknown):JointClip{
 const c=raw as JointClip;
 if(!c||typeof c.loop!=='boolean'||!Array.isArray(c.keys)||!c.keys.length||c.keys.length>128)throw Error('Invalid joint animation');
 let last=-1;
 const keys=c.keys.map(k=>{if(!k||typeof k.time!=='number'||!Number.isFinite(k.time)||k.time<0||k.time>60||k.time<=last)throw Error('Invalid joint key time');last=k.time;return {time:k.time,pose:readPose(k.pose)};});
 if(keys[0].time!==0)throw Error('Joint animation must start at zero');
 return {loop:c.loop,keys};
}
export function captureJointPose(rig:CharacterRig,time:number):JointClip{
 const old=rig.clip??{loop:true,keys:[]};
 return readJointClip({...old,keys:[...old.keys.filter(k=>k.time!==time),{time,pose:rig.pose}].sort((a,b)=>a.time-b.time)});
}
export function sampleJointClip(clip:JointClip,time:number):JointPose{
 const keys=clip.keys,duration=keys.at(-1)!.time,safe=Number.isFinite(time)?time:0;
 const t=clip.loop&&duration>0?((safe%duration)+duration)%duration:Math.max(0,Math.min(duration,safe));
 const index=keys.findIndex(k=>k.time>=t);
 if(index<=0)return {...(index===0?keys[0]:keys.at(-1)!).pose};
 const a=keys[index-1],b=keys[index],f=(t-a.time)/(b.time-a.time);
 return Object.fromEntries(joints.map(j=>[j,a.pose[j]+(b.pose[j]-a.pose[j])*f])) as JointPose;
}
export function readRig(raw:unknown):CharacterRig{
 if(raw===undefined)return structuredClone(defaultRig);
 const r=raw as CharacterRig;if(!r||typeof r.motion!=='boolean'||!['none','cap','short'].includes(r.hairStyle)||!r.pose)throw Error('Invalid character rig');
 const colors=['skin','hair','clothing','shoes'] as const;for(const k of colors)if(typeof r[k]!=='string'||!/^#[0-9a-f]{6}$/i.test(r[k]))throw Error('Invalid character color');
 const pose=readPose(r.pose);if(r.skinMode!==undefined&&!['rigid','weighted'].includes(r.skinMode))throw Error('Invalid skin mode');
 return {...(r.skinMode!==undefined?{skinMode:r.skinMode}:{}),skin:r.skin,hair:r.hair,clothing:r.clothing,shoes:r.shoes,hairStyle:r.hairStyle,motion:r.motion,pose,...(r.clip!==undefined?{clip:readJointClip(r.clip)}:{})};
}
export function motionPose(base:JointPose,time:number,moving:boolean,grounded:boolean):JointPose{
 if(!grounded)return {...base,leftShoulder:-35,rightShoulder:-35,leftHip:-28,rightHip:16,leftKnee:35,rightKnee:18};
 if(!moving)return {...base};
 const wave=Math.sin(time*10);
 return {...base,leftShoulder:wave*28,rightShoulder:-wave*28,leftHip:-wave*32,rightHip:wave*32,leftKnee:Math.max(0,wave)*30,rightKnee:Math.max(0,-wave)*30,leftElbow:-12,rightElbow:-12};
}
