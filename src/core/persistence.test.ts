import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {IDBFactory} from 'fake-indexeddb';
import {restore,persist,createWorkspaceSession,WorkspaceConflictError} from './persistence';
import {initialProject} from './project';
beforeEach(()=>{vi.stubGlobal('indexedDB',new IDBFactory());vi.stubGlobal('localStorage',{getItem:vi.fn(()=>null)});});
afterEach(()=>vi.unstubAllGlobals());
describe('local project database',()=>{
 it('returns null for an empty database and restores committed data',async()=>{expect(await restore()).toBeNull();const p=initialProject();await persist(p);expect((await restore())?.entities).toEqual(p.entities);});
 it('orders overlapping saves',async()=>{const p=initialProject();await Promise.all([persist({...p,name:'First'}),persist({...p,name:'Last'})]);expect((await restore())?.name).toBe('Last');});
 it('migrates legacy data without deleting the backup',async()=>{const p={...initialProject(),name:'Legacy'};vi.stubGlobal('localStorage',{getItem:vi.fn(()=>JSON.stringify(p))});expect((await restore())?.name).toBe('Legacy');vi.stubGlobal('localStorage',{getItem:vi.fn(()=>null)});expect((await restore())?.name).toBe('Legacy');});
 it('does not silently accept malformed legacy data',async()=>{vi.stubGlobal('localStorage',{getItem:vi.fn(()=>'{bad json')});await expect(restore()).rejects.toThrow();});
});

describe('atomic workspace sessions',()=>{
 it('rejects stale tab writes and preserves the winning version',async()=>{
  const first=createWorkspaceSession(),second=createWorkspaceSession();
  expect(await first.restore()).toBeNull();const p=initialProject();await first.persist(p);
  const restored=(await second.restore())!;await second.persist(restored);
  await first.persist({...p,name:'First tab edit'});
  await expect(second.persist({...restored,name:'Stale edit'})).rejects.toBeInstanceOf(WorkspaceConflictError);
  expect((await restore())?.name).toBe('First tab edit');
  await expect(second.persist({...restored,name:'Still stale'})).rejects.toBeInstanceOf(WorkspaceConflictError);
  await second.persist({...restored,name:'Explicit replacement'},true);
  expect((await restore())?.name).toBe('Explicit replacement');
  await expect(first.persist({...p,name:'Outdated again'})).rejects.toBeInstanceOf(WorkspaceConflictError);
 });
 it('serializes changes in one session and lets exactly one new workspace win',async()=>{
  const a=createWorkspaceSession(),b=createWorkspaceSession();await Promise.all([a.restore(),b.restore()]);
  const p=initialProject();
  const results=await Promise.allSettled([a.persist({...p,name:'A'}),b.persist({...p,name:'B'})]);
  expect(results.filter(x=>x.status==='fulfilled')).toHaveLength(1);
  const winner=results[0].status==='fulfilled'?a:b;
  await Promise.all([winner.persist({...p,name:'Next'}),winner.persist({...p,name:'Last'})]);
  expect((await restore())?.name).toBe('Last');
 });
});
