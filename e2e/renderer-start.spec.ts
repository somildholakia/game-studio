import {test,expect} from '@playwright/test';
test('retry renderer startup on a fresh canvas after temporary context allocation failure',async({page})=>{
 await page.addInitScript(()=>{
 const original=HTMLCanvasElement.prototype.getContext;let blocked:HTMLCanvasElement|null=null;
 HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,kind:string,...args:unknown[]){
  if(/webgl/i.test(kind)&&this.getAttribute('aria-label')==='3D game viewport'){if(!blocked)blocked=this;if(this===blocked){document.documentElement.dataset.blockedRenderer='yes';return null;}document.documentElement.dataset.retriedRenderer='yes';}
  return Reflect.apply(original,this,[kind,...args]);
 } as typeof original;
 });
 await page.goto('/');await page.getByRole('button',{name:'Load Treasure Run'}).click();
 await expect(page.locator('html')).toHaveAttribute('data-blocked-renderer','yes');await expect(page.locator('html')).toHaveAttribute('data-retried-renderer','yes',{timeout:20000});
 await expect(page.getByRole('button',{name:'▶ Play',exact:true})).toBeEnabled({timeout:20000});
 await page.getByRole('button',{name:'▶ Play',exact:true}).click();
 await expect(page.locator('.game-hud')).toContainText('Collectibles 0 / 2');await expect(page.locator('canvas')).toBeFocused();
});
