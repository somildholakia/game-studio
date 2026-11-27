export const patterns=['checker','brick','stripes','grid','noise'] as const;
export type Pattern=typeof patterns[number];
export type TextureStyle={pattern:Pattern;color:string;repeatU:number;repeatV:number};
export const defaultTexture:TextureStyle={pattern:'checker',color:'#ffffff',repeatU:2,repeatV:2};
export function readTexture(raw:unknown):TextureStyle{
 const t=raw as TextureStyle;
 if(!t||!patterns.includes(t.pattern)||typeof t.color!=='string'||!/^#[0-9a-f]{6}$/i.test(t.color)||![t.repeatU,t.repeatV].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=.25&&n<=32))throw Error('Invalid procedural texture');
 return {pattern:t.pattern,color:t.color,repeatU:t.repeatU,repeatV:t.repeatV};
}
export const TEXTURE_SIZE=64;
export function texturePixels(style:TextureStyle):Uint8Array{
 const n=TEXTURE_SIZE,pixels=new Uint8Array(n*n*4);
 const c=[1,3,5].map(i=>parseInt(style.color.slice(i,i+2),16));
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
 let f=0;switch(style.pattern){
 case 'checker':f=((x<32)===(y<32))?1:0;break;
 case 'stripes':f=x<32?1:0;break;
 case 'grid':f=x<3||y<3||Math.abs(x-32)<2||Math.abs(y-32)<2?1:0;break;
 case 'brick':f=y%32<3||(x+(y<32?0:32))%64<3?1:0;break;
 case 'noise':{let h=Math.imul(x+1,374761393)^Math.imul(y+1,668265263);h=Math.imul(h^(h>>>13),1274126177);f=(h>>>0)/4294967295;break;}
 }
 const i=(y*n+x)*4;for(let k=0;k<3;k++)pixels[i+k]=Math.round(255+(c[k]-255)*f);pixels[i+3]=255;
 }return pixels;
}

// Store bounded, normalized opaque RGB(A) pixels, not untrusted compressed image bytes or remote URLs.
export const IMAGE_TEXTURE_SIZE=128;
export const MAX_IMAGE_TEXTURES=48;
export type ImageTexture={name:string;data:string;repeatU:number;repeatV:number};
const imageBytes=IMAGE_TEXTURE_SIZE**2*4;
export function readImageTexture(raw:unknown):ImageTexture{
 const t=raw as ImageTexture;
 if(!t||typeof t.name!=='string'||!t.name.trim()||t.name.length>200||typeof t.data!=='string'||t.data.length!==Math.ceil(imageBytes/3)*4||!/^[A-Za-z0-9+/]+==$/.test(t.data)||![t.repeatU,t.repeatV].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=.25&&n<=32))throw Error('Invalid embedded image texture');
 const bytes=atob(t.data);if(bytes.length!==imageBytes||btoa(bytes)!==t.data)throw Error('Invalid image texture pixels');
 return {name:t.name,data:t.data,repeatU:t.repeatU,repeatV:t.repeatV};
}
export function encodeImageTexture(name:string,pixels:Uint8ClampedArray|Uint8Array):ImageTexture{
 if(pixels.length!==imageBytes)throw Error('Unexpected image dimensions');
 let binary='';for(let i=0;i<pixels.length;i+=8192)binary+=String.fromCharCode(...pixels.subarray(i,i+8192));
 return readImageTexture({name:name.slice(0,200),data:btoa(binary),repeatU:1,repeatV:1});
}
export function decodeImageTexture(texture:ImageTexture):Uint8Array<ArrayBuffer>{
 return Uint8Array.from(atob(texture.data),c=>c.charCodeAt(0));
}
