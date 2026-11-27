import {defineConfig} from 'vite';
import {createObservability} from './server/observability.mjs';
import {githubMiddleware} from './server/github-proxy.mjs';
import {roomMiddleware} from './server/room-proxy.mjs';
import {createRaceRegistry,createRaceMiddleware} from './server/race-proxy.mjs';
import {aiMiddleware} from './server/ai-proxy.mjs';
export default defineConfig({server:{host:'127.0.0.1'},plugins:[{name:'game-studio-local-ai',configureServer(server){server.middlewares.use(createObservability().middleware);server.middlewares.use(aiMiddleware);server.middlewares.use(githubMiddleware);server.middlewares.use(roomMiddleware);let registryPromise,timer,closed=false;server.middlewares.use(createRaceMiddleware(()=>{if(!registryPromise){registryPromise=server.ssrLoadModule('/src/runtime/raceMatch.ts').then(({createRaceMatch})=>{if(closed)throw Error('Race server closed');const registry=createRaceRegistry(createRaceMatch);timer=setInterval(()=>registry.pump(),1000/60);timer.unref();return registry;}).catch(error=>{registryPromise=undefined;throw error;});}return registryPromise;}));server.httpServer?.once('close',()=>{closed=true;if(timer)clearInterval(timer);});}}]});
