import {test,expect} from '@playwright/test';
test('compact authoring keeps viewport usable and edits, undoes, saves and reopens a scene',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 const viewport=page.getByLabel('3D game viewport',{exact:true});
 await expect(viewport).toBeVisible();const box=await viewport.boundingBox();expect(box?.width).toBeGreaterThanOrEqual(380);expect(box?.height).toBeGreaterThanOrEqual(175);
 await page.getByRole('button',{name:'Load Treasure Run'}).click();
 await page.getByRole('button',{name:'+ box',exact:true}).click();
 const objects=page.locator('aside').first();await expect(objects.getByRole('button',{name:'box',exact:true})).toBeVisible();
 await objects.getByRole('button',{name:'box',exact:true}).click();
 const inspector=page.locator('aside').last();await inspector.getByLabel('Name',{exact:true}).fill('Compact prop');
 await expect(objects.getByRole('button',{name:'Compact prop',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect(objects.getByRole('button',{name:'box',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Redo',exact:true}).click();await expect(objects.getByRole('button',{name:'Compact prop',exact:true})).toBeVisible();
 await expect(page.locator('footer')).toContainText('Saved on this device');await page.reload();await expect(objects.getByRole('button',{name:'Compact prop',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'▶ Play',exact:true}).click();
 const control=page.getByRole('button',{name:'Move forward',exact:true});const target=await control.boundingBox();expect(target?.width).toBeGreaterThanOrEqual(44);expect(target?.height).toBeGreaterThanOrEqual(44);
 await page.getByRole('button',{name:'■ Stop',exact:true}).click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
