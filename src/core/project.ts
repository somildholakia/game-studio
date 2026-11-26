export type Vec3 = [number, number, number];
export type Entity = { id: string; name: string; kind: 'box'|'sphere'|'ground'; position: Vec3; rotation: Vec3; scale: Vec3; color: string };
export type Project = { version: 1; name: string; entities: Entity[] };
export function entity(kind: Entity['kind']): Entity {
 return {id: crypto.randomUUID(), name: kind, kind, position:[0,kind==='ground'?0:1,0],rotation:[0,0,0],scale:[1,1,1],color:'#6688bb'};
}
export function initialProject(): Project { return {version:1,name:'Untitled world',entities:[entity('ground'),entity('box')]}; }
export function replaceEntity(p:Project,e:Entity):Project {return {...p,entities:p.entities.map(x=>x.id===e.id?e:x)};}
const vec=(v:unknown):v is Vec3=>Array.isArray(v)&&v.length===3&&v.every(n=>typeof n==='number'&&Number.isFinite(n));
export function parseProject(raw:string):Project {
 const p=JSON.parse(raw); 
 if (!p||p.version!==1||typeof p.name!=='string'||!Array.isArray(p.entities)||p.entities.length>10000) throw Error('Invalid project');
 const ids=new Set<string>();
 for(const e of p.entities){if(!e||typeof e.id!=='string'||ids.has(e.id)||typeof e.name!=='string'||!['box','sphere','ground'].includes(e.kind)||!vec(e.position)||!vec(e.rotation)||!vec(e.scale)||!/^#[0-9a-f]{6}$/i.test(e.color))throw Error('Invalid entity');ids.add(e.id);}
 return p;
}
