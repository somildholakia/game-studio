import {Color3,PBRMaterial,RawTexture,Texture,type Mesh,type Scene} from '@babylonjs/core';
import {texturePixels,TEXTURE_SIZE} from '../core/textures';
const textureCache=new WeakMap<PBRMaterial,string>();
import type {Entity} from '../core/project';
export function createMaterial(e:Entity,scene:Scene):PBRMaterial{return new PBRMaterial(e.id+'-material',scene);}
export function updateMaterial(mesh:Mesh,e:Entity):void{
 const m=mesh.material;if(!(m instanceof PBRMaterial))return;
 m.albedoColor=Color3.FromHexString(e.color).toLinearSpace();
 m.metallic=e.material?.metallic??0;m.roughness=e.material?.roughness??.65;
 m.emissiveColor=Color3.FromHexString(e.material?.emissive??'#000000').toLinearSpace();
 const style=e.material?.texture;const signature=style?JSON.stringify([style.pattern,style.color]):'';
 if(textureCache.get(m)!==signature){m.albedoTexture?.dispose();m.albedoTexture=null;if(style){const t=RawTexture.CreateRGBATexture(texturePixels(style),TEXTURE_SIZE,TEXTURE_SIZE,mesh.getScene(),true,false,Texture.TRILINEAR_SAMPLINGMODE);t.wrapU=Texture.WRAP_ADDRESSMODE;t.wrapV=Texture.WRAP_ADDRESSMODE;t.gammaSpace=true;m.albedoTexture=t;}textureCache.set(m,signature);}
 if(style&&m.albedoTexture instanceof Texture){m.albedoTexture.uScale=style.repeatU;m.albedoTexture.vScale=style.repeatV;}
}
