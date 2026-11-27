import {Color3,PBRMaterial,RawTexture,Texture,type Mesh,type Scene} from '@babylonjs/core';
import {texturePixels,TEXTURE_SIZE,decodeImageTexture,IMAGE_TEXTURE_SIZE} from '../core/textures';
const textureCache=new WeakMap<PBRMaterial,string>();
import type {Entity} from '../core/project';
export function createMaterial(e:Entity,scene:Scene):PBRMaterial{return new PBRMaterial(e.id+'-material',scene);}
export function updateMaterial(mesh:Mesh,e:Entity):void{
 const m=mesh.material;if(!(m instanceof PBRMaterial))return;
 m.wireframe=e.role==='trigger';
 m.albedoColor=Color3.FromHexString(e.color).toLinearSpace();
 m.metallic=e.material?.metallic??0;m.roughness=e.material?.roughness??.65;
 m.emissiveColor=Color3.FromHexString(e.material?.emissive??'#000000').toLinearSpace();
 const image=e.material?.imageTexture,style=e.material?.texture;const signature=image?'image:'+image.data:style?JSON.stringify([style.pattern,style.color]):'';
 if(textureCache.get(m)!==signature){m.albedoTexture?.dispose();m.albedoTexture=null;if(image||style){const size=image?IMAGE_TEXTURE_SIZE:TEXTURE_SIZE;const t=RawTexture.CreateRGBATexture(image?decodeImageTexture(image):texturePixels(style!),size,size,mesh.getScene(),true,false,Texture.TRILINEAR_SAMPLINGMODE);t.wrapU=Texture.WRAP_ADDRESSMODE;t.wrapV=Texture.WRAP_ADDRESSMODE;t.gammaSpace=true;m.albedoTexture=t;}textureCache.set(m,signature);}
 const repeat=image??style;if(repeat&&m.albedoTexture instanceof Texture){m.albedoTexture.uScale=repeat.repeatU;m.albedoTexture.vScale=repeat.repeatV;}
}
