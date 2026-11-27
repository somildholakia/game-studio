import {touchMarkup} from '../runtime/controls';
import {campaign} from './scenes';
import type {Project} from './project';
import player from '../generated/player.js?raw';
function base64(text:string):string {
 const bytes=new TextEncoder().encode(text);let binary='';
 for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 return btoa(binary);
}
export function buildGameHtml(project:Project):string {
 campaign(project);
 const json=JSON.stringify(project).replace(/</g,'\\u003c');
 const source=base64(player);
 // Text-only title; the project JSON is separately escaped against script termination.
 const title=(project.name.trim()||'Game Studio Game').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
 // Published games are self-contained. Allow their embedded runtime and local asset blobs,
 // but deny external network connections, remote scripts and plugin objects.
 const policy="default-src 'none'; script-src data:; style-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; connect-src data: blob:; worker-src blob:; object-src 'none'; base-uri 'none'; form-action 'none'";
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${policy}"><title>${title}</title><style>body{margin:0;background:#101620;color:white;font:16px system-ui}canvas{display:block;width:100vw;height:100dvh;touch-action:none}aside{position:fixed;top:12px;left:12px;background:#1c2330;padding:12px;border-radius:8px}button{margin-top:8px;padding:8px}.touch-controls{position:fixed;bottom:16px;left:16px;right:16px;display:flex;gap:8px;justify-content:center;touch-action:none}[hidden]{display:none!important}.touch-controls button{min-width:42px;min-height:44px;background:#263b54;color:#fff;border:1px solid #7994b3;border-radius:8px;touch-action:none;user-select:none}.touch-controls button:active{background:#426d9a}</style></head><body><canvas id="game" tabindex="0" aria-label="3D game viewport"></canvas><aside><div id="hud" role="status">Loading…</div><div id="timer" role="timer" aria-live="off" hidden></div><div>WASD / Arrow keys · Space to jump</div><div id="pause-notice" role="status" hidden>Paused</div><button id="pause">Pause</button><button id="restart">Restart</button><button id="next-level" hidden>Next level</button><div id="progress-controls" hidden><button id="save-progress">Save progress</button><label>Load progress <input id="load-progress" type="file" accept=".json,application/json"></label><p id="progress-notice" aria-live="polite"></p></div></aside><div id="touch-controls" class="touch-controls" aria-label="Game touch controls">${touchMarkup}</div><script id="project" type="application/json">${json}</script><script src="data:text/javascript;base64,${source}"></script></body></html>`;
}
export function downloadGame(project:Project):void {
 const url=URL.createObjectURL(new Blob([buildGameHtml(project)],{type:'text/html'}));
 const a=document.createElement('a');a.href=url;a.download='game-studio-game.html';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
