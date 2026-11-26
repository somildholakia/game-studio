import {Color3,Color4,Vector3,Scene,HemisphericLight,DirectionalLight} from '@babylonjs/core';
import {defaultEnvironment,type Environment} from '../core/environment';
export function createEnvironment(scene:Scene){
 const ambient=new HemisphericLight('ambient',new Vector3(0,1,0),scene);
 const sun=new DirectionalLight('sun',new Vector3(-.5,-1,.6),scene);
 return {sync(value?:Environment){
 const e=value??defaultEnvironment;const sky=Color3.FromHexString(e.sky);scene.clearColor=new Color4(sky.r,sky.g,sky.b,1);
 ambient.diffuse=Color3.FromHexString(e.ambient);ambient.intensity=e.ambientIntensity;
 sun.diffuse=Color3.FromHexString(e.sunColor);sun.intensity=e.sunIntensity;
 const az=e.sunAzimuth*Math.PI/180,el=e.sunElevation*Math.PI/180;
 sun.direction.set(-Math.cos(el)*Math.sin(az),-Math.sin(el),-Math.cos(el)*Math.cos(az));
 scene.fogMode=e.fogEnabled?Scene.FOGMODE_EXP2:Scene.FOGMODE_NONE;scene.fogColor=Color3.FromHexString(e.fogColor);scene.fogDensity=e.fogDensity;
 }};
}
