export type Environment={sky:string;ambient:string;ambientIntensity:number;sunColor:string;sunIntensity:number;sunAzimuth:number;sunElevation:number;fogEnabled:boolean;fogColor:string;fogDensity:number};
export const defaultEnvironment:Environment={sky:'#24364b',ambient:'#dce8ff',ambientIntensity:.8,sunColor:'#fff1d9',sunIntensity:2,sunAzimuth:135,sunElevation:55,fogEnabled:false,fogColor:'#9faebf',fogDensity:.025};
export function readEnvironment(raw:unknown):Environment{
 if(raw===undefined)return {...defaultEnvironment};
 const e=raw as Environment;if(!e||typeof e!=='object'||typeof e.fogEnabled!=='boolean')throw Error('Invalid environment');
 function color(key:'sky'|'ambient'|'sunColor'|'fogColor'){const v=e[key];if(typeof v!=='string'||!/^#[0-9a-f]{6}$/i.test(v))throw Error('Invalid environment color');return v;}
 function number(key:'ambientIntensity'|'sunIntensity'|'sunAzimuth'|'sunElevation'|'fogDensity',min:number,max:number){const v=e[key];if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error('Invalid environment setting: '+key);return v;}
 return {sky:color('sky'),ambient:color('ambient'),ambientIntensity:number('ambientIntensity',0,3),sunColor:color('sunColor'),sunIntensity:number('sunIntensity',0,8),sunAzimuth:number('sunAzimuth',-360,360),sunElevation:number('sunElevation',-90,90),fogEnabled:e.fogEnabled,fogColor:color('fogColor'),fogDensity:number('fogDensity',0,.5)};
}
export const environmentPresets:Record<string,Environment>={
 Day:{...defaultEnvironment,sky:'#9bc5e6',ambient:'#c8dfff',sunColor:'#fff4db'},
 Sunset:{...defaultEnvironment,sky:'#a86465',ambient:'#c5a8de',ambientIntensity:.55,sunColor:'#ffaf6a',sunIntensity:2.8,sunElevation:12,fogEnabled:true,fogColor:'#b88b8c',fogDensity:.012},
 Night:{...defaultEnvironment,sky:'#0b132a',ambient:'#7799ee',ambientIntensity:.4,sunColor:'#a5bbff',sunIntensity:.45,sunElevation:40}
};
