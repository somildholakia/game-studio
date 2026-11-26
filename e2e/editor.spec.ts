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
 await expect(page.getByText('8 vertices · 12 triangles')).toBeVisible();
 await page.getByRole('button',{name:'Subdivide triangle'}).click();await expect(page.getByText('9 vertices · 14 triangles')).toBeVisible();
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect(page.getByText('8 vertices · 12 triangles')).toBeVisible();
 await page.getByRole('button',{name:'Create animation at 0s'}).click();
 await page.getByRole('group',{name:'position',exact:true}).getByLabel('X',{exact:true}).fill('2');
 await page.getByRole('button',{name:'Capture pose'}).click();await expect(page.getByText('1.00s',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Preview pose'}).click();await expect(page.getByRole('button',{name:'Stop preview'})).toBeVisible();
});
