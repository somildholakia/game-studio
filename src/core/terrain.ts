import type {Entity} from './project';
export type TerrainSettings={resolution:number;seed:number;amplitude:number;frequency:number};
export const defaultTerrain:TerrainSettings={resolution:32,seed:42,amplitude:.7,frequency:2};
export function readTerrain(raw:unknown):TerrainSettings{
 const t=(raw??defaultTerrain) as TerrainSettings;
 if(!t||!Number.isInteger(t.resolution)||t.resolution<8||t.resolution>64||!Number.isInteger(t.seed)||Math.abs(t.seed)>1000000||typeof t.amplitude!=='number'||!Number.isFinite(t.amplitude)||t.amplitude<0||t.amplitude>5||typeof t.frequency!=='number'||!Number.isFinite(t.frequency)||t.frequency<.25||t.frequency>8)throw Error('Invalid terrain settings');
 return {resolution:t.resolution,seed:t.seed,amplitude:t.amplitude,frequency:t.frequency};
}
export function validTerrainTransform(e:Pick<Entity,'rotation'|'scale'>):boolean{return e.rotation.every(n=>Math.abs(n)<1e-7)&&e.scale.every(n=>Number.isFinite(n)&&n>=.1&&n<=1000);}
export type TerrainGrid={n:number;heights:Float32Array};
const SIZE=12;
export function makeTerrain(settings:TerrainSettings):TerrainGrid{
 const {resolution:n,seed,amplitude,frequency}=settings;const heights=new Float32Array((n+1)*(n+1));
 const phase=seed*.0137;
 for(let z=0;z<=n;z++)for(let x=0;x<=n;x++){
 const u=x/n*frequency*Math.PI*2,v=z/n*frequency*Math.PI*2;
 heights[z*(n+1)+x]=amplitude*(.5*Math.sin(u+phase)*Math.cos(v-phase)+.25*Math.sin(u*.53+v*.81+phase*2)+.15*Math.cos(u*1.5-v*.5+phase));
 }
 return {n,heights};
}
// Same diagonal as the generated triangles: a--b / c--d, shared edge b--c.
export function localHeight(grid:TerrainGrid,x:number,z:number):number|null{
 if(Math.abs(x)>SIZE/2||Math.abs(z)>SIZE/2)return null;
 const n=grid.n,u=(x/SIZE+.5)*n,v=(z/SIZE+.5)*n;
 const i=Math.min(n-1,Math.floor(u)),j=Math.min(n-1,Math.floor(v)),fx=u-i,fz=v-j;
 const a=grid.heights[j*(n+1)+i],b=grid.heights[j*(n+1)+i+1],c=grid.heights[(j+1)*(n+1)+i],d=grid.heights[(j+1)*(n+1)+i+1];
 return fx+fz<=1?a+(b-a)*fx+(c-a)*fz:d+(c-d)*(1-fx)+(b-d)*(1-fz);
}
export function compileTerrain(e:Entity){
 const grid=makeTerrain(readTerrain(e.terrain));const [px,py,pz]=e.position,[sx,sy,sz]=e.scale;
 return {height(x:number,z:number){const h=localHeight(grid,(x-px)/sx,(z-pz)/sz);return h===null?null:py+h*sy;}};
}
export function terrainGeometry(t:TerrainSettings){
 const grid=makeTerrain(t),n=grid.n;const positions:number[]=[],indices:number[]=[],uvs:number[]=[];
 for(let z=0;z<=n;z++)for(let x=0;x<=n;x++){positions.push((x/n-.5)*SIZE,grid.heights[z*(n+1)+x],(z/n-.5)*SIZE);uvs.push(x/n,z/n);}
 for(let z=0;z<n;z++)for(let x=0;x<n;x++){const a=z*(n+1)+x,b=a+1,c=a+n+1,d=c+1;indices.push(a,b,c,b,d,c);}
 return {positions,indices,uvs};
}
