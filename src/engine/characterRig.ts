import {Mesh,MeshBuilder,TransformNode,VertexData,VertexBuffer,type Scene} from '@babylonjs/core';
import {defaultRig,motionPose,sampleRig,type Joint,type JointPose,type CharacterRig} from '../core/characterRig';
import type {Entity} from '../core/project';
import {limbSkin,skinLimb,type LimbSkin} from '../core/skinning';
import {createMaterial,updateMaterial} from './material';
type Channel='skin'|'hair'|'clothing'|'shoes'|'shirt';
type Skinned={mesh:Mesh;skin:LimbSkin;length:number;first:Joint;second:Joint;last?:string};
type RigNodes={joints:Record<Joint,TransformNode>;parts:{mesh:Mesh;channel:Channel}[];skins:Skinned[]};
const rigs=new WeakMap<Mesh,RigNodes>();
export function createCharacterRig(e:Entity,scene:Scene):Mesh{
 const id=e.id,root=new Mesh(id,scene),c=e.character??{bodyWidth:1,headSize:1,limbLength:1};
 const nodes={} as Record<Joint,TransformNode>;const parts:RigNodes['parts']=[],skins:Skinned[]=[];const weighted=e.rig?.skinMode==='weighted';
 function skinned(name:string,parent:TransformNode,length:number,radius:number,first:Joint,second:Joint,channel:Channel){const m=new Mesh(id+'-'+name,scene),skin=limbSkin(length,radius),data=new VertexData();m.parent=parent;m.position.copyFrom(nodes[first].position);data.positions=skinLimb(skin,length,0,0);data.indices=skin.indices;data.uvs=skin.uvs;const normals:number[]=[];VertexData.ComputeNormals(data.positions,data.indices,normals);data.normals=normals;data.applyToMesh(m,true);m.material=createMaterial({...e,id:id+'-'+name},scene);parts.push({mesh:m,channel});skins.push({mesh:m,skin,length,first,second});}
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
 if(!weighted)box(side+'-upper-arm',shoulder,.14,arm,.16,0,-arm/2,0,'shirt');
 const elbow=pivot(side==='left'?'leftElbow':'rightElbow',shoulder,0,-arm);
 if(!weighted)box(side+'-forearm',elbow,.12,arm,.14,0,-arm/2,0,'skin');
 const hip=pivot(side==='left'?'leftHip':'rightHip',root,sign*.11*c.bodyWidth,-.18);
 if(!weighted)box(side+'-thigh',hip,.17,leg,.2,0,-leg/2,0,'clothing');
 const knee=pivot(side==='left'?'leftKnee':'rightKnee',hip,0,-leg);
 if(!weighted)box(side+'-shin',knee,.15,leg,.17,0,-leg/2,0,'clothing');
 if(weighted){skinned(side+'-arm-skin',root,arm,.07,side==='left'?'leftShoulder':'rightShoulder',side==='left'?'leftElbow':'rightElbow','shirt');skinned(side+'-leg-skin',root,leg,.085,side==='left'?'leftHip':'rightHip',side==='left'?'leftKnee':'rightKnee','clothing');}
 box(side+'-shoe',knee,.18,.10,.25,0,-leg,.05,'shoes');}
 rigs.set(root,{joints:nodes,parts,skins});return root;
}
function poseRig(root:Mesh,pose:JointPose){const r=rigs.get(root);if(!r)return;for(const [joint,node] of Object.entries(r.joints))node.rotation.x=pose[joint as Joint]*Math.PI/180;for(const limb of r.skins){const key=pose[limb.first]+':'+pose[limb.second];if(key===limb.last)continue;limb.last=key;const positions=skinLimb(limb.skin,limb.length,pose[limb.first],pose[limb.second]),normals:number[]=[];VertexData.ComputeNormals(positions,limb.skin.indices,normals);limb.mesh.updateVerticesData(VertexBuffer.PositionKind,positions,true);limb.mesh.updateVerticesData(VertexBuffer.NormalKind,normals);}}
export function syncCharacterRig(root:Mesh,e:Entity){const r=rigs.get(root);if(!r)return;const style=e.rig??defaultRig;for(const part of r.parts)updateMaterial(part.mesh,{...e,color:part.channel==='shirt'?e.color:style[part.channel]});poseRig(root,style.pose);}
export function animateCharacterRig(root:Mesh,style:CharacterRig|undefined,time:number,moving:boolean,grounded:boolean){const s=style??defaultRig;if(s.motion)poseRig(root,motionPose(s.pose,time,moving,grounded));else poseRig(root,s.pose);}

export function animateDecorativeRig(root:Mesh,style:CharacterRig|undefined,time:number,preview:boolean){if(style&&(style.clip||style.blend))poseRig(root,sampleRig(style,time,preview));}
