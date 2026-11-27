// Local-only project version control. The user supplies a least-privilege repository token.
import {localJsonError,createUpstreamBudget} from './local-policy.mjs';
const LIMIT=750000;
function send(res,status,data){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}
async function read(stream,max){let size=0;const chunks=[];for await(const c of stream){const b=Buffer.from(c);size+=b.length;if(size>max)throw Error('Size limit');chunks.push(b);}return Buffer.concat(chunks).toString('utf8');}
export function createGithubMiddleware(budget=createUpstreamBudget({maxConcurrent:4,maxStarts:30,windowMs:60000})){
 return (req,res,next)=>{
 if(req.url?.split('?')[0]!=='/api/github/project')return next();
 void handle(req,res,budget).catch(()=>{if(!res.headersSent)send(res,502,{error:'GitHub operation failed.'});else res.end();});
 };
}
export const githubMiddleware=createGithubMiddleware();
async function handle(req,res,budget){
 const denied=localJsonError(req);if(denied)return send(res,denied.status,{error:denied.error});
 let p;try{p=JSON.parse(await read(req,LIMIT*2+10000));}catch{return send(res,400,{error:'Invalid or oversized request'});}
 const validPart=s=>typeof s==='string'&&/^[A-Za-z0-9_.-]{1,100}$/.test(s)&&s!=='.'&&s!=='..';
 if(!p||typeof p.repository!=='string'||p.repository.split('/').length!==2||!p.repository.split('/').every(validPart)||typeof p.path!=='string'||p.path.length>400||!p.path.endsWith('.game-studio.json')||!p.path.split('/').every(validPart)||typeof p.branch!=='string'||!/^[A-Za-z0-9_./-]{1,120}$/.test(p.branch)||p.branch.includes('..')||p.branch.startsWith('/')||!['inspect','save'].includes(p.action)||typeof p.token!=='string'||!p.token||p.token.length>2048||/[\r\n]/.test(p.token))return send(res,400,{error:'Invalid repository, branch, project path or token'});
 if(p.action==='save'){
 if((p.expectedSha!==null&&(typeof p.expectedSha!=='string'||!/^[a-f0-9]{40}$/.test(p.expectedSha)))||typeof p.project!=='string'||Buffer.byteLength(p.project)>LIMIT)return send(res,400,{error:'Inspect the remote file first; maximum project size is 750 KB'});
 try{const project=JSON.parse(p.project);if(project?.version!==1||!Array.isArray(project.entities))throw Error('Not a project');}catch{return send(res,400,{error:'Invalid project file'});}
 }
 const headers={Authorization:'Bearer '+p.token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json','User-Agent':'GameStudio'};
 const path=p.path.split('/').map(encodeURIComponent).join('/');
 const endpoint='https://api.github.com/repos/'+p.repository.split('/').map(encodeURIComponent).join('/')+'/contents/'+path;
 const options={headers,redirect:'error',signal:AbortSignal.timeout(30000)};
 const release=budget.acquire();if(!release)return send(res,429,{error:'Local GitHub request limit reached. Try again later.'});
 try{
 if(p.action==='inspect'){
 const response=await fetch(endpoint+'?ref='+encodeURIComponent(p.branch),options);
 if(response.status===404){await response.body?.cancel();return send(res,200,{exists:false,sha:null});}
 if(!response.ok){await response.body?.cancel();return send(res,502,{error:'GitHub returned HTTP '+response.status});}
 const data=JSON.parse(await read(response.body,LIMIT*2+50000));
 if(data.type!=='file'||data.encoding!=='base64'||typeof data.content!=='string'||!/^[0-9a-f]{40}$/.test(data.sha)||data.size>LIMIT)return send(res,400,{error:'Expected a project JSON file under 750 KB'});
 const content=Buffer.from(data.content,'base64');if(content.length>LIMIT)return send(res,400,{error:'Remote project is too large'});
 return send(res,200,{exists:true,sha:data.sha,project:content.toString('utf8')});
 }
 const body={message:'Game Studio: save project',content:Buffer.from(p.project).toString('base64'),branch:p.branch,...(p.expectedSha?{sha:p.expectedSha}:{})};
 const response=await fetch(endpoint,{...options,method:'PUT',body:JSON.stringify(body)});
 if(!response.ok){await response.body?.cancel();return send(res,response.status===409||response.status===422?409:502,{error:'GitHub returned HTTP '+response.status+'. Inspect the remote file again before retrying.'});}
 const data=JSON.parse(await read(response.body,100000));return send(res,200,{sha:data.content?.sha,commit:data.commit?.sha});
 }finally{release();}
}
