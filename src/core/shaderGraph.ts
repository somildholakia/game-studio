export type ShaderNode={kind:'color';color:string}|{kind:'base'}|{kind:'gradient';a:number;b:number;axis:'x'|'y'|'z';scale:number}|{kind:'bands';a:number;b:number;axis:'x'|'y'|'z';scale:number}|{kind:'mix';a:number;b:number;factor:number}|{kind:'multiply';a:number;b:number};
export type ShaderGraph={version:1;nodes:ShaderNode[]};
export const MAX_SHADER_GRAPHS=64;
const hex=(v:unknown):v is string=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v);
export function readShaderGraph(raw:unknown):ShaderGraph{
 const g=raw as ShaderGraph;
 if(!g||g.version!==1||!Array.isArray(g.nodes)||g.nodes.length<1||g.nodes.length>16)throw Error('Shader graph needs 1–16 nodes');
 return {version:1,nodes:g.nodes.map((node,i)=>{
 if(!node||typeof node!=='object')throw Error('Invalid shader node');
 if(node.kind==='base')return {kind:'base'};
 if(node.kind==='color'&&hex(node.color))return {kind:'color',color:node.color};
 if(node.kind==='color')throw Error('Invalid shader color');
 if(!('a' in node)||!('b' in node)||![node.a,node.b].every(n=>Number.isInteger(n)&&n>=0&&n<i))throw Error('Shader inputs must reference earlier nodes');
 if(node.kind==='multiply')return {kind:node.kind,a:node.a,b:node.b};
 if(node.kind==='mix'&&Number.isFinite(node.factor)&&node.factor>=0&&node.factor<=1)return {kind:node.kind,a:node.a,b:node.b,factor:node.factor};
 if((node.kind==='gradient'||node.kind==='bands')&&['x','y','z'].includes(node.axis)&&Number.isFinite(node.scale)&&node.scale>=.01&&node.scale<=32)return {kind:node.kind,a:node.a,b:node.b,axis:node.axis,scale:node.scale};
 throw Error('Invalid shader node parameters');
 })};
}
export const defaultShaderGraph:ShaderGraph={version:1,nodes:[{kind:'base'},{kind:'color',color:'#ffd56a'},{kind:'gradient',a:0,b:1,axis:'y',scale:1}]};
const float=(n:number)=>n.toFixed(6);
export function compileShaderGraph(raw:ShaderGraph):string{
 const graph=readShaderGraph(raw);
 const expressions=graph.nodes.map((n,i)=>{
 let expr:string;
 switch(n.kind){
 case 'base':expr='baseColor';break;
 case 'color':expr='vec3('+[1,3,5].map(k=>float(parseInt(n.color.slice(k,k+2),16)/255)).join(',')+')';break;
 case 'mix':expr='mix(n'+n.a+',n'+n.b+','+float(n.factor)+')';break;
 case 'multiply':expr='n'+n.a+'*n'+n.b;break;
 case 'gradient':expr='mix(n'+n.a+',n'+n.b+',clamp(vLocal.'+n.axis+'*'+float(n.scale)+'+0.5,0.0,1.0))';break;
 case 'bands':expr='mix(n'+n.a+',n'+n.b+',step(0.5,fract(vLocal.'+n.axis+'*'+float(n.scale)+')))';break;
 }
 return 'vec3 n'+i+' = '+expr+';';
 });
 return 'precision highp float; varying vec3 vLocal; uniform vec3 baseColor; void main(){\n'+expressions.join('\n')+'\ngl_FragColor=vec4(clamp(n'+(graph.nodes.length-1)+',0.0,1.0),1.0);\n}';
}
