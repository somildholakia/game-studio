import {test,expect} from '@playwright/test';
import {createServer} from 'vite';
import {generateKeyPairSync,sign} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {createBackupServer} from '../server/backup-api.mjs';
import {createBackupStore} from '../server/backup-store.mjs';
import {createJwtBackupAuthenticator} from '../server/backup-jwt.mjs';
test('editor saves, verifies, restores and isolates private backup history over real HTTP',async({page,browser})=>{
 test.setTimeout(120000);
 const root=await mkdtemp(join(tmpdir(),'studio-cloud-e2e-'));
 const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048}),jwk={...publicKey.export({format:'jwk'}),kid:'current',alg:'RS256',use:'sig'};
 const issuer='https://identity.example.test/',audience='studio-backup';
 const store=createBackupStore(root),authenticate=createJwtBackupAuthenticator({issuer,audience,jwks:{keys:[jwk]},subjects:[{sub:'a',tenant:'a',write:true},{sub:'b',tenant:'b',write:true},{sub:'reader',tenant:'a',write:false}]});
 const encode=(x:object)=>Buffer.from(JSON.stringify(x)).toString('base64url');
 function token(sub:string){const now=Math.floor(Date.now()/1000),raw=encode({alg:'RS256',typ:'at+jwt',kid:'current'})+'.'+encode({iss:issuer,aud:audience,sub,iat:now,exp:now+600,scope:'backup:read backup:write'});return raw+'.'+sign('RSA-SHA256',Buffer.from(raw),privateKey).toString('base64url');}
 const a=token('a'),b=token('b'),reader=token('reader');
 const api=createBackupServer({store,authenticate});api.listen(0,'127.0.0.1');await once(api,'listening');
 const address=api.address();if(!address||typeof address==='string')throw Error('Missing backup service address');
 const origin='http://127.0.0.1:'+address.port;
 const vite=await createServer({logLevel:'silent',server:{host:'127.0.0.1',port:0,strictPort:true,proxy:{'/v1/projects':origin}}});
 await vite.listen(0);const va=vite.httpServer!.address();if(!va||typeof va==='string')throw Error('Missing editor server address');const editor='http://127.0.0.1:'+va.port;
 const guestContext=await browser.newContext();const guest=await guestContext.newPage();
 const dialogs=(p:typeof page)=>p.on('dialog',d=>void d.accept());dialogs(page);dialogs(guest);
 try{
  await page.goto(editor);await page.getByRole('button',{name:'Load Treasure Run'}).click();
  const panel=page.getByRole('group',{name:'Cloud backups',exact:true});await panel.getByText('Connect private backup service').click();
  await panel.getByLabel('Backup access token').fill(a);await panel.getByRole('button',{name:'Refresh backup history'}).click();
  await expect(panel.getByRole('status')).toHaveText('No backup revisions yet.');
  await panel.getByRole('button',{name:'Save current backup'}).click();await expect(panel.getByRole('status')).toHaveText('Saved backup revision 1.');
  await page.getByRole('button',{name:'Load Sky Steps'}).click();
  await panel.getByRole('button',{name:'Save current backup'}).click();await expect(panel.getByRole('status')).toHaveText('Saved backup revision 2.');
  await panel.getByLabel('Backup revision',{exact:true}).selectOption('1');await panel.getByRole('button',{name:'Inspect backup revision'}).click();
  await expect(panel.getByRole('status')).toHaveText('Verified revision 1: Treasure Run');
  await panel.getByRole('button',{name:'Restore as new backup'}).click();await expect(panel.getByRole('status')).toHaveText('Restored as backup revision 3.');
  expect(store.read('a','game',3).sha).toBe(store.read('a','game',1).sha);await expect(page.locator('header')).toContainText('Sky Steps');
  await panel.getByRole('button',{name:'Inspect backup revision'}).click();await expect(panel.getByRole('status')).toHaveText('Verified revision 3: Treasure Run');
  await panel.getByRole('button',{name:'Open verified backup'}).click();await expect(page.locator('header')).toContainText('Treasure Run');
  // Concurrent write bypasses this browser's cached head; the UI must reject it and require refresh.
  store.restore('a','game',1,3);await panel.getByRole('button',{name:'Save current backup'}).click();await expect(panel.getByRole('alert')).toContainText('Remote history changed');
  await expect(panel.getByRole('button',{name:'Save current backup'})).toHaveCount(0);
  await guest.goto(editor);const other=guest.getByRole('group',{name:'Cloud backups',exact:true});await other.getByText('Connect private backup service').click();
  await other.getByLabel('Backup access token').fill(b);await other.getByRole('button',{name:'Refresh backup history'}).click();await expect(other.getByRole('status')).toHaveText('No backup revisions yet.');
  await other.getByLabel('Backup access token').fill(reader);await other.getByRole('button',{name:'Refresh backup history'}).click();await expect(other.getByRole('status')).toHaveText('Loaded 4 backup revisions.');
  await other.getByRole('button',{name:'Save current backup'}).click();await expect(other.getByRole('alert')).toContainText('Backup write permission denied');
  await panel.getByRole('button',{name:'Clear backup credentials'}).click();await expect(panel.getByLabel('Backup access token')).toHaveValue('');
  const local=await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}));expect(local).not.toContain(a);expect(local).not.toContain(b);
 }finally{await guestContext.close();await page.goto('about:blank');await vite.close();api.closeAllConnections();await new Promise<void>(resolve=>api.close(()=>resolve()));await rm(root,{recursive:true,force:true});}
});
