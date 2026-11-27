import {Color3,ShaderMaterial,type Scene} from '@babylonjs/core';
import {compileShaderGraph} from '../core/shaderGraph';
import type {Entity} from '../core/project';
const vertexSource='precision highp float; attribute vec3 position; uniform mat4 worldViewProjection; varying vec3 vLocal; void main(){vLocal=position;gl_Position=worldViewProjection*vec4(position,1.0);}';
export function createGraphMaterial(e:Entity,scene:Scene,onError:(message:string)=>void):ShaderMaterial{
 if(!e.shader)throw Error('Missing shader graph');
 const material=new ShaderMaterial(e.id+'-graph',scene,{vertexSource,fragmentSource:compileShaderGraph(e.shader)},{attributes:['position'],uniforms:['worldViewProjection','baseColor']});
 material.setColor3('baseColor',Color3.FromHexString(e.color));material.onError=(_effect,errors)=>onError('Shader graph: '+errors);
 return material;
}
