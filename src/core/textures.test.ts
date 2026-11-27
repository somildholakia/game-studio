import {describe,it,expect} from 'vitest';import {readTexture,texturePixels,TEXTURE_SIZE,encodeImageTexture,decodeImageTexture,readImageTexture,IMAGE_TEXTURE_SIZE,MAX_IMAGE_TEXTURES} from './textures';import {projectUV} from './uv';import {cubeMesh} from './mesh';
describe('procedural textures and UVs',()=>{it('generates deterministic bounded RGBA pixels',()=>{const t=readTexture({pattern:'checker',color:'#000000',repeatU:2,repeatV:1});const p=texturePixels(t);expect(p.length).toBe(TEXTURE_SIZE**2*4);expect([...p.slice(0,4)]).toEqual([0,0,0,255]);expect([...p.slice(32*4,32*4+4)]).toEqual([255,255,255,255]);expect(texturePixels(t)).toEqual(p);expect(()=>readTexture({...t,repeatU:99})).toThrow();});it('projects each triangle corner into finite UV coordinates',()=>{const m=cubeMesh();const uv=projectUV(m);expect(uv.length).toBe(m.triangles.length*3);expect(uv.flat().every(n=>Number.isFinite(n)&&n>=0&&n<=1)).toBe(true);expect(projectUV(m,'xy')[0]).toEqual([0,0]);});});

import {entity,parseProject} from './project';
it('preserves material textures and mesh UV projection in exported project data',()=>{const e=entity('mesh');e.material={metallic:0,roughness:.5,emissive:'#000000',texture:{pattern:'brick',color:'#555555',repeatU:3,repeatV:2}};e.uvProjection='xz';const p=parseProject(JSON.stringify({version:1,name:'Textured mesh',entities:[e]}));expect(p.entities[0].material).toEqual(e.material);expect(p.entities[0].uvProjection).toBe('xz');});

it('stores normalized image pixels and enforces per-project reference limits',()=>{
 const pixels=new Uint8Array(IMAGE_TEXTURE_SIZE**2*4).fill(127),imageTexture=encodeImageTexture('paint.png',pixels);
 expect(decodeImageTexture(imageTexture)).toEqual(pixels);
 expect(()=>readImageTexture({...imageTexture,data:'https://example.invalid'})).toThrow();
 expect(()=>readImageTexture({...imageTexture,repeatU:99})).toThrow();
 const e={...entity('box'),material:{metallic:0,roughness:.65,emissive:'#000000',imageTexture}};
 const p={version:1,name:'Image',entities:[e]};
 expect(parseProject(JSON.stringify(p)).entities[0].material?.imageTexture).toEqual(imageTexture);
 expect(()=>parseProject(JSON.stringify({...p,entities:Array.from({length:MAX_IMAGE_TEXTURES+1},(_,i)=>({...e,id:String(i)}))}))).toThrow('texture limit');
 expect(()=>parseProject(JSON.stringify({...p,entities:[{...e,material:{...e.material,texture:{pattern:'checker',color:'#000000',repeatU:1,repeatV:1}}}]}))).toThrow('one material texture');
});
