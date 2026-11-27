import {test,expect} from '@playwright/test';
import {runtimeStressProject} from '../src/core/performanceFixtures';
import {entity} from '../src/core/project';
test('profile actual gameplay in desktop and compact software-device configurations',async({page,browserName},testInfo)=>{
 test.setTimeout(120000);
 const source=runtimeStressProject(),fixture={...source,entities:[source.entities[0],{...entity('ground'),scale:[4,1,4]},...source.entities.filter(e=>e.role==='solid').slice(0,96),...source.entities.filter(e=>e.role==='dynamic').slice(0,12),...source.entities.filter(e=>e.role==='collectible').slice(0,16)]};
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1280,height:800});await page.goto('/');
 await page.locator('header input[type=file]').setInputFiles({name:'runtime.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});await expect(page.locator('header')).toContainText('Runtime benchmark');
 const play=page.getByRole('button',{name:'▶ Play',exact:true}),stop=page.getByRole('button',{name:'■ Stop',exact:true});
 async function measure(){
  await play.click();await expect(page.locator('.game-hud')).toBeVisible();
  const samples=page.getByTestId('runtime-samples');await expect.poll(async()=>Number(await samples.textContent()),{timeout:45000}).toBeGreaterThanOrEqual(24);
  const number=async(id:string)=>Number(await page.getByTestId(id).textContent());
  const result={samples:await number('runtime-samples'),frameP95Ms:await number('runtime-frame-p95'),simulationP95Ms:await number('runtime-sim-p95'),renderSubmitP95Ms:await number('runtime-render-p95')};
  await stop.click();await expect(samples).toHaveCount(0,{timeout:5000});
  expect(result.frameP95Ms).toBeLessThan(500);expect(result.simulationP95Ms).toBeLessThan(50);expect(result.renderSubmitP95Ms).toBeLessThan(500);
  return result;
 }
 const desktop=await measure();
 await page.setViewportSize({width:430,height:800});const graphics=page.getByRole('group',{name:'Graphics and performance'});await graphics.getByRole('slider').fill('.5');await expect(graphics.getByText('Render resolution · 50%')).toBeVisible();
 const compact=await measure();const report={browser:browserName,scope:'software-rendered device profiles; not physical-device or GPU timing',entities:fixture.entities.length,desktop,compact,budgets:{frameP95Ms:500,simulationP95Ms:50,renderSubmitP95Ms:500}};
 await testInfo.attach('runtime-profile.json',{body:JSON.stringify(report,null,2),contentType:'application/json'});console.log(JSON.stringify(report));expect(errors).toEqual([]);
});
