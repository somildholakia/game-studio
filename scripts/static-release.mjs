import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,readdirSync,lstatSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const manifestName='release-manifest.json';
function hash(bytes){return createHash('sha256').update(bytes).digest('hex');}
export function buildManifest(root,revision){
 if(typeof revision!=='string'||!(/^[a-f0-9]{40}$/.test(revision)||revision==='local'))throw Error('Invalid release revision');
 const files=[];
 function walk(relative=''){
  for(const entry of readdirSync(join(root,relative),{withFileTypes:true})){
   const path=relative?relative+'/'+entry.name:entry.name;
   if(path===manifestName){if(!entry.isFile())throw Error('Invalid manifest file');continue;}
   if(entry.isDirectory())walk(path);
   else if(entry.isFile()){const bytes=readFileSync(join(root,path));files.push({path,bytes:bytes.length,sha256:hash(bytes)});}
   else throw Error('Unexpected non-regular release path: '+path);
  }
 }
 walk();files.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
 if(!files.some(f=>f.path==='index.html')||!files.some(f=>f.path.endsWith('.js')))throw Error('Missing editor HTML or JavaScript');
 return {format:'game-studio-static-release',version:1,revision,files};
}
export function writeManifest(root,revision){const manifest=buildManifest(root,revision);writeFileSync(join(root,manifestName),JSON.stringify(manifest,null,2)+'\n');return manifest;}
export function verifyManifest(root){
 const path=join(root,manifestName);if(!lstatSync(path).isFile())throw Error('Invalid release manifest path');
 const manifest=JSON.parse(readFileSync(path,'utf8'));
 const actual=buildManifest(root,manifest.revision);
 if(JSON.stringify(manifest)!==JSON.stringify(actual))throw Error('Release contents do not match manifest');
 return actual;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const mode=process.argv[2],root=process.argv[3]??'dist';
 if(mode!=='write'&&mode!=='verify')throw Error('Usage: node scripts/static-release.mjs write|verify [directory]');
 const result=mode==='write'?writeManifest(root,process.env.GITHUB_SHA??'local'):verifyManifest(root);
 console.log(mode+': '+result.files.length+' release files at '+result.revision);
}
