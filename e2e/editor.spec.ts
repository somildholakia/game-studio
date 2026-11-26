import {test,expect} from '@playwright/test';
import {pathToFileURL} from 'node:url';
import {copyFile} from 'node:fs/promises';
test('author, save, play and export a browser game',async({page},testInfo)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 await expect(page.getByRole('button',{name:'Load Treasure Run'})).toBeVisible();
 await page.getByRole('button',{name:'Load Treasure Run'}).click();
 await expect(page.locator('footer')).toContainText('Saved on this device');
 await page.reload();
 await expect(page.locator('header')).toContainText('Treasure Run');
 await page.getByRole('button',{name:'▶ Play',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('Collectibles 0 / 2');
 await page.keyboard.down('w');await page.waitForTimeout(250);await page.keyboard.up('w');
 await page.getByRole('button',{name:'■ Stop',exact:true}).click();
 await expect(page.getByRole('button',{name:'▶ Play',exact:true})).toBeVisible();
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export playable HTML'}).click();
 const file=await download;const path=testInfo.outputPath('game.html');await copyFile((await file.path())!,path);
 await page.goto(pathToFileURL(path).href);
 await expect(page.locator('#hud')).toContainText('Collectibles 0 / 2',{timeout:30000});
 expect(errors).toEqual([]);
});
test('configure a gameplay rule and see it in play mode',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Load Treasure Run'}).click();
 await page.getByRole('button',{name:'+ Add event rule'}).click();
 const rule=page.getByRole('group',{name:'Rule 1',exact:true});await rule.getByLabel('When').selectOption('start');
 await rule.getByLabel('Do').selectOption('message');await rule.getByLabel('Message',{exact:true}).fill('Ready to explore');
 await page.getByRole('button',{name:'▶ Play',exact:true}).click();await expect(page.getByRole('status')).toContainText('Ready to explore');
});

test('edit topology and capture animation poses',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'+ mesh',exact:true}).click();
 const model=page.getByRole('group',{name:'Model Studio · Mesh topology',exact:true});const stats=model.getByTestId('mesh-topology-stats');await expect(stats).toContainText('8 vertices · 12 triangles');
 await model.getByRole('button',{name:'Subdivide triangle',exact:true}).click();await expect(stats).toContainText('9 vertices · 14 triangles');
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect(stats).toContainText('8 vertices · 12 triangles');
 await page.getByRole('button',{name:'Create animation at 0s'}).click();
 await page.getByRole('group',{name:'position',exact:true}).getByLabel('X',{exact:true}).fill('2');
 await page.getByRole('button',{name:'Capture pose'}).click();await expect(page.getByText('1.00s',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Preview pose'}).click();await expect(page.getByRole('button',{name:'Stop preview'})).toBeVisible();
});

test('preview, approve and undo a declarative AI edit',async({page})=>{
 await page.goto('/');
 const ai=page.getByRole('group',{name:'AI Studio · Command preview',exact:true});
 await ai.getByLabel('JSON edit plan').fill(JSON.stringify({version:1,summary:'Add a wall',commands:[{op:'add',kind:'box',patch:{name:'AI test wall',role:'solid',position:[2,1,0]}}]}));
 await ai.getByRole('button',{name:'Validate and preview'}).click();
 await expect(ai.getByText('Add: AI test wall (box)',{exact:true})).toBeVisible();
 const wall=page.getByRole('button',{name:'AI test wall solid',exact:true});
 await expect(wall).toHaveCount(0);
 await ai.getByRole('button',{name:'Apply as one undoable edit'}).click();
 await expect(wall).toBeVisible();
 await page.getByRole('button',{name:'Undo',exact:true}).click();
 await expect(wall).toHaveCount(0);
});

test('generate terrain and edit environment settings',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Load Meadow Explorer'}).click();
 await page.getByRole('button',{name:'Rolling meadow',exact:true}).click();
 const terrain=page.getByRole('group',{name:'Terrain Studio · Procedural heightfield',exact:true});
 await expect(terrain.getByLabel('Grid resolution')).toHaveValue('32');
 await terrain.getByLabel('Height amplitude').fill('0.8');
 await expect(terrain.getByLabel('Height amplitude')).toHaveValue('0.8');
 const environment=page.getByRole('group',{name:'Environment Studio',exact:true});
 await environment.getByRole('button',{name:'Sunset',exact:true}).click();
 await expect(environment.getByLabel('Enable fog')).toBeChecked();
 await page.getByRole('button',{name:'▶ Play',exact:true}).click();
 await expect(page.locator('.game-hud')).toContainText('Collectibles 0 / 2');
});
test('customize character appearance and preserve the rig on reload',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'+ character',exact:true}).click();
 const rig=page.getByRole('group',{name:'Character Studio · Appearance and joints',exact:true});
 await rig.getByLabel('Hair style').selectOption('cap');
 await rig.getByLabel('Automatic walk and jump poses').uncheck();
 await expect(page.locator('footer')).toContainText('Saved on this device');
 await page.reload();await page.getByRole('button',{name:'character',exact:true}).click();
 await expect(rig.getByLabel('Hair style')).toHaveValue('cap');
 await expect(rig.getByLabel('Automatic walk and jump poses')).not.toBeChecked();
});
