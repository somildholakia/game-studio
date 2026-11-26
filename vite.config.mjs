import {defineConfig} from 'vite';
import {aiMiddleware} from './server/ai-proxy.mjs';
export default defineConfig({server:{host:'127.0.0.1'},plugins:[{name:'game-studio-local-ai',configureServer(server){server.middlewares.use(aiMiddleware);}}]});
