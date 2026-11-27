import {parseProject,type Project} from '../core/project';
import {orderedScenes} from '../core/scenes';
export type CampaignSave={format:'game-studio-progress';version:1;fingerprint:string;levelId:string};
/** Non-cryptographic identity check for local, user-controlled save files.
 * It prevents accidental cross-game loads, not tampering or competitive cheating. */
export function projectFingerprint(project:Project):string{
 const raw=JSON.stringify(parseProject(JSON.stringify(project)));let a=2166136261,b=0x9e3779b9;
 for(let i=0;i<raw.length;i++){const c=raw.charCodeAt(i);a=Math.imul(a^c,16777619);b=Math.imul(b+c,0x85ebca6b)^(b>>>13);}
 return [raw.length.toString(16),(a>>>0).toString(16).padStart(8,'0'),(b>>>0).toString(16).padStart(8,'0')].join('-');
}
export function makeProgress(project:Project,index:number,fingerprint=projectFingerprint(project)):CampaignSave{
 const levels=orderedScenes(project);if(!Number.isInteger(index)||index<0||index>=levels.length)throw Error('Invalid level to save');
 return {format:'game-studio-progress',version:1,fingerprint,levelId:levels[index].id};
}
export function readProgress(raw:string,project:Project,fingerprint=projectFingerprint(project)):number{
 if(raw.length>4096)throw Error('Save file exceeds size limit');
 const s=JSON.parse(raw);if(!s||s.format!=='game-studio-progress'||s.version!==1||typeof s.levelId!=='string'||s.levelId.length>200)throw Error('Invalid game progress file');
 if(s.fingerprint!==fingerprint)throw Error('Save belongs to a different game or version');
 const index=orderedScenes(project).findIndex(l=>l.id===s.levelId);if(index<0)throw Error('Saved level no longer exists');
 return index;
}
