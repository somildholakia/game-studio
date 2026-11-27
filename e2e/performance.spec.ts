import {test,expect} from '@playwright/test';
import {complexMesh} from '../src/core/performanceFixtures';
test('profile complex mesh rendering at desktop and compact viewport budgets',async({page,browserName},testInfo)=>{
 test.setTimeout(90000);
 const mesh=complexMesh(),entities=Array.from({length:8},(_,i)=>({id:'stress-'+i,name:'Stress mesh '+i,kind:'mesh',position:[(i%4-1.5)*2,1,Math.floor(i/4)*2],rotation:[0,0,0],scale:[1,1,1],color:'#6688bb',role:'decoration',mesh,smoothNormals:true}));
 const fixture={version:1,name:'Mesh benchmark',entities};
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1280,height:800});await page.goto('/');
 await page.locator('header input[type=file]').setInputFiles({name:'benchmark.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});
 await expect(page.locator('header')).toContainText('Mesh benchmark');const metrics=page.locator('.render-metrics');await expect(metrics).toContainText('Total vertices');
 await expect.poll(async()=>Number(await metrics.locator('dd').nth(2).textContent()),{timeout:20000}).toBeGreaterThanOrEqual(8*3968*3);
 const measure=async()=>{
  const times=await page.evaluate(async()=>{const results:number[]=[];let previous=await new Promise<number>(r=>requestAnimationFrame(r));for(let i=0;i<35;i++){const next=await new Promise<number>(r=>requestAnimationFrame(r));results.push(next-previous);previous=next;}return results.slice(5);});
  const sorted=[...times].sort((a,b)=>a-b);return {samples:times.length,p95Ms:sorted[Math.ceil(sorted.length*.95)-1],maxMs:sorted.at(-1)};
 };
 const desktop=await measure();
 await page.setViewportSize({width:430,height:800});const graphics=page.getByRole('group',{name:'Graphics and performance'});
 await graphics.getByRole('slider').fill('.5');
 await expect(graphics.getByText('Render resolution · 50%')).toBeVisible();
 const compact=await measure();
 const report={browser:browserName,scope:'software-rendered CI, not physical device',triangles:8*3968,desktop,compact,regressionBudgetMs:500};
 await testInfo.attach('mesh-performance.json',{body:JSON.stringify(report,null,2),contentType:'application/json'});console.log(JSON.stringify(report));
 expect(desktop.p95Ms).toBeLessThan(500);expect(compact.p95Ms).toBeLessThan(500);expect(errors).toEqual([]);
});
