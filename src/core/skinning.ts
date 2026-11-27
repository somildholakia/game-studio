import type {Vec3} from './project';
export type SkinVertex={position:Vec3;lowerWeight:number};
export type LimbSkin={vertices:SkinVertex[];indices:number[];uvs:number[]};
/** Rest-space tube with smooth joint weights, from shoulder/hip to wrist/ankle. */
export function limbSkin(length:number,radius:number):LimbSkin{
 if(!Number.isFinite(length)||!Number.isFinite(radius)||length<=0||radius<=0)throw Error('Invalid limb dimensions');
 const vertices:SkinVertex[]=[],indices:number[]=[],uvs:number[]=[];
 const sides=12,rings=8;
 for(let i=0;i<=rings;i++){const fraction=i/rings,t=Math.max(0,Math.min(1,(fraction-.375)/.25));const w=t*t*(3-2*t);
 for(let j=0;j<=sides;j++){const a=j/sides*Math.PI*2;vertices.push({position:[Math.cos(a)*radius,-2*length*fraction,Math.sin(a)*radius],lowerWeight:w});uvs.push(j/sides,fraction);}}
 for(let i=0;i<rings;i++)for(let j=0;j<sides;j++){const a=i*(sides+1)+j,b=a+1,c=a+sides+1,d=c+1;indices.push(a,c,b,b,c,d);}
 // End caps, using existing rings. No additional bone weights needed.
 for(let j=1;j<sides-1;j++){indices.push(0,j,j+1);const a=rings*(sides+1);indices.push(a,a+j+1,a+j);}
 return {vertices,indices,uvs};
}
const rotateX=(v:Vec3,angle:number):Vec3=>[v[0],v[1]*Math.cos(angle)-v[2]*Math.sin(angle),v[1]*Math.sin(angle)+v[2]*Math.cos(angle)];
/** Linear blend of upper and lower joint matrices with inverse rest translation. */
export function skinLimb(skin:LimbSkin,length:number,firstDegrees:number,secondDegrees:number):number[]{
 const a=firstDegrees*Math.PI/180,b=secondDegrees*Math.PI/180;
 const joint=rotateX([0,-length,0],a);
 return skin.vertices.flatMap(({position:p,lowerWeight:w})=>{
 const u=rotateX(p,a),r=rotateX([p[0],p[1]+length,p[2]],a+b),v:Vec3=[r[0]+joint[0],r[1]+joint[1],r[2]+joint[2]];
 return u.map((n,k)=>n*(1-w)+v[k]*w);
 });
}
