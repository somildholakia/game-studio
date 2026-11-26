import {parseProject,type Project} from './project';
const KEY='game-studio:project:v1';
export function restore():Project|null {const raw=localStorage.getItem(KEY);return raw?parseProject(raw):null;}
export function persist(project:Project):void {localStorage.setItem(KEY,JSON.stringify(project));}
