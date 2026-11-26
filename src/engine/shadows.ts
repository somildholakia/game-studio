import {ShadowGenerator,type AbstractMesh,type DirectionalLight,type Mesh} from '@babylonjs/core';
import {defaultGraphics,type GraphicsSettings} from '../core/graphics';
export function createShadows(sun:DirectionalLight){
 let generator:ShadowGenerator|null=null,size=0;const registered=new Set<AbstractMesh>();
 function reset(){for(const m of registered)if(!m.isDisposed())m.receiveShadows=false;registered.clear();generator?.dispose();generator=null;size=0;}
 function sync(value:GraphicsSettings|undefined,roots:Iterable<Mesh>){
 const g=value??defaultGraphics;if(!g.shadows){if(generator)reset();return;}
 if(!generator||size!==g.shadowSize){reset();generator=new ShadowGenerator(g.shadowSize,sun);generator.usePoissonSampling=true;generator.bias=.001;generator.normalBias=.02;size=g.shadowSize;}
 const next=new Set<AbstractMesh>();for(const root of roots){if(root.getTotalVertices()>0)next.add(root);for(const child of root.getChildMeshes(false))if(child.getTotalVertices()>0)next.add(child);}
 for(const m of registered)if(!next.has(m)){if(!m.isDisposed())m.receiveShadows=false;generator.removeShadowCaster(m,false);registered.delete(m);}
 for(const m of next)if(!registered.has(m)){m.receiveShadows=true;generator.addShadowCaster(m,false);registered.add(m);}
 }
 return {sync,dispose:reset};
}
