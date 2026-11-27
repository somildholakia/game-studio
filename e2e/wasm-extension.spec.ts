import {test,expect} from '@playwright/test';
import {fixtureTool,infiniteModule,sampleModule} from '../src/core/wasmToolFixture';
test('execute isolated tool, approve commands, undo, reject imports and terminate infinite loop',async({page})=>{
 await page.goto('/');const panel=page.getByRole('group',{name:'Executable extensions · Wasm SDK'});await panel.getByText('Run a restricted extension').click();
 const file=(module:Uint8Array)=>({name:'tool.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixtureTool(Uint8Array.from(module))))});
 await panel.getByRole('button',{name:'Preview executable extension'}).click();await expect(panel.getByText('Add: Extension box 1 (box)')).toBeVisible();
 await expect(page.locator('.entity').filter({hasText:'Extension box 1'})).toHaveCount(0);await panel.getByRole('button',{name:'Apply executable extension'}).click();await expect(page.locator('.entity').filter({hasText:'Extension box 1'})).toHaveCount(1);
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect(page.locator('.entity').filter({hasText:'Extension box 1'})).toHaveCount(0);
 await panel.getByLabel('Import Wasm tool').setInputFiles(file(sampleModule('fetch')));await panel.getByRole('button',{name:'Preview executable extension'}).click();await expect(panel.getByRole('alert')).toContainText('import');
 await panel.getByLabel('Import Wasm tool').setInputFiles(file(infiniteModule()));await panel.getByRole('button',{name:'Preview executable extension'}).click();await expect(panel.getByRole('alert')).toContainText('execution budget',{timeout:10000});
 await page.getByRole('button',{name:'+ box',exact:true}).click();await expect(page.locator('.entity[aria-pressed=true]')).toHaveCount(1);
});
