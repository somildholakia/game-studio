import {describe,it,expect,vi,afterEach} from 'vitest';
import {Readable} from 'node:stream';
import {aiMiddleware} from '../../server/ai-proxy.mjs';
import {githubMiddleware} from '../../server/github-proxy.mjs';
afterEach(()=>vi.unstubAllGlobals());
function call(middleware,url,input,{origin='http://127.0.0.1:5173',address='127.0.0.1'}={}){
 return new Promise((resolve,reject)=>{
 const req=Readable.from([JSON.stringify(input)]);req.url=url;req.method='POST';req.socket={remoteAddress:address};req.headers={host:'127.0.0.1:5173',origin,'content-type':'application/json'};
 let status;const res={headersSent:false,writeHead(s){status=s;this.headersSent=true;},end(body){resolve({status,body:JSON.parse(body)});}};
 middleware(req,res,()=>reject(Error('Middleware did not handle request')));
 });
}
describe('local provider gateways',()=>{
 it('rejects cross-origin AI calls before contacting the provider',async()=>{const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);const r=await call(aiMiddleware,'/api/ai/plan',{}, {origin:'https://untrusted.example'});expect(r.status).toBe(403);expect(fetcher).not.toHaveBeenCalled();});
 it('forwards an explicit OpenAI request and returns an unexecuted plan',async()=>{const plan='{"version":1,"summary":"Test","commands":[]}';const fetcher=vi.fn(async()=>new Response(JSON.stringify({choices:[{message:{content:plan}}]}),{status:200}));vi.stubGlobal('fetch',fetcher);const r=await call(aiMiddleware,'/api/ai/plan',{provider:'openai',model:'test-model',apiKey:'test-secret',context:'Test schema',task:'Create a level'});expect(r).toEqual({status:200,body:{plan}});expect(fetcher.mock.calls[0][0]).toBe('https://api.openai.com/v1/chat/completions');expect(fetcher.mock.calls[0][1].headers.Authorization).toBe('Bearer test-secret');expect(JSON.stringify(r)).not.toContain('test-secret');});
 it('rejects unsupported provider endpoints',async()=>{const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);const r=await call(aiMiddleware,'/api/ai/plan',{provider:'https://other.example',model:'test',context:'x',task:'x'});expect(r.status).toBe(400);expect(fetcher).not.toHaveBeenCalled();});
 it('requires same-origin GitHub calls and checks file paths',async()=>{const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);expect((await call(githubMiddleware,'/api/github/project',{}, {address:'192.0.2.1'})).status).toBe(403);expect((await call(githubMiddleware,'/api/github/project',{repository:'owner/repo',branch:'main',path:'.github/workflows/test.yml',action:'save',token:'test'})).status).toBe(400);expect(fetcher).not.toHaveBeenCalled();});
 it('uses a commit SHA for GitHub optimistic concurrency',async()=>{const sha='a'.repeat(40);const fetcher=vi.fn(async()=>new Response(JSON.stringify({content:{sha:'b'.repeat(40)},commit:{sha:'c'.repeat(40)}}),{status:200}));vi.stubGlobal('fetch',fetcher);const r=await call(githubMiddleware,'/api/github/project',{repository:'owner/repo',branch:'main',path:'world.game-studio.json',action:'save',token:'test',expectedSha:sha,project:JSON.stringify({version:1,entities:[]})});expect(r.status).toBe(200);expect(JSON.parse(fetcher.mock.calls[0][1].body).sha).toBe(sha);});
});
