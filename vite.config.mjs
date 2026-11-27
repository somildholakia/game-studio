import {defineConfig} from 'vite';
import {createObservability} from './server/observability.mjs';
import {githubMiddleware} from './server/github-proxy.mjs';
import {roomMiddleware} from './server/room-proxy.mjs';
import {aiMiddleware} from './server/ai-proxy.mjs';
export default defineConfig({server:{host:'127.0.0.1'},plugins:[{name:'game-studio-local-ai',configureServer(server){server.middlewares.use(createObservability().middleware);server.middlewares.use(aiMiddleware);server.middlewares.use(githubMiddleware);server.middlewares.use(roomMiddleware);}}]});
