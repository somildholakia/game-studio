import {test,expect} from '@playwright/test';
test('export, inspect and restore a checksummed compressed project backup',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Load Treasure Run'}).click();
 const panel=page.getByRole('group',{name:'Compressed project backup'});
 const download=page.waitForEvent('download');await panel.getByRole('button',{name:'Export compressed project'}).click();const f=await download;
 await page.getByRole('button',{name:'Load Sky Steps'}).click();await expect(page.locator('header')).toContainText('Sky Steps');
 await panel.getByLabel('Import compressed project').setInputFiles((await f.path())!);
 await expect(panel.getByText(/Validated backup: Treasure Run/)).toBeVisible();await expect(page.locator('header')).toContainText('Sky Steps');
 await panel.getByRole('button',{name:'Open validated backup'}).click();await expect(page.locator('header')).toContainText('Treasure Run');
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect(page.locator('header')).toContainText('Sky Steps');
});
