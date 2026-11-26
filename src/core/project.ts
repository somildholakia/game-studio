export type Vec3 = [number, number, number];
export const roles=['decoration','player','solid','collectible','goal'] as const;
export type Role=typeof roles[number];
export type Entity = { id: string; name: string; kind: 'box'|'sphere'|'ground'; position: Vec3; rotation: Vec3; scale: Vec3; color: string; role?:Role };
export type Project = { version: 1; name: string; entities: Entity[] };
export function entity(kind: Entity['kind']): Entity {
 return {id: crypto.randomUUID(), name: kind, kind, position:[0,kind==='ground'?0:1,0],rotation:[0,0,0],scale:[1,1,1],color:'#6688bb',role:'decoration'};
}
export function initialProject(): Project { return {version:1,name:'Untitled world',entities:[entity('ground'),entity('box')]}; }
export function replaceEntity(p:Project,e:Entity):Project {return {...p,entities:p.entities.map(x=>x.id===e.id?e:e.role==='player'&&e.role===x.role?{...x,role:'decoration'}:x)};}
export function duplicateEntity(e:Entity):Entity {return {...e,id:crypto.randomUUID(),name:e.name+' copy',role:e.role==='player'?'decoration':e.role,position:[e.position[0]+1,e.position[1],e.position[2]],rotation:[...e.rotation],scale:[...e.scale]};}
const vec=(v:unknown):v is Vec3=>Array.isArray(v)&&v.length===3&&v.every(n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=100000);
export function parseProject(raw:string):Project {
 const p=JSON.parse(raw);
 if (!p||p.version!==1||typeof p.name!=='string'||p.name.length>200||!Array.isArray(p.entities)||p.entities.length>10000) throw Error('Invalid project');
 const ids=new Set<string>();let players=0;
 for(const e of p.entities){if(!e||typeof e.id!=='string'||ids.has(e.id)||typeof e.name!=='string'||e.name.length>200||!['box','sphere','ground'].includes(e.kind)||!vec(e.position)||!vec(e.rotation)||!vec(e.scale)||typeof e.color!=='string'||!/^#[0-9a-f]{6}$/i.test(e.color)||(e.role!==undefined&&!roles.includes(e.role))||(e.kind==='ground'&&e.role&&e.role!=='decoration'))throw Error('Invalid entity');ids.add(e.id);if(e.role==='player'&&++players>1)throw Error('Only one player is allowed');}
 return {version:1,name:p.name,entities:p.entities.map((e:Entity)=>({id:e.id,name:e.name,kind:e.kind,position:e.position,rotation:e.rotation,scale:e.scale,color:e.color,role:e.role??'decoration'}))};
}
