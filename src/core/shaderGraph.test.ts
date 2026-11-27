import {describe,it,expect} from 'vitest';
import {compileShaderGraph,readShaderGraph,defaultShaderGraph} from './shaderGraph';
import {entity,parseProject} from './project';
describe('bounded shader graph',()=>{
 it('compiles only validated color expressions and round trips project data',()=>{
 const g=readShaderGraph(defaultShaderGraph);expect(compileShaderGraph(g)).toContain('clamp(vLocal.y*1.000000+0.5');
 const p={version:1,name:'shader',entities:[{...entity('box'),shader:g}]};expect(parseProject(JSON.stringify(p)).entities[0].shader).toEqual(g);
 expect(compileShaderGraph({version:1,nodes:[{kind:'base'},{kind:'color',color:'#ffffff'},{kind:'mix',a:0,b:1,factor:.3},{kind:'multiply',a:1,b:2}]})).toContain('n1*n2');
 });
 it('rejects forward references, raw GLSL, invalid values and unsupported objects',()=>{
 for(const nodes of [[],[{kind:'raw',source:'discard;'}],[{kind:'mix',a:0,b:0,factor:1}],[{kind:'color',color:'#bad);'}],[{kind:'base'},{kind:'bands',a:0,b:0,axis:'y;discard;',scale:1}],Array.from({length:17},()=>({kind:'base'}))])expect(()=>readShaderGraph({version:1,nodes})).toThrow();
 expect(()=>parseProject(JSON.stringify({version:1,name:'x',entities:[{...entity('character'),shader:defaultShaderGraph}]}))).toThrow();
 });
});
