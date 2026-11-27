import {Mesh,MeshBuilder,TransformNode,type Scene} from '@babylonjs/core';
import {defaultRig,motionPose,sampleJointClip,type Joint,type JointPose,type CharacterRig} from '../core/characterRig';
import type {Entity} from '../core/project';
import {createMaterial,updateMaterial} from './material';
type Channel='skin'|'hair'|'clothing'|'shoes'|'shirt';
type RigNodes={joints:Record<Joint,TransformNode>;parts:{mesh:Mesh;channel:Channel}[]};
const rigs=new WeakMap<Mesh,RigNodes>();
export function createCharacterRig(e:Entity,scene:Scene):Mesh{
 const id=e.id,root=new Mesh(id,scene),c=e.character??{bodyWidth:1,headSize:1,limbLength:1};
 const nodes={} as Record<Joint,TransformNode>;const parts:RigNodes['parts']=[];
 function pivot(name:Joint,parent:TransformNode,x:number,y:number,z=0){const n=new TransformNode(id+'-'+name,scene);n.parent=parent;n.position.set(x,y,z);nodes[name]=n;return n;}
 function box(name:string,parent:TransformNode,w:number,h:number,d:number,x:number,y:number,z:number,channel:Channel){const m=MeshBuilder.CreateBox(id+'-'+name,{width:w,height:h,depth:d},scene);m.parent=parent;m.position.set(x,y,z);m.material=createMaterial({...e,id:id+'-'+name},scene);parts.push({mesh:m,channel});return m;}
 function sphere(name:string,parent:TransformNode,d:number,x:number,y:number,z:number,channel:Channel){const m=MeshBuilder.CreateSphere(id+'-'+name,{diameter:d,segments:16},scene);m.parent=parent;m.position.set(x,y,z);m.material=createMaterial({...e,id:id+'-'+name},scene);parts.push({mesh:m,channel});return m;}
 box('torso',root,.42*c.bodyWidth,.48,.24,0,.03,0,'shirt');
 const head=pivot('head',root,0,.28);sphere('face',head,.34*c.headSize,0,.15,0,'skin');
 const hairStyle=e.rig?.hairStyle??defaultRig.hairStyle;
 if(hairStyle==='short')box('hair',head,.28*c.headSize,.10*c.headSize,.29*c.headSize,0,.28*c.headSize,-.025,'hair');
 if(hairStyle==='cap'){box('cap',head,.36*c.headSize,.09,.36*c.headSize,0,.28*c.headSize,0,'hair');box('brim',head,.35*c.headSize,.03,.19,0,.26*c.headSize,.18,'hair');}
 for(const side of ['left','right'] as const){const sign=side==='left'?-1:1;const shoulder=pivot(side==='left'?'leftShoulder':'rightShoulder',root,sign*(.22*c.bodyWidth+.08),.23);
 const arm=.23*c.limbLength,leg=.235*c.limbLength;
 box(side+'-upper-arm',shoulder,.14,arm,.16,0,-arm/2,0,'shirt');
 const elbow=pivot(side==='left'?'leftElbow':'rightElbow',shoulder,0,-arm);
 box(side+'-forearm',elbow,.12,arm,.14,0,-arm/2,0,'skin');
 const hip=pivot(side==='left'?'leftHip':'rightHip',root,sign*.11*c.bodyWidth,-.18);
 box(side+'-thigh',hip,.17,leg,.2,0,-leg/2,0,'clothing');
 const knee=pivot(side==='left'?'leftKnee':'rightKnee',hip,0,-leg);
 box(side+'-shin',knee,.15,leg,.17,0,-leg/2,0,'clothing');
 box(side+'-shoe',knee,.18,.10,.25,0,-leg,.05,'shoes');}
 rigs.set(root,{joints:nodes,parts});return root;
}
function poseRig(root:Mesh,pose:JointPose){const r=rigs.get(root);if(!r)return;for(const [joint,node] of Object.entries(r.joints))node.rotation.x=pose[joint as Joint]*Math.PI/180;}
export function syncCharacterRig(root:Mesh,e:Entity){const r=rigs.get(root);if(!r)return;const style=e.rig??defaultRig;for(const part of r.parts)updateMaterial(part.mesh,{...e,color:part.channel==='shirt'?e.color:style[part.channel]});poseRig(root,style.pose);}
export function animateCharacterRig(root:Mesh,style:CharacterRig|undefined,time:number,moving:boolean,grounded:boolean){const s=style??defaultRig;if(s.motion)poseRig(root,motionPose(s.pose,time,moving,grounded));else poseRig(root,s.pose);}

export function animateDecorativeRig(root:Mesh,style:CharacterRig|undefined,time:number,preview:boolean){const clip=style?.clip;if(clip)poseRig(root,sampleJointClip(preview?{...clip,loop:false}:clip,time));}
