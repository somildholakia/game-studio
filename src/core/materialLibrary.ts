import type {Entity,MaterialStyle} from './project';
import {readTexture} from './textures';

export type MaterialPreset={name:string;color:string;material:MaterialStyle};
export const MAX_MATERIAL_PRESETS=64;
const hex=(x:unknown):x is string=>typeof x==='string'&&/^#[0-9a-f]{6}$/i.test(x);
export function readMaterialPreset(raw:unknown):MaterialPreset{
 const p=raw as MaterialPreset;
 if(!p||typeof p.name!=='string'||!p.name.trim()||p.name!==p.name.trim()||p.name.length>80||!hex(p.color))throw Error('Invalid material preset name or color');
 const m=p.material;
 if(!m||![m.metallic,m.roughness].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1)||!hex(m.emissive)||m.imageTexture!==undefined)throw Error('Material presets require solid or procedural materials');
 return {name:p.name,color:p.color,material:{metallic:m.metallic,roughness:m.roughness,emissive:m.emissive,...(m.texture!==undefined?{texture:readTexture(m.texture)}:{})}};
}
export function readMaterialLibrary(raw:unknown):MaterialPreset[]{
 if(raw===undefined)return [];
 if(!Array.isArray(raw)||raw.length>MAX_MATERIAL_PRESETS)throw Error('Invalid material library size');
 const names=new Set<string>();return raw.map(item=>{const p=readMaterialPreset(item),key=p.name.toLowerCase();if(names.has(key))throw Error('Duplicate material preset name');names.add(key);return p;});
}
export function captureMaterial(name:string,e:Entity):MaterialPreset{
 if(e.kind==='model')throw Error('Imported models use their own materials');
 return readMaterialPreset({name:name.trim(),color:e.color,material:e.material??{metallic:0,roughness:.65,emissive:'#000000'}});
}
export function applyMaterial(e:Entity,preset:MaterialPreset):Entity{
 if(e.kind==='model')throw Error('Imported models use their own materials');
 const p=readMaterialPreset(preset);return {...e,color:p.color,material:p.material};
}
export const builtInMaterials:MaterialPreset[]=[
 {name:'Brushed steel',color:'#a4adb6',material:{metallic:.85,roughness:.38,emissive:'#000000'}},
 {name:'Matte clay',color:'#bd785b',material:{metallic:0,roughness:.95,emissive:'#000000'}},
 {name:'Glowing cyan',color:'#236b78',material:{metallic:.15,roughness:.35,emissive:'#31b8c8'}},
 {name:'Brick wall',color:'#ad6350',material:{metallic:0,roughness:.9,emissive:'#000000',texture:{pattern:'brick',color:'#4b413c',repeatU:4,repeatV:4}}}
];
