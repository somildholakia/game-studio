import {defineConfig} from '@playwright/test';
const requested=process.env.GAME_STUDIO_BROWSER??'chromium';
if(!['chromium','firefox','webkit'].includes(requested))throw Error('Unknown browser: '+requested);
const browserName=requested as 'chromium'|'firefox'|'webkit';
export default defineConfig({
 testDir:'./e2e',fullyParallel:false,workers:1,timeout:60000,
 use:{baseURL:'http://127.0.0.1:4173',browserName,headless:true,...(browserName==='chromium'?{launchOptions:{args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}}:{}),trace:'retain-on-failure'},
 webServer:{command:'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',url:'http://127.0.0.1:4173',reuseExistingServer:false,timeout:60000}
});
