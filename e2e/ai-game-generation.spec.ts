import {test,expect} from '@playwright/test';
import {copyFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
test('mocked BYOK response generates a reviewed, playable and exported key quest',async({page},testInfo)=>{
 const base={version:1,name:'AI quest benchmark',entities:[
  {id:'ground',name:'Ground',kind:'ground',role:'decoration',position:[0,0,0],rotation:[0,0,0],scale:[4,1,4],color:'#556655'},
  {id:'player',name:'Player',kind:'box',role:'player',position:[0,.75,0],rotation:[0,0,0],scale:[1,1,1],color:'#6688bb'}
 ]};
 const plan={version:1,summary:'A key opens a door and unlocks the exit',commands:[
  {op:'add',kind:'box',ref:'key',patch:{name:'Key',role:'collectible',position:[2,.75,0]}},
  {op:'add',kind:'box',patch:{name:'Door',role:'solid',position:[4,.75,0],gate:{key:'keys',comparison:'gte',value:1}}},
  {op:'add',kind:'box',ref:'exit',patch:{name:'Exit',role:'goal',position:[7,.75,0]}},
  {op:'logic',value:{autoWin:false,rules:[
   {id:'key',event:'collect',sourceId:'@key',minScore:0,action:{kind:'counter',key:'keys',mode:'add',amount:1}},
   {id:'win',event:'goal',sourceId:'@exit',minScore:0,action:{kind:'win'}}
  ]}},{op:'presentation',patch:{hudTitle:'Key Quest',showCounters:true}}
 ]};
 let called=0;
 await page.route('**/api/ai/plan',async route=>{const request=route.request().postDataJSON();expect(request.context).toContain('plan-local ref');expect(request.task).toContain('key');called++;await route.fulfill({json:{plan:JSON.stringify(plan)}});});
 await page.goto('/');await page.locator('header input[type=file]').setInputFiles({name:'base.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(base))});
 const ai=page.getByRole('group',{name:'AI Studio · Command preview'});
 await ai.getByText('Generate with your own API key (local server)',{exact:true}).click();await ai.getByLabel('Model ID').fill('fixture-model');await ai.getByLabel('Describe your game or change').fill('Create a key quest with a door and exit');
 await ai.getByLabel(/I allow this project context/).check();await ai.getByRole('button',{name:'Generate edit plan'}).click();
 await expect(ai.getByText(plan.summary,{exact:true})).toBeVisible();expect(called).toBe(1);
 await expect(page.getByRole('button',{name:'Key collectible',exact:true})).toHaveCount(0);await ai.getByRole('button',{name:'Apply as one undoable edit'}).click();
 await expect(page.getByRole('button',{name:'Key collectible',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'▶ Play',exact:true}).click();await expect(page.locator('.game-hud')).toContainText('Key Quest');
 await page.keyboard.down('d');try{await expect(page.locator('.game-hud')).toContainText('Level complete!',{timeout:30000});}finally{await page.keyboard.up('d');}
 await expect(page.locator('.game-hud')).toContainText('keys: 1');await page.getByRole('button',{name:'■ Stop',exact:true}).click();
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export playable HTML'}).click();const file=await download,path=testInfo.outputPath('generated-quest.html');await copyFile((await file.path())!,path);
 await page.goto(pathToFileURL(path).href);await expect(page.locator('#hud')).toContainText('Key Quest');await expect(page.locator('#game')).toBeFocused();
 await page.keyboard.down('d');try{await expect(page.locator('#hud')).toContainText('Level complete!',{timeout:30000});}finally{await page.keyboard.up('d');}
 await expect(page.locator('#hud')).toContainText('keys: 1');
});
