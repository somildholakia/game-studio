// Manual opt-in only: real provider calls may cost money. Not part of normal CI.
import {it,expect} from 'vitest';
import {createServer} from 'node:http';
import type {AddressInfo} from 'node:net';
import {mkdir,writeFile} from 'node:fs/promises';
import {createAiMiddleware} from '../server/ai-proxy.mjs';
import {entity,parseProject,type Project} from '../src/core/project';
import {buildPlanPrompt,previewPlan} from '../src/ai/plan';
import {campaign} from '../src/core/scenes';
import {diagnose} from '../src/core/diagnostics';
import {begin,advance,compileWorld,type GameState,type Input} from '../src/runtime/simulation';
const base=():Project=>({version:1,name:'Synthetic AI evaluation',entities:[{...entity('ground'),scale:[4,1,4]},{...entity('box'),id:'player',role:'player',position:[0,.75,0]}]});
const right={x:1,z:0},left={x:-1,z:0},still={x:0,z:0};
function run(p:Project,input:Input,seconds:number,state=begin(p)):GameState{const world=compileWorld(p);for(let i=0;i<Math.round(seconds*20);i++)state=advance(world,state,input,.05);return state;}
type Case={name:string;task:string;verify:(levels:Project[])=>boolean};
const cases:Case[]=[
 {name:'key-gate',task:'Build a single-level key quest. Place a collectible key at [2,0.75,0], a solid locked gate at [4,0.75,0], and a goal at [7,0.75,0]. The scoped collect rule increments counter keys, the gate opens at keys >= 1, and the scoped goal rule wins only with the key. autoWin false. Use plan-local references for new objects. Keep the existing player.',verify:([p])=>{if(!p.entities.some(e=>e.role==='solid'&&e.gate?.key==='keys'))return false;const a=begin(p),b=run(p,right,5);return !a.won&&a.openGates.size===0&&b.won&&b.logic.counters?.keys===1&&b.openGates.size>0;}},
 {name:'timed-survival',task:'Make a challenge that wins only when three simulated seconds have passed, using a second rule with timing start 3 and repeat 0. No movement should be required. Set autoWin false. Keep the existing player.',verify:([p])=>{const early=run(p,still,2);return !early.won&&run(p,still,2,early).won;}},
 {name:'scoped-scoring',task:'Place a decoy collectible at [2,0.75,0], a prize collectible at [-3,0.75,0], and an exit goal at [-6,0.75,0]. The prize alone awards 10 points via a scoped collect rule. The scoped exit rule wins only at score >= 10. autoWin false. Keep the player and use plan-local references.',verify:([p])=>{const a=run(p,right,.6),b=run(p,left,3);return a.collected.size===1&&a.logic.score===0&&!a.won&&b.logic.score===10&&b.won;}},
 {name:'two-level-campaign',task:'Make a two-level campaign. Rename the current level Intro, keep the existing player, and add a goal at [3,0.75,0]. Add a new level Finale with a goal at [3,0.75,0] and its default player. Both stages should be independently winnable by moving right with no other conditions.',verify:levels=>levels.length===2&&levels.every(p=>run(p,right,2).won)},
 {name:'trigger-puzzle',task:'Place an invisible box trigger zone at [2,0.75,0]. Use a scoped zone-enter rule to set counter entered to 1, and a scoped zone-exit rule with condition entered == 1 to win. autoWin false. Keep the existing player. Use plan-local refs.',verify:([p])=>{const inside=run(p,right,.5);return !run(p,left,1).won&&!inside.won&&inside.logic.counters?.entered===1&&run(p,right,1,inside).won;}}
];
it('evaluates five synthetic games through a live chosen provider, validator and simulation',async()=>{
 const provider=process.env.GAME_STUDIO_AI_PROVIDER,model=process.env.GAME_STUDIO_AI_MODEL;
 if(process.env.GAME_STUDIO_LIVE_AI!=='1'||!provider||!['openai','openrouter','anthropic'].includes(provider)||!model)throw Error('Explicit live opt-in, provider, model and a locally configured provider key are required.');
 const keyName={openai:'OPENAI_API_KEY',openrouter:'OPENROUTER_API_KEY',anthropic:'ANTHROPIC_API_KEY'}[provider]!;
 if(!process.env[keyName])throw Error('Configure the chosen provider key in the local environment first.');
 const middleware=createAiMiddleware(),server=createServer((req,res)=>middleware(req,res,()=>{res.writeHead(404);res.end();}));
 await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const origin='http://127.0.0.1:'+(server.address() as AddressInfo).port;
 const results:{name:string;status:string;elapsedMs:number}[]=[];
 try{
 for(const c of cases){
  const start=performance.now();let status='request-failed';
  try{
   const p=base();const response=await fetch(origin+'/api/ai/plan',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({provider,model,context:buildPlanPrompt(p),task:c.task}),signal:AbortSignal.timeout(95000)});
   if(!response.ok){status='provider-http-'+response.status;continue;}
   const body=await response.json();status='invalid-plan';
   const next=parseProject(JSON.stringify(previewPlan(p,body.plan).next));
   status='structural-failure';if(diagnose(next).some(d=>d.severity==='error'))continue;
   status='gameplay-failure';if(!c.verify(campaign(next)))continue;
   status='pass';
  }catch{/* Retain only the controlled status, not provider output, request bodies or errors. */}
  finally{results.push({name:c.name,status,elapsedMs:Math.round(performance.now()-start)});}
 }
 }finally{
  await new Promise<void>(resolve=>{server.close(()=>resolve());server.closeAllConnections();});
  await mkdir('reports',{recursive:true});await writeFile('reports/live-ai-evaluation.json',JSON.stringify({provider,model,scope:'synthetic five-case live evaluation; no user project data',results},null,2)+'\n');
 }
 expect(results.map(r=>r.status)).toEqual(cases.map(()=> 'pass'));
},600000);
