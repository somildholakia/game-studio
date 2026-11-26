import {defineConfig} from 'vite';
export default defineConfig({
 build:{outDir:'src/generated',emptyOutDir:true,lib:{entry:'src/player/main.ts',name:'GameStudioPlayer',formats:['iife'],fileName:()=> 'player.js'},rollupOptions:{output:{inlineDynamicImports:true}},minify:true,sourcemap:false}
});
