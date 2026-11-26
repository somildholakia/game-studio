import {LoadAssetContainerAsync,type AssetContainer,type Mesh,type Scene} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import {decodeAsset,type ModelAsset} from '../core/assets';
export async function loadModel(asset:ModelAsset,scene:Scene,root:Mesh,isCurrent:()=>boolean):Promise<AssetContainer|null>{
 const url=URL.createObjectURL(new Blob([decodeAsset(asset.data)],{type:'model/gltf-binary'}));
 let container:AssetContainer|undefined;
 try{
 container=await LoadAssetContainerAsync(url,scene,{pluginExtension:'.glb'});
 if(!isCurrent()){container.dispose();return null;}
 container.addAllToScene();for(const animation of container.animationGroups)animation.stop();
 for(const node of [...container.meshes,...container.transformNodes])if(!node.parent)node.parent=root;
 return container;
 }catch(e){container?.dispose();throw e;}finally{URL.revokeObjectURL(url);}
}
