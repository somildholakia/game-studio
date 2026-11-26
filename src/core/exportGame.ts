import type {Project} from './project';
import player from '../generated/player.js?raw';
function base64(text:string):string {
 const bytes=new TextEncoder().encode(text);let binary='';
 for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 return btoa(binary);
}
export function buildGameHtml(project:Project):string {
 if(!project.entities.some(e=>e.role==='player'))throw Error('Add a player before exporting a game.');
 const json=JSON.stringify(project).replace(/</g,'\\u003c');
 const source=base64(player);
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Game Studio Game</title><style>body{margin:0;background:#101620;color:white;font:16px system-ui}canvas{display:block;width:100vw;height:100dvh;touch-action:none}aside{position:fixed;top:12px;left:12px;background:#1c2330;padding:12px;border-radius:8px}button{margin-top:8px;padding:8px}</style></head><body><canvas id="game"></canvas><aside><div id="hud" role="status">Loading…</div><div>WASD / Arrow keys</div><button id="restart">Restart</button></aside><script id="project" type="application/json">${json}</script><script src="data:text/javascript;base64,${source}"></script></body></html>`;
}
export function downloadGame(project:Project):void {
 const url=URL.createObjectURL(new Blob([buildGameHtml(project)],{type:'text/html'}));
 const a=document.createElement('a');a.href=url;a.download='game-studio-game.html';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
