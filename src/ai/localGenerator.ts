import {entity,type Project,type Vec3} from '../core/project';
import {previewPlan,type PlanPreview} from './plan';
export const gameGenres=['treasure','key-quest','timed-collect','checkpoint','campaign'] as const;
export type GameGenre=typeof gameGenres[number];
export type GameRecipe={genre:GameGenre;title:string;difficulty:number;seed:number};
export const genreLabels:Record<GameGenre,string>={'treasure':'Treasure trail','key-quest':'Key and gate quest','timed-collect':'Timed collection','checkpoint':'Checkpoint adventure','campaign':'Two-stage campaign'};
function seeded(seed:number){let state=seed>>>0;return ()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};}
function readRecipe(raw:GameRecipe):GameRecipe{
 if(!raw||!gameGenres.includes(raw.genre)||typeof raw.title!=='string'||!raw.title.trim()||raw.title.trim().length>100||!Number.isSafeInteger(raw.difficulty)||raw.difficulty<1||raw.difficulty>5||!Number.isSafeInteger(raw.seed)||raw.seed<0||raw.seed>0xffffffff)throw Error('Choose a valid genre, title, difficulty (1–5) and unsigned 32-bit seed.');
 return {...raw,title:raw.title.trim()};
}
/** A deterministic recipe generator, not a language model. The shared plan validator
 * is the only route from generated commands to the reviewed project. */
export function generateLocalGame(raw:GameRecipe):PlanPreview{
 const config=readRecipe(raw),rand=seeded(config.seed),commands:object[]=[];
 const palette=['#ffcb63','#50d8a0','#66b8ff','#f599cb','#b6a2ff'];
 const tint=()=>palette[Math.floor(rand()*palette.length)];
 const p:Project={version:1,name:config.title,entities:[
  {...entity('ground'),name:'Game arena',scale:[6,1,6],color:'#344b43'},
  {...entity('box'),name:'Player',role:'player',position:[0,.75,0],color:'#67c8f7'}
 ]};
 const add=(ref:string,name:string,role:string,position:Vec3,patch:object={},kind='box')=>commands.push({op:'add',kind,ref,patch:{name,role,position,color:tint(),...patch}});
 const rule=(id:string,event:string,action:object,extra:object={})=>({id,event,minScore:0,action,...extra});
 const logic=(rules:object[],autoWin=true,extra:object={})=>commands.push({op:'logic',value:{autoWin,rules,...extra}});
 let x=0;
 if(config.genre==='checkpoint'){
  add('checkpoint','Safe checkpoint','checkpoint',[3,.75,0]);
  add('danger','Hazard','hazard',[7,.75,0],{color:'#ed5964'});
  add('exit','Safe exit','goal',[3,.75,6],{color:'#53dc88'});
  logic([],true,{maxLives:Math.max(2,6-config.difficulty)});
 }else{
  const count=config.difficulty+1;
  const rules:object[]=[];
  for(let i=0;i<count;i++){
   x+=Math.round((2.7+rand()*.6)*100)/100;
   const ref='gem'+i;
   add(ref,(config.genre==='key-quest'?'Key ':'Gem ')+(i+1),'collectible',[x,.75,0],{},'sphere');
   rules.push(rule('collect-'+i,'collect',config.genre==='key-quest'?{kind:'counter',key:'keys',mode:'add',amount:1}:{kind:'score',amount:10},{sourceId:'@'+ref}));
  }
  if(config.genre==='key-quest'){
   x+=3;add('door','Locked door','solid',[x,.75,0],{gate:{key:'keys',comparison:'gte',value:count},color:'#9caecb'});
   x+=3;add('exit','Unlocked exit','goal',[x,.75,0],{color:'#53dc88'});
   rules.push(rule('win','goal',{kind:'win'},{sourceId:'@exit',condition:{key:'keys',comparison:'gte',value:count}}));logic(rules,false);
  }else{
   x+=3;add('exit','Finish','goal',[x,.75,0],{color:'#53dc88'});
   if(config.genre==='timed-collect')rules.push(rule('deadline','second',{kind:'lose'},{timing:{start:Math.ceil(x/4)+4,repeat:0}}));
   logic(rules);
  }
  if(config.genre==='campaign'){
   commands.unshift({op:'rename-level',name:'Treasure trail'});
   commands.push({op:'add-level',name:'Final challenge'});
   add('final-gem','Final gem','collectible',[2,.75,0],{},'sphere');add('final-exit','Campaign exit','goal',[4.5,.75,0],{color:'#53dc88'});
   logic([rule('final-score','collect',{kind:'score',amount:50},{sourceId:'@final-gem'})]);
   commands.push({op:'switch-level',id:'main'});
  }
 }
 commands.push({op:'presentation',patch:{hudTitle:config.title,showCounters:config.genre==='key-quest',showTimer:config.genre==='timed-collect'}});
 return previewPlan(p,JSON.stringify({version:1,summary:genreLabels[config.genre]+' · difficulty '+config.difficulty+' · seed '+config.seed,commands}));
}
