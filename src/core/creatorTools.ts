import {readPlan,previewPlan} from '../ai/plan';
import type {Project} from './project';
type Primitive=string|number|boolean;
export type ToolParameter={key:string;label:string;type:'number';min:number;max:number;default:number}|{key:string;label:string;type:'string';default:string}|{key:string;label:string;type:'boolean';default:boolean};
const operations=['add','environment','presentation','physics','audio'] as const;
type Capability=typeof operations[number];
export type CreatorTool={format:'game-studio-tool';version:1;id:string;name:string;description:string;capabilities:Capability[];parameters:ToolParameter[];commands:unknown[]};
function record(raw:unknown):Record<string,unknown>{if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Expected tool object');return raw as Record<string,unknown>;}
function fields(o:Record<string,unknown>,allowed:string[]){for(const key of Object.keys(o))if(!allowed.includes(key))throw Error('Unknown tool field: '+key);}
function validKey(key:unknown):key is string{return typeof key==='string'&&/^[a-zA-Z][a-zA-Z0-9_]{0,31}$/.test(key)&&!['constructor','prototype','__proto__'].includes(key);}
function boundedString(x:unknown,max:number):x is string{return typeof x==='string'&&!!x.trim()&&x.length<=max;}
function validateValue(p:ToolParameter,value:unknown):Primitive{
 if(p.type==='number'){if(typeof value!=='number'||!Number.isFinite(value)||value<p.min||value>p.max)throw Error('Invalid parameter: '+p.label);return value;}
 if(p.type==='boolean'){if(typeof value!=='boolean')throw Error('Invalid parameter: '+p.label);return value;}
 if(typeof value!=='string'||value.length>200)throw Error('Invalid parameter: '+p.label);return value;
}
function parameter(raw:unknown):ToolParameter{
 const p=record(raw);if(!validKey(p.key)||!boundedString(p.label,100))throw Error('Invalid tool parameter');
 const base={key:p.key,label:p.label};
 if(p.type==='number'){
  fields(p,['key','label','type','min','max','default']);
  if(typeof p.min!=='number'||typeof p.max!=='number'||!Number.isFinite(p.min)||!Number.isFinite(p.max)||p.min>p.max||Math.abs(p.min)>100000||Math.abs(p.max)>100000||typeof p.default!=='number')throw Error('Invalid number parameter');
  const result={...base,type:'number' as const,min:p.min,max:p.max,default:p.default};validateValue(result,p.default);return result;
 }
 fields(p,['key','label','type','default']);
 if(p.type==='string'&&typeof p.default==='string'&&p.default.length<=200)return {...base,type:'string',default:p.default};
 if(p.type==='boolean'&&typeof p.default==='boolean')return {...base,type:'boolean',default:p.default};
 throw Error('Invalid tool parameter type');
}
export function toolDefaults(tool:CreatorTool):Record<string,Primitive>{return Object.fromEntries(tool.parameters.map(p=>[p.key,p.default]));}
/** Literal JSON templates only; no evaluation, property paths, code, network, file access or loops. */
export function expandTool(tool:CreatorTool,values:Record<string,unknown>):string{
 const parameters=new Map(tool.parameters.map(p=>[p.key,p]));
 const input=new Map<string,Primitive>();for(const p of tool.parameters)input.set(p.key,validateValue(p,values[p.key]));
 for(const key of Object.keys(values))if(!parameters.has(key))throw Error('Unknown tool parameter: '+key);
 let nodes=0;
 function expand(value:unknown,depth=0):unknown{
  if(++nodes>5000||depth>16)throw Error('Tool template exceeds complexity limit');
  if(value===null||typeof value==='string'||typeof value==='boolean'||typeof value==='number')return value;
  if(Array.isArray(value))return value.map(v=>expand(v,depth+1));
  const o=record(value);if(Object.hasOwn(o,'$param')){fields(o,['$param']);if(typeof o.$param!=='string'||!input.has(o.$param))throw Error('Unknown parameter reference');return input.get(o.$param);}
  return Object.fromEntries(Object.entries(o).map(([key,v])=>{if(['constructor','prototype','__proto__'].includes(key))throw Error('Forbidden template key');return [key,expand(v,depth+1)];}));
 }
 const commands=tool.commands.map(raw=>{
  const op=record(raw).op;if(typeof op!=='string'||!operations.includes(op as Capability)||!tool.capabilities.includes(op as Capability))throw Error('Undeclared or unsupported capability');
  return expand(raw);
 });
 const json=JSON.stringify({version:1,summary:tool.name,commands});readPlan(json);return json;
}
export function readCreatorTool(raw:string):CreatorTool{
 if(raw.length>100000)throw Error('Tool manifest exceeds 100,000 characters');
 const p=record(JSON.parse(raw));fields(p,['format','version','id','name','description','capabilities','parameters','commands']);
 if(p.format!=='game-studio-tool'||p.version!==1||!boundedString(p.id,100)||!/^[a-z0-9][a-z0-9.-]*$/.test(p.id)||!boundedString(p.name,100)||typeof p.description!=='string'||p.description.length>500||!Array.isArray(p.capabilities)||!p.capabilities.length||p.capabilities.length>operations.length||new Set(p.capabilities).size!==p.capabilities.length||!p.capabilities.every(c=>operations.includes(c))||!Array.isArray(p.parameters)||p.parameters.length>16||!Array.isArray(p.commands)||!p.commands.length||p.commands.length>64)throw Error('Invalid tool manifest');
 const parameters=p.parameters.map(parameter);if(new Set(parameters.map(x=>x.key)).size!==parameters.length)throw Error('Duplicate parameter key');
 const tool:CreatorTool={format:'game-studio-tool',version:1,id:p.id,name:p.name,description:p.description,capabilities:p.capabilities,parameters,commands:p.commands};
 expandTool(tool,toolDefaults(tool));return tool;
}
export function previewCreatorTool(project:Project,tool:CreatorTool,values:Record<string,unknown>){return previewPlan(project,expandTool(tool,values));}
export const platformTool:CreatorTool=readCreatorTool(JSON.stringify({format:'game-studio-tool',version:1,id:'builtin.platform',name:'Platform builder',description:'Create a solid box platform at a chosen height.',capabilities:['add'],parameters:[{key:'name',label:'Platform name',type:'string',default:'Platform'},{key:'height',label:'Height',type:'number',min:0,max:100,default:1},{key:'width',label:'Width scale',type:'number',min:.1,max:20,default:2}],commands:[{op:'add',kind:'box',patch:{name:{$param:'name'},role:'solid',position:[0,{$param:'height'},0],scale:[{$param:'width'},.25,2],color:'#6688bb'}}]}));
