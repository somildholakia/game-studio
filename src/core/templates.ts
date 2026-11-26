import {environmentPresets} from './environment';
import {compileTerrain,defaultTerrain} from './terrain';
import {entity,type Entity,type Project,type Vec3} from './project';
function placed(kind:Entity['kind'],role:NonNullable<Entity['role']>,name:string,position:Vec3,color:string,scale:Vec3=[1,1,1]):Entity {return {...entity(kind),role,name,position,color,scale};}
export function treasureTemplate():Project {
 return {version:1,name:'Treasure Run',entities:[
 placed('ground','decoration','Arena',[0,0,0],'#344d45',[1.5,1,1.5]),
 placed('box','player','Player',[0,.6,-6],'#5ac8fa',[.5,.8,.5]),
 placed('sphere','collectible','Gem A',[-4,.6,0],'#ffce54',[.5,.5,.5]),
 placed('sphere','collectible','Gem B',[4,.6,0],'#ffce54',[.5,.5,.5]),
 placed('box','goal','Exit',[0,.6,6],'#53dc88',[1,.5,1]),
 placed('box','solid','Wall',[0,.75,0],'#8397af',[2,1,.65]),
 placed('box','solid','Left barrier',[-8,.75,0],'#8397af',[.4,1,11]),
 placed('box','solid','Right barrier',[8,.75,0],'#8397af',[.4,1,11]),
 placed('box','solid','Front barrier',[0,.75,8],'#8397af',[11,1,.4]),
 placed('box','solid','Back barrier',[0,.75,-8],'#8397af',[11,1,.4])
 ]};
}

export function platformTemplate():Project{
 return {version:1,name:'Sky Steps',entities:[
 placed('ground','decoration','Start island',[0,0,0],'#355d52',[.35,1,.35]),
 placed('character','player','Explorer',[0,.8,0],'#67b9fa'),
 placed('box','solid','Step 1',[0,.25,3],'#7d90bc',[2,.5,1.4]),
 placed('box','solid','Step 2',[0,.9,5.2],'#7d90bc',[2,.5,1.4]),
 placed('box','solid','Step 3',[0,1.55,7.4],'#7d90bc',[2,.5,1.4]),
 placed('sphere','collectible','Sky gem',[0,2.3,7.4],'#ffce54',[.45,.45,.45]),
 placed('box','solid','Landing',[0,2.15,9.7],'#7d90bc',[2,.5,1.5]),
 placed('box','goal','Finish',[0,2.9,9.7],'#53dc88',[.5,.5,.5])
 ]};
}

export function terrainTemplate():Project{
 const terrain:Entity={...entity('terrain'),name:'Rolling meadow',scale:[2,1,2],terrain:{...defaultTerrain,amplitude:.45,frequency:1.25}};
 const surface=compileTerrain(terrain);
 const at=(x:number,z:number,h:number):Vec3=>[x,(surface.height(x,z)??0)+h,z];
 return {version:1,name:'Meadow Explorer',environment:{...environmentPresets.Day},entities:[terrain,
 placed('character','player','Explorer',at(0,-7,.85),'#6ac3ff'),
 placed('sphere','collectible','Gem A',at(-3,-2,.55),'#ffd052',[.5,.5,.5]),
 placed('sphere','collectible','Gem B',at(3,2,.55),'#ffd052',[.5,.5,.5]),
 placed('box','goal','Exit',at(0,7,.65),'#5be68a',[.8,.7,.8])
 ]};
}

export function adventureCampaign():Project{
 const first=treasureTemplate(),second=terrainTemplate();const ground=second.entities[0],surface=compileTerrain(ground);
 const at=(x:number,z:number,h:number):Vec3=>[x,(surface.height(x,z)??0)+h,z];
 second.entities.push(placed('box','checkpoint','Checkpoint',at(0,-4,.15),'#55bffa',[.8,.2,.8]),placed('box','hazard','Hazard',at(0,0,.15),'#e25757',[1.5,.3,.8]));
 second.logic={autoWin:true,rules:[{id:crypto.randomUUID(),event:'checkpoint',minScore:0,action:{kind:'message',text:'Checkpoint reached'}},{id:crypto.randomUUID(),event:'respawn',minScore:0,action:{kind:'message',text:'Try again'}}]};
 const id=crypto.randomUUID();return {...first,name:'Adventure Campaign',sceneId:'main',sceneName:'Treasure Run',sceneOrder:['main',id],levels:[{id,name:'Meadow Explorer',entities:second.entities,environment:second.environment,logic:second.logic}]};
}

export function physicsTemplate():Project{
 return {version:1,name:'Physics Playground',environment:{...environmentPresets.Day},entities:[
 placed('ground','decoration','Playground',[0,0,0],'#486759',[1.5,1,1.5]),
 placed('character','player','Explorer',[0,.8,-5],'#67b9fa'),
 {...placed('box','dynamic','Pushable crate',[0,.75,-2],'#a9754e'),body:{mass:.6,restitution:.1,friction:2,velocity:[0,0,0]}},
 {...placed('sphere','dynamic','Bouncing ball',[-3,4,1],'#6ac3ff',[.65,.65,.65]),body:{mass:1,restitution:.65,friction:1,velocity:[1,0,0]}},
 {...placed('box','hazard','Moving obstacle',[-4,.5,2],'#e25757',[.7,.65,.7]),patrol:{offset:[8,0,0],period:5}},
 {...placed('sphere','collectible','Moving gem',[-3,.7,5],'#ffce54',[.5,.5,.5]),patrol:{offset:[6,0,0],period:6}},
 placed('box','goal','Exit',[0,.6,8],'#53dc88',[.8,.5,.8]),
 placed('box','solid','Wall',[4,.75,-1],'#8397af',[.5,1,3])
 ]};
}
