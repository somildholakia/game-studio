import {Color3,PBRMaterial,type Mesh,type Scene} from '@babylonjs/core';
import type {Entity} from '../core/project';
export function createMaterial(e:Entity,scene:Scene):PBRMaterial{return new PBRMaterial(e.id+'-material',scene);}
export function updateMaterial(mesh:Mesh,e:Entity):void{
 const m=mesh.material;if(!(m instanceof PBRMaterial))return;
 m.albedoColor=Color3.FromHexString(e.color).toLinearSpace();
 m.metallic=e.material?.metallic??0;m.roughness=e.material?.roughness??.65;
 m.emissiveColor=Color3.FromHexString(e.material?.emissive??'#000000').toLinearSpace();
}
