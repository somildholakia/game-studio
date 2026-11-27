import type {RuntimeProfile} from './runtimeProfile';
export type GraphicsSettings={renderScale:number;shadows:boolean;shadowSize:512|1024|2048};
export const defaultGraphics:GraphicsSettings={renderScale:1,shadows:false,shadowSize:1024};
export function readGraphics(raw:unknown):GraphicsSettings{
 if(raw===undefined)return {...defaultGraphics};
 const g=raw as GraphicsSettings;
 if(!g||typeof g.renderScale!=='number'||!Number.isFinite(g.renderScale)||g.renderScale<.5||g.renderScale>1||typeof g.shadows!=='boolean'||![512,1024,2048].includes(g.shadowSize))throw Error('Invalid graphics settings');
 return {renderScale:g.renderScale,shadows:g.shadows,shadowSize:g.shadowSize};
}
export type RenderMetrics={fps:number;meshes:number;vertices:number;width:number;height:number;runtime?:RuntimeProfile};
