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
 await expect(page.locator('canvas')).toBeFocused();
 await page.keyboard.down('w');await page.waitForTimeout(250);await page.keyboard.up('w');
 await page.getByRole('button',{name:'■ Stop',exact:true}).focus();
 await page.keyboard.press('Space');
 await expect(page.getByRole('button',{name:'▶ Play',exact:true})).toBeVisible();
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export playable HTML'}).click();
 const file=await download;const path=testInfo.outputPath('game.html');await copyFile((await file.path())!,path);
 await page.goto(pathToFileURL(path).href);
 await expect(page.locator('#hud')).toContainText('Collectibles 0 / 2',{timeout:30000});
 await expect(page.locator('#game')).toBeFocused();
 await page.getByRole('button',{name:'Restart',exact:true}).focus();
 await page.keyboard.press('Space');
 await expect(page.locator('#game')).toBeFocused();
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

test('create and reorder levels in the authoring workspace',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Load Treasure Run'}).click();
 const levels=page.getByRole('group',{name:'Level Manager',exact:true});
 await levels.getByLabel('Level name').fill('Forest');await levels.getByRole('button',{name:'Add level',exact:true}).click();
 await expect(levels.getByText('2. Forest (editing)',{exact:true})).toBeVisible();
 await levels.getByRole('button',{name:'Move level 2 up',exact:true}).click();
 await expect(levels.getByText('1. Forest (editing)',{exact:true})).toBeVisible();
 await levels.getByRole('button',{name:'Edit level 2',exact:true}).click();
 await expect(page.getByRole('button',{name:'Gem A collectible',exact:true})).toBeVisible();
 await expect(page.locator('footer')).toContainText('Saved on this device');await page.reload();
 await expect(levels.getByText('1. Forest',{exact:true})).toBeVisible();
});
test('play and export an ordered multi-level campaign',async({page},testInfo)=>{
 const player=(id:string)=>({id,name:'Player',kind:'box',position:[0,1,0],rotation:[0,0,0],scale:[1,1,1],color:'#6688bb',role:'player'});
 const logic={autoWin:false,rules:[{id:'win',event:'start',minScore:0,action:{kind:'win'}}]};
 const fixture={version:1,name:'Campaign test',sceneId:'a',sceneName:'First stage',sceneOrder:['a','b'],entities:[player('p1')],logic,levels:[{id:'b',name:'Second stage',entities:[player('p2')],logic}]};
 await page.goto('/');await page.locator('header input[type=file]').setInputFiles({name:'campaign.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});
 await expect(page.locator('header')).toContainText('Campaign test');
 await page.getByRole('button',{name:'Play campaign',exact:true}).click();
 await expect(page.locator('.game-hud')).toContainText('First stage');
 await page.getByRole('button',{name:'Next level',exact:true}).click();
 await expect(page.locator('.game-hud')).toContainText('Game complete!');
 await page.getByRole('button',{name:'■ Stop',exact:true}).click();
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export playable HTML'}).click();
 const file=await download;const path=testInfo.outputPath('campaign.html');await copyFile((await file.path())!,path);
 await page.goto(pathToFileURL(path).href);
 await expect(page.locator('#hud')).toContainText('First stage');
 await page.getByRole('button',{name:'Next level',exact:true}).click();
 await expect(page.locator('#hud')).toContainText('Second stage');
 await expect(page.locator('#hud')).toContainText('Game complete!');
});
test('filter workspace and configure a custom HUD',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Load Treasure Run'}).click();
 const navigation=page.getByRole('navigation',{name:'Workspace sections'});
 await navigation.getByRole('button',{name:'Scene',exact:true}).click();await page.getByLabel('Find scene objects').fill('Gem A');
 await expect(page.getByRole('button',{name:'Gem A collectible',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Gem B collectible',exact:true})).toHaveCount(0);
 await page.getByRole('navigation',{name:'Inspector sections'}).getByRole('button',{name:'Gameplay',exact:true}).click();
 const ui=page.getByRole('group',{name:'Game UI and camera',exact:true});await ui.getByLabel('HUD title').fill('Quest mode');await ui.getByLabel('Show score').uncheck();await ui.getByLabel('Camera mode').selectOption('overhead');
 await page.getByRole('button',{name:'▶ Play',exact:true}).click();await expect(page.locator('.game-hud')).toContainText('Quest mode');await expect(page.locator('.game-hud')).not.toContainText('Score:');
});

test('adjust graphics quality and see renderer diagnostics',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await page.getByRole('button',{name:'Load Treasure Run'}).click();
 await page.getByRole('navigation',{name:'Inspector sections'}).getByRole('button',{name:'World',exact:true}).click();
 const graphics=page.getByRole('group',{name:'Graphics and performance',exact:true});
 await expect(graphics.getByText('Frame rate',{exact:true})).toBeVisible({timeout:15000});
 await graphics.getByRole('slider',{name:/Render resolution/}).fill('0.75');
 await graphics.getByLabel('Enable directional shadows').check();
 await graphics.getByLabel('Shadow resolution').selectOption('512');
 await expect(graphics.getByLabel('Shadow resolution')).toHaveValue('512');
 await graphics.getByLabel('Enable directional shadows').uncheck();
 await expect(page.locator('footer')).toContainText('Saved on this device');
 expect(errors).toEqual([]);
});

test('extrude a mesh and undo the edit',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'+ mesh',exact:true}).click();
 const model=page.getByRole('group',{name:'Model Studio · Mesh topology',exact:true});
 await model.getByRole('button',{name:'Extrude triangle',exact:true}).click();
 await expect(model.getByTestId('mesh-topology-stats')).toContainText('11 vertices · 18 triangles');
 await page.getByRole('button',{name:'Undo',exact:true}).click();
 await expect(model.getByTestId('mesh-topology-stats')).toContainText('8 vertices · 12 triangles');
 await model.getByRole('button',{name:'Pick vertex in viewport',exact:true}).click();
 await expect(model.getByRole('button',{name:'Exit vertex picking',exact:true})).toBeVisible();
 await model.getByRole('button',{name:'Exit vertex picking',exact:true}).click();
});
test('update and detach linked prefab appearances',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'box',exact:true}).click();
 const prefabs=page.getByRole('group',{name:'Reusable prefabs',exact:true});
 await prefabs.getByRole('button',{name:'Save selected as prefab'}).click();
 await prefabs.getByRole('button',{name:'Place linked',exact:true}).click();
 await expect(prefabs.getByText('box · 1 linked',{exact:true})).toBeVisible();
 page.once('dialog',d=>d.accept());await prefabs.getByRole('button',{name:'Update from selected',exact:true}).click();
 await prefabs.getByRole('button',{name:'Detach selected instance',exact:true}).click();
 await expect(prefabs.getByText('box · 0 linked',{exact:true})).toBeVisible();
});

test('configure dynamic body and moving trigger, then play and restore scene',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
 await page.getByRole('button',{name:'Load Physics Playground',exact:true}).click();
 await page.getByRole('button',{name:'Pushable crate dynamic',exact:true}).click();
 const body=page.getByRole('group',{name:'Dynamic body',exact:true});await body.getByLabel('Mass',{exact:true}).fill('2');await expect(body.getByLabel('Mass',{exact:true})).toHaveValue('2');
 await page.getByRole('button',{name:'Moving obstacle hazard',exact:true}).click();
 const patrol=page.getByRole('group',{name:'Moving gameplay object',exact:true});await patrol.getByLabel('Round trip (seconds)').fill('8');
 await page.getByRole('button',{name:'▶ Play',exact:true}).click();await expect(page.locator('.game-hud')).toContainText('Collectibles 0 / 1');
 await page.getByRole('button',{name:'■ Stop',exact:true}).click();await expect(patrol.getByLabel('Round trip (seconds)')).toHaveValue('8');
 await expect(page.locator('footer')).toContainText('Saved on this device');expect(errors).toEqual([]);
});

test('sculpt a mesh, change its texture and retain material settings on reload',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
 await page.getByRole('button',{name:'+ mesh',exact:true}).click();
 const sculpt=page.getByRole('group',{name:'Sculpt brush',exact:true});
 await sculpt.getByLabel('Brush mode').selectOption('smooth');await sculpt.getByRole('button',{name:'Apply brush stroke'}).click();
 await page.getByLabel('UV projection').selectOption('xz');
 const texture=page.getByRole('group',{name:'Procedural texture',exact:true});
 await texture.getByLabel('Enable texture').check();await texture.getByLabel('Pattern',{exact:true}).selectOption('brick');await texture.getByLabel('Horizontal repeat').fill('3');
 await expect(page.locator('footer')).toContainText('Saved on this device');await page.reload();
 await page.getByRole('button',{name:'mesh',exact:true}).click();
 await expect(page.getByLabel('UV projection')).toHaveValue('xz');await expect(texture.getByLabel('Pattern',{exact:true})).toHaveValue('brick');await expect(texture.getByLabel('Horizontal repeat')).toHaveValue('3');expect(errors).toEqual([]);
});
test('author a named counter rule and display it during play',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Load Treasure Run'}).click();await page.getByRole('button',{name:'+ Add event rule'}).click();
 const rule=page.getByRole('group',{name:'Rule 1',exact:true});await rule.getByLabel('When').selectOption('start');await rule.getByLabel('Do').selectOption('counter');
 await rule.getByLabel('Counter name').fill('keys');await rule.getByLabel('Counter amount').fill('3');
 await page.getByLabel('Show named counters').check();await page.getByRole('button',{name:'▶ Play',exact:true}).click();await expect(page.locator('.game-hud')).toContainText('keys: 3');
});

test('export a custom GLB and reuse it in the asset library',async({page},testInfo)=>{
 await page.goto('/');await page.getByRole('button',{name:'+ mesh',exact:true}).click();
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export mesh GLB (solid material)',exact:true}).click();
 const file=await download;const path=testInfo.outputPath('model.glb');await file.saveAs(path);
 await page.locator('input[accept=".glb"]').setInputFiles(path);
 const models=page.getByRole('group',{name:'3D models',exact:true});await expect(models.getByText('model.glb',{exact:true})).toBeVisible();
 await models.getByRole('button',{name:'Place',exact:true}).click();await expect(page.getByRole('button',{name:'model.glb',exact:true})).toBeVisible();
});

test('preview and undo a multi-level AI plan',async({page})=>{
 await page.goto('/');
 const ai=page.getByRole('group',{name:'AI Studio · Command preview',exact:true});
 await ai.getByLabel('JSON edit plan').fill(JSON.stringify({version:1,summary:'Create a second level',commands:[{op:'add-level',name:'Forest'},{op:'add',kind:'box',patch:{name:'Forest exit',role:'goal'}}]}));
 await ai.getByRole('button',{name:'Validate and preview'}).click();
 await expect(ai.getByText('Add level: Forest',{exact:true})).toBeVisible();
 await expect(ai.getByText('[Forest] Add: Forest exit (box)',{exact:true})).toBeVisible();
 await ai.getByRole('button',{name:'Apply as one undoable edit'}).click();
 await expect(page.getByRole('button',{name:'Forest exit goal',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect(page.getByRole('button',{name:'Forest exit goal',exact:true})).toHaveCount(0);
});

test('subdivide entire mesh, undo and redo shared topology',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await page.getByRole('button',{name:'+ mesh',exact:true}).click();
 const stats=page.getByTestId('mesh-topology-stats');
 await expect(stats).toContainText('8 vertices · 12 triangles');
 await page.getByRole('button',{name:'Subdivide entire mesh',exact:true}).click();
 await expect(stats).toContainText('26 vertices · 48 triangles');
 await page.getByRole('button',{name:'Undo',exact:true}).click();
 await expect(stats).toContainText('8 vertices · 12 triangles');
 await page.getByRole('button',{name:'Redo',exact:true}).click();
 await expect(stats).toContainText('26 vertices · 48 triangles');
 await expect(page.locator('footer')).toContainText('Saved on this device');
 await page.reload();await page.getByRole('button',{name:'mesh',exact:true}).click();
 await expect(stats).toContainText('26 vertices · 48 triangles');expect(errors).toEqual([]);
});

test('a stale editor tab cannot silently overwrite the active saved workspace',async({page,context})=>{
 await page.goto('/');await expect(page.locator('footer')).toContainText('Saved on this device');
 const other=await context.newPage();
 try{
  await other.goto('/');await expect(other.locator('footer')).toContainText('Saved on this device');
  await page.getByRole('button',{name:'+ cylinder',exact:true}).click();
  await expect(page.locator('footer')).toContainText('Saved on this device');
  await other.getByRole('button',{name:'+ sphere',exact:true}).click();
  await expect(other.locator('footer')).toContainText('Autosave disabled');
  await expect(other.getByRole('alert')).toContainText('Another Game Studio tab');
  await expect(other.getByRole('button',{name:'sphere',exact:true})).toBeVisible();
  await other.reload();
  await expect(other.getByRole('button',{name:'cylinder',exact:true})).toBeVisible();
  await expect(other.getByRole('button',{name:'sphere',exact:true})).toHaveCount(0);
 }finally{await other.close();}
});

test('publish a self-contained HTML game with an escaped project title',async({page},testInfo)=>{
 const name='Game </title><script>window.injected=true</script> & adventure';
 const player={id:'player',name:'Player',kind:'box',position:[0,1,0],rotation:[0,0,0],scale:[1,1,1],color:'#6688bb',role:'player'};
 const fixture={version:1,name,entities:[player],logic:{autoWin:false,rules:[{id:'win',event:'start',minScore:0,action:{kind:'win'}}]}};
 await page.goto('/');await page.locator('header input[type=file]').setInputFiles({name:'project.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});
 await expect(page.locator('header')).toContainText(name);
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export playable HTML'}).click();
 const file=await download;const path=testInfo.outputPath('published.html');await file.saveAs(path);
 await page.goto(pathToFileURL(path).href);
 await expect(page).toHaveTitle(name);
 await expect(page.locator('#hud')).toContainText('Level complete!',{timeout:30000});
 await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute('content',/connect-src data: blob:/);
 expect(await page.evaluate(()=>Reflect.get(window,'injected'))).toBeUndefined();
 expect(await page.locator('script').count()).toBe(2);
});

test('review and apply AI lighting, audio and game presentation settings as one edit',async({page})=>{
 await page.goto('/');const ai=page.getByRole('group',{name:'AI Studio · Command preview',exact:true});
 await ai.getByLabel('JSON edit plan').fill(JSON.stringify({version:1,summary:'Night atmosphere',commands:[
  {op:'environment',patch:{sky:'#101828',fogEnabled:true}},
  {op:'audio',patch:{enabled:true,volume:.3,tones:{collect:{frequency:660}}}},
  {op:'presentation',patch:{hudTitle:'Night adventure',showCounters:true}}
 ]}));
 await ai.getByRole('button',{name:'Validate and preview'}).click();
 await expect(ai.getByText('Update environment',{exact:true})).toBeVisible();
 await expect(ai.getByText('Update game audio',{exact:true})).toBeVisible();
 await expect(ai.getByText('Update game presentation',{exact:true})).toBeVisible();
 await expect(page.getByLabel('Enable fog')).not.toBeChecked();
 await ai.getByRole('button',{name:'Apply as one undoable edit'}).click();
 await expect(page.getByLabel('Sky color')).toHaveValue('#101828');
 await expect(page.getByLabel('Enable fog')).toBeChecked();await expect(page.getByLabel('Enable game sounds')).toBeChecked();
 await expect(page.getByLabel('HUD title')).toHaveValue('Night adventure');
 await page.getByRole('button',{name:'Undo',exact:true}).click();
 await expect(page.getByLabel('Enable fog')).not.toBeChecked();await expect(page.getByLabel('Enable game sounds')).not.toBeChecked();
 await expect(page.getByLabel('HUD title')).toHaveValue('');
});

test('configure an object-specific collectible event and persist its source',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Load Treasure Run',exact:true}).click();
 await page.getByRole('button',{name:'+ Add event rule',exact:true}).click();
 const rule=page.getByRole('group',{name:'Rule 1',exact:true});
 const source=rule.getByLabel('Event object',{exact:true});
 const target=source.locator('option').filter({hasText:'Gem A'});
 const id=await target.getAttribute('value');expect(id).toBeTruthy();
 await source.selectOption(id!);await expect(source).toHaveValue(id!);
 await expect(page.locator('footer')).toContainText('Saved on this device');await page.reload();
 await expect(source).toHaveValue(id!);
 await rule.getByLabel('When').selectOption('start');await expect(source).toHaveCount(0);
 await rule.getByLabel('When').selectOption('collect');await expect(source).toHaveValue('');
});
test('persist animation interpolation and ping-pong loop options',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'+ mesh',exact:true}).click();
 await page.getByRole('button',{name:'Create animation at 0s',exact:true}).click();
 await page.getByLabel('Interpolation',{exact:true}).selectOption('smooth');
 await page.getByLabel('Ping-pong loop',{exact:true}).check();
 await page.getByRole('group',{name:'position',exact:true}).getByLabel('X',{exact:true}).fill('3');
 await page.getByRole('button',{name:'Capture pose',exact:true}).click();
 await expect(page.locator('footer')).toContainText('Saved on this device');await page.reload();
 await page.getByRole('button',{name:'mesh',exact:true}).click();
 await expect(page.getByLabel('Interpolation',{exact:true})).toHaveValue('smooth');
 await expect(page.getByLabel('Ping-pong loop',{exact:true})).toBeChecked();
});

test('duplicate a level with independent objects and undo the duplication',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Load Treasure Run',exact:true}).click();
 const levels=page.getByRole('group',{name:'Level Manager',exact:true});
 await levels.getByRole('button',{name:'Duplicate level 1',exact:true}).click();
 await expect(levels.getByText('2. Level 1 copy (editing)',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Gem A collectible',exact:true}).click();
 await page.getByLabel('Name',{exact:true}).fill('Copied gem');
 await levels.getByRole('button',{name:'Edit level 1',exact:true}).click();
 await expect(page.getByRole('button',{name:'Gem A collectible',exact:true})).toBeVisible();
 await levels.getByRole('button',{name:'Edit level 2',exact:true}).click();
 await expect(page.getByRole('button',{name:'Copied gem collectible',exact:true})).toBeVisible();
 await expect(page.locator('footer')).toContainText('Saved on this device');await page.reload();
 await expect(levels.getByText('2. Level 1 copy (editing)',{exact:true})).toBeVisible();
 await levels.getByRole('button',{name:'Duplicate level 2',exact:true}).click();
 await expect(levels.getByText('3. Level 1 copy copy (editing)',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Undo',exact:true}).click();
 await expect(levels.getByText('3. Level 1 copy copy (editing)',{exact:true})).toHaveCount(0);
});
