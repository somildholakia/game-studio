export const joints=['head','leftShoulder','rightShoulder','leftElbow','rightElbow','leftHip','rightHip','leftKnee','rightKnee'] as const;
export type Joint=typeof joints[number];
export type JointPose=Record<Joint,number>;
export type CharacterRig={skin:string;hair:string;clothing:string;shoes:string;hairStyle:'none'|'cap'|'short';motion:boolean;pose:JointPose};
export const neutralPose=Object.fromEntries(joints.map(j=>[j,0])) as JointPose;
export const defaultRig:CharacterRig={skin:'#d5a384',hair:'#382c27',clothing:'#476b92',shoes:'#283244',hairStyle:'short',motion:true,pose:neutralPose};
export function readRig(raw:unknown):CharacterRig{
 if(raw===undefined)return structuredClone(defaultRig);
 const r=raw as CharacterRig;if(!r||typeof r.motion!=='boolean'||!['none','cap','short'].includes(r.hairStyle)||!r.pose)throw Error('Invalid character rig');
 const colors=['skin','hair','clothing','shoes'] as const;for(const k of colors)if(typeof r[k]!=='string'||!/^#[0-9a-f]{6}$/i.test(r[k]))throw Error('Invalid character color');
 const pose={...neutralPose};for(const j of joints){const angle=r.pose[j];if(typeof angle!=='number'||!Number.isFinite(angle)||angle< -120||angle>120)throw Error('Invalid joint angle');pose[j]=angle;}
 return {skin:r.skin,hair:r.hair,clothing:r.clothing,shoes:r.shoes,hairStyle:r.hairStyle,motion:r.motion,pose};
}
export function motionPose(base:JointPose,time:number,moving:boolean,grounded:boolean):JointPose{
 if(!grounded)return {...base,leftShoulder:-35,rightShoulder:-35,leftHip:-28,rightHip:16,leftKnee:35,rightKnee:18};
 if(!moving)return {...base};
 const wave=Math.sin(time*10);
 return {...base,leftShoulder:wave*28,rightShoulder:-wave*28,leftHip:-wave*32,rightHip:wave*32,leftKnee:Math.max(0,wave)*30,rightKnee:Math.max(0,-wave)*30,leftElbow:-12,rightElbow:-12};
}
