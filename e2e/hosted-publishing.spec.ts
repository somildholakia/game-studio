import {test,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import type {AddressInfo} from 'node:net';
import {createHash} from 'node:crypto';
import {entity} from '../src/core/project';
import {meshToGlb} from '../src/core/glbExport';
function unzipStored(bytes:Buffer):Map<string,Buffer>{
 const files=new Map<string,Buffer>();let offset=0;
 while(offset+30<=bytes.length&&bytes.readUInt32LE(offset)===0x04034b50){
  const size=bytes.readUInt32LE(offset+18),nameLength=bytes.readUInt16LE(offset+26),extra=bytes.readUInt16LE(offset+28);
  expect(bytes.readUInt16LE(offset+8)).toBe(0);
  const name=bytes.toString('utf8',offset+30,offset+30+nameLength),start=offset+30+nameLength+extra;
  files.set(name,bytes.subarray(start,start+size));offset=start+size;
 }
 return files;
}
test('download and host a generated campaign, stream levels lazily, reject a corrupt level and retry',async({page})=>{
 const player=(id:string)=>({id,name:'Player',kind:'box',position:[0,1,0],rotation:[0,0,0],scale:[1,1,1],color:'#6688bb',role:'player'});
 const logic={autoWin:false,rules:[{id:'win',event:'start',minScore:0,action:{kind:'win'}}]};
 const asset=(name:string,color:string)=>{const bytes=meshToGlb({...entity('mesh'),color});const hash=createHash('sha256').update(bytes).digest('hex');return {id:'sha256:'+hash,name,format:'glb',data:Buffer.from(bytes).toString('base64')};};
 const a=asset('first.glb','#ff8844'),b=asset('second.glb','#44aaff');const model=(id:string,assetId:string)=>({...entity('model'),id,assetId,position:[3,1,3]});
 const fixture={version:1,name:'Hosted campaign test',sceneId:'a',sceneName:'First stage',sceneOrder:['a','b'],assets:[a,b],entities:[player('p1'),model('m1',a.id)],logic,levels:[{id:'b',name:'Second stage',entities:[player('p2'),model('m2',b.id)],logic}]};
 await page.goto('/');await page.locator('header input[type=file]').setInputFiles({name:'campaign.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});
 await expect(page.locator('header')).toContainText('Hosted campaign test');
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export hosted website ZIP'}).click();const archive=await download;
 const files=unzipStored(await readFile((await archive.path())!));
 const assetA='assets/'+a.id.slice(7)+'.gstudio',assetB='assets/'+b.id.slice(7)+'.gstudio';
 expect([...files.keys()]).toEqual(['index.html','player.js',assetA,assetB,'levels/00.gstudio','levels/01.gstudio']);
 const requests:string[]=[];let corrupt=true;
 const server=createServer((req,res)=>{
  const name=(req.url??'').replace(/^\/game\//,'');const bytes=files.get(name);
  if(!bytes){res.writeHead(404);res.end();return;}
  requests.push(name);const body=corrupt&&name==='levels/01.gstudio'?Buffer.from(bytes.map((b,i)=>i===20?b^1:b)):bytes;
  res.writeHead(200,{'Content-Type':name.endsWith('.html')?'text/html':name.endsWith('.js')?'application/javascript':'application/octet-stream','Cache-Control':'no-store'});res.end(body);
 });
 await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 try{
  await page.goto('http://127.0.0.1:'+(server.address() as AddressInfo).port+'/game/index.html');
  await expect(page.locator('#hud')).toContainText('First stage');
  await expect(page.getByRole('button',{name:'Next level'})).toBeVisible();expect(requests.filter(x=>x.endsWith('.gstudio'))).toEqual(['levels/00.gstudio',assetA]);
  await page.getByRole('button',{name:'Next level'}).click();
  await expect(page.locator('#progress-notice')).toContainText('integrity mismatch');await expect(page.locator('#hud')).toContainText('First stage');
  corrupt=false;await page.getByRole('button',{name:'Next level'}).click();await expect(page.locator('#hud')).toContainText('Game complete!');
  expect(requests.filter(x=>x.endsWith('.gstudio'))).toEqual(['levels/00.gstudio',assetA,'levels/01.gstudio','levels/01.gstudio',assetB]);
 }finally{await new Promise<void>(resolve=>{server.close(()=>resolve());server.closeAllConnections();});}
});
