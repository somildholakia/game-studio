import {entity,type Entity,type Project} from './project';
import type {PhysicsSettings} from '../runtime/physicsSettings';
import type {Logic} from '../runtime/rules';
import type {AudioSettings} from '../runtime/audio';
import type {Environment} from './environment';
export type SceneData={id:string;name:string;entities:Entity[];physics?:PhysicsSettings;logic?:Logic;audio?:AudioSettings;environment?:Environment};
export const MAIN_SCENE='main';
export const MAX_SCENES=32;
export function activeScene(p:Project):SceneData{return {id:p.sceneId??MAIN_SCENE,name:p.sceneName??'Level 1',entities:p.entities,physics:p.physics,logic:p.logic,audio:p.audio,environment:p.environment};}
export function orderedScenes(p:Project):SceneData[]{
 const scenes=[activeScene(p),...(p.levels??[])];const map=new Map(scenes.map(s=>[s.id,s]));return (p.sceneOrder??scenes.map(s=>s.id)).map(id=>{const scene=map.get(id);if(!scene)throw Error('Unknown level');return scene;});
}
export function sceneProject(p:Project,s:SceneData):Project{return {...p,entities:s.entities,physics:s.physics,logic:s.logic,audio:s.audio,environment:s.environment,sceneId:s.id,sceneName:s.name,levels:undefined,sceneOrder:undefined};}
export function switchScene(p:Project,id:string):Project{
 const scenes=orderedScenes(p),target=scenes.find(s=>s.id===id);if(!target)throw Error('Unknown level');
 return {...sceneProject(p,target),levels:scenes.filter(s=>s.id!==id),sceneOrder:scenes.map(s=>s.id)};
}
export function addScene(p:Project,name:string):Project{
 const scenes=orderedScenes(p);if(scenes.length>=MAX_SCENES)throw Error('Level limit reached');
 const title=name.trim();if(!title||title.length>200)throw Error('Enter a level name');
 const s:SceneData={id:crypto.randomUUID(),name:title,entities:[entity('ground'),{...entity('character'),role:'player',position:[0,.85,0]}]};
 return {...sceneProject(p,s),levels:scenes,sceneOrder:[...scenes.map(s=>s.id),s.id]};
}
/** Copy a level's authored state, with fresh entity and rule IDs and remapped event sources. */
export function duplicateScene(p:Project,id:string,name?:string):Project{
 const scenes=orderedScenes(p),index=scenes.findIndex(s=>s.id===id);
 if(index<0)throw Error('Unknown level');
 if(scenes.length>=MAX_SCENES)throw Error('Level limit reached');
 const source=scenes[index],title=(name??(source.name.slice(0,195)+' copy')).trim();
 if(!title||title.length>200)throw Error('Enter a level name');
 if(scenes.reduce((total,s)=>total+s.entities.length,0)+source.entities.length>20000)throw Error('Game exceeds the 20,000 entity limit.');
 const copy=structuredClone(source),ids=new Map<string,string>();
 copy.id=crypto.randomUUID();copy.name=title;
 for(const e of copy.entities){const previous=e.id;e.id=crypto.randomUUID();ids.set(previous,e.id);}
 if(copy.logic)for(const rule of copy.logic.rules){
  rule.id=crypto.randomUUID();
  if(rule.sourceId!==undefined){const old=rule.sourceId;
   // Preserve an unresolved target as unresolved rather than broadening it to every object.
   if(!ids.has(old))ids.set(old,crypto.randomUUID());
   rule.sourceId=ids.get(old)!;
  }
 }
 const order=scenes.map(s=>s.id);order.splice(index+1,0,copy.id);
 return {...sceneProject(p,copy),levels:scenes,sceneOrder:order};
}
export function renameScene(p:Project,name:string):Project{const title=name.trim();if(!title||title.length>200)throw Error('Enter a level name');return {...p,sceneId:p.sceneId??MAIN_SCENE,sceneName:title};}
export function moveScene(p:Project,id:string,direction:-1|1):Project{
 const order=orderedScenes(p).map(s=>s.id),i=order.indexOf(id),j=i+direction;if(i<0||j<0||j>=order.length)return p;[order[i],order[j]]=[order[j],order[i]];return {...p,sceneOrder:order};
}
export function removeScene(p:Project,id:string):Project{
 const scenes=orderedScenes(p);if(scenes.length<=1)throw Error('Keep at least one level');if(!scenes.some(s=>s.id===id))throw Error('Unknown level');
 const remaining=scenes.filter(s=>s.id!==id),target=remaining.find(s=>s.id===(p.sceneId??MAIN_SCENE))??remaining[0];
 return {...sceneProject(p,target),levels:remaining.filter(s=>s.id!==target.id),sceneOrder:remaining.map(s=>s.id)};
}
export function campaign(p:Project):Project[]{
 const scenes=orderedScenes(p);for(const s of scenes){if(!s.entities.some(e=>e.role==='player'))throw Error('Add a player to '+s.name);if(scenes.length>1&&!((s.logic?.autoWin??true)&&s.entities.some(e=>e.role==='goal'))&&!s.logic?.rules.some(r=>r.action.kind==='win'))throw Error('Add a goal or win rule to '+s.name);}
 return scenes.map(s=>sceneProject(p,s));
}
