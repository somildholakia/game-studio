import type {JointPose} from './characterRig';
export const limbs=['left arm','right arm','left leg','right leg'] as const;
export type Limb=typeof limbs[number];
const links={ 'left arm':['leftShoulder','leftElbow'],'right arm':['rightShoulder','rightElbow'],'left leg':['leftHip','leftKnee'],'right leg':['rightHip','rightKnee']} as const;
const rad=Math.PI/180;
/** Two equal-length links rotating in the rig's local sagittal plane.
 * Coordinates are measured in one link length, with positive down and positive forward (-Z). */
export function limbEndpoint(first:number,second:number):[number,number]{
 return [Math.cos(first*rad)+Math.cos((first+second)*rad),Math.sin(first*rad)+Math.sin((first+second)*rad)];
}
export function solveLimb(pose:JointPose,limb:Limb,down:number,forward:number,bend:1|-1):JointPose{
 if(!limbs.includes(limb)||![down,forward].every(Number.isFinite)||Math.abs(down)>2||Math.abs(forward)>2||![1,-1].includes(bend))throw Error('Invalid limb target');
 const radius=Math.hypot(down,forward);
 if(radius<1e-6||radius>2+1e-8)throw Error('Target is outside the two-link reach');
 const second=bend*Math.acos(Math.max(-1,Math.min(1,(radius*radius-2)/2)));
 const first=Math.atan2(forward,down)-Math.atan2(Math.sin(second),1+Math.cos(second));
 const normalize=(x:number)=>((x/rad+180)%360+360)%360-180;
 const a=normalize(first),b=normalize(second);
 if(Math.abs(a)>120+1e-7||Math.abs(b)>120+1e-7)throw Error('Target exceeds the rig joint limits; change the target or bend direction');
 const [j,k]=links[limb];return {...pose,[j]:Math.max(-120,Math.min(120,a)),[k]:Math.max(-120,Math.min(120,b))};
}
