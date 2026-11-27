import {test,expect} from '@playwright/test';
test('generate a new playable game offline, review, win and undo the workspace replacement',async({page})=>{
 await page.goto('/');const panel=page.getByRole('group',{name:'Quick game generator (offline)'});
 await panel.getByLabel('Generated game title').fill('Offline generated quest');
 await panel.getByLabel('Game genre').selectOption('key-quest');await panel.getByRole('button',{name:'Generate playable draft'}).click();
 await expect(panel.getByText('Generated draft: Offline generated quest')).toBeVisible();await expect(page.locator('header')).not.toContainText('Offline generated quest');
 await panel.getByRole('button',{name:'Open generated game (undoable)'}).click();await expect(page.locator('header')).toContainText('Offline generated quest');
 await page.getByRole('button',{name:'▶ Play',exact:true}).click();await expect(page.locator('.game-hud')).toContainText('Offline generated quest');
 await page.keyboard.down('d');try{await expect(page.locator('.game-hud')).toContainText('Level complete!',{timeout:30000});}finally{await page.keyboard.up('d');}
 await expect(page.locator('.game-hud')).toContainText('keys: 2');await page.getByRole('button',{name:'■ Stop',exact:true}).click();await page.getByRole('button',{name:'Undo',exact:true}).click();await expect(page.locator('header')).not.toContainText('Offline generated quest');
});
