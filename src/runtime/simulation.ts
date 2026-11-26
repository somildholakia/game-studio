import type { Entity, Project, Vec3 } from '../core/project';
export type Input = { x: number; z: number };
export type GameState = { position: Vec3; collected: ReadonlySet<string>; won: boolean };
export const PLAYER_RADIUS = 0.35;
export function begin(project: Project): GameState {
 const spawn = project.entities.find(e => e.role === 'player');
 if (!spawn) throw new Error('Add a player spawn before playing.');
 return { position: [...spawn.position], collected: new Set(), won: false };
}
function intersects(position: Vec3, e: Entity, radius: number): boolean {
 // Conservative world-space bounds for rotated primitives; horizontal collision only.
 const hx = Math.abs(e.scale[0]) * .75, hy = Math.abs(e.scale[1]) * .75, hz = Math.abs(e.scale[2]) * .75;
 const [rx,ry,rz]=e.rotation;
 const cx=Math.cos(rx),sx=Math.sin(rx),cy=Math.cos(ry),sy=Math.sin(ry),cz=Math.cos(rz),sz=Math.sin(rz);
 // Babylon yaw/pitch/roll rotation: R_y R_x R_z.
 const ex=Math.abs(cy*cz+sy*sx*sz)*hx+Math.abs(-cy*sz+sy*sx*cz)*hy+Math.abs(sy*cx)*hz;
 const ez=Math.abs(-sy*cz+cy*sx*sz)*hx+Math.abs(sy*sz+cy*sx*cz)*hy+Math.abs(cy*cx)*hz;
 return Math.abs(position[0]-e.position[0]) < ex+radius && Math.abs(position[2]-e.position[2]) < ez+radius;
}
export function step(project:Project,state:GameState,input:Input,dt:number):GameState {
 if(state.won)return state;
 const length=Math.hypot(input.x,input.z);
 const speed=4*Math.min(Math.max(Number.isFinite(dt)?dt:0,0),.05)/Math.max(1,length);
 const p:Vec3=[...state.position];
 const solids=project.entities.filter(e=>e.role==='solid'&&e.kind!=='ground');
 const blocked=(candidate:Vec3)=>solids.some(e=>intersects(candidate,e,PLAYER_RADIUS));
 const x:Vec3=[p[0]+input.x*speed,p[1],p[2]];if(!blocked(x))p[0]=x[0];
 const z:Vec3=[p[0],p[1],p[2]+input.z*speed];if(!blocked(z))p[2]=z[2];
 const collected=new Set(state.collected);
 const pickups=project.entities.filter(e=>e.role==='collectible');
 for(const e of pickups)if(intersects(p,e,PLAYER_RADIUS))collected.add(e.id);
 const won=pickups.every(e=>collected.has(e.id))&&project.entities.some(e=>e.role==='goal'&&intersects(p,e,PLAYER_RADIUS));
 return {position:p,collected,won};
}
