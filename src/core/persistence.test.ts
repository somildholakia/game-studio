import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {IDBFactory} from 'fake-indexeddb';
import {restore,persist} from './persistence';
import {initialProject} from './project';
beforeEach(()=>{vi.stubGlobal('indexedDB',new IDBFactory());vi.stubGlobal('localStorage',{getItem:vi.fn(()=>null)});});
afterEach(()=>vi.unstubAllGlobals());
describe('local project database',()=>{
 it('returns null for an empty database and restores committed data',async()=>{expect(await restore()).toBeNull();const p=initialProject();await persist(p);expect((await restore())?.entities).toEqual(p.entities);});
 it('orders overlapping saves',async()=>{const p=initialProject();await Promise.all([persist({...p,name:'First'}),persist({...p,name:'Last'})]);expect((await restore())?.name).toBe('Last');});
 it('migrates legacy data without deleting the backup',async()=>{const p={...initialProject(),name:'Legacy'};vi.stubGlobal('localStorage',{getItem:vi.fn(()=>JSON.stringify(p))});expect((await restore())?.name).toBe('Legacy');vi.stubGlobal('localStorage',{getItem:vi.fn(()=>null)});expect((await restore())?.name).toBe('Legacy');});
 it('does not silently accept malformed legacy data',async()=>{vi.stubGlobal('localStorage',{getItem:vi.fn(()=>'{bad json')});await expect(restore()).rejects.toThrow();});
});
