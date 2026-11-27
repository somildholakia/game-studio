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

function model(id:string,label:string){
 const json=new TextEncoder().encode(JSON.stringify({asset:{version:'2.0'},meshes:[{primitives:[]}],extras:{label}})),n=Math.ceil(json.length/4)*4;
 const bytes=new Uint8Array(20+n),v=new DataView(bytes.buffer);v.setUint32(0,0x46546c67,true);v.setUint32(4,2,true);v.setUint32(8,bytes.length,true);v.setUint32(12,n,true);v.setUint32(16,0x4e4f534a,true);bytes.fill(32,20);bytes.set(json,20);
 return {id:'sha256:'+id.repeat(64),name:label+'.glb',format:'glb' as const,data:btoa(String.fromCharCode(...bytes))};
}
it('deduplicates identical model content, omits unused assets, and streams only the requested level dependencies',async()=>{
 const p=fixture(),a=model('a','shared'),b=model('b','shared'),c=model('c','other'),unused=model('d','unused');
 p.assets=[a,b,c,unused];p.entities.push({...entity('model'),assetId:a.id},{...entity('model'),assetId:b.id});p.levels![0].entities.push({...entity('model'),assetId:c.id});
 const {manifest,files}=await createHostedCampaign(p);
 expect(manifest.assets).toHaveLength(3);expect(files.filter(f=>f.path.startsWith('assets/'))).toHaveLength(2);
 expect(manifest.assets[0].path).toBe(manifest.assets[1].path);expect(manifest.levels[0].assetIds).toEqual([a.id,b.id]);
 const calls:string[]=[];const fetcher:typeof fetch=async input=>{const path=new URL(String(input)).pathname.slice(1);calls.push(path);return new Response(files.find(f=>f.path===path)?.bytes);};
 const first=await loadHostedLevel(manifest,0,'https://example.test/',undefined,fetcher);
 expect(first.assets).toEqual([a,b]);expect(calls).toEqual(['levels/00.gstudio',manifest.assets[0].path]);
 const second=await loadHostedLevel(manifest,1,'https://example.test/',undefined,fetcher);
 expect(second.assets).toEqual([c]);expect(calls.slice(2)).toEqual(['levels/01.gstudio',manifest.assets[2].path]);
 await expect(loadHostedLevel(manifest,0,'https://example.test/',undefined,async input=>{const path=new URL(String(input)).pathname.slice(1);const bytes=files.find(f=>f.path===path)!.bytes;return new Response(path.startsWith('assets/')?bytes.slice(0,-1):bytes);})).rejects.toThrow('integrity');
});
it('packages 32 levels while retaining only the chosen level in the decoded runtime project',async()=>{
 const p=fixture();const first=p.levels![0];p.levels=Array.from({length:31},(_,i)=>({...structuredClone(first),id:'stage-'+i,name:'Stage '+i}));p.sceneOrder=['a',...p.levels.map(l=>l.id)];
 const {manifest,files}=await createHostedCampaign(p);expect(files).toHaveLength(32);
 const requested:string[]=[];const chosen=await loadHostedLevel(manifest,31,'https://example.test/',undefined,async input=>{const path=new URL(String(input)).pathname.slice(1);requested.push(path);return new Response(files.find(f=>f.path===path)!.bytes);});
 expect(chosen.sceneId).toBe('stage-30');expect(chosen.levels).toEqual([]);expect(requested).toEqual(['levels/31.gstudio']);
});
