export type Presentation={camera:'follow'|'overhead';distance:number;hudTitle:string;hudColor:string;showScore:boolean;showCollectibles:boolean;showMessages:boolean;showCounters?:boolean;showTimer?:boolean};
export const defaultPresentation:Presentation={camera:'follow',distance:12,hudTitle:'',hudColor:'#e6eaf2',showScore:true,showCollectibles:true,showMessages:true,showCounters:false,showTimer:false};
export function readPresentation(raw:unknown):Presentation{
 if(raw===undefined)return {...defaultPresentation};
 const p=raw as Presentation;
 if(!p||!['follow','overhead'].includes(p.camera)||typeof p.distance!=='number'||!Number.isFinite(p.distance)||p.distance<4||p.distance>40||typeof p.hudTitle!=='string'||p.hudTitle.length>100||typeof p.hudColor!=='string'||!/^#[0-9a-f]{6}$/i.test(p.hudColor)||typeof p.showScore!=='boolean'||typeof p.showCollectibles!=='boolean'||typeof p.showMessages!=='boolean'||(p.showCounters!==undefined&&typeof p.showCounters!=='boolean')||(p.showTimer!==undefined&&typeof p.showTimer!=='boolean'))throw Error('Invalid game presentation');
 return {camera:p.camera,distance:p.distance,hudTitle:p.hudTitle,hudColor:p.hudColor,showScore:p.showScore,showCollectibles:p.showCollectibles,showMessages:p.showMessages,...(p.showCounters!==undefined?{showCounters:p.showCounters}:{}),...(p.showTimer!==undefined?{showTimer:p.showTimer}:{})};
}
export type HudState={won:boolean;lost?:boolean;livesRemaining?:number;collected:number;total:number;score:number;message:string;counters?:Record<string,number>};
export function hudLines(settings:Presentation,state:HudState):string[]{
 return [settings.hudTitle,state.lost?'Game over!':state.won?'Level complete!':settings.showCollectibles?'Collectibles '+state.collected+' / '+state.total:'',settings.showScore?'Score: '+state.score:'',state.livesRemaining!==undefined?'Lives: '+state.livesRemaining:'',settings.showMessages?state.message:'',...(settings.showCounters?Object.entries(state.counters??{}).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>k+': '+v):[])].filter(Boolean);
}

/** Whole simulated seconds, deliberately independent of wall clock. */
export function timerText(seconds:number=0):string{
 const total=Number.isFinite(seconds)?Math.max(0,Math.floor(seconds)):0;
 return 'Time: '+Math.floor(total/60)+':'+String(total%60).padStart(2,'0');
}
