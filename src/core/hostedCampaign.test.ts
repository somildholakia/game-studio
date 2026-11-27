import {describe,it,expect} from 'vitest';
import {entity,type Project} from './project';
import {createHostedCampaign,readHostedManifest,loadHostedLevel,hostedProgressProject} from './hostedCampaign';
import {zipHostedFiles} from './hostedZip';
import {projectFingerprint,makeProgress,readProgress} from '../runtime/progress';
function fixture():Project{
 const player=()=>({...entity('box'),role:'player' as const});
 const goal=()=>({...entity('box'),role:'goal' as const});
 return {version:1,name:'Hosted',sceneId:'a',sceneName:'First',sceneOrder:['a','b'],entities:[player(),goal()],levels:[{id:'b',name:'Second',entities:[player(),goal()]}]};
}
describe('streamable hosted game packages',()=>{
 it('fetches only requested compressed levels and preserves offline progress identity',async()=>{
  const p=fixture(),{manifest,files}=await createHostedCampaign(p),calls:string[]=[];
  const fetcher:typeof fetch=async input=>{const url=new URL(String(input));calls.push(url.pathname);const f=files.find(f=>url.pathname==='/game/'+f.path);return f?new Response(f.bytes):new Response(null,{status:404});};
  expect(manifest.fingerprint).toBe(projectFingerprint(p));
  const first=await loadHostedLevel(manifest,0,'https://example.test/game/index.html',undefined,fetcher);
  expect(first.sceneId).toBe('a');expect(first.levels).toEqual([]);expect(calls).toEqual(['/game/levels/00.gstudio']);
  const progress=JSON.stringify(makeProgress(p,1,manifest.fingerprint));
  expect(readProgress(progress,hostedProgressProject(manifest),manifest.fingerprint)).toBe(1);
  expect((await loadHostedLevel(manifest,1,'https://example.test/game/',undefined,fetcher)).sceneId).toBe('b');
  expect(calls).toEqual(['/game/levels/00.gstudio','/game/levels/01.gstudio']);
 });
 it('rejects hostile paths, duplicate identities, oversized descriptors, corrupt/truncated streams and wrong level identity',async()=>{
  const {manifest,files}=await createHostedCampaign(fixture());
  for(const patch of [{path:'https://evil.test/a'},{path:'../a'},{size:8_000_049},{sha256:'x'}])expect(()=>readHostedManifest({...manifest,levels:[{...manifest.levels[0],...patch}]})).toThrow();
  expect(()=>readHostedManifest({...manifest,levels:[manifest.levels[0],{...manifest.levels[1],id:manifest.levels[0].id}]})).toThrow();
  const bytes=files[0].bytes;
  for(const bad of [bytes.slice(0,-1),new Uint8Array(bytes.length+1),bytes.map((b,i)=>i===20?b^1:b)]){
   await expect(loadHostedLevel(manifest,0,'https://example.test/',undefined,async()=>new Response(bad))).rejects.toThrow();
  }
  await expect(loadHostedLevel({...manifest,levels:[{...manifest.levels[0],id:'wrong'}]},0,'https://example.test/',undefined,async()=>new Response(bytes))).rejects.toThrow('identity');
  await expect(loadHostedLevel(manifest,0,'file:///tmp/index.html')).rejects.toThrow('HTTP');
 });
 it('writes a standard ZIP store entry with known CRC and rejects unsafe or duplicate paths',async()=>{
  const bytes=new TextEncoder().encode('123456789'),blob=zipHostedFiles([{path:'index.html',bytes}]),view=new DataView(await blob.arrayBuffer());
  expect(view.getUint32(0,true)).toBe(0x04034b50);expect(view.getUint32(14,true)).toBe(0xcbf43926);expect(view.getUint32(view.byteLength-22,true)).toBe(0x06054b50);
  expect(()=>zipHostedFiles([{path:'../index.html',bytes}])).toThrow();expect(()=>zipHostedFiles([{path:'index.html',bytes},{path:'index.html',bytes}])).toThrow();
 });
});
