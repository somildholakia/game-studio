import {test,expect} from '@playwright/test';
test('inspect a historical Git project, restore locally, and save to the current branch only after re-inspection',async({page})=>{
 const historical={version:1,name:'Historical game',entities:[]},latest={version:1,name:'Current remote',entities:[]};
 const actions:{action:string;branch:string;expectedSha?:string;project?:string}[]=[];const old='a'.repeat(40),current='b'.repeat(40);
 await page.route('**/api/github/project',async route=>{
  const {action,branch,expectedSha,project}=route.request().postDataJSON();actions.push({action,branch,expectedSha,project});
  const data=action==='inspect'?{exists:true,sha:branch===old?old:current,project:JSON.stringify(branch===old?historical:latest)}:{sha:'c'.repeat(40),commit:'d'.repeat(40)};
  await route.fulfill({json:data});
 });
 await page.goto('/');const panel=page.getByRole('group',{name:'GitHub · Project version control'});
 await panel.getByText('Connect a repository',{exact:true}).click();await panel.getByLabel('Repository (owner/repo)').fill('example/game');await panel.getByLabel('GitHub token').fill('synthetic-test-token');
 await panel.getByLabel('Historical commit SHA').fill(old);await panel.getByRole('button',{name:'Inspect historical revision'}).click();
 await expect(panel.getByText(/Validated revision/)).toContainText('Historical game');
 page.once('dialog',d=>d.accept());await panel.getByRole('button',{name:'Open historical project'}).click();await expect(page.locator('header')).toContainText('Historical game');
 await expect(panel.getByRole('button',{name:'Commit current project'})).toBeDisabled();
 await panel.getByRole('button',{name:'Inspect remote project'}).click();await expect(panel.getByRole('button',{name:'Commit current project'})).toBeEnabled();
 page.once('dialog',d=>d.accept());await panel.getByRole('button',{name:'Commit current project'}).click();await expect(panel.getByRole('status')).toContainText('Committed:');
 expect(actions.map(a=>[a.action,a.branch])).toEqual([['inspect',old],['inspect','main'],['save','main']]);expect(actions[2].expectedSha).toBe(current);expect(JSON.parse(actions[2].project!).name).toBe('Historical game');
});
