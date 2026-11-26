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
