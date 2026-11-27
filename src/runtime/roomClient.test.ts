import {describe,it,expect,vi,afterEach} from 'vitest';
import {readPeers,readMembership,roomRequest} from './rooms';
afterEach(()=>vi.unstubAllGlobals());
describe('room client boundary',()=>{
 it('validates and copies peer positions and membership',()=>{const p={id:'0123456789abcdef',name:'Peer',position:[1,2,3]};const peers=readPeers([p]);expect(peers).toEqual([p]);expect(peers[0].position).not.toBe(p.position);expect(()=>readPeers([p,p])).toThrow();expect(()=>readPeers([{...p,position:[1,2,Infinity]}])).toThrow();expect(()=>readMembership({code:'abcdef12',id:p.id,token:'x'})).toThrow();});
 it('requires JSON from the same-origin endpoint',async()=>{const fetcher=vi.fn(async()=>new Response('<html>',{headers:{'content-type':'text/html'}}));vi.stubGlobal('fetch',fetcher);await expect(roomRequest({action:'create'})).rejects.toThrow('local development server');expect(fetcher.mock.calls[0][0]).toBe('/api/rooms');});
});
