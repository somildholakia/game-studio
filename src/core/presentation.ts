export type Presentation={camera:'follow'|'overhead';distance:number;hudTitle:string;hudColor:string;showScore:boolean;showCollectibles:boolean;showMessages:boolean;showCounters?:boolean};
export const defaultPresentation:Presentation={camera:'follow',distance:12,hudTitle:'',hudColor:'#e6eaf2',showScore:true,showCollectibles:true,showMessages:true,showCounters:false};
export function readPresentation(raw:unknown):Presentation{
 if(raw===undefined)return {...defaultPresentation};
 const p=raw as Presentation;
 if(!p||!['follow','overhead'].includes(p.camera)||typeof p.distance!=='number'||!Number.isFinite(p.distance)||p.distance<4||p.distance>40||typeof p.hudTitle!=='string'||p.hudTitle.length>100||typeof p.hudColor!=='string'||!/^#[0-9a-f]{6}$/i.test(p.hudColor)||typeof p.showScore!=='boolean'||typeof p.showCollectibles!=='boolean'||typeof p.showMessages!=='boolean'||(p.showCounters!==undefined&&typeof p.showCounters!=='boolean'))throw Error('Invalid game presentation');
 return {camera:p.camera,distance:p.distance,hudTitle:p.hudTitle,hudColor:p.hudColor,showScore:p.showScore,showCollectibles:p.showCollectibles,showMessages:p.showMessages,...(p.showCounters!==undefined?{showCounters:p.showCounters}:{})};
}
export type HudState={won:boolean;collected:number;total:number;score:number;message:string;counters?:Record<string,number>};
export function hudLines(settings:Presentation,state:HudState):string[]{
 return [settings.hudTitle,state.won?'Level complete!':settings.showCollectibles?'Collectibles '+state.collected+' / '+state.total:'',settings.showScore?'Score: '+state.score:'',settings.showMessages?state.message:'',...(settings.showCounters?Object.entries(state.counters??{}).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>k+': '+v):[])].filter(Boolean);
}
