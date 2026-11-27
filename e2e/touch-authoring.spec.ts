import {test,expect} from '@playwright/test';
test('touch-capable mobile profiles author, edit, save and reopen a scene in both orientations',async({browser,browserName})=>{
 test.setTimeout(120000);
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true,...(browserName==='firefox'?{}:{isMobile:true})});
 const page=await context.newPage();
 try{
  await page.goto('/');await expect(page.getByLabel('3D game viewport',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>navigator.maxTouchPoints)).toBeGreaterThan(0);
  await page.evaluate(()=>{(window as any).__touchAuthoring=0;document.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')(window as any).__touchAuthoring++;},true);});
  const workspace=page.locator('aside').first(),inspector=page.locator('aside').last();
  await workspace.getByRole('button',{name:'Load Treasure Run'}).tap();
  await workspace.getByRole('button',{name:'+ box',exact:true}).tap();
  await workspace.getByRole('button',{name:'box',exact:true}).tap();
  const name=inspector.getByLabel('Name',{exact:true});await name.tap();await name.fill('Touch authored prop');
  const position=inspector.getByRole('group',{name:'position',exact:true});await position.getByLabel('X',{exact:true}).tap();await position.getByLabel('X',{exact:true}).fill('3');
  await expect(workspace.getByRole('button',{name:'Touch authored prop',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Undo',exact:true}).tap();await expect(position.getByLabel('X',{exact:true})).toHaveValue('0');
  await page.getByRole('button',{name:'Redo',exact:true}).tap();await expect(position.getByLabel('X',{exact:true})).toHaveValue('3');
  expect(await page.evaluate(()=>(window as any).__touchAuthoring)).toBeGreaterThanOrEqual(7);
  await expect(page.locator('footer')).toContainText('Saved on this device');
  await page.setViewportSize({width:844,height:390});const viewport=page.getByLabel('3D game viewport',{exact:true});await expect(viewport).toBeVisible();
  const box=await viewport.boundingBox();expect(box?.width).toBeGreaterThanOrEqual(800);expect(box?.height).toBeGreaterThanOrEqual(175);
  await page.reload();await workspace.getByRole('button',{name:'Touch authored prop',exact:true}).tap();await expect(position.getByLabel('X',{exact:true})).toHaveValue('3');
  await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'▶ Play',exact:true}).tap();
  const control=page.getByRole('button',{name:'Move forward',exact:true});await expect(control).toBeVisible();const target=await control.boundingBox();expect(target?.width).toBeGreaterThanOrEqual(44);expect(target?.height).toBeGreaterThanOrEqual(44);
  await control.tap();await page.getByRole('button',{name:'■ Stop',exact:true}).tap();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 }finally{await context.close();}
});
