import {test,expect} from '@playwright/test';
import {createServer} from 'vite';
test('two browser clients play a shared authoritative race without replacing authored projects',async({page,browser})=>{
 test.setTimeout(120000);
 const server=await createServer({logLevel:'silent',server:{host:'127.0.0.1',port:0,strictPort:true}});
 await server.listen(0);
 const address=server.httpServer!.address();if(!address||typeof address==='string')throw Error('Missing local race server address');
 const origin='http://127.0.0.1:'+address.port;
 const guestContext=await browser.newContext();const guest=await guestContext.newPage();
 const object=(id:string,role:string,position:number[])=>({id,name:id,kind:'box',role,position,rotation:[0,0,0],scale:[1,1,1],color:'#55aacc'});
 const project={version:1,name:'Shared race fixture',entities:[object('spawn','player',[0,.75,0]),object('gem','collectible',[2,.75,0]),object('exit','goal',[4,.75,0])]};
 try{
  await page.goto(origin);await expect(page.getByRole('button',{name:'▶ Play',exact:true})).toBeEnabled({timeout:45000});
  await page.locator('header input[type=file]').setInputFiles({name:'race.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});
  await expect(page.locator('header')).toContainText('Shared race fixture');
  await page.getByRole('button',{name:'▶ Play',exact:true}).click();
  await page.getByRole('button',{name:'Use shared race tools'}).click();
  const host=page.getByRole('group',{name:'Shared local race'});
  await host.getByLabel('Race display name').fill('Alice');await host.getByRole('button',{name:'Create shared race'}).click();
  await expect(host.getByRole('status')).toHaveText('Waiting for start',{timeout:20000});
  const code=await host.locator('strong').textContent();expect(code).toMatch(/^[a-f0-9]{8}$/);
  await guest.goto(origin);await expect(guest.getByRole('button',{name:'▶ Play',exact:true})).toBeEnabled({timeout:45000});
  await guest.getByRole('button',{name:'Load Treasure Run'}).click();
  await guest.getByRole('button',{name:'▶ Play',exact:true}).click();
  await guest.getByRole('button',{name:'Use shared race tools'}).click();
  const other=guest.getByRole('group',{name:'Shared local race'});
  await other.getByLabel('Race display name').fill('Bob');await other.getByLabel('Shared race code').fill(code!);
  await other.getByRole('button',{name:'Join shared race'}).click();
  await expect(other.getByRole('status')).toHaveText('Waiting for start',{timeout:20000});
  await expect(guest.locator('.game-hud')).toContainText('Collectibles 0 / 1');
  await expect(host.getByRole('button',{name:'Start shared race'})).toBeEnabled();
  await expect(other.getByRole('button',{name:'Start shared race'})).toHaveCount(0);
  await host.getByRole('button',{name:'Start shared race'}).click();
  await expect(host.getByRole('status')).toHaveText('Race running');
  await expect(other.getByRole('status')).toHaveText('Race running');
  await page.bringToFront();await page.locator('canvas').focus();await page.keyboard.down('d');
  try{await expect(host.getByRole('status')).toHaveText('Race finished: You won',{timeout:15000});}finally{await page.keyboard.up('d');}
  await expect(other.getByRole('status')).toHaveText('Race finished: Alice',{timeout:15000});
  await expect(host.getByText('Alice (you) · gems claimed: 1')).toBeVisible();
  await expect(other.getByText('Bob (you) · gems claimed: 0')).toBeVisible();
  await expect(page.locator('.game-hud')).toContainText('Level complete!');
  await other.getByRole('button',{name:'Leave shared race'}).click();
  await expect(guest.locator('.game-hud')).toContainText('Collectibles 0 / 2');
  await guest.getByRole('button',{name:'■ Stop',exact:true}).click();
  await expect(guest.locator('header')).toContainText('Treasure Run');
 }finally{await guestContext.close();await page.goto('about:blank');await server.close();}
});
